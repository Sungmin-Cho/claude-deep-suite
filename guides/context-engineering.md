[한국어](./context-engineering.ko.md)

# Context Engineering for the Deep Suite

How to keep always-loaded context — `CLAUDE.md`, `AGENTS.md`, skill bodies, skill `description` frontmatter — small enough that a Claude 5-generation model reads all of it, and dense enough that nothing load-bearing is lost.

From [The New Rules of Context Engineering for Claude 5-Generation Models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models) (Thariq Shihipar, Anthropic, 2026-07-24), validated on the deep-dashboard pilot (§9). Design record: [`docs/superpowers/specs/2026-07-27-context-engineering-refactor-design.md`](../docs/superpowers/specs/2026-07-27-context-engineering-refactor-design.md).

---

## 1. The six rules

Anthropic removed over 80% of the Claude Code system prompt with no loss on coding evals, and restated the guidance as six inversions:

1. Give Claude rules → **let Claude use judgement**
2. Give Claude examples → **design interfaces**
3. Put it all upfront → **use progressive disclosure**
4. Repeat yourself → **simple tool descriptions**
5. Memory in CLAUDE.md files → **auto-memory**
6. Simple specs → **rich references**

Rules 1, 3 and 4 apply in full. Rule 2 applies selectively — delegate a text rule to a checker or schema that already exists, rather than writing new code to enforce it. Rules 5 and 6 are feature work, out of scope for a diet.

---

## 2. The four buckets

Classify every paragraph and instruction into one disposition.

### DELETE

Provenance and history tags (version tags, fix IDs like `NO2`, spec-section refs) — keep the constraint, drop the label; git and the CHANGELOG own history. Discipline the model can infer from surrounding context. Duplication of what the system prompt, a sibling skill, or the suite `CLAUDE.md` already guarantees. Facts self-evident from code, such as an annotated directory tree.

deep-dashboard's 26-line "🚨 CRITICAL — Plugin Update Workflow" told the reader to hand-edit `marketplace.json` and the suite READMEs, long after the suite automated that as `npm run release:bump` and dropped the `version` field. It was not merely redundant, it was wrong — and CRITICAL made it louder than the correct instruction. It became a five-line `AGENTS.md` §Release pointer plus the one genuine exception (§6, step 8).

Also deleted: a six-row bar-label → dimension-id → weight table, because the weights belong to `lib/harnessability/checklist.json` and a doc copy is a second definition that rots silently. One half-clause survived — "the labels are display abbreviations of `payload.dimensions[].label`" — the only fact the table carried that the code does not.

### KEEP

Constraints invisible in the code ("never modify `marketplace.json`", the `<wiki_root>/` underscore rule, single-writer invariants, idempotency and lock contracts); safety gates (phase-guard, TDD gates, denylist); cross-plugin contracts (M3 envelope fields, state-file schemas, advertised `suite-extensions.json` paths).

KEEP is not keep-verbatim. The pilot's "Loaded-SKILL routing handoff" went from 34 lines to 20 by collapsing two per-host tutorial bullets and a caution paragraph into one constraint paragraph. Every constraint survived — the `dirname` derivation, the Codex-has-no-`CLAUDE_*` fact, "never infer a root from cwd", both fallback command lines verbatim — only the tutorial around them went.

### MOVE

Detail needed only conditionally goes into `references/` beside the skill, with one pointer line in the entry `SKILL.md` saying when to read it. `deep-review/skills/*/references/` and `deep-evolve/skills/*/protocols/` are the established shapes — adopt one rather than inventing a third.

### REPLACE

A text rule an existing checker or schema already enforces gets deleted and delegated. In the pilot, a 17-metric enumeration became a pointer to `lib/metrics-catalog.yaml`, and an envelope payload field list became a reference to `PAYLOAD_REQUIRED_FIELDS` in `lib/suite-constants.js`.

---

## 3. KEEP-absolute, and what it overrides

Never remove, never paraphrase, never replace with a pointer: skill trigger phrases (EN and KO, verbatim) · M3 envelope field contracts · state-file schemas · freshness, lock and idempotency contracts · denylist and phase-guard gates · `suite-extensions.json` advertised paths.

**Precedence.** The general "don't say it twice, use a pointer" rule yields to this list and to the contract inventory's invariants. If an invariant requires the same sentence in two skills and in `AGENTS.md`, write it three times. Duplication a reviewer can flag is cheaper than a contract a reader can miss. (Controller ruling, pilot Task 2.)

---

## 4. Size guides are soft ceilings, not targets

| Surface | Guide |
|---|---|
| `CLAUDE.md` + `AGENTS.md` combined | ≤ ~4 KB |
| Entry `SKILL.md` | ≤ ~10 KB / 500 lines |
| Skill `description` | ≤ half its previous size |

**Contract fidelity beats bytes.** deep-dashboard shipped at 11.1 KB combined, over even the ~6 KB it was granted up front. All the residual is KEEP text: fifteen enumerated `EXPECTED_SOURCES`, five envelope read guards plus the silent-null policy, eight gotchas. The one lever that would have hit the target — `EXPECTED_SOURCES` as a pointer — was deliberately left unpulled and recorded in the PR. The ruling: **size guides are soft, the KEEP list is hard.** Record the overrun and any lever you declined; do not force the number.

**Description halving has a floor.** Trigger lists are immovable and were ~30% of description bytes in the pilot. Both reached 49.8% and 49.9% only because the framing shrank too (`Trigger phrases include ` → `Triggers on `; the "This skill should be used when the user…" preamble → one verb-first clause). Where the trigger list is longer, half is arithmetically unreachable without cutting triggers, which §3 forbids. Record the overage instead.

---

## 5. AGENTS.md is the single source

One shared file, two hosts.

- `AGENTS.md` carries every shared runtime rule, gotcha and contract, and is **self-contained** — no `@` imports inside it, because Codex does not support them.
- `CLAUDE.md` is line 1 `@AGENTS.md`, then Claude-only content. Frequently there is none and the file stays a stub.
- The import is one-directional, `CLAUDE.md` → `AGENTS.md`, never the reverse.
- The ~4 KB guide applies to the **sum** of the two files.

Where a repo already has an `AGENTS.md` "Codex Project Guide", merge `CLAUDE.md`'s shared content in and delete what then duplicates. Adding the import line without moving the content is not the standard — it just loads both files.

---

## 6. Per-repo runbook

1. **Extract the contract inventory first**, before editing: state-file schemas, gates, envelope fields, advertised paths, cross-skill references. It is your disposition worksheet and the reviewer's checklist, and it ships in the PR.
2. **Apply the four buckets** to `CLAUDE.md`, `AGENTS.md`, skill bodies, descriptions.
3. **Verify every restated contract against code in one sweep** (§7) — before review, not in response to it.
4. **Machine gates** green: the repo's test suite and doc checkers.
5. **`/deep-review` convergence.** Keep orchestration artifacts in a scratchpad, never under `.deep-review/tmp` — the run fingerprint counts untracked files, so writing there invalidates the round.
6. **Version bump.** Diet only is a patch; adding a `references/` split is a minor. Then sweep the **whole** version surface: the pilot's `check:version-sync` covered three manifests, the real surface was seven files, and bumping only three left the branch red.

   | Site | Covered by the checker? |
   |---|---|
   | `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `package.json` | yes |
   | envelope fixture `producer_version` (must equal `plugin.json.version`) | no |
   | `RELEASE_VERSION` constant in the release-validator script | no |
   | the two contract tests pinning the version literal | no |

   Enumerate your own repo's sites — a lockfile, extra fixtures — before the release commit. The checker is a floor, not the map.
7. **PR, then squash merge.**
8. **Suite re-pin**: `npm run release:bump -- <plugin> <sha40>`, then `npm run preflight`. `scripts/release-bump.js` writes `.claude-plugin/marketplace.json` only — **`.agents/plugins/marketplace.json` must be synced by hand.** `tests/codex-marketplace-contract.test.js` catches the omission, but not until preflight.

---

## 7. Two verification rules

**An inventory row is a claim, not evidence.** The inventory records what a document *says* the code does, but reviewers read it as a warrant that the behaviour was checked — so a diet that copies rows forward propagates any error into every new site. Verify each row against the source in one pass before review. Cross-repo claims require opening the consumer repo's current source, not reasoning from memory: two pilot rows carried a false 24-hour freshness claim into four sites because the consumer file was never opened, and removing it took three review rounds.

**Every restatement is an attack surface.** A restated contract can only be right or wrong; it can never be more right than the code. Prefer a pointer to the authoritative file — `lib/suite-constants.js`, a `checklist.json`, a schema — and restate only when the reader cannot act without the value in front of them, or when §3 makes it mandatory. That is why REPLACE is worth reaching for even when it saves few bytes: it removes something that can rot.

---

## 8. PR attachments and the CHANGELOG

Every diet PR carries three attachments: the before/after byte table, the contract inventory with a disposition per row, and the per-bucket delete/move summary. Any §4 overrun goes here with its justification.

The CHANGELOG entry stays user-observable and concise, per each repo's own `docs/DOCS_RULE.md`. Byte counts, inventory tallies and review history belong in the PR body — the pilot's first entry carried them into the CHANGELOG and was slimmed in review.

---

## 9. Pilot result — deep-dashboard v1.5.1

| Surface | Before | After | Δ |
|---|---:|---:|---:|
| `CLAUDE.md` + `AGENTS.md` | 17,788 B | 11,110 B | −37.5% |
| Two entry `SKILL.md` files | 17,418 B | 14,139 B | −18.8% |
| **Total always-loaded** | **35,206 B** | **25,249 B** | **−28.3%** |
| `deep-harnessability` description | 655 B | 326 B | −50.2% |
| `deep-harness-dashboard` description | 804 B | 401 B | −50.1% |

All 16 trigger phrases survived verbatim; 64 inventory rows mapped, none unaccounted for.

The interesting number is the one that moved backwards. After review round 2 the two surfaces stood at 9,396 B and 13,219 B — a deeper cut than what shipped. Rounds 3 to 5 **added about 1.7 KB back**, all of it corrected contract text replacing claims the code contradicted. Reaching APPROVE took five `/deep-review` rounds; with the two task-level reviews they produced 13 accepted warnings, and all but one (a CHANGELOG style violation) were restated contracts that did not match the code. The round-4 sweep alone checked 27 such claims, corrected 7 and confirmed 20.

That is the pilot's headline, and why §7 exists: the diet was cheap and the verification was the whole cost.
