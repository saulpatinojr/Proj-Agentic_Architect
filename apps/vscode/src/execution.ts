import { isAbsolute } from 'node:path';

export interface CliProcessSpec {
  executable: string;
  args: string[];
  cwd: string;
}

/** Return process arguments, not shell source. Workspace trust is not action approval. */
export function cliProcessSpec(root: string, runtime: string, args: readonly string[], trusted: boolean): CliProcessSpec {
  if (!trusted) throw new Error('Trust this workspace through VS Code before running Code Conductor commands.');
  if (!isAbsolute(root) || !isAbsolute(runtime)) throw new Error('Workspace and bundled runtime must be absolute paths.');
  if ([root, runtime, ...args].some((value) => typeof value !== 'string' || value.includes('\0'))) {
    throw new Error('Process arguments must be strings without null bytes.');
  }
  return { executable: 'node', args: [runtime, ...args], cwd: root };
}

/** APM and individual AI clients are optional until their feature is selected. */
export function missingBaselineCommands(commands: Readonly<Record<string, boolean>>): string[] {
  return ['node', 'git', 'gh'].filter((command) => commands[command] !== true);
}

export function localCommandName(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}
