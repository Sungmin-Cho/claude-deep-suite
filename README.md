**English** | [한국어](./README.ko.md)

# Claude Deep Suite

A unified [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin marketplace that bundles six complementary plugins for structured development, persistent knowledge management, autonomous experimentation, independent code review, document gardening, and harness diagnostics.

## Plugins

| Plugin | Description |
|--------|-------------|
| [deep-work](https://github.com/Sungmin-Cho/claude-deep-work) | Evidence-Driven Development Protocol |
| [deep-wiki](https://github.com/Sungmin-Cho/claude-deep-wiki) | LLM-managed markdown wiki |
| [deep-evolve](https://github.com/Sungmin-Cho/claude-deep-evolve) | Autonomous Experimentation Protocol |
| [deep-review](https://github.com/Sungmin-Cho/claude-deep-review) | Independent Evaluator with cross-model verification |
| [deep-docs](https://github.com/Sungmin-Cho/claude-deep-docs) | Document gardening agent |
| [deep-dashboard](https://github.com/Sungmin-Cho/claude-deep-dashboard) | Cross-plugin harness diagnostics |

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
 Phase 0     Phase 1      Phase 2    Phase 3        Phase 4     Post
 Brainstorm  Research     Plan       Implement      Test        Review
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
 |           |            |          |              |    deep-review
 |           |            |          |              |    3-way verify
 |           |            |          |              |           |
 +===========+============+==========+==============+===========+
                                                          |
 Continuous: deep-docs (doc scan) <-----------------------+
             deep-dashboard (effectiveness + action routing)
             deep-evolve (autonomous experimentation)
```

### Plugin Data Flow

```
 deep-work ------ receipts -------> deep-dashboard (collector)
    |                                    |
    +-- health_report ----------------> deep-review (fitness-aware review)
    |                                    |
    +-- fitness.json <----------------> deep-review (rule consumption)
    |                                    |
 deep-docs -- last-scan.json -----> deep-dashboard (collector)
    |                                    |
 deep-dashboard                          v
    +-- harnessability ---------------> deep-work Phase 1 (research context)
    +-- effectiveness ----------------> user (CLI report + optional markdown)
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

---

## deep-work

**Evidence-Driven Development Protocol** — a single-command auto-flow orchestration that enforces structured, evidence-based software development.

### The Problem

When AI coding tools tackle complex tasks, they often jump into implementation without understanding the codebase, introduce patterns that conflict with existing architecture, or mark work as done without verification.

### The Solution

`/deep-work "task"` runs the entire **Brainstorm → Research → Plan → Implement → Test** pipeline automatically. Code file modifications are physically blocked during non-implementation phases via hooks.

### Key Commands

| Command | Description |
|---------|-------------|
| `/deep-work <task>` | Auto-flow orchestration — runs the full pipeline. Plan approval is the only required interaction. |
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
Phase 0  Brainstorm    Design exploration — "why before how"
Phase 1  Research      Deep codebase analysis and documentation
Phase 2  Plan          Slice-based implementation plan (requires user approval)
Phase 3  Implement     TDD-enforced execution — failing test → code → receipt
Phase 4  Test          Receipt check, spec compliance, quality gates
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

[Full documentation →](https://github.com/Sungmin-Cho/claude-deep-wiki)

---

## deep-evolve

**Autonomous Experimentation Protocol** — specify a goal, and deep-evolve systematically improves your project through measured experiment loops.

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
| `/deep-review init` | Initialize project review rules |

### Key Features

- **Independent evaluator** — separate Opus subagent with no Generator context
- **Cross-model verification** — 3-way parallel review when Codex is installed
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
