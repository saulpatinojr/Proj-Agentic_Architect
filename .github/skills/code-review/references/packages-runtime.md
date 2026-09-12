# Runtime & Packages Review Reference

When reviewing changes to `packages/**` or `apps/vscode/**`:

## State Machine & Execution
- Verify that status transitions in `packages/core` follow valid state lifecycle rules (`pending`, `running`, `blocked`, `completed`, `failed`).
- Ensure structured results parsed in `packages/runtime/src/result.ts` validate strictly against `AgentResult` schemas and fail closed.
- Ensure bounded retry logic terminates predictably and captures failure evidence.

## Worktree & Git Operations
- Verify worktree operations in `packages/git` create directories with `0700` permissions on POSIX systems.
- Ensure branch ref segments are sanitized against path traversal (`..`), leading/trailing dots, and `.lock` suffixes.
- Ensure Git status parsing handles renames/copies safely without dropping destination paths.

## Evidence Store & Security
- Ensure `packages/evidence` rejects path-traversal external run IDs.
- Verify that evidence and run directories are stored with owner-only access.
- Ensure no sensitive environment credentials or secret tokens are persisted to disk.

## Verification Commands
```bash
npm run typecheck
npm test
```
