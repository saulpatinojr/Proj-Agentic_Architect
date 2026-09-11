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

- TypeScript workspace and structured contracts exist.
- task state/risk/policy planning and runtime execution foundations exist;
- bounded retry, structured result parsing, run/evidence persistence, deterministic gates, and worktree handling exist;
- APM 0.30.0 is pinned, the lockfile and materialized projections are committed, and APM audit passes;
- `package-lock.json` is committed and CI uses reproducible installs;
- initial Codex, Claude, Kiro, Antigravity, GitHub, APM, MCP, and workstation adapter boundaries exist;
- `cc validate`, `doctor`, `plan`, `run`, `harness-smoke`, MCP/APM, and GitHub-gate command paths exist;
- the VS Code extension foundation exposes Team, Runs, Gates, Connections, Packs, and Usage;
- repository CI currently passes.

The authoritative current status is `docs/STATUS.md`.

## Immediate work order

Do not create more architecture scaffolding before proving the existing implementation.

1. Complete repository cleanup and merge the validated foundation to `main`.
2. Follow `docs/WORKSTATION-VALIDATION.md` on the actual VS Code execution workstation.
3. Validate official subscription authentication and read/modify smoke boundaries for Codex, Claude Code, and Kiro.
4. Keep Antigravity unattended execution blocked until its permission/sandbox decision is superseded with evidence.
5. Execute the first real R1 Code Conductor dogfood task using an isolated modifying worker plus independent validation/review.
6. Raise the same workflow to R2 with a different-provider challenger and GitHub Gatekeeper participation.
7. Capture structured evidence, fix defects found, and validate the VS Code cockpit against the run.
8. Triage known dependency audit findings before declaring a v0.1 release candidate.

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

## Completion rule

Continue until the current task's acceptance criteria and required gates are satisfied. Preserve decisions, code, evidence, and documentation in GitHub as you go so future sessions do not depend on chat history.
