# Code Conductor status

**Checkpoint:** 2026-09-11  
**Target:** v0.1 workstation/VS Code release

## Current state

The repository has moved beyond architecture-only scaffolding. The foundational runtime, policy, packaging, Git, GitHub, MCP, workstation, and VS Code components exist and are validated in CI. The remaining release work is live workstation/provider validation, end-to-end multi-agent dogfooding, security/dependency hardening, and final release readiness.

## Verified in repository/CI

- TypeScript workspace builds successfully on Node 24.
- Current unit suite passes: 19 tests across 8 test files at this checkpoint.
- `cc validate` passes repository policy/configuration validation.
- `package-lock.json` is committed and validated with `npm ci`/lockfile-drift checks.
- APM 0.30.0 is pinned for compatibility-sensitive CI operations.
- `apm.lock.yaml` and generated harness projections are committed.
- APM audit passes against `apm-policy.yml`.
- Canonical APM agent/skill sources project to Copilot, Claude, Codex, Kiro, and Agent Skills targets.
- Task planning, structured result contracts, risk/policy checks, deterministic gates, run persistence, bounded retries, and modifying worktree support are implemented.
- CLI commands exist for repository validation, doctor, planning, dry-run/execution, harness smoke tests, MCP selection, APM audit, and GitHub gate inspection.
- A thin VS Code extension foundation exists for Team, Runs, Gates, Connections, Packs, and Usage.

## Not yet release-verified

- Official subscription authentication on the actual execution workstation for Claude Max, ChatGPT Business/Codex, Kiro Pro, GitHub Copilot Pro+, and Google AI Pro/Antigravity.
- Read/modify harness smoke validation against the installed current CLI versions.
- Kiro Pro headless subscription-credit behavior on the target workstation.
- Authenticated official MCP behavior for real project profiles before write authority is granted.
- A complete real R1/R2 task that spans independent builder/reviewer or challenger roles, deterministic validation, preserved worktree changes, GitHub PR checks, structured evidence, and final readiness.
- GitHub Copilot's actual first-party PR review/re-review participation in a Code Conductor-managed dogfood PR.
- VS Code extension installation/activation and interaction testing on the target workstation.
- Google Antigravity unattended execution remains intentionally disabled pending permission/sandbox revalidation.
- Perplexity Pro remains human-in-the-loop unless separately billed official MCP/API automation is explicitly enabled.

## Known cleanup/security item

The latest CI dependency install reports two **moderate** npm audit findings in the current development dependency graph. They do not presently fail the high-severity release gate, but they must be triaged before a v0.1 release candidate is declared complete.

## Immediate next milestone

After repository cleanup is merged to `main`:

1. run `docs/WORKSTATION-VALIDATION.md` on the VS Code execution workstation;
2. smoke-test Codex, Claude Code, and Kiro in read mode, then isolated modify mode;
3. run the first real R1 dogfood task through Code Conductor;
4. raise it to R2 with an independent different-provider challenger and GitHub Gatekeeper review;
5. capture structured evidence and close any defects found;
6. validate the VS Code cockpit against the same run;
7. triage dependency findings and prepare the v0.1 release candidate.

## Release definition

The authoritative v0.1 definition of done remains in [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md). This file records progress; it does not weaken those acceptance criteria.
