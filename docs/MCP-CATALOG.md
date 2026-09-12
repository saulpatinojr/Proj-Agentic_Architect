# Official MCP Catalog and Activation Policy

## Principle

MCP is Code Conductor's tool/reference plane. MCP servers expose capabilities; they do not schedule agents or decide authority.

Only official vendor MCP servers or explicitly approved alternatives are part of the default catalog. Every MCP is enabled per repository profile and per task need. Do not globally load all tools into all agents.

## Initial catalog

| Domain | Preferred source | Default state | Typical use |
|---|---|---:|---|
| GitHub | Official GitHub MCP/server/platform APIs | ON for GitHub repos | repository context, PRs, issues, checks, code review context |
| Microsoft Learn | Official Microsoft Learn MCP | ON for Microsoft/Azure reference needs | authoritative Microsoft documentation/reference |
| Azure | Official Azure MCP | OFF unless Azure profile | resource discovery, Azure context, supported operational tooling |
| Azure DevOps | Official Microsoft Azure DevOps MCP where current/supported | OFF unless ADO profile | repos, pipelines, work items, ADO context |
| Terraform | Official HashiCorp Terraform MCP | ON for Terraform profile | Registry/provider/module/HCP Terraform context where configured |
| Ansible | Official Ansible development tooling/MCP where current/supported | ON for Ansible profile | lint/development assistance; deterministic Ansible tools remain release gates |
| AWS | Official AWS MCP services/tools | OFF unless AWS profile | AWS docs/resource/tool access constrained by IAM |
| Google Cloud | Official Google Cloud managed/local MCP tooling | OFF unless GCP profile | GCP service/resource context constrained by IAM and selected toolsets |
| Perplexity | Official Perplexity MCP | OFF by default | automated external research only when separately billed API use is explicitly enabled |

## Activation profiles

Repository discovery should derive a minimal profile from files and explicit configuration.

Examples:

```yaml
profiles:
  terraform-azure:
    mcp:
      - github
      - terraform
      - microsoft-learn
      - azure

  terraform-aws:
    mcp:
      - github
      - terraform
      - aws

  ansible:
    mcp:
      - github
      - ansible

  application:
    mcp:
      - github
```

Profiles are additive only when the repository actually needs the additional platform.

## Tool minimization

The runtime should select tools by assignment. A researcher/reference verifier does not need write-capable cloud tools. A GitHub Gatekeeper does not need Terraform apply authority. A Terraform builder may need Registry/reference tools but not Azure production-write operations unless explicitly assigned.

Each assignment should contain an allowlist conceptually equivalent to:

```yaml
tools:
  mcp_servers:
    - terraform
    - microsoft-learn
  capabilities:
    - read_reference
    - search_registry
  deny:
    - production_write
```

## Authentication

Authentication belongs to the MCP/vendor identity mechanism, not the agent prompt. Native IAM/RBAC remains authoritative for what the external service permits, while Code Conductor policy may impose stricter limits.

## Writes and side effects

MCP write capability must be treated as a side-effecting tool. The mere presence of a write-capable MCP must not imply agent authority to invoke it.

For R3/R4 work:

- read/discovery may proceed under policy;
- proposed changes should be rendered as plan/diff/evidence first;
- destructive or production side effects require explicit human approval where risk policy says so;
- tool invocation and result should be recorded in the run manifest.

## Reference validation

Technical claims that affect implementation should prefer:

1. executable repository evidence;
2. official vendor documentation/MCP reference;
3. external research discovery when official sources are incomplete;
4. model opinion only after the above.

Perplexity is the preferred broad research captain but does not replace official technical authority where official documentation exists.

## APM relationship

Where Microsoft APM supports declaring/distributing MCP configuration, APM owns package-time declaration/materialization. Code Conductor owns runtime selection and authorization.

```text
APM: what MCP dependencies/configuration are available
Code Conductor: whether this task/agent may use them now
MCP server: executes/exposes the actual tool/resource
```

## Validation checklist before an MCP enters the approved catalog

- official publisher/source verified
- current supported status verified
- authentication flow documented
- read/write capabilities identified
- required local runtime/container dependencies identified
- least-privilege setup documented
- secret storage behavior understood
- side effects classified
- supported agent harnesses identified
- startup/health check defined
- deterministic fallback identified when appropriate
- APM compatibility/projection validated if declared through APM
