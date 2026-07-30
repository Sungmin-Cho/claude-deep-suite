[한국어](./context-engineering.ko.md)

# Context Engineering for the Deep Suite

How to keep always-loaded context — `CLAUDE.md`, `AGENTS.md`, skill bodies, skill `description` frontmatter — small enough that a Claude 5-generation model reads all of it, and dense enough that nothing load-bearing is lost.

From [The New Rules of Context Engineering for Claude 5-Generation Models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models) (Thariq Shihipar, Anthropic, 2026-07-24), validated on the deep-dashboard pilot (§9). Design record: `docs/superpowers/specs/2026-07-27-context-engineering-refactor-design.md` — maintainer-local, gitignored, not present in a clone.

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

KEEP is not keep-verbatim. The pilot's "Loaded-SKILL routing handoff" section went from 36 lines to 20 by collapsing two per-host tutorial bullets and a caution paragraph into one constraint paragraph, and dropping a cross-reference the same file already made. Every constraint survived — the `dirname` derivation, the Codex-has-no-`CLAUDE_*` fact, "never infer a root from cwd", both fallback command lines verbatim — only the tutorial around them went.

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

**Contract fidelity beats bytes.** deep-dashboard shipped at 11.1 KB combined — roughly 5 KB over even the ~6 KB it was granted up front. All the residual is KEEP text: fifteen enumerated `EXPECTED_SOURCES`, five envelope read guards plus the silent-null policy, nine gotchas. The one lever identified — `EXPECTED_SOURCES` as a pointer — was deliberately left unpulled and recorded in the PR, but it is worth only ~0.4 KB and would not have come close to the target. That is the honest shape of the overrun: **5 KB over with no lever that closes it**, not a discretionary trim someone forgot to make. The ruling: **size guides are soft, the KEEP list is hard.** Record the overrun and any lever you declined; do not force the number.

**Description halving has a floor.** Trigger lists are immovable and were ~30% of description bytes in the pilot. Both reached −50.2% and −50.1% only because the framing shrank too (`Trigger phrases include ` → `Triggers on `; the "This skill should be used when the user…" preamble → one verb-first clause). Where the trigger list is longer, half is arithmetically unreachable without cutting triggers, which §3 forbids. Record the overage instead.

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
5. **`/deep-review` convergence.** Keep orchestration artifacts in a scratchpad — the run fingerprint counts untracked files, so writing under `.deep-review/tmp` invalidates the round. Only the SSOT-mandated statics belong there (routing plan, context, diff), and only written before pre-capture. Two operational failures cost the pilot whole rounds: a reviewer adapter that localizes its approve-empty section (`"(없음)"`) is dropped by the strict canonical parser, which voids an expansion round even though the reviewer approved; and codex-cli version drift breaks `--output-last-message` capture, in which case the canonical report is recoverable verbatim from the bridge's stdout.
6. **Version bump.** Diet only is a patch; adding a `references/` split is a minor. Then sweep the **whole** version surface: the pilot's `check:version-sync` covered three manifests, the real surface was seven files, and bumping only three left the branch red.

   | Site | Covered by the checker? |
   |---|---|
   | `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `package.json` | yes |
   | envelope fixture `producer_version` (must equal `plugin.json.version`) | no |
   | `RELEASE_VERSION` constant in the release-validator script | no |
   | the two contract tests pinning the version literal | no |

   Enumerate your own repo's sites — a lockfile, extra fixtures — before the release commit. The checker is a floor, not the map.
7. **PR, then squash merge.**
8. **Suite re-pin**: `npm run release:bump -- <plugin> <sha40>`, then `npm run preflight`. `scripts/release-bump.js` writes `source.sha` into **both** manifests — `.claude-plugin/marketplace.json` and the Codex mirror `.agents/plugins/marketplace.json` — and validates both before writing either, so a plugin missing from one manifest cannot leave the two pinned to different commits. `tests/codex-marketplace-contract.test.js` deep-compares `source` and `description` as the backstop.

---

## 7. Verification

**An inventory row is a claim, not evidence.** The inventory records what a document *says* the code does, but reviewers read it as a warrant that the behaviour was checked — so a diet that copies rows forward propagates any error into every new site. Verify each row against the source in one pass before review. Cross-repo claims require opening the consumer repo's current source, not reasoning from memory: two pilot rows carried a false 24-hour freshness claim into four sites because the consumer file was never opened, and removing it took three review rounds.

**Every restatement is an attack surface.** A restated contract can only be right or wrong; it can never be more right than the code. Prefer a pointer to the authoritative file — `lib/suite-constants.js`, a `checklist.json`, a schema — and restate only when the reader cannot act without the value in front of them, or when §3 makes it mandatory. That is why REPLACE is worth reaching for even when it saves few bytes: it removes something that can rot.

**"Not independently verified" is a blocker, not a disclosure — when the row feeds an emitted artifact.** Honest bookkeeping is not a substitute for verification. deep-goal's first pass marked two rows unverified and low-risk; the second pass checked them and found one was not merely unverified but flatly wrong, and it had already been compiled into two shipped conditions.

**Name which axes you checked.** A cross-plugin row has five: path, producer, `artifact_kind`, `schema.version`, payload shape. A bare "MATCH" hides which of the five you looked at. deep-memory's `wiki-index` row verified the path, wrote MATCH, and was read for months as a warrant that the contract had been checked; the integration had never worked.

**For a consumer of unattended output, interactivity is a sixth axis.** Ask explicitly: *does this sibling stop and ask mid-run?* Four of six defects in one deep-goal round fell out of that single question. It fails silently — no exception, no red test, just a run parked at a prompt burning its cap.

**Copy cross-plugin fixtures from the producer.** A fixture hand-written to the consumer's assumption produces a green test over a dead integration. `sample-wiki-index.json` disagreed with its producer on all three axes and `harvest-golden.test.js` asserted two cards from it — passing every day, proving nothing.

**Run a closing sweep.** After the last correction commit, grep the whole repo for the claim you just corrected — not the files you just edited. Per-file verification of the files a commit *touched* cannot find the file a commit *forgot*. deep-goal's recipe index was skipped by three consecutive correction passes and accumulated three stale claims, one per round, while every pass verified the file beside it. Both the implementer and the reviewer missed it. The first sweep run under this rule found **14 more sites across six files that had already been called done**.

The scope is every repo that *quotes* the claim, not the repo that *owns* it. One stale sentence about a release script was corrected in this repo and survived in four plugins that had copied it, three of them already released. And the sweep must enumerate files, not patterns you expect: the sweep for that same correction ran a list of greps and never touched `CONTRIBUTING.md`, so the one file written for people who only have a clone kept telling them to read a rulebook that is not in a clone. `git grep -n <term>` finds what a curated pattern list does not.

**Mutate every assertion you add.** An axis that is produced but never asserted looks like coverage and is not — the shape that let 38 anchoring violations sit unnoticed in the first place. Two live instances were found in one ported guard by mutation and neither by reading: a symlink check emitted at two sites and asserted at zero, and a caveat regex that pinned a provenance label so the protective sentence beneath it could be deleted with every test still green.

**An emulation over inputs that cannot differ is decorative.** Mutation asks whether an assertion *can* fail; this asks whether the input you fed it can even reach the difference. Three repos got a Windows-spelling assertion that ran the real derivation with `path.win32.relative` — and could not fail, because the paths it checked were root-level filenames with no separator to get wrong. The same trap appeared one level down: a non-vacuity pair written with a slash-shaped token passed whether or not the token was normalised, because the un-normalised key set missed either way. In both cases the fix was to pick the input where the spellings actually diverge — a nested path, a backslash token — and to add the guard that says so (`assert.ok(nested, 'or the next assertion proves nothing')`). Choose the input adversarially, then mutate.

**Never trust a single green run — repeat it.** One run misses races. A guard that planted its symlink fixture inside the repository tree passed alone but was **5/20 flaky** under repetition: parallel test processes copy the tree, and the copy walked a directory being created and deleted. A security guard that fails a quarter of the time is worse than none, because it trains you to re-run until green — and that habit passes real regressions. Plant fixtures in `tmpdir`, not in the repository tree.

**Everyone gets corrected.** Across one wave, seven assertions were overturned by verification: four from the controller, two implementer self-retractions, two reviewer self-corrections. No role is exempt, and a complying implementer would have shipped every one of the controller's. The loop's value is not that the controller is right — it is that both directions get checked.

---

## 8. PR attachments and the CHANGELOG

Every diet PR carries three attachments: the before/after byte table, the contract inventory with a disposition per row, and the per-bucket delete/move summary. Any §4 overrun goes here with its justification, and with the unit stated — 4 KiB and 4,000 decimal give visibly different overrun percentages.

**Generate the byte table last, after the final commit lands, and record the HEAD it was measured at.** Every correction changes it. One repo's figure was revised twice — reduction, then flat, then growth — and all three were correct at the tree they were measured against; the fault was measuring before the last commit. The same slip happened four times in one wave, once inside the very commit written to fix it. State the honest direction even when it is growth: on two repos the corrections cancelled the diet outright, and saying so is more useful than a number that was true for an hour.

The CHANGELOG entry stays user-observable and concise, per each repo's own `docs/DOCS_RULE.md` where present (deep-loop has none). Byte counts, inventory tallies and review history belong in the PR body — the pilot's first entry carried them into the CHANGELOG and was slimmed in review.

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

The interesting number is the one that moved backwards. After review round 2 the two surfaces stood at 9,645 B and 13,878 B — a deeper cut than what shipped. Rounds 3 to 5 **added about 1.7 KB back**, all of it corrected contract text replacing claims the code contradicted. Reaching APPROVE took five `/deep-review` rounds; with the two task-level reviews they produced 13 accepted warnings, and all but one (a CHANGELOG style violation) were restated contracts that did not match the code. The round-4 sweep alone checked 27 such claims, corrected 7 and confirmed 20.

That is the pilot's headline, and why §7 exists: the diet was cheap and the verification was the whole cost.

---

## 10. Wave result — nine repos, and what the numbers actually say

| Repo | Always-loaded before | after | Δ |
|---|---:|---:|---:|
| deep-suite | 16,243 B | 8,026 B | **−50.6%** |
| deep-dashboard | 35,206 B | 25,249 B | −28.3% |
| deep-goal | 26,999 B | 21,728 B | −19.5% |
| deep-evolve | 13,386 B | 14,581 B | **+8.9%** |
| deep-memory | 31,618 B | 38,503 B | **+21.8%** |

Five repos, each measured with `git cat-file -s` against the merged `main` — deep-suite `6a94191`, deep-dashboard `a065f27`, deep-goal `883f158`, deep-evolve `a5a6dce`, deep-memory `6c665a9`. Read from a working tree the numbers move: a concurrent reviewer planting a probe line shifted one row by 36 B mid-measurement. The spread is the result. Do not read the negatives as success and the positives as failure — read the ordering.

**What shrank was framing; what grew was contract.** deep-suite fell by half because it carried an annotated directory tree, a duplicated release procedure and a `CLAUDE.md` that had never been split — all DELETE-bucket. deep-memory grew by a fifth because verification found five cross-plugin claims the code contradicted, one integration that had never worked, and a skill description promising to erase data the script does not touch. The buckets found roughly 1.2 KB of framing to remove there; the corrections put roughly 4.5 KB back.

So the honest statement of what this method does: **it is a verification pass with a diet attached, not the other way round.** Budget accordingly. On a young or metadata-heavy repo expect a real cut. On a mature plugin with many sibling contracts, expect growth, and expect the growth to be the valuable part.

**The second-order result is stronger than the byte counts.** Across the wave, verification overturned assertions from every role — the controller's, the implementers', and the reviewers' — repeatedly, and in both directions. A reviewer's Critical was refuted by probe; a controller's adjudication was refuted by opening the one file it had not opened; implementers retracted their own claims mid-round. No role's output was reliable on its own, and the loop's value was never that any participant was right. It was that both directions got checked.

The recurring shapes, each of which cost at least one round to learn:

- A layer that still fires **hides** the layer that stopped. Count failures and you will call a regression "caught"; name the tests that fired and you will see which one went quiet.
- A test can be **implemented but unproven** — an axis produced and asserted nowhere. Only per-axis mutation finds it, and defence in depth is what conceals it.
- A **non-vacuity mutation must move in the direction the assertion guards against.** An assertion that nothing is flagged is proven only by making something get flagged.
- A claim corrected in the repo that **owns** it survives in every repo that **quoted** it. One stale sentence about a release script reached four plugins, three of them already released, in a few hours.
- **Never trust a single green run.** One guard was 5/20 flaky; a guard that fails a quarter of the time trains you to re-run until green, which is the habit that passes real regressions.
- An **enumeration is the defect class of this wave.** Command verbs, prefix characters, fixture plant lists, syntactic forms — every enumeration found was fail-open, and for each one a sibling repo already held the structural form that replaced it. When you catch yourself writing a list of the cases that count, ask what property they share.
- A test can be **decorative rather than merely unproven**: it runs the real code, it mutates cleanly in principle, and the input it was given cannot reach the difference. Two layers of this wave's assertions passed mutation-by-intent and failed mutation-by-measurement. Pick the input adversarially first.
- **A structural rule still has a domain, and the domain is where it fails.** Replacing a command-verb list with "an anchor inside an inline code span is a command context" was the right move and it closed the verbs — but inline spans are the *minority* case. Commands are written in fenced blocks, a fenced line carries no backticks of its own, and the code fell back to the very list the rule had replaced. Measured: a fenced `cp '<anchor>/<script>' /tmp/x` was flagged by no layer in three repos at once. After replacing an enumeration, ask where the replacement does not apply — that is where the old fallback still runs.
- **The replacement can carry the same defect inside it.** Widening the command-context rule to fenced blocks needed a way to skip blocks that are not shell — and what got written was a list of exempt languages. That list is the enumeration again, one level down: exempting `python`, `js`, `diff` or `markdown` asserts *an anchor is safe here*, and in every one of them a single-quoted anchor is exactly as literal, and as workspace-relative, as it is in shell. The fix was to delete the list rather than correct it — the question was never which language, but whether anything expands the anchor, which the existing quote-state function already answered. Removing it produced zero new findings across three repos' shipped documents, so it had been buying nothing and costing a fail-open surface. When you replace an enumeration, check whether your replacement needed one to work.
- **A measurement that cannot run reads exactly like a measurement that found nothing.** Two sessions independently concluded that a repo had no anchor convention. Both were wrong, in mirror-image ways: one grep listed the hyphen spelling and not the underscore, the other the reverse. Replacing the list with a *shape* — anything sigil-wrapped that ends in `root` — fixed those two and silently missed a third repo whose anchor is a bare identifier, 181 occurrences of it. Fixing the shape then produced empty output for that same repo because the command named `agents/ commands/` in its pathspec, the repo has neither, `git grep` failed, and `2>/dev/null` ate the error. Three failures, one cause: the probe kept encoding an expectation, and every failure mode returned *zero* rather than an error. Prefer a sweep that cannot be narrowed by what you expected — enumerate from the repo, filter afterwards — and treat a zero from any probe as unproven until something non-zero has come out of the same command.
- **Asking an authority is right, but pick the authority that answers *your* question.** A rule needed to know which gitignored directories a plugin writes *into the analysed project*. Two authorities were available and each was wrong alone. The suite's `.deep-*` naming convention missed a directory the plugin genuinely writes there under another name — a convention is still a guess. Asking the code instead ("does the runtime join this onto a root?") caught it, and then classified a maintainer-time release gate reading *this repo's own* root as a workspace output — silencing the rule for the exact class it existed for. Name shape cannot tell two roots apart. The rule is the union of both, with each half's failure pinned by an assertion. When you reach for an authority, check that it distinguishes the cases you care about, not merely that it is more objective than a list.
- **A fix for an over-flag can install an under-flag, and the rationale is where to look.** Narrowing a rule to kill a false positive silenced a real detection, and the sentence justifying the narrowing — *a quote that genuinely opens a string is never flanked by word characters on both sides* — was simply false; four seconds in a shell showed `a'b …` opening one. The correct rule was available from the same source: prose with an odd number of apostrophes is a **syntax error**, so it can never be an instruction that runs, and asking whether the line parses is both narrower and right. When a rule has an authority — a shell, a grammar, a manifest — ask it rather than reasoning about what it would say. Every claim in a comment justifying a security rule is a claim you can test.
- The **closing sweep must enumerate, not pattern-match.** A sweep for the corrected expression found one site and left three; `git grep` for the *shape of the comparison* found all four. The site a sweep forgets is the site CI finds.
