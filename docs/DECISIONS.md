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
| D-024 | Initial MCP/reference catalog should prioritize official Microsoft, GitHub, HashiCorp Terraform, Ansible, AWS, Google Cloud, Kiro/vendor-required integrations, and Perplexity when explicitly enabled. | LOCKED |
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

## Items requiring local/runtime validation before foundation merge

| ID | Item | Status |
|---|---|---|
| V-001 | Run the current/pinned APM CLI against this branch and validate `apm.yml`, explicit targets, materialized projections, and `apm audit --ci`. | VALIDATE |
| V-002 | Generate and commit `apm.lock.yaml` only through the APM CLI; never hand-author it. | VALIDATE |
| V-003 | Confirm official CLI/client authentication for Copilot, Claude Code/Max, Codex/ChatGPT Business, Kiro Pro, and Antigravity on the actual workstation. | VALIDATE |
| V-004 | Confirm the exact Kiro Pro headless authentication/credit behavior on the installed current Kiro CLI before wiring unattended execution. | VALIDATE |
| V-005 | Confirm current VS Code/AHP harness capabilities and authenticated MCP constraints on the installed VS Code release; keep all such integration behind adapters. | VALIDATE |
| V-006 | Confirm current official MCP endpoints/toolsets and authentication for every project profile before enabling them in production workflows. | VALIDATE |

## Open implementation choices

These are deliberately not locked yet:

- exact Node package manager/workspace tool
- exact schema validator library
- exact SQLite client/ORM
- exact internal event-bus implementation
- exact VS Code webview/tree-view composition
- exact telemetry backend beyond local structured logs for v0.1
- exact model version names; runtime capability discovery/configuration should prevent brittle hard-coding

## Change rule

When a future decision supersedes an entry above:

1. create an ADR in `docs/adr/`;
2. cite official/runtime evidence;
3. describe migration impact;
4. update this register in the same PR;
5. update `AGENTS.md`, `STARTER.md`, configuration, tests, and implementation docs if affected.
