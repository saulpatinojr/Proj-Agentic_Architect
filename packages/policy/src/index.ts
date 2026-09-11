import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { RiskClass, Stance } from '@code-conductor/schemas';

export interface ValidationIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface ValidationReport {
  ok: boolean;
  issues: ValidationIssue[];
}

type RoleConfig = {
  stance?: Stance;
  may_modify_code?: boolean;
  may_review?: boolean;
  may_approve?: boolean;
  may_merge?: boolean;
  may_block?: boolean;
  may_execute_validation?: boolean;
  may_resolve_disagreement?: boolean;
  may_recommend_merge?: boolean;
};

type RolesConfig = { version: number; roles: Record<string, RoleConfig> };
type RiskConfig = {
  version: number;
  risk_classes: Record<RiskClass, {
    required_roles?: string[];
    human_approval?: boolean;
    independent_review?: boolean;
    challenger_must_use_different_provider_from_builder?: boolean;
    require_human_approval_before_side_effect?: boolean;
    unattended_execution?: boolean;
  }>;
};
type CapabilityConfig = {
  version: number;
  defaults?: { billing_policy?: string; allow_separately_billed_api?: boolean; require_official_client_or_api?: boolean };
  harnesses?: Record<string, unknown>;
};
type ReferenceConfig = {
  version: number;
  authoritative_sources?: Record<string, string[]>;
  policy?: { blocking_findings_require_evidence?: boolean };
};
type ApmConfig = { name?: string; version?: string; targets?: string[]; dependencies?: { apm?: unknown[]; mcp?: unknown[] } };

const requiredFiles = [
  'AGENTS.md',
  'STARTER.md',
  'docs/DECISIONS.md',
  'docs/IMPLEMENTATION-PLAN.md',
  'apm.yml',
  'config/capabilities.yaml',
  'config/roles.yaml',
  'config/risk.yaml',
  'config/authorities.yaml',
  'config/references.yaml',
] as const;

const requiredTargets = ['copilot', 'claude', 'codex', 'kiro', 'antigravity', 'agent-skills'] as const;

function readYaml<T>(root: string, relativePath: string, issues: ValidationIssue[]): T | undefined {
  const full = join(root, relativePath);
  try {
    return parse(readFileSync(full, 'utf8')) as T;
  } catch (error) {
    issues.push({ level: 'error', code: 'yaml.invalid', path: relativePath, message: error instanceof Error ? error.message : String(error) });
    return undefined;
  }
}

export function validatePolicyObjects(roles: RolesConfig, risks: RiskConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [name, role] of Object.entries(roles.roles ?? {})) {
    if (role.may_modify_code && (role.may_approve || role.may_merge)) {
      issues.push({ level: 'error', code: 'authority.separation_of_duties', path: `roles.${name}`, message: `Role ${name} may modify code and may also approve/merge.` });
    }
    if (role.may_modify_code && role.may_review) {
      issues.push({ level: 'warning', code: 'authority.self_review_risk', path: `roles.${name}`, message: `Role ${name} can modify and review; assignments must enforce independence.` });
    }
  }

  for (const [riskName, risk] of Object.entries(risks.risk_classes ?? {})) {
    for (const roleName of risk.required_roles ?? []) {
      if (!roles.roles?.[roleName]) {
        issues.push({ level: 'error', code: 'risk.unknown_role', path: `risk_classes.${riskName}`, message: `Risk class ${riskName} requires unknown role ${roleName}.` });
      }
    }
  }

  const r2 = risks.risk_classes?.R2;
  if (!r2?.challenger_must_use_different_provider_from_builder) {
    issues.push({ level: 'error', code: 'risk.r2_independence', message: 'R2 must require a different-provider challenger.' });
  }

  for (const level of ['R3', 'R4'] as const) {
    if (!risks.risk_classes?.[level]?.human_approval) {
      issues.push({ level: 'error', code: 'risk.human_approval', path: `risk_classes.${level}`, message: `${level} must require human approval.` });
    }
  }

  const r4 = risks.risk_classes?.R4;
  if (!r4?.require_human_approval_before_side_effect || r4?.unattended_execution !== false) {
    issues.push({ level: 'error', code: 'risk.r4_side_effect_gate', message: 'R4 must stop for human approval before external side effects and disable unattended execution.' });
  }

  return issues;
}

export function validateRepositoryConfig(root: string): ValidationReport {
  const issues: ValidationIssue[] = [];

  for (const relativePath of requiredFiles) {
    if (!existsSync(join(root, relativePath))) {
      issues.push({ level: 'error', code: 'repo.missing_file', path: relativePath, message: `Missing required file: ${relativePath}` });
    }
  }
  if (issues.some((issue) => issue.code === 'repo.missing_file')) return { ok: false, issues };

  const apm = readYaml<ApmConfig>(root, 'apm.yml', issues);
  const capabilities = readYaml<CapabilityConfig>(root, 'config/capabilities.yaml', issues);
  const roles = readYaml<RolesConfig>(root, 'config/roles.yaml', issues);
  const risks = readYaml<RiskConfig>(root, 'config/risk.yaml', issues);
  const references = readYaml<ReferenceConfig>(root, 'config/references.yaml', issues);
  readYaml(root, 'config/authorities.yaml', issues);

  if (apm) {
    for (const target of requiredTargets) {
      if (!apm.targets?.includes(target)) {
        issues.push({ level: 'error', code: 'apm.missing_target', path: 'apm.yml', message: `APM target ${target} is required for the foundation.` });
      }
    }
    if (!Array.isArray(apm.dependencies?.apm) || !Array.isArray(apm.dependencies?.mcp)) {
      issues.push({ level: 'error', code: 'apm.dependencies_shape', path: 'apm.yml', message: 'APM dependencies must declare both apm and mcp arrays.' });
    }
  }

  if (capabilities) {
    if (capabilities.defaults?.billing_policy !== 'subscription_first') {
      issues.push({ level: 'error', code: 'billing.subscription_first', path: 'config/capabilities.yaml', message: 'Default billing policy must be subscription_first.' });
    }
    if (capabilities.defaults?.allow_separately_billed_api !== false) {
      issues.push({ level: 'error', code: 'billing.api_default', path: 'config/capabilities.yaml', message: 'Separately billed API execution must be disabled by default.' });
    }
  }

  if (roles && risks) issues.push(...validatePolicyObjects(roles, risks));

  if (references?.policy?.blocking_findings_require_evidence !== true) {
    issues.push({ level: 'error', code: 'evidence.blocking_requirement', path: 'config/references.yaml', message: 'Blocking findings must require evidence.' });
  }

  return { ok: !issues.some((issue) => issue.level === 'error'), issues };
}