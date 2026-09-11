# ADR 0005: Preserve modifying worktrees and commit agent changes before integration

- Status: Accepted
- Date: 2026-09-11

## Context

The first execution-engine implementation removed worktrees with `git worktree remove --force` at the end of a run unless explicitly kept. That behavior could discard an implementing agent's uncommitted work before review or PR publication and was therefore incompatible with Git being the code-state authority.

## Decision

- Modifying worktrees are preserved by default.
- Code Conductor records the worktree path, branch, and base SHA in execution output.
- When a modifying agent reports completion, Code Conductor inspects the actual Git state and commits remaining safe changes to the task/agent branch using a task-scoped commit message.
- Existing agent-created commits are preserved and recorded rather than rewritten.
- Common secret/credential/Terraform-state paths are blocked from automatic commit.
- Worktree removal is non-force by default and refuses dirty worktrees.
- Cleanup is an explicit caller action; it is never the default for real execution.
- Worktree branches remain available for review/integration even when a clean worktree is later removed.

## Consequences

Agent work cannot silently disappear at run completion, actual Git changes override unverified prose about changed files, and integration/PR publication can be implemented as a distinct audited stage.
