import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildInventory } from '../../scripts/agent-catalog-inventory.mjs';

describe('agent catalog immutable intake', () => {
  it('hashes every source file, classifies hints, and records exact/normalized duplicates without merging', () => {
    const root = mkdtempSync(join(tmpdir(), 'cc-agent-catalog-'));
    try {
      mkdirSync(join(root, 'agents'), { recursive: true });
      mkdirSync(join(root, 'skills', 'terraform'), { recursive: true });
      writeFileSync(join(root, 'agents', 'terraform-engineer.agent.md'), '# Terraform Engineer\n\nBuild Terraform.\n');
      writeFileSync(join(root, 'agents', 'terraform-engineer-copy.md'), '# Terraform Engineer\n\nBuild Terraform.\n');
      writeFileSync(join(root, 'agents', 'terraform-engineer-spacing.md'), '# Terraform Engineer  \r\n\r\n\r\nBuild Terraform.  \r\n');
      writeFileSync(join(root, 'skills', 'terraform', 'SKILL.md'), '---\nname: terraform\ndescription: Terraform skill\n---\n# Terraform Skill\n');
      writeFileSync(join(root, 'binary.bin'), Buffer.from([0, 1, 2, 3]));

      const ledger = buildInventory(root);
      expect(ledger.summary.files).toBe(5);
      expect(ledger.summary.exactDuplicates).toBe(1);
      expect(ledger.summary.normalizedDuplicateCandidates).toBe(1);
      expect(ledger.rules.originalsModified).toBe(false);
      expect(ledger.rules.automaticMergeAllowed).toBe(false);

      const agent = ledger.entries.find((entry) => entry.sourcePath === 'agents/terraform-engineer.agent.md');
      expect(agent?.classificationHints).toContain('agent');
      expect(agent?.title).toBe('Terraform Engineer');

      const exact = ledger.entries.find((entry) => entry.sourcePath === 'agents/terraform-engineer-copy.md');
      expect(exact?.exactDuplicateOf).toBe('agents/terraform-engineer.agent.md');
      expect(exact?.disposition).toBe('pending');

      const normalized = ledger.entries.find((entry) => entry.sourcePath === 'agents/terraform-engineer-spacing.md');
      expect(normalized?.normalizedDuplicateOf).toBe('agents/terraform-engineer.agent.md');
      expect(normalized?.exactDuplicateOf).toBeNull();

      const skill = ledger.entries.find((entry) => entry.sourcePath === 'skills/terraform/SKILL.md');
      expect(skill?.classificationHints).toContain('skill');
      expect(skill?.frontmatterKeys).toEqual(['description', 'name']);

      const binary = ledger.entries.find((entry) => entry.sourcePath === 'binary.bin');
      expect(binary?.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(binary?.notes[0]).toContain('not text-inspected');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('records but never follows symlinks during intake', () => {
    if (process.platform === 'win32') return;
    const root = mkdtempSync(join(tmpdir(), 'cc-agent-catalog-link-'));
    const external = mkdtempSync(join(tmpdir(), 'cc-agent-catalog-external-'));
    try {
      writeFileSync(join(external, 'secret.md'), '# Outside\n');
      symlinkSync(join(external, 'secret.md'), join(root, 'linked.md'));
      const ledger = buildInventory(root);
      const link = ledger.entries.find((entry) => entry.sourcePath === 'linked.md');
      expect(link?.kind).toBe('symlink');
      expect(link?.sha256).toBeNull();
      expect(link?.disposition).toBe('manual_review');
      expect(link?.notes[0]).toContain('not followed');
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(external, { recursive: true, force: true });
    }
  });
});
