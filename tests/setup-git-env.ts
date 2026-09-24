import { GIT_LOCAL_ENV_VARS } from '../packages/git/src/index.js';

// Tests spawn git directly against throwaway repositories. When the suite itself is
// launched from a git hook, Git's exported GIT_DIR/GIT_INDEX_FILE would redirect those
// commands, including fixture commits, onto the contributor's own repository and
// index, so drop them before any test runs.
for (const name of GIT_LOCAL_ENV_VARS) delete process.env[name];
