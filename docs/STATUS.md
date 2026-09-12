# Code Conductor status

**Checkpoint:** 2026-09-12  
**Target:** v0.1 workstation/VS Code release

## Current state

The foundation is already on `main`, and the post-foundation context-optimizer feature has been reviewed against the approved Code Conductor architecture rather than treated as a separate design. The feature is retained and strengthened as a first-party context-preparation capability under ADR 0007: conservative/lossless by default, explicit aggressive mode, workspace/sensitive-path boundaries, provider-neutral output, estimated-token telemetry, and an experimental MCP interoperability adapter pending official SDK/current-protocol validation.

PR #6 is the integration vehicle for this retrofit. At this checkpoint its implementation head has passed Code Conductor CI, APM audit, dependency review, CodeQL, and GitGuardian after review findings were addressed. When this file is present on `main`, that retrofit has therefore been merged into the release baseline.

The remaining release work is live workstation/provider validation, end-to-end R1/R2 dogfooding, VS Code interaction validation, MCP runtime validation, and final v0.1 readiness tracked in issue #4.

## Verified in repository/CI

- TypeScript workspace builds successfully on Node 24.
- Current unit suite passes: **61 tests across 14 test files**.
- `cc validate` passes repository policy/configuration validation.
- `npm ci --ignore-scripts` and `npm audit --audit-level=high` report **0 vulnerabilities**.
- `package-lock.json` is committed and normal dependency CI remains read-only/reproducible.
- APM 0.30.0 remains pinned; `apm.lock.yaml` and generated harness projections are committed and APM audit passes.
- Canonical APM agent/skill sources project to Copilot, Claude, Codex, Kiro, and Agent Skills targets.
- Task planning, structured result contracts, risk/policy checks, deterministic gates, run persistence, bounded retries, and modifying worktree support remain implemented and covered by the existing regression suite.
- Planner assignments project configured authority labels and enforce the configured R2+ different-provider challenger requirement fail-closed when it cannot be satisfied.
- CLI commands cover repository validation, doctor, planning, dry-run/execution, harness smoke tests, MCP selection, APM audit, GitHub gate inspection, context statistics, and bounded file-based context preparation.
- The context optimizer preserves comments/instructions by default, permits aggressive removal only explicitly, compacts valid JSON semantically, and does not inject provider-specific cache-control markup into core output.
- Context file reads are restricted to approved workspace roots after canonical/symlink resolution and reject sensitive/state paths, non-regular files, and oversized inputs.
- Context telemetry is owner-private on POSIX systems and token counts are explicitly estimates rather than provider billing/quota data.
- The context optimizer is cataloged as a Code Conductor first-party **experimental** MCP adapter rather than a vendor-official/GA server, and catalog policy requires explicit first-party approval.
- The repository-specific GitHub Copilot review skill is retained and aligned with Code Conductor's context/MCP boundaries.
- Repository-scoped Copilot CLI MCP configuration is minimal under `.github/mcp.json`; the duplicate `.github/copilot-mcp.json`, transplanted Copilot setup workflow, and unused GitHub App token minter were removed because they duplicated platform-native paths and referenced infrastructure not owned by this repository.
- GitHub Actions used by maintained workflows remain pinned to reviewed immutable commit SHAs; executable Ansible/Azure MCP package references remain pinned rather than floating.
- Local run/evidence directories/files, workstation trust state, modifying-agent worktree directories, and context-optimizer telemetry use owner-only permissions on POSIX systems where applicable.
- Evidence run-directory traversal, Git rename/copy sensitive-path handling, ref sanitization, recursive gate matching, lazy profile scanning, advisory-gate semantics, non-git GitHub MCP selection, fail-closed workstation trust, and schema-validated `AgentResult` parsing remain covered by regression tests.
- CodeQL reports no new alerts in the retrofit after the Markdown comment-removal implementation was changed from a problematic regex to a bounded linear parser.
- Dependency review passes and GitGuardian reports no secrets in the current retrofit PR head.
- GitHub Copilot review findings on empty context payload handling, explicit first-party MCP approval, and profile-name consistency were fixed and their review threads resolved.

## Repository cleanup state

- Phase 1 issue #2 is closed as completed; live workstation and R1/R2 release validation remains consolidated in issue #4.
- Foundation/bootstrap work is already merged; its old bootstrap branch is no longer part of origin state.
- PR #6 is the only Code Conductor retrofit branch created for this review and should be deleted after merge/`main` verification.
- The Dependabot branch for open dependency PR #5 is active work, not stale; it should remain only while that PR is open.
- No temporary Copilot setup/token-minting files introduced by the post-foundation experiment remain in the retrofit result.
- Repository-level branch protection/ruleset enforcement and automatic merged-branch deletion remain tracked in issue #3 because those repository-settings mutations are outside the current connector's administration surface.

## Not yet release-verified

- Official subscription authentication on the actual execution workstation for Claude Max, ChatGPT Business/Codex, Kiro Pro, GitHub Copilot Pro+, and Google AI Pro/Antigravity.
- Read/modify harness smoke validation against the installed current CLI versions.
- Kiro Pro headless subscription-credit behavior on the target workstation.
- Authenticated official MCP behavior for real project profiles before write authority is granted.
- The context optimizer's optional MCP adapter against the official MCP TypeScript SDK/current protocol; direct package/CLI use may proceed under ADR 0007 while the adapter remains experimental.
- A complete real R1/R2 task spanning isolated builder work, independent reviewer/challenger roles, deterministic validation, preserved worktree changes, GitHub PR checks/review, structured evidence, and final readiness.
- VS Code extension installation/activation and interaction testing on the target workstation.
- Google Antigravity unattended execution remains intentionally disabled pending permission/sandbox revalidation.
- Perplexity Pro remains human-in-the-loop unless separately billed official MCP/API automation is explicitly enabled.

## Immediate next milestone

After PR #6 is on `main` and the merged commit is verified:

1. delete the merged retrofit branch and retain only branches associated with active work;
2. run `docs/WORKSTATION-VALIDATION.md` on the VS Code execution workstation;
3. validate official subscription authentication and smoke-test Codex, Claude Code, and Kiro in read mode, then isolated modify mode;
4. validate only the MCP/reference profiles actually required by the repository, with the context-optimizer MCP adapter remaining experimental;
5. exercise context preparation in lossless mode on representative repository inputs and aggressive mode only where comment removal is explicitly acceptable;
6. run the first real R1 dogfood task through Code Conductor in an isolated modifying worktree;
7. raise the same scenario to R2 with an independent different-provider challenger and GitHub Gatekeeper review/re-review;
8. capture structured evidence, resolve defects, and validate the VS Code cockpit against the same run;
9. validate/migrate the context-optimizer MCP adapter against the official MCP TypeScript SDK/current protocol before GA promotion;
10. prepare the v0.1 release candidate when the release definition is satisfied.

## Release definition

The authoritative v0.1 definition of done remains in [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md). This file records progress; it does not weaken those acceptance criteria.
