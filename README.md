**English** | [한국어](./README.ko.md)

# Claude Deep Suite

A unified [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin marketplace that bundles three complementary plugins for structured development, persistent knowledge management, and autonomous experimentation.

## Plugins

| Plugin | Description |
|--------|-------------|
| [deep-work](https://github.com/Sungmin-Cho/claude-deep-work) | Evidence-Driven Development Protocol |
| [deep-wiki](https://github.com/Sungmin-Cho/claude-deep-wiki) | LLM-managed markdown wiki |
| [deep-evolve](https://github.com/Sungmin-Cho/claude-deep-evolve) | Autonomous Experimentation Protocol |

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

# Or install only what you need
/plugin install deep-work@Sungmin-Cho-claude-deep-suite
```

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
- **Quality gates** — drift check, SOLID review, insight analysis
- **Auto-flow** — one command drives the entire workflow

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

## License

MIT
