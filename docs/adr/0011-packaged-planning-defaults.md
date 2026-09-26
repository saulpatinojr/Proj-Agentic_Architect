# ADR 0011 - Packaged defaults and content-approved routing overlays

Status: Accepted for the owner-approved #32/#43 delivery scope; implementation and
workstation acceptance are tracked separately in #56.

## Decision

Canonical YAML defaults remain in `config/`. The build copies the seven bounded
configuration documents into the runtime/VSIX distribution. Runtime lookup is
anchored to the installed module, never the customer's working directory. A source
checkout fallback is allowed only beside the runtime package's own manifest.
No customer scaffold is created.

Planning uses bundled role, authority and risk policy. Arbitrary customer
`config/roles.yaml` and `config/risk.yaml` no longer silently become execution policy.
Optional routing overlays are version-1 JSON passed explicitly through the runtime
API with an absolute path and approved SHA-256. Precedence is defaults, approved user
routing, then approved workspace routing. Each layer may narrow/reorder its current
eligible harnesses, not broaden them. Specialization signals may be overlaid.
Unknown fields, roles/harnesses, stale hashes, oversized files and workspace escapes
are rejected. Role authorities, provider identities, billing channels and mandatory
risk requirements cannot be changed through this overlay format.

A hash is a content-binding mechanism, not a signature or human authentication.
The trusted caller must obtain the approval; repository/model output is not an
approval source. Full pre-action dispatch/commit/disclosure approval remains #44.

## Scope and compatibility

The planner works in an unrelated repository. Doctor checks the installed runtime
configuration rather than requiring Code Conductor source files in the customer
project. CLI MCP discovery uses the packaged catalog. Deterministic execution receives
packaged gate configuration; a validator with no applicable profile cannot report
successful validation. The Code Conductor-specific gate profile requires its source
marker instead of claiming every TypeScript project is this application.

`cc validate` remains the source-repository contributor check. APM remains an optional
feature; this change does not install packs or enable providers. The source tree keeps
all original YAML files and the stricter repository/CI validation.

Remaining #43 acceptance: native view/overlay UX, representative customer gate profiles,
clean-machine Windows/WSL validation and end-to-end operation with #44 approval controls.
This ADR does not claim the whole zero-scaffolding release is complete.

## Evidence

See `tests/runtime/configuration.test.ts`, the build's default-copy step, bundle
verification, and the implementation PR's recorded isolated-distribution test. Neither
GitHub Project administration nor a Marketplace release is authorized by these tests.

The isolated-distribution test exposed two previously hidden packaging defects:
bundled CommonJS dependencies lacked native require support, and dynamic Ajv
loads/schema reads still depended on source-tree files. Static Ajv imports, a
module-anchored native require bridge for Node built-ins, and the packaged contract
schema remove those implicit dependencies. CI now executes the copied distribution
in a temporary unrelated workspace instead of only inspecting ZIP file names.

Primary references: https://esbuild.github.io/api/ and
https://nodejs.org/api/module.html#modulecreaterequirefilename .
