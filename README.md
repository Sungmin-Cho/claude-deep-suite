**English** | [한국어](./README.ko.md)

# Claude Deep Suite

A unified [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin marketplace that bundles six complementary plugins for structured development, persistent knowledge management, autonomous experimentation, independent code review, document gardening, and harness diagnostics.

## Plugins

| Plugin | Version | Description |
|--------|---------|-------------|
| [deep-work](https://github.com/Sungmin-Cho/claude-deep-work) | 6.4.2 | Evidence-Driven Development Protocol (Brainstorm → Research → Plan → Implement → Test → **Integrate**) |
| [deep-wiki](https://github.com/Sungmin-Cho/claude-deep-wiki) | 1.4.1 | v1.4.1 — Track C synthesizer agent split for trust-boundary closure |
| [deep-evolve](https://github.com/Sungmin-Cho/claude-deep-evolve) | 3.1.1 | Autonomous Experimentation Protocol — virtual parallel N-seed, adaptive scheduler, hardened scoring/guard contracts |
| [deep-review](https://github.com/Sungmin-Cho/claude-deep-review) | 1.3.4 | Independent Evaluator with cross-model verification + Phase 6 subagent delegation (hardened) |
| [deep-docs](https://github.com/Sungmin-Cho/claude-deep-docs) | 1.1.0 | Document gardening agent |
| [deep-dashboard](https://github.com/Sungmin-Cho/claude-deep-dashboard) | 1.1.1 | Cross-plugin harness diagnostics |

---

## Installation

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed and configured

### Add the marketplace

```bash
/plugin marketplace add Sungmin-Cho/claude-deep-suite
```

### Install plugins

```bash
# Install all
/plugin install deep-work@Sungmin-Cho-claude-deep-suite
/plugin install deep-wiki@Sungmin-Cho-claude-deep-suite
/plugin install deep-evolve@Sungmin-Cho-claude-deep-suite
/plugin install deep-review@Sungmin-Cho-claude-deep-suite
/plugin install deep-docs@Sungmin-Cho-claude-deep-suite
/plugin install deep-dashboard@Sungmin-Cho-claude-deep-suite

# Or install only what you need
/plugin install deep-work@Sungmin-Cho-claude-deep-suite
```

---

## Harness Engineering Architecture

Deep Suite implements the [Harness Engineering](https://martinfowler.com/articles/harness-engineering.html) framework (Böckeler/Fowler, 2026) — the principle that **Agent = Model + Harness**. Each plugin occupies a specific role in the 2×2 matrix of Guides (feedforward) × Sensors (feedback), across Computational (deterministic) and Inferential (LLM-based) control.

### 2x2 Matrix: Where Each Plugin Lives

```
                +---------------------------+---------------------------+
                |  Computational            |  Inferential              |
+---------------+---------------------------+---------------------------+
|               |                           |                           |
|  Guides       |  deep-work                |  deep-work                |
|  (Feedforward |  +- Phase Guard hook      |  +- research/plan/brain   |
|   Control)    |  +- TDD state machine     |  +- Sprint Contract       |
|               |  +- Topology templates    |                           |
|               |                           |  deep-wiki                |
|               |                           |  +- Persistent knowledge  |
|               |                           |                           |
|               |                           |  deep-docs                |
|               |                           |  +- Document freshness    |
+---------------+---------------------------+---------------------------+
|               |                           |                           |
|  Sensors      |  deep-work                |  deep-review              |
|  (Feedback    |  +- Linters + typecheck   |  +- Opus code review      |
|   Control)    |  +- Coverage + mutation   |  +- 3-way cross-model     |
|               |  +- 4 drift sensors       |  +- SOLID + entropy       |
|               |  +- Fitness rules         |                           |
|               |  +- review-check sensor   |  deep-work                |
|               |                           |  +- Drift check           |
|               |  deep-docs                |                           |
|               |  +- Doc freshness scan    |                           |
|               |                           |                           |
|               |  deep-dashboard           |                           |
|               |  +- Harnessability        |                           |
|               |  +- Effectiveness         |                           |
+---------------+---------------------------+---------------------------+
```

### Development Lifecycle Flow

```
 Phase 0     Phase 1      Phase 2    Phase 3        Phase 4     Phase 5
 Brainstorm  Research     Plan       Implement      Test        Integrate
 |           |            |          |              |           |
 |      deep-wiki <-- knowledge --> deep-wiki       |           |
 |           |            |          |              |           |
 |    deep-dashboard      |          |              |           |
 |    (harnessability)    |          |              |           |
 |           |            |          |              |           |
 |    Health Engine       |   SENSOR_RUN pipeline   |           |
 |    +- drift scan       |   +- lint               |           |
 |    +- fitness check    |   +- typecheck          |           |
 |           |            |   +- review-check       |           |
 |      topology -----------> guides.phase3         |           |
 |      detection         |          |              |           |
 |           |            |          |       mutation test      |
 |           |            |          |       fitness delta      |
 |           |            |          |              |           |
 |           |            |          |              |  Phase 5 reads artifacts
 |           |            |          |              |  from installed plugins
 |           |            |          |              |  → LLM ranks next actions
 |           |            |          |              |  → user picks (loop ≤5)
 |           |            |          |              |           |
 +===========+============+==========+==============+===========+====→ /deep-finish
                                                          |
 Continuous: deep-docs (doc scan) <-----------------------+
             deep-dashboard (effectiveness + action routing)
             deep-evolve (autonomous experimentation)
             deep-review (independent Opus verification)
```

### Plugin Data Flow

```
 deep-work ------- receipts -------> deep-dashboard (collector)
    |                                    |
    +-- health_report ----------------> deep-review (fitness-aware review)
    |                                    |
    +-- fitness.json <----------------> deep-review (rule consumption)
    |                                    |
 deep-docs ---- last-scan.json ---> deep-dashboard (collector)
    |                                    |
 deep-evolve -- evolve-receipt ----> deep-dashboard (collector)
    |                                    |
 deep-dashboard                          v
    +-- harnessability ---------------> deep-work Phase 1 (research context)
    +-- effectiveness ----------------> user (CLI report + optional markdown)

 deep-review -- recurring-findings -> deep-evolve (experiment steering)
 deep-evolve -- evolve-insights ---> deep-work (research context)
 deep-evolve -- review trigger ----> deep-review (pre-merge verification)
```

### Framework Coverage

| Dimension | Key Strength |
|-----------|-------------|
| Computational Sensors | 13+ sensors across 5 ecosystems |
| Self-Correction Loop | Multi-round, multi-sensor state machine |
| Harnessability | Quantitative diagnostic tool (6 dimensions) |
| Pre-Integration | Phase Guard + TDD + SENSOR_RUN pipeline |
| Human Steering | Assumption Engine + Dashboard |
| Continuous Timing | Strong static analysis, no runtime monitoring |

### Integrated Workflow — How to Use Them Together

Each plugin works independently, but the real power comes from using them together. Here's how they map to a project lifecycle:

| Plugin | Core Question | When to Use |
|--------|--------------|-------------|
| **deep-work** | "How do I design and implement this?" | Every code task — features, bugs, refactors |
| **deep-evolve** | "Can I automatically make this better?" | Performance optimization, test improvement |
| **deep-review** | "Is this code actually good?" | Pre-PR independent verification |
| **deep-docs** | "Do docs match the code?" | Post-change documentation sync |
| **deep-wiki** | "How do I preserve what I learned?" | Knowledge accumulation across sessions |
| **deep-dashboard** | "Is the harness working well?" | Project health diagnosis |

**By complexity:**

```bash
# Quick fix (30 min) — deep-work alone, skip Phase 5
/deep-work --skip-integrate "fix login 500 error"

# Medium feature (2-4 hours) — Phase 5 orchestrates review/docs/wiki
/deep-work "add Stripe payment integration"
# → Phase 5 recommends /deep-review, /deep-docs scan, /wiki-ingest (top-3 loop)

# Ad-hoc recommendation — any time during an active session
/deep-integrate

# Large optimization (half-day+) — full plugin stack
/deep-harness-dashboard                                  # diagnose project health
/deep-evolve "achieve 90% test coverage"                 # autonomous experiments
# → select "deep-review then merge"                      # auto-verified merge
/wiki-ingest .deep-evolve/<session-id>/                  # preserve learnings
```

For detailed scenarios with step-by-step walkthroughs, see the [Integrated Workflow Guide](guides/integrated-workflow-guide.md).

---

## deep-work

**Evidence-Driven Development Protocol** — a single-command auto-flow orchestration that enforces structured, evidence-based software development.

### The Problem

When AI coding tools tackle complex tasks, they often jump into implementation without understanding the codebase, introduce patterns that conflict with existing architecture, or mark work as done without verification.

### The Solution

`/deep-work "task"` runs the entire **Brainstorm → Research → Plan → Implement → Test → Integrate** pipeline automatically. Code file modifications are physically blocked during non-implementation phases via hooks.

### Key Commands

| Command | Description |
|---------|-------------|
| `/deep-work <task>` | Auto-flow orchestration — runs the full pipeline. Plan approval is the only required interaction. |
| `/deep-work --skip-integrate <task>` | Same, but skip Phase 5 and go straight to `/deep-finish` |
| `/deep-integrate` | Manual Phase 5 — AI recommends top-3 next actions from installed plugin artifacts (re-entry after skip) |
| `/deep-status` | Unified view — progress, report, receipts, history, assumptions |
| `/deep-debug` | Systematic debugging with root cause investigation |
| `/deep-research` | Manual Phase 1 — deep codebase analysis |
| `/deep-plan` | Manual Phase 2 — slice-based implementation planning |
| `/deep-implement` | Manual Phase 3 — TDD-enforced slice execution |
| `/deep-test` | Phase 4 — verification with quality gates |
| `/deep-sensor-scan` | Computational sensor scan — linter, type checker, coverage |
| `/deep-mutation-test` | Mutation testing — AI-generated test quality verification |

### Workflow Phases

```
Phase 0  Brainstorm    Design exploration — "why before how" (skippable)
Phase 1  Research      Deep codebase analysis and documentation
Phase 2  Plan          Slice-based implementation plan (requires user approval)
Phase 3  Implement     TDD-enforced execution — failing test → code → receipt
Phase 4  Test          Receipt check, spec compliance, quality gates
Phase 5  Integrate     Reads installed plugin artifacts → LLM ranks next actions
                       → user picks from top-3 (≤5 rounds). Skippable. (v6.3.0)
```

### Key Features

- **Phase-locked file editing** — code changes blocked outside Phase 3
- **TDD enforcement** — failing test first, then implementation
- **Receipt-based evidence** — every slice collects proof of completion
- **Quality gates** — drift check, SOLID review, insight analysis, Sensor Clean, Mutation Score
- **Computational sensors** — auto-run linter/type checker/coverage with self-correction loop (SENSOR_RUN → SENSOR_FIX → SENSOR_CLEAN)
- **Mutation testing** — auto-verify AI-generated test quality. Survived mutants trigger automatic test regeneration (up to 3 rounds)
- **Auto-flow** — one command drives the entire workflow
- **Completeness Policy** — plan quality enforcement with banned placeholder patterns *(v5.8)*
- **Code sketch tiering** — proportional code detail by slice size (S/M/L) *(v5.8)*
- **Research traceability** — tagged findings [RF/RA] linking research to plan decisions *(v5.8)*
- **Slice Review** — per-slice 2-stage independent review (spec compliance + code quality) immediately after sensor pipeline *(v6.0.1)*
- **Red Flags** — rationalization prevention tables in implement/test phases *(v6.0.1)*
- **Pre-flight Check** — prerequisite verification before each TDD cycle *(v6.0.1)*
- **Phase 5 Integrate** — AI-recommended top-3 next actions (review/docs/wiki/dashboard/evolve) after Test, with interactive loop up to 5 rounds *(v6.3.0)*
- **Team/Solo Delegation** — Research/Implement always delegate to subagents. In team mode Research runs 3-way parallel; Implement prompts to choose Agent Team vs multi-subagent. Solo runs a single agent sequentially. Post-hoc receipt verification enforces TDD contract. *(v6.4.1)*
- **Profile schema v3** — `interactive_each_session` array, `defaults.*` separation, per-item ask each session; v2→v3 auto-migration (atomic write + flock + idempotent + .v2-backup + rollback). *(v6.4.2)*
- **Session recommender sub-agent** — Sonnet default, fenced JSON recommendations, model allowlist `^(haiku|sonnet|opus)$`. New flags: `--no-ask`, `--recommender=MODEL`, `--no-recommender`. *(v6.4.2)*
- **Notification system removed** — notify.sh, notify-parse.test.js, notification-guide.md deleted; webhook integration broken. **Breaking change.** *(v6.4.2)*

[Full documentation →](https://github.com/Sungmin-Cho/claude-deep-work)

---

## deep-wiki

**LLM-managed markdown wiki** for persistent knowledge accumulation — an implementation of [Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) philosophy.

### The Idea

Instead of re-discovering knowledge each time (RAG), Claude Code incrementally builds and maintains a persistent wiki. When you add a new source, the LLM reads it, extracts key information, and integrates it into the existing wiki. The knowledge compounds over time.

### Key Commands

| Command | Description |
|---------|-------------|
| `/wiki-setup <path>` | Initialize wiki directory structure |
| `/wiki-ingest <source>` | Read a source (URL, file, text) and create/update wiki pages |
| `/wiki-query <question>` | Search the wiki and generate grounded answers with citations |
| `/wiki-lint` | Health check — schema violations, orphan pages, broken links |
| `/wiki-rebuild` | Regenerate index from page frontmatter |

### Architecture

```
Raw Sources  →  Wiki (markdown pages)  →  Schema (management rules)
```

- **Flat pages** — tags replace categories, no broken links from moves
- **Auto-lint** — runs after every ingest and rebuild
- **Auto-filing** — query results that synthesize 2+ pages are filed back into the wiki
- **Obsidian-compatible** — works as an Obsidian vault
- **Subagent delegation for page I/O** (v1.1.2) — every ingest dispatches to a dedicated `wiki-synthesizer` agent that owns source reading, create-vs-update judgment, page writing, and version backup; main session keeps only the small metadata footprint (`index.json`, `log.jsonl`, `sources/*.yaml`), which materially reduces context pressure for multi-file SessionStart auto-ingests.
- **Parallel tool dispatch for multi-page ingests** (v1.1.3) — `wiki-synthesizer` now batches all independent tool calls within each workflow phase (source read / candidate survey / backup / page write) in a single message, eliminating the ~3N sequential round-trip tax that previously dominated wall-clock time beyond LLM inference. Cloud-synced `wiki_root` warning added to README.
- **Hash normalization + promotion regression guard** (v1.1.4) — `/wiki-ingest` Step 8d normalizes `source_hashes` by regex-validating each value and recomputing from `origin` when the agent lacks hashing capability, so `sources/*.yaml:content_hash` always reflects a real sha256. Promotion block now reads `.last-scan` before advancing and refuses to regress it, defending against stale `.pending-scan` artifacts from version transitions and manual file mutations.
- **Throughput + lint hardening** (v1.2.0) — Three-axis release after 4-cycle review (49 issues surfaced, 33 fixed, 16 deferred to v1.2.1+/v1.3.0+). **Throughput**: optional `auto_ingest:` config block (path globs + frontmatter-tag opt-in) reduces SessionStart hook call frequency for high-volume low-value paths; `/wiki-ingest` Step 1.5 hash-skip drops `file`/`deep-work-report` sources whose sha256 matches existing `.wiki-meta/sources/<slug>.yaml:content_hash`, with wiki-side state integrity checks (page existence, frontmatter slug, terminal log) gating the skip — failed checks fall through to `ingest-repair` self-heal path; `wiki-synthesizer` Phase 1 candidate survey is now skim-then-deep (top-K ≤ 5) with Phase 1c safety net for skim-skipped supplied candidates. **Lint**: new `[SCAN-WINDOW]` invariant check + `--fix` auto-cleanup for stale `.pending-scan`; orphan classification via `tags: [leaf]` + `lint.orphan_ignore` globs; broken-link scan strips fenced code blocks; `pages_created` same-batch dedup guard preserves the "exactly once across log" invariant for multi-source batches. **`ingest-repair` action** restores wiki state when bytes match but pages are missing/corrupted; `pages_created:[]` constraint preserves the lint Step 6 LOG-INVARIANT (a self-repair is a lifecycle restoration, not a new creation).
- **v1.2.0 backlog closure + cycle-2 critical regression fixes** (v1.2.1) — Patch release after 3-cycle review (14 backlog items + 5 cycle-2 critical regressions + 1 cycle-3 cross-validated config-fail-open). **Hash-skip integrity (Step 1.5 hardening)**: in-batch slug allocator with newline-delimited claim ledger + on-disk yaml lookup correctly handles fresh same-batch basename collisions (R3W1+CR-A); forced `ingest-repair` on `log.jsonl` absence or `no-prior-terminal-log` — yaml is the authoritative provenance record (R3W2+W-α caveat); inline-list yaml parser, single-quote strip mirror, explicit `SKIPPED=()` / `REPAIR=()` init (RW3+RW4+RW7). **Wiki-lint false-positive elimination**: `http(s)://` targets excluded from broken-link check (T10 — closes 5 dogfood false positives); `strip_code_blocks()` becomes block-context-aware with `in_indented_code` state so multi-line indented code is stripped while list continuations are preserved (W7+CR-C). **Per-source provenance**: B5 dual-classification — pre-dedup snapshot for per-source yamls (full attribution), post-dedup arrays for log emission (invariant preserved); length-guarded array literal init replaces broken `("${ARR[@]:-}")` pattern in bash 3.2.57 (CR-B); Step 10 prose updated to reference post-dedup arrays explicitly (CR-D). **Documentation accuracy**: README A5 cloud-mirror `VAULT_ROOT` note (R3W3); auto_ingest pause guidance correction with parser-compatible block-form YAML (R3W4 + cycle-3 hot-fix). **Spec polish**: hook 50-line frontmatter guard reorder + line-1 opening guard prevents body horizontal rule from leaking into frontmatter mode (RW5+CR-E); synthesizer "four to six message boundaries" with Phase 1c breakdown (RW6); Step 10 SKIPPED/REPAIR drain forward-pointer (RW2).
- **A4 synthesizer fanout (Approach B) + hook YAML parser broaden + 6 polish** (v1.3.0) — Architectural minor release after 2-cycle plan-side review (24 → 8 issues, all regressions of Plan #2 fixes) + final-code-reviewer pass (1 Critical fixed pre-push) + post-implementation Cycle 3 (2 ship-blockers fixed, 5 spec-vs-impl drifts deferred to v1.3.1). **Architectural**: `wiki-synthesizer` worker mode (`mode: "worker"` opt-in; default `"inline"` for v1.2.1 byte-identical single-source) — multi-source `/wiki-ingest` splits sources across `min(3, N)` parallel worker subagents (round-robin by sorted origin), workers analyze + return drafts (NO writes), main aggregates via cross-worker B5 dual-classification ledger and writes under existing global lock. Branch-scoped lock acquisition: multi-source Phase 0 (workers see stable wiki snapshot), single-source Phase 3 (v1.2.1 timing, byte-identical). Cross-worker page collision triggers second-pass `wiki-synthesizer` in worker mode with new `colliding_drafts` input field — merges conflicting bodies into one page, preserves v1.2.1 multi-source merge invariant AND single-writer invariant (main writes the merged content in Phase 3). Hardcoded worker cap of 3; configurable knob deferred to v1.4.0+. Hook YAML parser broaden: `auto_ingest.ignore_globs` accepts block + inline + dotted forms (additive union when mixed); same broaden mirrored to `wiki-lint.md` `lint.orphan_ignore` per in-repo "mirror" comment; pre-existing latent multi-item block-list drop bug fixed (missing `next` after `print`). **Polish**: delimiter-aware awk slug allocator extractor (3 anchored rules, `\47` POSIX escape, fixes embedded opposite-kind quotes — Cycle-1 CV-3 rejected the proposed `[^"']*` sed which doesn't actually fix embedded cases); tab-indent recognized as code-block marker (W-γ closure); post-list 2-blank reset per CommonMark (W-δ closure); spec/plan ordering convention added to CLAUDE.md (Tier 1.4 — name surrounding pattern when using positional language); implementation review prompt tweak in CLAUDE.md memo + companion deep-review PR for config/parser execution checks; README config syntax sweep + v1.2.1 cycle-3 stale "block-form only / silently ignored" parenthetical removed. **New lifecycle action**: `ingest-fail` emitted on 3-strike all-workers-fail trigger (counter `<wiki>/.wiki-meta/.pending-scan-retry-count` format `<window_epoch>:<count>` resets on success); promotes stuck `.pending-scan` and surfaces user-visible error. **New storage layout**: `<wiki>/.wiki-meta/.failed-sources.tsv` partial-fail per-source retry manifest (TSV `<path>\t<reason>\t<ts>`; hook reader deferred to v1.3.1 per CV3-C); `.pending-scan-retry-count` counter file. **Tier 3 closed**: D=status-quo (R3W2 prose-only retained), E=defer-v1.4.0+ (cache_local). **Backwards compat**: single-source `/wiki-ingest` byte-identical to v1.2.1 (state AND lock timing). v1.3.1 backlog tracked in `docs/followup-2026-05-02-v1.3.0.md`.
- **Track C synthesizer agent split for trust-boundary closure** (v1.4.1) — Patch release after 4-cycle plan-side review (fix-and-go cap; 38 substantive cycle-fixes accepted) + 2-round deep-review cross-validation (3-way Opus + Codex review + Codex adversarial). Round 1 surfaced 3 fixes (R1 worker `source_shard` index-wrap, R2 per-agent parse gates for inline/analysis/worker frontmatter parsing differences, Y1 `lint-agent-tools.sh` `set -euo pipefail` + `mktemp` cleanup trap); Round 2 surfaced 1 fix (R-P1 `shasum -a 256 || sha256sum` aggregate fallback for Linux portability where `shasum` is absent). **Architectural**: replaces unified `wiki-synthesizer` with 3 split agents — `wiki-synthesizer-inline` (frozen v1.3.0 inline-mode contract, DORMANT with `status:dormant` + `last_known_active:v1.3.0` + `contract_frozen_at:a9966c7` rot-mitigation header), `wiki-synthesizer-analysis` (v1.4.0 analysis-mode emits `page_plan` + sub-threshold `inline_bodies`), `wiki-synthesizer-worker` (v1.3.0 worker-mode for multi-source A4 dispatch + second-pass collision merge). Active agents (analysis + worker) frontmatter is `tools: [Read, Glob, Grep, WebFetch]` — Write/Edit/MultiEdit/Bash/NotebookEdit physically removed (tool-level M1 closure: cannot write files even if prompt-injected; closes v1.4.0 dogfood realized failure mode where 2/14 workers wrote files outside contracted boundary). Old `wiki-synthesizer.md` DELETED — Option B (no compat shim); external callers using `subagent_type: "wiki-synthesizer"` MUST switch to qualified namespace `deep-wiki:wiki-synthesizer-{inline|analysis|worker}` (BREAKING). Step 7.6.A explicit comment forbids `general-purpose` fallback (V-0 Mechanism B empirical: qualified `deep-wiki:wiki-X` resolves at runtime, unqualified `wiki-X` errors out — closes v1.4.0 dogfood failure mode where caller voluntarily downgraded to `subagent_type: "general-purpose"` which inherits caller's full tool set). **Tooling**: new `scripts/lint-agent-tools.sh` (Bash 3.2 portable, `awk`-based frontmatter manifest enforcement; 4-agent registry — `wiki-synthesizer-inline` allows full Write set, active agents allow only Read+Glob+Grep+WebFetch; WebFetch URL allowlist via string-match against approved domain prefixes); new `_post_dispatch_dirty_scan()` shell function at 3 invocation sites in `commands/wiki-ingest.md` (Step 7.5.M-A multi-source dispatch, Step 7.5.M-B Case B2 second-pass collision merge dispatch, Step 7.6.B-post Stage 2 page-writer dispatch) — scans worktree for unexpected writes after each agent dispatch; gated on `WIKI_TEST_MODE=1` env var (production cost zero; closes off-root /tmp write pattern partially via Layer 2 in-root scope). **V-runs (verification)**: V-0 PASS Mechanism B (qualified-namespace resolution empirically validated in real `claude` runtime); V-1 PASS all 3 surfaces (caller can dispatch `wiki-synthesizer-{analysis,worker,inline}` and receive expected response shape); V-2/V-3 UNDETERMINED-extrapolated per Path A (cannot empirically verify tool-level enforcement without runtime metadata API; rely on physical absence of Write/Edit/MultiEdit/Bash/NotebookEdit in active agents' frontmatter `tools` arrays). **Known limitations**: L1 — V-0 PASS via Mechanism B is best-effort without Claude Code runtime metadata API exposing dispatched-agent identity to caller; Track C v2 (full runtime introspection-based enforcement) deferred until runtime-API supports metadata exposure. L2 — `_post_dispatch_dirty_scan()` `§3.9` scope checks the wiki root only, NOT off-root `/tmp` writes (the v1.4.0 realized failure mode where workers wrote outside both `pages/` and the wiki root entirely was NOT detected by this layer); process-level sandboxing (e.g., container or seccomp filter) deferred to v1.5.0+. Both limitations honestly disclosed in CHANGELOG. **Backward compat**: A5 single-source page-fanout path (v1.4.0) and A4 multi-source path (v1.3.0) preserved structurally — same Stage 1/2/3 sequence, same lock branch-scoping, same `partial_fail` sentinel + cascading + `partial-fail-recovery` repair_reason, same Step 7.7.A-F failure handling. NOT byte-identical: split-agent dispatch shape change (caller specifies one of 3 agent names instead of `mode:` parameter on unified agent). All v1.2.0+ invariants preserved; A4×A5 combination still deferred to v1.4.2+. **Migration**: BREAKING — external callers MUST switch from unqualified `subagent_type: "wiki-synthesizer"` to qualified `deep-wiki:wiki-synthesizer-{inline|analysis|worker}`; no compat shim per Option B (clean cut over multi-version dual-maintenance burden).
- **A5 single-source page-level fanout** (v1.4.0) — Minor release after 4-cycle plan-side review (18 → 7 → 9 → 7 items, fix-and-go cap; 38 substantive fixes accepted) + post-implementation drift check (3-way: 6 issues — 2 critical 2/3 agreement + 4 single-reviewer warnings) + Codex adversarial post-fix pass (3 issues: 2 high + 1 medium design-limitation documented). Single-source `/wiki-ingest` parallelizes page-body generation across N `wiki-page-writer` workers. Initial real-vault dogfood (14-page plan, 295-page wiki) measured ~17 min total wall-clock (Stage 1 ~7 min analysis + Stage 2 ~10 min worker dispatch) under Claude Code runtime's observed concurrent-subagent cap of ~3 (effective parallelism ~2.7×, not 14×) vs v1.3.0 ~15 min single-source baseline. The original ≤5 min target assumed unbounded subagent parallelism; empirical per-stage characterization + parallelism-cap quantification deferred to v1.4.1 B1 fault-injection + B3 phase_timing_ms telemetry. Karpathy "10–15 page touches per source" property preserved — A5 changes WHO writes pages, not how many. **Architectural**: three-stage pipeline for 1-source ingests. **Stage 1** invokes `wiki-synthesizer mode="analysis"` (new contract additive to v1.3.0 inline+worker modes) which reads source + cross-page candidates and emits `page_plan` array of `{file, action, frontmatter_meta, source_excerpts, intent_summary, novel_facts, preserve_sections, existing_page_body, existing_body_hash}` entries describing each affected page. For sub-threshold runs (`len(page_plan) < a5_fanout_threshold`, default 3), Stage 1 also emits `inline_bodies` carrying full `page_content` and the flow skips Stage 2 entirely. **Stage 2** dispatches one `wiki-page-writer` worker per `page_plan` entry in a single Agent-tool-message-turn — workers receive only the entry payload (`tools: []` — no file I/O), generate `page_content` for that one page, return `{file, page_content, frontmatter_meta, worker_status, fail_reason}`. **Stage 3** main aggregates drafts under lock, runs mandatory C3 optimistic concurrency check for every draft (update: re-read body + sha256 compare against `existing_body_hash`; create: existence check), backs up under Rule 7, atomic-writes (tmp + rename), runs v1.3.0 Steps 8-11 metadata pipeline UNCHANGED, then writes/removes `partial_fail` sentinel (Step 7.6.F) BEFORE lock release (post-review fix C2 — closes race window where Step 12 release would otherwise precede sentinel rewrite), then Step 12 release + Step 13 auto-lint in Step 7.6.G. **Step 1.5 partial_fail cascading (A1)**: new optional `partial_fail: {ts, failed_pages, reason}` field in `<wiki>/.wiki-meta/sources/<slug>.yaml` written when any page in a fanout run fails; Step 1.5 cascades through partial_fail BEFORE bytes-hash check, forcing REPAIR override (new `partial-fail-recovery` repair_reason value) on next session even if source bytes unchanged; sentinel removal-on-success breaks retry loop. New additive `pages_failed: [<file>...]` field on `ingest` log lines whenever FAILED_PAGES OR FAILED_WORKERS is non-empty (wiki-lint Step 6 LOG-INVARIANT scan unaffected). **Hidden configuration**: new optional `<wiki>/.wiki-meta/.config.json` with `a5_fanout_threshold` (default 3) + `a5_worker_timeout_sec` (default 90, aspirational per W9 — Agent tool exposes no per-call timeout); loaded via python3 → jq fallback with W10 stderr warning when neither available. **Failure handling Step 7.7.A-F**: per-worker fail (A) → FAILED_WORKERS + PARTIAL_FAIL toggle BEFORE SUCCESS_DRAFTS loop (P5); all-workers fail (B) → A7 lock + R4-Adv-Adv-2 baseline yaml materialization for first-ingest case (sentinel writer otherwise corrupts non-existent yaml) + 3-strike retry counter; mid-loop write fail (C) → A6 abort with R4-R4-2 symmetric mv-fail handling; C3 concurrency abort (D) → continue (other pages may still write); worker timeout (E) → identical to per-worker fail; metadata pipeline failure recovery (F, R4-Adv-Adv-1) — Steps 8-13 fail AFTER 7.6.C wrote pages → mark WRITTEN as failed, write sentinel under held lock, best-effort log emit, do NOT promote `.pending-scan`. **Security/correctness post-review fixes**: filename basename validation (`^[a-z0-9][a-z0-9-]*\.md$`) at Step 7.6.B Gate 3.5 + Step 7.6.C defense-in-depth BEFORE any filesystem op (closes path-traversal vector where worker `file: "../log.jsonl"` would write outside `pages/` before Step 8b's regex catches it); frontmatter_meta subfield validation (title/tags/aliases/sources_final) via jq → python3 fallback chain with page_plan fallback for missing subfields (closes provenance-corruption vector). **Backward compat**: multi-source A4 path byte-identical from v1.3.0 (worker mode + B5 dual-classification + Phase 0 lock + second-pass collision merge); section headers renamed `Step 7.5.A/B/C/D` → `Step 7.5.M-A/B/C/D` for disambiguation, all cross-references swept. Single-source semantics preserved but NOT byte-identical — v1.4.0 routes 1-source through analysis-mode instead of v1.3.0's inline-mode (~10–25% wall-clock variance from analysis-mode invocation). All v1.2.0+ invariants preserved. A4×A5 combination deferred to v1.4.1+. **Known limitations**: Phase 6 sandbox tests (W2 fault-injection knob → v1.4.1); analysis-mode trust boundary (M1 — `wiki-synthesizer` retains `Write` tool because inline-mode requires it; analysis-mode "no write" rule is prompt-enforced only; **realized in 2026-05-05 real-vault dogfood — 2/14 workers wrote files outside the contracted boundary**; full tool-level enforcement via synthesizer agent split (Track C) priority elevated for v1.4.x).

[Full documentation →](https://github.com/Sungmin-Cho/claude-deep-wiki)

---

## deep-evolve

**Autonomous Experimentation Protocol** — specify a goal, and deep-evolve systematically improves your project through measured experiment loops. v2.1 introduced cross-plugin feedback: recurring findings from deep-review steer experiment direction, evolve-insights feed into deep-work research context, and deep-evolve triggers deep-review for pre-merge verification. v3.0 added AAR-inspired layers (entropy tracking, legibility gate, shortcut detector, diagnose-retry). **v3.1 adds virtual parallel N-seed exploration**: each session runs N=1..9 independent seed worktrees coordinated by an adaptive scheduler over a shared forum, with session-end synthesis merging per-seed results into a single best branch. v3.1.1 hardens stdout metric failure handling, sealed prepare read/write guards, scheduler journal contracts, and package contents. v3.0.x sessions remain fully supported via VERSION_TIER routing.

### Inspiration

Inspired by [autoresearch](https://github.com/karpathy/autoresearch) by Andrej Karpathy — an experiment to have AI agents do their own research autonomously. deep-evolve generalizes this from ML training to **any software project**.

### How It Works

1. **Analyze** — deep 5-stage project analysis (structure, dependencies, code, metrics, confirmation)
2. **Generate harness** — create an evaluation harness (`prepare.py` for CLI or `prepare-protocol.md` for MCP/tool-based) tailored to your project
3. **Experiment loop** — autonomously modify code, evaluate, keep improvements, discard regressions
4. **Resume** — crash-safe journal-based state machine, resume across sessions
5. **Report** — statistics, score progression, key discoveries, lessons learned

### The Experiment Cycle

```
Select Idea → Modify Code → Evaluate → Score improved?
                                         ├─ Yes → Keep
                                         └─ No  → Discard → Repeat
```

### Key Commands

| Command | Description |
|---------|-------------|
| `/deep-evolve` | Start a new session (interactive goal/target selection) |
| `/deep-evolve <N>` | Run N experiments |
| `/deep-evolve "goal"` | Start with a specific goal |

### Supported Domains

| Domain | Example Metrics | Eval Mode |
|--------|-----------------|-----------|
| ML / Training | val_bpb, loss, accuracy | CLI |
| Quantitative Finance | Sharpe ratio, max drawdown | CLI |
| Test Coverage | Pass rate, scenario coverage | CLI |
| Code Quality | Pattern compliance, lint score | CLI |
| Game Engines | Replay accuracy, frame time | Protocol (MCP) |
| GUI Apps | UI state match, accessibility | Protocol |
| External Systems | API accuracy, pipeline success | Protocol |

[Full documentation →](https://github.com/Sungmin-Cho/claude-deep-evolve)

---

## deep-review

**Independent Evaluator** — reviews AI coding agent output with a separate Opus subagent. Runs 3-way cross-model verification when the Codex plugin is installed.

### Inspiration

Inspired by Anthropic's [Harness Design](https://www.anthropic.com/engineering/harness-design-long-running-apps) — structurally eliminates self-approval bias through Generator-Evaluator separation.

### Review Pipeline

```
Collect → Contract Check → Deep Review → Verdict
                            ├─ Claude Opus (always)
                            ├─ codex:review (if available)
                            └─ codex:adversarial-review (if available)
```

### Key Commands

| Command | Description |
|---------|-------------|
| `/deep-review` | Review current changes with independent Opus evaluator |
| `/deep-review --contract` | Sprint Contract-based verification |
| `/deep-review --entropy` | Entropy scan (code drift, pattern mismatch) |
| `/deep-review --respond` | Evidence-based response to review findings (Phase 6 delegated to Sonnet subagent since v1.3.3) |
| `/deep-review init` | Initialize project review rules |

### Key Features

- **Independent evaluator** — separate Opus subagent with no Generator context
- **Cross-model verification** — 3-way parallel review when Codex is installed
- **Phase 6 subagent delegation** (v1.3.3) — `/deep-review --respond` IMPLEMENT phase runs in a dedicated `phase6-implementer` Sonnet subagent per severity group. Main session keeps Phase 1~5 judgment; subagent performs per-item Edit + tests. Main verifies with fail-closed content-aware delta (`git hash-object`) + allowlist + `git commit --only` pathspec-limited commit. Falls back to in-session execution on dispatch failure.
- **Phase 6 trust-boundary hardening + platform compatibility** (v1.3.4) — 4-round cross-model review surfaced 5 latent trust-boundary bugs and platform issues, all fixed: staged rename detection (`--name-status -M`, staged ∪ unstaged union), allowlist bypass via pre-existing dirty outside paths, dirty recovery now restores index + worktree, tracked-but-deleted WIP state preservation, macOS `/bin/bash` 3.2 compatibility (TSV temp files replace `declare -A`), and CI matrix on `ubuntu-latest` + `macos-latest`. e2e coverage 5 → 11 scenarios (E1~E11).
- **Sprint Contract** — structured success criteria verification
- **Environment adaptation** — works in git/non-git, with/without Codex

[Full documentation →](https://github.com/Sungmin-Cho/claude-deep-review)

---

## deep-docs

**Document Gardening Agent** — validates freshness and auto-repairs agent instruction documents like CLAUDE.md and AGENTS.md.

### Inspiration

Inspired by OpenAI's [Harness Engineering](https://openai.com/index/harness-engineering/) — "a doc-gardening agent runs repeatedly, finds stale docs, and opens fix PRs."

### Key Commands

| Command | Description |
|---------|-------------|
| `/deep-docs scan` | Detect stale references, moved paths, outdated examples |
| `/deep-docs garden` | Auto-fix with user confirmation |
| `/deep-docs audit` | Quantitative document health report |

### Key Features

- **Path-scoped freshness** — checks if referenced code paths changed after doc was last updated
- **Auto-fix / audit-only separation** — mechanical fixes only, subjective checks are audit-only
- **Durable scan artifact** — `.deep-docs/last-scan.json` with provenance (HEAD SHA, branch)
- **Scoring** — size, freshness, reference accuracy, duplication

[Full documentation →](https://github.com/Sungmin-Cho/claude-deep-docs)

---

## deep-dashboard

**Cross-plugin Harness Diagnostics** — assesses codebase harnessability and aggregates sensor results from deep-work, deep-review, and deep-docs into a unified view.

### Inspiration

Built on Böckeler/Fowler's [Harness Engineering](https://martinfowler.com/articles/harness-engineering.html) framework — the dashboard closes the feedback loop by measuring harness effectiveness across the entire deep-suite ecosystem.

### Key Commands

| Command | Description |
|---------|-------------|
| `/deep-harnessability` | Assess codebase harnessability — 6 dimensions, 0-10 score with recommendations |
| `/deep-harness-dashboard` | Unified view — health, fitness, sessions, effectiveness, suggested actions |

### Harnessability Dimensions

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Type Safety | 25% | tsconfig strict, mypy strict, type hints |
| Module Boundaries | 20% | dep-cruiser config, organized src, entry points |
| Test Infrastructure | 20% | test framework, test files, coverage config |
| Sensor Readiness | 15% | linter, type checker, lock file |
| Linter & Formatter | 10% | eslint/ruff config, prettier/biome |
| CI/CD | 10% | CI config, CI runs tests |

### Dashboard Features

- **Health status** — drift sensor results (dead-export, stale-config, dep-vuln, coverage-trend)
- **Fitness rules** — architecture fitness function pass/fail
- **Session quality** — recent 3 sessions average
- **Effectiveness score** — weighted aggregate (0-10) with not_applicable redistribution
- **Action routing** — suggested next action per finding
- **Markdown export** — optional report file generation with user approval

[Full documentation →](https://github.com/Sungmin-Cho/claude-deep-dashboard)

---

## License

MIT
