import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const names = ['roles', 'risk', 'capabilities', 'authorities', 'references', 'gates', 'mcp-catalog'];
for (const target of ['packages/runtime/dist/defaults', 'apps/vscode/dist/defaults']) {
  const destination = join(root, target);
  mkdirSync(destination, { recursive: true });
  for (const name of names) {
    const source = join(root, 'config', `${name}.yaml`);
    if (readFileSync(source).length > 131072) throw new Error(`Default ${name} exceeds the configuration limit.`);
    cpSync(source, join(destination, `${name}.yaml`));
  }
}
console.log('Copied canonical runtime defaults into the distribution; customer repositories were not modified.');

// Bundle schema data as data, while static imports let esbuild include Ajv itself.
for (const output of ['packages/schemas/dist', 'apps/vscode/dist']) {
  mkdirSync(join(root, output), { recursive: true });
  cpSync(join(root, 'packages/schemas/schema/contracts.schema.json'), join(root, output, 'contracts.schema.json'));
}
