# Branch cleanup visibility boundary

The maintenance command queries each candidate head Ref's GraphQL associatedPullRequests
before planning deletion and immediately before the exact-SHA Git lease. Unlike a
base-repository REST PR list, this checks open PRs into other visible base repositories.
The count/existence query needs one node; it is not a paginated inventory. Null/partial
responses, GraphQL errors and changed ref identity fail closed.

Only PRs visible to the authorized client can be detected. An association hidden by
permissions cannot be ruled out, and Git ref leases cannot atomically freeze separate
GitHub PR metadata. Run destructive maintenance in a quiet, controlled window; do not
interpret these checks as a universal no-race or inaccessible-private-PR guarantee.
Unknown or unique/unmerged work must be preserved. No credentials or additional scopes
are acquired by this command.

Primary reference: https://docs.github.com/en/graphql/reference/git#ref
