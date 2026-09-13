import * as vscode from 'vscode';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { startupSnapshot, type StartupMode } from './startup.js';

type ItemSpec = { label: string; description?: string; tooltip?: string; icon?: string; command?: vscode.Command };
type CapabilitySurface = { kind?: string; identifiers?: string[]; commands?: string[]; command?: string; interactive?: boolean; machine_execution?: boolean; requires_local_client?: boolean; enabled_by_default?: boolean };
type HarnessCapability = { provider?: string; command_candidates?: string[]; primary_specializations?: string[]; preferred_execution_surface?: string; native_capabilities?: string[]; surfaces?: Record<string, CapabilitySurface> };
type CapabilityDocument = { defaults?: { billing_policy?: string; allow_separately_billed_api?: boolean }; harnesses?: Record<string, HarnessCapability> };
type LocalDiscovery = { capturedAt: string; commands: Record<string, boolean>; extensions: Record<string, boolean> };

const STARTUP_FINGERPRINT_KEY = 'codeConductor.startupFingerprint';
const STARTUP_MODE_KEY = 'codeConductor.startupMode';
const STARTUP_DISCOVERY_KEY = 'codeConductor.startupDiscovery';

class ConductorItem extends vscode.TreeItem {
  constructor(spec: ItemSpec) {
    super(spec.label, vscode.TreeItemCollapsibleState.None);
    this.description = spec.description;
    this.tooltip = spec.tooltip;
    this.iconPath = new vscode.ThemeIcon(spec.icon ?? 'circle-outline');
    this.command = spec.command;
  }
}

class ConductorProvider implements vscode.TreeDataProvider<ConductorItem> {
  private readonly changed = new vscode.EventEmitter<ConductorItem | undefined | null | void>();
  readonly onDidChangeTreeData = this.changed.event;
  constructor(private readonly loader: () => ItemSpec[]) {}
  refresh(): void { this.changed.fire(); }
  getTreeItem(element: ConductorItem): vscode.TreeItem { return element; }
  getChildren(): ConductorItem[] { return this.loader().map((item) => new ConductorItem(item)); }
}

function workspaceRoot(): string | undefined { return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; }
function loadYaml<T>(root: string, path: string): T | undefined { try { return parse(readFileSync(join(root, path), 'utf8')) as T; } catch { return undefined; } }
function commandExists(command: string): boolean { const probe = process.platform === 'win32' ? 'where' : 'which'; return spawnSync(probe, [command], { stdio: 'ignore' }).status === 0; }
function harnessLabel(id: string): string {
  const labels: Record<string, string> = {
    'copilot-github': 'GitHub Copilot / GitHub',
    claude: 'Claude Code',
    codex: 'OpenAI Codex',
    kiro: 'Kiro',
    antigravity: 'Google Antigravity',
    perplexity: 'Perplexity',
    'internal-validator': 'Code Conductor Validator',
  };
  return labels[id] ?? id;
}
function surfaceCommands(harness: HarnessCapability, surface?: CapabilitySurface): string[] {
  if (surface?.command) return [surface.command];
  if (surface?.commands?.length) return surface.commands;
  return harness.command_candidates ?? [];
}

function teamItems(root?: string): ItemSpec[] {
  if (!root) return [{ label: 'Open a repository workspace', icon: 'info' }];
  const roles = loadYaml<{ roles?: Record<string, { stance?: string; preferred_harnesses?: string[] }> }>(root, 'config/roles.yaml');
  const capabilities = loadYaml<CapabilityDocument>(root, 'config/capabilities.yaml');
  return Object.entries(roles?.roles ?? {}).map(([role, spec]) => {
    const harnesses = spec.preferred_harnesses ?? [];
    const specializations = [...new Set(harnesses.flatMap((harness) => capabilities?.harnesses?.[harness]?.primary_specializations ?? []))];
    return {
      label: role,
      description: [spec.stance, harnesses.map(harnessLabel).join('/'), specializations.length ? specializations.join(',') : undefined].filter(Boolean).join(' · '),
      tooltip: specializations.length ? `Primary routing specializations: ${specializations.join(', ')}` : undefined,
      icon: role === 'builder' ? 'tools' : role.includes('review') || role.includes('challenger') ? 'search' : 'account',
    };
  });
}

function runItems(): ItemSpec[] {
  const root = process.env.CODE_CONDUCTOR_HOME || join(homedir(), '.code-conductor'); const runs = join(root, 'runs');
  if (!existsSync(runs)) return [{ label: 'No runs yet', description: 'Use Code Conductor: Plan Task', icon: 'history' }];
  return readdirSync(runs, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().reverse().slice(0, 20).map((name) => ({ label: name, icon: 'run-all' }));
}

function gateItems(root?: string): ItemSpec[] {
  if (!root) return [];
  const doc = loadYaml<{ profiles?: Record<string, { gates?: Array<{ id: string; blocking?: boolean }> }> }>(root, 'config/gates.yaml');
  return Object.entries(doc?.profiles ?? {}).flatMap(([profile, spec]) => (spec.gates ?? []).map((gate) => ({ label: gate.id, description: `${profile}${gate.blocking === false ? ' · advisory' : ' · blocking'}`, icon: gate.blocking === false ? 'info' : 'shield' })));
}

function connectionItems(root?: string): ItemSpec[] {
  if (!root) return [{ label: 'Open a repository workspace', icon: 'info' }];
  const capabilities = loadYaml<CapabilityDocument>(root, 'config/capabilities.yaml');
  const items: ItemSpec[] = [];
  for (const [id, harness] of Object.entries(capabilities?.harnesses ?? {})) {
    if (id === 'internal-validator') continue;
    const preferredName = harness.preferred_execution_surface ?? 'unknown';
    const preferred = harness.surfaces?.[preferredName];
    const commands = surfaceCommands(harness, preferred);
    const localClientAvailable = commands.length === 0 || commands.some(commandExists);
    const extensionIds = Object.values(harness.surfaces ?? {}).flatMap((surface) => surface.identifiers ?? []);
    const extensionAvailable = extensionIds.some((extensionId) => Boolean(vscode.extensions.getExtension(extensionId)));
    const requiresLocal = Boolean(preferred?.requires_local_client);
    const preferredAvailable = requiresLocal ? localClientAvailable : preferred?.kind === 'vscode_extension' ? extensionAvailable : true;
    const allSurfaces = Object.entries(harness.surfaces ?? {}).map(([name, surface]) => `${name}:${surface.kind ?? 'unknown'}${surface.machine_execution ? ':machine' : ':human'}`).join(', ');
    items.push({
      label: harnessLabel(id),
      description: `${preferredAvailable ? 'available' : 'not found'} · preferred ${preferredName}${commands.length ? ` · ${commands.join('|')}` : ''}`,
      tooltip: `Provider: ${harness.provider ?? 'unknown'}\nSurfaces: ${allSurfaces || 'none'}\nNative capabilities: ${(harness.native_capabilities ?? []).join(', ') || 'none declared'}${extensionIds.length ? `\nVS Code extensions: ${extensionIds.join(', ')}${extensionAvailable ? ' (detected)' : ''}` : ''}`,
      icon: preferredAvailable ? (id === 'kiro' ? 'checklist' : id === 'antigravity' ? 'globe' : id === 'copilot-github' ? 'github' : 'hubot') : 'warning',
    });
  }
  const apmAvailable = commandExists('apm');
  items.push({ label: 'Microsoft APM', description: `${apmAvailable ? 'available' : 'not found'} · apm`, icon: apmAvailable ? 'package' : 'warning' });
  return items;
}

function packItems(root?: string): ItemSpec[] {
  if (!root) return [];
  const manifest = loadYaml<{ targets?: string[] }>(root, 'apm.yml');
  const agents = existsSync(join(root, '.apm', 'agents')) ? readdirSync(join(root, '.apm', 'agents')).filter((x) => x.endsWith('.md')).length : 0;
  const skills = existsSync(join(root, '.apm', 'skills')) ? readdirSync(join(root, '.apm', 'skills'), { withFileTypes: true }).filter((x) => x.isDirectory()).length : 0;
  return [
    { label: 'APM lock', description: existsSync(join(root, 'apm.lock.yaml')) ? 'committed' : 'missing', icon: existsSync(join(root, 'apm.lock.yaml')) ? 'lock' : 'warning' },
    { label: 'Canonical agents', description: String(agents), icon: 'organization' }, { label: 'Canonical skills', description: String(skills), icon: 'extensions' },
    { label: 'Targets', description: manifest?.targets?.join(', ') ?? 'unknown', icon: 'symbol-array' },
  ];
}

function usageItems(root?: string): ItemSpec[] {
  const capabilities = root ? loadYaml<CapabilityDocument>(root, 'config/capabilities.yaml') : undefined;
  const statsPath = join(process.env.CODE_CONDUCTOR_HOME || join(homedir(), '.code-conductor'), 'context-optimization-stats.json');
  let savedTokens = 0;
  if (existsSync(statsPath)) {
    try {
      const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
      savedTokens = stats.tokensSaved ?? 0;
    } catch { /* ignore */ }
  }
  return [
    { label: 'Billing policy', description: capabilities?.defaults?.billing_policy ?? 'subscription_first', icon: 'credit-card' },
    { label: 'Separately billed API', description: capabilities?.defaults?.allow_separately_billed_api ? 'enabled' : 'disabled by default', icon: capabilities?.defaults?.allow_separately_billed_api ? 'warning' : 'pass' },
    { label: 'Context optimizer', description: 'available · lossless default', tooltip: 'Aggressive comment/whitespace removal is explicit opt-in.', icon: 'zap' },
    { label: 'Estimated input tokens saved', description: `${savedTokens.toLocaleString()} tokens`, tooltip: 'Approximate characters/4 telemetry; not vendor billing data.', icon: 'graph' },
    { label: 'Quota telemetry', description: 'vendor-native / not stored', icon: 'pulse' },
  ];
}

function discoverLocalSurfaces(): LocalDiscovery {
  const commands = ['git', 'gh', 'apm', 'claude', 'codex', 'kiro-cli', 'agy', 'terraform', 'ansible', 'pwsh', 'az', 'aws', 'gcloud', 'kubectl', 'helm'];
  const extensionIds = ['anthropic.claude-code', 'openai.chatgpt', 'github.copilot', 'github.copilot-chat', 'github.vscode-pull-request-github'];
  return {
    capturedAt: new Date().toISOString(),
    commands: Object.fromEntries(commands.map((command) => [command, commandExists(command)])),
    extensions: Object.fromEntries(extensionIds.map((id) => [id, Boolean(vscode.extensions.getExtension(id))])),
  };
}

function startupTooltip(mode: StartupMode, discovery?: LocalDiscovery): string {
  const label = mode === 'first_run' ? 'First-run local discovery completed.' : mode === 'config_changed' ? 'Configuration changed; local discovery refreshed.' : 'Warm start restored from cached local state.';
  if (!discovery) return `${label}\nNo AI provider, ACP session, MCP server, or APM materialization was started.`;
  const available = Object.entries(discovery.commands).filter(([, value]) => value).map(([key]) => key);
  return `${label}\nDetected local commands: ${available.join(', ') || 'none'}\nNo AI provider, ACP session, MCP server, or APM materialization was started.`;
}

function runCli(context: vscode.ExtensionContext, root: string, args: string[], title: string): void {
  const runtime = join(context.extensionPath, 'dist', 'cc.js');
  if (!existsSync(runtime)) {
    void vscode.window.showErrorMessage('Code Conductor runtime bundle is missing. Reinstall/rebuild the Code Conductor extension; customer repositories should never build the runtime themselves.');
    return;
  }
  const terminal = vscode.window.createTerminal({ name: title, cwd: root });
  const quoted = (value: string) => JSON.stringify(value);
  terminal.show();
  terminal.sendText(`node ${quoted(runtime)} ${args.map(quoted).join(' ')}`);
}

async function initializeStartup(context: vscode.ExtensionContext): Promise<vscode.StatusBarItem> {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 25);
  status.command = 'codeConductor.doctor';
  const root = workspaceRoot();
  if (!root) {
    status.text = '$(radio-tower) Conductor: No Workspace';
    status.tooltip = 'Open a repository workspace to initialize Code Conductor.';
    status.show();
    return status;
  }

  const previous = context.workspaceState.get<string>(STARTUP_FINGERPRINT_KEY);
  const snapshot = startupSnapshot(root, previous);
  let discovery = context.workspaceState.get<LocalDiscovery>(STARTUP_DISCOVERY_KEY);

  if (snapshot.mode !== 'warm' || !discovery) {
    discovery = discoverLocalSurfaces();
    await context.workspaceState.update(STARTUP_DISCOVERY_KEY, discovery);
  }
  await context.workspaceState.update(STARTUP_FINGERPRINT_KEY, snapshot.fingerprint);
  await context.workspaceState.update(STARTUP_MODE_KEY, snapshot.mode);
  await vscode.commands.executeCommand('setContext', 'codeConductor.startupMode', snapshot.mode);

  const missingRequired = ['git', 'gh', 'apm'].filter((command) => !discovery?.commands[command]);
  status.text = missingRequired.length ? '$(warning) Conductor: Setup' : '$(check) Conductor Ready';
  status.tooltip = `${startupTooltip(snapshot.mode, discovery)}${missingRequired.length ? `\nMissing baseline commands: ${missingRequired.join(', ')}. Click to run Doctor.` : '\nClick to run Doctor for deeper auth/trust validation.'}`;
  status.show();
  return status;
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const root = () => workspaceRoot();
  const startupStatus = await initializeStartup(context);
  context.subscriptions.push(startupStatus);

  const providers = [
    new ConductorProvider(() => teamItems(root())), new ConductorProvider(runItems), new ConductorProvider(() => gateItems(root())),
    new ConductorProvider(() => connectionItems(root())), new ConductorProvider(() => packItems(root())), new ConductorProvider(() => usageItems(root())),
  ];
  const ids = ['codeConductor.team', 'codeConductor.runs', 'codeConductor.gates', 'codeConductor.connections', 'codeConductor.packs', 'codeConductor.usage'];
  ids.forEach((id, index) => context.subscriptions.push(vscode.window.registerTreeDataProvider(id, providers[index]!)));
  context.subscriptions.push(vscode.commands.registerCommand('codeConductor.refresh', async () => {
    const r = root();
    if (r) {
      const discovery = discoverLocalSurfaces();
      await context.workspaceState.update(STARTUP_DISCOVERY_KEY, discovery);
      await context.workspaceState.update(STARTUP_FINGERPRINT_KEY, startupSnapshot(r).fingerprint);
    }
    providers.forEach((provider) => provider.refresh());
  }));
  context.subscriptions.push(vscode.commands.registerCommand('codeConductor.doctor', () => { const r = root(); if (r) runCli(context, r, ['doctor', '.'], 'Code Conductor Doctor'); }));
  context.subscriptions.push(vscode.commands.registerCommand('codeConductor.validate', () => { const r = root(); if (r) runCli(context, r, ['validate', '.'], 'Code Conductor Validate'); }));
  context.subscriptions.push(vscode.commands.registerCommand('codeConductor.plan', async () => {
    const r = root(); if (!r) return; const objective = await vscode.window.showInputBox({ prompt: 'Task objective', ignoreFocusOut: true }); if (!objective) return;
    const risk = await vscode.window.showQuickPick(['R0', 'R1', 'R2', 'R3', 'R4'], { placeHolder: 'Risk class' }); if (!risk) return;
    runCli(context, r, ['plan', '--repo', '.', '--risk', risk, '--objective', objective], 'Code Conductor Plan');
  }));
  context.subscriptions.push(vscode.commands.registerCommand('codeConductor.openDecisions', async () => {
    const r = root(); if (!r) return; const uri = vscode.Uri.file(join(r, 'docs', 'DECISIONS.md')); if (existsSync(uri.fsPath)) await vscode.window.showTextDocument(uri);
  }));
}

export function deactivate(): void {}
