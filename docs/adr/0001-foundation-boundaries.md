# ADR-0001: Foundation Boundaries for Code Conductor

- Status: Accepted
- Date: 2026-09-11

## Context

Code Conductor coordinates multiple AI providers and specialized agent roles in a VS Code-centered software engineering workflow. The system must preserve unique vendor/platform advantages while avoiding duplicate implementations of package management, tool standards, version locking, Git/PR governance, and authentication.

## Decision

We will use the following boundaries:

- **VS Code**: primary human cockpit.
- **Code Conductor Core**: vendor-neutral runtime orchestration, policy, risk, role/stance assignment, task DAG, evidence, arbitration, and readiness decisions.
- **Official vendor clients/CLIs**: execution harnesses where supported.
- **Microsoft APM**: Agent Pack/skill/instruction/hook/MCP package dependency, target projection, lock, integrity, and drift layer.
- **MCP**: tool and reference plane, not runtime scheduler.
- **Git**: authoritative code/change history.
- **GitHub**: authoritative repository/PR/Actions/review/merge plane.
- **Git worktrees**: modifying-agent workspace isolation.
- **Deterministic tests/hooks/CI**: release-quality enforcement.
- **Official vendor credential stores/IAM**: authentication authority.
- **Human operator**: final approval for high-risk/destructive production actions.

Vendor-specific runtime integrations and APM/AHP integrations must remain behind replaceable adapters.

## Provider-specific first-release roles

- Kiro Pro: specification/requirements/design/task-planning lead; supported headless worker when locally validated.
- Perplexity Pro: research captain in manual subscription mode; optional paid official MCP/API mode only when explicitly enabled.
- GitHub Copilot Pro+: GitHub-native Gatekeeper for PR review/re-review and GitHub workflow context.
- Claude Code/Max: primary implementation/refactoring/codebase reasoning lane.
- Codex/ChatGPT Business: primary implementation/debugging/testing/repository work lane.
- Google Antigravity/AI Pro: native Google/GCP specialist and alternate independent implementation/review lane.

These roles are defaults based on platform advantage, not permanent vendor monopolies. The router may assign other qualified roles while preserving independence/separation-of-duties requirements.

## Consequences

### Positive

- avoids rebuilding standards/platforms that already exist
- preserves vendor-specific strengths
- allows subscription-first operation
- keeps core runtime portable as vendor capabilities evolve
- makes agent instructions/package state reproducible through source control
- preserves auditable GitHub change control

### Tradeoffs

- adapters are required for heterogeneous harnesses
- some subscription clients may not expose equivalent unattended/headless behavior
- APM/AHP and vendor clients evolve, so compatibility tests are mandatory
- Perplexity Pro cannot be treated as zero-cost unattended API research unless official subscription-backed automation becomes available

## Guardrails

- no unofficial consumer UI scraping/session hijacking
- no consumer OAuth token storage in Code Conductor
- no implementer self-approval/self-merge
- no bypass of deterministic required gates
- no production/destructive side effect without required human approval
- no hard-coded vendor model version dependency in core policy where capability discovery can be used instead

## Superseding this ADR

A change to these boundaries requires a new ADR with current official/runtime evidence, migration consequences, and corresponding updates to `docs/DECISIONS.md`, configuration, implementation docs, and tests.
