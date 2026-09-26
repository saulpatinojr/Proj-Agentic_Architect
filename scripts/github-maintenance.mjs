import { hasOpenHeadPullRequest } from './branch-pr-usage.mjs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULTS = Object.freeze({ owner: 'saulpatinojr', repository: 'saulpatinojr/Proj-Code_Conductor', project: 3, title: 'Code Conductor - Features' });
const PROJECT_QUERY = `query($owner:String!,$number:Int!,$cursor:String){user(login:$owner){projectV2(number:$number){id number title url closed items(first:100,after:$cursor){nodes{content{... on Issue{url} ... on PullRequest{url}}}pageInfo{hasNextPage endCursor}}}}}`;
const LOCAL_GIT_ENV = ['GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_CONFIG', 'GIT_CONFIG_PARAMETERS', 'GIT_CONFIG_COUNT', 'GIT_OBJECT_DIRECTORY', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_IMPLICIT_WORK_TREE', 'GIT_GRAFT_FILE', 'GIT_INDEX_FILE', 'GIT_NO_REPLACE_OBJECTS', 'GIT_REPLACE_REF_BASE', 'GIT_PREFIX', 'GIT_SHALLOW_FILE', 'GIT_COMMON_DIR'];

export function commandEnvironment(source = process.env) {
  const env = { ...source, GH_HOST: 'github.com', GH_PROMPT_DISABLED: '1' };
  for (const key of LOCAL_GIT_ENV) delete env[key];
  for (const key of Object.keys(env)) if (/^GIT_CONFIG_(KEY|VALUE)_\d+$/.test(key)) delete env[key];
  // Global credential helpers remain with the official client; never read or print them.
  return env;
}
export function command(file, args) {
  const result = spawnSync(file, args, { encoding: 'utf8', shell: false, windowsHide: true, timeout: 60000, killSignal: 'SIGKILL', maxBuffer: 16 * 1024 * 1024, env: commandEnvironment() });
  if (result.error || result.status !== 0) throw new Error(`${file} operation failed (${result.error?.code ?? result.status ?? result.signal ?? 'unknown'}). Check authentication and permissions using the native client.`);
  return result.stdout;
}
function json(run, args) {
  const value = JSON.parse(run('gh', args));
  if (value?.errors?.length) throw new Error('GitHub returned GraphQL errors; no partial response is accepted.');
  return value;
}
function api(run, endpoint) { return json(run, ['api', '--hostname', 'github.com', endpoint]); }
function pages(run, endpoint) {
  const result = json(run, ['api', '--hostname', 'github.com', '--paginate', '--slurp', endpoint]);
  if (!Array.isArray(result) || result.some((page) => !Array.isArray(page))) throw new Error('Expected complete paginated GitHub arrays.');
  return result.flat();
}
function options(input) {
  const opt = { ...DEFAULTS, ...input };
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(opt.owner) || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(opt.repository)) throw new Error('Invalid GitHub owner or repository.');
  if (!Number.isSafeInteger(opt.project) || opt.project < 1 || typeof opt.title !== 'string' || !opt.title.trim() || opt.title.includes('\0')) throw new Error('Invalid Project number or title.');
  if (opt.apply !== undefined && typeof opt.apply !== 'boolean') throw new Error('apply must be an explicit boolean.');
  return opt;
}
export function projectSnapshot(input = {}, run = command) {
  const opt = options(input);
  const urls = new Set();
  const seen = new Set();
  let cursor;
  let project;
  for (let page = 0; page < 1000; page += 1) {
    const args = ['api', '--hostname', 'github.com', 'graphql', '-f', `query=${PROJECT_QUERY}`, '-f', `owner=${opt.owner}`, '-F', `number=${opt.project}`];
    if (cursor) args.push('-f', `cursor=${cursor}`);
    const next = json(run, args)?.data?.user?.projectV2;
    if (!next || next.number !== opt.project || next.closed || !next.id || !Array.isArray(next.items?.nodes)) throw new Error('Expected an accessible, open user-owned Project. No Project is created implicitly.');
    if (project && (project.id !== next.id || project.title !== next.title)) throw new Error('Project changed while reading; retry before applying changes.');
    project ??= next;
    for (const item of next.items.nodes) if (item?.content?.url) urls.add(item.content.url);
    const info = next.items.pageInfo;
    if (!info || typeof info.hasNextPage !== 'boolean') throw new Error('Project pagination information is missing.');
    if (!info.hasNextPage) return { id: project.id, number: project.number, title: project.title, url: project.url, urls };
    if (!info.endCursor || seen.has(info.endCursor)) throw new Error('Project pagination did not advance.');
    cursor = info.endCursor;
    seen.add(cursor);
  }
  throw new Error('Project exceeds the pagination safety bound; nothing was applied.');
}
export function syncProject(input = {}, run = command, onProgress = () => {}) {
  const opt = options(input);
  const before = projectSnapshot(opt, run);
  const all = pages(run, `repos/${opt.repository}/issues?state=all&per_page=100`);
  const desired = [...new Set(all.filter((item) => !item.pull_request || item.state === 'open').map((item) => item.html_url))].sort();
  const prefix = `https://github.com/${opt.repository}/`;
  if (desired.some((url) => typeof url !== 'string' || !url.startsWith(prefix) || !/\/(issues|pull)\/\d+$/.test(url))) throw new Error('Unexpected repository issue/PR URL.');
  const additions = desired.filter((url) => !before.urls.has(url));
  const plan = { project: before.url, fromTitle: before.title, toTitle: opt.title, additions, existingItemsPreserved: before.urls.size, apply: Boolean(opt.apply) };
  if (!opt.apply) return plan;
  if (before.title !== opt.title) {
    run('gh', ['project', 'edit', String(opt.project), '--owner', opt.owner, '--title', opt.title]);
    onProgress({ event: 'project.renamed', project: before.url, title: opt.title });
  }
  for (const url of additions) {
    run('gh', ['project', 'item-add', String(opt.project), '--owner', opt.owner, '--url', url]);
    onProgress({ event: 'project.item_added', project: before.url, url });
  }
  const after = projectSnapshot(opt, run);
  if (after.id !== before.id || after.title !== opt.title || desired.some((url) => !after.urls.has(url)) || [...before.urls].some((url) => !after.urls.has(url))) throw new Error('Project read-back verification failed. Partial changes may exist; rerun the dry-run before retrying.');
  return { ...plan, verified: true, verifiedItems: desired.length };
}
function validSha(value) { return typeof value === 'string' && /^[a-f0-9]{40}$/.test(value); }
function protectedRefs(prs, repository) {
  const refs = new Set();
  for (const pr of prs) {
    if (pr.head?.repo?.full_name === repository && pr.head.ref) refs.add(pr.head.ref);
    if (pr.base?.repo?.full_name === repository && pr.base.ref) refs.add(pr.base.ref);
  }
  return refs;
}
export function cleanupCandidates(repository, defaultBranch, branches, openPrs, closedPrs) {
  const inUse = protectedRefs(openPrs, repository);
  return branches.filter((branch) => branch.name !== defaultBranch && !branch.protected && !inUse.has(branch.name) && validSha(branch.commit?.sha)).flatMap((branch) => {
    const merged = closedPrs.find((pr) => pr.merged_at && pr.base?.ref === defaultBranch && pr.base?.repo?.full_name === repository && pr.head?.repo?.full_name === repository && pr.head.ref === branch.name && pr.head.sha === branch.commit.sha && validSha(pr.merge_commit_sha));
    return merged ? [{ branch: branch.name, head: branch.commit.sha, pr: merged.number, merge: merged.merge_commit_sha }] : [];
  });
}
function originMatches(origin, repository) {
  const clean = origin.trim().replace(/\.git$/, '');
  return clean === `https://github.com/${repository}` || clean === `git@github.com:${repository}` || clean === `ssh://git@github.com/${repository}`;
}
export function cleanMergedBranches(input = {}, run = command, onProgress = () => {}) {
  const opt = options(input);
  const repo = api(run, `repos/${opt.repository}`);
  if (repo.full_name !== opt.repository || !repo.default_branch || repo.archived) throw new Error('Repository identity/default branch validation failed.');
  const branches = pages(run, `repos/${opt.repository}/branches?per_page=100`);
  const open = pages(run, `repos/${opt.repository}/pulls?state=open&per_page=100`);
  const closed = pages(run, `repos/${opt.repository}/pulls?state=closed&per_page=100`);
  const candidates = cleanupCandidates(opt.repository, repo.default_branch, branches, open, closed);
  const eligible = [];
  const skipped = [];
  for (const item of candidates) {
    if (hasOpenHeadPullRequest(opt.repository, item.branch, item.head, run)) {
      skipped.push({ branch: item.branch, reason: 'Open PR uses this head ref, including another base repository.' });
      continue;
    }
    const comparison = api(run, `repos/${opt.repository}/compare/${item.merge}...${encodeURIComponent(repo.default_branch)}`);
    if (['ahead', 'identical'].includes(comparison.status) && comparison.merge_base_commit?.sha === item.merge) eligible.push(item);
    else skipped.push({ branch: item.branch, reason: 'Merged commit is not proven to be in the current default branch.' });
  }
  const plan = { repository: opt.repository, defaultBranch: repo.default_branch, prMetadataIsNotAtomic: true, eligible, preserved: branches.filter((b) => !eligible.some((item) => item.branch === b.name)).map((b) => b.name), skipped, apply: Boolean(opt.apply) };
  if (!opt.apply) return plan;
  if (!originMatches(run('git', ['remote', 'get-url', 'origin']), opt.repository)) throw new Error('origin must match the requested GitHub repository exactly.');
  const deleted = [];
  try {
    for (const item of eligible) {
      const currentRepo = api(run, `repos/${opt.repository}`);
      const current = api(run, `repos/${opt.repository}/branches/${encodeURIComponent(item.branch)}`);
      const active = pages(run, `repos/${opt.repository}/pulls?state=open&per_page=100`);
      const comparison = api(run, `repos/${opt.repository}/compare/${item.merge}...${encodeURIComponent(repo.default_branch)}`);
      if (currentRepo.default_branch !== repo.default_branch || current.protected || current.commit?.sha !== item.head || protectedRefs(active, opt.repository).has(item.branch) || !['ahead', 'identical'].includes(comparison.status) || comparison.merge_base_commit?.sha !== item.merge) {
        skipped.push({ branch: item.branch, reason: 'Repository/branch/PR state changed; preserved.' });
        continue;
      }
      if (hasOpenHeadPullRequest(opt.repository, item.branch, item.head, run)) {
        skipped.push({ branch: item.branch, reason: 'An open PR now uses this head ref; preserved.' });
        continue;
      }
      const ref = `refs/heads/${item.branch}`;
      run('git', ['check-ref-format', ref]);
      // This lease guards the ref value, not separately changing GitHub PR metadata.
      run('git', ['push', '--porcelain', `--force-with-lease=${ref}:${item.head}`, 'origin', `:${ref}`]);
      deleted.push(item.branch);
      onProgress({ event: 'branch.deleted', branch: item.branch, previousHead: item.head, mergedPullRequest: item.pr });
    }
    const remaining = pages(run, `repos/${opt.repository}/branches?per_page=100`);
    if (deleted.some((name) => remaining.some((branch) => branch.name === name))) throw new Error('Branch cleanup read-back failed; inspect the remote before retrying.');
    return { ...plan, deleted, verified: true, preserved: remaining.map((branch) => branch.name) };
  } catch (error) {
    const failure = new Error(error instanceof Error ? error.message : 'Branch cleanup failed.');
    failure.partialResult = { ...plan, deleted, skipped, verified: false };
    throw failure;
  }
}
export function parseArgs(args) {
  const [operation, ...rest] = args;
  if (!['project', 'branches'].includes(operation)) throw new Error('Usage: node scripts/github-maintenance.mjs <project|branches> [--apply]');
  const opt = {};
  for (let i = 0; i < rest.length; i += 1) {
    const key = rest[i];
    if (key === '--apply') { opt.apply = true; continue; }
    if (!['--owner', '--repository', '--project', '--title'].includes(key) || !rest[i + 1] || rest[i + 1].startsWith('--')) throw new Error(`Unsupported or incomplete option: ${key}`);
    const value = rest[++i];
    opt[key.slice(2)] = key === '--project' ? Number(value) : value;
  }
  return { operation, options: options(opt) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const progress = (event) => console.error(JSON.stringify(event));
    console.log(JSON.stringify(args.operation === 'project' ? syncProject(args.options, command, progress) : cleanMergedBranches(args.options, command, progress), null, 2));
  } catch (error) {
    if (error?.partialResult) console.error(JSON.stringify({ event: 'cleanup.failed', ...error.partialResult }));
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
