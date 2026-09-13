import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KiroAcpAdapter } from '../../packages/adapters/src/index.js';
import type { AgentAssignment, TaskEnvelope } from '../../packages/schemas/src/index.js';

const fixture = resolve('tests/fixtures/fake-acp-agent.mjs');

function assignment(): AgentAssignment {
  return {
    id: 'A-KIRO',
    taskId: 'T-KIRO',
    agentId: 'builder-kiro',
    role: 'builder',
    stance: 'constructive',
    provider: 'aws',
    harness: 'kiro',
    surface: 'acp',
    billingChannel: 'subscription',
    authority: ['modify_worktree'],
    dependsOn: [],
  };
}

function task(): TaskEnvelope {
  return {
    id: 'T-KIRO',
    objective: 'Exercise the fake ACP agent',
    repository: resolve('.'),
    acceptanceCriteria: [],
    risk: 'R0',
    constraints: [],
    createdAt: new Date().toISOString(),
  };
}

function adapter(): KiroAcpAdapter {
  return new KiroAcpAdapter({ command: process.execPath, args: [fixture] });
}

describe('Kiro ACP adapter', () => {
  it('initializes, creates a session, sends a prompt, and collects streamed assistant text', async () => {
    const outcome = await adapter().execute({ task: task(), assignment: assignment(), cwd: resolve('.'), timeoutMs: 5000, prompt: 'NORMAL' });

    expect(outcome.surface).toBe('acp');
    expect(outcome.timedOut).toBe(false);
    expect(outcome.stdout).toContain('Fake ACP response.');
    expect(outcome.stdout).toContain('CC_RESULT_JSON:');
    expect(outcome.stderr).toContain('CLIENT_CAPS:{}');
  });

  it('advertises no client filesystem/terminal capabilities and cancels permission requests by default', async () => {
    const outcome = await adapter().execute({ task: task(), assignment: assignment(), cwd: resolve('.'), timeoutMs: 5000, prompt: 'REQUEST_PERMISSION' });

    expect(outcome.stderr).toContain('CLIENT_CAPS:{}');
    expect(outcome.stderr).toContain('[ACP permission cancelled]');
    expect(outcome.stderr).toContain('PERMISSION_OUTCOME:cancelled');
    expect(outcome.stdout).toContain('Permission was cancelled.');
    expect(outcome.stdout).toContain('CC_RESULT_JSON:');
  });

  it('sends session/cancel and terminates the child process on timeout', async () => {
    const outcome = await adapter().execute({ task: task(), assignment: assignment(), cwd: resolve('.'), timeoutMs: 250, prompt: 'HANG' });

    expect(outcome.timedOut).toBe(true);
    expect(outcome.stderr).toContain('FAKE_CANCEL_RECEIVED:');
    expect(outcome.stderr).toContain('Kiro ACP prompt timed out');
  });
});
