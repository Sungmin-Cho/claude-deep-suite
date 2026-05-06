# Deep Suite Scripts

Suite-level tooling. Each script is self-contained and runnable from the repo root via `node scripts/<name>.js` or `npm run <task>`.

## Inventory

| Script | Purpose | Exit Codes |
|---|---|---|
| `validate-suite-extensions.js` | Validate `.claude-plugin/suite-extensions.json` against `schemas/suite-extensions.schema.json` + post-schema referential integrity (`data_flow.from`/`to` ↔ `plugins` keys) | `0` valid, `1` validation fail (phase via stderr prefix), `2` IO/usage/compile |

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

## See also

- `schemas/README.md` — schema registry consumed by these scripts
- `docs/deep-suite-harness-roadmap.md` — milestone plan
