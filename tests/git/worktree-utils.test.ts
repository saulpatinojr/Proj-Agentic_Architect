import { describe, expect, it } from 'vitest';
import { gitChangedFiles, isSensitiveRepositoryPath } from '../../packages/git/src/index.js';

describe('git helpers', () => {
  it('can inspect the current repository without mutating it', () => {
    expect(Array.isArray(gitChangedFiles('.'))).toBe(true);
  });

  it('blocks common secret/state paths while allowing templates', () => {
    expect(isSensitiveRepositoryPath('.env')).toBe(true);
    expect(isSensitiveRepositoryPath('ops/prod.tfstate')).toBe(true);
    expect(isSensitiveRepositoryPath('certs/client.pem')).toBe(true);
    expect(isSensitiveRepositoryPath('.env.example')).toBe(false);
    expect(isSensitiveRepositoryPath('src/index.ts')).toBe(false);
  });
});
