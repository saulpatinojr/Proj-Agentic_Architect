import { appendFileSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
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

export class RunStore {
  readonly root: string;

  constructor(root = join(conductorHome(), 'runs')) {
    this.root = root;
    mkdirSync(root, { recursive: true });
  }

  runDirectory(runId: string): string {
    const safe = runId.replace(/[^A-Za-z0-9._-]/g, '_');
    const dir = join(this.root, safe);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  saveManifest(manifest: RunManifest): string {
    const target = join(this.runDirectory(manifest.runId), 'manifest.json');
    const temp = `${target}.tmp`;
    writeFileSync(temp, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    renameSync(temp, target);
    return target;
  }

  appendEvent(event: RunEvent): string {
    const target = join(this.runDirectory(event.runId), 'events.jsonl');
    mkdirSync(dirname(target), { recursive: true });
    appendFileSync(target, `${JSON.stringify(event)}\n`, 'utf8');
    return target;
  }
}
