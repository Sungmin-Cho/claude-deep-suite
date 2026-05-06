# Deep Suite Schema Registry

JSON Schema definitions for suite-level metadata and artifacts. **Not consumed by Claude Code** — these are for suite tooling (validators, generators, telemetry) only.

## Files

| Schema | Consumes | Status |
|---|---|---|
| `suite-extensions.schema.json` | `.claude-plugin/suite-extensions.json` | **Active (M1)** — sidecar manifest with cross-plugin metadata |
| `artifact-envelope.schema.json` | `<plugin>/<artifact>.json` (per-plugin migration) | **Forward-compat (M1 → M3)** — common envelope adopted by plugins during M3 |

## Why a sidecar instead of extending marketplace.json?

Claude Code's [official marketplace.json schema](https://code.claude.com/docs/en/plugin-marketplaces#marketplace-schema) is a closed shape: top-level allows only `name`, `owner`, `plugins`, `metadata.pluginRoot`, `description`, `version`, `$schema`, `allowCrossMarketplaceDependenciesOn`. Plugin entries allow only the documented fields. Adding `runtime`, `capabilities`, `artifacts`, etc. would:

1. Be ignored at best by `claude plugin validate`, rejected at worst when strict validation lands
2. Break interoperability with other marketplace consumers
3. Mix marketplace concerns (distribution) with suite concerns (cross-plugin coordination)

The sidecar approach (`suite-extensions.json`) keeps both clean. Claude Code reads `marketplace.json`; suite tooling reads `suite-extensions.json`.

## Schema versioning

Top-level `schema_version: "1.0"` — **locked via JSON Schema `const`**.

**Why locked, not "MAJOR.MINOR additive"**: every level uses `additionalProperties: false`. An old `1.0` validator would reject a `1.1` manifest with one new optional field (operationally breaking). The naive "MINOR is additive" policy is a footgun under closed schemas.

**How to extend forward-compat**:

1. **`x-*` patternProperties** — at the level you want to extend, use `x-foo`-prefixed keys. Reserved-and-ignored namespace; never breaks old validators. Currently allowed at:
   - `suite-extensions.schema.json`: root, `suite`, plugin entry levels
   - `artifact-envelope.schema.json`: root, `envelope` block
2. **New schema** — for breaking changes, publish `suite-extensions-v2.schema.json` (or `artifact-envelope-v2.schema.json`) with explicit migration guide here. Both validators run during the transition window.

## Versioning policy (envelope vs sidecar)

| Field | Lives in | Format | Source of truth |
|---|---|---|---|
| `schema_version` (sidecar) | `.claude-plugin/suite-extensions.json` | `const "1.0"` | `schemas/suite-extensions.schema.json` |
| `schema_version` (envelope) | wraps every artifact | `const "1.0"` | `schemas/artifact-envelope.schema.json` (locked symmetrically) |
| `producer_version` (envelope) | wraps every artifact | SemVer `^\d+\.\d+\.\d+(-[A-Za-z0-9.-]+)?$` | The plugin's `plugin.json.version` (per CLAUDE.md §Conventions) |
| `envelope.schema.version` | wraps every artifact (payload schema id) | `^\d+\.\d+$` | The producer's domain schema (registry lookup, M3+) |

Why `schema.version` is *not* locked: it identifies the producer's payload schema, which evolves independently per producer's domain. The envelope frame itself is locked (`schema_version: const "1.0"`); the payload contract underneath can rev.

The two SemVer-bearing fields (envelope `producer_version` and the plugin's `plugin.json.version`) **must match at artifact-emit time**. M2 CI will enforce this from the marketplace side.

## `hooks_intentionally_empty_reason` invariant

Schema cannot express "required when `hooks_active` is `[]` AND the plugin's `hooks/hooks.json` declares `{}`" (it's a conditional cross-file constraint). This invariant is enforced **outside the schema**:

- Today: documented expectation; PR reviewers catch violations. The current sidecar (`.claude-plugin/suite-extensions.json`) records a reason for `deep-review`, `deep-docs`, and `deep-dashboard`. The `consumer_only` field is defined in the schema for future read-only consumers but is currently unused in the live sidecar.
- Future: M5 hook pattern guide may add a `scripts/check-hooks-coverage.js` lint that asserts every plugin with empty hooks has either a non-empty `hooks_intentionally_empty_reason` or `consumer_only: true`.

## `data_flow.via` is a display-only label

`data_flow[*].via` is a human-readable transport label and is **not validated against `artifacts.writes`/`reads`**. Compound labels like `"session-receipt + harness-sessions.jsonl"` or `"index.json (Research reference)"` are acceptable. The validator's referential integrity phase only enforces that `from` and `to` reference existing plugin keys.

Rationale: machine-readable cross-plugin truth lives in the M3 envelope (`run_id`, `parent_run_id`); the sidecar `data_flow` is a human-readable map of intent.

## Artifact envelope `payload` validation delegation

The envelope schema does not validate `payload` content (intentional). Each producer plugin owns a domain schema for its payload, identified by `envelope.schema.name`. Consumers (deep-dashboard aggregator, M3+ migration) look up the producer's payload schema in a **schema registry** (TBD in M3) keyed by `(envelope.producer, envelope.schema.name, envelope.schema.version)`. Until the registry exists, payload validation is producer-side only.

## Validating

```bash
# from repo root
npm run validate                                       # checks .claude-plugin/suite-extensions.json
node scripts/validate-suite-extensions.js path/to/file.json
```

Exit codes: `0` = valid, `1` = validation failure (schema or referential), `2` = IO/usage/compile error. Phase is distinguished by stderr prefix:

- `✗ ... fails schema validation:` — JSON Schema (Phase 1)
- `✗ ... fails referential integrity:` — `data_flow.from`/`to` not in `plugins` (Phase 2)

## Contributing

1. Edit the schema (`*.schema.json`)
2. Update fixtures in `tests/fixtures/`
3. Add or update tests in `tests/validate-suite-extensions.test.js`
4. Run `npm test`
5. Schemas are locked at `1.0`. For additive extensions use `x-*` patternProperties. For breaking changes, publish `*-v2.schema.json` and update §Schema versioning above.

## References

- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12)
- [ajv 2020-12 mode](https://ajv.js.org/json-schema.html#draft-2020-12)
- `docs/deep-suite-harness-roadmap.md` §M1, §M3
- `docs/deep-suite-harness-analysis.md` §A.2 (sidecar 배경)
