# Workstation validation runbook

Code Conductor deliberately separates repository/CI validation from subscription-backed client validation. GitHub Actions must never consume personal paid AI subscriptions. Run these checks on the workstation that will execute agents.

This runbook follows ADR 0008/0009: the workstation is VS Code-centered, startup is lazy, and provider validation is **surface-aware** rather than treating every AI provider as only a CLI.

## 1. Baseline

Use an up-to-date VS Code installation, Git, Node 22+ (24 recommended), GitHub CLI, APM, and the official provider/tool clients required by the repository. On Windows, prefer WSL2 or another supported OS-level containment environment for unattended agent work whenever the harness documents stronger isolation there.

The Code Conductor release installation must eventually work in an ordinary repository without the Code Conductor source tree or a local `npm run build`. Until #8/#14 production packaging lands, development validation may still use this repository build explicitly and must label that fact.

## 2. Validate native VS Code surfaces

Before testing unattended execution, confirm the human-facing extension surfaces intended for this workstation are installed and usable.

At minimum for the core team, inspect VS Code Extensions / `code --list-extensions` and verify as applicable:

- Claude Code extension;
- Codex IDE extension;
- GitHub Copilot;
- GitHub Pull Requests / repository integration;
- Code Conductor development/release extension;
- repository-specific deterministic tool extensions such as Terraform, Ansible, PowerShell, Kubernetes, or cloud tooling.

Do not mark a provider healthy merely because an extension is installed. Open the provider's native panel/command once and confirm the expected official sign-in/session surface works.

## 3. Authenticate at vendor boundaries

- GitHub/Copilot: sign in through VS Code/GitHub; verify `gh auth status` for GitHub CLI operations.
- Claude: sign in through the official Claude Code VS Code/CLI flow using the intended subscription. Avoid unintended `ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN` overrides when subscription-first behavior is intended.
- Codex: sign in through the official Codex IDE/CLI ChatGPT flow. Keep credentials in the official client/keyring.
- Kiro: authenticate the official Kiro CLI/Kiro account flow. Code Conductor's preferred Kiro integration is ACP via `kiro-cli acp`; do not assume generic headless execution is the approved automation path. Validate current subscription/policy terms before unattended use.
- Antigravity: sign in using the official Google flow. Code Conductor keeps unattended execution blocked until ADR 0004 is superseded with current evidence.
- Perplexity: consumer Pro login remains manual. Do not create an API key unless separately billed automated research is explicitly enabled.

Code Conductor must not copy, print, or persist vendor OAuth tokens/secret values.

## 4. Inventory provider and deterministic-tool surfaces

Run the commands relevant to the workstation/repository:

```bash
git --version
gh --version
apm --version
claude --version
codex --version
kiro-cli --version
agy --version
terraform version
ansible --version
pwsh --version
cc doctor .
```

Missing optional tool commands are not failures when the active repository profile does not require them.

`cc doctor` should evolve under #10/#15 to report, without secrets:

- provider name and official auth boundary;
- available native IDE surface;
- available CLI/headless surface;
- ACP capability where supported;
- MCP capability/profile state;
- manual-only vs automated lane;
- deterministic tool availability;
- installed-version smoke/trust state;
- billing lane conflicts that can be safely inferred.

## 5. APM validation

```bash
apm targets
apm audit --ci --policy ./apm-policy.yml --no-fail-fast
```

If canonical `.apm/` package source or dependencies change, run the approved materialization workflow, inspect the generated projections and `apm.lock.yaml`, commit them, then let CI perform a read-only audit.

Normal warm VS Code startup must **not** reinstall/materialize APM simply because VS Code opened. Fingerprint changes or explicit refresh trigger materialization work.

## 6. Kiro ACP validation

Kiro is a special case because ADR 0009 chooses ACP as the preferred Code Conductor client/harness boundary.

First verify the installed CLI exposes ACP:

```bash
kiro-cli acp --help
```

The #11 ACP client spike must then validate, using the installed Kiro version:

- ACP initialization/capability exchange;
- session creation and cancellation;
- repository working directory handling;
- tool-call streaming/result capture;
- Kiro-native MCP lifecycle behavior exposed through ACP;
- native agent/subagent/session behavior required by the assigned task;
- read-only/plan authority behavior;
- isolated modify behavior in a disposable worktree;
- structured Code Conductor result/evidence mapping;
- current subscription/policy compliance.

Until those checks pass, Kiro remains available for interactive/manual use but unattended Code Conductor execution stays fail-closed.

Do not treat the older generic `cc harness-smoke kiro` result as sufficient release evidence after ADR 0009 unless that command has been updated to exercise the approved ACP surface.

## 7. Claude and Codex surface validation

Validate both the human IDE surface and the machine-facing surface because they provide overlapping but non-identical capabilities.

For Claude:

- open the Claude Code VS Code panel and verify native project context;
- verify native skills/subagents/hooks/MCP/plugins/commands required by the repository remain discoverable;
- verify the standalone `claude` CLI only when Code Conductor will use the CLI surface for the assignment;
- validate read/plan and isolated modify authority separately.

For Codex:

- open the Codex IDE extension and verify editor-context/review behavior;
- verify the standalone `codex` CLI/`codex exec` path only when Code Conductor will use that surface;
- verify relevant skills/plugins/MCP/permissions available to the selected surface;
- validate read-only and isolated modify authority separately.

The existing smoke commands remain useful for current CLI adapters:

```bash
cc harness-smoke codex --mode read
cc harness-smoke claude --mode read
cc harness-smoke codex --mode modify
cc harness-smoke claude --mode modify
```

If a smoke test fails, do not mark the harness trusted manually; inspect the installed client's permissions/sandbox configuration and current official documentation.

## 8. GitHub Gatekeeper validation

Verify:

- repository/PR visibility through GitHub native surfaces;
- GitHub Actions/status inspection;
- Copilot code review can be requested on the test PR;
- material fixes can be followed by a re-review;
- GitHub review evidence can be captured without treating Copilot opinion as a substitute for deterministic gates.

Repository ruleset/branch-protection administration remains tracked separately in issue #3.

## 9. Deterministic engineering-tool validation

For each active project profile, validate only the tools actually required. Examples:

```bash
terraform fmt -check
terraform validate
ansible-lint
pwsh -NoProfile -Command '$PSVersionTable.PSVersion'
```

Use repository-appropriate tests rather than running destructive cloud/deployment commands as a connectivity probe.

Tool/extension presence does not grant write or production authority. Assignment/risk policy controls authority separately.

## 10. First-run and warm-start behavior

### First run

Validate that Code Conductor can discover/inventory the repository, APM state, provider surfaces, deterministic tools, and relevant auth/trust gaps without starting paid AI work unexpectedly.

### Warm start

Restart/reload VS Code and verify that normal startup:

- restores cached non-secret health/run state;
- performs only lightweight fingerprint checks;
- does not start Claude, Codex, Kiro ACP, or MCP servers until needed;
- does not reinstall/materialize APM when inputs are unchanged;
- degrades gracefully if temporarily offline.

## 11. MCP/reference validation

Activate the minimum profile required for the repository. Confirm:

- authenticated MCPs retain their official IAM/RBAC boundary;
- write-capable tools are not granted globally by default;
- Code Conductor first-party MCP adapters require explicit catalog approval;
- context-optimizer MCP remains experimental until official SDK/current-protocol validation;
- Perplexity automated MCP/API remains disabled unless explicit separately billed policy is enabled.

## 12. First real dry run and dogfood

```bash
cc run --repo . --risk R1 --objective "Review the Code Conductor foundation"
```

This plans and persists a run but does not launch paid clients unless `--execute` is explicitly supplied.

Only after required surface-specific trust validation passes:

```bash
cc run --repo . --risk R1 --objective "Implement the approved test task" --execute
```

A modifying agent receives an isolated worktree. Review/validation remains independent, and GitHub PR/merge remains a separate gate.

Then repeat/raise the scenario to R2 with a different-provider challenger and GitHub Gatekeeper review/re-review.

## 13. Release evidence to retain

For the v0.1 release candidate, retain non-secret evidence of:

- installed provider/tool versions;
- extension/surface inventory;
- first-run and warm-start behavior;
- Kiro ACP capability/policy validation;
- Claude/Codex read and isolated modify validation on the actual selected surfaces;
- minimum MCP/tool profiles;
- R1/R2 structured results and deterministic gates;
- Git/worktree/PR state;
- GitHub Gatekeeper review/re-review;
- final readiness decision.
