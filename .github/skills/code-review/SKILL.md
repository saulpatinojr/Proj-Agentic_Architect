---
name: code-conductor-review
description: >-
  Repository-specific code review for Code Conductor — TypeScript packages,
  runtime orchestration, policy engine, deterministic gates, Git worktree isolation,
  APM packaging, official MCP adapters, and the VS Code cockpit. Use this
  whenever reviewing a diff, branch, or pull request in this repository,
  whenever checking changes to any component here, and before opening or merging
  a PR with non-trivial changes.
---

# Code Conductor Code Review

Review changes the way this repository's CI and Gatekeeper reviewers will: component by component, with the repository's deterministic checks and locked governance policies.

## 1. Scope the review

Establish exactly what is being reviewed before reading code:

```bash
git diff --stat main...HEAD        # a branch
git diff --stat HEAD               # the working tree
git show <sha> --stat              # a single commit
```

Map every touched path to its component and validation requirement:

| Touched path | Component | Core considerations & verification |
| --- | --- | --- |
| `packages/core/**`, `packages/runtime/**` | Orchestration & execution engine | State machine transitions, bounded retries, structured `AgentResult` validation, plan execution, fail-closed handling. Run `npm test`. |
| `packages/policy/**`, `config/**` | Risk & authority policy | Separation of duties (implementer cannot self-approve/merge), role authority projection, challenger independence, risk tiers (R0-R3). Run `npm test` and `node packages/cli/dist/index.js validate .`. |
| `packages/schemas/**` | Schema & contract boundary | JSON Schema Draft 2020-12 compliance, type safety, enum validation. Run `npm test`. |
| `packages/gates/**` | Deterministic quality gates | Recursive glob matching, blocking vs advisory semantics, profile detection. Run `npm test`. |
| `packages/git/**` | Git & worktree manager | Owner-only directory permissions (`0700`), ref sanitization (`..`, `.lock`), rename/copy-aware status parsing. Run `npm test`. |
| `packages/evidence/**` | Evidence store | Path traversal prevention, tamper resistance, owner-only directory permissions. Run `npm test`. |
| `packages/mcp/**`, `.github/copilot-mcp.json` | MCP tools & catalog | Official servers, least-privilege read-only defaults, pinned package versions. Run `npm test`. |
| `packages/workstation/**` | Workstation trust | Private trust storage, fail-closed behavior for unvalidated harnesses. Run `npm test`. |
| `packages/apm-adapter/**`, `.apm/**`, `apm*.yml` | APM packaging & projections | Lockfile consistency (`apm.lock.yaml`), canonical `.apm/` source matching projections in `.github/`, `.claude/`, `.codex/`, `.kiro/`. Run `apm audit`. |
| `apps/vscode/**` | VS Code extension cockpit | Extension activation, webview state, non-blocking UI integration. Run `npm run typecheck`. |
| `docs/**`, `*.md` | Governance & documentation | Check `AGENTS.md`, `docs/DECISIONS.md`, and ADRs. Ensure locked decisions are preserved. |

## 2. Review each component

For each component, do three passes in this order:

1. **Correctness & Robustness** — check for unhandled error paths, broken state transitions, missing spawn diagnostics, path traversal vulnerabilities, and contract drift.
2. **Security & Governance** — apply the separation of duties rules from `AGENTS.md`. Ensure modifying agents remain isolated in worktrees and cannot self-approve or self-merge. Verify that external CLI actions fail closed without proper workstation trust.
3. **Verification** — run the exact commands CI runs:
   ```bash
   npm ci --ignore-scripts
   npm run typecheck
   npm test
   node packages/cli/dist/index.js validate .
   ```

## 3. MCP context (Copilot code review)

When this skill runs inside GitHub Copilot code review, read-only MCP servers are defined in `.github/copilot-mcp.json`:

| Component in diff | MCP Server | Role |
| --- | --- | --- |
| `packages/mcp/**`, Azure tooling | `azure` | Inspect deployed resource structures read-only. |
| `packages/github-gate/**`, CI workflows | `github-mcp-server` | Actions check inspection, security alert inspection, read-only commit/PR metadata. |
| Terraform / HCL | `terraform` | Provider and module registry references. |
| General reference | `microsoft-learn` | Official platform documentation queries. |

## 4. Report

Structure the review report as:

1. **Verdict** — One sentence: mergeable as-is, mergeable with nits, or blocking findings.
2. **Findings** — Rank by severity, cite exact `file:line`, provide the failure scenario, and offer a concrete remedy.
3. **Verification** — Commands run and outcomes recorded.
