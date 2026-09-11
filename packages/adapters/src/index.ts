import { spawn, spawnSync } from 'node:child_process';
import type { AgentAssignment, TaskEnvelope } from '@code-conductor/schemas';

export interface HarnessExecutionRequest {
  task: TaskEnvelope;
  assignment: AgentAssignment;
  cwd: string;
  timeoutMs: number;
  prompt: string;
}

export interface HarnessExecutionOutcome {
  harness: string;
  command: string;
  args: string[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  startedAt: string;
  finishedAt: string;
  timedOut: boolean;
}

export interface HarnessAdapter {
  id: string;
  provider: string;
  command: string | null;
  available(): boolean;
  execute(request: HarnessExecutionRequest): Promise<HarnessExecutionOutcome>;
}

function commandExists(command: string): boolean {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [command], { stdio: 'ignore' }).status === 0;
}

function argsFor(id: string, request: HarnessExecutionRequest): string[] {
  const writeAllowed = request.assignment.authority.includes('modify_worktree');
  switch (id) {
    case 'codex':
      return ['exec', '--json', '--cd', request.cwd, request.prompt];
    case 'claude':
      return ['-p', '--output-format', 'json', request.prompt];
    case 'kiro': {
      const trusted = writeAllowed ? 'read,grep,write,shell' : 'read,grep';
      return ['chat', '--no-interactive', '--output-format', 'stream-json', `--trust-tools=${trusted}`, request.prompt];
    }
    case 'antigravity':
      return ['-p', request.prompt];
    default:
      return [request.prompt];
  }
}

class SubprocessAdapter implements HarnessAdapter {
  constructor(public readonly id: string, public readonly provider: string, public readonly command: string) {}

  available(): boolean {
    return commandExists(this.command);
  }

  execute(request: HarnessExecutionRequest): Promise<HarnessExecutionOutcome> {
    const args = argsFor(this.id, request);
    const startedAt = new Date().toISOString();
    return new Promise((resolve, reject) => {
      const child = spawn(this.command, args, {
        cwd: request.cwd,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => { stdout += chunk; });
      child.stderr.on('data', (chunk: string) => { stderr += chunk; });
      child.on('error', reject);
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, request.timeoutMs);
      child.on('close', (exitCode, signal) => {
        clearTimeout(timer);
        resolve({
          harness: this.id,
          command: this.command,
          args,
          exitCode,
          signal,
          stdout,
          stderr,
          startedAt,
          finishedAt: new Date().toISOString(),
          timedOut,
        });
      });
    });
  }
}

class UnsupportedAdapter implements HarnessAdapter {
  command = null;
  constructor(public readonly id: string, public readonly provider: string) {}
  available(): boolean { return false; }
  async execute(_request: HarnessExecutionRequest): Promise<HarnessExecutionOutcome> {
    throw new Error(`Harness ${this.id} requires a platform/manual integration and cannot run through the generic subprocess adapter.`);
  }
}

export function createBuiltinAdapters(): Map<string, HarnessAdapter> {
  return new Map<string, HarnessAdapter>([
    ['codex', new SubprocessAdapter('codex', 'openai', 'codex')],
    ['claude', new SubprocessAdapter('claude', 'anthropic', 'claude')],
    ['kiro', new SubprocessAdapter('kiro', 'aws', 'kiro-cli')],
    ['antigravity', new SubprocessAdapter('antigravity', 'google', 'agy')],
    ['copilot-github', new UnsupportedAdapter('copilot-github', 'github')],
    ['perplexity', new UnsupportedAdapter('perplexity', 'perplexity')],
    ['internal-validator', new UnsupportedAdapter('internal-validator', 'code-conductor')],
  ]);
}
