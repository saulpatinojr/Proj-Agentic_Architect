# Code Conductor - Features delivery

Canonical execution ledger: issue #56. Approved scope: #32 and optional #39, #53, #54, #55.
The requested Project is https://github.com/users/saulpatinojr/projects/3 . Its requested
name is **Code Conductor - Features**. A document or issue title is not proof that the
Project has been renamed or populated.

## Project synchronization

Use Node.js 22+ and the official GitHub CLI with authorized access to this user-owned
Project. Run from a trusted checkout. No PAT belongs in source, chat or a command argument.
This script does not sign in, create tokens, broaden scopes or create a replacement Project.

```sh
node scripts/github-maintenance.mjs project
node scripts/github-maintenance.mjs project --apply
```

The first command is read-only. The second renames the existing Project and adds all
repository issues (including historical closed issues) plus open PRs. It paginates,
preserves existing items/views/fields, skips already-present URLs, and reads back the
result. Interrupted/denied runs may have partial changes: rerun the preview before retrying.
Project write permission is separate from repository write access. The repository's
GITHUB_TOKEN must not be assumed to authorize personal Project management.

## Branch and PR cleanup

```sh
node scripts/github-maintenance.mjs branches
node scripts/github-maintenance.mjs branches --apply
```

Apply requires an authenticated Git remote named origin that exactly matches the selected
GitHub repository. Only a branch whose unchanged tip is recorded by a merged PR into the
current default branch is eligible. The merge commit must still be an ancestor of that
default branch. Default/protected branches, active PR heads and bases, unmerged work,
and branches with later commits are preserved. Git deletion uses an explicit expected-SHA
lease, not an unconditional REST deletion or blind force push. Any lease/authentication
failure stops the run. No PR is closed merely because it is old.

The Repository maintenance workflow runs these tests on PRs. After a same-repository PR
is merged into the default branch, it checks out the trusted default branch and performs
the approved verified-merged cleanup. A manual workflow run defaults to preview only.
It never checks out untrusted PR code in a privileged pull_request_target workflow.

## Final integration procedure

1. Complete and independently review each implementation PR; fix findings and re-review
   changed heads. Do not treat implementation permission as a passed test or reviewer approval.
2. Require the relevant CI results for the exact PR head. Preserve separation of duties.
3. Merge eligible work into main through a reviewed PR, never by force-resetting main.
4. Inspect cleanup logs and remaining branches; preserve any branch lacking proof of safe deletion.
5. On each owner workstation, ensure the worktree is clean or deliberately stash/commit
   existing work, then run `git fetch --prune origin`, `git switch main`, and
   `git pull --ff-only origin main`. A merge on GitHub does not update a desktop checkout.
6. Update #56 with PR URLs, exact validation, remaining blockers and the verified main SHA.

## Work order and preserved scope

Foundation first: #43 packaged defaults, #44 pre-action approval and #45 native interfaces.
Then #33-#38 and #42 complete the initial zero-scaffolding harness acceptance.
Optional #39/#40 and #53-#55 stay separately selectable and must not become mandatory
startup dependencies. #41 Kiro remains a validated pilot. #13 needs the actual legacy
corpus for semantic migration. #46 hosted infrastructure remains explicitly deferred.

Owner-environment gates remain distinct: Project authorization; repository administration;
provider sign-in and current-client trust validation; Marketplace publication credentials;
and real clean-machine/R1/R2 evidence. Do not mark these complete from fixture tests.

## Validation and primary references

```sh
node --test tests/maintenance/*.test.mjs
```

Tests use fake GitHub responses and a disposable local Git repository; they do not mutate
this checkout or require a token. Live GitHub validation remains separately reportable.

- https://cli.github.com/manual/gh_api
- https://cli.github.com/manual/gh_project_edit
- https://cli.github.com/manual/gh_project_item-add
- https://git-scm.com/docs/git-push
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
