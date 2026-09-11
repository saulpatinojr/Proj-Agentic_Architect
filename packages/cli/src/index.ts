#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import type { RiskClass } from '@code-conductor/schemas';
import { validateRepositoryConfig } from '@code-conductor/policy';
import { createTask, planTask } from '@code-conductor/runtime';
import { apmAudit, apmLockPresent, apmTargets } from '@code-conductor/apm-adapter';
import { detectRepositoryProfiles, loadMcpCatalog, selectMcpServers } from '@code-conductor/mcp';
import { githubAuthStatus, pullRequestChecks, pullRequestStatus } from '@code-conductor/github-gate';

const VERSION = '0.1.0';

function hasCommand(command: string): boolean {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [command], { stdio: 'ignore' }).status === 0;
}

function printValidation(root: string): number {
  const report = validateRepositoryConfig(root);
  for (const issue of report.issues) {
    const prefix = issue.level === 'error' ? 'ERROR' : 'WARN';
    console.log(`${prefix} ${issue.code}${issue.path ? ` [${issue.path}]` : ''}: ${issue.message}`);
  }
  console.log(report.ok ? 'Code Conductor repository validation: PASS' : 'Code Conductor repository validation: FAIL');
  return report.ok ? 0 : 1;
}

function doctor(root: string): number {
  const clients = [
    ['git', ['git']], ['github', ['gh']], ['apm', ['apm']], ['claude', ['claude']], ['codex', ['codex']], ['kiro', ['kiro-cli']], ['antigravity', ['agy']],
  ] as const;
  console.log(`Code Conductor doctor ${VERSION}`);
  let missingRequired = false;
  for (const [name, candidates] of clients) {
    const found = candidates.some(hasCommand);
    console.log(`${found ? 'OK' : 'MISSING'} ${name} (${candidates.join('|')})`);
    if (!found && ['git', 'github', 'apm'].includes(name)) missingRequired = true;
  }
  const apiVariables = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'PERPLEXITY_API_KEY'];
  for (const variable of apiVariables) {
    if (process.env[variable]) console.log(`WARN billing.api_credential_detected: ${variable} is set; subscription-first policy may be bypassed. Value is intentionally not displayed.`);
  }
  if (hasCommand('gh')) {
    const auth = githubAuthStatus(root);
    console.log(`${auth.ok ? 'OK' : 'WARN'} github-auth`);
  }
  if (hasCommand('apm')) {
    const targets = apmTargets(root);
    console.log(`${targets.ok ? 'OK' : 'WARN'} apm-targets`);
    console.log(`${apmLockPresent(root) ? 'OK' : 'WARN'} apm-lock`);
  }
  const configStatus = printValidation(root);
  return missingRequired || configStatus !== 0 ? 1 : 0;
}

function getOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function plan(args: string[]): number {
  const root = resolve(getOption(args, '--repo') ?? '.');
  const objective = getOption(args, '--objective');
  const risk = (getOption(args, '--risk') ?? 'R1') as RiskClass;
  if (!objective) { console.error('ERROR plan.objective_required: --objective is required.'); return 2; }
  if (!['R0', 'R1', 'R2', 'R3', 'R4'].includes(risk)) { console.error(`ERROR plan.invalid_risk: ${risk}`); return 2; }
  const available = new Set<string>();
  if (hasCommand('codex')) available.add('codex');
  if (hasCommand('claude')) available.add('claude');
  if (hasCommand('kiro-cli')) available.add('kiro');
  if (hasCommand('agy')) available.add('antigravity');
  const task = createTask(objective, risk, root);
  console.log(JSON.stringify(planTask(root, task, { availableHarnesses: available.size ? available : undefined }), null, 2));
  return 0;
}

function mcpList(args: string[]): number {
  const root = resolve(getOption(args, '--repo') ?? '.');
  const catalog = loadMcpCatalog(root);
  const profiles = getOption(args, '--profiles')?.split(',').filter(Boolean) ?? detectRepositoryProfiles(root);
  const allowApi = args.includes('--allow-api');
  const servers = selectMcpServers(catalog, profiles, allowApi).map(([id, server]) => ({ id, publisher: server.publisher, maturity: server.maturity, authentication: server.authentication, defaultAccess: server.default_access }));
  console.log(JSON.stringify({ profiles, allowSeparatelyBilledApi: allowApi, servers }, null, 2));
  return 0;
}

function apmCheck(rootArg?: string): number {
  const root = resolve(rootArg ?? '.');
  if (!hasCommand('apm')) { console.error('ERROR apm.missing: apm executable is required.'); return 1; }
  const result = apmAudit(root);
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  return result.ok ? 0 : 1;
}

function githubGate(args: string[]): number {
  const root = resolve(getOption(args, '--repo') ?? '.');
  if (!hasCommand('gh')) { console.error('ERROR github.missing: gh executable is required.'); return 1; }
  const status = pullRequestStatus(root);
  process.stdout.write(status.stdout);
  process.stderr.write(status.stderr);
  if (!status.ok) return 1;
  const checks = pullRequestChecks(root);
  process.stdout.write(checks.stdout);
  process.stderr.write(checks.stderr);
  return checks.ok ? 0 : 1;
}

function usage(): void {
  console.log('Usage: cc <validate|doctor|plan|mcp|apm-audit|github-gate|version> [options]\n\nplan: --repo <path> --risk <R0-R4> --objective <text>\nmcp: --repo <path> [--profiles a,b] [--allow-api]\ngithub-gate: --repo <path>');
}

const [command = 'help', ...args] = process.argv.slice(2);
let exitCode = 0;
switch (command) {
  case 'validate': exitCode = printValidation(resolve(args[0] ?? '.')); break;
  case 'doctor': exitCode = doctor(resolve(args[0] ?? '.')); break;
  case 'plan': exitCode = plan(args); break;
  case 'mcp': exitCode = mcpList(args); break;
  case 'apm-audit': exitCode = apmCheck(args[0]); break;
  case 'github-gate': exitCode = githubGate(args); break;
  case 'version': case '--version': case '-v': console.log(VERSION); break;
  default: usage(); exitCode = command === 'help' || command === '--help' || command === '-h' ? 0 : 2;
}
process.exitCode = exitCode;
