# ADR 0009 — Surface-aware harnesses and provider specialization

- **Status:** Accepted
- **Date:** 2026-09-12
- **Related issues:** #10, #11, #12, #15, #17, #18
- **Clarifies/extends:** D-011 machine-facing adapter preference; D-015 Kiro integration details

## Context

The initial Code Conductor foundation modeled several AI providers primarily as CLI/headless workers. That is too coarse for the current product surfaces. Providers expose different combinations of IDE extensions, CLIs, ACP, MCP, platform-native workflows, APIs, and manual subscription experiences. Treating those surfaces as interchangeable risks discarding provider-native capabilities and routing work to a provider without using the capability that makes it valuable.

Current official evidence also makes Kiro materially different from a generic spawned CLI. Kiro documents `kiro-cli acp` as an Agent Client Protocol endpoint over JSON-RPC/stdin/stdout and describes ACP as the boundary used between clients and the Kiro harness. Kiro-specific ACP extensions expose capabilities such as slash commands, MCP lifecycle events, session management, and context compaction. Kiro also states that subscriptions may be used with Kiro CLI, ACP-compatible IDEs, and software-development automation, while restricting third-party automation harnesses that route requests outside Kiro's native interfaces. This requires a deliberate integration boundary rather than treating Kiro as an arbitrary child process.

Anthropic currently recommends the Claude Code VS Code extension for use inside VS Code while retaining the standalone CLI for terminal/advanced use. The extension and CLI expose overlapping but non-identical surfaces, including native IDE context, permissions, commands, plugins, hooks, and MCP. OpenAI similarly exposes Codex as both a VS Code IDE extension and a CLI, with the IDE optimized for editor context/review and the CLI supporting local repository work and repeatable automation. GitHub Copilot code review is natively integrated with GitHub pull requests, GitHub Actions, GitHub CLI, VS Code, and repository review workflows.

Official references reviewed for this decision:

- Kiro ACP: https://kiro.dev/docs/cli/acp/
- Kiro harness architecture: https://kiro.dev/docs/how-kiro-works/
- Kiro CLI/subscription boundary: https://kiro.dev/cli/
- Claude Code VS Code integration: https://code.claude.com/docs/en/ide-integrations
- Codex IDE extension: https://learn.chatgpt.com/docs/codex/ide
- Codex CLI: https://learn.chatgpt.com/docs/codex/cli
- GitHub Copilot code review: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review

## Decision

### 1. Harnesses are surface-aware

Code Conductor models these capabilities independently for each provider/harness:

- native VS Code/IDE extension surface;
- CLI/headless surface;
- ACP surface;
- MCP client/server capability;
- platform-native workflow/API surface;
- separately billed SDK/API surface;
- manual human-in-the-loop surface;
- provider-native subagents/agents, skills, hooks, commands/plugins/Powers, permissions, sessions, and other supported capabilities.

A single `cli_preferred` flag is not sufficient as the long-term capability model.

### 2. Preserve native capabilities

Code Conductor must preserve and expose provider-native agent capabilities rather than abstracting every provider into a lowest-common-denominator chat worker. Provider-local subagents may operate inside an assigned provider task when permitted by policy. Cross-provider AI scheduling, authority, worktree ownership, billing-channel selection, evidence capture, and readiness remain owned by Code Conductor.

Cross-provider AI invocation must be mediated by Code Conductor. One provider should not silently shell out to another AI provider and bypass assignment/evidence/authority tracking. Deterministic engineering CLIs are different: they may be exposed as governed tools to an assigned agent.

### 3. Kiro is ACP-first and specialization-first

For the VS Code-centered product, the preferred Kiro integration is an ACP client boundary using `kiro-cli acp` where current Kiro policy and installed-version behavior permit it. This should retain Kiro-native sessions, tools, MCP, agents/subagents, steering/spec workflows, permissions, and other capabilities that the ACP/harness exposes.

Kiro receives primary routing preference for:

- requirements and specification;
- architecture/design planning;
- task decomposition and verification planning;
- AWS-focused architecture and engineering;
- Kiro-native Power/agent workflows.

Kiro may still implement or review code when capability/risk policy calls for it. ACP/subscription-policy and read/modify authority must be validated on the target workstation before unattended execution is enabled.

### 4. Provider primary specializations

Primary specialization is a routing preference, not exclusivity.

| Provider / harness | Primary Code Conductor specialization | Secondary eligible work |
|---|---|---|
| Code Conductor | orchestration, risk, routing, authority, evidence, gates, arbitration | none; coordinates rather than competes |
| Kiro | specification/design/task planning; AWS specialist; Kiro-native workflows | implementation, review |
| Claude Code | large-codebase engineering, refactoring, deep codebase reasoning | implementation, challenger/reviewer |
| Codex | implementation, debugging, testing, repository execution | review/challenge, focused planning |
| GitHub Copilot + GitHub | GitHub Gatekeeper: PR review/re-review, Actions, repository/merge context | repository-native coding assistance |
| Perplexity | external research, discovery, source synthesis | comparison/reconnaissance; automation only when explicit paid API/MCP policy permits |
| Google Antigravity | Google/GCP specialist and alternate independent worker/reviewer | implementation/challenge after authority validation |

When multiple providers satisfy a task, routing prefers unique platform advantage while retaining different-provider independence requirements at higher risk.

### 5. Deterministic engineering tools are tools, not peer AI agents

Terraform, Ansible, PowerShell, Git/GitHub CLI, Azure/AWS/GCP CLIs, Kubernetes/Helm, language toolchains, linters, test runners, and similar deterministic tools live in the governed tool plane. Their VS Code extensions remain preferred human surfaces; their CLIs may be invoked by assigned agents/gates according to repository profile and authority policy.

Deterministic validation evidence has higher precedence than unsupported model opinion about whether a deterministic check passed.

## Consequences

### Positive

- Routing can exploit each provider's real strengths instead of treating providers as interchangeable.
- Native subagents, MCP, hooks, skills, plugins/Powers, and IDE experiences are preserved.
- Kiro can be integrated at its documented client/harness boundary rather than by inventing a parallel API wrapper.
- Deterministic tooling remains clearly separated from AI-provider orchestration.
- New providers can be added by declaring supported surfaces/capabilities rather than changing the core domain model.

### Costs

- Adapter capability discovery/schema becomes richer.
- Workstation validation must be surface-specific and version-aware.
- Some providers remain manual or interactive until an official safe automation boundary exists.
- Kiro ACP requires a client implementation/spike and policy validation before it can replace the current generic CLI path.

## Validation and migration

- Issue #10 owns the versioned surface/capability schema and provider mapping.
- Issue #11 owns the Kiro ACP client spike, subscription-policy validation, and AWS/spec routing.
- Issue #12 owns routing-policy tests for the provider matrix.
- Issue #15 owns deterministic tool registry/profiles.
- Issue #17 retains the Perplexity manual-vs-paid-automation boundary.
- Issue #18 revalidates Antigravity headless safety before unattended use changes.
- Issue #4 workstation/R1/R2 dogfood should validate the revised harness model rather than spending release effort proving an integration that this ADR intentionally replaces.
