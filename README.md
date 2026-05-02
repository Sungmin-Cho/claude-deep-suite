**English** | [한국어](./README.ko.md)

# Claude Deep Suite

A unified [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin marketplace that bundles six complementary plugins for structured development, persistent knowledge management, autonomous experimentation, independent code review, document gardening, and harness diagnostics.

## Plugins

| Plugin | Version | Description |
|--------|---------|-------------|
| [deep-work](https://github.com/Sungmin-Cho/claude-deep-work) | 6.4.2 | Evidence-Driven Development Protocol (Brainstorm → Research → Plan → Implement → Test → **Integrate**) |
| [deep-wiki](https://github.com/Sungmin-Cho/claude-deep-wiki) | 1.2.1 | LLM-managed markdown wiki (Step 1.5 hash-skip hardening + wiki-lint false-positive elimination + per-source provenance + cloud-mirror docs + throughput filters + skim-first synthesizer + ingest-repair self-healing) |
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
