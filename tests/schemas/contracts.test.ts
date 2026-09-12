import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateContract } from '../../packages/schemas/src/index.js';

describe('contracts schema', () => {
  it('contains every required v0.1 contract', () => {
    const schema = JSON.parse(readFileSync(resolve('packages/schemas/schema/contracts.schema.json'), 'utf8')) as { $defs?: Record<string, unknown> };
    for (const name of ['TaskEnvelope', 'AgentAssignment', 'AgentResult', 'Evidence', 'Finding', 'GateResult', 'ReviewResult', 'MergeDecision', 'RunManifest']) expect(schema.$defs?.[name]).toBeDefined();
  });

  it('validates a TaskEnvelope and rejects an invalid risk class', () => {
    const valid = { id: 'T-1', objective: 'test', acceptanceCriteria: [], risk: 'R1', constraints: [], createdAt: new Date().toISOString() };
    expect(validateContract('TaskEnvelope', valid).ok).toBe(true);
    expect(validateContract('TaskEnvelope', { ...valid, risk: 'R9' }).ok).toBe(false);
  });

  it('validates local validator and awaiting external result states', () => {
    const result = { taskId: 'T-1', assignmentId: 'A-1', agentId: 'researcher-perplexity', role: 'researcher', stance: 'neutral', provider: 'perplexity', harness: 'perplexity', billingChannel: 'manual', status: 'awaiting_external', changes: [], tests: [], evidence: [], findings: [], risks: [], blockers: ['manual'], recommendation: 'human_required' };
    expect(validateContract('AgentResult', result).ok).toBe(true);
  });
});
