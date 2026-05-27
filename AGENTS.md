# Deep Suite - Codex Project Guide

This repository is the marketplace and integration layer for the Deep Suite
plugin family. It contains marketplace manifests, suite-side schemas,
integration guides, analysis docs, and CI tooling. It does not contain the
implementation source for individual plugins.

## Runtime Surfaces

- Codex marketplace: `.agents/plugins/marketplace.json`
- Claude Code marketplace: `.claude-plugin/marketplace.json`
- Suite sidecar metadata: `.claude-plugin/suite-extensions.json`
- Plugin implementation repos: `github.com/Sungmin-Cho/claude-deep-{name}`
- Local Claude runtime state: `.claude/` is ignored and must not be committed.

Keep repo and marketplace names unchanged for now. The Codex marketplace uses
the existing `claude-deep-suite` namespace so installed users can keep their
current plugin keys while Codex receives native policy metadata.

## Maintenance Rules

- Treat this repo as a registry, not a plugin monorepo.
- When a plugin release lands, update both marketplace manifests to the same
  released plugin SHA.
- Keep pin data in the manifest files. Do not mirror SHA pins into README
  tables unless explicitly requested.
- Preserve all existing plugin entries unless the user explicitly removes one.
- Do not commit `.deep-review/`, `.deep-suite-cache/`, `.claude/`, or
  `node_modules/` runtime artifacts.
- Documentation maintenance follows `docs/DOCS_RULE.md` (local maintainer guide;
  gitignored). It is the single-source-of-truth rulebook for README / CHANGELOG /
  CLAUDE.md / AGENTS.md and the auto-generated marker policy.

## Verification

Run these checks before finishing changes:

```bash
npm test
npm run validate
npm run docs:sync
node --test tests/codex-marketplace-contract.test.js
tmp_home=$(mktemp -d)
mkdir -p "$tmp_home/.codex"
CODEX_HOME="$tmp_home/.codex" HOME="$tmp_home" \
  codex plugin marketplace add /Users/sungmin/Dev/claude-plugins/deep-suite
rm -rf "$tmp_home"
```

Keep local marketplace smoke isolated unless the user explicitly wants to
modify `~/.codex/config.toml`. If it fails, separate schema failures from
network or auth failures.
