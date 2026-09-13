import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { classifyStartup, startupSnapshot, workspaceFingerprint } from '../../apps/vscode/src/startup.js';

describe('VS Code startup fingerprinting', () => {
  it('classifies first, warm, and config-changed starts without external calls', () => {
    expect(classifyStartup(undefined, 'a')).toBe('first_run');
    expect(classifyStartup('a', 'a')).toBe('warm');
    expect(classifyStartup('a', 'b')).toBe('config_changed');
  });

  it('changes the fingerprint when authoritative startup configuration changes', () => {
    const root = mkdtempSync(join(tmpdir(), 'cc-vscode-startup-'));
    try {
      mkdirSync(join(root, 'config'), { recursive: true });
      writeFileSync(join(root, 'apm.yml'), 'name: example\n');
      writeFileSync(join(root, 'config', 'capabilities.yaml'), 'version: 2\n');
      const before = workspaceFingerprint(root);
      const warm = startupSnapshot(root, before);
      expect(warm.mode).toBe('warm');

      writeFileSync(join(root, 'config', 'capabilities.yaml'), 'version: 2\nchanged: true\n');
      const after = workspaceFingerprint(root);
      expect(after).not.toBe(before);
      expect(startupSnapshot(root, before).mode).toBe('config_changed');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
