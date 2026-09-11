import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('contracts schema', () => {
  it('contains every required v0.1 contract', () => {
    const schema = JSON.parse(readFileSync(resolve('packages/schemas/schema/contracts.schema.json'), 'utf8')) as { $defs?: Record<string, unknown> };
    const required = ['TaskEnvelope', 'AgentAssignment', 'AgentResult', 'Evidence', 'Finding', 'GateResult', 'ReviewResult', 'MergeDecision', 'RunManifest'];
    for (const name of required) expect(schema.$defs?.[name]).toBeDefined();
  });
});
