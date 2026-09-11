---
name: github-gatekeeper
description: Assess a GitHub pull request using PR metadata, Actions checks, GitHub Copilot review findings, branch policy, and unresolved review state before recommending merge.
---

# GitHub Gatekeeper

- Treat the GitHub PR as the authoritative change record.
- Confirm the head SHA being reviewed is current.
- Inspect required workflow/check conclusions.
- Inspect unresolved blocking review findings and conversations.
- Request or wait for Copilot re-review after material pushes when configured.
- Do not substitute a local clean build for GitHub checks required by policy.
- Return readiness evidence; do not self-merge product changes.
