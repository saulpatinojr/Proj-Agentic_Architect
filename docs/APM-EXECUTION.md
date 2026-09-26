# APM command execution boundary

The existing synchronous APM adapter now bounds both elapsed time and captured output.
Targets/audit default to two minutes; installation defaults to ten. Callers can set a
positive finite timeout up to fifteen minutes and an output limit up to 16 MiB per stream.
The default output bound is 4 MiB. Commands use an argument vector, never a shell.

An error, signal, timeout or output overflow cannot report `ok: true`. Timeout and overflow
are recorded independently. A failed installation may leave a partial diff: no automatic
retry, forced reset, success claim or implicit cleanup follows it.

This change retains the repository's pinned APM commands and does not upgrade APM or add
unsupported target flags. APM remains a feature-specific tool, not a model credential
broker or a runtime sandbox. Callers still need pre-action authorization (#44).

Remaining #39 work includes selective pack/target preview, ownership/conflict handling,
user-driven cancellation through an asynchronous boundary, transactional recovery and
VS Code UI integration. These synchronous safeguards do not claim those features exist.

Reference: https://nodejs.org/api/child_process.html#child_processspawnsynccommand-args-options
