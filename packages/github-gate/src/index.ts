import { spawnSync } from 'node:child_process';

export interface GitHubCommandResult {
  ok: boolean;
  status: number | null;
  stdout: string;
  stderr: string;
}

function gh(cwd: string, args: string[]): GitHubCommandResult {
  const result = spawnSync('gh', args, { cwd, encoding: 'utf8', shell: false });
  const stderr = [result.stderr || '', result.error?.message || ''].filter(Boolean).join('\n');
  return { ok: result.status === 0, status: result.status, stdout: result.stdout || '', stderr };
}

export function githubAuthStatus(cwd: string): GitHubCommandResult {
  return gh(cwd, ['auth', 'status']);
}

export function createDraftPullRequest(cwd: string, title: string, body: string, base = 'main'): GitHubCommandResult {
  return gh(cwd, ['pr', 'create', '--draft', '--base', base, '--title', title, '--body', body]);
}

export function pullRequestStatus(cwd: string): GitHubCommandResult {
  return gh(cwd, ['pr', 'view', '--json', 'number,url,state,isDraft,headRefName,headRefOid,baseRefName,mergeStateStatus,reviewDecision,statusCheckRollup']);
}

export function pullRequestChecks(cwd: string): GitHubCommandResult {
  return gh(cwd, ['pr', 'checks']);
}
