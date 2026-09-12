import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectRepositoryProfiles } from '../../packages/mcp/src/index.js';

describe('MCP repository profile detection', () => {
  it('does not enable GitHub for a non-git directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'cc-mcp-profile-'));
    try {
      expect(detectRepositoryProfiles(root)).not.toContain('github');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('enables GitHub only when the repository has a .git marker', () => {
    const root = mkdtempSync(join(tmpdir(), 'cc-mcp-profile-'));
    try {
      mkdirSync(join(root, '.git'));
      expect(detectRepositoryProfiles(root)).toContain('github');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('detects technology profiles independently from GitHub', () => {
    const root = mkdtempSync(join(tmpdir(), 'cc-mcp-profile-'));
    try {
      writeFileSync(join(root, 'main.tf'), 'terraform {}\n');
      writeFileSync(join(root, 'ansible.cfg'), '[defaults]\n');
      const profiles = detectRepositoryProfiles(root);
      expect(profiles).toContain('terraform');
      expect(profiles).toContain('ansible');
      expect(profiles).not.toContain('github');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
