import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { HarnessAdapter, HarnessExecutionRequest, HarnessExecutionOutcome, HarnessExecutionSurface } from '../../packages/adapters/src/index.js';
import { RunStore } from '../../packages/evidence/src/index.js';
import { executeTask, createTask } from '../../packages/runtime/src/index.js';
import type { WorktreeHandle, WorktreeManager } from '../../packages/git/src/index.js';

class FakeAdapter implements HarnessAdapter {
  constructor(
    public id: string,
    public provider: string,
    public command: string | null = `fake-${id}`,
    public executionSurface: HarnessExecutionSurface = 'cli',
  ) {}
  available(): boolean { return true; }
  version(): string { return 'fake-1.0.0'; }
  async execute(request: HarnessExecutionRequest): Promise<HarnessExecutionOutcome> {
    const payload = { status: 'completed', changes: request.assignment.role === 'builder' ? ['fake.txt'] : [], tests: [], evidence: [], findings: [], risks: [], blockers: [], recommendation: request.assignment.role === 'reviewer' ? 'ready' : 'review' };
    return { harness: this.id, surface: this.executionSurface, command: this.command ?? 'fake', args: [], exitCode: 0, signal: null, stdout: `CC_RESULT_JSON:${JSON.stringify(payload)}\n`, stderr: '', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), timedOut: false };
  }
}

class TimeoutAdapter extends FakeAdapter {
  calls = 0;
  override async execute(_request: HarnessExecutionRequest): Promise<HarnessExecutionOutcome> {
    this.calls += 1;
    return {
      harness: this.id,
      surface: this.executionSurface,
      command: this.command ?? 'fake',
      args: [],
      exitCode: null,
      signal: 'SIGTERM',
      stdout: '',
      stderr: 'timed out',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      timedOut: true,
    };
  }
}

class FakeWorktrees {
  root = '/fake';
  create(repositoryRoot: string, taskId: string, agentId: string): WorktreeHandle { return { repositoryRoot, path: repositoryRoot, branch: `cc/${taskId}/${agentId}`, baseRef: 'HEAD', baseSha: 'fake-base', taskId, agentId }; }
  remove(): void {}
}

describe('run execution', () => {
  it('executes an R1 run with fake paid-client adapters and deterministic gates after explicit trust', async () => {
    const temp = mkdtempSync(join(tmpdir(), 'cc-run-test-'));
    try {
      const adapters = new Map<string, HarnessAdapter>([['codex', new FakeAdapter('codex', 'openai')], ['claude', new FakeAdapter('claude', 'anthropic')]]);
      const outcome = await executeTask(resolve('.'), createTask('fake R1 run', 'R1', resolve('.')), {
        execute: true, adapters, store: new RunStore(temp), worktrees: new FakeWorktrees() as unknown as WorktreeManager,
        gateExecutor: () => ({ status: 0, stdout: 'ok', stderr: '' }), isHarnessTrusted: () => true,
      });
      expect(outcome.manifest.results.map((r) => r.role)).toEqual(['builder', 'reviewer', 'validator']);
      expect(outcome.manifest.results[0]?.surface).toBe('cli');
      expect(outcome.manifest.mergeDecision?.decision).toBe('ready');
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });

  it('stops external execution when workstation trust is explicitly denied', async () => {
    const temp = mkdtempSync(join(tmpdir(), 'cc-run-test-'));
    try {
      const adapters = new Map<string, HarnessAdapter>([['codex', new FakeAdapter('codex', 'openai')], ['claude', new FakeAdapter('claude', 'anthropic')]]);
      const outcome = await executeTask(resolve('.'), createTask('blocked R1 run', 'R1', resolve('.')), { execute: true, adapters, store: new RunStore(temp), worktrees: new FakeWorktrees() as unknown as WorktreeManager, gateExecutor: () => ({ status: 0, stdout: 'ok', stderr: '' }), isHarnessTrusted: () => false });
      expect(outcome.manifest.results[0]?.status).toBe('blocked');
      expect(outcome.manifest.mergeDecision?.decision).toBe('changes_required');
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });

  it('fails closed when no workstation trust callback is supplied', async () => {
    const temp = mkdtempSync(join(tmpdir(), 'cc-run-test-'));
    try {
      const adapters = new Map<string, HarnessAdapter>([['codex', new FakeAdapter('codex', 'openai')], ['claude', new FakeAdapter('claude', 'anthropic')]]);
      const outcome = await executeTask(resolve('.'), createTask('untrusted by default R1 run', 'R1', resolve('.')), {
        execute: true,
        adapters,
        store: new RunStore(temp),
        worktrees: new FakeWorktrees() as unknown as WorktreeManager,
        gateExecutor: () => ({ status: 0, stdout: 'ok', stderr: '' }),
      });
      expect(outcome.manifest.results[0]?.status).toBe('blocked');
      expect(outcome.manifest.results[0]?.blockers[0]).toContain('surface cli has not passed Code Conductor workstation');
      expect(outcome.manifest.mergeDecision?.decision).toBe('changes_required');
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });

  it('blocks an adapter whose execution surface does not match the planned surface', async () => {
    const temp = mkdtempSync(join(tmpdir(), 'cc-run-surface-test-'));
    try {
      const adapters = new Map<string, HarnessAdapter>([['codex', new FakeAdapter('codex', 'openai', 'fake-codex', 'acp')], ['claude', new FakeAdapter('claude', 'anthropic')]]);
      const outcome = await executeTask(resolve('.'), createTask('generic implementation', 'R1', resolve('.')), {
        execute: true,
        adapters,
        store: new RunStore(temp),
        worktrees: new FakeWorktrees() as unknown as WorktreeManager,
        gateExecutor: () => ({ status: 0, stdout: 'ok', stderr: '' }),
        isHarnessTrusted: () => true,
      });
      expect(outcome.manifest.results[0]?.status).toBe('blocked');
      expect(outcome.manifest.results[0]?.blockers[0]).toContain('configured for cli');
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });

  it('does not automatically retry a timed-out external harness', async () => {
    const temp = mkdtempSync(join(tmpdir(), 'cc-run-timeout-test-'));
    const timedOut = new TimeoutAdapter('codex', 'openai');
    try {
      const adapters = new Map<string, HarnessAdapter>([['codex', timedOut], ['claude', new FakeAdapter('claude', 'anthropic')]]);
      const outcome = await executeTask(resolve('.'), createTask('timeout R1 run', 'R1', resolve('.')), {
        execute: true,
        adapters,
        store: new RunStore(temp),
        worktrees: new FakeWorktrees() as unknown as WorktreeManager,
        gateExecutor: () => ({ status: 0, stdout: 'ok', stderr: '' }),
        isHarnessTrusted: () => true,
      });
      expect(timedOut.calls).toBe(1);
      expect(outcome.manifest.results[0]?.status).toBe('failed');
      expect(outcome.manifest.results[0]?.blockers.join(' ')).toContain('automatic retry was suppressed');
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });
});
