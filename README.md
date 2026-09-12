# Code Conductor

Code Conductor is a **VS Code-centered, multi-provider agent engineering system**. It coordinates subscription-backed AI clients, reusable APM agent packs, official MCP tools/references, safe context preparation, Git worktrees, GitHub pull requests, deterministic quality gates, and human approval without collapsing every provider into a generic chat interface.

## Status

**Target:** v0.1 workstation/VS Code release  
**Current checkpoint:** repository foundation and CI are implemented and green; live subscription-backed workstation validation and the first complete R1/R2 multi-agent dogfood run remain before release readiness. The new first-party context optimizer has been integrated as a conservative context-preparation capability; its MCP transport remains experimental until official-SDK/current-protocol validation is complete.

See [`docs/STATUS.md`](docs/STATUS.md) for the maintained checkpoint.

## Architecture at a glance

| Layer | Responsibility |
|---|---|
| VS Code | Human cockpit and native editor/terminal/diff/SCM surfaces |
| Code Conductor | Task DAG, routing, risk, authority, context policy, evidence, arbitration, readiness |
| Context preparation | Provider-neutral, workspace-bounded context reduction; lossless by default, aggressive only by explicit opt-in |
| Official harnesses/clients | Codex, Claude Code, Kiro, Antigravity, Copilot/GitHub execution surfaces |
| Microsoft APM | Agent-pack dependency, distribution, lock, projection, integrity, drift |
| MCP | Vendor-official and approved first-party tools/resources; not the runtime scheduler |
| Git worktrees | Isolated modifying-agent workspaces |
| GitHub | Repository, PR, Actions, review, and merge source of truth |
| Human owner | Final authority for consequential/destructive operations |

The repository constitution is [`AGENTS.md`](AGENTS.md). Locked architectural decisions are in [`docs/DECISIONS.md`](docs/DECISIONS.md). The context-optimization boundary is recorded in [`docs/adr/0007-context-optimization-boundary.md`](docs/adr/0007-context-optimization-boundary.md).

## Team model

Code Conductor separates **provider, model, harness, billing channel, role, stance, specialization, tools, authority, and risk clearance**. Platform-specific strengths are intentionally preserved:

- **Kiro** — specification, requirements, design, and task-planning lead; eligible headless worker after workstation validation.
- **Perplexity** — research discovery/synthesis; Pro subscription mode remains human-in-the-loop unless separately billed official MCP/API automation is explicitly enabled.
- **GitHub Copilot / GitHub** — GitHub-native Gatekeeper for PR review/re-review, Actions/PR state, repository context, and merge-quality checks.
- **Claude Code** — implementation, refactoring, and codebase reasoning.
- **Codex** — implementation, debugging, testing, and repository work.
- **Google Antigravity** — Google/GCP specialist and alternate builder/reviewer; unattended execution remains gated by its validated permission boundary.

Important work can add independent constructive, critical/challenger, neutral validator, security, arbiter, and finalizer roles according to risk.

## Quick start

Prerequisites for repository development are Git, Node.js 22+ (Node 24 recommended), GitHub CLI, and APM 0.30.0. Subscription-backed execution additionally requires the official vendor clients described in [`docs/WORKSTATION-VALIDATION.md`](docs/WORKSTATION-VALIDATION.md).

```bash
npm ci --ignore-scripts
npm run typecheck
npm test
npm run cc:validate
```

Validate APM state:

```bash
apm targets
apm audit --ci --policy ./apm-policy.yml --no-fail-fast
```

Run workstation diagnostics after building:

```bash
npm run cc:doctor
```

Prepare a repository file as context after building. Reads are scoped to the supplied root and sensitive/state paths are blocked:

```bash
node packages/cli/dist/index.js compress README.md --root .
```

That command is lossless/conservative by default. `--aggressive` is an explicit opt-in for content where removing comments/extra whitespace is known to be acceptable. Token counts shown by this local optimizer are estimates, not provider billing or quota data.

Do not enable unattended paid-client execution until the appropriate `cc harness-smoke` checks pass on that workstation.

## Documentation

Start with [`docs/README.md`](docs/README.md). Key documents include:

- [`STARTER.md`](STARTER.md) — short continuity handoff for a new work session.
- [`docs/STATUS.md`](docs/STATUS.md) — current implementation checkpoint.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design and boundaries.
- [`docs/IMPLEMENTATION-PLAN.md`](docs/IMPLEMENTATION-PLAN.md) — v0.1 plan and release definition.
- [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md) — credential and subscription/API boundaries.
- [`docs/MCP-CATALOG.md`](docs/MCP-CATALOG.md) — MCP strategy and provenance/activation rules.
- [`docs/WORKSTATION-VALIDATION.md`](docs/WORKSTATION-VALIDATION.md) — live-client validation runbook.
- [`docs/adr/`](docs/adr/) — architecture decision records.

## Repository truth model

- `.apm/` is canonical source for reusable agent/skill pack content in this repository.
- `apm.yml` declares package targets/dependencies.
- `apm.lock.yaml` and harness-specific projections are generated/materialized state and are committed for reproducibility; do not hand-edit the lockfile.
- `config/mcp-catalog.yaml` is Code Conductor's policy-driven MCP catalog. `.github/mcp.json` is a minimal Copilot CLI repository configuration, not a second catalog.
- Git is code-state truth; GitHub is PR/CI/review/merge truth.
- Code Conductor run/evidence state is runtime truth, not a replacement for Git/GitHub.

## Contributing and security

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a change. Security issues must follow [`SECURITY.md`](SECURITY.md); do not place credentials or exploitable vulnerability details in public issues.

This repository is licensed under the [Apache License 2.0](LICENSE).
