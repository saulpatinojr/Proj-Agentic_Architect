import { packagedConfigurationFingerprint } from '@code-conductor/policy';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export type StartupMode = 'first_run' | 'config_changed' | 'warm';

export interface StartupSnapshot {
  mode: StartupMode;
  fingerprint: string;
  capturedAt: string;
}

const fingerprintFiles = [
  '.code-conductor/config.json',
  'apm.yml',
  'apm.lock.yaml',
  'apm-policy.yml',
  'AGENTS.md',
  'config/capabilities.yaml',
  'config/roles.yaml',
  'config/risk.yaml',
  'config/mcp-catalog.yaml',
] as const;

export function workspaceFingerprint(root: string): string {
  const hash = createHash('sha256');
  hash.update(packagedConfigurationFingerprint());
  hash.update(resolve(root));
  hash.update('\0');
  for (const relativePath of fingerprintFiles) {
    const path = join(root, relativePath);
    hash.update(relativePath);
    hash.update('\0');
    if (existsSync(path)) {
      const stat = lstatSync(path);
      if (stat.isFile() && stat.size <= 1048576) hash.update(readFileSync(path));
      else hash.update('<unsupported-file>');
    }
    else hash.update('<missing>');
    hash.update('\0');
  }
  return hash.digest('hex');
}

export function classifyStartup(previousFingerprint: string | undefined, currentFingerprint: string): StartupMode {
  if (!previousFingerprint) return 'first_run';
  return previousFingerprint === currentFingerprint ? 'warm' : 'config_changed';
}

export function startupSnapshot(root: string, previousFingerprint?: string): StartupSnapshot {
  const fingerprint = workspaceFingerprint(root);
  return {
    mode: classifyStartup(previousFingerprint, fingerprint),
    fingerprint,
    capturedAt: new Date().toISOString(),
  };
}
