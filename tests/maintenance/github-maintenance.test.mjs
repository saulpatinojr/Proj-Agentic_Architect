import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanupCandidates, syncProject, projectSnapshot, cleanMergedBranches, parseArgs } from '../../scripts/github-maintenance.mjs';

const repo = 'saulpatinojr/Proj-Code_Conductor';
const url = (n) => `https://github.com/${repo}/issues/${n}`;
const sha = (digit) => digit.repeat(40);
function projectHarness({ items = [], pages, issues = [{ html_url: url(53), state: 'open' }], badReadback = false } = {}) {
  const calls = [];
  let title = 'Code Conductor - Old';
  const present = new Set(items);
  const run = (file, args) => {
    calls.push([file, args]);
    if (args.includes('graphql')) {
      const paged = pages?.(args);
      return JSON.stringify({ data: { user: { projectV2: { id: 'PVT_1', number: 3, title: badReadback ? 'Old' : title, url: 'https://github.com/users/saulpatinojr/projects/3', closed: false, items: paged ?? { nodes: [...present].map((u) => ({ content: { url: u } })), pageInfo: { hasNextPage: false, endCursor: null } } } } } });
    }
    if (args.includes('--slurp')) return JSON.stringify([issues]);
    if (args[0] === 'project' && args[1] === 'edit') { title = args.at(-1); return ''; }
    if (args[0] === 'project' && args[1] === 'item-add') { present.add(args.at(-1)); return ''; }
    throw new Error(`Unexpected operation ${JSON.stringify([file, args])}`);
  };
  return { run, calls, present };
}

test('project dry-run does not mutate and retains all historical issues plus open PRs', () => {
  const harness = projectHarness({ items: [url(1)], issues: [{ html_url: url(1), state: 'closed' }, { html_url: url(2), state: 'closed' }, { html_url: `https://github.com/${repo}/pull/57`, state: 'open', pull_request: {} }, { html_url: `https://github.com/${repo}/pull/52`, state: 'closed', pull_request: {} }] });
  const plan = syncProject({}, harness.run);
  assert.deepEqual(plan.additions, [url(2), `https://github.com/${repo}/pull/57`]);
  assert.equal(plan.apply, false);
  assert.equal(harness.calls.some(([, args]) => args[0] === 'project'), false);
});
test('apply renames and verifies without deleting foreign items or creating duplicates', () => {
  const foreign = 'https://github.com/other/repository/issues/1';
  const h = projectHarness({ items: [foreign] });
  const first = syncProject({ apply: true }, h.run);
  assert.equal(first.verified, true);
  assert.equal(h.present.has(foreign), true);
  const second = syncProject({ apply: true }, h.run);
  assert.deepEqual(second.additions, []);
  assert.equal(h.calls.filter(([, args]) => args[0] === 'project' && args[1] === 'item-add').length, 1);
  assert.equal(h.calls.filter(([, args]) => args[0] === 'project' && args[1] === 'edit').length, 1);
});
test('Project pagination collects every page and deduplicates content', () => {
  const h = projectHarness({ pages: (args) => args.includes('cursor=next') ? { nodes: [{ content: { url: url(2) } }], pageInfo: { hasNextPage: false } } : { nodes: [{ content: { url: url(1) } }], pageInfo: { hasNextPage: true, endCursor: 'next' } } });
  assert.deepEqual([...projectSnapshot({}, h.run).urls], [url(1), url(2)]);
});
test('pagination loops fail before mutation', () => {
  const h = projectHarness({ pages: () => ({ nodes: [], pageInfo: { hasNextPage: true, endCursor: 'same' } }) });
  assert.throws(() => syncProject({ apply: true }, h.run), /did not advance/);
  assert.equal(h.calls.some(([, args]) => args[0] === 'project'), false);
});
test('inaccessible Project and GraphQL partial errors fail closed', () => {
  assert.throws(() => syncProject({ apply: true }, () => JSON.stringify({ data: { user: null } })), /accessible/);
  assert.throws(() => syncProject({ apply: true }, () => JSON.stringify({ errors: [{ message: 'denied' }] })), /GraphQL errors/);
});
test('failed read-back cannot report successful apply', () => {
  const h = projectHarness({ badReadback: true });
  assert.throws(() => syncProject({ apply: true }, h.run), /read-back/);
});
test('a write failure propagates without pretending completion', () => {
  const h = projectHarness();
  assert.throws(() => syncProject({ apply: true }, (file, args) => {
    if (args[0] === 'project') throw new Error('permission denied');
    return h.run(file, args);
  }), /permission denied/);
});
test('unexpected URLs and incomplete pagination arrays are rejected before writes', () => {
  const h = projectHarness({ issues: [{ html_url: 'https://github.com/other/repo/issues/1' }] });
  assert.throws(() => syncProject({ apply: true }, h.run), /Unexpected repository/);
  const valid = projectHarness();
  assert.throws(() => syncProject({}, (file, args) => args.includes('--slurp') ? '{}' : valid.run(file, args)), /paginated/);
});

const branch = (name, extra = {}) => ({ name, protected: false, commit: { sha: sha('a') }, ...extra });
const merged = (name, extra = {}) => ({ number: 12, merged_at: '2026-09-24', merge_commit_sha: sha('b'), base: { ref: 'main', repo: { full_name: repo } }, head: { ref: name, sha: sha('a'), repo: { full_name: repo } }, ...extra });
test('cleanup requires an exact merged PR tip and protects default/protected/unmerged branches', () => {
  const branches = [branch('main'), branch('protected', { protected: true }), branch('merged'), branch('unmerged'), branch('advanced', { commit: { sha: sha('c') } })];
  assert.deepEqual(cleanupCandidates(repo, 'main', branches, [], ['main', 'protected', 'merged', 'advanced'].map((name) => merged(name))).map((x) => x.branch), ['merged']);
});
test('open PR head and base dependencies are preserved', () => {
  const open = [{ head: { ref: 'head', repo: { full_name: repo } }, base: { ref: 'base', repo: { full_name: repo } } }];
  assert.deepEqual(cleanupCandidates(repo, 'main', [branch('head'), branch('base')], open, [merged('head'), merged('base')]), []);
});
test('closed-unmerged, foreign-repo and non-default-base PRs do not authorize deletion', () => {
  assert.deepEqual(cleanupCandidates(repo, 'main', [branch('x')], [], [merged('x', { merged_at: null })]), []);
  assert.deepEqual(cleanupCandidates(repo, 'main', [branch('x')], [], [merged('x', { base: { ref: 'other', repo: { full_name: repo } } })]), []);
  assert.deepEqual(cleanupCandidates(repo, 'main', [branch('x')], [], [merged('x', { head: { ref: 'x', sha: sha('a'), repo: { full_name: 'someone/other' } } })]), []);
});
function branchHarness({ advance = false, diverged = false, wrongOrigin = false, pushFails = false, readbackFails = false, headPrCount = 0, headPrOnRecheck = false } = {}) {
  const calls = [];
  let deleted = false;
  let usageReads = 0;
  const run = (file, args) => {
    calls.push([file, args]);
    if (file === 'git') {
      if (args[0] === 'remote') return wrongOrigin ? 'https://github.com/other/repo.git' : `https://github.com/${repo}.git`;
      if (args[0] === 'push') { if (pushFails) throw new Error('stale lease'); deleted = true; }
      return '';
    }
    if (args.includes('graphql')) {
      usageReads += 1;
      const count = headPrOnRecheck && usageReads > 1 ? 1 : headPrCount;
      return JSON.stringify({ data: { repository: { nameWithOwner: repo, ref: { name: 'merged', target: { oid: sha('a') }, associatedPullRequests: { totalCount: count, nodes: count ? [{ id: 'PR_other_base_repository' }] : [] } } } } });
    }
    const endpoint = args.at(-1);
    if (endpoint === `repos/${repo}`) return JSON.stringify({ full_name: repo, default_branch: 'main', archived: false });
    if (endpoint.endsWith('/branches?per_page=100')) return JSON.stringify([[branch('main'), ...(!deleted || readbackFails ? [branch('merged')] : [])]]);
    if (endpoint.includes('/pulls?state=open')) return '[[]]';
    if (endpoint.includes('/pulls?state=closed')) return JSON.stringify([[merged('merged')]]);
    if (endpoint.includes('/compare/')) return JSON.stringify({ status: diverged ? 'diverged' : 'ahead', merge_base_commit: { sha: sha('b') } });
    if (endpoint.endsWith('/branches/merged')) return JSON.stringify(branch('merged', advance ? { commit: { sha: sha('c') } } : {}));
    throw new Error(`Unexpected ${endpoint}`);
  };
  return { run, calls };
}
test('cleanup dry-run performs no git operations', () => {
  const h = branchHarness();
  assert.equal(cleanMergedBranches({}, h.run).eligible.length, 1);
  assert.equal(h.calls.some(([file]) => file === 'git'), false);
});
test('cleanup apply uses exact SHA lease and verifies deletion', () => {
  const h = branchHarness();
  const report = cleanMergedBranches({ apply: true }, h.run);
  assert.equal(report.verified, true);
  assert.deepEqual(report.deleted, ['merged']);
  assert.deepEqual(h.calls.find(([file, args]) => file === 'git' && args[0] === 'push')?.[1], ['push', '--porcelain', `--force-with-lease=refs/heads/merged:${sha('a')}`, 'origin', ':refs/heads/merged']);
});
test('changed heads, divergent history and mismatched origin never get deleted', () => {
  const h = branchHarness({ advance: true });
  assert.deepEqual(cleanMergedBranches({ apply: true }, h.run).deleted, []);
  const d = branchHarness({ diverged: true });
  assert.deepEqual(cleanMergedBranches({}, d.run).eligible, []);
  const o = branchHarness({ wrongOrigin: true });
  assert.throws(() => cleanMergedBranches({ apply: true }, o.run), /origin/);
  for (const item of [h, d, o]) assert.equal(item.calls.some(([file, args]) => file === 'git' && args[0] === 'push'), false);
});
test('stale leases and failed read-back are failures, never successful cleanup', () => {
  assert.throws(() => cleanMergedBranches({ apply: true }, branchHarness({ pushFails: true }).run), /stale lease/);
  assert.throws(() => cleanMergedBranches({ apply: true }, branchHarness({ readbackFails: true }).run), /read-back/);
});
test('strict command-line parser defaults to dry-run and rejects malformed input', () => {
  assert.equal(Boolean(parseArgs(['project']).options.apply), false);
  assert.equal(parseArgs(['project', '--apply']).options.apply, true);
  for (const args of [[], ['other'], ['project', '--project', 'NaN'], ['project', '--owner'], ['branches', '--force'], ['project', '--repository', 'owner/repo;echo']]) assert.throws(() => parseArgs(args));
});

test('real Git refuses a stale deletion lease in an isolated temporary repository', async () => {
  const { mkdtempSync, rmSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const root = mkdtempSync(join(tmpdir(), 'cc-lease-test-'));
  const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    git(['init', '--bare', 'remote.git']);
    git(['init', 'work']);
    const work = join(root, 'work');
    writeFileSync(join(work, 'file.txt'), 'first');
    git(['add', 'file.txt'], work);
    git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'first'], work);
    git(['remote', 'add', 'origin', join(root, 'remote.git')], work);
    git(['push', 'origin', 'HEAD:refs/heads/feature'], work);
    const old = git(['rev-parse', 'HEAD'], work);
    writeFileSync(join(work, 'file.txt'), 'second');
    git(['add', 'file.txt'], work);
    git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'second'], work);
    git(['push', 'origin', 'HEAD:refs/heads/feature'], work);
    assert.throws(() => git(['push', `--force-with-lease=refs/heads/feature:${old}`, 'origin', ':refs/heads/feature'], work));
    const current = git(['rev-parse', 'HEAD'], work);
    assert.match(git(['ls-remote', 'origin', 'refs/heads/feature'], work), new RegExp(current));
    git(['push', `--force-with-lease=refs/heads/feature:${current}`, 'origin', ':refs/heads/feature'], work);
    assert.equal(git(['ls-remote', 'origin', 'refs/heads/feature'], work), '');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('cross-repository open head is preserved in planning and at the final recheck', () => {
  for (const options of [{ headPrCount: 1 }, { headPrOnRecheck: true }]) {
    const h = branchHarness(options);
    const report = cleanMergedBranches({ apply: true }, h.run);
    assert.deepEqual(report.deleted, []);
    assert.equal(h.calls.some(([file, args]) => file === 'git' && args[0] === 'push'), false);
    assert.ok(report.skipped.some((item) => item.reason.includes('PR')));
  }
});
