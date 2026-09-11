import { describe, expect, it } from 'vitest';
import { parseAgentResult } from '../../packages/runtime/src/result.js';
import type { AgentAssignment } from '../../packages/schemas/src/index.js';

const assignment: AgentAssignment = {
  id: 'A-1', taskId: 'T-1', agentId: 'builder-codex', role: 'builder', stance: 'constructive', provider: 'openai', harness: 'codex', billingChannel: 'subscription', authority: ['modify_worktree'], dependsOn: [],
};

function outcome(stdout: string, exitCode = 0) {
  return { harness: 'codex', command: 'codex', args: [], exitCode, signal: null, stdout, stderr: '', startedAt: '', finishedAt: '', timedOut: false } as const;
}

describe('agent result parsing', () => {
  it('accepts the final structured marker', () => {
    const result = parseAgentResult(assignment, outcome('notes\nCC_RESULT_JSON:{"status":"completed","changes":["x.ts"],"tests":[],"evidence":[],"findings":[],"risks":[],"blockers":[],"recommendation":"review"}\n'));
    expect(result.status).toBe('completed');
    expect(result.changes).toEqual(['x.ts']);
  });

  it('fails closed when structured output is absent', () => {
    const result = parseAgentResult(assignment, outcome('unstructured'));
    expect(result.status).toBe('failed');
    expect(result.blockers[0]).toMatch(/CC_RESULT_JSON/);
  });

  it('fails closed when status is outside the AgentResult contract', () => {
    const result = parseAgentResult(assignment, outcome('CC_RESULT_JSON:{"status":"done","changes":[],"tests":[],"evidence":[],"findings":[],"risks":[],"blockers":[],"recommendation":"review"}'));
    expect(result.status).toBe('failed');
    expect(result.recommendation).toBe('changes_required');
    expect(result.blockers[0]).toMatch(/contract validation/);
  });

  it('fails closed when recommendation is outside the AgentResult contract', () => {
    const result = parseAgentResult(assignment, outcome('CC_RESULT_JSON:{"status":"completed","changes":[],"tests":[],"evidence":[],"findings":[],"risks":[],"blockers":[],"recommendation":"ship_it"}'));
    expect(result.status).toBe('failed');
    expect(result.recommendation).toBe('changes_required');
    expect(result.blockers[0]).toMatch(/contract validation/);
  });

  it('fails closed when nested result collections violate the contract', () => {
    const result = parseAgentResult(assignment, outcome('CC_RESULT_JSON:{"status":"completed","changes":"x.ts","tests":[],"evidence":[],"findings":[],"risks":[],"blockers":[],"recommendation":"review"}'));
    expect(result.status).toBe('failed');
    expect(result.blockers[0]).toMatch(/contract validation/);
  });
});
