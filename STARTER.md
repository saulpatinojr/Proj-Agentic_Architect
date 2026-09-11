# STARTER.md — Code Conductor continuity handoff

This repository is the canonical home for Code Conductor. Use this file as the short entry point when a new human or AI work session resumes the project.

## Read first

Read in this order before making material changes:

1. `AGENTS.md` — repository constitution.
2. `docs/DECISIONS.md` — locked decisions and validated facts.
3. `docs/STATUS.md` — current checkpoint and immediate next milestone.
4. `docs/IMPLEMENTATION-PLAN.md` — v0.1 release plan/definition of done.
5. Relevant domain docs under `docs/` and the applicable ADRs.
6. `CONTRIBUTING.md` before changing branches, APM source, workflows, or governance files.

Do not redesign a locked architecture decision from memory or preference. If verified platform evidence requires a change, create a superseding ADR and update the decision register in the same PR.

## Current checkpoint

The repository foundation is implemented rather than architecture-only:

- TypeScript workspace and structured contracts exist;
- task state/risk/policy planning and runtime execution foundations exist;
- bounded retry, schema-validated structured result parsing, private run/evidence persistence, deterministic gates, and worktree handling exist;
- APM 0.30.0 is pinned, the lockfile and materialized projections are committed, and APM audit passes;
- `package-lock.json` is committed and CI uses reproducible installs;
- Vitest 5 is installed and the current npm dependency graph is audit-clean;
- initial Codex, Claude, Kiro, Antigravity, GitHub, APM, MCP, and workstation adapter boundaries exist;
- `cc validate`, `doctor`, `plan`, `run`, `harness-smoke`, MCP/APM, and GitHub-gate command paths exist;
- the VS Code extension foundation exposes Team, Runs, Gates, Connections, Packs, and Usage;
- repository CI, APM audit, npm lockfile validation, and secret scanning are green at the cleanup checkpoint;
- multiple GitHub Copilot Gatekeeper review rounds have been exercised and their concrete findings have been addressed with targeted regression coverage;
- Phase 1 issue #2 is completed; remaining live release-readiness work is tracked in issue #4.

The authoritative current status is `docs/STATUS.md`.

## Immediate work order

Do not create more architecture scaffolding before proving the existing implementation.

1. Start from current `main` and review `docs/STATUS.md` plus open issues before creating a branch.
2. Follow `docs/WORKSTATION-VALIDATION.md` on the actual VS Code execution workstation.
3. Validate official subscription authentication and read/modify smoke boundaries for Codex, Claude Code, and Kiro.
4. Keep Antigravity unattended execution blocked until its permission/sandbox decision is superseded with evidence.
5. Execute the first real R1 Code Conductor dogfood task using an isolated modifying worker plus independent validation/review.
6. Raise the same workflow to R2 with a different-provider challenger and GitHub Gatekeeper participation.
7. Capture structured evidence, fix defects found, and validate the VS Code cockpit against the run.
8. Prepare the v0.1 release candidate only when the release definition in `docs/IMPLEMENTATION-PLAN.md` is satisfied.

## Locked operating model

- VS Code is the primary cockpit.
- Code Conductor owns runtime orchestration, risk, authority, evidence, and readiness.
- APM owns reusable agent-pack dependency/distribution/integrity concerns.
- MCP provides tools/resources and is not the team scheduler.
- Git owns code state; GitHub owns PR, Actions, review, and merge state.
- Official CLI/headless interfaces are preferred for machine orchestration where supported and validated.
- Native platform surfaces remain first-class when they provide unique value, especially GitHub/Copilot PR and review capabilities.
- Subscription-backed official clients are preferred before separately billed model APIs.
- Provider/model/harness/role/stance/specialization/authority/risk are independent dimensions.
- Modifying agents use isolated branches/worktrees; a clean Git merge is not proof of correctness.
- Implementers do not self-review, self-approve, self-merge, or bypass deterministic gates.
- High-impact/destructive external operations retain explicit human approval.
- Perplexity Pro is the Research Captain in human-in-the-loop subscription mode unless paid official MCP/API automation is explicitly enabled.
- Kiro Pro is the specification/requirements lead and an eligible headless worker only after the installed client passes the required validation.

## Repository development checks

```bash
npm ci --ignore-scripts
npm run typecheck
npm test
npm run cc:validate
apm audit --ci --policy ./apm-policy.yml --no-fail-fast
```

For live clients, use the smoke-test sequence in `docs/WORKSTATION-VALIDATION.md`; never infer trust merely because a CLI binary is installed.

## Branch and file hygiene

- Do not work directly on `main` for normal feature changes.
- Remove merged/superseded remote and local branches after confirming their commits are preserved on `main`.
- Do not commit runtime state, credentials, local worktrees, build output, or package caches.
- Canonical reusable agent/skill content lives under `.apm/`; generated target projections are committed only when they match the APM lock/materialization state.
- Keep `README.md`, `STARTER.md`, `docs/STATUS.md`, `CHANGELOG.md`, and relevant ADR/runbooks synchronized with material behavior changes.

## Completion rule

Continue until the current task's acceptance criteria and required gates are satisfied. Preserve decisions, code, evidence, and documentation in GitHub as you go so future sessions do not depend on chat history.
