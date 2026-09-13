import { describe, expect, it } from 'vitest';
import { createBuiltinAdapters } from '../../packages/adapters/src/index.js';

describe('builtin harness execution surfaces', () => {
  it('keeps Claude and Codex on CLI execution while Kiro is ACP-first', () => {
    const adapters = createBuiltinAdapters();
    expect(adapters.get('claude')?.executionSurface).toBe('cli');
    expect(adapters.get('codex')?.executionSurface).toBe('cli');
    expect(adapters.get('kiro')?.executionSurface).toBe('acp');
    expect(adapters.get('kiro')?.command).toBe('kiro-cli');
  });

  it('models platform/manual/interactive lanes without pretending they are generic subprocess workers', () => {
    const adapters = createBuiltinAdapters();
    expect(adapters.get('copilot-github')?.executionSurface).toBe('platform');
    expect(adapters.get('perplexity')?.executionSurface).toBe('manual');
    expect(adapters.get('antigravity')?.executionSurface).toBe('ide');
  });
});
