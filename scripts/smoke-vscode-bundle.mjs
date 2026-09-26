import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const temporary = mkdtempSync(join(tmpdir(), 'cc-distribution-smoke-'));
try {
  const extension = join(temporary, 'extension');
  const workspace = join(temporary, 'unrelated');
  mkdirSync(join(extension, 'dist'), { recursive: true });
  mkdirSync(workspace);
  cpSync(resolve('apps/vscode/dist/cc.js'), join(extension, 'dist', 'cc.js'));
  cpSync(resolve('apps/vscode/defaults'), join(extension, 'defaults'), { recursive: true });
  cpSync(resolve('apps/vscode/schema'), join(extension, 'schema'), { recursive: true });
  writeFileSync(join(extension, 'package.json'), '{"type":"module"}\n');
  const env = { ...process.env, HOME: temporary, USERPROFILE: temporary };
  delete env.NODE_OPTIONS; delete env.NODE_PATH;
  const stdout = execFileSync(process.execPath, [join(extension, 'dist', 'cc.js'), 'workspace-validate', workspace], { cwd: workspace, encoding: 'utf8', timeout: 15000, maxBuffer: 1048576, env });
  const result = JSON.parse(stdout);
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'workspace');
  assert.equal(result.sources.length, 7);
  assert.deepEqual(readdirSync(workspace), []);
  console.log('Standalone bundled runtime/defaults: PASS (no source tree, node_modules, APM, or repository scaffolding).');
} finally { rmSync(temporary, { recursive: true, force: true }); }
