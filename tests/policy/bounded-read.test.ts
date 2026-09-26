import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { readBoundedFile } from '../../packages/policy/src/bounded-read.js';

describe('descriptor-bounded configuration reads', () => {
  it('reads empty and exact-limit regular files', () => {
    const root = mkdtempSync(join(tmpdir(), 'cc-fd-read-'));
    try {
      const file = join(root, 'file'); writeFileSync(file, '');
      expect(readBoundedFile(file, 4).length).toBe(0);
      writeFileSync(file, '1234'); expect(readBoundedFile(file, 4).toString()).toBe('1234');
      writeFileSync(file, '12345'); expect(() => readBoundedFile(file, 4)).toThrow(/bounded|limit/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  it('rejects missing entries, directories and symlinks without reading their targets', () => {
    const root = mkdtempSync(join(tmpdir(), 'cc-fd-links-'));
    try {
      mkdirSync(join(root, 'dir')); expect(() => readBoundedFile(join(root, 'dir'), 8)).toThrow();
      expect(() => readBoundedFile(join(root, 'missing'), 8)).toThrow();
      if (process.platform !== 'win32') {
        writeFileSync(join(root, 'source'), 'target');
        symlinkSync(join(root, 'source'), join(root, 'link'));
        expect(() => readBoundedFile(join(root, 'link'), 8)).toThrow();
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  it.each([0, -1, NaN, Infinity, 1.5, 1048577])('rejects invalid limit %s before opening', (limit) => {
    expect(() => readBoundedFile('/does/not/exist', limit)).toThrow(/Invalid/);
  });
});
