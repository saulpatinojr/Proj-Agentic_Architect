# Proj-Agentic_Architect

Home of **Code Conductor**: a VS Code-centered, multi-provider agent engineering system that coordinates subscription-backed AI clients, Agent Package Manager (APM) packs, official MCP servers, Git worktrees, GitHub pull requests, deterministic quality gates, and human approval.

## Status

The repository is being bootstrapped for Code Conductor v0.1. The first implementation establishes the project constitution, provider/harness roster, APM packaging strategy, authentication policy, MCP catalog, orchestration contracts, validation gates, and Codex handoff instructions.

## Core principles

- Use official vendor clients and authentication boundaries.
- Prefer subscription-backed execution before separately billed APIs.
- Keep model, provider, harness, role, stance, specialization, authority, and risk separate.
- Use APM as the package/distribution/integrity layer for agent packs.
- Use Code Conductor as the runtime orchestration and policy layer.
- Use official MCP servers as the tool/reference plane.
- Use Git worktrees for modifying agents and GitHub as the change/PR source of truth.
- Never allow an implementing agent to self-approve or bypass deterministic gates.

See `STARTER.md` and `docs/IMPLEMENTATION-PLAN.md` after the foundation PR lands.
