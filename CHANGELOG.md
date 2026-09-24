# Changelog

All notable Code Conductor changes are recorded here. The project follows a pre-1.0 development model; entries remain under **Unreleased** until a release/tag is created.

## Unreleased

### Added

- VS Code-centered Code Conductor architecture and repository constitution.
- Vendor-neutral task, assignment, evidence, finding, gate, review, merge, and run-manifest contracts.
- Policy/risk validation, task planning, bounded execution, structured run persistence, and Git worktree support.
- Initial official-client adapters and workstation trust/smoke-test framework for Codex, Claude Code, Kiro, and Google Antigravity boundaries.
- GitHub Gatekeeper helpers for authentication, PR creation/status, and check inspection.
- APM 0.30.0 manifest, lockfile, policy, canonical agent/skill source, and materialized Copilot/Claude/Codex/Kiro/Agent Skills projections.
- Official MCP catalog/configuration foundation.
- First-party context optimizer package, CLI diagnostics/preparation commands, optional experimental MCP adapter, and VS Code estimated-savings telemetry.
- Thin VS Code extension foundation with Team, Runs, Gates, Connections, Packs, and Usage views.
- CI for TypeScript validation, tests, repository-policy validation, APM audit, dependency audit, lockfile consistency, CodeQL, and dependency review.
- Repository-specific GitHub Copilot code-review skill plus minimal repository-scoped `.github/mcp.json` for compatible Copilot CLI workflows.
- Repository governance documentation, contribution/security/review policies, templates, CODEOWNERS, Dependabot, EditorConfig, and Git attributes.
- Regression coverage for deep recursive gate-profile discovery, owner-only worktree directories, invalid structured agent-result payloads, configured role authority projection, independent-provider challenger enforcement, missing GitHub/APM/Git CLI diagnostics, ref-safe task/agent identifiers, rename-aware sensitive-path handling, evidence-store path traversal prevention, no-scan exact-file gate detection, context workspace boundaries, symlink escapes, sensitive/oversized context files, and first-party MCP provenance policy.

### Changed

- Upgraded Vitest to 5.0.0 and refreshed the committed npm lockfile.
- Standardized ongoing workflow names and removed temporary/bootstrap write-back workflows after their one-time use.
- Pinned maintained GitHub Actions to reviewed immutable commit SHAs.
- Pinned executable Ansible and Azure MCP npm package references instead of resolving floating versions at runtime.
- Reworked deterministic gate glob matching and expanded recursive-pattern regression coverage.
- Removed the former gate-profile directory-depth cutoff so recursive technology detection cannot silently skip deeply nested files.
- Gate-profile discovery now scans repository files lazily only when a configured profile requires `any_glob` matching.
- Corrected MCP profile detection so GitHub tooling is selected only for repositories with a Git marker.
- Preserved advisory deterministic-gate semantics through final readiness evaluation.
- Planner assignments now carry all configured role authorities, including execute-validation, disagreement-resolution, merge-recommendation, approval, and merge capabilities while retaining separation-of-duties policy.
- Planner availability and billing behavior are derived from harness automation configuration rather than hard-coded harness IDs.
- Challenger different-provider independence is enforced from the configured role threshold and fails closed when it cannot be satisfied.
- GitHub and APM subprocess diagnostics include spawn errors when their official CLIs are missing or cannot execute; Git helper startup failures are likewise explicit.
- Git worktree branch components are sanitized against invalid ref forms including repeated dots, leading/trailing dots, and `.lock` suffixes.
- Git status parsing uses NUL-delimited porcelain output and returns the destination/current path for rename and copy entries.
- Evidence run-directory names no longer admit path traversal semantics; unsafe external IDs are normalized and digest-suffixed.
- Context optimization now defaults to lossless/conservative preparation; comment/whitespace removal requires explicit aggressive mode, JSON compaction remains semantically safe, provider-specific cache-control markup was removed, and local token metrics are explicitly estimates.
- Context-optimizer MCP catalog metadata now distinguishes Code Conductor first-party experimental adapters from vendor-official servers.
- Replaced the unsupported duplicate `.github/copilot-mcp.json` approach with minimal `.github/mcp.json`; removed the transplanted Copilot setup/token-minter workflow that referenced infrastructure and secrets not owned by this repository.
- Reconciled Phase 1 tracking: issue #2 is complete and live workstation/R1/R2 validation is tracked in issue #4.
- Renamed the canonical repository to `saulpatinojr/Proj-Code_Conductor` and the APM package to `proj-code-conductor`; in-tree clone, issue-template, VS Code packaging, and repository-layout references now use the new name. See ADR 0010 and D-001.

### Security

- Subscription-first billing policy and detection of API-key environment variables that could bypass intended billing paths.
- Fail-closed structured agent-result parsing and explicit workstation trust before unattended CLI execution.
- Structured `AgentResult` payloads are validated against the canonical JSON Schema before runtime acceptance.
- Human approval boundary for high-risk/destructive external operations.
- Local run/evidence, workstation-trust, modifying worktree, and context-optimizer telemetry directories/files use owner-only permissions on POSIX systems where applicable.
- Context file reads are bounded to configured workspace roots after canonical/symlink resolution and reject sensitive/state paths, non-regular files, and oversized inputs.
- Evidence-store path traversal and rename-based sensitive-file detection are covered by regression tests.
- Added high/critical dependency audit as a CI gate; the current dependency graph reports zero known npm vulnerabilities.
- Multiple GitHub Copilot Gatekeeper review rounds were exercised and concrete findings were addressed with targeted regression coverage.
- Agent commits now refuse to run anywhere but a linked worktree: `commitAgentChanges` rejects a repository's primary working tree, which holds a person's uncommitted work. Previously the runtime test suite pointed its worktree double at the repository root, so running `npm test` with uncommitted changes committed them onto the current branch under the Code Conductor identity, bounded only by the sensitive-path denylist. Fixes #48.
