# ADR 0010 — Rename the canonical repository to `Proj-Code_Conductor`

- **Status:** Accepted
- **Date:** 2026-09-18
- **Related issues:** #3 (repository-settings administration), #14 (Marketplace/VSIX/provenance/SBOM)
- **Amends:** D-001 canonical GitHub home

## Context

The repository name no longer describes the product. Every other identity surface in this tree already says "Code Conductor", and only the GitHub slug and the APM package name still say "Agentic Architect":

- `README.md` opens with `# Code Conductor`;
- the root workspace package is `@code-conductor/root`;
- all 14 workspace packages are scoped `@code-conductor/*` — `adapters`, `apm-adapter`, `cli`, `context-optimizer`, `core`, `evidence`, `gates`, `git`, `github-gate`, `mcp`, `policy`, `runtime`, `schemas`, `workstation`;
- the decision register, `AGENTS.md`, `STARTER.md`, and `docs/` refer to the product exclusively as Code Conductor.

The residual name is not merely cosmetic. D-006 makes GitHub the repository/PR/Actions/review/merge source of truth, and D-044 makes this tree the single-purpose documentation truth model. A canonical home whose slug names a different product weakens both: it is the string that will be embedded in the published VS Code extension manifest, in GitHub Releases provenance, and in SBOM attestations.

### The near-identical placeholder repository

A separate repository `saulpatinojr/Proj-Coder_Conductor` — note the misspelled "Coder" — previously occupied a near-identical name and could be mistaken for lost project history. It was not. Per maintainer report (this fact is external to this tree and is recorded here so future readers stop looking): it was an empty repository created 2026-09-02 containing a single auto-generated commit whose only content was an MIT `LICENSE`, never modified afterward, and it has now been deleted by the maintainer. It shared no git ancestry with this repository, contained no code, and no content was migrated from it. Its MIT `LICENSE` also never applied to this work; this repository is Apache-2.0 (`apm.yml`, `license: Apache-2.0`). Nothing was lost and nothing needs recovering.

### Why now is the deciding factor

Timing, not aesthetics, forces this decision. D-056 locks customer-facing distribution to the VS Code Marketplace with VSIX and GitHub Releases provenance, and issue #14 (Marketplace publication, provenance, SBOM, attestation) is still open — `docs/STATUS.md` records the VSIX packaging foundation as landed with publication and provenance outstanding. The cost curve is asymmetric:

- **Renaming before first publication** costs one ADR, one register amendment, and nine string edits.
- **Renaming after publication** strands a published extension manifest, GitHub Releases provenance records, and SBOM attestations against a repository slug that no longer resolves as the canonical name. Provenance whose subject URL is a redirect is weaker evidence than provenance whose subject URL is exact, and republishing a Marketplace extension to correct its manifest is a user-visible event.

The APM package identity has the same shape. `apm.yml` currently declares `dependencies: apm: []` — zero consumers. Renaming the package today breaks nothing. Renaming it after any external pack depends on `proj-agentic-architect` is a breaking dependency change under D-004/D-005.

## Decision

1. The canonical GitHub home for Code Conductor is renamed from `saulpatinojr/Proj-Agentic_Architect` to **`saulpatinojr/Proj-Code_Conductor`**.
2. The APM package name in `apm.yml` is renamed from `proj-agentic-architect` to **`proj-code-conductor`**, preserving `version: 0.1.0` and all other `apm.yml` fields.
3. D-001 is **amended in place** to name the new repository. It is not retired and its `LOCKED` status is unchanged: the decision that *there is a single canonical GitHub home* stands; only the slug that decision names changes.
4. All nine in-tree occurrences of the old names are updated in the same PR, per the `docs/adr/README.md` change rule.

## Consequences

### Compatibility

GitHub issues an automatic permanent redirect from the old repository URL to the new one. Existing clones, configured `git remote` URLs, issue links, and PR links continue to resolve without manual intervention. That redirect is a compatibility affordance for third parties and for history already written — it is **not** a licence to leave stale references in this tree. In-tree strings are the ones that get compiled into the VSIX manifest and quoted into provenance, so they are corrected now rather than left to a redirect.

### Sequencing requirement — read this before merging

**The GitHub repository rename must be performed before this PR merges.**

The rename is a repository-settings mutation the maintainer must perform manually. It is outside the current connector's administration surface — the same constraint already recorded against issue #3, which tracks branch-protection and ruleset administration for exactly this reason (`docs/STATUS.md`, `docs/WORKSTATION-VALIDATION.md`). No agent in this run can perform it.

If this PR merges first, `main` briefly carries documentation, an issue-template security link, and a VSIX manifest `repository`/`homepage`/`bugs` URL pointing at a slug that does not yet resolve. That is a window in which a clean-machine bootstrap from `docs/BOOTSTRAP.md` fails and any VSIX built from `main` embeds a dead URL. The required order is: maintainer renames the repository, then this PR merges.

### APM and lockfile impact

`apm.lock.yaml` does **not** embed the package name — verified: zero occurrences of `proj-agentic-architect` in the lockfile. Therefore:

- no APM re-materialization is required;
- **D-036 is not engaged** by this change. The lockfile is untouched, so the maintainer-materialization / read-only-CI protocol does not need to be exercised.

### Non-impact

No product runtime code changes. No security boundary, authentication path, billing-channel selection, provider contract, harness surface, or authority/risk policy changes. No test changes are expected: the renamed strings appear in a packaging script's manifest literals, an issue-template URL, and prose — none are asserted by the current suite.

### Costs

- One decision-register entry now carries a rename in its history; readers of old PRs and old issue text will see the former slug. This ADR is the pointer that explains it.
- The old slug remains reserved by the redirect and must not be re-created as a new repository, or the redirect breaks.

## Validation

This ADR claims only what is verifiable in this tree at authoring time. No CI run, PR number, or gate result is asserted here; the gates below are requirements on the implementing PR, not observations.

**Complete enumerated occurrence set — 9 occurrences across 6 files** (search over the working tree excluding `.git/` and `node_modules/`):

| File | Line | Occurrence |
|---|---|---|
| `apm.yml` | 1 | `name: proj-agentic-architect` |
| `.github/ISSUE_TEMPLATE/config.yml` | 4 | `.../Proj-Agentic_Architect/security` |
| `scripts/package-vscode.mjs` | 29 | `manifest.repository` git URL |
| `scripts/package-vscode.mjs` | 30 | `manifest.homepage` `#readme` URL |
| `scripts/package-vscode.mjs` | 31 | `manifest.bugs` issues URL |
| `docs/BOOTSTRAP.md` | 43 | `git clone` URL |
| `docs/BOOTSTRAP.md` | 44 | `cd Proj-Agentic_Architect` |
| `docs/DECISIONS.md` | 15 | D-001 register row |
| `docs/IMPLEMENTATION-PLAN.md` | 234 | repository-layout tree root |

That set is the completion criterion: after the implementing change, the same search must return zero results for both `Proj-Agentic_Architect` and `proj-agentic-architect` — **excluding this ADR file**, which quotes the retired strings deliberately as the historical record of what was changed. Any automated drift check for the old names must exempt `docs/adr/0010-canonical-repository-rename.md`.

**Supporting verifications performed:**

- `apm.lock.yaml` contains zero occurrences of `proj-agentic-architect`.
- `apm.yml` declares `dependencies: apm: []` and `mcp: []` — no APM consumers to break.
- 14 of 14 workspace packages are scoped `@code-conductor/*`; none carry an "agentic architect" name.

**Deterministic gates that must pass on the implementing PR:**

- `npm run typecheck`
- `npx vitest run`
- `cc validate` (declared as the `validate` script in `apm.yml`)

Per `docs/adr/README.md`, this ADR must not be used to justify bypassing a failing gate. A `cc validate` failure caused by the package rename is a real finding about APM package identity and must be fixed, not waived.

**Not verified here, recorded as maintainer-reported:** the creation date, content, emptiness, and deletion of `saulpatinojr/Proj-Coder_Conductor`. That repository is external to this tree and, having been deleted, is no longer independently inspectable.

## Supersedes / Superseded by

- **Amends D-001** (`LOCKED`). Prior wording: "`saulpatinojr/Proj-Agentic_Architect` is the canonical GitHub home for Code Conductor and its durable architecture/code/docs." Amended wording names `saulpatinojr/Proj-Code_Conductor` and is unchanged in every other respect. D-001 is amended, not superseded and not retired: its substance and `LOCKED` status survive intact and only the repository slug it names is replaced. Per the `docs/DECISIONS.md` change rule and the `docs/adr/README.md` change rule, `docs/DECISIONS.md` is updated in the same PR as this ADR.
- **Supersedes:** no prior ADR.
- **Superseded by:** none.
