# Security Policy

## Supported versions

The Deep Suite tracks each plugin at a pinned commit in
`.claude-plugin/marketplace.json`. Security fixes are delivered through the latest
release of the affected plugin and a refreshed pin in this repository.

## Reporting a vulnerability

Please report security issues **privately** via
[GitHub Security Advisories](https://github.com/Sungmin-Cho/claude-deep-suite/security/advisories/new)
rather than opening a public issue.

We aim to acknowledge reports within a few days and will coordinate a fix and a
disclosure timeline with you.

## Scope

The Deep Suite plugins run inside the Claude Code / Codex plugin runtime and may:

- execute shell commands through hooks — review `hooks/` and the recommended denylist
  in [`guides/hook-patterns.md`](guides/hook-patterns.md) before enabling them;
- read and persist project artifacts — e.g. deep-memory capture is **OFF by default**
  with 3-pass redaction (see that plugin's own `SECURITY.md`).

When reporting, please indicate which plugin and runtime are affected.
