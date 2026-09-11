import { randomUUID } from 'node:crypto';
import type { AgentAssignment, AgentResult, GateResult, MergeDecision, RunManifest, TaskEnvelope } from '@code-conductor/schemas';
import type { HarnessAdapter, HarnessExecutionRequest } from '@code-conductor/adapters';
import { createBuiltinAdapters } from '@code-conductor/adapters';
import { RunStore } from '@code-conductor/evidence';
import { blockingGateFailure, runGates, type CommandExecutor, type GateExecution } from '@code-conductor/gates';
import { WorktreeManager, type WorktreeHandle } from '@code-conductor/git';
import { externalAwaitingResult, parseAgentResult } from './result.js';
import { planTask, type TaskPlan } from './index.js';

export interface ExecuteOptions {
  execute?: boolean;
  adapters?: Map<string, HarnessAdapter>;
  store?: RunStore;
  worktrees?: WorktreeManager;
  gateExecutor?: CommandExecutor;
  timeoutMs?: number;
  keepWorktrees?: boolean;
}

export interface ExecuteOutcome {
  plan: TaskPlan;
  manifest: RunManifest;
  manifestPath: string;
  pendingExternal: AgentAssignment[];
}

function buildPrompt(task: TaskEnvelope, assignment: AgentAssignment): string {
  return [
    `Code Conductor task ${task.id}.`,
    `Objective: ${task.objective}`,
    `Role: ${assignment.role}. Stance: ${assignment.stance}.`,
    `Authority: ${assignment.authority.join(', ') || 'observe'}.`,
    `Acceptance criteria: ${task.acceptanceCriteria.length ? task.acceptanceCriteria.join(' | ') : 'Use repository task definition and policy.'}`,
    'Read AGENTS.md and applicable repository instructions before acting.',
    'Do not reveal private chain-of-thought. Return conclusions, evidence, changes, tests, findings, risks, blockers, and recommendation only.',
    'Your FINAL line MUST be CC_RESULT_JSON:<single-line JSON object> matching AgentResult fields that you control: status, changes, tests, evidence, findings, risks, blockers, recommendation.',
  ].join('\n');
}

function mergeDecision(task: TaskEnvelope, results: AgentResult[], gates: GateExecution[]): MergeDecision {
  const evidenceIds = [...new Set([...results.flatMap((r) => r.evidence.map((e) => e.id)), ...gates.flatMap((g) => g.result.evidenceIds)])];
  if (results.some((r) => r.status === 'awaiting_external')) return { decision: 'human_required', rationale: 'One or more assignments require an external/manual platform step.', evidenceIds };
  if (results.some((r) => r.status === 'failed' || r.status === 'blocked')) return { decision: 'changes_required', rationale: 'One or more agent assignments failed or are blocked.', evidenceIds };
  if (blockingGateFailure(gates)) return { decision: 'changes_required', rationale: 'A blocking deterministic gate failed.', evidenceIds };
  if (results.some((r) => r.findings.some((f) => f.blocking))) return { decision: 'blocked', rationale: 'An unresolved blocking finding remains.', evidenceIds };
  if (task.risk === 'R3' || task.risk === 'R4') return { decision: 'human_required', rationale: `${task.risk} policy requires explicit human approval.`, evidenceIds };
  return { decision: 'ready', rationale: 'Required assignments completed and blocking deterministic gates passed.', evidenceIds };
}

export async function executeTask(root: string, task: TaskEnvelope, options: ExecuteOptions = {}): Promise<ExecuteOutcome> {
  const adapters = options.adapters ?? createBuiltinAdapters();
  const store = options.store ?? new RunStore();
  const worktrees = options.worktrees ?? new WorktreeManager();
  const available = new Set([...adapters.entries()].filter(([, adapter]) => adapter.available()).map(([id]) => id));
  const plan = planTask(root, task, { availableHarnesses: available.size ? available : undefined });
  const manifest: RunManifest = { runId: plan.runId, task, assignments: plan.assignments, results: [], gates: [] };
  const pendingExternal: AgentAssignment[] = [];
  const worktreeByBuilder = new Map<string, WorktreeHandle>();
  let primaryBuilderWorktree: WorktreeHandle | undefined;

  store.appendEvent({ at: new Date().toISOString(), runId: plan.runId, type: 'run.planned', message: `Planned ${plan.assignments.length} assignment(s).` });
  const save = (): string => store.saveManifest(manifest);
  let manifestPath = save();

  if (!options.execute) return { plan, manifest, manifestPath, pendingExternal };

  try {
    for (const assignment of plan.assignments) {
      const unmet = assignment.dependsOn.filter((id) => !manifest.results.some((result) => result.assignmentId === id && result.status === 'completed'));
      if (unmet.length) {
        const blocked = externalAwaitingResult(assignment, `Dependencies not completed: ${unmet.join(', ')}`);
        manifest.results.push({ ...blocked, status: 'blocked', recommendation: 'changes_required' });
        continue;
      }

      if (assignment.harness === 'internal-validator') {
        const validationRoot = primaryBuilderWorktree?.path ?? root;
        const gateExecutions = runGates(validationRoot, undefined, options.gateExecutor);
        manifest.gates.push(...gateExecutions.map((item) => item.result));
        const result: AgentResult = {
          taskId: task.id, assignmentId: assignment.id, agentId: assignment.agentId, role: assignment.role, stance: assignment.stance,
          provider: assignment.provider, harness: assignment.harness, billingChannel: 'local',
          status: blockingGateFailure(gateExecutions) ? 'failed' : 'completed', changes: [], tests: gateExecutions.map((item) => item.result),
          evidence: gateExecutions.map((item) => item.evidence), findings: [], risks: [], blockers: blockingGateFailure(gateExecutions) ? ['Blocking deterministic gate failed.'] : [],
          recommendation: blockingGateFailure(gateExecutions) ? 'changes_required' : 'continue',
        };
        manifest.results.push(result);
        store.appendEvent({ at: new Date().toISOString(), runId: plan.runId, type: 'validation.completed', assignmentId: assignment.id, message: result.status });
        manifestPath = save();
        continue;
      }

      const adapter = adapters.get(assignment.harness);
      if (!adapter || !adapter.available()) {
        const result = externalAwaitingResult(assignment, `Harness ${assignment.harness} requires manual/platform integration or is unavailable on this workstation.`);
        manifest.results.push(result);
        pendingExternal.push(assignment);
        store.appendEvent({ at: new Date().toISOString(), runId: plan.runId, type: 'assignment.awaiting_external', assignmentId: assignment.id, message: result.blockers[0] ?? 'External step required.' });
        manifestPath = save();
        continue;
      }

      let cwd = root;
      if (assignment.authority.includes('modify_worktree')) {
        const handle = worktrees.create(root, task.id, assignment.agentId);
        worktreeByBuilder.set(assignment.id, handle);
        primaryBuilderWorktree ??= handle;
        cwd = handle.path;
      } else if (primaryBuilderWorktree) {
        cwd = primaryBuilderWorktree.path;
      }

      store.appendEvent({ at: new Date().toISOString(), runId: plan.runId, type: 'assignment.started', assignmentId: assignment.id, message: `${assignment.role} via ${assignment.harness}` });
      const request: HarnessExecutionRequest = { task, assignment, cwd, timeoutMs: options.timeoutMs ?? 1800000, prompt: buildPrompt(task, assignment) };
      let result: AgentResult | undefined;
      let lastError: unknown;
      for (let attempt = 0; attempt < 2 && !result; attempt += 1) {
        try {
          const outcome = await adapter.execute(request);
          result = parseAgentResult(assignment, outcome);
          if (result.status === 'failed' && attempt === 0) result = undefined;
        } catch (error) {
          lastError = error;
        }
      }
      if (!result) {
        result = {
          taskId: task.id, assignmentId: assignment.id, agentId: assignment.agentId, role: assignment.role, stance: assignment.stance,
          provider: assignment.provider, harness: assignment.harness, billingChannel: assignment.billingChannel, status: 'failed', changes: [], tests: [], evidence: [], findings: [], risks: [],
          blockers: [lastError instanceof Error ? lastError.message : 'Harness execution failed after bounded retry.'], recommendation: 'changes_required',
        };
      }
      manifest.results.push(result);
      store.appendEvent({ at: new Date().toISOString(), runId: plan.runId, type: 'assignment.completed', assignmentId: assignment.id, message: result.status });
      manifestPath = save();
    }

    manifest.mergeDecision = mergeDecision(task, manifest.results, manifest.gates.map((result) => ({ profile: 'run', result, evidence: { id: result.evidenceIds[0] ?? `E-${randomUUID()}`, kind: 'test', source: result.gate, summary: result.summary ?? result.status }, blocking: true })));
    manifestPath = save();
    store.appendEvent({ at: new Date().toISOString(), runId: plan.runId, type: 'run.completed', message: manifest.mergeDecision.decision });
    return { plan, manifest, manifestPath, pendingExternal };
  } finally {
    if (!options.keepWorktrees) {
      for (const handle of worktreeByBuilder.values()) worktrees.remove(handle, false);
    }
  }
}
