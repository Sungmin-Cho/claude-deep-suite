# Contributing to Deep Suite

Thanks for your interest in improving the **Deep Suite** — the marketplace and
integration layer for the Deep Suite plugin family across Claude Code and Codex.

This repository holds **marketplace metadata, suite-side schemas, integration guides,
and CI tooling only**. Each plugin's source lives in its own repository at
`github.com/Sungmin-Cho/claude-deep-<name>` — open plugin PRs there, not here.

## Getting started

```bash
git clone https://github.com/Sungmin-Cho/claude-deep-suite.git
cd claude-deep-suite
npm install          # ajv + ajv-formats (devDependencies only)
```

Node 20+ is required (ESM project).

## Local checks

```bash
npm test             # unit + CLI tests
npm run validate     # validate .claude-plugin/suite-extensions.json (2-phase)
npm run docs:write   # regenerate auto-generated marker regions in README / CLAUDE / guides
npm run docs:sync    # run all doc-sync checkers (CI gate)
npm run preflight    # full local CI mirror (validate + docs + fixtures + test)
```

A `prepare`-installed **pre-push hook** runs `npm run preflight` automatically, so
manifest/doc/sidecar drift never reaches `main` red. Everything must be green before
you push (bypass only in emergencies with `SKIP_PREFLIGHT=1` or `--no-verify`).

## What changes where

- **Version pins** → `.claude-plugin/marketplace.json` (+ `.agents/plugins/marketplace.json`).
  Prefer `npm run release:bump -- <plugin> <sha40>`, which sets the SHA, runs `docs:write`,
  and gates on `preflight`.
- **Documentation** → follows `docs/DOCS_RULE.md`. Narrative is hand-curated; marker
  regions are generated — never hand-edit inside `<!-- deep-suite:auto-generated:* -->`.
- **Cross-plugin metadata** → `.claude-plugin/suite-extensions.json` only. Never modify
  `marketplace.json` by hand beyond the pinned SHA/description.
- **Plugin source** → does NOT live here.

## Pull requests

1. Branch from `main`.
2. Keep changes focused; run `npm run preflight` and make sure it is green.
3. Explain what changed and why.

## Reporting issues

Open a GitHub issue. For security reports, see [`SECURITY.md`](SECURITY.md).
