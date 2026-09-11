import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WorktreeManager, gitChangedFiles, isSensitiveRepositoryPath } from '../../packages/git/src/index.js';

describe('git helpers', () => {
  it('can inspect the current repository without mutating it', () => {
    expect(Array.isArray(gitChangedFiles('.'))).toBe(true);
  });

  it('blocks common secret/state paths while allowing templates', () => {
    expect(isSensitiveRepositoryPath('.env')).toBe(true);
    expect(isSensitiveRepositoryPath('ops/prod.tfstate')).toBe(true);
    expect(isSensitiveRepositoryPath('certs/client.pem')).toBe(true);
    expect(isSensitiveRepositoryPath('.env.example')).toBe(false);
    expect(isSensitiveRepositoryPath('src/index.ts')).toBe(false);
  });

  it('creates modifying worktree directories as owner-only on POSIX systems', () => {
    if (process.platform === 'win32') return;

    const repositoryRoot = mkdtempSync(join(tmpdir(), 'cc-worktree-repo-'));
    const worktreeRoot = mkdtempSync(join(tmpdir(), 'cc-worktrees-'));
    let handle: ReturnType<WorktreeManager['create']> | undefined;

    try {
      execFileSync('git', ['init'], { cwd: repositoryRoot });
      writeFileSync(join(repositoryRoot, 'README.md'), '# fixture\n');
      execFileSync('git', ['add', 'README.md'], { cwd: repositoryRoot });
      execFileSync('git', ['-c', 'user.name=Code Conductor Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture'], { cwd: repositoryRoot });

      const manager = new WorktreeManager(worktreeRoot);
      handle = manager.create(repositoryRoot, 'T-PERM', 'builder');

      const repoDirectory = join(worktreeRoot, handle.path.split('/').at(-3) ?? '');
      const taskDirectory = join(repoDirectory, 'T-PERM');
      const mode = (path: string) => statSync(path).mode & 0o777;

      expect(mode(worktreeRoot)).toBe(0o700);
      expect(mode(repoDirectory)).toBe(0o700);
      expect(mode(taskDirectory)).toBe(0o700);
      expect(mode(handle.path)).toBe(0o700);

      manager.remove(handle, true, true);
      handle = undefined;
    } finally {
      if (handle) {
        try {
          new WorktreeManager(worktreeRoot).remove(handle, true, true);
        } catch {
          // Best-effort cleanup for a failed assertion or git operation.
        }
      }
      rmSync(worktreeRoot, { recursive: true, force: true });
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });
});
