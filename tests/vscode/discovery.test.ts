import { describe, expect, it } from 'vitest';
import { discoveryInventory } from '../../apps/vscode/src/discovery.js';

describe('configured discovery inventory', () => {
  it('keeps baseline clients available when configuration is absent or malformed', () => {
    for (const value of [undefined, null, [], 'invalid', { harnesses: null }]) {
      expect(discoveryInventory(value).commands).toContain('node');
      expect(discoveryInventory(value).commands).toContain('gh');
    }
  });
  it('includes candidate, singular/plural surface commands and configured extensions', () => {
    const inventory = discoveryInventory({ harnesses: { custom: { command_candidates: ['custom-cli'], surfaces: { cli: { command: 'other-cli', commands: ['third-cli', 'custom-cli'] }, ide: { identifiers: ['Vendor.Custom-Extension'] } } } } });
    expect(inventory.commands).toEqual(expect.arrayContaining(['custom-cli', 'other-cli', 'third-cli']));
    expect(inventory.commands.filter((value) => value === 'custom-cli')).toHaveLength(1);
    expect(inventory.extensionIds).toContain('vendor.custom-extension');
  });
  it('rejects shell syntax, arguments, paths, non-strings and malformed extension IDs', () => {
    const unsafe = ['node --eval evil', '../custom', '/bin/cli', '$(evil)', 'x;evil', 'a\0b', 42];
    const inventory = discoveryInventory({ harnesses: { custom: { command_candidates: unsafe, surfaces: { cli: { command: 'x && y', commands: unsafe, identifiers: ['invalid', '../vendor.ext', 42, 'v.e;evil'] } } } } });
    for (const value of unsafe) expect(inventory.commands).not.toContain(value);
    expect(inventory.commands).not.toContain('x && y');
    expect(inventory.extensionIds).not.toContain('invalid');
  });
  it('rebuilds from changed configuration on refresh without retained custom entries', () => {
    const first = discoveryInventory({ harnesses: { a: { command_candidates: ['first-cli'] } } });
    const next = discoveryInventory({ harnesses: { a: { command_candidates: ['next-cli'] } } });
    expect(first.commands).toContain('first-cli');
    expect(next.commands).toContain('next-cli');
    expect(next.commands).not.toContain('first-cli');
  });
  it('bounds excessive inventories instead of spawning unbounded probes', () => {
    const candidates = Array.from({ length: 300 }, (_, i) => `client-${i}`);
    expect(() => discoveryInventory({ harnesses: { a: { command_candidates: candidates } } })).toThrow(/limit/);
  });
});
