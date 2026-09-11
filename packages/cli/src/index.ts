#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import type { RiskClass } from '@code-conductor/schemas';
import { validateRepositoryConfig } from '@code-conductor/policy';
import { createTask, planTask } from '@code-conductor/runtime';

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
  if (!objective) {
    console.error('ERROR plan.objective_required: --objective is required.');
    return 2;
  }
  if (!['R0', 'R1', 'R2', 'R3', 'R4'].includes(risk)) {
    console.error(`ERROR plan.invalid_risk: ${risk}`);
    return 2;
  }
  const available = new Set<string>();
  if (hasCommand('codex')) available.add('codex');
  if (hasCommand('claude')) available.add('claude');
  if (hasCommand('kiro-cli')) available.add('kiro');
  if (hasCommand('agy')) available.add('antigravity');
  const task = createTask(objective, risk, root);
  const taskPlan = planTask(root, task, { availableHarnesses: available.size ? available : undefined });
  console.log(JSON.stringify(taskPlan, null, 2));
  return 0;
}

function usage(): void {
  console.log('Usage: cc <validate|doctor|plan|version> [options]\n\nplan options: --repo <path> --risk <R0-R4> --objective <text>');
}

const [command = 'help', ...args] = process.argv.slice(2);
let exitCode = 0;
switch (command) {
  case 'validate': exitCode = printValidation(resolve(args[0] ?? '.')); break;
  case 'doctor': exitCode = doctor(resolve(args[0] ?? '.')); break;
  case 'plan': exitCode = plan(args); break;
  case 'version': case '--version': case '-v': console.log(VERSION); break;
  default: usage(); exitCode = command === 'help' || command === '--help' || command === '-h' ? 0 : 2;
}
process.exitCode = exitCode;
