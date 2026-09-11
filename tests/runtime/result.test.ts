import { describe, expect, it } from 'vitest';
import { parseAgentResult } from '../../packages/runtime/src/result.js';
import type { AgentAssignment } from '../../packages/schemas/src/index.js';

const assignment: AgentAssignment = {
  id: 'A-1', taskId: 'T-1', agentId: 'builder-codex', role: 'builder', stance: 'constructive', provider: 'openai', harness: 'codex', billingChannel: 'subscription', authority: ['modify_worktree'], dependsOn: [],
};

describe('agent result parsing', () => {
  it('accepts the final structured marker', () => {
    const result = parseAgentResult(assignment, { harness: 'codex', command: 'codex', args: [], exitCode: 0, signal: null, stdout: 'notes\nCC_RESULT_JSON:{"status":"completed","changes":["x.ts"],"tests":[],"evidence":[],"findings":[],"risks":[],"blockers":[],"recommendation":"review"}\n', stderr: '', startedAt: '', finishedAt: '', timedOut: false });
    expect(result.status).toBe('completed');
    expect(result.changes).toEqual(['x.ts']);
  });

  it('fails closed when structured output is absent', () => {
    const result = parseAgentResult(assignment, { harness: 'codex', command: 'codex', args: [], exitCode: 0, signal: null, stdout: 'unstructured', stderr: '', startedAt: '', finishedAt: '', timedOut: false });
    expect(result.status).toBe('failed');
    expect(result.blockers[0]).toMatch(/CC_RESULT_JSON/);
  });
});
