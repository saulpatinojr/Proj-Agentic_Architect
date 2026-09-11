# ADR 0003: Commit APM materializations and keep normal CI read-only

- Status: Accepted
- Date: 2026-09-11

## Context

The bootstrap branch initially needed one controlled materialization run so the canonical `.apm/` package source could produce `apm.lock.yaml` and the harness-specific projections for Copilot, Claude, Codex, Kiro, Antigravity, and Agent Skills. A temporary GitHub Actions workflow performed that write-back.

The live bootstrap proved APM 0.30.0 recognizes all declared targets, generated the lockfile and projections, and can audit them for integrity and drift. Continuing to let CI write generated package state back to normal development branches would blur the boundary between validation and mutation and could create self-updating PRs.

## Decision

1. Canonical package changes are made in `.apm/`, `apm.yml`, or approved dependency declarations.
2. A maintainer runs `apm install` using the pinned/approved APM CLI whenever package source changes.
3. Generated `apm.lock.yaml` and intentional harness projections are committed in the same change.
4. Normal GitHub Actions APM validation is read-only: install the pinned APM CLI with `setup-only: true`, then run `apm audit --ci --policy ./apm-policy.yml --no-fail-fast` against the committed state.
5. The former automatic bootstrap workflow is retained only as a manual read-only validation helper and has no contents-write permission.
6. CI must never hand-author or patch `apm.lock.yaml`.

## Consequences

- Package source and projections are reviewable together in Git.
- APM drift is a blocking validation concern rather than an automatic mutation.
- Agent-pack updates become explicit developer/maintainer changes.
- The repository can be cloned and used with the committed projections before rerunning APM installation.
- APM remains replaceable behind the Code Conductor adapter boundary.
