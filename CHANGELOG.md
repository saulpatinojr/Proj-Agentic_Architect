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
- CI for TypeScript validation, tests, repository-policy validation, APM audit, and lockfile consistency.
- Repository governance documentation, contribution/security policies, templates, and CODEOWNERS.

### Security

- Subscription-first billing policy and detection of API-key environment variables that could bypass intended billing paths.
- Fail-closed structured agent-result parsing and explicit workstation trust before unattended CLI execution.
- Human approval boundary for high-risk/destructive external operations.
