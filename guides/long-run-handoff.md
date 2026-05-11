[한국어](./long-run-handoff.ko.md)

# Long-Run Handoff Across Deep Suite

This guide explains the **handoff artifact** — a standardized payload that one Deep Suite plugin emits when it has reached a natural pause point and another plugin should pick up the thread. The canonical scenario is **deep-work Phase 5 (Integrate) → deep-evolve outer loop**, but the same artifact serves any cross-plugin or cross-session continuation.

> Schema: `schemas/handoff.schema.json`. Wraps in the M3 [artifact-envelope](../docs/envelope-migration.md) (`envelope.artifact_kind = "handoff"`, `envelope.schema = { name: "handoff", version: "1.0" }`).

---

## 1. Why a handoff (vs a receipt or a wiki page)

Three Deep Suite artifacts adjacent to handoff already exist. Knowing which to use:

| Artifact | Purpose | Consumer model |
|---|---|---|
| **`session-receipt.json`** (deep-work) | "Here's what this session accomplished and how." | Read-only audit; deep-review and the dashboard consume. |
| **`evolve-receipt.json`** (deep-evolve) | Same idea, scoped to an evolve epoch. | Same. |
| **wiki page** (deep-wiki) | Durable, refactor-friendly knowledge that survives the session. | Future sessions read for context. |
| **`handoff.json`** (this) | "I stopped here; here's what *you* should do next, and what's already done." | Active *trigger* for the next agent. Carries an `intent` + `next_action_brief` that becomes the receiver's seed prompt. |

A handoff is **continuation-oriented**. It does not replace receipts (which document the past) or wiki pages (which preserve knowledge); it sits between them as the **baton** that gets passed.

---

## 2. The handoff envelope at a glance

```json
{
  "$schema": "https://raw.githubusercontent.com/Sungmin-Cho/claude-deep-suite/main/schemas/artifact-envelope.schema.json",
  "schema_version": "1.0",
  "envelope": {
    "producer": "deep-work",
    "producer_version": "6.5.0",
    "artifact_kind": "handoff",
    "run_id": "01HX2VR8ABCDEFGHJKMNPQRSTW",
    "parent_run_id": "01HX2VR8ABCDEFGHJKMNPQRSTV",
    "generated_at": "2026-05-11T16:20:00Z",
    "schema": { "name": "handoff", "version": "1.0" },
    "git": { "head": "abc1234", "branch": "main", "dirty": false },
    "provenance": { "source_artifacts": [...], "tool_versions": {"node": "20.11.0"} }
  },
  "payload": {
    "schema_version": "1.0",
    "handoff_kind": "phase-5-to-evolve",
    "from":   { "producer": "deep-work", "session_id": "...", "phase": "integrate", "completed_at": "..." },
    "to":     { "producer": "deep-evolve", "intent": "performance-optimization", "scope_hint": "src/auth/jwt.ts" },
    "summary": "JWT 미들웨어 PR #123 머지. 8/8 slices GREEN.",
    "key_artifacts":     [ { "path": "...", "kind": "session-receipt", "run_id": "..." } ],
    "open_questions":    [ "Token rotation 전략 미결정" ],
    "completed_actions": [ "merged PR #123" ],
    "next_action_brief": "deep-evolve로 JWT verify 성능 최적화 — current p99=180ms, target <50ms ...",
    "context_window_state": { "compacted_at": "...", "compaction_strategy": "key-artifacts-only", "preserved_artifact_paths": [...] }
  }
}
```

The envelope carries cross-plugin trace metadata; the payload carries handoff intent. The receiver agent reads `next_action_brief` as a *seed prompt* — clear, concrete, with a measurable target.

---

## 3. `handoff_kind` — the canonical scenarios

| Kind | Producer → Consumer | Typical trigger |
|---|---|---|
| `phase-5-to-evolve` | deep-work Phase 5 (Integrate) → deep-evolve outer loop | "Feature merged; now make it faster / safer / better-tested." |
| `evolve-to-deep-work` | deep-evolve epoch end → deep-work | "Evolve plateaued at score X; structural refactor needed before further gains." |
| `slice-to-slice` | deep-work slice N → deep-work slice N+1 (same session, after compaction) | Rare; usually slice receipts cover continuity. Use when compaction discards most context. |
| `session-resume` | any plugin session → same plugin, new session | Dormant session (>24h) being resumed; serialized state for fresh-context reset. |
| `custom` | producer-defined | Set `x-handoff-subkind` for the specific scenario. |

`custom` is the escape hatch — if your scenario doesn't match the four canonical kinds, use `custom` plus an `x-handoff-subkind` extension key. The cost of `custom` is that downstream tooling (dashboard, validators) treats it as opaque.

---

## 4. The canonical scenario — deep-work Phase 5 → deep-evolve

This is the scenario the M5 spec named explicitly. Walked through step-by-step:

### 4.1 Phase 5 emits the handoff

When deep-work reaches Phase 5 Integrate and the user opts to hand off to deep-evolve rather than `/deep-finish`:

1. Phase 5 computes the handoff payload from:
   - The session's `session-receipt.json` (`run_id`, completed slices, outcome)
   - The Phase 4 Test artifacts (coverage, mutation score, perf baseline if available)
   - Any review reports (`.deep-review/reports/<ts>-review.md`)
2. The plugin wraps the payload in an envelope (using `scripts/wrap-artifact.js` or its own emitter)
3. Writes the wrapped artifact to `.deep-work/<session>/handoff.json`
4. `envelope.parent_run_id` is set to the session-receipt's `run_id` — closing the trace chain.

```bash
# inside deep-work Phase 5 (post-merge)
node "${CLAUDE_PROJECT_DIR}/.claude/plugins/.../wrap-artifact.js" \
  --producer deep-work \
  --producer-version 6.5.0 \
  --artifact-kind handoff \
  --schema-version 1.0 \
  --parent-run-id "$(jq -r '.envelope.run_id' .deep-work/$SESSION/session-receipt.json)" \
  --input /tmp/handoff-payload.json \
  --output ".deep-work/$SESSION/handoff.json"
```

> The wrapper sets `envelope.schema.name = envelope.artifact_kind` (see `scripts/wrap-artifact.js`), so passing `--artifact-kind handoff` yields the matching `envelope.schema.name = "handoff"` automatically. The receiver's identity-triplet check (§4.2) then succeeds.

### 4.2 User invokes deep-evolve from the handoff

```bash
/deep-evolve --resume-from-handoff .deep-work/2026-05-11-142500-jwt/handoff.json
```

deep-evolve:
1. Reads the handoff envelope; validates `producer = deep-work`, `artifact_kind = "handoff"`, `schema.name = "handoff"`, `schema.version = "1.0"` (strict 3-way identity check, same pattern as deep-review's session-receipt unwrap).
2. Extracts `payload.next_action_brief` and uses it as the inner-loop seed prompt.
3. Sets its own envelope's `parent_run_id` to the handoff's `envelope.run_id` — the trace chain now reaches three generations: session-receipt → handoff → evolve-receipt.

### 4.3 Evolve epoch end → handoff back (optional)

When the evolve epoch terminates (plateau, target reached, or budget exhausted), deep-evolve MAY emit its own handoff:

```json
{
  "envelope": { "producer": "deep-evolve", "artifact_kind": "handoff", ... },
  "payload": {
    "handoff_kind": "evolve-to-deep-work",
    "from": { "producer": "deep-evolve", "phase": "epoch-3-plateau", "completed_at": "..." },
    "to":   { "producer": "deep-work", "intent": "structural-refactor",
              "scope_hint": "the inner verify loop in src/auth/jwt.ts:120-145" },
    "summary": "p99 dropped 180ms → 90ms (target was <50ms). Further gains require restructuring the verify loop — outside evolve's mutation budget.",
    "next_action_brief": "deep-work session to refactor src/auth/jwt.ts:120-145 ..."
  }
}
```

The user (or a long-run controller) then opens deep-work with this handoff as input.

---

## 5. Reading a handoff — receiver responsibilities

When a plugin receives a handoff (whether via `--resume-from-handoff <path>` or auto-discovery), it MUST:

1. **Validate the envelope's identity triplet** (`producer`, `artifact_kind`, `schema.name`) before reading payload. Pattern documented in deep-review's session-receipt unwrap.
2. **Read `payload.summary` and `payload.completed_actions`** before initiating any work — to avoid re-doing what's already done.
3. **Surface `payload.open_questions` to the user** if it acts autonomously; never silently make a call on an unresolved decision.
4. **Use `payload.next_action_brief` as the seed prompt** for the inner agent loop (or Phase 1 Research if entering deep-work).
5. **Set `envelope.parent_run_id` on its own outputs** to the handoff's `envelope.run_id` — preserving the cross-plugin trace.
6. **Read `payload.key_artifacts`** before pulling in any other context — these are the producer's explicit selection of what matters.

If `payload.context_window_state.compaction_strategy == "full-reset"` the receiver SHOULD start with a clean context (don't try to reconstruct the producer's intermediate state — the producer told you not to).

---

## 6. Compaction and handoff interplay

A handoff is itself a compaction artifact in some sense — it summarizes the producer's state into a continuation brief. The optional `payload.context_window_state` block records what the producer did to its memory before serializing the handoff:

- `compaction_strategy = "key-artifacts-only"` → the receiver should read `preserved_artifact_paths` for full context; the producer can no longer "remember" anything else.
- `compaction_strategy = "summary-only"` → only `payload.summary` reconstructs context.
- `compaction_strategy = "full-history"` → no compaction; the producer's full transcript is still in memory or recoverable.
- `compaction_strategy = "receipt-only"` → the linked `session-receipt.json` is the canonical state.

See `guides/context-management.md` for the standalone `compaction-state.json` artifact (what producers emit *during* a session for the dashboard); the handoff's `context_window_state` is a *snapshot* of the same idea at the moment of handoff.

---

## 7. Dashboard consumption

The dashboard aggregator (`claude-deep-dashboard`) consumes handoff artifacts to populate the M4-deferred metric `suite.handoff.roundtrip_success_rate`:

```
roundtrip_success_rate =
  count(handoff with reverse handoff or matching evolve-receipt) /
  count(handoff)
```

A handoff "round-trips" when the receiver either emits an `evolve-to-deep-work` handoff back, OR emits a final receipt whose `envelope.parent_run_id` chains to the original handoff's `run_id`. Either signal indicates the handoff was actually consumed, not just emitted.

Adoption path: see `docs/envelope-migration.md` §6 for the per-plugin adoption ledger; the dashboard activates this metric once two producers (deep-work + deep-evolve) ship handoff emission.

---

## 8. Anti-patterns

| Anti-pattern | Why it's bad |
|---|---|
| `next_action_brief` that's vague ("make it better") | The receiver gets no measurable target; inner-loop bottoms out fast. |
| Emit handoff but never link it from `session-receipt.outcome_ref` | Future readers can't navigate from receipt to handoff. Receipt SHOULD reference `.deep-work/<session>/handoff.json` when emitted. |
| Set `to.producer` to a plugin not actually installed | Receiver can't pick it up; the handoff becomes orphaned. The user should be the canonical fallback. |
| Skip `parent_run_id` chain | Dashboard cannot reconstruct lineage; `roundtrip_success_rate` undercounts. |
| Re-use the same `run_id` across emissions | Each artifact MUST have a fresh ULID. |
| Embed huge `key_artifacts` lists | The receiver loses signal in noise. Keep ≤ 5 truly key paths; everything else lives in the receipt. |
| Use `custom` without `x-handoff-subkind` | Opaque to tooling and to future you. |

---

## 9. Quick reference

| Field | Required | Note |
|---|---|---|
| `schema_version` | yes | locked `"1.0"` |
| `handoff_kind` | yes | enum (5 values) |
| `from.producer` | yes | kebab-case |
| `from.completed_at` | yes | RFC 3339 |
| `to.producer` | yes | kebab-case |
| `to.intent` | yes | short label |
| `summary` | yes | one paragraph |
| `next_action_brief` | yes | one paragraph with measurable target |
| `key_artifacts[]` | no | repo-relative paths |
| `open_questions[]` | no | surfaced to user |
| `completed_actions[]` | no | what's already done |
| `context_window_state` | no | producer-side compaction snapshot |

---

## 10. Further reading

- `schemas/handoff.schema.json` — authoritative schema
- `examples/handoff-phase5-to-evolve/` — runnable template (M5.3, separate PR)
- `guides/context-management.md` — companion compaction policy
- `docs/envelope-migration.md` §6 — adoption ledger
- `docs/deep-suite-harness-roadmap.md` §M5 — design rationale

---

> *M5 milestone artifact. Schema is locked at v1.0; additive evolution via `x-*` extension keys.*
