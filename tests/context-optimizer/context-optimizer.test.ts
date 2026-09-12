import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ContextOptimizer,
  estimateTokens,
  minifyPayload,
} from '../../packages/context-optimizer/src/index.js';

describe('Context Optimizer', () => {
  describe('estimateTokens', () => {
    it('returns 0 for empty or whitespace content', () => {
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens('   \n\t  ')).toBe(0);
    });

    it('estimates tokens based on calibrated character count', () => {
      const text = 'Hello world, this is a test payload for token estimation.';
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(5);
      expect(tokens).toBeLessThan(30);
    });
  });

  describe('minifyPayload', () => {
    it('minifies JSON content cleanly', () => {
      const input = `{\n  "name": "code-conductor",\n  "version": "0.1.0",\n  "active": true\n}`;
      const minified = minifyPayload(input, '.json');
      expect(minified).toBe('{"name":"code-conductor","version":"0.1.0","active":true}');
    });

    it('strips non-directive comments and collapses whitespace in YAML', () => {
      const input = `
# Top-level comment
name: test
# Another comment

spec:
  value: 42


# Trailing comment
`;
      const minified = minifyPayload(input, '.yaml');
      expect(minified).not.toContain('# Top-level comment');
      expect(minified).not.toContain('# Another comment');
      expect(minified).toContain('name: test');
      expect(minified).toContain('spec:\n  value: 42');
    });

    it('strips comments and collapses whitespace in Terraform HCL', () => {
      const input = `
# Provider configuration
terraform {
  // Required version
  required_version = ">= 1.0.0"
}
`;
      const minified = minifyPayload(input, '.tf');
      expect(minified).not.toContain('# Provider configuration');
      expect(minified).not.toContain('// Required version');
      expect(minified).toContain('required_version = ">= 1.0.0"');
    });

    it('removes HTML comments and normalizes blank lines in Markdown', () => {
      const input = `# Title\n\n<!-- hidden notes -->\n\nParagraph text.   \n\n\n\nNext paragraph.`;
      const minified = minifyPayload(input, '.md');
      expect(minified).not.toContain('<!-- hidden notes -->');
      expect(minified).toContain('# Title\n\nParagraph text.\n\nNext paragraph.');
    });
  });

  describe('ContextOptimizer workflow', () => {
    it('compresses content, records statistics, and allows roundtrip retrieval', () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'cc-optimizer-'));
      const statsFile = join(tempDir, 'stats.json');

      try {
        const optimizer = new ContextOptimizer({ statsFile });
        const json = `{\n  "key1": "value1",\n  "key2": "value2",\n  "list": [1, 2, 3, 4, 5]\n}`;
        const result = optimizer.compress(json, { contentType: 'json', project: 'codex' });

        expect(result.tokensSaved).toBeGreaterThanOrEqual(0);
        expect(result.contextId).toBeDefined();
        expect(result.optimizedContent).toBe('{"key1":"value1","key2":"value2","list":[1,2,3,4,5]}');

        // Roundtrip retrieval
        const retrieved = optimizer.retrieve(result.contextId);
        expect(retrieved).toBe(json);

        // Stats verification
        const stats = optimizer.getStats();
        expect(stats.requests.total).toBe(1);
        expect(stats.projects.codex).toBe(result.tokensSaved);

        // Verify persistence
        const reloaded = new ContextOptimizer({ statsFile });
        const reloadedStats = reloaded.getStats();
        expect(reloadedStats.requests.total).toBe(1);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('reads and compresses files into ephemeral context blocks', () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'cc-optimizer-file-'));
      const testFile = join(tempDir, 'test.yaml');
      writeFileSync(testFile, '# Comment\nkey: value\n\n\n');

      try {
        const optimizer = new ContextOptimizer();
        const { content, result } = optimizer.readCompressedFile(testFile, 'claude');

        expect(content).toContain('<context_block cache_control="ephemeral">');
        expect(content).toContain('key: value');
        expect(content).not.toContain('# Comment');
        expect(result.tokensSaved).toBeGreaterThanOrEqual(0);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
