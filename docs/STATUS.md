# Code Conductor status

**Checkpoint:** 2026-09-11  
**Target:** v0.1 workstation/VS Code release

## Current state

The repository has moved beyond architecture-only scaffolding. The foundational runtime, policy, packaging, Git, GitHub, MCP, workstation, and VS Code components exist and are validated in CI. Repository documentation/governance has been standardized, multiple GitHub Copilot Gatekeeper review rounds have been acted on, and the dependency audit is clean. The remaining release work is live workstation/provider validation, end-to-end multi-agent dogfooding, and final release readiness tracked in issue #4.

## Verified in repository/CI

- TypeScript workspace builds successfully on Node 24.
- Current unit suite passes: **38 tests across 13 test files**.
- `cc validate` passes repository policy/configuration validation.
- `package-lock.json` is committed and validated with `npm ci`/lockfile-drift checks.
- Vitest 5.0.0 is installed and the current npm dependency graph reports **0 vulnerabilities**.
- APM 0.30.0 is pinned for compatibility-sensitive CI operations.
- `apm.lock.yaml` and generated harness projections are committed.
- APM audit passes against `apm-policy.yml`.
- Canonical APM agent/skill sources project to Copilot, Claude, Codex, Kiro, and Agent Skills targets.
- Task planning, structured result contracts, risk/policy checks, deterministic gates, run persistence, bounded retries, and modifying worktree support are implemented.
- Planner assignments project configured role capabilities into authority labels, including validation, disagreement resolution, merge recommendation, approval, and merge authority; the finalizer is explicitly tested to recommend merge without receiving approval or merge authority.
- Planner availability is derived from the harness automation class instead of hard-coded harness IDs, so platform/manual/local lanes remain eligible without pretending to be installed headless CLIs.
- CLI commands exist for repository validation, doctor, planning, dry-run/execution, harness smoke tests, MCP selection, APM audit, and GitHub gate inspection.
- GitHub and APM helpers preserve CLI spawn errors so missing or non-runnable clients are diagnosable rather than reported with empty stderr.
- Git subprocess startup failures are explicit even on helper paths that otherwise tolerate nonzero Git command exits.
- Git task/agent identifiers are sanitized into bounded ref-safe branch components, including protection against `..`, leading/trailing dots, and `.lock` suffixes.
- A thin VS Code extension foundation exists for Team, Runs, Gates, Connections, Packs, and Usage.
- GitHub Actions used by repository workflows are pinned to reviewed immutable commit SHAs.
- Executable Ansible/Azure MCP npm package references are pinned rather than resolved through floating `latest` tags.
- Local run/evidence directories/files, workstation trust state, and modifying-agent worktree directories use owner-only permissions on POSIX systems and are covered by regression tests.
- Gate glob matching has explicit recursive-glob coverage, including detection below the former directory-depth cutoff.
- Gate-profile discovery scans the repository tree lazily only when a profile actually declares `any_glob` detection.
- Advisory deterministic gates retain their non-blocking semantics during final readiness evaluation.
- GitHub MCP selection is no longer enabled for non-git directories solely by default profile seeding.
- Missing workstation trust continues to fail closed and is explicitly covered by a runtime regression test.
- Structured `AgentResult` payloads are validated against the canonical schema before acceptance; invalid status/recommendation/nested collection values fail closed.
- GitGuardian reported no secrets in the foundation PR at the latest cleanup checkpoint.

## Repository cleanup state

- Phase 1 issue #2 is closed as completed; live workstation and R1/R2 validation moved to issue #4.
- Foundation work is consolidated in PR #1 rather than split across duplicate PRs.
- Only `main` and the active foundation branch exist remotely at this checkpoint.
- Repository-level branch protection/ruleset enforcement and automatic merged-branch deletion remain tracked in issue #3 because the current connector does not expose those administration mutations.
- The active foundation branch should be deleted after PR #1 is merged and the resulting `main` commit is verified. If GitHub does not auto-delete it, it must at minimum be fast-forwarded to the verified `main` commit so no stale/unmerged origin work remains.

## Not yet release-verified

- Official subscription authentication on the actual execution workstation for Claude Max, ChatGPT Business/Codex, Kiro Pro, GitHub Copilot Pro+, and Google AI Pro/Antigravity.
- Read/modify harness smoke validation against the installed current CLI versions.
- Kiro Pro headless subscription-credit behavior on the target workstation.
- Authenticated official MCP behavior for real project profiles before write authority is granted.
- A complete real R1/R2 task that spans independent builder/reviewer or challenger roles, deterministic validation, preserved worktree changes, GitHub PR checks, structured evidence, and final readiness.
- GitHub Copilot's first-party review has been exercised repeatedly on the foundation PR; the first complete Code Conductor-managed dogfood PR remains part of release validation.
- VS Code extension installation/activation and interaction testing on the target workstation.
- Google Antigravity unattended execution remains intentionally disabled pending permission/sandbox revalidation.
- Perplexity Pro remains human-in-the-loop unless separately billed official MCP/API automation is explicitly enabled.

## Immediate next milestone

Once the cleaned foundation is on `main`:

1. verify the resulting `main` checks and remove or fully align the merged bootstrap branch;
2. run `docs/WORKSTATION-VALIDATION.md` on the VS Code execution workstation;
3. smoke-test Codex, Claude Code, and Kiro in read mode, then isolated modify mode;
4. run the first real R1 dogfood task through Code Conductor;
5. raise it to R2 with an independent different-provider challenger and GitHub Gatekeeper review;
6. capture structured evidence and close any defects found;
7. validate the VS Code cockpit against the same run;
8. prepare the v0.1 release candidate.

## Release definition

The authoritative v0.1 definition of done remains in [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md). This file records progress; it does not weaken those acceptance criteria.
