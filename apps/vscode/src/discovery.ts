import { localCommandName } from './execution.js';

export interface DiscoveryInventory { commands: string[]; extensionIds: string[] }
const COMMANDS = ['node', 'git', 'gh', 'apm', 'claude', 'codex', 'kiro-cli', 'agy', 'terraform', 'ansible', 'pwsh', 'az', 'aws', 'gcloud', 'kubectl', 'helm'];
const EXTENSIONS = ['anthropic.claude-code', 'openai.chatgpt', 'github.copilot', 'github.copilot-chat', 'github.vscode-pull-request-github'];
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }

/** Pure inventory construction. Only explicit trusted discovery may probe these names. */
export function discoveryInventory(document: unknown): DiscoveryInventory {
  const commands = new Set(COMMANDS);
  const extensionIds = new Set(EXTENSIONS);
  const addCommands = (values: string[]) => {
    for (const value of values) if (value.length <= 128 && localCommandName(value)) commands.add(value);
  };
  const harnesses = Object.values(record(record(document).harnesses));
  if (harnesses.length > 128) throw new Error('Capability discovery exceeds the harness limit.');
  for (const value of harnesses) {
    const harness = record(value);
    addCommands(strings(harness.command_candidates));
    const surfaces = Object.values(record(harness.surfaces));
    if (surfaces.length > 64) throw new Error('Capability discovery exceeds the surface limit.');
    for (const entry of surfaces) {
      const surface = record(entry);
      addCommands(strings(surface.commands));
      if (typeof surface.command === 'string') addCommands([surface.command]);
      for (const id of strings(surface.identifiers)) {
        if (id.length <= 256 && /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*$/i.test(id)) extensionIds.add(id.toLowerCase());
      }
    }
  }
  if (commands.size > 256 || extensionIds.size > 256) throw new Error('Capability discovery exceeds the inventory limit.');
  return { commands: [...commands], extensionIds: [...extensionIds] };
}
