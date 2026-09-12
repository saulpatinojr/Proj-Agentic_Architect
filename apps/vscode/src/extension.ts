import * as vscode from 'vscode';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { parse } from 'yaml';

type ItemSpec = { label: string; description?: string; tooltip?: string; icon?: string; command?: vscode.Command };

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

function teamItems(root?: string): ItemSpec[] {
  if (!root) return [{ label: 'Open a repository workspace', icon: 'info' }];
  const doc = loadYaml<{ roles?: Record<string, { stance?: string; preferred_harnesses?: string[] }> }>(root, 'config/roles.yaml');
  return Object.entries(doc?.roles ?? {}).map(([role, spec]) => ({ label: role, description: [spec.stance, spec.preferred_harnesses?.join('/')].filter(Boolean).join(' · '), icon: role === 'builder' ? 'tools' : role.includes('review') || role.includes('challenger') ? 'search' : 'account' }));
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

function connectionItems(): ItemSpec[] {
  const clients: Array<[string, string, string]> = [['GitHub', 'gh', 'github'], ['APM', 'apm', 'package'], ['Claude', 'claude', 'hubot'], ['Codex', 'codex', 'terminal'], ['Kiro', 'kiro-cli', 'checklist'], ['Antigravity', 'agy', 'globe']];
  return clients.map(([label, command, icon]) => ({ label, description: commandExists(command) ? `available · ${command}` : `not found · ${command}`, icon: commandExists(command) ? icon : 'warning' }));
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
  const capabilities = root ? loadYaml<{ defaults?: { billing_policy?: string; allow_separately_billed_api?: boolean } }>(root, 'config/capabilities.yaml') : undefined;
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

function runCli(root: string, args: string[], title: string): void {
  const terminal = vscode.window.createTerminal({ name: title, cwd: root });
  const cli = join(root, 'packages', 'cli', 'dist', 'index.js');
  const quoted = (value: string) => JSON.stringify(value);
  terminal.show();
  if (!existsSync(cli)) terminal.sendText('npm run build');
  terminal.sendText(`node ${quoted(cli)} ${args.map(quoted).join(' ')}`);
}

export function activate(context: vscode.ExtensionContext): void {
  const root = () => workspaceRoot();
  const providers = [
    new ConductorProvider(() => teamItems(root())), new ConductorProvider(runItems), new ConductorProvider(() => gateItems(root())),
    new ConductorProvider(connectionItems), new ConductorProvider(() => packItems(root())), new ConductorProvider(() => usageItems(root())),
  ];
  const ids = ['codeConductor.team', 'codeConductor.runs', 'codeConductor.gates', 'codeConductor.connections', 'codeConductor.packs', 'codeConductor.usage'];
  ids.forEach((id, index) => context.subscriptions.push(vscode.window.registerTreeDataProvider(id, providers[index]!)));
  context.subscriptions.push(vscode.commands.registerCommand('codeConductor.refresh', () => providers.forEach((provider) => provider.refresh())));
  context.subscriptions.push(vscode.commands.registerCommand('codeConductor.doctor', () => { const r = root(); if (r) runCli(r, ['doctor', '.'], 'Code Conductor Doctor'); }));
  context.subscriptions.push(vscode.commands.registerCommand('codeConductor.validate', () => { const r = root(); if (r) runCli(r, ['validate', '.'], 'Code Conductor Validate'); }));
  context.subscriptions.push(vscode.commands.registerCommand('codeConductor.plan', async () => {
    const r = root(); if (!r) return; const objective = await vscode.window.showInputBox({ prompt: 'Task objective', ignoreFocusOut: true }); if (!objective) return;
    const risk = await vscode.window.showQuickPick(['R0', 'R1', 'R2', 'R3', 'R4'], { placeHolder: 'Risk class' }); if (!risk) return;
    runCli(r, ['plan', '--repo', '.', '--risk', risk, '--objective', objective], 'Code Conductor Plan');
  }));
  context.subscriptions.push(vscode.commands.registerCommand('codeConductor.openDecisions', async () => {
    const r = root(); if (!r) return; const uri = vscode.Uri.file(join(r, 'docs', 'DECISIONS.md')); if (existsSync(uri.fsPath)) await vscode.window.showTextDocument(uri);
  }));
}

export function deactivate(): void {}
