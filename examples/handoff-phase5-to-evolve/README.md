# Example — Phase 5 → deep-evolve Handoff

This directory ships a **filled-out handoff artifact template** for the canonical scenario described in `guides/long-run-handoff.md` §4: a deep-work session finishes its Phase 5 (Integrate) and hands off to deep-evolve for performance optimization.

> The schema is `schemas/handoff.schema.json`; this template is a concrete instance you can adapt by changing the obvious placeholders (`session_id`, `run_id`, `git.head`, the `summary`/`next_action_brief` prose).

## Files

| File | Purpose |
|---|---|
| `handoff-template.json` | A complete, validating handoff artifact wrapped in the M3 envelope. Run `npm run validate-artifact -- examples/handoff-phase5-to-evolve/handoff-template.json` (from suite repo root) to confirm. |
| `README.md` | This file — usage walkthrough. |

## Scenario walkthrough

The template encodes a realistic mid-feature handoff:

1. **deep-work session** `2026-05-11-142500-jwt-middleware` implemented JWT auth middleware across 8 TDD slices. All passed. PR #123 merged. Wiki page created.
2. **Open questions** remain (token rotation strategy, Redis cache invalidation) — surfaced to the user, not silently picked.
3. **Performance baseline** is concrete: `p99 = 180 ms` on auth-protected endpoints.
4. **Next agent's brief**: deep-evolve picks one of three optimization candidates (Redis caching, batched verify, async key rotation), scoped to `src/auth/jwt.ts:verifyToken()` and its call sites. Target `< 50 ms`.

## Adapting this template

Find-and-replace the following placeholder values for your own use case:

- `01HX2VR8ABCDEFGHJKMNPQRSTW` → generate a fresh ULID (`run_id`)
- `01HX2VR8ABCDEFGHJKMNPQRSTV` → the upstream `session-receipt.json`'s `envelope.run_id` (becomes `parent_run_id`)
- `2026-05-11T16:20:00Z` → the actual `generated_at` / `completed_at`
- `abc1234def5678abcdef0123456789abcdef0123` → the actual git HEAD SHA at handoff time
- `2026-05-11-142500-jwt-middleware` → your `session_id`
- The `summary` / `next_action_brief` prose → what *your* session actually accomplished and asks the receiver to do
- `key_artifacts[].path` → real paths to your session's receipts, review reports, wiki pages
- `open_questions[]`, `completed_actions[]` → your real state

## How to emit programmatically (recommended)

Rather than hand-editing this template, use `scripts/wrap-artifact.js` (suite repo) to wrap a payload-only JSON in the envelope correctly:

```bash
# Build payload-only JSON in /tmp/handoff-payload.json
# (everything UNDER envelope.payload — i.e., schema_version, handoff_kind, from, to, ...)

# Then wrap:
node "${CLAUDE_PROJECT_DIR}/.claude/plugins/.../wrap-artifact.js" \
  --producer deep-work \
  --producer-version 6.5.0 \
  --artifact-kind handoff \
  --schema-version 1.0 \
  --parent-run-id "$(jq -r '.envelope.run_id' .deep-work/$SESSION/session-receipt.json)" \
  --input /tmp/handoff-payload.json \
  --output ".deep-work/$SESSION/handoff.json"
```

The wrapper auto-populates `run_id` (fresh ULID), `generated_at`, `git.{head,branch,dirty}`, and `tool_versions.node`. It also sets `envelope.schema.name = envelope.artifact_kind = "handoff"`.

See `guides/long-run-handoff.md` §4 (and the KO mirror) for the end-to-end scenario.

## How a receiver picks this up

```bash
/deep-evolve --resume-from-handoff .deep-work/2026-05-11-142500-jwt-middleware/handoff.json
```

deep-evolve will:
1. Validate envelope identity (`producer = deep-work`, `artifact_kind = "handoff"`, `schema.name = "handoff"`, `schema.version = "1.0"`)
2. Extract `payload.next_action_brief` as the inner-loop seed prompt
3. Surface `payload.open_questions[]` to the user before initiating mutation
4. Chain its own `envelope.parent_run_id` to this handoff's `envelope.run_id`

If the receiver wants to hand control back, it emits a complementary `handoff_kind: "evolve-to-deep-work"` artifact — same shape, mirrored `from`/`to`.

## Validating this template

The template is intentionally written to PASS both the envelope schema and the handoff payload schema. From the suite repo root:

```bash
node scripts/validate-artifact.js examples/handoff-phase5-to-evolve/handoff-template.json
```

You should see envelope validation pass; the payload validates against `schemas/handoff.schema.json` (the registry doesn't yet ship a `deep-work/handoff` entry — that's a M5.7+ plugin-side PR).

## Further reading

- `guides/long-run-handoff.md` — Long-run handoff design and Phase 5↔evolve walkthrough
- `guides/long-run-handoff.ko.md` — KO mirror
- `schemas/handoff.schema.json` — authoritative payload schema
- `schemas/artifact-envelope.schema.json` — M3 envelope schema
