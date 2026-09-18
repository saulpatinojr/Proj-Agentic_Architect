import { spawn, spawnSync } from 'node:child_process';
import type { AgentAssignment, TaskEnvelope } from '@code-conductor/schemas';

export type HarnessExecutionSurface = 'cli' | 'acp' | 'platform' | 'manual' | 'ide' | 'local' | 'mcp_api';

export interface HarnessExecutionRequest {
  task: TaskEnvelope;
  assignment: AgentAssignment;
  cwd: string;
  timeoutMs: number;
  prompt: string;
}

export interface HarnessExecutionOutcome {
  harness: string;
  surface: HarnessExecutionSurface;
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
  executionSurface: HarnessExecutionSurface;
  command: string | null;
  available(): boolean;
  version(): string | undefined;
  execute(request: HarnessExecutionRequest): Promise<HarnessExecutionOutcome>;
}

function commandExists(command: string): boolean {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [command], { stdio: 'ignore' }).status === 0;
}

function commandVersion(command: string): string | undefined {
  const result = spawnSync(command, ['--version'], { encoding: 'utf8', shell: false, timeout: 15000 });
  return result.status === 0 ? (result.stdout || result.stderr || '').trim().split(/\r?\n/)[0] : undefined;
}

function argsFor(id: string, request: HarnessExecutionRequest): string[] {
  const writeAllowed = request.assignment.authority.includes('modify_worktree');
  switch (id) {
    case 'codex':
      return ['exec', '--json', '--ask-for-approval', 'never', '--sandbox', writeAllowed ? 'workspace-write' : 'read-only', '--cd', request.cwd, request.prompt];
    case 'claude':
      return writeAllowed
        ? ['-p', '--output-format', 'json', '--permission-mode', 'acceptEdits', '--max-turns', '40', request.prompt]
        : ['-p', '--output-format', 'json', '--permission-mode', 'plan', '--max-turns', '20', request.prompt];
    default:
      return [request.prompt];
  }
}

class SubprocessAdapter implements HarnessAdapter {
  readonly executionSurface: HarnessExecutionSurface = 'cli';
  constructor(public readonly id: string, public readonly provider: string, public readonly command: string) {}
  available(): boolean { return commandExists(this.command); }
  version(): string | undefined { return this.available() ? commandVersion(this.command) : undefined; }
  execute(request: HarnessExecutionRequest): Promise<HarnessExecutionOutcome> {
    const args = argsFor(this.id, request);
    const startedAt = new Date().toISOString();
    return new Promise((resolve, reject) => {
      const child = spawn(this.command, args, { cwd: request.cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => { stdout += chunk; });
      child.stderr.on('data', (chunk: string) => { stderr += chunk; });
      child.on('error', reject);
      const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, request.timeoutMs);
      child.on('close', (exitCode, signal) => {
        clearTimeout(timer);
        resolve({ harness: this.id, surface: this.executionSurface, command: this.command, args, exitCode, signal, stdout, stderr, startedAt, finishedAt: new Date().toISOString(), timedOut });
      });
    });
  }
}

class PendingKiroAcpAdapter implements HarnessAdapter {
  readonly id = 'kiro';
  readonly provider = 'aws';
  readonly executionSurface: HarnessExecutionSurface = 'acp';
  readonly command = 'kiro-cli';
  available(): boolean { return commandExists(this.command); }
  version(): string | undefined { return this.available() ? commandVersion(this.command) : undefined; }
  async execute(_request: HarnessExecutionRequest): Promise<HarnessExecutionOutcome> {
    throw new Error('Kiro unattended execution is fail-closed until the Code Conductor ACP client path and current Kiro subscription/read/modify authority boundary pass issue #11 workstation validation.');
  }
}

class UnsupportedAdapter implements HarnessAdapter {
  command = null;
  constructor(
    public readonly id: string,
    public readonly provider: string,
    public readonly executionSurface: HarnessExecutionSurface,
    private readonly reason: string,
  ) {}
  available(): boolean { return false; }
  version(): string | undefined { return undefined; }
  async execute(_request: HarnessExecutionRequest): Promise<HarnessExecutionOutcome> { throw new Error(this.reason); }
}

export function createBuiltinAdapters(): Map<string, HarnessAdapter> {
  return new Map<string, HarnessAdapter>([
    ['codex', new SubprocessAdapter('codex', 'openai', 'codex')],
    ['claude', new SubprocessAdapter('claude', 'anthropic', 'claude')],
    ['kiro', new PendingKiroAcpAdapter()],
    ['antigravity', new UnsupportedAdapter('antigravity', 'google', 'ide', 'Antigravity unattended automation is disabled pending current permission/sandbox revalidation; use the interactive/native Google lane.')],
    ['copilot-github', new UnsupportedAdapter('copilot-github', 'github', 'platform', 'GitHub Copilot Gatekeeper is a GitHub platform integration, not a generic subprocess worker.')],
    ['perplexity', new UnsupportedAdapter('perplexity', 'perplexity', 'manual', 'Perplexity Pro subscription mode is human-in-the-loop; automated official MCP/API mode is separately billed and disabled by default.')],
    ['internal-validator', new UnsupportedAdapter('internal-validator', 'code-conductor', 'local', 'Internal validation is executed by the deterministic gate runner.')],
  ]);
}
