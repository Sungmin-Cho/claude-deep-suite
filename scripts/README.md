# Deep Suite Scripts

Suite-level tooling. Each script is self-contained and runnable from the repo root via `node scripts/<name>.js` or `npm run <task>`.

## Inventory

| Script | Purpose | Exit Codes |
|---|---|---|
| `validate-suite-extensions.js` | Validate `.claude-plugin/suite-extensions.json` against `schemas/suite-extensions.schema.json` + post-schema referential integrity (`data_flow.from`/`to` ↔ `plugins` keys) | `0` valid, `1` validation fail (phase via stderr prefix), `2` IO/usage/compile |
| `generate-reference-sections.js` | Regenerate marker-bounded plugin tables, data-flow diagrams, source-pinning table, capability matrix, artifact I/O graph in suite docs from `marketplace.json` + `suite-extensions.json` + pinned `plugin.json.version`. Modes: `--check` / `--write`. | `0` up to date / wrote, `1` drift in `--check`, `2` usage/IO/fetch |
| `check-readme-plugin-table.js` | Flag plugin-version literals outside marker blocks in README.md / README.ko.md / CLAUDE.md (drift trap) | `0` clean, `1` drift, `2` IO/usage |
| `check-claude-md-paths.js` | Verify CLAUDE.md §Project Structure paths exist on disk | `0` clean, `1` missing path, `2` IO/usage |
| `check-guide-version.js` | Verify `**<plugin> vX.Y.Z**` claims in guides match pinned plugin.json.version | `0` clean, `1` mismatch, `2` IO/usage/fetch |
| `check-semver-sha-sync.js` | Verify marketplace.entry.sha → plugin.json.version → suite docs marker tables agree (cache-key drift guard) | `0` clean, `1` drift, `2` IO/usage/fetch |
| `check-pinned-plugin-paths.js` | Verify sidecar artifact paths appear in pinned plugin source (W-R1, W-R2 absorber) | `0` clean, `1` drift, `2` IO/fetch |
| `check-memory-hierarchy.js` | Detect cross-plugin policy conflicts using a keyword dictionary (suite ↔ each plugin's docs at pinned SHA) | `0` clean, `1` conflict, `2` IO/usage/fetch |
| `validate-artifact.js` | Validate a JSON artifact against `schemas/artifact-envelope.schema.json` + (when registered) `schemas/payload-registry/<producer>/<kind>/v<v>.schema.json`. M3 Phase 1. | `0` valid (envelope passes; payload either passes or registry-miss warning), `1` validation fail (envelope vs payload phase via stderr prefix), `2` IO/usage |
| `validate-artifact-fixtures.js` | Walk `tests/fixtures/envelope-payloads/` and assert every `valid-*` fixture exits 0 and every `invalid-*` fixture exits 1. CI gate for envelope contract. | `0` clean, `1` mismatch |
| `wrap-artifact.js` | Wrap a legacy JSON file into the envelope format. Auto-generates ULID `run_id`, detects git head/branch/dirty, fills `tool_versions.node`. M3 Phase 2 plugin-maintainer helper. | `0` wrapped, `1` envelope schema reject, `2` IO/usage |

## Library

| Module | Purpose |
|---|---|
| `lib/markers.js` | `<!-- deep-suite:auto-generated:<id>:start -->` marker parser/replacer used by generator and check-* scripts |
| `lib/fetch-plugin-files.js` | `gh api` + `.deep-suite-cache/<plugin>-<sha>/` cached fetcher; honours `M2_TEST_FIXTURES_DIR` for test overrides |

## Conventions

- Node 20+, ESM (`"type": "module"` in `package.json`)
- No external runtime dependencies beyond `ajv` + `ajv-formats` (declared as devDependencies; suite repo is not published)
- All paths are repo-relative; scripts use `import.meta.url` to locate the repo root
- Errors go to stderr, success messages to stdout
- Exit code is the load-bearing signal for CI; `process.exitCode = N; return` rather than `process.exit(N)` to avoid SIGPIPE truncation when piped
- Strict argv parsing — extra positional args fail with exit `2`, not silent acceptance

## Adding a new script

1. Create `scripts/<name>.js` with shebang `#!/usr/bin/env node`
2. Add an entry to this README and to `package.json` `scripts` if it's invoked frequently
3. Add unit tests under `tests/<name>.test.js` (in-process) plus `tests/cli.test.js`-style spawnSync coverage if exit codes matter
4. Run `npm test` and ensure exit 0

## M2 Manifest-Doc Sync

The `generate-reference-sections.js` + 6 `check-*.js` scripts together implement M2. They run on every PR + push to main + daily cron via `.github/workflows/manifest-doc-sync.yml`. Each script is independently runnable for local debugging:

```bash
npm run docs:check     # generator drift gate
npm run docs:write     # regenerate marker blocks
npm run docs:sync      # all 6 check-* scripts
```

The cache (`.deep-suite-cache/<plugin>-<sha>/`) is gitignored and shared across runs. CI populates it via `gh api` (uses `${{ secrets.GITHUB_TOKEN }}`); local devs need `gh auth login` once.

## M3 Common Artifact Envelope (Phase 1)

The `validate-artifact.js` + `validate-artifact-fixtures.js` + `wrap-artifact.js` trio implement the suite-side infrastructure for M3 Phase 1. Plugin maintainers performing Phase 2 envelope adoption use them as a *local cross-check* without taking the suite repo as a dependency.

```bash
npm run validate-artifact -- path/to/artifact.json   # single file
npm run validate-artifact-fixtures                   # batch CI gate
node scripts/wrap-artifact.js \
  --producer deep-docs \
  --artifact-kind last-scan \
  --schema-version 1.0 \
  --producer-version 1.1.0 \
  --input legacy.json \
  --output wrapped.json
```

The payload registry under `schemas/payload-registry/<producer>/<artifact_kind>/v<MAJOR.MINOR>.schema.json` is the single source of truth. See `docs/envelope-migration.md` for the per-plugin migration playbook.

## See also

- `schemas/README.md` — schema registry consumed by these scripts
- `docs/deep-suite-harness-roadmap.md` §M2, §M3 — milestone plans
- `docs/memory-hierarchy.md` — policy contract enforced by `check-memory-hierarchy.js`
- `docs/envelope-migration.md` — M3 Phase 2 plugin-maintainer guide
