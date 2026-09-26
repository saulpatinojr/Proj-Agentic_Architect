import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolvePlanningConfiguration, readDefaultDocument } from '../../packages/runtime/src/configuration.js';
import { createTask, planTask } from '../../packages/runtime/src/planner.js';
const roots: string[] = [];
function temp() { const p = mkdtempSync(join(tmpdir(), 'cc-config-')); roots.push(p); return p; }
function approved(root: string, name: string, document: unknown) {
  const path = join(root, name); writeFileSync(path, JSON.stringify(document));
  return { path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') };
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
describe('packaged planning configuration', () => {
  it('plans against an empty unrelated directory without writing a scaffold', () => {
    const root = temp();
    const plan = planTask(root, createTask('normal implementation', 'R1'), { availableHarnesses: new Set(['claude', 'codex']) });
    expect(plan.assignments.map((a) => a.role)).toEqual(['builder', 'reviewer', 'validator']);
    expect(plan.configurationEvidence).toHaveLength(3);
    expect(readdirSync(root)).toEqual([]);
  });
  it('ignores unapproved repository config, including changes to authority and risk', () => {
    const root = temp(); mkdirSync(join(root, 'config'));
    writeFileSync(join(root, 'config/roles.yaml'), 'roles: {builder: {may_merge: true}}');
    const resolved = resolvePlanningConfiguration(root);
    expect(resolved.roles.roles.builder.may_merge).toBe(false);
    expect(resolved.risks.risk_classes.R4.require_human_approval_before_side_effect).toBe(true);
  });
  it('applies selected user then workspace routing preferences with exact provenance', () => {
    const root = temp();
    const user = approved(root, 'user.json', { version: 1, preferredHarnesses: { builder: ['claude', 'codex'] } });
    const workspace = approved(root, 'workspace.json', { version: 1, preferredHarnesses: { builder: ['codex'] } });
    const result = resolvePlanningConfiguration(root, { user, workspace });
    expect(result.roles.roles.builder.preferred_harnesses).toEqual(['codex']);
    expect(result.evidence.map((e) => e.layer)).toEqual(['bundled', 'bundled', 'bundled', 'user', 'workspace']);
  });
  it('rejects stale approvals, missing approvals and attempts to broaden authorities', () => {
    const root = temp();
    const file = approved(root, 'settings.json', { version: 1 });
    writeFileSync(file.path, '{"version":1,"new":true}');
    expect(() => resolvePlanningConfiguration(root, { workspace: file })).toThrow(/changed after approval/);
    expect(() => resolvePlanningConfiguration(root, { workspace: { path: file.path, sha256: '' } })).toThrow(/SHA-256/);
    for (const document of [{ version: 1, roles: { builder: { may_merge: true } } }, { version: 1, preferredHarnesses: { validator: ['codex'] } }]) {
      const bad = approved(root, 'bad.json', document);
      expect(() => resolvePlanningConfiguration(root, { workspace: bad })).toThrow();
    }
  });
  it('rejects workspace escapes, leaf symlinks and oversized configuration', () => {
    const root = temp(), other = temp();
    const external = approved(other, 'config.json', { version: 1 });
    expect(() => resolvePlanningConfiguration(root, { workspace: external })).toThrow(/escapes/);
    const link = join(root, 'link.json');
    if (process.platform !== 'win32') {
      const inside = approved(root, 'inside.json', { version: 1 }); symlinkSync(inside.path, link);
      expect(() => resolvePlanningConfiguration(root, { workspace: { ...inside, path: link } })).toThrow(/regular/);
    }
    const large = approved(root, 'large.json', { version: 1, specializationSignals: { huge: ['x'.repeat(140000)] } });
    expect(() => resolvePlanningConfiguration(root, { workspace: large })).toThrow(/bounded/);
  });
  it('rejects unknown defaults and malformed override shapes', () => {
    expect(() => readDefaultDocument('../secrets' as any)).toThrow(/Unknown/);
    const root = temp();
    for (const document of [null, [], { version: 2 }, { version: 1, preferredHarnesses: { builder: [] } }, { version: 1, specializationSignals: { constructor: ['bad'] } }]) {
      expect(() => resolvePlanningConfiguration(root, { workspace: approved(root, 'bad.json', document) })).toThrow();
    }
  });
});
