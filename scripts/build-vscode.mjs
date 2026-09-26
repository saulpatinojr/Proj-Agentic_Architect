import { build } from 'esbuild';

// Bundled CommonJS dependencies still require Node builtins in the ESM output.
const common = {
  bundle: true, platform: 'node', format: 'esm', target: 'node22', sourcemap: true,
  banner: { js: "import { createRequire as __ccCreateRequire } from 'node:module'; const require = __ccCreateRequire(import.meta.url);" },
};
await build({ ...common, entryPoints: ['apps/vscode/src/extension.ts'], external: ['vscode'], outfile: 'apps/vscode/dist/extension.js' });
await build({ ...common, entryPoints: ['packages/cli/src/index.ts'], outfile: 'apps/vscode/dist/cc.js' });
