import { createHash } from 'node:crypto';
import { constants, closeSync, existsSync, fstatSync, lstatSync, openSync, readFileSync, readSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export type DefaultDocument = 'roles' | 'risk' | 'capabilities' | 'authorities' | 'references' | 'gates' | 'mcp-catalog';
export interface ApprovedConfigFile { path: string; sha256: string }
export interface ConfigurationOptions { user?: ApprovedConfigFile; workspace?: ApprovedConfigFile }
export interface ConfigurationEvidence { layer: 'bundled' | 'user' | 'workspace'; source: string; sha256: string }
type ObjectValue = Record<string, any>;
function object(value: unknown): value is ObjectValue { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function hash(bytes: Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
function boundedFile(path: string): Buffer {
  if (lstatSync(path).isSymbolicLink()) throw new Error('Configuration must be a bounded regular file.');
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > 131072) throw new Error('Configuration must be a bounded regular file.');
    const buffer = Buffer.alloc(131073);
    let count = 0;
    while (count < buffer.length) {
      const n = readSync(fd, buffer, count, buffer.length - count, count);
      if (!n) break;
      count += n;
    }
    if (count > 131072) throw new Error('Configuration exceeds the size limit.');
    return buffer.subarray(0, count);
  } finally { closeSync(fd); }
}
function defaultsDirectory(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const bundled = join(here, 'defaults');
  if (existsSync(bundled)) return bundled;
  // Development-only fallback is anchored to the installed runtime module, never cwd.
  const manifest = join(here, '..', 'package.json');
  if (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).name === '@code-conductor/runtime') return resolve(here, '..', '..', '..', 'config');
  throw new Error('Packaged Code Conductor defaults are missing; reinstall the distribution.');
}
export function readDefaultDocument(name: DefaultDocument): { document: ObjectValue; evidence: ConfigurationEvidence } {
  if (!['roles', 'risk', 'capabilities', 'authorities', 'references', 'gates', 'mcp-catalog'].includes(name)) throw new Error('Unknown default configuration document.');
  const path = join(defaultsDirectory(), `${name}.yaml`);
  const bytes = boundedFile(path);
  const document: unknown = parse(bytes.toString('utf8'));
  if (!object(document) || document.version !== (name === 'capabilities' ? 2 : 1)) throw new Error(`Invalid packaged ${name} configuration.`);
  return { document, evidence: { layer: 'bundled', source: `defaults/${name}.yaml`, sha256: hash(bytes) } };
}
function approvedOverride(root: string, file: ApprovedConfigFile, layer: 'user' | 'workspace'): { document: ObjectValue; evidence: ConfigurationEvidence } {
  if (!isAbsolute(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('Configuration approval requires an absolute path and exact SHA-256.');
  const path = realpathSync(file.path);
  const workspace = realpathSync(root);
  const rel = relative(workspace, path);
  if (layer === 'workspace' && (rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(rel))) throw new Error('Workspace configuration escapes the approved workspace.');
  // Reject leaf links before following; parent resolution is used for workspace containment.
  const bytes = boundedFile(file.path);
  if (hash(bytes) !== file.sha256) throw new Error('Configuration changed after approval.');
  const document: unknown = JSON.parse(bytes.toString('utf8'));
  if (!object(document) || document.version !== 1 || Object.keys(document).some((key) => !['version', 'preferredHarnesses', 'specializationSignals'].includes(key))) throw new Error('Unsupported configuration override schema.');
  return { document, evidence: { layer, source: layer === 'workspace' ? rel.replaceAll('\\', '/') : 'approved-user-configuration', sha256: file.sha256 } };
}
function stringMap(value: unknown): Record<string, string[]> {
  if (!object(value) || Object.keys(value).length > 128) throw new Error('Override must be a bounded string-array map.');
  for (const [key, entries] of Object.entries(value)) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(key) || ['constructor', 'prototype', '__proto__'].includes(key) || !Array.isArray(entries) || !entries.length || entries.length > 64 || entries.some((entry) => typeof entry !== 'string' || !entry.trim() || entry.length > 256 || entry.includes('\0'))) throw new Error('Invalid routing override.');
  }
  return value as Record<string, string[]>;
}
/** Immutable authority/risk defaults; selected, content-approved routing overlays only. */
export function resolvePlanningConfiguration(root: string, options: ConfigurationOptions = {}) {
  const roles = readDefaultDocument('roles');
  const risks = readDefaultDocument('risk');
  const capabilities = readDefaultDocument('capabilities');
  const evidence = [roles.evidence, risks.evidence, capabilities.evidence];
  for (const layer of ['user', 'workspace'] as const) {
    const file = options[layer];
    if (!file) continue;
    const override = approvedOverride(root, file, layer);
    if (override.document.preferredHarnesses !== undefined) {
      for (const [role, harnesses] of Object.entries(stringMap(override.document.preferredHarnesses))) {
        if (!Object.hasOwn(roles.document.roles, role) || harnesses.some((h) => !Object.hasOwn(capabilities.document.harnesses, h))) throw new Error('Override references an unknown role or harness.');
        // A routing preference must not expand the role's eligible harness set.
        const eligible = roles.document.roles[role].preferred_harnesses ?? Object.keys(capabilities.document.harnesses);
        if (harnesses.some((h) => !eligible.includes(h))) throw new Error('Override would broaden eligible harnesses.');
        roles.document.roles[role].preferred_harnesses = [...new Set(harnesses)];
      }
    }
    if (override.document.specializationSignals !== undefined) {
      const signals = stringMap(override.document.specializationSignals);
      capabilities.document.routing.objective_signals = { ...capabilities.document.routing.objective_signals, ...signals };
    }
    evidence.push(override.evidence);
  }
  return { roles: roles.document, risks: risks.document, capabilities: capabilities.document, evidence };
}
