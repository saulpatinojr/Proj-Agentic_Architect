import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectRepositoryProfiles, selectMcpServers, type McpCatalog } from '../../packages/mcp/src/index.js';

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

describe('MCP catalog provenance policy', () => {
  const baseServer = {
    publisher: 'Example',
    maturity: 'experimental',
    source: 'local',
    authentication: 'none',
    default_access: 'read' as const,
    profiles: ['context-optimization'],
  };

  it('allows an explicitly approved Code Conductor first-party server under official-only policy', () => {
    const catalog: McpCatalog = {
      version: 1,
      policy: { official_only_by_default: true, allow_code_conductor_first_party: true },
      servers: {
        optimizer: { ...baseServer, official: false, provenance: 'code_conductor_first_party' },
      },
    };
    expect(selectMcpServers(catalog, ['context-optimization']).map(([id]) => id)).toEqual(['optimizer']);
  });

  it('still blocks unrelated non-official MCP servers by default', () => {
    const catalog: McpCatalog = {
      version: 1,
      policy: { official_only_by_default: true, allow_code_conductor_first_party: true },
      servers: {
        thirdParty: { ...baseServer, official: false, provenance: 'third_party' },
      },
    };
    expect(selectMcpServers(catalog, ['context-optimization'])).toEqual([]);
  });
});
