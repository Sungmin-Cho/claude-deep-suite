[한국어](./integrated-workflow-guide.ko.md)

# Deep Suite Integrated Workflow Guide

This guide explains how the 6 plugins in deep-suite **work together** during a real project. Rather than listing each plugin's features, it focuses on the integrated flow from a developer's perspective.

> Reflects **deep-work v6.4.2** (Profile schema v3 + `interactive_each_session` + session recommender sub-agent + `--no-ask`/`--recommender`/`--no-recommender` flags + notification system removed; Team/Solo subagent delegation from v6.4.1; Phase Exit Gates from v6.3.1; Phase 5 Integrate from v6.3.0), **deep-review v1.3.4** (Phase 6 subagent delegation from v1.3.3 + v1.3.4 trust-boundary hardening: staged rename precision, allowlist bypass block via pre-existing outside content hash, dirty recovery index/worktree sync, tracked-deleted WIP preservation, macOS bash 3.2 compatibility via TSV temp files, ubuntu + macOS CI matrix; Stage 5.5 recurring findings, entropy retained), **deep-evolve v3.1.1** (v3.1 virtual parallel N-seed exploration with adaptive scheduler, cross-seed forum, cascade synthesis; v3.1.1 hardens stdout metric failure handling, sealed prepare read/write guards, scheduler journal contracts, and package contents; v3.0.x sessions remain supported via VERSION_TIER routing), **deep-docs v1.1.0**, **deep-wiki v1.4.0** (A5 single-source page-level fanout — `wiki-synthesizer mode="analysis"` emits `page_plan` + sub-threshold `inline_bodies`; `wiki-page-writer` workers parallel-generate page bodies (`tools: []`); main aggregates under lock with mandatory C3 concurrency check; ~15min → ~4min target on 295-page wiki while preserving Karpathy's 10-15-page-touch synthesis property. New `partial_fail` sentinel (Step 1.5 cascading + `partial-fail-recovery` repair_reason); optional `<wiki>/.wiki-meta/.config.json` (`a5_fanout_threshold`, `a5_worker_timeout_sec`); Step 7.7.A-F failure handling incl. R4 metadata pipeline recovery; multi-source A4 path byte-identical from v1.3.0. Earlier line: v1.3.0 A4 multi-source synthesizer fanout (Approach B) + hook YAML parser broaden; v1.2.x throughput + lint hardening + ingest-repair self-healing; v1.1.4 `source_hashes` normalization + `.pending-scan` promotion regression guard; v1.1.3 parallel tool dispatch inside `wiki-synthesizer`; v1.1.2 page I/O subagent delegation), **deep-dashboard v1.1.1**.

---

## Plugin Roles at a Glance

```
Development Lifecycle:

  Plan          →      Build        →      Verify       →      Integrate      →    Finish
  ───────────────────────────────────────────────────────────────────────────────────────
  deep-work           deep-work           deep-review       deep-work              deep-work
  (Research            (Implement          (independent      (Phase 5:              (/deep-finish)
   + Plan)              + Test)             review)           AI recommends
                       deep-evolve         deep-dashboard    next step)
                       (autonomous         (harness
                        optimization)       diagnostics)
                                           deep-wiki
                                           (knowledge
                                            accumulation)
```

| Plugin | Core Question | When to Use | Entry Point |
|--------|--------------|-------------|-------------|
| **deep-work** | "How do I design and implement this?" | Every code task — features, bugs, refactors | `/deep-work <task>` |
| **deep-evolve** | "Can I automatically make this better?" | Performance optimization, test improvement, code quality | `/deep-evolve` |
| **deep-review** | "Is this code actually good?" | Pre-PR independent verification | `/deep-review` |
| **deep-docs** | "Do docs match the code?" | Post-change documentation sync | `/deep-docs scan` |
| **deep-wiki** | "How do I preserve what I learned?" | Knowledge accumulation across sessions | `/wiki-ingest <source>` |
| **deep-dashboard** | "Is the harness working well?" | Project health diagnosis, improvement areas | `/deep-harness-dashboard` |

**Note on commands vs skills** — `/deep-harnessability` and `/deep-harness-dashboard` are exposed as plugin **skills** (not top-level commands). Claude Code invokes them via the slash-command interface just like commands; internally they live under `deep-dashboard/skills/`.

---

## Scenario 1: New Feature Development (Full Flow)

### Example: "Add JWT authentication middleware to Express API"

#### Step 1: Analyze, plan, build with deep-work

```bash
/deep-work "Add JWT-based user authentication middleware"
```

deep-work automatically runs the **6-phase** workflow (v6.3.0):

1. **Brainstorm** (skippable) — Why JWT? Session vs JWT tradeoffs. Clarify requirements with the user.
2. **Research** — Deep codebase analysis. Existing middleware patterns, routing structure, test infrastructure, dependencies.
3. **Plan** — Slice-based implementation plan with file-by-file changes, test strategy, ordering. **User approval required.**
4. **Implement** — TDD-enforced per-slice execution. RED (failing test) → GREEN (minimal code) → REFACTOR.
5. **Test** — Full verification: coverage, type checking, linting, Sensor Clean, Mutation Score, Slice Review.
6. **Integrate** *(skippable, new in v6.3.0)* — reads installed deep-suite plugin artifacts and proposes the top-3 next actions (see Scenario 5).

Cross-plugin context is automatically consumed during Research:

- If **`.deep-dashboard/harnessability-report.json`** exists — Research includes hints like "Type Safety 3.2/10 — consider enabling `tsconfig` strict mode".
- If **`.deep-evolve/<session-id>/evolve-insights.json`** exists — Research references prior project insights like "guard-clause pattern was effective here previously".

```
Slice 1: auth middleware skeleton
  → Write test → Verify failure → Implement → Tests pass → Slice Review → Commit

Slice 2: JWT verification logic
  → Write test → ... → Commit

Slice 3: Route protection
  → Write test → ... → Commit
```

#### Step 2: Phase 5 Integrate (or skip)

When Phase 4 (Test) completes, deep-work asks:

```
Phase 5 Integrate — proceed, or skip to /deep-finish?
  [proceed] Read plugin artifacts and get AI recommendations
  [skip]    Go straight to /deep-finish (pass --skip-integrate)
```

Choosing `proceed` triggers the recommendation loop (Scenario 5). Choosing `skip` preserves the legacy `/deep-finish` flow; you can still re-enter later with `/deep-integrate`.

#### Step 3: Independent review with deep-review (typically chosen by Phase 5)

```bash
/deep-review
```

deep-review runs an independent Opus subagent over the full diff:

- **Stage 1** — Detect git state (clean/staged/unstaged).
- **Stage 2** — Load project rules (`.deep-review/rules.yaml`).
- **Stage 3** — Opus subagent reviews the diff (optionally 3-way cross-verification when Codex plugin is installed).
- **Stage 4** — Verdict: APPROVE / CONCERN / REQUEST_CHANGES.
- **Stage 5.5** *(only once 2+ review reports exist)* — Aggregates recurring patterns across historical reports into `.deep-review/recurring-findings.json`. The next deep-evolve session reads this file to steer experiment direction.

deep-review also writes `.deep-review/fitness.json` for architecture fitness rules consumed by later reviews and the dashboard.

#### Step 4: Sync docs with deep-docs

```bash
/deep-docs scan
```

Scans CLAUDE.md, README, API docs for drift from code. Auto-fixable items are repaired with `/deep-docs garden`. The scan writes `.deep-docs/last-scan.json` (includes HEAD SHA + branch) for deep-dashboard to consume.

#### Step 5: Accumulate knowledge with deep-wiki

```bash
/wiki-ingest .deep-work/<session-dir>/report.md
# or pass the whole session folder — the ingest picks up report.md automatically
/wiki-ingest .deep-work/<session-dir>/
```

Ingests the deep-work session report into the wiki. Patterns, decisions, and tradeoffs from the JWT implementation are permanently preserved.

> `/wiki-ingest` accepts a URL, a file path, or a deep-work session folder. It does **not** accept `session-receipt.json` directly — pass `report.md` or the session directory.

#### Step 6: Close the session

```bash
/deep-finish
```

The standard 4-option finish menu (merge / PR / keep / discard) runs unchanged.

---

## Scenario 2: Performance Optimization (deep-evolve focused)

### Example: "Automatically minimize ML model val_bpb"

#### Step 1: Start a deep-evolve session

```bash
/deep-evolve
```

deep-evolve creates a new session directory `.deep-evolve/<session-id>/` and records `session_id` in `.deep-evolve/current.json`. Inside the session root it generates:

- `prepare.py` (or `prepare-protocol.md` for MCP/tool-based evaluation)
- `program.md` (experiment instructions)
- `strategy.yaml` (strategy parameters)
- `runs/`, `code-archive/` sub-directories

Cross-plugin data is utilized automatically:

- If `.deep-review/recurring-findings.json` exists → Stage 3.5 reads it to bias `prepare.py` scenario weights and injects a "known recurring defects" section into `program.md`.
- If the meta-archive has a similar project → transfers validated `strategy.yaml` initial values.

#### Step 2: Autonomous experiment loop

```
Inner Loop (code evolution, v3 flow):
  Idea ensemble (3 candidates) → Category tagging (1.5, v3) → Select 1
  → Code modification → Commit → Evaluate → Delta measurement (4.5, v3)
  → Diagnose gate (5.a, v3; crash/severe-drop → 1 retry)
  → Score compare → Shortcut detector (5.c, v3; flag tiny-change + big-jump)
  → Legibility gate (5.d, v3; rationale required on keep)
  → Persist: Keep / Discard / Hard-reject-flagged → Repeat (20 rounds)

  Step 6.a.5 (v3): 3 cumulative flagged keeps → force Section D prepare expansion
  with adversarial scenarios derived from flagged commits' diffs.

Outer Loop (strategy evolution):
  20 Inner Loop rounds → Meta Analysis → Adjust strategy.yaml (with entropy overlay, v3)
  → Compute Q(v) → Strategy improved? Keep : Restore previous strategy
  → Stagnation OR flagged density? Tier 3 prepare expansion with flagged evidence injection (v3)
  → Epoch transition → Resume Inner Loop
```

**v3 silent-failure defenses**: entropy_snapshot event per generation catches
exploration collapse; shortcut detector + forced Section D prevent the agent
from passing adversarial harness via score-vs-LOC heuristic; diagnose-retry
recovers ideas whose only problem was environment/hyperparameter; legibility
gate (`session.legibility.missing_rationale_count`) surfaces unexplainable keeps.

#### Step 3: Completion & cross-plugin integration

When experiments complete, deep-evolve writes into the **session root**:

1. `.deep-evolve/<session-id>/evolve-receipt.json` — deep-dashboard collects it. In v3 the receipt carries the session's actual `deep_evolve_version` (previously hardcoded `"2.2.2"`).
2. `.deep-evolve/<session-id>/evolve-insights.json` — surfaced to the next deep-work Research phase.
3. **v3 Signals section** in the final report (only on v3 sessions): idea entropy trajectory, shortcut flagged count, hard-rejected (`flagged_unexplained`) keeps, diagnose-retry usage, rationale missing count, Section D forced triggers, Tier 3 flagged-trigger fires.
4. Completion menu (6 options):
   - "deep-review then merge" — independent verification before auto-merge
   - "deep-review then create PR" — independent verification before PR
   - "merge to main" / "create PR" / "keep branch" / "discard"

---

## Scenario 3: Project Health Diagnosis

### Example: "Understand overall project state and identify improvement areas"

#### Step 1: Harnessability diagnosis

```bash
/deep-harnessability
```

Automatically analyzes 6 dimensions:

- Type Safety, Module Boundaries, Test Infrastructure, Sensor Readiness, Linter & Formatter, CI/CD
- Each scored 0-10 by computational detectors
- Results saved to `.deep-dashboard/harnessability-report.json`

#### Step 2: Unified dashboard

```bash
/deep-harness-dashboard
```

Aggregates data from all plugins into a single effectiveness score:

```
+------------------------------------------------------+
|  Deep-Suite Harness Dashboard                        |
+------------------------------------------------------+
|  Topology: nextjs-app  Harnessability: 7.4/10 Good   |
+------------------------------------------------------+
|  Health Status                                       |
|  dead-export        clean                            |
|  dependency-vuln    ! 2 critical (npm audit)         |
+------------------------------------------------------+
|  Evolve                                              |
|  Experiments   80 (keep: 25%, crash: 6%)             |
|  Quality       78/100                                |
+------------------------------------------------------+
|  Effectiveness: 7.1/10                               |
+------------------------------------------------------+
|  Suggested actions                                   |
|  - npm audit fix (2 critical vulnerabilities)        |
|  - Review strategy.yaml - Q(v) declining             |
+------------------------------------------------------+
```

**5-dimension weighted score**: health(0.25) + fitness(0.20) + session(0.20) + harnessability(0.15) + evolve(0.20)

#### Step 3: Act on suggestions

Follow the dashboard's recommended actions using other plugins:

- "npm audit fix" → run directly
- "Run /deep-evolve with meta analysis" → `/deep-evolve`
- "Add tests in next deep-work session" → `/deep-work "improve test coverage"`

---

## Scenario 4: Knowledge Accumulation & Reuse

### Example: "Permanently preserve technical documents, session results, and external resources"

#### Accumulate external knowledge

```bash
# URL
/wiki-ingest https://martinfowler.com/articles/harness-engineering.html

# Local file
/wiki-ingest docs/architecture-decision.md

# deep-work session folder — picks up report.md automatically
/wiki-ingest .deep-work/<session-dir>/

# Or point directly at report.md
/wiki-ingest .deep-work/<session-dir>/report.md
```

The wiki creates/updates pages per source. **Pages accumulate knowledge** as more sources land on the same topic (accumulation principle).

#### Search & leverage knowledge

```bash
/wiki-query "What are the pros and cons of refresh token rotation in JWT auth?"
```

Generates answers grounded in wiki content with inline citations. When cross-page insights emerge from 2+ pages, a synthesis page is automatically created and filed back into the wiki.

#### Wiki health management

```bash
/wiki-lint
```

Detects contradictions, broken links, stale content, and orphan pages.

---

## Scenario 5: Phase 5 Integrate — AI Recommendation Loop

*(new in deep-work v6.3.0)*

### Purpose

After a deep-work session completes (Phase 4 Test), you often face the decision *"what should I run next?"* — `/deep-review`? `/deep-docs`? `/wiki-ingest`? `/deep-harness-dashboard`? Phase 5 Integrate reads the artifacts that installed deep-suite plugins have already produced and lets an LLM rank the top-3 next actions with rationale.

### How to enter

**Automatic (recommended):** After Phase 4, deep-work asks whether to proceed into Phase 5. Choose `proceed`.

**Skip at entry:** Pass `--skip-integrate`:

```bash
/deep-work --skip-integrate "<task>"
```

**Manual re-entry:** Even after skipping, you can call Phase 5 from an active session at any time:

```bash
/deep-integrate
```

Requires an active deep-work session with Phase 4 complete. Without one, the command exits with an error.

### UX — top-3 loop

Phase 5 repeatedly:

1. **Gathers signals** from `$WORK_DIR/session-receipt.json`, `.deep-review/recurring-findings.json`, `.deep-review/fitness.json`, `.deep-dashboard/harnessability-report.json`, `.deep-docs/last-scan.json`, `.deep-evolve/<session-id>/evolve-insights.json`, `.wiki-meta/index.json`, and `git diff`. Missing files are read as `null` (fail-safe).
2. **Asks the LLM** to rank the top-3 next actions with a rationale and the signals used.
3. **Renders** the top-3 plus `[skip] [finish]`.
4. **You pick** one; the selected command runs; the plugin updates its own artifacts.
5. **Loop** with the updated signals — up to **5 rounds**.

### Loop state file

Phase 5 writes incrementally to `$WORK_DIR/integrate-loop.json` — one entry per round (plugin, command, outcome, timestamp) plus the last recommendations cached for re-display. On Ctrl-C or session interruption, the Stop-hook records `terminated_by: "interrupted"` so the next `/deep-integrate` can offer "resume / restart / skip".

### Termination conditions

| Reason | Meaning |
|--------|---------|
| `user-finish` | User selected "finish" |
| `max-rounds` | 5-round hard cap reached |
| `no-more-recommendations` | LLM returned empty `recommendations[]` |
| `interrupted` | Ctrl-C or session end |
| `error` | LLM/tool failure after retry (Phase 5 is closed via `--skip-integrate` fallback) |

### Typical recommendation examples

| Signal | Top-3 likely |
|--------|--------------|
| `files_changed > 0` + docs changed | deep-docs scan, deep-review, wiki-ingest |
| `weakest_dimension="documentation"` in dashboard | deep-docs scan, deep-harness-dashboard, wiki-ingest |
| `recurring-findings.json` has 3+ findings, deep-evolve missing | Install deep-evolve *(installation suggestion, not a direct action)* |
| `files_changed=0` | Single lightweight action + `finish_recommended: true` |

### What changes in deep-finish

`/deep-finish` now hints `/deep-integrate` if no `integrate-loop.json` exists for the current session. You can ignore the hint and proceed; it is non-blocking.

---

## Cross-Plugin Data Flow (v6.3.0)

```
deep-work ────────── receipts ──────────→ deep-dashboard (collection)
deep-docs ────────── last-scan.json ────→ deep-dashboard (collection)
deep-evolve ──────── evolve-receipt ────→ deep-dashboard (collection)
                     (per-session dir)

deep-review ──────── recurring-findings → deep-evolve (experiment steering)
deep-evolve ──────── evolve-insights ───→ deep-work Research (context)
                     (per-session dir)
deep-evolve ──────── review trigger ────→ deep-review (pre-merge verification)
deep-dashboard ───── harnessability ────→ deep-work Research (context)

Phase 5 reads ALL of the above + git signals → AI ranks next action (loop)
```

Absolute path reference:

| Artifact | Location |
|----------|----------|
| deep-work receipts | `$WORK_DIR/session-receipt.json`, `$WORK_DIR/receipts/SLICE-*.json` |
| deep-work report | `$WORK_DIR/report.md` (`$WORK_DIR = .deep-work/<YYYYMMDD-HHMMSS-slug>/`) |
| deep-work Phase 5 loop | `$WORK_DIR/integrate-loop.json` |
| deep-review findings | `.deep-review/recurring-findings.json` (Stage 5.5, needs 2+ reports) |
| deep-review fitness | `.deep-review/fitness.json` |
| deep-review reports | `.deep-review/reports/<timestamp>-review.md` |
| deep-docs scan | `.deep-docs/last-scan.json` |
| deep-dashboard | `.deep-dashboard/harnessability-report.json` |
| deep-evolve pointer | `.deep-evolve/current.json` (`session_id`) |
| deep-evolve session | `.deep-evolve/<session-id>/evolve-receipt.json`, `.deep-evolve/<session-id>/evolve-insights.json` |
| deep-wiki index | `<wiki-root>/.wiki-meta/index.json` |

Each plugin operates **independently** and communicates via JSON files. Missing plugins degrade gracefully — Phase 5 treats absent artifacts as `null` and just narrows its recommendation pool.

---

## Usage Guide by Complexity

### Quick bug fix (~30 min)

```bash
/deep-work --skip-integrate "fix login 500 error"
# → Research → Plan → Implement (TDD) → Test → /deep-finish
# Optional: /deep-review before commit if the fix touches critical code
```

deep-work alone is sufficient. Skip Phase 5 for trivial changes.

### Medium feature (2-4 hours)

```bash
/deep-work "add Stripe payment integration"
# → Full 6-phase (Brainstorm → ... → Test → Integrate)
# Phase 5 usually recommends:
#   1. /deep-review     (new code path, payment = critical)
#   2. /deep-docs scan  (docs likely touched)
#   3. /wiki-ingest     (preserve the decision rationale)
# → /deep-finish
```

deep-work + deep-review + deep-docs + wiki-ingest, coordinated via Phase 5.

### Large-scale optimization (half-day+)

```bash
# 1. Diagnose current state
/deep-harness-dashboard

# 2. Autonomous optimization
/deep-evolve "achieve 90% test coverage"
# → dozens of experiments, session at .deep-evolve/<session-id>/

# 3. Verify results
# → at completion menu, select "deep-review then merge"

# 4. Accumulate learnings
/wiki-ingest .deep-evolve/<session-id>/    # session folder works directly
```

Full plugin stack. Dashboard for diagnosis → Evolve for autonomous improvement → Review for verification → Wiki for accumulation.

### Phase 5 ad-hoc consultation

```bash
# During an existing deep-work session that skipped Phase 5
/deep-integrate
```

Gets an AI recommendation for the current snapshot of artifacts — useful when you're mid-session and wondering which plugin to call next.

---

## Tips

1. **Let Phase 5 drive the suite** — the integrated recommender already knows which artifacts exist and what the latest diff looks like. Override its top-3 only when you have a specific reason.

2. **Run deep-review before PRs** — an independent Opus subagent catches what self-review misses. Install the Codex plugin for 3-way cross-verification.

3. **Use deep-evolve with measurable goals** — "make the code better" is too vague. "Minimize `val_bpb`" or "100% pass rate on scenario suite" gives the agent a clear target.

4. **Run /deep-harness-dashboard weekly** — trend tracking exposes regressions in harness effectiveness before they compound.

5. **Accumulate everything in deep-wiki** — today's struggle is tomorrow's asset. Session reports, external docs, and technical decisions in the wiki compound over time. Phase 5 will surface wiki-ingest as a top recommendation when it sees a session report that has not yet been archived.
