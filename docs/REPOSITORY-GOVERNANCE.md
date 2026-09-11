# GitHub repository governance

This document defines the desired GitHub repository settings for Code Conductor. Repository settings are enforcement configuration; committed workflows and `AGENTS.md` remain the auditable policy source.

## `main` baseline

`main` is the only long-lived integration branch. Normal development uses short-lived `feature/`, `fix/`, `docs/`, or `chore/` branches and deletes them after merge.

Desired protection/ruleset behavior:

- require changes to enter `main` through a pull request;
- block force pushes and branch deletion for `main`;
- require unresolved review conversations to be resolved;
- require the current Code Conductor CI check;
- require the APM audit check when it is emitted for the changed paths;
- require npm lockfile validation when it is emitted for dependency/package metadata changes;
- keep human approval for R3/R4 or destructive/external operations even when automated review is green;
- do not count an implementing agent's self-review as independent approval;
- allow an emergency administrator bypass only when documented after the fact with evidence and remediation.

## Pull-request lifecycle

1. Branch from current `main`.
2. Open a PR early when collaboration/review benefits from it; draft status is acceptable during active implementation.
3. Run deterministic checks and APM integrity validation as applicable.
4. Move to ready-for-review when the intended change set is complete.
5. Use GitHub Copilot as the GitHub-native Gatekeeper and independent reviewers according to risk.
6. Address blocking findings and rerun/re-request review when material changes invalidate prior evidence.
7. Prefer squash merge for large/bootstrap or noisy implementation histories unless preserving individual commits has material value.
8. Delete the merged short-lived branch.

## Repository settings to enable

When supported by the repository/plan and admin tooling:

- automatically delete head branches after merge;
- allow maintainers to update PR branches when needed;
- optionally enable auto-merge only after required checks/reviews are correctly enforced;
- enable private vulnerability reporting;
- keep GitHub Actions default token permissions read-only and grant write permissions only to individual workflows that require them;
- disable unused repository surfaces such as wiki/projects only if the team is not using them.

## Current automation boundary

Repository rulesets/branch protection and repository-level settings require GitHub administration capabilities. Code Conductor must not simulate those controls in prompts. If automation cannot configure them through an authorized GitHub administration channel, track the setting as an explicit repository-governance task rather than claiming it is enforced.

## Required checks versus conditional checks

Avoid configuring a path-filtered workflow as an unconditional required check if GitHub would leave the check absent/pending when its path filters do not match. Either make the workflow always emit a status or configure rulesets so required checks match the workflow's triggering behavior.

## Branch cleanup

After every merged PR, verify that only `main` and intentionally active branches remain. Closed-unmerged branches should be deleted once their work is either superseded or intentionally abandoned.
