import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanMergedBranches, commandEnvironment } from '../../scripts/github-maintenance.mjs';

const repo = 'saulpatinojr/Proj-Code_Conductor';
const head = 'a'.repeat(40), merge = 'b'.repeat(40);
const branch = { name: 'merged', protected: false, commit: { sha: head } };
function fixture(failReadback = false) {
  let pushed = false;
  const calls = [];
  return { calls, run(file, args) {
    calls.push([file, args]);
    if (file === 'git') {
      if (args[0] === 'remote') return `https://github.com/${repo}.git`;
      if (args[0] === 'push') pushed = true;
      return '';
    }
    const endpoint = args.at(-1);
    if (endpoint === `repos/${repo}`) return JSON.stringify({ full_name: repo, default_branch: 'main' });
    if (endpoint.includes('/branches?')) return JSON.stringify([[{ name: 'main' }, ...(!pushed || failReadback ? [branch] : [])]]);
    if (endpoint.endsWith('/branches/merged')) return JSON.stringify(branch);
    if (endpoint.includes('/compare/')) return JSON.stringify({ status: 'ahead', merge_base_commit: { sha: merge } });
    if (endpoint.includes('/pulls?state=open')) return '[[]]';
    if (endpoint.includes('/pulls?state=closed')) return JSON.stringify([[{ number: 12, merged_at: '2026-09-24', merge_commit_sha: merge, head: { ref: branch.name, sha: head, repo: { full_name: repo } }, base: { ref: 'main', repo: { full_name: repo } } }]]);
    throw new Error('Unexpected test command');
  } };
}

test('records successful deletion before a later read-back failure', () => {
  const events = [];
  let failure;
  try { cleanMergedBranches({ apply: true }, fixture(true).run, (event) => events.push(event)); }
  catch (error) { failure = error; }
  assert.deepEqual(events, [{ event: 'branch.deleted', branch: 'merged', previousHead: head, mergedPullRequest: 12 }]);
  assert.deepEqual(failure.partialResult.deleted, ['merged']);
  assert.equal(failure.partialResult.verified, false);
});
test('successful cleanup reports progress and read-back state', () => {
  const events = [];
  const result = cleanMergedBranches({ apply: true }, fixture().run, (event) => events.push(event));
  assert.equal(result.verified, true);
  assert.equal(events.length, 1);
  assert.deepEqual(result.preserved, ['main']);
});
test('dry-run reports the metadata race and performs no Git writes', () => {
  const f = fixture();
  assert.equal(cleanMergedBranches({}, f.run).prMetadataIsNotAtomic, true);
  assert.equal(f.calls.some(([file]) => file === 'git'), false);
});
test('preserves official global helper configuration while stripping repository redirection', () => {
  const original = { GIT_DIR: '/other/.git', GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.worktree', GIT_CONFIG_VALUE_0: '/other', GIT_CONFIG_GLOBAL: '/trusted/global-config', GH_HOST: 'other.invalid' };
  const env = commandEnvironment(original);
  assert.equal(env.GIT_CONFIG_GLOBAL, '/trusted/global-config');
  assert.equal(env.GIT_DIR, undefined);
  assert.equal(env.GIT_CONFIG_COUNT, undefined);
  assert.equal(env.GIT_CONFIG_KEY_0, undefined);
  assert.equal(env.GH_HOST, 'github.com');
  assert.equal(original.GIT_DIR, '/other/.git');
});
test('privileged workflow pins immutable code and verifies it before repository tests', () => {
  const text = readFileSync(new URL('../../.github/workflows/maintenance.yml', import.meta.url), 'utf8');
  const section = text.slice(text.indexOf('  cleanup:'));
  assert.match(section, /ref: \$\{\{ github\.event_name == 'pull_request' && github\.event\.pull_request\.merge_commit_sha \|\| github\.sha \}\}/);
  assert.doesNotMatch(section, /ref: \$\{\{ github\.event\.repository\.default_branch/);
  assert.match(section, /github\.ref == format\('refs\/heads\/\{0\}'/);
  assert.ok(section.indexOf('test "$(git rev-parse HEAD)" = "$TRUSTED_SHA"') < section.indexOf('node --test'));
});
