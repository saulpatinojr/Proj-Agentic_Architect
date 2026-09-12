#!/usr/bin/env node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { AgentAssignment, RiskClass, TaskEnvelope } from '@code-conductor/schemas';
import { validateRepositoryConfig } from '@code-conductor/policy';
import { createTask, executeTask, planTask, parseAgentResult } from '@code-conductor/runtime';
import { createBuiltinAdapters } from '@code-conductor/adapters';
import { WorkstationStore, type HarnessTrustMode } from '@code-conductor/workstation';
import { apmAudit, apmLockPresent, apmTargets } from '@code-conductor/apm-adapter';
import { detectRepositoryProfiles, loadMcpCatalog, selectMcpServers } from '@code-conductor/mcp';
import { githubAuthStatus, pullRequestChecks, pullRequestStatus } from '@code-conductor/github-gate';
import { ContextOptimizer } from '@code-conductor/context-optimizer';

const VERSION = '0.1.0';
function hasCommand(command: string): boolean { const probe = process.platform === 'win32' ? 'where' : 'which'; return spawnSync(probe, [command], { stdio: 'ignore' }).status === 0; }
function getOption(args: string[], name: string): string | undefined { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }

function printValidation(root: string): number {
  const report = validateRepositoryConfig(root);
  for (const issue of report.issues) console.log(`${issue.level === 'error' ? 'ERROR' : 'WARN'} ${issue.code}${issue.path ? ` [${issue.path}]` : ''}: ${issue.message}`);
  console.log(report.ok ? 'Code Conductor repository validation: PASS' : 'Code Conductor repository validation: FAIL');
  return report.ok ? 0 : 1;
}

function doctor(root: string): number {
  const clients = [['git', ['git']], ['github', ['gh']], ['apm', ['apm']], ['claude', ['claude']], ['codex', ['codex']], ['kiro', ['kiro-cli']], ['antigravity', ['agy']]] as const;
  const workstation = new WorkstationStore();
  const state = workstation.load();
  console.log(`Code Conductor doctor ${VERSION}`);
  let missingRequired = false;
  for (const [name, candidates] of clients) {
    const found = candidates.some(hasCommand); console.log(`${found ? 'OK' : 'MISSING'} ${name} (${candidates.join('|')})`);
    if (!found && ['git', 'github', 'apm'].includes(name)) missingRequired = true;
  }
  for (const [id, record] of Object.entries(state.harnesses)) console.log(`TRUST ${id}: read=${Boolean(record.readValidatedAt || record.modifyValidatedAt)} modify=${Boolean(record.modifyValidatedAt)} version=${record.clientVersion ?? 'unknown'}`);
  for (const variable of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'PERPLEXITY_API_KEY']) if (process.env[variable]) console.log(`WARN billing.api_credential_detected: ${variable} is set; subscription-first policy may be bypassed. Value is intentionally not displayed.`);
  if (hasCommand('gh')) console.log(`${githubAuthStatus(root).ok ? 'OK' : 'WARN'} github-auth`);
  if (hasCommand('apm')) { console.log(`${apmTargets(root).ok ? 'OK' : 'WARN'} apm-targets`); console.log(`${apmLockPresent(root) ? 'OK' : 'WARN'} apm-lock`); }
  const configStatus = printValidation(root);
  return missingRequired || configStatus !== 0 ? 1 : 0;
}

function availableHarnesses(): Set<string> {
  const adapters = createBuiltinAdapters();
  return new Set([...adapters.entries()].filter(([, adapter]) => adapter.available()).map(([id]) => id));
}

function plan(args: string[]): number {
  const root = resolve(getOption(args, '--repo') ?? '.'); const objective = getOption(args, '--objective'); const risk = (getOption(args, '--risk') ?? 'R1') as RiskClass;
  if (!objective) { console.error('ERROR plan.objective_required: --objective is required.'); return 2; }
  if (!['R0', 'R1', 'R2', 'R3', 'R4'].includes(risk)) { console.error(`ERROR plan.invalid_risk: ${risk}`); return 2; }
  console.log(JSON.stringify(planTask(root, createTask(objective, risk, root), { availableHarnesses: availableHarnesses() }), null, 2)); return 0;
}

async function run(args: string[]): Promise<number> {
  const root = resolve(getOption(args, '--repo') ?? '.'); const objective = getOption(args, '--objective'); const risk = (getOption(args, '--risk') ?? 'R1') as RiskClass;
  if (!objective) { console.error('ERROR run.objective_required: --objective is required.'); return 2; }
  const execute = args.includes('--execute'); const workstation = new WorkstationStore();
  const outcome = await executeTask(root, createTask(objective, risk, root), { execute, keepWorktrees: !args.includes('--cleanup-worktrees'), isHarnessTrusted: (harness, mode) => workstation.isTrusted(harness, mode) });
  console.log(JSON.stringify({ runId: outcome.plan.runId, execute, manifestPath: outcome.manifestPath, mergeDecision: outcome.manifest.mergeDecision, assignments: outcome.plan.assignments.map((a) => ({ role: a.role, harness: a.harness, stance: a.stance, authority: a.authority })), pendingExternal: outcome.pendingExternal.map((a) => a.id), worktrees: outcome.worktrees.map((w) => ({ path: w.path, branch: w.branch, baseSha: w.baseSha })) }, null, 2));
  return outcome.manifest.mergeDecision && outcome.manifest.mergeDecision.decision !== 'ready' ? 1 : 0;
}

async function harnessSmoke(args: string[]): Promise<number> {
  const harness = args[0]; const mode = (getOption(args, '--mode') ?? 'read') as HarnessTrustMode;
  if (!harness || !['read', 'modify'].includes(mode)) { console.error('Usage: cc harness-smoke <codex|claude|kiro> --mode <read|modify>'); return 2; }
  if (harness === 'antigravity') { console.error('BLOCKED: Antigravity headless smoke is disabled pending upstream permission/sandbox reliability.'); return 1; }
  const adapter = createBuiltinAdapters().get(harness);
  if (!adapter?.available()) { console.error(`ERROR: harness ${harness} is not available.`); return 1; }
  const root = mkdtempSync(join(tmpdir(), 'cc-smoke-')); const workspace = join(root, 'workspace');
  try {
    spawnSync('git', ['init', workspace], { stdio: 'ignore' });
    writeFileSync(join(workspace, 'AGENTS.md'), '# Smoke test\nStay within this temporary workspace.\n');
    writeFileSync(join(workspace, 'INPUT.txt'), 'READ_OK\n');
    spawnSync('git', ['-C', workspace, 'add', '.'], { stdio: 'ignore' }); spawnSync('git', ['-C', workspace, '-c', 'user.name=Code Conductor', '-c', 'user.email=smoke@local', 'commit', '-m', 'baseline'], { stdio: 'ignore' });
    const assignment: AgentAssignment = { id: 'SMOKE-A', taskId: 'SMOKE-T', agentId: `smoke-${harness}`, role: mode === 'modify' ? 'builder' : 'reviewer', stance: 'neutral', provider: adapter.provider, harness, billingChannel: 'subscription', authority: mode === 'modify' ? ['modify_worktree'] : ['review'], dependsOn: [] };
    const task: TaskEnvelope = { id: 'SMOKE-T', objective: mode === 'modify' ? 'Read INPUT.txt, create OUTPUT.txt containing exactly WRITE_OK followed by one newline, and do not touch anything outside this workspace.' : 'Read INPUT.txt and report its exact content without changing any file.', repository: workspace, acceptanceCriteria: [], risk: 'R0', constraints: ['temporary isolated smoke test'], createdAt: new Date().toISOString() };
    const outcome = await adapter.execute({ task, assignment, cwd: workspace, timeoutMs: 180000, prompt: `${task.objective}\nFinal line: CC_RESULT_JSON:{"status":"completed","changes":[],"tests":[],"evidence":[],"findings":[],"risks":[],"blockers":[],"recommendation":"ready"}` });
    const parsed = parseAgentResult(assignment, outcome); const changed = spawnSync('git', ['-C', workspace, 'status', '--porcelain=v1'], { encoding: 'utf8' }).stdout.trim().split(/\r?\n/).filter(Boolean);
    const writeOk = mode === 'modify' ? (() => { try { return readFileSync(join(workspace, 'OUTPUT.txt'), 'utf8') === 'WRITE_OK\n'; } catch { return false; } })() : changed.length === 0;
    const ok = outcome.exitCode === 0 && parsed.status === 'completed' && writeOk;
    if (!ok) { console.error(`SMOKE FAIL ${harness} ${mode}: exit=${String(outcome.exitCode)} changed=${changed.join(',') || 'none'}`); return 1; }
    new WorkstationStore().record(harness, mode, adapter.version(), `Temporary ${mode} smoke passed without storing credentials.`);
    console.log(`SMOKE PASS ${harness} ${mode}`); return 0;
  } finally { rmSync(root, { recursive: true, force: true }); }
}

function mcpList(args: string[]): number { const root = resolve(getOption(args, '--repo') ?? '.'); const catalog = loadMcpCatalog(root); const profiles = getOption(args, '--profiles')?.split(',').filter(Boolean) ?? detectRepositoryProfiles(root); const allowApi = args.includes('--allow-api'); console.log(JSON.stringify({ profiles, allowSeparatelyBilledApi: allowApi, servers: selectMcpServers(catalog, profiles, allowApi).map(([id, server]) => ({ id, publisher: server.publisher, maturity: server.maturity, authentication: server.authentication, defaultAccess: server.default_access })) }, null, 2)); return 0; }
function apmCheck(rootArg?: string): number { const root = resolve(rootArg ?? '.'); if (!hasCommand('apm')) { console.error('ERROR apm.missing: apm executable is required.'); return 1; } const result = apmAudit(root); process.stdout.write(result.stdout); process.stderr.write(result.stderr); return result.ok ? 0 : 1; }
function githubGate(args: string[]): number { const root = resolve(getOption(args, '--repo') ?? '.'); if (!hasCommand('gh')) { console.error('ERROR github.missing: gh executable is required.'); return 1; } const status = pullRequestStatus(root); process.stdout.write(status.stdout); process.stderr.write(status.stderr); if (!status.ok) return 1; const checks = pullRequestChecks(root); process.stdout.write(checks.stdout); process.stderr.write(checks.stderr); return checks.ok ? 0 : 1; }
function contextStats(): number { const optimizer = new ContextOptimizer(); console.log(JSON.stringify(optimizer.getStats(), null, 2)); return 0; }
function compressFile(filePath?: string): number { if (!filePath) { console.error('ERROR compress.file_required: Specify a file path to compress.'); return 2; } const optimizer = new ContextOptimizer(); const { content, result } = optimizer.readCompressedFile(resolve(filePath), 'cli'); console.log(`Original tokens: ${result.originalTokens}\nOptimized tokens: ${result.optimizedTokens}\nTokens saved: ${result.tokensSaved} (${result.savingsPercent}%)\nOverhead: ${result.overheadMs}ms\nContext ID: ${result.contextId}\n\n--- Compressed Content ---\n${content}`); return 0; }
function usage(): void { console.log('Usage: cc <validate|doctor|plan|run|harness-smoke|mcp|apm-audit|github-gate|context-stats|compress|version> [options]\n\nrun defaults to dry-run; pass --execute only after harness-smoke passes. Modifying worktrees are preserved by default; pass --cleanup-worktrees only to remove clean worktrees after the run.'); }

const [command = 'help', ...args] = process.argv.slice(2); let exitCode = 0;
switch (command) {
  case 'validate': exitCode = printValidation(resolve(args[0] ?? '.')); break;
  case 'doctor': exitCode = doctor(resolve(args[0] ?? '.')); break;
  case 'plan': exitCode = plan(args); break;
  case 'run': exitCode = await run(args); break;
  case 'harness-smoke': exitCode = await harnessSmoke(args); break;
  case 'mcp': exitCode = mcpList(args); break;
  case 'apm-audit': exitCode = apmCheck(args[0]); break;
  case 'github-gate': exitCode = githubGate(args); break;
  case 'context-stats': exitCode = contextStats(); break;
  case 'compress': exitCode = compressFile(args[0]); break;
  case 'version': case '--version': case '-v': console.log(VERSION); break;
  default: usage(); exitCode = command === 'help' || command === '--help' || command === '-h' ? 0 : 2;
}
process.exitCode = exitCode;

