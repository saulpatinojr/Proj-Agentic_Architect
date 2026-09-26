# Release preflight evidence

Related: #14, #33 and delivery #56. This workflow tests the existing package boundary;
it does not publish a Marketplace release, certify runtime safety or close workstation
acceptance requirements.

Every PR/main run produces a tracked-source snapshot with the exact checked-out Git
revision and SHA-256 checksums. `git archive` excludes the `.git` directory, credential
helpers, untracked workspace files, and installed dependencies. For PR events, the
recorded revision is GitHub's tested merge revision, not necessarily the PR head.
Artifacts expire after seven days and require the normal GitHub artifact access path.
No customer code outside this repository is collected.

A separate job builds the production VSIX packaging path using an explicitly
non-production validation publisher. It checks that both the extension and compiled
CLI runtime exist and that a node_modules graph or Git internals are not bundled.
The artifact includes the package file list and checksums. It is validation material,
not an official release or evidence that Marketplace publication was authorized.

All jobs are read-only apart from uploading their own workflow artifacts; no deployment,
provider credentials, paid model calls, signing keys or production publication secrets
are used. A fork PR cannot obtain write credentials from this workflow.

Remaining release gates include packaged defaults in an unrelated workspace (#43),
pre-action approval enforcement (#44), owner-workstation clean install/R1/R2 tests (#4),
compatibility measurements, SBOM/attestations and the intended publisher's authorized
publication process. Do not label a packaging-only check as end-to-end product validation.
