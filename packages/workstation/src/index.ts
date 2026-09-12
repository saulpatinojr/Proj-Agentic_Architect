import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export type HarnessTrustMode = 'read' | 'modify';

export interface HarnessValidationRecord {
  readValidatedAt?: string;
  modifyValidatedAt?: string;
  clientVersion?: string;
  notes?: string[];
}

export interface WorkstationState {
  version: 1;
  harnesses: Record<string, HarnessValidationRecord>;
}

export function workstationStatePath(env: NodeJS.ProcessEnv = process.env): string {
  return env.CODE_CONDUCTOR_WORKSTATION_STATE || join(env.CODE_CONDUCTOR_HOME || join(homedir(), '.code-conductor'), 'workstation.json');
}

function ensurePrivateDirectory(path: string): void {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
}

export class WorkstationStore {
  constructor(public readonly path = workstationStatePath()) {}

  load(): WorkstationState {
    try {
      const parsed = JSON.parse(readFileSync(this.path, 'utf8')) as WorkstationState;
      return parsed.version === 1 && parsed.harnesses ? parsed : { version: 1, harnesses: {} };
    } catch {
      return { version: 1, harnesses: {} };
    }
  }

  save(state: WorkstationState): void {
    ensurePrivateDirectory(dirname(this.path));
    const temp = `${this.path}.tmp`;
    writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    chmodSync(temp, 0o600);
    renameSync(temp, this.path);
    chmodSync(this.path, 0o600);
  }

  isTrusted(harness: string, mode: HarnessTrustMode): boolean {
    const record = this.load().harnesses[harness];
    return mode === 'read' ? Boolean(record?.readValidatedAt || record?.modifyValidatedAt) : Boolean(record?.modifyValidatedAt);
  }

  record(harness: string, mode: HarnessTrustMode, clientVersion?: string, note?: string): void {
    const state = this.load();
    const existing = state.harnesses[harness] ?? {};
    const now = new Date().toISOString();
    if (mode === 'read') existing.readValidatedAt = now;
    else {
      existing.readValidatedAt ??= now;
      existing.modifyValidatedAt = now;
    }
    if (clientVersion) existing.clientVersion = clientVersion;
    if (note) existing.notes = [...(existing.notes ?? []), note].slice(-10);
    state.harnesses[harness] = existing;
    this.save(state);
  }
}
