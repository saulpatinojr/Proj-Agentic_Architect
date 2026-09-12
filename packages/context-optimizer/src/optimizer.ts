import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { homedir } from 'node:os';

export interface OptimizationStats {
  requestsTotal: number;
  tokensOriginal: number;
  tokensOptimized: number;
  tokensSaved: number;
  outputTokensSaved: number;
  overheadMsTotal: number;
  projects: Record<string, number>;
  history: Array<{
    timestampUtc: string;
    project: string;
    tokensOriginal: number;
    tokensOptimized: number;
    tokensSaved: number;
    overheadMs: number;
  }>;
}

export interface OptimizationResult {
  contextId: string;
  originalTokens: number;
  optimizedTokens: number;
  tokensSaved: number;
  savingsPercent: number;
  overheadMs: number;
  optimizedContent: string;
}

export interface CompressOptions {
  contentType?: string;
  project?: string;
}

export function estimateTokens(content: string): number {
  if (!content) return 0;
  // Standard BPE heuristic: ~3.8-4.0 chars per token for English & code
  const trimmed = content.trim();
  if (trimmed.length === 0) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function minifyPayload(content: string, typeOrExt: string): string {
  if (!content) return '';
  const ext = (typeOrExt.startsWith('.') ? typeOrExt : `.${typeOrExt}`).toLowerCase();

  if (ext === '.json') {
    try {
      return JSON.stringify(JSON.parse(content));
    } catch {
      return content.replace(/\s+/g, ' ').trim();
    }
  }

  if (ext === '.yaml' || ext === '.yml') {
    return content
      .split(/\r?\n/)
      .filter((line) => !/^\s*#(?!!)/.test(line)) // remove non-directive comment lines
      .join('\n')
      .replace(/\n\s*\n\s*\n+/g, '\n\n') // collapse multiple blank lines
      .trim();
  }

  if (ext === '.tf' || ext === '.hcl') {
    return content
      .split(/\r?\n/)
      .filter((line) => !/^\s*(#|\/\/)/.test(line))
      .join('\n')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();
  }

  if (ext === '.md') {
    return content
      .replace(/<!--[\s\S]*?-->/g, '') // remove HTML comments
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .join('\n')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();
  }

  // General text & code: trim trailing whitespace, collapse redundant empty lines
  return content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

export class ContextOptimizer {
  private readonly statsFile: string;
  private readonly cache = new Map<string, { content: string; createdAt: number }>();
  private readonly maxCacheEntries: number;
  private readonly cacheTtlMs: number;
  private stats: OptimizationStats;

  constructor(options?: { statsFile?: string; maxCacheEntries?: number; cacheTtlMs?: number }) {
    this.maxCacheEntries = options?.maxCacheEntries ?? 500;
    this.cacheTtlMs = options?.cacheTtlMs ?? 3600000; // 1 hour
    this.statsFile =
      options?.statsFile ??
      join(process.env.CODE_CONDUCTOR_HOME || join(homedir(), '.code-conductor'), 'context-optimization-stats.json');

    this.stats = {
      requestsTotal: 0,
      tokensOriginal: 0,
      tokensOptimized: 0,
      tokensSaved: 0,
      outputTokensSaved: 0,
      overheadMsTotal: 0,
      projects: {
        codex: 0,
        claude: 0,
        github: 0,
        copilot: 0,
        antigravity: 0,
        vscode: 0,
        cli: 0,
      },
      history: [],
    };

    this.loadStats();
  }

  compress(content: string, options?: CompressOptions): OptimizationResult {
    const started = performance.now();
    const project = (options?.project || 'vscode').toLowerCase();
    const contentType = options?.contentType || 'text';

    const optimized = minifyPayload(content, contentType);
    const overheadMs = Math.round(performance.now() - started);

    const originalTokens = estimateTokens(content);
    const optimizedTokens = estimateTokens(optimized);
    const tokensSaved = Math.max(0, originalTokens - optimizedTokens);
    const savingsPercent = originalTokens > 0 ? Math.round((tokensSaved / originalTokens) * 10000) / 100 : 0;

    const contextId = randomUUID();
    this.pruneCache();
    this.cache.set(contextId, { content, createdAt: Date.now() });

    this.recordStats(project, originalTokens, optimizedTokens, tokensSaved, overheadMs);

    return {
      contextId,
      originalTokens,
      optimizedTokens,
      tokensSaved,
      savingsPercent,
      overheadMs,
      optimizedContent: optimized,
    };
  }

  retrieve(contextId: string): string | undefined {
    const entry = this.cache.get(contextId);
    if (!entry) return undefined;
    if (Date.now() - entry.createdAt > this.cacheTtlMs) {
      this.cache.delete(contextId);
      return undefined;
    }
    return entry.content;
  }

  readCompressedFile(filePath: string, project = 'vscode'): { content: string; result: OptimizationResult } {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const raw = readFileSync(filePath, 'utf8');
    const ext = extname(filePath);
    const result = this.compress(raw, { contentType: ext, project });
    const formatted = `<context_block cache_control="ephemeral">\n${result.optimizedContent}\n</context_block>`;
    return { content: formatted, result };
  }

  getStats(): {
    requests: { total: number };
    tokens: {
      original: number;
      optimized: number;
      saved: number;
      savingsPercent: number;
      outputSaved: number;
    };
    overhead: { averageMs: number; totalMs: number };
    projects: Record<string, number>;
    history: OptimizationStats['history'];
    cache: { entries: number };
  } {
    const totalOriginal = this.stats.tokensOriginal;
    const totalSaved = this.stats.tokensSaved;
    const requests = this.stats.requestsTotal;
    const overheadTotal = this.stats.overheadMsTotal;

    const savingsPercent = totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 10000) / 100 : 0;
    const averageMs = requests > 0 ? Math.round((overheadTotal / requests) * 100) / 100 : 0;

    return {
      requests: { total: requests },
      tokens: {
        original: totalOriginal,
        optimized: this.stats.tokensOptimized,
        saved: totalSaved,
        savingsPercent,
        outputSaved: this.stats.outputTokensSaved,
      },
      overhead: {
        averageMs,
        totalMs: overheadTotal,
      },
      projects: { ...this.stats.projects },
      history: [...this.stats.history],
      cache: { entries: this.cache.size },
    };
  }

  private recordStats(
    project: string,
    originalTokens: number,
    optimizedTokens: number,
    tokensSaved: number,
    overheadMs: number
  ): void {
    this.stats.requestsTotal += 1;
    this.stats.tokensOriginal += originalTokens;
    this.stats.tokensOptimized += optimizedTokens;
    this.stats.tokensSaved += tokensSaved;
    this.stats.outputTokensSaved += Math.round(tokensSaved * 0.2); // downstream prompt reduction
    this.stats.overheadMsTotal += overheadMs;

    if (this.stats.projects[project] !== undefined) {
      this.stats.projects[project] += tokensSaved;
    } else {
      this.stats.projects[project] = tokensSaved;
    }

    this.stats.history.push({
      timestampUtc: new Date().toISOString(),
      project,
      tokensOriginal: originalTokens,
      tokensOptimized: optimizedTokens,
      tokensSaved,
      overheadMs,
    });

    if (this.stats.history.length > 200) {
      this.stats.history.shift();
    }

    this.saveStats();
  }

  private pruneCache(): void {
    const now = Date.now();
    for (const [id, entry] of this.cache.entries()) {
      if (now - entry.createdAt > this.cacheTtlMs) {
        this.cache.delete(id);
      }
    }
    if (this.cache.size >= this.maxCacheEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
  }

  private loadStats(): void {
    if (!existsSync(this.statsFile)) return;
    try {
      const data = JSON.parse(readFileSync(this.statsFile, 'utf8'));
      if (typeof data === 'object' && data !== null) {
        if (typeof data.requestsTotal === 'number') this.stats.requestsTotal = data.requestsTotal;
        if (typeof data.tokensOriginal === 'number') this.stats.tokensOriginal = data.tokensOriginal;
        if (typeof data.tokensOptimized === 'number') this.stats.tokensOptimized = data.tokensOptimized;
        if (typeof data.tokensSaved === 'number') this.stats.tokensSaved = data.tokensSaved;
        if (typeof data.outputTokensSaved === 'number') this.stats.outputTokensSaved = data.outputTokensSaved;
        if (typeof data.overheadMsTotal === 'number') this.stats.overheadMsTotal = data.overheadMsTotal;
        if (typeof data.projects === 'object' && data.projects !== null) {
          this.stats.projects = { ...this.stats.projects, ...data.projects };
        }
        if (Array.isArray(data.history)) {
          this.stats.history = data.history.slice(-200);
        }
      }
    } catch {
      // Ignore corrupt stats file and start fresh
    }
  }

  private saveStats(): void {
    try {
      const dir = dirname(this.statsFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.statsFile, JSON.stringify(this.stats, null, 2), 'utf8');
    } catch {
      // Best-effort metrics persistence
    }
  }
}
