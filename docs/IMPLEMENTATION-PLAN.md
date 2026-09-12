# Code Conductor v0.1 Implementation Plan

## Goal

Deliver a working orchestration system for VS Code that coordinates existing subscription-backed AI clients and official platform integrations rather than recreating them. The v0.1 design remains workstation-first, provider-neutral, evidence-driven, and safe to extend.

## Architecture layers

### 1. Cockpit

VS Code is the primary operator UI. A thin Code Conductor extension exposes Team, Runs, Gates, Connections, Packs, and Usage views and deep-links into native agent sessions, terminals, diffs, Source Control, and GitHub PR tooling.

### 2. Runtime control plane

Code Conductor Core owns:

- task envelope creation
- DAG/dependency scheduling
- capability-aware routing
- risk classification
- role and stance assignment
- authority checks
- bounded retry/escalation
- context-selection/preparation policy
- evidence aggregation
- disagreement arbitration
- merge/readiness decisions

The core must remain vendor-neutral.

### 3. Harness plane

Initial supported execution lanes:

- GitHub Copilot / GitHub platform
- Claude Code
- OpenAI Codex
- Kiro CLI
- Google Antigravity
- Perplexity research: manual Pro-client mode plus optional official MCP/API mode

Prefer official CLI/headless interfaces for orchestrated work where officially supported. Preserve each vendor's native authentication boundary. AHP may be used where appropriate, but only behind a replaceable adapter.

### 4. Context-preparation plane

The first-party context optimizer prepares context already selected by Code Conductor. It is not a scheduler and it does not decide what evidence is authoritative.

- lossless/conservative is the default;
- valid JSON may be compacted semantically;
- comment/whitespace removal for other content requires explicit aggressive mode;
- file reads are workspace-root scoped after canonical/symlink resolution;
- sensitive/state/credential paths and oversized/non-regular files are denied;
- local token counts are estimates for relative telemetry, never billing/quota truth;
- core output is provider-neutral;
- direct package/CLI integration is primary for v0.1;
- the MCP transport is optional and remains experimental until official MCP TypeScript SDK/current-protocol validation is complete.

### 5. Package plane

Microsoft APM is authoritative for reusable agent-pack dependency/distribution/integrity concerns.

- `apm.yml` is the project manifest.
- `apm.lock.yaml` is generated and must never be hand-edited.
- `apm-policy.yml` controls allowed package/MCP policy.
- `.apm/` is canonical package source for reusable agents/skills.
- Copilot/Claude/Codex/Kiro/Antigravity/Agent Skills target directories are materialized projections.

Pinned targets for the foundation are Copilot, Claude, Codex, Kiro, Antigravity, and converged Agent Skills.

### 6. Tool/reference plane

Only vendor-official or explicitly approved Code Conductor first-party MCPs belong in the catalog. Enable them per repository profile, not globally by default.

Initial catalog:

- GitHub official MCP
- Microsoft Learn official MCP
- Azure official MCP when an Azure project requires it
- HashiCorp Terraform official MCP for Terraform repositories
- Ansible official ADT/MCP where supported, with deterministic Ansible tooling remaining release authority while preview limitations exist
- AWS official managed/local MCP tooling when an AWS project requires it
- Google Cloud managed MCP tooling when a GCP project requires it
- Perplexity official MCP only when API billing is explicitly enabled
- Code Conductor context optimizer only under its explicit first-party profile while the adapter remains experimental

MCP provides tools/resources. It does not schedule the team.

GitHub Copilot has a separate configuration boundary: `.github/mcp.json` is minimal repository-scoped Copilot CLI configuration; GitHub.com Copilot code-review/cloud MCP servers are configured through repository settings and built-in GitHub MCP capability rather than a custom token-minter workflow.

### 7. Change plane

Git owns code state. GitHub owns repository, PR, Actions, review, and merge state.

Every modifying assignment should receive a task/agent branch and isolated worktree. Review-only assignments are normally read-only. Integration must be validated again after combining work.

## Team roles

### Conductor
Neutral coordinator. Assigns work, composes the task DAG, enforces policy, and escalates.

### Kiro Specification Lead
Primary requirements/specification/design/task-planning role for substantial feature work. Kiro Pro's supported CLI/headless capability can also be used as a worker lane without inventing an API wrapper.

### Perplexity Research Captain
Primary external research discovery role. In subscription-only mode, research is human-in-the-loop through the Pro client. Automated research requires the official MCP/API lane and explicit spend policy.

### Claude Builder
Primary constructive implementation/refactoring/codebase-reasoning worker through Claude Code and Claude Max authentication.

### Codex Builder
Primary constructive implementation/debugging/test worker through Codex and ChatGPT Business authentication.

### Google Specialist
Independent Google/GCP specialist and alternate implementation/review lane through Antigravity.

### GitHub Gatekeeper
GitHub Copilot plus GitHub platform capabilities. Owns GitHub-native PR review/re-review, repository context, Actions/PR inspection, and PR-quality checks. It is not merely another generic coder.

### Challenger
Critical stance. Must be independent from the primary builder when risk policy requires it. Attempts to falsify assumptions and surface defects.

### Security Reviewer
Critical stance, read/block authority by default.

### Validator
Neutral stance. Re-runs deterministic tests/validation from a clean state.

### Arbiter
Neutral principal-level role for material disagreement.

### Finalizer
Determines objective-level readiness based on structured evidence. Does not bypass human approval policy.

## Risk policy

- R0: builder + deterministic check.
- R1: builder + reviewer + deterministic tests.
- R2: builder + different-provider challenger + validator + GitHub review when applicable.
- R3: research/reference + spec/architecture + builder + challenger + security + validator + GitHub review + finalizer + human approval.
- R4: R3 plus explicit human approval before destructive/external production action.

## Structured contracts

Core contracts are:

- `TaskEnvelope`
- `AgentAssignment`
- `AgentResult`
- `Evidence`
- `Finding`
- `GateResult`
- `ReviewResult`
- `MergeDecision`
- `RunManifest`

Each result records task id, agent id, role, stance, provider, harness, billing channel, status, changes, tests, evidence, findings, risks, blockers, and recommendation.

## Authentication design

Code Conductor must not store consumer OAuth tokens or impersonate vendor clients.

- GitHub/Copilot: official GitHub/VS Code authentication.
- Claude Code: Claude subscription authentication for Max; warn when API-key environment variables could change billing behavior.
- Codex: ChatGPT subscription authentication where supported.
- Kiro: Kiro Pro official authentication; use supported Kiro CLI mechanisms for subscription execution when configured.
- Antigravity: official Google sign-in/keyring flow.
- Perplexity: Pro consumer login for manual mode; official API key only for explicitly enabled MCP automation.

`cc doctor` detects relevant client availability, auth status where safely discoverable, conflicting API-key environment variables, repository trust, Git state, APM state, MCP health, and sandbox capability. It never prints secret values.

## CLI-first execution decision

CLI/headless clients are the standard machine-facing adapters where officially supported because they are composable, observable, scriptable, and can run independently of UI focus. The VS Code extension remains the human cockpit.

Exceptions are capability-driven:

- GitHub Copilot/GitHub workflow operations use GitHub-native PR/review/Actions semantics.
- Perplexity Pro remains manual unless official paid MCP/API access is explicitly enabled.
- Interactive vendor clients remain available for debugging, takeover, and human collaboration.

## Repository layout

```text
Proj-Agentic_Architect/
├── AGENTS.md
├── STARTER.md
├── README.md
├── apm.yml
├── apm.lock.yaml
├── apm-policy.yml
├── apps/
│   └── vscode/
├── packages/
│   ├── core/
│   ├── cli/
│   ├── schemas/
│   ├── policy/
│   ├── runtime/
│   ├── evidence/
│   ├── gates/
│   ├── git/
│   ├── workstation/
│   ├── context-optimizer/
│   ├── mcp/
│   ├── apm-adapter/
│   ├── github-gate/
│   └── adapters/
├── config/
│   ├── capabilities.yaml
│   ├── roles.yaml
│   ├── risk.yaml
│   ├── authorities.yaml
│   ├── references.yaml
│   ├── gates.yaml
│   └── mcp-catalog.yaml
├── .apm/
├── .agents/
├── .github/
│   ├── agents/
│   ├── skills/
│   ├── workflows/
│   └── mcp.json
├── tests/
└── docs/
    ├── IMPLEMENTATION-PLAN.md
    ├── ARCHITECTURE.md
    └── adr/
```

Do not create empty scaffolding merely to make the tree look complete; create directories when their first implementation lands.

## Implementation phases

### Phase 0 — Foundation — implemented

- repository constitution and decision register
- APM manifest/lock/policy and explicit targets
- `STARTER.md`
- architecture/implementation plan
- CI and repository governance baseline

### Phase 1 — Contracts and core — implemented baseline

- TypeScript workspace
- schemas and validation
- task state machine
- policy/risk engine
- capability registry
- structured evidence/run persistence

### Phase 2 — Local execution — implemented baseline, workstation validation next

- CLI `cc`
- `cc doctor`
- `cc validate`
- Git/worktree manager
- Codex adapter
- Claude adapter
- Kiro adapter
- Antigravity safety boundary
- workstation trust/smoke validation
- context-preparation package/CLI with lossless default and explicit aggressive mode

### Phase 3 — Package/tool integration — implemented baseline, live validation next

- APM adapter
- approved MCP catalog
- selective MCP activation profiles
- vendor-official vs approved first-party provenance
- official-reference policies
- pack compilation/materialization validation
- context-optimizer experimental MCP adapter; official SDK/current-protocol migration remains a pre-GA task

### Phase 4 — GitHub Gatekeeper — implemented baseline, dogfood next

- PR state adapter
- Actions/status inspection
- Copilot review/re-review workflow
- required gate aggregation
- CodeQL and dependency-review workflows
- human merge boundary
- repository-specific `.github/skills/code-review` instructions

### Phase 5 — VS Code cockpit — thin foundation implemented, interactive validation next

- Team
- Runs
- Gates
- Connections
- Packs
- Usage, including clearly labeled estimated context-optimization telemetry

No replacement chat UI.

### Phase 6 — Evaluation / current next phase

Run the first real workstation dogfood sequence:

1. sync/verify `main` and run `cc doctor`;
2. authenticate supported subscription-backed clients using official mechanisms;
3. smoke-test Codex, Claude Code, and Kiro in read mode, then isolated modify mode;
4. verify selected MCP/reference profiles without granting unnecessary write authority;
5. exercise context preparation in lossless mode on representative repository inputs; test aggressive mode only on content where comment removal is explicitly acceptable;
6. execute a real R1 task through Code Conductor using an isolated worktree and deterministic validation;
7. raise the same scenario to R2 with a different-provider challenger plus GitHub Gatekeeper review/re-review;
8. capture structured evidence, resolve defects, and validate the VS Code cockpit against the run;
9. migrate/validate the context optimizer MCP adapter with the official MCP TypeScript SDK/current protocol before calling that adapter GA;
10. prepare the v0.1 release candidate.

Track task success, defects caught, false positives, retries, latency, subscription/API lane, API spend, estimated context reduction, and human interventions. Do not treat heuristic token estimates as vendor cost measurements.

## First dogfood scenario

Use this repository itself. The first real R1/R2 run must exercise the already-built runtime rather than manually reproducing its behavior. A modifying builder works in an isolated worktree, an independent role reviews/challenges it, deterministic gates run, GitHub Gatekeeper reviews the PR, and Code Conductor captures the evidence/readiness result.

## Release gate for v0.1

A clean workstation must be able to clone the repo, install/verify APM targets, authenticate supported official clients, run `cc doctor`, safely prepare bounded context, bootstrap another repo, execute an R1/R2 task using independent roles, isolate changes, run deterministic checks, create a GitHub PR, surface GitHub-native review, collect structured evidence, and enforce human approval where policy requires it. The context optimizer's direct/CLI path may ship in v0.1 when these boundaries pass; its MCP adapter remains experimental until the official-SDK/current-protocol gate is satisfied.
