import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { blockingGateFailure, detectGateProfiles, runGates } from '../../packages/gates/src/index.js';

describe('deterministic gates', () => {
  it('detects the Code Conductor profile', () => {
    expect(detectGateProfiles(resolve('.'))).toContain('code-conductor');
  });

  it('can execute gates through an injected deterministic executor', () => {
    const executions = runGates(resolve('.'), ['code-conductor'], (_cwd, command, args) => ({ status: 0, stdout: `${command} ${args.join(' ')} ok`, stderr: '' }));
    expect(executions.length).toBeGreaterThan(0);
    expect(blockingGateFailure(executions)).toBe(false);
    expect(executions.every((item) => item.result.status === 'passed')).toBe(true);
  });

  it('blocks on a failed blocking gate', () => {
    const executions = runGates(resolve('.'), ['code-conductor'], () => ({ status: 1, stdout: '', stderr: 'failed' }));
    expect(blockingGateFailure(executions)).toBe(true);
  });
});
