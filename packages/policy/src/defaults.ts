import { createHash } from 'node:crypto';
import { lstatSync } from 'node:fs';
import { readBoundedFile as readBounded } from './bounded-read.js';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export type ConfigurationName = 'roles' | 'risk' | 'capabilities' | 'authorities' | 'gates' | 'mcp-catalog' | 'references';
const names = new Set<ConfigurationName>(['roles', 'risk', 'capabilities', 'authorities', 'gates', 'mcp-catalog', 'references']);
export interface ConfigurationSource { source: 'packaged' | 'user' | 'workspace'; path: string; sha256: string }
export interface ConfigurationOptions { userRoot?: string | null; workspaceOverrides?: boolean }
interface Preferences { version: 1; rolePreferences?: Record<string, string[]>; disabledHarnesses?: string[] }
interface Roles { roles: Record<string, { preferred_harnesses?: string[] }> }
interface Capabilities { harnesses: Record<string, unknown> }

function hash(bytes: Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
function packaged(name: ConfigurationName): { document: unknown; source: ConfigurationSource } {
  if (!names.has(name)) throw new Error(`Unsupported packaged configuration: ${name}`);
  // Both tsc dist and source tests use the policy package's sibling defaults.
  // esbuild bundles use apps/vscode/defaults, alongside dist, in the VSIX.
  const root = fileURLToPath(new URL('../defaults/', import.meta.url));
  const manifest = JSON.parse(readBounded(join(root, 'manifest.json'), 16384).toString('utf8'));
  const path = join(root, `${name}.yaml`);
  const bytes = readBounded(path, 1048576);
  const sha256 = hash(bytes);
  if (manifest.version !== 1 || manifest.files?.[`${name}.yaml`] !== sha256) throw new Error(`Packaged configuration integrity failed: ${name}`);
  return { document: parse(bytes.toString('utf8')), source: { source: 'packaged', path, sha256 } };
}
function assertPlain(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${label} must be a JSON object.`);
}
function stringList(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item) || new Set(value).size !== value.length) throw new Error(`${label} must be a unique string array.`);
}
function loadPreferences(root: string, source: 'user' | 'workspace', roles: Roles, capabilities: Capabilities): { preferences: Preferences; source: ConfigurationSource } | undefined {
  const base = resolve(root);
  const folder = join(base, '.code-conductor');
  const path = join(folder, 'config.json');
  const directory = lstatSync(folder, { throwIfNoEntry: false });
  if (!directory) return undefined;
  if (directory.isSymbolicLink()) throw new Error(`Symlink configuration overrides are not supported: ${folder}`);
  if (!directory.isDirectory()) throw new Error(`Configuration parent must be a directory: ${folder}`);
  const entry = lstatSync(path, { throwIfNoEntry: false });
  if (!entry) return undefined;
  if (entry.isSymbolicLink()) throw new Error(`Symlink configuration overrides are not supported: ${path}`);
  const bytes = readBounded(path, 65536);
  const value: unknown = JSON.parse(bytes.toString('utf8'));
  assertPlain(value, 'Configuration');
  if (value.version !== 1 || Object.keys(value).some((key) => !['version', 'rolePreferences', 'disabledHarnesses'].includes(key))) throw new Error(`Unsupported override fields/version: ${path}`);
  if (value.rolePreferences !== undefined) {
    assertPlain(value.rolePreferences, 'rolePreferences');
    for (const [role, preference] of Object.entries(value.rolePreferences)) {
      stringList(preference, `rolePreferences.${role}`);
      const allowed = roles.roles[role]?.preferred_harnesses;
      if (!allowed || !preference.length || preference.some((item) => !allowed.includes(item))) throw new Error(`Override cannot add an ineligible harness to ${role}.`);
    }
  }
  if (value.disabledHarnesses !== undefined) {
    stringList(value.disabledHarnesses, 'disabledHarnesses');
    if (value.disabledHarnesses.some((item) => !Object.hasOwn(capabilities.harnesses, item))) throw new Error('Unknown disabled harness.');
  }
  return { preferences: value as unknown as Preferences, source: { source, path, sha256: hash(bytes) } };
}

/** Preferences can narrow/reorder eligible clients; they cannot change authority or risk. */
export function loadConfiguration<T>(root: string, name: ConfigurationName, options: ConfigurationOptions = {}): { document: T; sources: ConfigurationSource[] } {
  const base = packaged(name);
  const roles = packaged('roles').document as Roles;
  const capabilities = packaged('capabilities').document as Capabilities;
  const inputs = [
    ...(options.userRoot === null ? [] : [loadPreferences(options.userRoot ?? homedir(), 'user', roles, capabilities)]),
    ...(options.workspaceOverrides === false ? [] : [loadPreferences(root, 'workspace', roles, capabilities)]),
  ].filter((value): value is NonNullable<typeof value> => value !== undefined);
  const disabled = new Set(inputs.flatMap((input) => input.preferences.disabledHarnesses ?? []));
  if (name === 'roles') {
    const document = base.document as Roles;
    for (const input of inputs) for (const [role, preferences] of Object.entries(input.preferences.rolePreferences ?? {})) {
      // Workspace preferences cannot re-enable a provider excluded by user preferences.
      const current = document.roles[role]!.preferred_harnesses!;
      const selected = preferences.filter((item) => current.includes(item));
      if (!selected.length) throw new Error(`User/workspace preferences leave no eligible harness for ${role}.`);
      document.roles[role]!.preferred_harnesses = selected;
    }
    for (const role of Object.values(document.roles)) if (role.preferred_harnesses) role.preferred_harnesses = role.preferred_harnesses.filter((item) => !disabled.has(item));
  }
  if (name === 'capabilities') for (const harness of disabled) delete (base.document as Capabilities).harnesses[harness];
  return { document: base.document as T, sources: [base.source, ...inputs.map((input) => input.source)] };
}

export function packagedConfigurationFingerprint(): string {
  return hash(readBounded(join(fileURLToPath(new URL('../defaults/', import.meta.url)), 'manifest.json'), 16384));
}
