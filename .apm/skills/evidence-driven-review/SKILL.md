---
name: evidence-driven-review
description: Perform a read-only engineering review that separates blocking defects from suggestions and requires reproducible or authoritative evidence for material findings.
---

# Evidence-driven review

- Start from the objective and acceptance criteria.
- Inspect the actual diff and relevant surrounding code.
- Run or cite deterministic validation when feasible.
- Check error handling, edge cases, compatibility, tests, security, maintainability, and unintended scope.
- Classify findings as informational, low, medium, high, or critical.
- Mark a finding blocking only when it threatens correctness, security, required behavior, or a required gate.
- Attach evidence identifiers to every blocking finding.
- If no material issue exists, say so explicitly.
