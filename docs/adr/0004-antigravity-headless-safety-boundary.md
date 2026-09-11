# ADR 0004: Keep Antigravity subscription support interactive until headless permission isolation is revalidated

- Status: Accepted
- Date: 2026-09-11

## Context

Code Conductor originally planned to treat `agy -p` as the Google AI Pro subscription-backed headless worker lane. Current upstream Antigravity CLI issue reports show unresolved problems in non-interactive permission enforcement, including headless permission rules not being honored consistently, lack of a reliable read-only/plan equivalent for scripted runs, and file/sandbox boundary defects on current 1.1.x releases.

This conflicts with Code Conductor's separation-of-duties requirement because a reviewer/challenger must be technically read-only, not merely prompted to avoid edits.

## Decision

- Keep Antigravity/Google AI Pro as a first-class native Google specialist, but classify its current Code Conductor automation mode as `interactive_only_pending_upstream_safety`.
- Do not launch `agy -p` as an unattended Code Conductor subprocess in v0.1.
- Do not work around this with `--dangerously-skip-permissions`.
- Re-enable headless Antigravity only after the installed release is verified to provide a reliable least-privilege boundary and passes the Code Conductor workstation smoke tests.
- Google models may still participate through another trusted harness such as GitHub Copilot when that harness exposes them and the task does not require Antigravity-specific capabilities.

## Consequences

This reduces unattended Google-native coverage in v0.1 but preserves the stronger system invariant: assigned authority must be enforced by the harness/OS boundary, not by prompt wording alone.
