#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { validateRepositoryConfig } from '@code-conductor/policy';

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
    ['git', ['git']],
    ['github', ['gh']],
    ['apm', ['apm']],
    ['claude', ['claude']],
    ['codex', ['codex']],
    ['kiro', ['kiro']],
    ['antigravity', ['antigravity']],
  ] as const;

  console.log(`Code Conductor doctor ${VERSION}`);
  let missingRequired = false;
  for (const [name, candidates] of clients) {
    const found = candidates.some(hasCommand);
    console.log(`${found ? 'OK' : 'MISSING'} ${name}`);
    if (!found && ['git', 'github', 'apm'].includes(name)) missingRequired = true;
  }

  const apiVariables = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'PERPLEXITY_API_KEY'];
  for (const variable of apiVariables) {
    if (process.env[variable]) {
      console.log(`WARN billing.api_credential_detected: ${variable} is set; subscription-first policy may be bypassed. Value is intentionally not displayed.`);
    }
  }

  const configStatus = printValidation(root);
  return missingRequired || configStatus !== 0 ? 1 : 0;
}

function usage(): void {
  console.log('Usage: cc <validate|doctor|version> [repository-root]');
}

const [command = 'help', rootArg = '.'] = process.argv.slice(2);
const root = resolve(rootArg);

let exitCode = 0;
switch (command) {
  case 'validate':
    exitCode = printValidation(root);
    break;
  case 'doctor':
    exitCode = doctor(root);
    break;
  case 'version':
  case '--version':
  case '-v':
    console.log(VERSION);
    break;
  default:
    usage();
    exitCode = command === 'help' || command === '--help' || command === '-h' ? 0 : 2;
}

process.exitCode = exitCode;
