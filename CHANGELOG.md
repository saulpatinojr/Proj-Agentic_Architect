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
- Thin VS Code extension foundation with Team, Runs, Gates, Connections, Packs, and Usage views.
- CI for TypeScript validation, tests, repository-policy validation, APM audit, dependency audit, and lockfile consistency.
- Repository governance documentation, contribution/security/review policies, templates, CODEOWNERS, Dependabot, EditorConfig, and Git attributes.
- Regression coverage for deep recursive gate-profile discovery, owner-only worktree directories, and invalid structured agent-result payloads.

### Changed

- Upgraded Vitest to 5.0.0 and refreshed the committed npm lockfile.
- Standardized ongoing workflow names and removed temporary/bootstrap write-back workflows after their one-time use.
- Pinned maintained GitHub Actions to reviewed immutable commit SHAs.
- Pinned executable Ansible and Azure MCP npm package references instead of resolving floating versions at runtime.
- Reworked deterministic gate glob matching and expanded recursive-pattern regression coverage.
- Removed the former gate-profile directory-depth cutoff so recursive technology detection cannot silently skip deeply nested files.
- Corrected MCP profile detection so GitHub tooling is selected only for repositories with a Git marker.
- Preserved advisory deterministic-gate semantics through final readiness evaluation.
- Reconciled Phase 1 tracking: issue #2 is complete and live workstation/R1/R2 validation is tracked in issue #4.

### Security

- Subscription-first billing policy and detection of API-key environment variables that could bypass intended billing paths.
- Fail-closed structured agent-result parsing and explicit workstation trust before unattended CLI execution.
- Structured `AgentResult` payloads are now validated against the canonical JSON Schema before runtime acceptance.
- Human approval boundary for high-risk/destructive external operations.
- Local run/evidence, workstation-trust, and modifying worktree directories/files use owner-only permissions on POSIX systems where applicable.
- Added high/critical dependency audit as a CI gate; the current dependency graph reports zero known npm vulnerabilities.
- Multiple GitHub Copilot Gatekeeper review rounds were exercised and concrete findings were addressed with targeted regression coverage.
