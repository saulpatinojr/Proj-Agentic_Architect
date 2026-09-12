# Code Conductor Architecture Baseline

## Purpose

Code Conductor is a VS Code-centered, multi-provider software-engineering team runtime. It coordinates specialized agents, official vendor harnesses, APM-managed Agent Packs, official MCP tools/reference sources, safe context preparation, Git worktrees, deterministic validation, and GitHub PR governance.

## System boundaries

### Human cockpit

VS Code remains the operator surface. Code Conductor adds orchestration/status views and deep-links into native chat/session, terminal, diff, Source Control, and PR experiences.

### Runtime orchestration plane

Code Conductor Core owns:

- task intake and normalization
- risk classification
- role/stance assignment
- capability-aware routing
- dependency/task DAG
- bounded retries and escalation
- worktree ownership
- context selection/preparation policy
- evidence aggregation
- disagreement arbitration
- readiness/merge recommendation

### Harness plane

Initial first-class harnesses:

- GitHub Copilot / GitHub platform
- Claude Code
- OpenAI Codex
- Kiro CLI
- Google Antigravity
- Perplexity research client/manual lane and optional official MCP/API lane

Harness adapters must be replaceable. Runtime state and policy must not depend on vendor-private internals.

### Package plane

Microsoft APM is responsible for reusable agent context packaging and dependency integrity:

- Agent Packs
- skills
- instructions
- hooks
- supported MCP declarations
- manifests/locks
- target materialization
- drift/integrity audit

Code Conductor consumes APM; it does not replace APM.

### Context-preparation plane

The first-party context optimizer prepares already-selected context before it is handed to a harness. It does **not** select agents, decide what evidence is authoritative, or bypass repository/harness policy.

Its boundaries are:

- conservative/lossless mode by default;
- explicit aggressive mode only when comment/whitespace removal is acceptable;
- workspace-root and sensitive-file enforcement before local file reads;
- provider-neutral core output;
- approximate token-reduction telemetry, never vendor billing/quota truth;
- private local telemetry and time-bounded in-memory original-content cache;
- direct package/CLI use is the primary v0.1 integration path;
- MCP is an optional experimental interoperability adapter until official SDK/current-protocol validation is complete.

This component can later become a runtime preflight step for context budgets without changing the orchestration ownership model.

### Tool/reference plane

MCP and deterministic CLIs expose tools/resources. They do not choose agents or own orchestration.

Initial official catalog focus:

- GitHub
- Microsoft Learn / Azure
- HashiCorp Terraform
- Ansible
- AWS
- Google Cloud
- Perplexity only when automated API-backed research is explicitly enabled

Code Conductor may also expose approved **first-party** MCP adapters. They are explicitly distinguished from vendor-official servers and remain profile-driven/minimal.

### Change-control plane

Git owns code state. GitHub owns pull requests, CI, review, merge status, and repository audit history.

## Team model

An agent assignment is a composition of independent dimensions:

```text
provider
+ model/capability tier
+ harness/client
+ subscription/billing channel
+ role
+ stance
+ specialization
+ skills
+ tools
+ authority
+ risk clearance
```

The same underlying model may serve multiple roles. A role is not permanently bound to a provider unless a platform has a unique first-party advantage.

## Primary role map

- **Conductor**: neutral coordinator and scheduler.
- **Kiro Spec Lead**: requirements, design, task planning, verification planning.
- **Perplexity Research Captain**: external research discovery/synthesis.
- **Claude Builder**: implementation/refactoring/codebase reasoning.
- **Codex Builder**: implementation/debugging/testing/repository work.
- **Google Specialist**: Google/GCP specialization and independent alternate worker/reviewer.
- **GitHub Gatekeeper**: GitHub-native PR review/re-review, Actions/PR checks, repository context.
- **Challenger**: independent critical adversary that attempts to falsify assumptions.
- **Security Reviewer**: critical read/block role.
- **Validator**: neutral deterministic validation role.
- **Arbiter**: neutral dispute resolver.
- **Finalizer**: objective-level readiness evaluator.
- **Human Owner**: final authority for consequential operations.

## Stance model

- `constructive`: build, improve, optimize, solve.
- `critical`: find defects, challenge assumptions, identify risk.
- `neutral`: research, compare, validate, arbitrate.

A critical stance never means inventing disagreement. Findings require evidence.

## Risk-driven orchestration

```text
R0 -> builder + deterministic check
R1 -> builder + validator/reviewer + deterministic tests
R2 -> builder + different-provider challenger + validator + GitHub gatekeeper
R3 -> research/spec + builder + challenger + security + validator + GitHub gatekeeper + finalizer + human approval
R4 -> R3 + explicit human approval before destructive/external side effects
```

## Execution topology

```text
VS Code
  |
  +-- Code Conductor Extension
  |      +-- Team
  |      +-- Runs
  |      +-- Gates
  |      +-- Connections
  |      +-- Packs
  |      +-- Usage
  |
  +-- Code Conductor Core / CLI
         |
         +-- Policy + Risk + DAG + Evidence
         +-- Context Preparation
         |      +-- lossless default
         |      +-- explicit aggressive mode
         |      +-- workspace/sensitive-path boundary
         |
         +-- Harness Adapters
         |      +-- Copilot/GitHub
         |      +-- Claude Code
         |      +-- Codex
         |      +-- Kiro
         |      +-- Antigravity
         |      +-- Perplexity
         |
         +-- APM Adapter
         +-- MCP Catalog/Broker
         +-- Git Worktree Manager
         +-- GitHub Gatekeeper Adapter
```

## Work isolation

Each modifying assignment receives a task-scoped branch/worktree where practical. Review-only roles remain read-only. Worktree isolation prevents accidental file collisions but is not itself a security sandbox.

Recommended naming:

```text
branch: cc/<task-id>/<agent-id>
worktree: ~/.code-conductor/worktrees/<repo-id>/<task-id>/<agent-id>/
```

## Structured contracts

All orchestration crosses stable structured contracts:

- `TaskEnvelope`
- `AgentAssignment`
- `AgentResult`
- `Evidence`
- `Finding`
- `GateResult`
- `ReviewResult`
- `MergeDecision`
- `RunManifest`

Free-form agent prose may be attached as evidence, but runtime decisions must be representable in structured fields.

## Evidence precedence

1. user-approved requirements and repository policy
2. executable repository evidence: tests, build output, CI, plan/diff
3. official vendor documentation/reference sources
4. structured run evidence/findings
5. model recommendation/confidence

No model wins merely because it is more capable or expensive. Context optimization must preserve this ordering; it may reduce transport size but may not discard higher-precedence meaning.

## Authentication boundary

Code Conductor never becomes the credential vault for consumer subscriptions. Vendor clients authenticate through their supported official mechanisms. Conductor may report health/presence and warn about billing-mode conflicts without printing or persisting secret values.

## Deployment baseline

v0.1 is local/workstation-first:

- VS Code on the operator workstation
- WSL2/dev container recommended where stronger Linux sandbox/tool compatibility is useful
- local Code Conductor core/CLI
- local SQLite/runtime state
- Git worktrees on local disk
- outbound HTTPS/OAuth to GitHub and vendor/cloud services

No always-on cloud control plane is required for v0.1.

## Non-goals for v0.1

- replacing vendor chat UIs
- hosting a proprietary model gateway
- scraping consumer AI web sessions
- building a custom APM replacement
- building a custom MCP standard
- autonomous production deployment without policy/human gates
- hard-coding current model version names into core orchestration logic
- treating heuristic token estimates as billing/quota truth
- stripping instructions/comments by default for the sake of a compression percentage
