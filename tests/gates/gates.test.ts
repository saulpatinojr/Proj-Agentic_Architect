import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { blockingGateFailure, detectGateProfiles, globMatch, runGates, type GateExecution } from '../../packages/gates/src/index.js';

describe('deterministic gates', () => {
  it('detects the Code Conductor profile', () => {
    expect(detectGateProfiles(resolve('.'))).toContain('code-conductor');
  });

  it('matches recursive globs without rewriting generated regex fragments', () => {
    expect(globMatch('main.tf', '**/*.tf')).toBe(true);
    expect(globMatch('modules/network/main.tf', '**/*.tf')).toBe(true);
    expect(globMatch('modules/network/main.ts', '**/*.tf')).toBe(false);
    expect(globMatch('roles/web/tasks/main.yml', 'roles/**/tasks/*.yml')).toBe(true);
    expect(globMatch('src/index.ts', 'src/*.ts')).toBe(true);
    expect(globMatch('src/nested/index.ts', 'src/*.ts')).toBe(false);
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

  it('does not block readiness for a failed advisory gate', () => {
    const advisoryFailure: GateExecution = {
      profile: 'advisory',
      blocking: false,
      result: { gate: 'advisory-check', status: 'failed', evidenceIds: ['E-advisory'], summary: 'advisory finding' },
      evidence: { id: 'E-advisory', kind: 'test', source: 'advisory-check', summary: 'advisory finding' },
    };
    expect(blockingGateFailure([advisoryFailure])).toBe(false);
  });
});
