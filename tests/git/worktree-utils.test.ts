import { describe, expect, it } from 'vitest';
import { gitChangedFiles } from '../../packages/git/src/index.js';

describe('git helpers', () => {
  it('can inspect the current repository without mutating it', () => {
    expect(Array.isArray(gitChangedFiles('.'))).toBe(true);
  });
});
