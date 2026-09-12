# Code Conductor review standard

This file defines the shared review checklist for human reviewers and GitHub Copilot code review. It complements `AGENTS.md`; it does not replace deterministic tests or policy gates.

## Review order

1. **Security and destructive behavior** — credentials, secret exposure, command execution, path handling, sandbox/trust assumptions, supply-chain changes, external side effects.
2. **Correctness** — behavior matches acceptance criteria and fails safely on invalid/partial input.
3. **Separation of duties** — implementers cannot self-approve/merge; authority checks are explicit and risk-sensitive.
4. **Authentication and billing** — official credential stores remain authoritative; subscription-first behavior cannot be silently replaced by paid API credentials.
5. **Evidence and validation** — blocking findings have reproducible evidence; required tests/gates actually execute.
6. **Worktree/Git safety** — unmerged work is preserved, sensitive paths are not committed, integration validation happens after changes combine.
7. **Provider neutrality** — vendor-specific details remain behind adapters; role/stance/risk/provider/model/harness dimensions stay separable.
8. **APM/MCP boundaries** — APM owns package/materialization integrity; MCP owns tools/resources; neither becomes the runtime scheduler.
9. **Compatibility and maintainability** — public contracts are intentional, errors are actionable, code is readable, duplicated policy is minimized.
10. **Documentation** — `README`, `STATUS`, `STARTER`, decision records, ADRs, and setup docs remain accurate for material behavior changes.

## Finding quality

A useful review finding states:

- severity;
- affected file/component;
- concrete failure/risk;
- evidence or reproduction;
- expected behavior;
- recommended correction when known.

Do not create speculative blockers without evidence. Do not dismiss a failing gate because an agent is confident.

## Merge recommendation

A PR is not ready when it has unresolved blocking findings, failing required checks, stale generated APM state, unacknowledged security/authentication changes, or required human approval that has not occurred.

A clean Git merge and green unit tests alone do not prove objective-level correctness.
