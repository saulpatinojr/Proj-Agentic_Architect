# Code Conductor status

**Checkpoint:** 2026-09-11  
**Target:** v0.1 workstation/VS Code release

## Current state

The repository has moved beyond architecture-only scaffolding. The foundational runtime, policy, packaging, Git, GitHub, MCP, workstation, and VS Code components exist and are validated in CI. Repository documentation/governance has been standardized, the first GitHub Copilot Gatekeeper review has been acted on, and the dependency audit is clean. The remaining release work is live workstation/provider validation, end-to-end multi-agent dogfooding, and final release readiness.

## Verified in repository/CI

- TypeScript workspace builds successfully on Node 24.
- Current unit suite passes: **22 tests across 9 test files**.
- `cc validate` passes repository policy/configuration validation.
- `package-lock.json` is committed and validated with `npm ci`/lockfile-drift checks.
- Vitest was upgraded to 5.0.0 and the current npm dependency graph reports **0 vulnerabilities**.
- APM 0.30.0 is pinned for compatibility-sensitive CI operations.
- `apm.lock.yaml` and generated harness projections are committed.
- APM audit passes against `apm-policy.yml`.
- Canonical APM agent/skill sources project to Copilot, Claude, Codex, Kiro, and Agent Skills targets.
- Task planning, structured result contracts, risk/policy checks, deterministic gates, run persistence, bounded retries, and modifying worktree support are implemented.
- CLI commands exist for repository validation, doctor, planning, dry-run/execution, harness smoke tests, MCP selection, APM audit, and GitHub gate inspection.
- A thin VS Code extension foundation exists for Team, Runs, Gates, Connections, Packs, and Usage.
- GitHub Actions used by repository workflows are pinned to reviewed immutable commit SHAs.
- Executable Ansible/Azure MCP npm package references are pinned rather than resolved through floating `latest` tags.
- Local run/evidence directories/files are restricted to owner-only permissions on POSIX systems and covered by regression tests.
- Gate glob matching has explicit recursive-glob regression coverage.
- Missing workstation trust continues to fail closed and is now explicitly covered by a runtime regression test.

## Not yet release-verified

- Official subscription authentication on the actual execution workstation for Claude Max, ChatGPT Business/Codex, Kiro Pro, GitHub Copilot Pro+, and Google AI Pro/Antigravity.
- Read/modify harness smoke validation against the installed current CLI versions.
- Kiro Pro headless subscription-credit behavior on the target workstation.
- Authenticated official MCP behavior for real project profiles before write authority is granted.
- A complete real R1/R2 task that spans independent builder/reviewer or challenger roles, deterministic validation, preserved worktree changes, GitHub PR checks, structured evidence, and final readiness.
- GitHub Copilot's first-party review has been exercised on this foundation PR; re-review and the first complete Code Conductor-managed dogfood PR remain part of release validation.
- VS Code extension installation/activation and interaction testing on the target workstation.
- Google Antigravity unattended execution remains intentionally disabled pending permission/sandbox revalidation.
- Perplexity Pro remains human-in-the-loop unless separately billed official MCP/API automation is explicitly enabled.

## Immediate next milestone

After the cleaned foundation is merged to `main`:

1. run `docs/WORKSTATION-VALIDATION.md` on the VS Code execution workstation;
2. smoke-test Codex, Claude Code, and Kiro in read mode, then isolated modify mode;
3. run the first real R1 dogfood task through Code Conductor;
4. raise it to R2 with an independent different-provider challenger and GitHub Gatekeeper review;
5. capture structured evidence and close any defects found;
6. validate the VS Code cockpit against the same run;
7. prepare the v0.1 release candidate.

## Release definition

The authoritative v0.1 definition of done remains in [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md). This file records progress; it does not weaken those acceptance criteria.
