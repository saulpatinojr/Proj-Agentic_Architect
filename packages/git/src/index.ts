import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export interface WorktreeHandle {
  repositoryRoot: string;
  path: string;
  branch: string;
  baseRef: string;
  taskId: string;
  agentId: string;
}

function safeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'agent';
}

function git(cwd: string, args: string[], allowFailure = false): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(' ')} failed: ${(result.stderr || result.stdout || '').trim()}`);
  }
  return (result.stdout || '').trim();
}

export function resolveRepositoryRoot(cwd: string): string {
  return resolve(git(cwd, ['rev-parse', '--show-toplevel']));
}

export function gitChangedFiles(cwd: string): string[] {
  const output = git(cwd, ['status', '--porcelain=v1'], true);
  return output ? output.split(/\r?\n/).map((line) => line.slice(3).trim()).filter(Boolean) : [];
}

export class WorktreeManager {
  readonly root: string;

  constructor(root = join(homedir(), '.code-conductor', 'worktrees')) {
    this.root = root;
    mkdirSync(root, { recursive: true });
  }

  create(repositoryRoot: string, taskId: string, agentId: string, baseRef = 'HEAD'): WorktreeHandle {
    const repo = resolveRepositoryRoot(repositoryRoot);
    const repoId = createHash('sha256').update(repo).digest('hex').slice(0, 10);
    const task = safeSegment(taskId);
    const agent = safeSegment(agentId);
    const branch = `cc/${task}/${agent}`;
    const path = join(this.root, repoId, task, agent);
    mkdirSync(join(this.root, repoId, task), { recursive: true });
    git(repo, ['worktree', 'add', '-b', branch, path, baseRef]);
    return { repositoryRoot: repo, path, branch, baseRef, taskId, agentId };
  }

  remove(handle: WorktreeHandle, deleteBranch = false): void {
    git(handle.repositoryRoot, ['worktree', 'remove', '--force', handle.path], true);
    git(handle.repositoryRoot, ['worktree', 'prune'], true);
    if (deleteBranch) git(handle.repositoryRoot, ['branch', '-D', handle.branch], true);
  }
}
