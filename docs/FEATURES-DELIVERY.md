# Code Conductor - Features delivery

Canonical execution ledger: #56. Approved scope: #32 and optional #39, #53, #54, #55.
Existing Project: https://github.com/users/saulpatinojr/projects/3 . Requested name:
**Code Conductor - Features**. This document is not proof that the Project changed.

## Project synchronization

Use Node.js 22+ and official GitHub CLI authorization for this user-owned Project.
Run from a trusted checkout. Never put a PAT in source, chat or command arguments.
The script does not sign in, create tokens, broaden scopes or replace the Project.

```sh
node scripts/github-maintenance.mjs project
node scripts/github-maintenance.mjs project --apply
```

The first command is read-only. Apply renames the existing Project and adds all repository
issues, including historical closed issues, plus open PRs. It paginates, preserves existing
items/views/fields, skips present URLs and reads back the result. Progress is emitted after
each successful mutation. Interrupted runs can have partial effects: preview again before
retrying. A repository GITHUB_TOKEN does not imply personal Project write access.

## Branch cleanup

```sh
node scripts/github-maintenance.mjs branches
node scripts/github-maintenance.mjs branches --apply
```

Apply requires an authenticated origin remote matching the selected repository. Only an
unchanged branch tip recorded by a merged PR into the current default branch is eligible;
the merge commit must still be in that default branch. Default/protected branches, observed
active PR heads/bases, unmerged work and later commits are excluded. A deletion uses an
explicit expected-SHA lease, not an unconditional REST delete or blind force push.

**Metadata race:** GitHub PR metadata and Git refs do not change atomically. A new PR can
appear after the final metadata read while the branch SHA stays unchanged. A Git SHA lease
cannot prevent that race. Coordinate cleanup with collaborators; use GitHub-native merged
branch deletion when appropriate. This tool does not guarantee atomic preservation of all
new PR relationships. No PR is intentionally closed merely because it is old.

Each successful deletion immediately records its branch, previous SHA and merged PR. A
later failure carries the accumulated deletion report, so partial effects remain auditable.
The prior SHA is recovery evidence. Never treat a failed read-back as successful completion.

The maintenance workflow runs tests on PRs. Same-repository merge cleanup checks out the
immutable merged commit, not a moving branch name. Manual runs default to preview, must be
dispatched from the then-default branch and pin the dispatch SHA. The exact SHA is verified
before repository scripts/tests execute. A later default-branch rename cannot redirect
privileged code execution. Official credential helpers remain with Git/GitHub; the script
never reads or prints credentials. No pull_request_target checkout of untrusted code is used.

## Integration and workstation synchronization

1. Independently review implementation PRs and fix findings; re-review material pushes.
2. Verify relevant CI for the exact head before the owner-directed merge. Preserve separation
   of duties; implementation permission is not evidence that tests or review passed.
3. Merge through the PR workflow; never force-reset main to dispose of conflicts.
4. Inspect cleanup logs and preserve branches without safe-disposition evidence.
5. On each owner workstation, first preserve any local work, then `git fetch --prune origin`,
   `git switch main`, and `git pull --ff-only origin main`. GitHub merging does not update
   a desktop checkout automatically.
6. Record PRs, validation, remaining blockers and the verified main SHA in #56.

## Scope and remaining gates

Foundation: #43 packaged defaults, #44 pre-action approval, #45 native interfaces. Initial
harness acceptance: #33-#38 and #42. Optional packs/MCP and GitHub One-Click: #39/#40/#53-#55.
Kiro #41 remains a guarded pilot; #13 needs the actual legacy corpus. Hosted infrastructure
#46 stays deferred. User-environment gates include Project/admin permissions, provider sign-in,
workstation smoke/R1/R2 evidence, and Marketplace publication authorization.

```sh
node --test tests/maintenance/*.test.mjs
```

Tests use fake GitHub responses and disposable Git fixtures, never a real Project/token.
Live mutation and workstation state must be verified separately.

References: https://cli.github.com/manual/gh_api
https://cli.github.com/manual/gh_project_edit
https://cli.github.com/manual/gh_project_item-add
https://git-scm.com/docs/git-push
https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
