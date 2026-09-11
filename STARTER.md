# STARTER.md — Code Conductor v0.1

This repository is the canonical home for Code Conductor implementation.

## Immediate objective

Build a working, VS Code-centered multi-provider agent orchestration system using subscription-backed vendor clients first, APM for portable agent-pack distribution, official MCP servers for tools/reference access, Git worktrees for modifying agents, GitHub for PR/change control, and deterministic validation gates.

## Locked decisions

1. VS Code is the primary cockpit.
2. Code Conductor is the orchestration/policy layer; it is not an MCP server and not a replacement chat UI.
3. Microsoft APM is the package/dependency/integrity layer for agent packs, skills, instructions, hooks, and supported MCP declarations.
4. GitHub is the repository, PR, CI, review, and merge source of truth.
5. Subscription-backed execution is preferred before separately billed model APIs.
6. Authentication remains in official vendor clients/credential stores.
7. CLI/headless execution is preferred for orchestrated worker execution when the vendor officially supports it; interactive IDE/client integrations remain available for human-in-the-loop work.
8. Provider/model/harness/role/stance/specialization/authority/risk are independent dimensions.
9. Modifying agents use isolated branches/worktrees.
10. Implementers do not self-review, self-approve, self-merge, or bypass required gates.
11. Perplexity is the primary research specialist. Subscription-only mode is human-in-the-loop; automated official MCP mode requires explicit API billing enablement.
12. GitHub Copilot is the GitHub-native Gatekeeper: PR review, re-review, repository/Actions context, and PR quality checks.
13. Kiro Pro is the specification/requirements lead and may also provide a subscription-backed headless execution lane through official Kiro CLI capabilities.
14. Claude Code and Codex are primary implementation/debugging harnesses.
15. Google Antigravity is the native Google execution lane.
16. Official vendor MCP/reference sources are used for authoritative validation.
17. APM-generated harness projections are materialized views, not independently maintained truth.
18. Human approval remains mandatory for consequential/destructive production operations.

## CLI policy

Use the official CLI/headless client for orchestration when it provides a supported automation interface and subscription-backed authentication:

- Kiro CLI: yes; first-class headless lane for Kiro Pro where supported.
- Claude Code CLI: yes for execution; preserve Claude Max subscription authentication and avoid unintended API-key precedence.
- Codex CLI: yes; authenticate with ChatGPT Business where supported.
- Google Antigravity CLI: yes; native Google lane.
- GitHub/Copilot CLI and GitHub APIs: use where they uniquely provide GitHub-native workflow/review capabilities; do not reduce Copilot to a generic coding worker.
- Perplexity Pro: no unofficial CLI automation of the consumer UI. Use the Pro client manually in subscription-only mode, or the official Perplexity MCP/API when API billing is explicitly enabled.

The VS Code extension is a control plane and observability surface. It should launch/open native sessions and diffs rather than reimplement vendor chat clients.

## Build order

1. Schemas: TaskEnvelope, AgentAssignment, AgentResult, Finding, Evidence, GateResult, MergeDecision, RunManifest.
2. Capability registry: provider/model/harness/subscription/tool support.
3. Policy engine: risk, role, stance, authority, separation of duties, API-spend policy.
4. Harness adapters: Codex, Claude, Kiro, Antigravity, Copilot/GitHub; use AHP where appropriate behind an adapter boundary.
5. Git worktree manager.
6. APM adapter and agent-pack compiler/materialization checks.
7. Official MCP catalog and minimum-tool selection.
8. GitHub Gatekeeper integration.
9. Bootstrap/doctor/validate CLI.
10. Thin VS Code extension: Team, Runs, Gates, Connections, Packs, Usage.
11. Evaluation/E2E harness.
12. First production-quality dogfood run against this repository.

## First Codex task

Codex should begin with `docs/IMPLEMENTATION-PLAN.md`, then implement the schemas and repository skeleton without changing the locked architecture above unless a verified platform limitation requires a documented architecture decision record.

Before coding, run/verify the APM target matrix and inspect `AGENTS.md`.

## Definition of done for v0.1

A clean machine can clone this repo, authenticate official clients, install APM dependencies, pass `apm audit --ci`, run `cc doctor`, bootstrap a target repository, execute an R1/R2 engineering task through at least two independent agent roles, isolate modifications in worktrees, run deterministic gates, create a GitHub PR, obtain GitHub-native review, collect structured evidence, and stop for human approval before merge when policy requires it.
