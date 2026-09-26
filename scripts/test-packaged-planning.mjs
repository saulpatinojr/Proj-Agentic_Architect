import { chmodSync, cpSync, mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const temp = mkdtempSync(join(tmpdir(), 'cc-packaged-planning-'));
try {
  const distribution = join(temp, 'installed'), workspace = join(temp, 'unrelated'), bin = join(temp, 'bin');
  for (const dir of [distribution, workspace, bin]) mkdirSync(dir);
  cpSync(resolve('apps/vscode/dist/cc.js'), join(distribution, 'cc.mjs'));
  cpSync(resolve('apps/vscode/dist/contracts.schema.json'), join(distribution, 'contracts.schema.json'));
  cpSync(resolve('apps/vscode/dist/defaults'), join(distribution, 'defaults'), { recursive: true });
  // POSIX-only fake client availability for this deterministic CI fixture. No provider runs.
  if (process.platform === 'win32') throw new Error('Run this fixture on POSIX; Windows/WSL acceptance is a separate gate.');
  for (const name of ['codex', 'claude']) {
    writeFileSync(join(bin, name), '#!/bin/sh\necho "Unexpected provider invocation" >&2\nexit 99\n');
    chmodSync(join(bin, name), 0o700);
  }
  const result = spawnSync(process.execPath, [join(distribution, 'cc.mjs'), 'plan', '--repo', workspace, '--risk', 'R1', '--objective', 'bounded fixture change'], { cwd: workspace, env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` }, encoding: 'utf8', shell: false, timeout: 30000 });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.deepEqual(plan.assignments.map((item) => item.role), ['builder', 'reviewer', 'validator']);
  assert.equal(plan.configurationEvidence.length, 3);
  assert.deepEqual(readdirSync(workspace), []);
  console.log('PASS: isolated bundled planner used packaged defaults without source checkout, provider execution or customer scaffold.');
} finally { rmSync(temp, { recursive: true, force: true }); }
