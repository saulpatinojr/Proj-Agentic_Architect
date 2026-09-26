import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import './copy-runtime-defaults.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const common = {
  absWorkingDir: root, bundle: true, platform: 'node', format: 'esm',
  target: 'node22', sourcemap: true,
  // Bundled CJS libraries may require Node built-ins. Anchor native require to
  // the installed module, not the customer workspace or a source checkout.
  banner: { js: "import { createRequire as ccCreateRequire } from 'node:module'; const require = ccCreateRequire(import.meta.url);" },
};
await build({ ...common, entryPoints: ['apps/vscode/src/extension.ts'], external: ['vscode'], outfile: 'apps/vscode/dist/extension.js' });
await build({ ...common, entryPoints: ['packages/cli/src/index.ts'], outfile: 'apps/vscode/dist/cc.js' });
await import('./verify-vscode-bundle.mjs');
