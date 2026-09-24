import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { HarnessAdapter, HarnessExecutionRequest, HarnessExecutionOutcome, HarnessExecutionSurface } from '../../packages/adapters/src/index.js';
import { RunStore } from '../../packages/evidence/src/index.js';
import { executeTask, createTask } from '../../packages/runtime/src/index.js';
import { WorktreeManager, type WorktreeHandle } from '../../packages/git/src/index.js';

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

// The builder writes a file into its assigned worktree, so completed runs exercise
// the real commit path rather than an empty worktree.
class WritingAdapter extends FakeAdapter {
  override async execute(request: HarnessExecutionRequest): Promise<HarnessExecutionOutcome> {
    if (request.assignment.role === 'builder') writeFileSync(join(request.cwd, 'agent-output.txt'), 'agent change\n');
    return super.execute(request);
  }
}

const git = (cwd: string, ...args: string[]): string => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

function initRepository(path: string): string {
  mkdirSync(path, { recursive: true });
  git(path, 'init', '-q');
  writeFileSync(join(path, 'README.md'), '# fixture\n');
  // The validator detects gate profiles in the builder's worktree, which in real runs
  // is a checkout of the repository under work. Carry over the gate config and the
  // files the code-conductor profile detects on, so the validator still runs gates.
  cpSync(resolve('config'), join(path, 'config'), { recursive: true });
  for (const file of ['package.json', 'tsconfig.json']) cpSync(resolve(file), join(path, file));
  git(path, 'add', '.');
  git(path, '-c', 'user.name=Code Conductor Test', '-c', 'user.email=test@example.invalid', 'commit', '-q', '-m', 'fixture');
  return path;
}

// Real linked worktrees from WorktreeManager, but of a throwaway repository rather
// than the checkout running the suite. The planner still reads config from the real
// repository root. An earlier double returned the repository root itself as the
// worktree, so a completed builder run committed the contributor's uncommitted work
// onto their branch (issue #48).
class SandboxWorktrees extends WorktreeManager {
  readonly sandboxRepository: string;
  constructor(base: string) {
    super(join(base, 'sandbox-worktrees'));
    this.sandboxRepository = initRepository(join(base, 'sandbox-repo'));
  }
  override create(_repositoryRoot: string, taskId: string, agentId: string, baseRef = 'HEAD'): WorktreeHandle {
    return super.create(this.sandboxRepository, taskId, agentId, baseRef);
  }
}

describe('run execution', () => {
  it('executes an R1 run with fake paid-client adapters and deterministic gates after explicit trust', async () => {
    const temp = mkdtempSync(join(tmpdir(), 'cc-run-test-'));
    try {
      const adapters = new Map<string, HarnessAdapter>([['codex', new FakeAdapter('codex', 'openai')], ['claude', new FakeAdapter('claude', 'anthropic')]]);
      const outcome = await executeTask(resolve('.'), createTask('fake R1 run', 'R1', resolve('.')), {
        execute: true, adapters, store: new RunStore(temp), worktrees: new SandboxWorktrees(temp),
        gateExecutor: () => ({ status: 0, stdout: 'ok', stderr: '' }), isHarnessTrusted: () => true,
      });
      expect(outcome.manifest.results.map((r) => r.role)).toEqual(['builder', 'reviewer', 'validator']);
      expect(outcome.manifest.results[0]?.surface).toBe('cli');
      expect(outcome.manifest.gates.length).toBeGreaterThan(0);
      expect(outcome.manifest.mergeDecision?.decision).toBe('ready');
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });

  it('stops external execution when workstation trust is explicitly denied', async () => {
    const temp = mkdtempSync(join(tmpdir(), 'cc-run-test-'));
    try {
      const adapters = new Map<string, HarnessAdapter>([['codex', new FakeAdapter('codex', 'openai')], ['claude', new FakeAdapter('claude', 'anthropic')]]);
      const outcome = await executeTask(resolve('.'), createTask('blocked R1 run', 'R1', resolve('.')), { execute: true, adapters, store: new RunStore(temp), worktrees: new SandboxWorktrees(temp), gateExecutor: () => ({ status: 0, stdout: 'ok', stderr: '' }), isHarnessTrusted: () => false });
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
        worktrees: new SandboxWorktrees(temp),
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
        worktrees: new SandboxWorktrees(temp),
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
        worktrees: new SandboxWorktrees(temp),
        gateExecutor: () => ({ status: 0, stdout: 'ok', stderr: '' }),
        isHarnessTrusted: () => true,
      });
      expect(timedOut.calls).toBe(1);
      expect(outcome.manifest.results[0]?.status).toBe('failed');
      expect(outcome.manifest.results[0]?.blockers.join(' ')).toContain('automatic retry was suppressed');
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });

  it('commits builder changes inside a linked worktree, never in the checkout running the suite (#48)', async () => {
    const checkoutHead = git(resolve('.'), 'rev-parse', 'HEAD');
    const temp = mkdtempSync(join(tmpdir(), 'cc-run-isolation-test-'));
    try {
      const adapters = new Map<string, HarnessAdapter>([['codex', new WritingAdapter('codex', 'openai')], ['claude', new WritingAdapter('claude', 'anthropic')]]);
      const outcome = await executeTask(resolve('.'), createTask('isolated R1 run', 'R1', resolve('.')), {
        execute: true, adapters, store: new RunStore(temp), worktrees: new SandboxWorktrees(temp),
        gateExecutor: () => ({ status: 0, stdout: 'ok', stderr: '' }), isHarnessTrusted: () => true,
      });
      expect(outcome.manifest.results[0]?.status).toBe('completed');
      expect(outcome.manifest.results[0]?.changes).toEqual(['agent-output.txt']);
      const worktreePath = outcome.worktrees[0]?.path ?? '';
      expect(git(worktreePath, 'show', '--name-only', '--format=%s', 'HEAD')).toContain('agent-output.txt');
      expect(outcome.manifest.gates.length).toBeGreaterThan(0);
      expect(git(resolve('.'), 'rev-parse', 'HEAD')).toBe(checkoutHead);
      expect(existsSync(join(resolve('.'), 'agent-output.txt'))).toBe(false);
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });

  // #48 was reproduced in a contributor's own linked worktree, so a primary working
  // tree is not the only checkout the unsafe double could have been aimed at.
  it.each([
    ['a primary working tree', false, 'primary working tree'],
    ['a contributor\'s own linked worktree', true, 'not a Code Conductor agent branch'],
  ])('blocks a builder whose worktree is %s instead of committing it (#48)', async (_label, linked, reason) => {
    const temp = mkdtempSync(join(tmpdir(), 'cc-run-foreign-tree-test-'));
    try {
      const repository = initRepository(join(temp, 'contributor-repo'));
      const checkout = linked ? join(temp, 'contributor-worktree') : repository;
      if (linked) git(repository, 'worktree', 'add', '-q', '-b', 'contributor-feature', checkout);
      writeFileSync(join(checkout, 'uncommitted-notes.txt'), 'work in progress\n');
      const head = git(checkout, 'rev-parse', 'HEAD');
      // The unsafe double from #48, aimed at a throwaway repository so a regression
      // cannot damage the checkout running the suite.
      const foreignTree = {
        root: temp,
        create: (_root: string, taskId: string, agentId: string): WorktreeHandle => ({ repositoryRoot: checkout, path: checkout, branch: `cc/${taskId}/${agentId}`, baseRef: 'HEAD', baseSha: head, taskId, agentId }),
        remove: (): void => {},
      } as unknown as WorktreeManager;
      const adapters = new Map<string, HarnessAdapter>([['codex', new WritingAdapter('codex', 'openai')], ['claude', new WritingAdapter('claude', 'anthropic')]]);
      const outcome = await executeTask(resolve('.'), createTask('foreign tree R1 run', 'R1', resolve('.')), {
        execute: true, adapters, store: new RunStore(temp), worktrees: foreignTree,
        gateExecutor: () => ({ status: 0, stdout: 'ok', stderr: '' }), isHarnessTrusted: () => true,
      });
      expect(outcome.manifest.results[0]?.status).toBe('blocked');
      expect(outcome.manifest.results[0]?.blockers.join(' ')).toContain(reason);
      expect(outcome.manifest.mergeDecision?.decision).toBe('changes_required');
      expect(git(checkout, 'rev-parse', 'HEAD')).toBe(head);
      expect(git(checkout, 'status', '--porcelain')).toContain('uncommitted-notes.txt');
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });
});
