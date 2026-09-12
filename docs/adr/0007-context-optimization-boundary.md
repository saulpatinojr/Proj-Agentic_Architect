# ADR 0007: Context optimization boundary

- **Status:** Accepted
- **Date:** 2026-09-12

## Context

Code Conductor now includes a first-party context optimizer that can prepare repository content for agent prompts and expose the same capability through an MCP adapter. The feature is useful, but its first implementation crossed several existing architectural boundaries: it described estimated token counts as if they were exact, stripped comments by default, allowed arbitrary local-file reads, persisted telemetry without the repository's private-file posture, identified a Code Conductor server as vendor-official/GA, and embedded provider-flavored context markup in the core result.

Those behaviors conflict with the existing principles that Code Conductor owns policy/evidence, MCP is a tool plane rather than a scheduler, context is minimized deliberately, local state is private, and user/repository instructions must not be silently discarded.

## Decision

1. Context optimization is a **Code Conductor context-preparation capability** controlled by runtime/repository policy. The core package is provider-neutral.
2. The default mode is **lossless/conservative**. Valid JSON may be compacted because insignificant JSON whitespace does not change its data model; comments and formatting in Markdown, YAML, HCL/Terraform, source code, and general text are preserved by default.
3. Comment/whitespace removal is an explicit **aggressive** opt-in. It must never be silently applied to authoritative instructions, security rationale, policy, acceptance criteria, or other content where comments may carry meaning.
4. File-based context preparation is restricted to configured workspace roots after canonical path/symlink resolution. Sensitive credential/state paths, non-regular files, and oversized files are rejected before reading.
5. Context-optimizer telemetry is local, owner-private where POSIX permissions are available, best-effort, and non-authoritative. Token counts are explicitly labeled **estimates** and are not billing/quota data.
6. MCP is an optional interoperability adapter for this capability. The Code Conductor server is identified as **first-party experimental**, not vendor-official or GA, and is not auto-enabled for every project/profile.
7. The handwritten MCP compatibility adapter may remain for v0.1 experimentation, but migration to the official MCP TypeScript SDK and validation against the then-current MCP protocol is required before the adapter can be promoted to GA.
8. Core/MCP responses do not inject provider-specific cache-control XML or other provider-specific prompt syntax. Provider-specific optimization belongs in a harness adapter only when officially supported and explicitly selected.
9. GitHub Copilot MCP configuration remains separate from the Code Conductor catalog: `.github/mcp.json` is a minimal repository-scoped Copilot CLI configuration, while GitHub.com Copilot code-review/cloud MCP servers are configured through GitHub's repository settings and built-in GitHub MCP capability.

## Consequences

- The new feature remains in the product and can be integrated into future routing/context-budget work without weakening current safety boundaries.
- Initial token savings will be smaller in conservative mode; correctness and instruction preservation take precedence over headline compression percentages.
- Aggressive optimization remains available for content known to tolerate it and can be evaluated empirically during R1/R2 dogfooding.
- A future runtime integration can invoke the package directly and use MCP only for external/interoperability clients, preventing MCP from becoming a hidden scheduler.
- Promotion of the MCP adapter requires an explicit SDK/protocol validation checkpoint rather than being implied by package availability.

## Validation

The implementation must include regression coverage for lossless defaults, explicit aggressive mode, workspace-root enforcement, symlink escape prevention, sensitive-file denial, file-size limits, private telemetry permissions, first-party MCP provenance selection, and estimated-token labeling.
