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

## See also

- `schemas/README.md` — schema registry consumed by these scripts
- `docs/deep-suite-harness-roadmap.md` §M2 — milestone plan
- `docs/memory-hierarchy.md` — policy contract enforced by `check-memory-hierarchy.js`
