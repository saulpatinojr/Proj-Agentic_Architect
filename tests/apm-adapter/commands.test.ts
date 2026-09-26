import { beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { apmAudit, apmInstall, apmTargets } from '../../packages/apm-adapter/src/index.js';

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }));
const spawn = vi.mocked(spawnSync);
const success = () => ({ pid: 1, output: [null, '', ''], stdout: '', stderr: '', status: 0, signal: null });

beforeEach(() => { spawn.mockReset(); spawn.mockReturnValue(success()); });

describe('bounded APM boundary', () => {
  it('retains native arguments and never uses a shell', () => {
    expect(apmAudit('/workspace').ok).toBe(true);
    expect(spawn).toHaveBeenCalledWith('apm', ['audit', '--ci', '--policy', './apm-policy.yml', '--no-fail-fast'], expect.objectContaining({ cwd: '/workspace', encoding: 'utf8', shell: false, timeout: 120000, maxBuffer: 4194304, killSignal: 'SIGKILL' }));
  });
  it('applies a finite installation bound without retrying', () => {
    expect(apmInstall('/workspace').ok).toBe(true);
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn).toHaveBeenCalledWith('apm', ['install'], expect.objectContaining({ timeout: 600000 }));
  });
  it('allows bounded explicit options without changing native target behavior', () => {
    apmTargets('/workspace', { timeoutMs: 100, maxBufferBytes: 1024 });
    expect(spawn).toHaveBeenCalledWith('apm', ['targets'], expect.objectContaining({ timeout: 100, maxBuffer: 1024 }));
  });
  it('does not report success for spawn errors even with status zero', () => {
    spawn.mockReturnValue({ ...success(), error: Object.assign(new Error('not found'), { code: 'ENOENT' }) });
    expect(apmTargets('/workspace')).toMatchObject({ ok: false, errorCode: 'ENOENT' });
  });
  it('distinguishes timeout and retains partial-output evidence', () => {
    spawn.mockReturnValue({ ...success(), status: null, stdout: 'partial', signal: 'SIGKILL', error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }) });
    expect(apmInstall('/workspace')).toMatchObject({ ok: false, timedOut: true, stdout: 'partial', outputLimitExceeded: false });
    expect(spawn).toHaveBeenCalledTimes(1);
  });
  it('distinguishes output overflow from a passing audit', () => {
    spawn.mockReturnValue({ ...success(), error: Object.assign(new Error('overflow'), { code: 'ENOBUFS' }) });
    expect(apmAudit('/workspace')).toMatchObject({ ok: false, outputLimitExceeded: true, timedOut: false });
  });
  it('fails on nonzero exit status and signal termination', () => {
    spawn.mockReturnValue({ ...success(), status: 2, stderr: 'policy denied' });
    expect(apmAudit('/workspace')).toMatchObject({ ok: false, status: 2, stderr: 'policy denied' });
    spawn.mockReturnValue({ ...success(), signal: 'SIGTERM' });
    expect(apmTargets('/workspace').ok).toBe(false);
  });
  it.each([0, -1, Infinity, NaN, 1.5, 900001])('rejects invalid timeout %s before execution', (timeoutMs) => {
    expect(() => apmTargets('/workspace', { timeoutMs })).toThrow(/timeoutMs/);
    expect(spawn).not.toHaveBeenCalled();
  });
  it.each([0, -1, Infinity, NaN, 16777217])('rejects invalid output bound %s before execution', (maxBufferBytes) => {
    expect(() => apmAudit('/workspace', { maxBufferBytes })).toThrow(/maxBufferBytes/);
    expect(spawn).not.toHaveBeenCalled();
  });
});
