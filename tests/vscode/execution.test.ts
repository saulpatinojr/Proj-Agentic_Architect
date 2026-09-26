import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cliProcessSpec, localCommandName, missingBaselineCommands } from '../../apps/vscode/src/execution.js';

describe('native VS Code process boundary', () => {
  const root = resolve('workspace with spaces');
  const runtime = join(root, 'extension', 'dist', 'cc.js');
  it('keeps shell metacharacters and quotes as literal argument values', () => {
    const objective = '$(touch HACKED); `echo nope` & %PATH% "quoted"\nsecond line';
    expect(cliProcessSpec(root, runtime, ['plan', '--objective', objective], true)).toEqual({ executable: 'node', args: [runtime, 'plan', '--objective', objective], cwd: root });
  });
  it('copies the supplied argument vector rather than sharing mutable caller state', () => {
    const args = ['doctor'];
    const spec = cliProcessSpec(root, runtime, args, true);
    args.push('--other');
    expect(spec.args).toEqual([runtime, 'doctor']);
  });
  it('rejects every command in an untrusted workspace', () => {
    expect(() => cliProcessSpec(root, runtime, ['doctor'], false)).toThrow(/Trust/);
  });
  it('rejects relative working directories, relative runtimes and null bytes', () => {
    expect(() => cliProcessSpec('relative', runtime, [], true)).toThrow(/absolute/);
    expect(() => cliProcessSpec(root, 'relative.js', [], true)).toThrow(/absolute/);
    expect(() => cliProcessSpec(root, runtime, ['bad\0value'], true)).toThrow(/null/);
  });
  it('does not require APM or every AI client for the baseline', () => {
    expect(missingBaselineCommands({ node: true, git: true, gh: true, apm: false })).toEqual([]);
    expect(missingBaselineCommands({ git: true })).toEqual(['node', 'gh']);
  });
  it.each(['--help', '-a', '../node', 'node --flag', '$(node)', 'node;other', ''])('rejects option/path/script-like probe %s', (value) => {
    expect(localCommandName(value)).toBe(false);
  });
  it.each(['node', 'gh', 'kiro-cli', 'pwsh', 'python3.12'])('permits plain command name %s', (value) => {
    expect(localCommandName(value)).toBe(true);
  });
});
