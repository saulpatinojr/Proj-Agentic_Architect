# Workstation validation runbook

Code Conductor deliberately separates repository/CI validation from subscription-backed client validation. GitHub Actions must never consume personal paid AI subscriptions. Run these checks on the workstation that will execute agents.

## 1. Baseline

Use an up-to-date VS Code installation, Git, Node 22+ (24 recommended), GitHub CLI, and the official clients you intend to use. On Windows, prefer WSL2 or another supported OS-level containment environment for unattended agent work whenever the harness documents stronger isolation there.

## 2. Authenticate at vendor boundaries

- GitHub/Copilot: sign in through VS Code/GitHub; verify `gh auth status` for GitHub CLI operations.
- Claude: sign in through Claude Code using the Claude Max subscription flow. Avoid unintended `ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN` overrides when subscription-first behavior is intended.
- Codex: sign in through the ChatGPT/Codex subscription flow. Keep credentials in the official client/keyring.
- Kiro: authenticate Kiro CLI with Kiro Pro. `KIRO_API_KEY` is allowed specifically for Kiro's documented headless subscription-credit mode when you intentionally configure it.
- Antigravity: sign in using the official Google AI Pro flow. Code Conductor keeps this lane interactive until ADR 0004 is superseded.
- Perplexity: consumer Pro login remains manual. Do not create an API key unless separately billed automated research is explicitly enabled.

## 3. Inventory

Run:

```bash
git --version
gh --version
apm --version
claude --version
codex --version
kiro-cli --version
agy --version
cc doctor .
```

`cc doctor` reports presence and local smoke-trust state but never prints secret values.

## 4. APM validation

```bash
apm targets
apm audit --ci --policy ./apm-policy.yml --no-fail-fast
```

If canonical `.apm/` package source or dependencies change, run `apm install`, inspect the generated projections and `apm.lock.yaml`, commit them, then let CI perform a read-only audit.

## 5. Harness smoke tests

Smoke tests run in a disposable temporary Git repository and record only the harness/version/timestamp result in `~/.code-conductor/workstation.json`. They do not store OAuth tokens or API keys.

Start read-only:

```bash
cc harness-smoke codex --mode read
cc harness-smoke claude --mode read
cc harness-smoke kiro --mode read
```

Then validate isolated modification behavior:

```bash
cc harness-smoke codex --mode modify
cc harness-smoke claude --mode modify
cc harness-smoke kiro --mode modify
```

If a smoke test fails, do not mark the harness trusted manually; inspect the installed client's permissions/sandbox configuration and current official documentation.

Antigravity headless smoke is intentionally blocked by ADR 0004 until upstream permission isolation is reliable enough for unattended execution.

## 6. First real dry run

```bash
cc run --repo . --risk R1 --objective "Review the Code Conductor foundation" 
```

This plans and persists a run but does not launch paid clients.

Only after required harness smoke tests pass:

```bash
cc run --repo . --risk R1 --objective "Implement the approved test task" --execute
```

A modifying agent receives an isolated worktree. Review/validation remains independent, and GitHub PR/merge remains a separate gate.
