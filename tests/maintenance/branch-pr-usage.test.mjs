import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasOpenHeadPullRequest } from '../../scripts/branch-pr-usage.mjs';
const repository = 'saulpatinojr/Proj-Code_Conductor';
const head = 'a'.repeat(40);
const payload = (count = 0) => ({ data: { repository: { nameWithOwner: repository, ref: { name: 'feature/test', target: { oid: head }, associatedPullRequests: { totalCount: count, nodes: count ? [{ id: 'PR_foreign_base' }] : [] } } } } });
const invoke = (value, run = () => JSON.stringify(value)) => hasOpenHeadPullRequest(repository, 'feature/test', head, run);

test('finds open PRs by head ref, including a different base repository', () => {
  assert.equal(invoke(payload(1), (file, args) => {
    assert.equal(file, 'gh');
    assert.ok(args.some((arg) => arg.includes('associatedPullRequests(states:[OPEN],first:1)')));
    assert.ok(args.includes('ref=refs/heads/feature/test'));
    assert.ok(args.includes('name=Proj-Code_Conductor'));
    return JSON.stringify(payload(1));
  }), true);
});
test('zero open PRs is the only negative answer', () => assert.equal(invoke(payload()), false));
test('existence query needs no pagination even for more than 100 open PRs', () => assert.equal(invoke(payload(150)), true));
for (const [name, mutate] of [
  ['inaccessible repository', (v) => { v.data.repository = null; }],
  ['missing ref', (v) => { v.data.repository.ref = null; }],
  ['changed ref', (v) => { v.data.repository.ref.target.oid = 'b'.repeat(40); }],
  ['wrong repository', (v) => { v.data.repository.nameWithOwner = 'other/repo'; }],
  ['missing count', (v) => { delete v.data.repository.ref.associatedPullRequests.totalCount; }],
  ['truncated nodes', (v) => { v.data.repository.ref.associatedPullRequests.totalCount = 1; }],
  ['partial GraphQL error', (v) => { v.errors = [{ message: 'denied' }]; }],
]) test(`fails closed for ${name}`, () => { const value = payload(); mutate(value); assert.throws(() => invoke(value), /Preserve/); });
test('transport errors propagate before any mutation', () => assert.throws(() => invoke(null, () => { throw new Error('denied'); }), /denied/));
test('invalid repository/ref/head never reaches the transport', () => {
  for (const args of [['other', 'x', head], [repository, '', head], [repository, 'x', 'HEAD']]) {
    assert.throws(() => hasOpenHeadPullRequest(...args, () => { assert.fail('must not execute'); }), /Invalid/);
  }
});
