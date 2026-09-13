import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const files = [
  resolve('apps/vscode/dist/extension.js'),
  resolve('apps/vscode/dist/cc.js'),
];

for (const file of files) {
  if (!existsSync(file) || !statSync(file).isFile() || statSync(file).size === 0) {
    throw new Error(`VS Code bundle is missing or empty: ${file}`);
  }
}

const extension = readFileSync(files[0], 'utf8');
const runtime = readFileSync(files[1], 'utf8');

if (extension.includes("packages/cli/dist/index.js") || extension.includes('npm run build')) {
  throw new Error('Production VS Code extension still references the repository-local development runtime/build path.');
}

if (/from\s+["']@code-conductor\//.test(runtime) || /require\(["']@code-conductor\//.test(runtime)) {
  throw new Error('Bundled Code Conductor runtime still contains unresolved internal workspace imports.');
}

console.log(`VS Code bundle verified: extension=${statSync(files[0]).size} bytes runtime=${statSync(files[1]).size} bytes`);
