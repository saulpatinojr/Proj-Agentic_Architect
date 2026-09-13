# ADR 0008 — Thin VS Code client and lazy startup

- **Status:** Accepted
- **Date:** 2026-09-12
- **Related issues:** #8, #9, #14

## Context

Code Conductor is intended to make existing developer environments more capable, not introduce another heavyweight desktop application. The repository already treats VS Code as the human cockpit and the Code Conductor runtime as a workstation-local orchestration layer. The current development extension, however, still assumes the Code Conductor source tree is present and may build a repo-local CLI. That is appropriate for development but not for a customer-facing release.

The product also coordinates multiple vendor extensions, CLIs, MCP servers, APM materialization, and deterministic engineering tools. Starting all of those processes on every VS Code launch would add latency, network traffic, unnecessary authentication activity, and avoidable resource use.

## Decision

1. Code Conductor will not require a standalone MAUI, Electron, tray, or similar desktop application for the v0.x product line.
2. VS Code remains the primary graphical cockpit.
3. An optional thin `cc` CLI/TUI provides terminal access to the same versioned core/runtime used by the extension.
4. The production VS Code package must ship or resolve the compiled Code Conductor runtime required for normal use. Customer repositories must not need the Code Conductor source tree or an `npm run build` step.
5. First run performs explicit workstation discovery/bootstrap: repository/config detection, supported surface inventory, APM state checks, authentication-boundary checks where safely discoverable, and required smoke/trust validation before unattended execution.
6. Subsequent launches use cached local non-secret health/trust state and lightweight fingerprints. Provider processes, ACP sessions, MCP servers, APM materialization, and other heavy work are lazy/on-demand.
7. APM packs are not reinstalled/materialized at every startup. Refresh occurs when relevant manifest/lock/source fingerprints change or when explicitly requested.
8. Native provider extensions, terminals, diffs, Source Control, and PR surfaces remain first-class; Code Conductor deep-links to them rather than rebuilding equivalent interfaces.
9. Release engineering must provide traceable customer artifacts through the VS Code Marketplace/VSIX and an optional CLI distribution path, with CI-built provenance and documented compatibility.

## Consequences

### Positive

- No second desktop application lifecycle for customers.
- Fast normal VS Code startup and lower idle resource use.
- One runtime contract shared by VS Code and CLI surfaces.
- Native provider UX remains available for direct/manual work and takeover.
- Product packaging becomes independent of the Code Conductor source repository.

### Costs

- The extension package/release workflow must bundle or reliably resolve the compiled runtime.
- Startup state requires explicit cache invalidation and compatibility/version handling.
- First-run setup and diagnostics need a clear UX separate from normal warm startup.

## Validation

Issue #8 owns product packaging/no-standalone-app acceptance criteria. Issue #9 owns cold/warm startup behavior. Issue #14 owns customer release/distribution trust. The v0.1 workstation dogfood in #4 must validate the resulting extension/runtime behavior before a release candidate is declared ready.
