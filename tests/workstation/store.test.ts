import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WorkstationStore } from '../../packages/workstation/src/index.js';

function mode(path: string): number {
  return statSync(path).mode & 0o777;
}

describe('workstation trust store', () => {
  it('persists trust state with owner-only permissions on POSIX systems', () => {
    const root = mkdtempSync(join(tmpdir(), 'cc-workstation-test-'));
    const stateDir = join(root, 'state');
    const statePath = join(stateDir, 'workstation.json');
    try {
      const store = new WorkstationStore(statePath);
      store.record('codex', 'modify', 'test-version', 'isolated smoke passed');

      expect(store.isTrusted('codex', 'read')).toBe(true);
      expect(store.isTrusted('codex', 'modify')).toBe(true);
      expect(store.load().harnesses.codex?.clientVersion).toBe('test-version');

      if (process.platform !== 'win32') {
        expect(mode(stateDir)).toBe(0o700);
        expect(mode(statePath)).toBe(0o600);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
