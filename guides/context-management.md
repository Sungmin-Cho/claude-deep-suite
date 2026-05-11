[한국어](./context-management.ko.md)

# Context Management Across Deep Suite

This guide codifies the suite-level policy for **compaction**, **output offloading**, and **full context reset** — the three levers that preserve agent reasoning quality during long-running work. Addy Osmani and the Anthropic team explicitly call this out as a recurring failure mode for long-running agents; the Deep Suite consolidates the policy here so the six plugins behave consistently.

> Schema: `schemas/compaction-state.schema.json`. Producers emit envelope-wrapped compaction-state artifacts so the dashboard (`claude-deep-dashboard`) can aggregate `suite.compaction.frequency` and `suite.compaction.preserved_artifact_ratio` (M4-deferred metrics).

---

## 1. The four policies in one table

| Policy | Trigger | Action | Artifact |
|---|---|---|---|
| **1. Compaction** | Phase transition, slice GREEN, loop epoch end, window >80% | Drop intermediate transcript; preserve named artifacts | emit `compaction-state.json` |
| **2. Output offloading** | Large tool output (sensor, search, test runs) | Write to disk under `.deep-<plugin>/<session>/...`; keep only a summary in working memory | path reference in receipt |
| **3. Full reset** | Cross-plugin handoff, >24h dormancy, post-retry recovery | New session, no prior context; reconstruct from artifacts only | `handoff.json` is the only bridge |
| **4. Compaction-state artifact** | Whenever Policy 1 fires | Envelope-wrap the compaction event for dashboard consumption | `compaction-state.json` (this schema) |

The four policies compose: a Phase 5 → evolve handoff (Policy 3) typically includes a `compaction-state` artifact (Policy 4) recording what was preserved (Policy 1), referring to receipts/artifacts that were offloaded earlier (Policy 2).

---

## 2. Policy 1 — Compaction triggers

Plugins should compact at one of these boundaries. The **recommended action** column is a default — plugins MAY deviate when documented in their `hooks_intentionally_empty_reason` or equivalent sidecar field.

| Trigger | Recommended action | Why |
|---|---|---|
| **Phase transition** (Research → Plan → Implement → Test → Integrate in deep-work) | Manual compaction at the boundary; Phase artifact (research.md, plan.md, ...) becomes the next Phase's only input. | Each Phase's working memory pollutes the next; the Phase artifact is the curated handoff. |
| **Slice GREEN** (after RED → GREEN → REFACTOR in TDD slice) | Inline compaction: drop the slice's RED/REFACTOR conversation; keep only the slice receipt. | RED-cycle exploration is rarely useful past the slice boundary. |
| **Loop epoch end** (deep-evolve epoch terminates) | Full handoff + reset recommended (Policy 3). | Epochs are designed boundaries; the receipt + insights summarize what to remember. |
| **Window > 80%** | Auto compaction (Claude Code default). Plugins MAY emit a `compaction-state.json` on this trigger to surface frequency to the dashboard. | Hard cap. The dashboard's `suite.compaction.frequency` metric is most actionable here — sessions hitting this trigger often suggest scope creep. |
| **Stop hook** | Optional compaction for serialize-on-stop (e.g., long async work). | Useful only if the next session will resume from disk state; otherwise the receipt covers it. |

### Compaction strategies (`compaction-state.compaction_strategy`)

| Strategy | What's preserved | What's discarded |
|---|---|---|
| `key-artifacts-only` | The artifact paths in `preserved_artifact_paths[]`; nothing else from intermediate state. | Tool-call traces, intermediate edits, exploration. |
| `receipt-only` | The session/slice receipt. | Everything else. |
| `summary-only` | A producer-written natural-language summary. | Everything that's not in the summary. |
| `selective-message-drop` | Key turns selected by the producer. | Other turns. |
| `full-reset` | Nothing in working memory; state lives in receipts on disk. | Everything. |
| `custom` | Producer-defined. | Producer-defined. |

Default for deep-work Phase transitions: `key-artifacts-only`. Default for deep-evolve epoch ends: `receipt-only` (because the evolve-receipt is comprehensive).

---

## 3. Policy 2 — Output offloading

Large outputs poison context if held in working memory. Suite default: **write to disk, keep only a path + one-line summary in the receipt**.

| Output kind | Offload target | Receipt summary |
|---|---|---|
| Sensor results (eslint, tsc, coverage) | `.deep-<plugin>/<session>/sensors/<sensor>.txt` | one line: pass/fail + count |
| Test runner output (full) | `.deep-<plugin>/<session>/test-output.txt` | one line: pass/fail count + duration |
| Search / grep results | discard if used once; archive only if cross-referenced later | n/a |
| Full diff or large patch | already in git; receipt references commit SHA | sha + 1-line scope |
| Wiki page content | already in `<wiki_root>/pages/<page>.md`; receipt references path | path + 1-line topic |

**Pattern**: the receipt is the index; the offloaded files are the storage. Future readers (deep-review, deep-dashboard) grep into the index to find what's worth pulling into context.

**Anti-pattern**: paste raw tool output into the Slack-style summary log. The slot is small; you'll evict more useful context.

---

## 4. Policy 3 — Full reset

A full context reset (new session, no prior transcript) is appropriate when:

1. **Cross-plugin handoff** — deep-work → deep-evolve, or deep-evolve → deep-work. The handoff artifact (`handoff.json`, see `guides/long-run-handoff.md`) is the only bridge; the receiver should not try to reconstruct the sender's intermediate state.
2. **Dormant >24h** — when reopening a session that's been idle, the prior context may be stale (codebase moved on, dependencies updated). Treat the prior `handoff.json` or `session-receipt.json` as the canonical resume state; start fresh otherwise.
3. **Retry after validation failure** — if a receipt fails validation (e.g., schema mismatch after a refactor), retry should start clean; don't try to "fix up" a polluted context.

The recovery surface is the handoff: a clean session can fully reconstruct context from `payload.summary` + `payload.key_artifacts[]` + `payload.next_action_brief`.

---

## 5. Policy 4 — The compaction-state artifact

When Policy 1 fires, the producer SHOULD emit a `compaction-state.json` artifact for dashboard consumption:

```json
{
  "$schema": "https://raw.githubusercontent.com/Sungmin-Cho/claude-deep-suite/main/schemas/artifact-envelope.schema.json",
  "schema_version": "1.0",
  "envelope": {
    "producer": "deep-work",
    "producer_version": "6.5.0",
    "artifact_kind": "compaction-state",
    "run_id": "01HX2VR8...",
    "parent_run_id": "01HX2VR8...",
    "generated_at": "2026-05-11T15:30:00Z",
    "schema": { "name": "compaction-state", "version": "1.0" },
    "git": { "head": "abc1234", "branch": "main", "dirty": false },
    "provenance": { "source_artifacts": [], "tool_versions": {"node": "20.11.0"} }
  },
  "payload": {
    "schema_version": "1.0",
    "compacted_at": "2026-05-11T15:30:00Z",
    "trigger": "phase-transition",
    "session_id": "2026-05-11-142500-jwt-middleware",
    "preserved_artifact_paths": [
      ".deep-work/2026-05-11-142500-jwt-middleware/research.md",
      ".deep-work/2026-05-11-142500-jwt-middleware/plan.md"
    ],
    "discarded_summary": "Phase 1 Research exploration: 23 tool calls, ~18k tokens.",
    "pre_compaction_tokens": 84500,
    "post_compaction_tokens": 22300,
    "compaction_strategy": "key-artifacts-only"
  }
}
```

The dashboard's `lib/suite-collector.js` discovers these via filesystem scan (no registry registration needed for cross-plugin shared payloads, see `schemas/README.md`). It computes:

- `suite.compaction.frequency` = count of `compaction-state.json` artifacts per session, per producer
- `suite.compaction.preserved_artifact_ratio` = `len(preserved_artifact_paths) / (len(preserved_artifact_paths) + len(discarded_artifact_paths))`

When `discarded_artifact_paths` is omitted, the dashboard SHOULD treat `preserved_artifact_ratio` as undefined for that artifact (not zero); see the dashboard's M4-deferred metric calculation for details.

---

## 6. Where each plugin sits today

| Plugin | Policy 1 (compaction) | Policy 2 (offloading) | Policy 3 (full reset) | Policy 4 (artifact emit) |
|---|---|---|---|---|
| **deep-work** | Phase transitions (manual), slice GREEN (inline) | Sensor outputs to `.deep-work/<session>/sensors/` | `/deep-finish` ends session; handoff.json bridges to next | M5.7+ (per-plugin PR) |
| **deep-evolve** | Epoch end (full handoff) | Forum / receipts to `.deep-evolve/<session>/` | `--resume-from-handoff` is the canonical resume | M5.7+ |
| **deep-wiki** | Implicit (each ingest is its own short session) | Wiki content under `<wiki_root>/pages/` | n/a (no long-run loop) | optional |
| **deep-review** | n/a (single-pass reviewer) | Reports to `.deep-review/reports/` | each invocation is independent | n/a |
| **deep-docs** | n/a (single-pass garden) | Scan to `.deep-docs/last-scan.json` | each invocation is independent | n/a |
| **deep-dashboard** | n/a (read-only consumer) | n/a | n/a | **consumes** compaction-state from others |

deep-review, deep-docs, deep-dashboard ship `hooks_active: []` for the same trust-boundary reason; they're also single-invocation by design, so no compaction policy is needed.

---

## 7. Anti-patterns

| Anti-pattern | Why it's bad |
|---|---|
| Compact aggressively on every tool call | Loses too much context; subsequent steps re-explore what was just discovered. |
| Never compact; rely on Claude's auto-compaction at 80% | Auto-compaction is opportunistic and unaware of which artifacts matter; quality of preserved state is unpredictable. |
| Offload to disk but never reference the path in the receipt | Future readers don't know to look there; the offload is invisible. |
| Full-reset mid-session because "context feels long" | Discards live working memory unnecessarily; receipts may not capture in-flight intent. Save the reset for genuine boundaries. |
| Emit compaction-state but no `parent_run_id` chain | Dashboard cannot attribute the compaction to the originating session. |
| Use `compaction-state.compaction_strategy: "full-reset"` without writing a receipt first | The receiver has nothing to read; the reset is lossy. (Note: `full-reset` is valid only in `compaction-state.json` payloads — `handoff.json`'s `context_window_state.compaction_strategy` deliberately omits this value; use `"summary-only"` or `"receipt-only"` to denote a similar shape there.) |
| Emit a `compaction-state.json` for every tool call (over-instrument) | Multiplies dashboard noise; emit on genuine boundaries only. |

---

## 8. Quick reference

| Field | Required | Note |
|---|---|---|
| `schema_version` | yes | locked `"1.0"` |
| `compacted_at` | yes | RFC 3339 |
| `trigger` | yes | enum (6 values) |
| `preserved_artifact_paths[]` | yes | empty array = full reset |
| `session_id` | no | recommended for dashboard per-session grouping |
| `discarded_artifact_paths[]` | no | drives `preserved_artifact_ratio` |
| `discarded_summary` | no | audit-only |
| `pre_compaction_tokens` | no | producer-side estimate |
| `post_compaction_tokens` | no | producer-side estimate |
| `compaction_strategy` | no | enum (6 values) |

---

## 9. Further reading

- `schemas/compaction-state.schema.json` — authoritative schema
- `guides/long-run-handoff.md` — the handoff side of the long-run story (shares `context_window_state` semantics)
- `guides/hook-patterns.md` §3.4 — emitting `compaction-state.json` from a Stop hook
- `docs/envelope-migration.md` §6 — adoption ledger (when each plugin starts emitting)
- `docs/deep-suite-harness-roadmap.md` §M5 — design rationale (Addy Osmani context-management reference)

---

> *M5 milestone artifact. Schema v1.0 locked; additive evolution via `x-*` extension keys.*
