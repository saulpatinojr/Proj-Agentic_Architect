// Query the head Ref, not the base-repository REST pull list. This includes
// associated PRs into other repositories visible to the authenticated client.
// A count/existence query needs only one node; it is not a paginated inventory.
const QUERY = `query($owner:String!,$name:String!,$ref:String!){repository(owner:$owner,name:$name){nameWithOwner ref(qualifiedName:$ref){name target{oid} associatedPullRequests(states:[OPEN],first:1){totalCount nodes{id}}}}}`;

export function hasOpenHeadPullRequest(repository, branch, expectedHead, run) {
  if (typeof repository !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || typeof branch !== 'string' || !branch || branch.includes('\0') || typeof expectedHead !== 'string' || !/^[a-f0-9]{40}$/.test(expectedHead) || typeof run !== 'function') {
    throw new Error('Invalid branch-usage lookup.');
  }
  const [owner, name] = repository.split('/');
  const response = JSON.parse(run('gh', ['api', '--hostname', 'github.com', 'graphql', '-f', `query=${QUERY}`, '-f', `owner=${owner}`, '-f', `name=${name}`, '-f', `ref=refs/heads/${branch}`]));
  if (response?.errors?.length) throw new Error('Branch PR usage is unknown: GitHub returned GraphQL errors. Preserve the branch.');
  const found = response?.data?.repository;
  const ref = found?.ref;
  const prs = ref?.associatedPullRequests;
  if (found?.nameWithOwner?.toLowerCase() !== repository.toLowerCase() || ref?.name !== branch || ref?.target?.oid !== expectedHead || !Number.isSafeInteger(prs?.totalCount) || prs.totalCount < 0 || !Array.isArray(prs.nodes) || prs.nodes.length !== Math.min(prs.totalCount, 1) || prs.nodes.some((node) => typeof node?.id !== 'string' || !node.id)) {
    throw new Error('Branch PR usage is unknown or the ref changed. Preserve the branch.');
  }
  return prs.totalCount > 0;
}
