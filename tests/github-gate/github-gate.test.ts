import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { githubAuthStatus } from '../../packages/github-gate/src/index.js';

describe('GitHub gate helpers', () => {
  it('preserves spawn diagnostics when the GitHub CLI cannot be found', () => {
    const originalPath = process.env.PATH;
    process.env.PATH = '';
    try {
      const result = githubAuthStatus(resolve('.'));
      expect(result.ok).toBe(false);
      expect(result.status).toBeNull();
      expect(result.stderr).toMatch(/ENOENT|spawnSync gh/i);
    } finally {
      if (originalPath === undefined) delete process.env.PATH;
      else process.env.PATH = originalPath;
    }
  });
});
