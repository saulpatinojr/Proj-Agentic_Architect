# Code Conductor status

**Checkpoint:** 2026-09-12  
**Target:** v0.1 workstation/VS Code release

## Current state

The foundation is already on `main`, and the post-foundation context-optimizer feature has been reviewed against the approved Code Conductor architecture rather than treated as a separate design. The feature is retained and strengthened as a first-party context-preparation capability under ADR 0007: conservative/lossless by default, explicit aggressive mode, workspace/sensitive-path boundaries, provider-neutral output, estimated-token telemetry, and an experimental MCP interoperability adapter pending official SDK/current-protocol validation.

PR #6 is the integration vehicle for this retrofit. At this checkpoint its implementation head has passed Code Conductor CI, APM audit, dependency review, CodeQL, and GitGuardian after review findings were addressed. When this file is present on `main`, that retrofit has therefore been merged into the release baseline.

The product roadmap has now been externalized from chat into GitHub. Issue #7 is the roadmap umbrella, issues #8-#18 capture the approved productization/harness/agent-catalog/release/tooling workstreams, and issue #4 remains the v0.1 workstation/R1/R2 release-readiness execution issue.

Two architecture deltas are approved before full v0.1 dogfood:

- ADR 0008: no standalone desktop app for v0.x; thin VS Code extension + optional thin `cc` CLI/TUI over the same core; explicit first-run bootstrap and lazy warm-start behavior.
- ADR 0009: surface-aware harnesses, provider-native capability preservation, Code-Conductor-mediated cross-provider invocation, Kiro ACP-first preference, explicit provider specializations, and deterministic engineering tools separated from peer GenAI agents.

Because these decisions change the integration shape, the next release work should implement/validate issues #10, #11, and #12 before spending substantial workstation effort proving the older generic-provider path.

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

## Roadmap and scope state

- #7 is the durable roadmap umbrella; future substantive approved ideas should be captured in GitHub before implementation or deferral.
- #8 thin VS Code + optional `cc` client/no standalone app: **P0 / v0.1 architecture, packaging completion before customer release**.
- #9 first-run/warm-start/lazy activation: **P1 / v0.1**, with enough implemented to validate normal startup before RC.
- #10 surface-aware harness adapters/provider-native capabilities: **P0 / v0.1 prerequisite**.
- #11 Kiro ACP-first + AWS/spec specialization: **P0 / v0.1 prerequisite**, fail-closed until current policy/workstation authority is validated.
- #12 explicit provider role/capability routing matrix: **P0 / v0.1 prerequisite**.
- #13 full legacy Agent Catalog/APM migration: **P1 parallel**, not a hidden blocker for v0.1 unless a required release persona/skill depends on it.
- #14 Marketplace/VSIX/CLI/provenance/customer trust: **P1 v0.1 RC/publication**, implementation may run in parallel.
- #15 deterministic engineering-tool model: **P1**, implement representative Terraform/Ansible/PowerShell profiles as they become release/dogfood requirements.
- #16 APM Agent Plugin ↔ Kiro Powers interoperability: **P2 research/parallel**, feed results into #13 and #11.
- #17 Perplexity manual Pro vs paid automation boundary: **P1 policy already locked; automation remains optional/later**.
- #18 Antigravity current `agy` safety revalidation: **P1 validation**, do not make unattended use a v0.1 blocker unless selected for the release dogfood path.
- #3 repository governance enforcement remains an administrative prerequisite for a trustworthy public release where the current connector cannot apply settings itself.
- #4 remains the release-readiness execution gate after the P0 harness/routing delta is implemented.

## Repository cleanup state

- Phase 1 issue #2 is closed as completed; live workstation and R1/R2 release validation remains consolidated in issue #4.
- Foundation/bootstrap work is already merged; its old bootstrap branch is no longer part of origin state.
- PR #6 is the only Code Conductor retrofit branch created for the context-optimizer review and should be deleted after merge/`main` verification.
- The Dependabot branch for open dependency PR #5 is active work, not stale; it should remain only while that PR is open.
- No temporary Copilot setup/token-minting files introduced by the post-foundation experiment remain in the retrofit result.
- Repository-level branch protection/ruleset enforcement and automatic merged-branch deletion remain tracked in issue #3 because those repository-settings mutations are outside the current connector's administration surface.

## Not yet release-verified

- Production packaging that lets a normal repository use Code Conductor without this source tree or a local `npm run build`.
- Fast first-run/warm-start behavior and lazy activation of AI providers/ACP/MCP/APM.
- Versioned surface-aware capability discovery for IDE extension, CLI/headless, ACP, MCP, platform-native, API, and manual surfaces.
- Kiro ACP client integration, current subscription-policy boundary, and read/modify authority on the target workstation.
- Provider-specialization routing tests for Kiro/AWS/specification, Claude/refactor, Codex/debug/test, GitHub Gatekeeper, Perplexity research, and Antigravity/GCP.
- Official subscription authentication on the actual execution workstation for Claude, Codex/ChatGPT, Kiro Pro, GitHub Copilot, and Google Antigravity.
- Read/modify harness smoke validation against the installed current versions and approved surfaces.
- Authenticated official MCP behavior for real project profiles before write authority is granted.
- The context optimizer's optional MCP adapter against the official MCP TypeScript SDK/current protocol; direct package/CLI use may proceed under ADR 0007 while the adapter remains experimental.
- A complete real R1/R2 task spanning isolated builder work, independent reviewer/challenger roles, deterministic validation, preserved worktree changes, GitHub PR checks/review, structured evidence, and final readiness.
- VS Code extension installation/activation and interaction testing on the target workstation.
- Google Antigravity unattended execution remains intentionally disabled pending permission/sandbox revalidation.
- Perplexity Pro remains human-in-the-loop unless separately billed official MCP/API automation is explicitly enabled.
- Full legacy agent/skill corpus inventory and APM migration; issue #13 requires 100% source-lineage coverage before legacy retirement.

## Immediate next milestone

1. Merge the architecture/roadmap decision update after review so ADR 0008/0009 and D-048+ become the durable baseline.
2. Implement #10: versioned surface-aware adapter capability schema and map all current provider surfaces without breaking the existing core contracts.
3. Implement/spike #11: Code Conductor ACP client path for `kiro-cli acp`, preserve Kiro-native capabilities, and keep unattended execution fail-closed until policy/workstation validation succeeds.
4. Implement #12: encode the approved provider specialization matrix and add representative routing tests.
5. Update `docs/WORKSTATION-VALIDATION.md`, `cc doctor`, Connections/Team UX, and harness-smoke behavior for native extensions + CLI/ACP/provider capabilities.
6. Then resume #4 on the actual VS Code execution workstation: auth, read/modify smoke, minimum MCP/tool profiles, R1 dogfood, then R2 different-provider challenger + GitHub Gatekeeper.
7. In parallel, begin #13 with immutable intake/inventory of the legacy agent corpus and #14 with release packaging/provenance design; neither should silently block the active runtime work.
8. Validate/revalidate #16/#18 when they can materially change the active release path.
9. Capture all new material findings as issue updates/ADRs/config/tests rather than leaving them only in chat.
10. Prepare the v0.1 release candidate when the authoritative definition of done is satisfied.

## Release definition

The authoritative v0.1 definition of done remains in [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md). This file records progress and approved sequencing; it does not weaken those acceptance criteria.
