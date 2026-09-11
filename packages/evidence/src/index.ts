import { createHash } from 'node:crypto';
import { appendFileSync, chmodSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { RunManifest } from '@code-conductor/schemas';

export interface RunEvent {
  at: string;
  runId: string;
  type: string;
  assignmentId?: string;
  message: string;
  data?: Record<string, unknown>;
}

export function conductorHome(env: NodeJS.ProcessEnv = process.env): string {
  return env.CODE_CONDUCTOR_HOME || join(homedir(), '.code-conductor');
}

function ensurePrivateDirectory(path: string): void {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
}

export function safeRunDirectoryName(runId: string): string {
  if (/^[A-Za-z0-9_-]{1,120}$/.test(runId)) return runId;
  const digest = createHash('sha256').update(runId).digest('hex').slice(0, 12);
  const prefix = runId
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 96)
    .replace(/[-_]+$/g, '');
  return prefix ? `${prefix}-${digest}` : `run-${digest}`;
}

export class RunStore {
  readonly root: string;

  constructor(root = join(conductorHome(), 'runs')) {
    this.root = root;
    ensurePrivateDirectory(root);
  }

  runDirectory(runId: string): string {
    const dir = join(this.root, safeRunDirectoryName(runId));
    ensurePrivateDirectory(dir);
    return dir;
  }

  saveManifest(manifest: RunManifest): string {
    const target = join(this.runDirectory(manifest.runId), 'manifest.json');
    const temp = `${target}.tmp`;
    writeFileSync(temp, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    chmodSync(temp, 0o600);
    renameSync(temp, target);
    chmodSync(target, 0o600);
    return target;
  }

  appendEvent(event: RunEvent): string {
    const target = join(this.runDirectory(event.runId), 'events.jsonl');
    ensurePrivateDirectory(dirname(target));
    appendFileSync(target, `${JSON.stringify(event)}\n`, { encoding: 'utf8', mode: 0o600 });
    chmodSync(target, 0o600);
    return target;
  }
}
