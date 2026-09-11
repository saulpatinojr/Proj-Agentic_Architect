# Code Conductor v0.1 Implementation Plan

## Goal

Deliver a working orchestration system for VS Code that coordinates existing subscription-backed AI clients and official platform integrations rather than recreating them.

## Architecture layers

### 1. Cockpit

VS Code is the primary operator UI. A thin Code Conductor extension will expose Team, Runs, Gates, Connections, Packs, and Usage views and deep-link into native agent sessions, terminals, diffs, Source Control, and GitHub PR tooling.

### 2. Runtime control plane

Code Conductor Core owns:

- task envelope creation
- DAG/dependency scheduling
- capability-aware routing
- risk classification
- role and stance assignment
- authority checks
- bounded retry/escalation
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
- Google Antigravity CLI
- Perplexity research: manual Pro-client mode plus optional official MCP/API mode

Prefer official CLI/headless interfaces for orchestrated work where officially supported. Preserve each vendor's native authentication boundary. AHP may be used where appropriate, but only behind a replaceable adapter.

### 4. Package plane

Microsoft APM is authoritative for reusable agent-pack dependency/distribution/integrity concerns.

- `apm.yml` is the project manifest.
- `apm.lock.yaml` is generated and must never be hand-edited.
- `apm-policy.yml` will control allowed packages/MCPs once the first approved catalog is established.
- `.apm/` is canonical package source when this repo begins publishing its own packs.
- Copilot/Claude/Codex/Kiro/Antigravity target directories are materialized projections.

Pinned targets for the foundation are Copilot, Claude, Codex, Kiro, Antigravity, and converged Agent Skills.

### 5. Tool/reference plane

Only official or explicitly approved MCPs are part of the initial catalog. Enable them per repository profile, not globally by default.

Initial catalog candidates:

- GitHub official MCP
- Microsoft Learn official MCP
- Azure official MCP when an Azure project requires it
- HashiCorp Terraform official MCP for Terraform repositories
- Ansible official ADT/MCP where supported, with deterministic Ansible tooling remaining release authority while preview limitations exist
- AWS official managed/local MCP tooling when an AWS project requires it
- Google Cloud managed MCP tooling when a GCP project requires it
- Perplexity official MCP only when API billing is explicitly enabled

MCP provides tools/resources. It does not schedule the team.

### 6. Change plane

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

Implement JSON Schema and TypeScript types for:

- `TaskEnvelope`
- `AgentAssignment`
- `AgentResult`
- `Evidence`
- `Finding`
- `GateResult`
- `ReviewResult`
- `MergeDecision`
- `RunManifest`

Each result must record at least task id, agent id, role, stance, provider, harness, billing channel, status, changes, tests, evidence, findings, risks, blockers, and recommendation.

## Authentication design

Code Conductor must not store consumer OAuth tokens or impersonate vendor clients.

- GitHub/Copilot: official GitHub/VS Code authentication.
- Claude Code: Claude subscription authentication for Max; warn when API-key environment variables could change billing behavior.
- Codex: ChatGPT subscription authentication where supported.
- Kiro: Kiro Pro official authentication; use supported Kiro CLI/API-key mechanism for headless subscription-credit execution when configured.
- Antigravity: official Google sign-in/keyring flow.
- Perplexity: Pro consumer login for manual mode; official API key only for explicitly enabled MCP automation.

`cc doctor` will detect relevant client availability, auth status where safely discoverable, conflicting API-key environment variables, repository trust, Git state, APM state, MCP health, and sandbox capability. It must never print secret values.

## CLI-first execution decision

Yes: CLI/headless clients become the standard machine-facing adapters where officially supported because they are composable, observable, scriptable, and can run independently of UI focus. The VS Code extension remains the human cockpit.

Exceptions are capability-driven:

- GitHub Copilot/GitHub workflow operations use the GitHub-native surface that best exposes PR/review/Actions semantics, not CLI merely for uniformity.
- Perplexity Pro remains manual unless official paid MCP/API access is explicitly enabled.
- Interactive vendor clients remain available for debugging, takeover, and human collaboration.

## Repository layout target

```text
Proj-Agentic_Architect/
├── AGENTS.md
├── STARTER.md
├── README.md
├── apm.yml
├── apm.lock.yaml                 # generated later
├── apm-policy.yml                # add with approved catalog
├── apps/
│   └── vscode/
├── packages/
│   ├── core/
│   ├── cli/
│   ├── schemas/
│   ├── policy/
│   ├── evidence/
│   ├── git/
│   ├── mcp/
│   ├── apm-adapter/
│   └── adapters/
│       ├── copilot-github/
│       ├── claude/
│       ├── codex/
│       ├── kiro/
│       ├── antigravity/
│       └── perplexity/
├── config/
│   ├── capabilities.yaml
│   ├── roles.yaml
│   ├── risk.yaml
│   ├── authorities.yaml
│   └── references.yaml
├── .apm/
│   ├── agents/
│   ├── instructions/
│   ├── skills/
│   └── hooks/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── security/
│   └── e2e/
└── docs/
    ├── IMPLEMENTATION-PLAN.md
    ├── ARCHITECTURE.md
    └── adr/
```

Do not create empty scaffolding merely to make the tree look complete; create directories when their first implementation lands.

## Implementation phases

### Phase 0 — Foundation

- repository constitution
- APM manifest and explicit targets
- Codex `STARTER.md`
- architecture/implementation plan
- CI/branch strategy proposal

### Phase 1 — Contracts and core

- TypeScript monorepo/workspace setup
- schemas and validation
- task state machine
- policy/risk engine
- capability registry
- structured logging

### Phase 2 — Local execution

- CLI `cc`
- `cc doctor`
- `cc validate`
- Git/worktree manager
- Codex adapter
- Claude adapter
- Kiro adapter
- Antigravity adapter

### Phase 3 — Package/tool integration

- APM adapter
- approved MCP catalog
- selective MCP activation profiles
- official-reference policies
- pack compilation/materialization validation

### Phase 4 — GitHub Gatekeeper

- PR state adapter
- Actions/status inspection
- Copilot review/re-review workflow
- required gate aggregation
- human merge boundary

### Phase 5 — VS Code cockpit

- Team
- Runs
- Gates
- Connections
- Packs
- Usage

No replacement chat UI.

### Phase 6 — Evaluation

Build deterministic fixtures and compare:

- single-agent baseline
- builder + reviewer
- builder + independent challenger
- full R2/R3 team

Track task success, defects caught, false positives, retries, latency, subscription/API lane, API spend, and human interventions.

## First dogfood scenario

Use this repository itself. Codex should implement Phase 1 on an isolated branch. A different provider reviews the resulting changes. GitHub Gatekeeper then reviews the PR. The run is complete only when structured evidence and deterministic tests agree that the foundation is ready.

## Release gate for v0.1

A clean workstation must be able to clone the repo, install/verify APM targets, authenticate supported official clients, run `cc doctor`, bootstrap another repo, execute an R1/R2 task using independent roles, isolate changes, run deterministic checks, create a GitHub PR, surface GitHub-native review, collect structured evidence, and enforce human approval where policy requires it.
