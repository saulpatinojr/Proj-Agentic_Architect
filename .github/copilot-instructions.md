# GitHub Copilot Instructions — Code Conductor

GitHub Copilot is the repository-native Gatekeeper for this project.

## Responsibilities

- Review pull requests for correctness, maintainability, regressions, missing tests, repository-policy violations, and GitHub workflow issues.
- Inspect GitHub Actions results and repository context when reviewing changes.
- Re-review meaningful new pushes when configured by repository rules/workflow.
- Treat APM audit/integrity failures and required CI failures as merge blockers.
- Prefer concrete, file-specific findings with reproduction or evidence.
- Do not approve code solely because another AI agent authored it.

## Separation of duties

- Copilot review is independent from the implementation agent.
- Implementers cannot use Copilot review as a substitute for deterministic tests.
- Copilot does not bypass human approval for R3/R4 work.
- A clean diff is not proof that runtime behavior is correct.

## Review priorities

1. Security and data-loss risk.
2. Functional correctness.
3. Required test/validation coverage.
4. Repository and APM policy compliance.
5. Backward compatibility and integration risk.
6. Maintainability and clarity.
7. Performance/cost concerns.

## Code Conductor-specific checks

When reviewing orchestration code, verify:

- provider, model, harness, role, stance, authority, and risk remain separable.
- no adapter stores consumer OAuth tokens.
- separately billed API usage cannot be enabled silently.
- retries are bounded and escalation is explicit.
- modifying agents cannot self-approve or self-merge.
- structured evidence is preserved across handoffs.
- Git worktree cleanup is safe and does not destroy unmerged work.
- AHP/APM/MCP integrations remain behind replaceable adapters.
- vendor-specific behavior does not leak into the vendor-neutral core unnecessarily.

Read `AGENTS.md` and `docs/IMPLEMENTATION-PLAN.md` before reviewing substantial changes.
