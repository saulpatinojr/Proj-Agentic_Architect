import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { validatePolicyObjects, validateRepositoryConfig } from '../../packages/policy/src/index.js';

describe('repository policy', () => {
  it('validates the checked-in foundation configuration', () => {
    const report = validateRepositoryConfig(resolve('.'));
    expect(report.issues.filter((issue) => issue.level === 'error')).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('rejects a modifying role that can approve', () => {
    const issues = validatePolicyObjects(
      { version: 1, roles: { builder: { stance: 'constructive', may_modify_code: true, may_approve: true }, challenger: { stance: 'critical' } } },
      {
        version: 1,
        risk_classes: {
          R0: { required_roles: ['builder'] },
          R1: { required_roles: ['builder'] },
          R2: { required_roles: ['builder', 'challenger'], challenger_must_use_different_provider_from_builder: true },
          R3: { required_roles: ['builder'], human_approval: true },
          R4: { required_roles: ['builder'], human_approval: true, require_human_approval_before_side_effect: true, unattended_execution: false },
        },
      },
    );
    expect(issues.some((issue) => issue.code === 'authority.separation_of_duties')).toBe(true);
  });
});
