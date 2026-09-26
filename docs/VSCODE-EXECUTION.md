# Native VS Code execution and discovery

Related: #39, #42, #45, #55 and delivery #56.

Code Conductor commands use VS Code ProcessExecution tasks with an argument vector,
not strings injected into an interactive shell. Objective text, spaces, quotes and shell
metacharacters remain literal CLI arguments. Native task output provides the terminal UX.

Restricted Mode blocks local process discovery and command execution. Grant trust using
VS Code's own Workspace Trust UI. Trust is a workstation boundary, not authorization for
model execution, data disclosure, commits, package installation or deployment (#44).
The extension runs on the workspace host, including the remote side of a supported
remote workspace; virtual filesystem-only workspaces are not executable workspaces.

Startup diagnostics require Node, Git and GitHub CLI. APM and individual model clients
remain feature-specific prerequisites. Connections reads cached discovery rather than
spawning command probes on every view render. Each explicit local probe is time-bounded.
Installed/detected tools are not advertised as authenticated or authorized. Presence of
an APM lock file is not advertised as proof that Git tracks it.

Changing Workspace Trust or explicitly refreshing discovery updates status and views.
Clean Windows/WSL/remote-client validation remains part of the target-workstation release
gate; fixture tests do not establish that installed provider clients work on that host.

Reference: https://code.visualstudio.com/api/references/vscode-api#ProcessExecution
Reference: https://code.visualstudio.com/api/extension-guides/workspace-trust
