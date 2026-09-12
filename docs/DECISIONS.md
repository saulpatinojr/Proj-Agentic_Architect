# Code Conductor Decision Register

This file is the durable record of user-approved architectural decisions. It exists so the project does not depend on chat history or model memory.

## Status vocabulary

- **LOCKED**: approved baseline; change only through an ADR with evidence.
- **VALIDATE**: intended decision that still requires local/runtime verification before merge.
- **OPEN**: implementation detail not yet locked.

## Locked decisions

| ID | Decision | Status |
|---|---|---|
| D-001 | `saulpatinojr/Proj-Agentic_Architect` is the canonical GitHub home for Code Conductor and its durable architecture/code/docs. | LOCKED |
| D-002 | VS Code is the primary human cockpit. Code Conductor augments native VS Code surfaces instead of replacing chat, diff, terminal, Source Control, or PR UI. | LOCKED |
| D-003 | Code Conductor is the runtime orchestration/policy/evidence layer. MCP is the tool/reference plane, not the scheduler. | LOCKED |
| D-004 | Microsoft APM is the package, dependency, lock, distribution, integrity, and drift-governance layer for Agent Packs and supported MCP declarations. | LOCKED |
| D-005 | APM and Code Conductor remain separated by an adapter boundary because APM is new/evolving and must not become an internal hard dependency of the core domain model. | LOCKED |
| D-006 | Git is the code-state authority. GitHub is the repository, PR, Actions, review, and merge source of truth. | LOCKED |
| D-007 | Modifying agents use isolated branches/worktrees. Review-only agents are read-only by default. A clean Git merge is not proof of correctness. | LOCKED |
| D-008 | Model, provider, harness, subscription/billing channel, role, stance, specialization, tools, authority, and risk clearance are independent dimensions. | LOCKED |
| D-009 | Route by capability and unique platform advantage, not vendor brand alone. | LOCKED |
| D-010 | Prefer subscription-backed official clients before separately billed model APIs. Separately billed API use is disabled by default and must be explicit/policy-controlled. | LOCKED |
| D-011 | Official vendor CLI/headless clients are the preferred machine-facing adapters where officially supported; native platform surfaces remain first-class where they provide unique capability. | LOCKED |
| D-012 | GitHub Copilot Pro+ is the GitHub-native Gatekeeper for PR review/re-review, repository context, Actions/PR checks, and GitHub-specific quality gates. | LOCKED |
| D-013 | Claude Code via Claude Max is a primary implementation/refactoring/codebase-reasoning lane. | LOCKED |
| D-014 | Codex via ChatGPT Business is a primary implementation/debugging/testing/repository-work lane. | LOCKED |
| D-015 | Kiro Pro is the primary specification/requirements/design/task-planning lead and may also provide an official subscription-backed headless worker lane where supported. | LOCKED |
| D-016 | Google Antigravity is the native Google execution lane and Google/GCP specialist/alternate builder-reviewer lane. | LOCKED |
| D-017 | Perplexity Pro is the primary Research Captain for discovery and synthesis. Subscription-only mode is human-in-the-loop. Automated official MCP/API research is optional and requires explicit separately billed API enablement. | LOCKED |
| D-018 | No unofficial scraping, session-cookie reuse, or consumer UI automation is allowed to simulate API/MCP access. | LOCKED |
| D-019 | Authentication remains with official vendor clients/credential stores. Code Conductor does not store consumer OAuth tokens or become the credential authority. | LOCKED |
| D-020 | Agents use explicit stances: constructive, critical, or neutral. Important work uses independent critical/challenger roles that provide evidence rather than disagreement for its own sake. | LOCKED |
| D-021 | Implementers never self-review, self-approve, self-merge, or bypass deterministic required gates. | LOCKED |
| D-022 | Human approval remains mandatory for high-impact/destructive/external production operations as defined by risk policy. | LOCKED |
| D-023 | Per-project MCP activation is minimal and profile-driven. Do not load every available MCP/tool into every agent context. | LOCKED |
| D-024 | Initial MCP/reference catalog prioritizes official Microsoft, GitHub, HashiCorp Terraform, Ansible, AWS, Google Cloud, Kiro/vendor-required integrations, and Perplexity when explicitly enabled. | LOCKED |
| D-025 | Perplexity discovers sources; implementation-impacting technical claims should be reconfirmed against official vendor documentation or executable repository evidence where available. | LOCKED |
| D-026 | Agent outputs become structured evidence, not only prose. Core contracts include `TaskEnvelope`, `AgentAssignment`, `AgentResult`, `Evidence`, `Finding`, `GateResult`, `ReviewResult`, `MergeDecision`, and `RunManifest`. | LOCKED |
| D-027 | Risk class controls team size and required independent roles/gates; trivial work must not incur a large agent committee. | LOCKED |
| D-028 | The first release is workstation/VS Code centered and does not require an always-on Azure/Kubernetes/database control plane. | LOCKED |
| D-029 | The initial control plane implementation is TypeScript/Node, with vendor-specific integrations behind adapters. | LOCKED |
| D-030 | A thin VS Code extension is part of v0.1, with views for Team, Runs, Gates, Connections, Packs, and Usage. It deep-links to native VS Code/vendor surfaces. | LOCKED |
| D-031 | Agent Packs are authored once in canonical APM package source and projected/materialized to supported harness formats rather than manually maintained as duplicate copies. | LOCKED |
| D-032 | `AGENTS.md` is the repository constitution, not the entire agent roster. Reusable team roles/skills live in APM-backed packs and vendor-neutral configuration. | LOCKED |
| D-033 | The project dogfoods itself: Code Conductor's own implementation is the first R1/R2 multi-agent validation scenario. | LOCKED |
| D-034 | Architecture changes require an ADR when they alter a locked decision or are forced by a verified official-platform limitation. | LOCKED |
| D-035 | APM CLI version `0.30.0` is explicitly pinned in CI until a newer version is deliberately validated; the APM action's default CLI version is not trusted for compatibility-critical behavior. | LOCKED |
| D-036 | APM-generated lock/projection state is committed after maintainer materialization; normal CI audits it read-only with `setup-only: true` and does not auto-write back to branches. | LOCKED |
| D-037 | Runtime retries are bounded and important work must escalate or fail explicitly rather than loop indefinitely. | LOCKED |
| D-038 | CI never consumes paid AI subscriptions or separately billed model APIs; multi-agent runtime behavior is tested with deterministic fake adapters/fixtures. | LOCKED |
| D-039 | Unattended external CLI execution is permitted only after the installed harness/version passes Code Conductor workstation smoke validation for the required read or modify authority. | LOCKED |
| D-040 | Antigravity remains a first-class Google specialist but unattended headless execution is disabled until its permission/sandbox boundary is revalidated; no dangerous permission-bypass workaround is allowed. | LOCKED |
| D-041 | External agent subprocess results use the `CC_RESULT_JSON:` terminal marker contract; missing or invalid structured results fail closed while preserving non-secret output as evidence. | LOCKED |
| D-042 | Modifying worktrees are preserved by default, actual safe Git changes are committed to the task/agent branch before integration, sensitive credential/state paths are blocked from automatic commit, and cleanup is explicit. | LOCKED |
| D-043 | npm dependency resolution is committed in `package-lock.json`; normal CI installs with `npm ci` and never auto-writes lockfile changes. | LOCKED |
| D-044 | Repository documentation follows a single-purpose truth model: `README.md` is the entry point, `AGENTS.md` the constitution, `STARTER.md` the continuity handoff, `docs/STATUS.md` the live checkpoint, `docs/README.md` the index, `docs/DECISIONS.md` the durable decision register, and `docs/adr/` the architecture-change record. | LOCKED |
| D-045 | Third-party GitHub Actions used by maintained workflows are pinned to reviewed immutable commit SHAs, with the corresponding release tag recorded as a comment for readability and deliberate upgrades. | LOCKED |
| D-046 | Executable package references in the approved MCP catalog must not use floating tags such as `latest`; exact validated versions are reviewed and updated intentionally. | LOCKED |
| D-047 | Context optimization is a Code Conductor context-preparation capability: conservative/lossless by default, aggressive removal only by explicit opt-in, workspace-root/sensitive-path bounded, provider-neutral, and reported with estimated rather than billing-token telemetry. Its MCP transport is optional/experimental until migrated to the official MCP TypeScript SDK and current protocol validation. See ADR 0007. | LOCKED |

## Validated implementation facts

| ID | Fact | Evidence/status |
|---|---|---|
| V-001 | APM 0.30.0 recognizes the explicit targets `agent-skills`, `antigravity`, `claude`, `codex`, `copilot`, and `kiro`. | VALIDATED in GitHub Actions on 2026-09-11. |
| V-002 | APM generated and committed `apm.lock.yaml` and harness projections from canonical `.apm/` sources. | VALIDATED by the GitHub Actions materialization commit on 2026-09-11. |
| V-003 | APM replay reported no drift after installation; source-attribution policy was then enabled in `apm.yml` as required by audit. | VALIDATED in GitHub Actions. |
| V-004 | TypeScript workspace, core state machine, policy validation, runtime planner, worktree utilities, and current unit tests build/pass in GitHub Actions. | VALIDATED in GitHub Actions. |
| V-005 | `package-lock.json` was generated by npm on Node 24 as lockfile version 3 and is committed; normal dependency CI is read-only. | VALIDATED in GitHub Actions on 2026-09-11. |
| V-006 | At the repository-cleanup checkpoint, Code Conductor CI, APM audit, and npm lockfile validation pass; the unit suite contains **27 passing tests across 11 files** and `cc validate` passes. | VALIDATED in GitHub Actions on 2026-09-11. |
| V-007 | Vitest 5.0.0 resolves the prior `@vitest/mocker` advisory in this dependency graph; `npm ci` and `npm audit` report **0 vulnerabilities**. | VALIDATED in GitHub Actions on 2026-09-11. |
| V-008 | The first GitHub Copilot Gatekeeper review identified MCP pinning, run-artifact permission, glob-matching, and trust-behavior concerns; valid defects were corrected and deliberate fail-closed workstation trust received explicit regression coverage. | VALIDATED through PR #1 review and CI on 2026-09-11. |
| V-009 | The second GitHub Copilot Gatekeeper review identified non-git GitHub-profile selection, advisory-gate blocking loss, and workstation-state directory permissions; all three were corrected with regression coverage and subsequent CI passed. | VALIDATED through PR #1 re-review and CI on 2026-09-11. |
| V-010 | The post-foundation context-optimizer retrofit preserves the feature inside Code Conductor's existing orchestration/MCP/security boundaries. Its reviewed implementation head passes **61 tests across 14 files**, TypeScript build/typecheck, `cc validate`, npm audit with **0 vulnerabilities**, APM audit, dependency review, CodeQL with no new alerts, and GitGuardian with no secrets detected; Copilot review findings were addressed and resolved. | VALIDATED through PR #6 and GitHub checks on 2026-09-12. |

## Items requiring workstation/runtime validation before subscription-backed execution

| ID | Item | Status |
|---|---|---|
| W-001 | Confirm official CLI/client authentication for Copilot, Claude Code/Max, Codex/ChatGPT Business, Kiro Pro, and Antigravity on the actual workstation. | VALIDATE |
| W-002 | Confirm Kiro Pro headless authentication/credit behavior on the installed current Kiro CLI before unattended subscription execution. | VALIDATE |
| W-003 | Confirm current VS Code/AHP harness capabilities and authenticated MCP constraints on the installed VS Code release; keep all such integration behind adapters. | VALIDATE |
| W-004 | Confirm official MCP endpoint/toolset/auth behavior for each project profile before granting any write-capable runtime authority. | VALIDATE |
| W-005 | Confirm exact installed CLI permission/sandbox flags for Codex, Claude, and Kiro before Code Conductor enables modifying execution through that harness; Antigravity remains interactive pending ADR 0004. | VALIDATE |
| W-006 | Validate the context optimizer's optional MCP adapter against the official MCP TypeScript SDK/current protocol before promoting that adapter beyond experimental; direct package/CLI use may proceed under ADR 0007 boundaries. | VALIDATE |

## Open implementation choices

These remain deliberately replaceable behind interfaces unless/until an ADR locks them:

- exact SQLite client/ORM for persistent indexed task state beyond the v0.1 file-backed run/evidence store
- exact internal event-bus implementation
- exact VS Code tree/webview composition beyond the locked six views
- exact telemetry backend beyond local structured logs for v0.1
- exact model version names; runtime capability discovery/configuration prevents brittle hard-coding

## Change rule

When a future decision supersedes an entry above:

1. create an ADR in `docs/adr/`;
2. cite official/runtime evidence;
3. describe migration impact;
4. update this register in the same PR;
5. update `AGENTS.md`, `STARTER.md`, configuration, tests, and implementation docs if affected.
