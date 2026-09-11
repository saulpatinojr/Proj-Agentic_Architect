import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

export interface McpServerDefinition {
  publisher: string;
  official: boolean;
  maturity: string;
  source: string;
  transport?: string;
  endpoint?: string;
  endpoint_template?: string;
  command?: string;
  args?: string[];
  authentication: string;
  default_access: 'read' | 'write';
  profiles: string[];
  separately_billed_api?: boolean;
  enabled_by_default?: boolean;
  note?: string;
}

export interface McpCatalog {
  version: number;
  policy: Record<string, unknown>;
  servers: Record<string, McpServerDefinition>;
}

export function loadMcpCatalog(root: string): McpCatalog {
  return parse(readFileSync(join(root, 'config/mcp-catalog.yaml'), 'utf8')) as McpCatalog;
}

export function detectRepositoryProfiles(root: string): string[] {
  const profiles = new Set<string>(['github']);
  if (existsSync(join(root, '.git'))) profiles.add('github');
  const markers: Record<string, string[]> = {
    terraform: ['main.tf', 'versions.tf', '.terraform.lock.hcl'],
    ansible: ['ansible.cfg', 'requirements.yml', 'galaxy.yml'],
    azure: ['azure.yaml'],
    aws: ['template.yaml', 'serverless.yml'],
    gcp: ['app.yaml'],
  };
  for (const [profile, files] of Object.entries(markers)) {
    if (files.some((file) => existsSync(join(root, file)))) profiles.add(profile);
  }
  return [...profiles];
}

export function selectMcpServers(catalog: McpCatalog, profiles: string[], allowSeparatelyBilledApi = false): Array<[string, McpServerDefinition]> {
  const wanted = new Set(profiles);
  return Object.entries(catalog.servers).filter(([, server]) => {
    if (!server.official && catalog.policy.official_only_by_default === true) return false;
    if (server.separately_billed_api && !allowSeparatelyBilledApi) return false;
    return server.profiles.some((profile) => wanted.has(profile));
  });
}
