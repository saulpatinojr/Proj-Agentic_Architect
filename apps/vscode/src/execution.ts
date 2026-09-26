import { isAbsolute } from 'node:path';

export interface CliProcessSpec { executable: string; args: string[]; cwd?: undefined }

// VS Code substitutes task variables even for ProcessExecution. Encode only data;
// the fixed bootstrap restores cwd/argv after VS Code's substitution boundary.
const BOOTSTRAP = [
  "import { pathToFileURL } from 'node:url';",
  "const data = JSON.parse(Buffer.from(process.argv[1], 'base64url').toString('utf8'));",
  'process.chdir(data.cwd);',
  'process.argv = [process.execPath, ...data.args];',
  'await import(pathToFileURL(data.args[0]).href);',
].join('\n');

/** No shell source or task-variable syntax is derived from user-controlled data. */
export function cliProcessSpec(root: string, runtime: string, args: readonly string[], trusted: boolean): CliProcessSpec {
  if (!trusted) throw new Error('Trust this workspace through VS Code before running Code Conductor commands.');
  if (!isAbsolute(root) || !isAbsolute(runtime)) throw new Error('Workspace and bundled runtime must be absolute paths.');
  if ([root, runtime, ...args].some((value) => typeof value !== 'string' || value.includes('\0'))) {
    throw new Error('Process arguments must be strings without null bytes.');
  }
  const payload = Buffer.from(JSON.stringify({ cwd: root, args: [runtime, ...args] }), 'utf8').toString('base64url');
  return { executable: 'node', args: ['--input-type=module', '--eval', BOOTSTRAP, payload] };
}

/** APM and individual AI clients are optional until their feature is selected. */
export function missingBaselineCommands(commands: Readonly<Record<string, boolean>>): string[] {
  return ['node', 'git', 'gh'].filter((command) => commands[command] !== true);
}

export function localCommandName(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}
