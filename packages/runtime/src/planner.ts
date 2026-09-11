import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { AgentAssignment, RiskClass, Stance, TaskEnvelope } from '@code-conductor/schemas';

interface RoleDefinition {
  stance: Stance;
  preferred_harnesses?: string[];
  may_modify_code?: boolean;
  may_review?: boolean;
  may_block?: boolean;
  may_execute_validation?: boolean;
  may_resolve_disagreement?: boolean;
  may_recommend_merge?: boolean;
  may_approve?: boolean;
  may_merge?: boolean;
}
interface RolesDocument { roles: Record<string, RoleDefinition> }
interface RiskDefinition { required_roles?: string[]; inherits?: RiskClass }
interface RiskDocument { risk_classes: Record<RiskClass, RiskDefinition> }
interface HarnessDefinition { provider: string; subscription?: string; automation?: string }
interface CapabilityDocument { harnesses: Record<string, HarnessDefinition> }

function load<T>(root: string, path: string): T { return parse(readFileSync(join(root, path), 'utf8')) as T; }
function inheritedRoles(risks: RiskDocument, risk: RiskClass, seen = new Set<RiskClass>()): string[] {
  if (seen.has(risk)) throw new Error(`Risk inheritance cycle at ${risk}`);
  seen.add(risk);
  const entry = risks.risk_classes[risk];
  if (!entry) throw new Error(`Unknown risk class: ${risk}`);
  const base = entry.inherits ? inheritedRoles(risks, entry.inherits, seen) : [];
  return [...new Set([...base, ...(entry.required_roles ?? [])])];
}
function authorityFor(role: RoleDefinition): string[] {
  const authority = ['observe', 'recommend'];
  if (role.may_modify_code) authority.push('modify_worktree');
  if (role.may_review) authority.push('review');
  if (role.may_block) authority.push('block');
  if (role.may_execute_validation) authority.push('execute_validation');
  if (role.may_resolve_disagreement) authority.push('resolve_disagreement');
  if (role.may_recommend_merge) authority.push('recommend_merge');
  if (role.may_approve) authority.push('approve');
  if (role.may_merge) authority.push('merge');
  return authority;
}

export interface PlanOptions { availableHarnesses?: Set<string> }
export interface TaskPlan { runId: string; task: TaskEnvelope; assignments: AgentAssignment[] }

export function planTask(root: string, task: TaskEnvelope, options: PlanOptions = {}): TaskPlan {
  const roles = load<RolesDocument>(root, 'config/roles.yaml');
  const risks = load<RiskDocument>(root, 'config/risk.yaml');
  const capabilities = load<CapabilityDocument>(root, 'config/capabilities.yaml');
  const requiredRoles = inheritedRoles(risks, task.risk);
  const available = options.availableHarnesses;
  const assignments: AgentAssignment[] = [];
  let builderProvider: string | undefined;
  let builderAssignmentId: string | undefined;

  for (const roleName of requiredRoles) {
    const role = roles.roles[roleName];
    if (!role) throw new Error(`Role ${roleName} is not defined.`);
    const preferred = role.preferred_harnesses ?? Object.keys(capabilities.harnesses);
    let candidates = preferred.filter((harness) => capabilities.harnesses[harness]);
    if (available) candidates = candidates.filter((harness) => available.has(harness) || harness === 'internal-validator' || harness === 'perplexity' || harness === 'copilot-github');
    if (roleName === 'challenger' && builderProvider) {
      const independent = candidates.filter((harness) => capabilities.harnesses[harness]?.provider !== builderProvider);
      if (independent.length > 0) candidates = independent;
    }
    const harness = candidates[0];
    if (!harness) throw new Error(`No eligible harness is available for role ${roleName}.`);
    const capability = capabilities.harnesses[harness];
    if (!capability) throw new Error(`Harness ${harness} is not defined.`);
    const dependsOn: string[] = [];
    if (roleName !== 'builder' && builderAssignmentId && !['researcher', 'spec_lead'].includes(roleName)) dependsOn.push(builderAssignmentId);
    if (roleName === 'builder') for (const assignment of assignments.filter((item) => ['researcher', 'spec_lead'].includes(item.role))) dependsOn.push(assignment.id);
    const assignment: AgentAssignment = {
      id: `A-${assignments.length + 1}-${randomUUID().slice(0, 8)}`, taskId: task.id, agentId: `${roleName}-${harness}`, role: roleName, stance: role.stance,
      provider: capability.provider, harness, billingChannel: harness === 'perplexity' ? 'manual' : harness === 'internal-validator' ? 'local' : 'subscription', authority: authorityFor(role), dependsOn,
    };
    assignments.push(assignment);
    if (roleName === 'builder') { builderProvider = capability.provider; builderAssignmentId = assignment.id; }
  }
  return { runId: `CC-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8)}`, task, assignments };
}

export function createTask(objective: string, risk: RiskClass, repository?: string): TaskEnvelope {
  return { id: `T-${randomUUID()}`, objective, ...(repository ? { repository } : {}), acceptanceCriteria: [], risk, constraints: [], createdAt: new Date().toISOString() };
}
