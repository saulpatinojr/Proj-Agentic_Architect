import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface ApmCommandResult {
  ok: boolean;
  status: number | null;
  stdout: string;
  stderr: string;
}

function run(root: string, args: string[]): ApmCommandResult {
  const result = spawnSync('apm', args, { cwd: root, encoding: 'utf8', shell: false });
  return { ok: result.status === 0, status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

export function apmTargets(root: string): ApmCommandResult {
  return run(root, ['targets']);
}

export function apmInstall(root: string): ApmCommandResult {
  return run(root, ['install']);
}

export function apmAudit(root: string): ApmCommandResult {
  return run(root, ['audit', '--ci', '--policy', './apm-policy.yml', '--no-fail-fast']);
}

export function apmLockPresent(root: string): boolean {
  return existsSync(join(root, 'apm.lock.yaml'));
}
