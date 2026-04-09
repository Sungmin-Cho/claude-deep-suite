# Böckeler/Fowler Harness Engineering vs Deep-Suite: Comparative Analysis

> Comprehensive comparison of the [Harness Engineering](https://martinfowler.com/articles/harness-engineering.html) framework (Birgitta Böckeler, 2026-04-02) against deep-suite's 6 plugin implementation
> Analysis date: 2026-04-09
> Scope: All 8 harness engineering weaknesses resolved across 3 implementation sessions

---

## 1. 2×2 Matrix Coverage

### Computational Guides (Feedforward)

| Böckeler Framework | Deep-Suite Implementation | Status |
|---|---|---|
| Codemods (OpenRewrite recipes) | — | ⛔ Not implemented |
| LSP / Language Server | — | ⛔ Not implemented |
| Bootstrap scripts | — | ⛔ Not implemented |
| *Not in framework* | Phase Guard hook (physically blocks code edits outside Phase 3) | ✅ **Beyond framework** |
| *Not in framework* | TDD state machine (RED→GREEN enforcement) | ✅ **Beyond framework** |
| *Not in framework* | Topology templates (phase1/3/4 guides auto-injection) | ✅ **Matches framework** |

**Score: 7/10** — LSP and codemods are absent, but Phase Guard + TDD state machine provide **physical control** that the framework doesn't envision. Blocking code edits at the tool level is stronger than any linter configuration.

### Inferential Guides (Feedforward)

| Böckeler Framework | Deep-Suite Implementation | Status |
|---|---|---|
| AGENTS.md | CLAUDE.md + Phase-specific guides | ✅ |
| Skills (how-to guides) | deep-work skills (12 reference guides) | ✅ |
| Coding conventions | rules.yaml + topology guides.phase3 | ✅ |
| Architecture reference docs | research.md + plan.md (Phase 1/2 artifacts) | ✅ |
| MCP server (team knowledge) | deep-wiki (Karpathy pattern) | ✅ Different approach, equivalent value |
| MCP-based real-time knowledge search | — | ⛔ Not implemented |
| Context-specific convention skills | — | ⛔ Not implemented |

**Score: 8/10** — The research→plan→implement pipeline extends the framework's "Skills" concept into a **systematic workflow**. deep-wiki provides cross-session knowledge accumulation not described in the framework.

### Computational Sensors (Feedback)

| Böckeler Framework | Deep-Suite Implementation | Status |
|---|---|---|
| Linters (eslint, semgrep) | eslint, ruff, clang-tidy, dotnet-format | ✅ |
| Type checkers | tsc, mypy, dotnet build, cmake | ✅ |
| Tests | test pass/fail + TDD enforcement | ✅ |
| ArchUnit structural tests | fitness.json (file-metric, structure, dependency, forbidden-pattern) | ✅ |
| Pre-commit hooks | sensor-trigger hook (config file changes) | ✅ Similar |
| dep-cruiser | dependency checker (circular) | ✅ Partial (no layer-direction) |
| Coverage tools | coverage piggybacking (--coverage on GREEN tests) | ✅ |
| Mutation testing | Stryker/mutmut + auto-regeneration loop (3 rounds) | ✅ |
| *Not in framework* | dead-export scan (unused export detection) | ✅ **Additional** |
| *Not in framework* | stale-config scan (broken config references) | ✅ **Additional** |
| *Not in framework* | dependency-vuln (npm audit etc.) | ✅ **Additional** |
| *Not in framework* | coverage-trend (baseline regression detection) | ✅ **Additional** |
| *Not in framework* | review-check sensor (topology + fitness integrated) | ✅ **Additional** |
| Runtime monitoring (SLO, error rates) | — | ⛔ Not implemented |

**Score: 9/10** — Covers everything the framework mentions plus **5 additional sensors** (drift detection + review-check). The only gap is runtime monitoring, which requires deployment infrastructure access.

### Inferential Sensors (Feedback)

| Böckeler Framework | Deep-Suite Implementation | Status |
|---|---|---|
| Code review agents | deep-review (Opus subagent) | ✅ |
| LLM-as-judge | cross-model verify (Opus + Codex + Codex adversarial) | ✅ **Beyond framework** (3-way) |
| AI semantic analysis | SOLID review, entropy scan, drift check | ✅ |
| Mutation testing quality | Stryker parser + possibly_equivalent tagging | ✅ |
| Architecture review | — | ⛔ No dedicated skill |
| Runtime quality sampling | — | ⛔ Not implemented |

**Score: 7/10** — 3-way cross-model verification is more sophisticated than the framework's "LLM-as-judge" suggestion. Missing a dedicated architecture review skill.

---

## 2. Three Regulation Categories

### Maintainability Harness — 8/10

**Implemented:**
- SOLID review (deep-review)
- Insight analysis, entropy scan (deep-work)
- TDD enforcement (deep-work)
- Document gardening with freshness checking (deep-docs)
- review-check sensor — style violation detection via linter results + topology guides
- dead-export scan — dead code detection
- Mutation testing — test quality verification

**Remaining gaps:**
- Cyclomatic complexity threshold enforcement (reported but not blocking)
- Test coverage quality verification (partially addressed by mutation testing)

### Architecture Fitness Harness — 8/10

**Implemented:**
- fitness.json declarative rules + computational verification (deep-work + deep-review)
- 4 rule checkers: file-metric, forbidden-pattern, structure, dependency
- Ecosystem-aware fitness-generator with auto-suggestion
- Topology-specific fitness_defaults (template seed)
- Phase 4 Fitness Delta Gate (Advisory)
- Health Required Gate (required_missing propagation)
- deep-review fitness.json consumption + receipt health_report reference

**Remaining gaps:**
- dep-cruiser layer-direction validation (v1 is circular only)
- Performance regression testing
- Observability standard enforcement
- API quality linting
- Custom rule types (deferred pending security model)

### Behaviour Harness — 7/10

**Implemented:**
- TDD enforcement via state machine (deep-work)
- Sprint Contract verification (deep-review)
- Mutation Testing with auto-regeneration (Stryker/mutmut, up to 3 rounds)
- Implement phase return pattern (Phase 4 mutation failure → Phase 3 TDD loop)
- Mutation Score Quality Gate (Advisory)
- possibly_equivalent tagging for NoCoverage + logging mutations

**Remaining gaps:**
- Approved Fixtures pattern (golden input/output data)
- Browser-based behavioral verification (Playwright)
- Visual regression testing

---

## 3. Timing Model (Keep Quality Left)

| Stage | Framework Expectation | Deep-Suite | Score |
|-------|----------------------|------------|-------|
| **Pre-Integration** | LSP, skills, linters, coverage, self-correction | Phase Guard, TDD, SENSOR_RUN (lint→typecheck→review-check), per-sensor 3-round fix | **9/10** |
| **Post-Integration** | Architecture review, mutation testing, detailed review | Mutation testing (Phase 4), Fitness Delta Gate, deep-review 3-way verification | **8/10** |
| **Continuous** | Dead code scan, coverage quality, dependabot, **SLO monitoring, log anomaly, response quality sampling** | dead-export, stale-config, dep-vuln, coverage-trend, harnessability, dashboard. **No runtime monitoring** | **6/10** |

The Continuous stage is the biggest gap. Static analysis drift detection is comprehensive, but runtime feedback (SLO, error rates, latency, log anomaly detection) is completely absent — a fundamental limitation of the CLI plugin architecture.

---

## 4. Framework-Specific Concepts

### Harnessability

| Aspect | Böckeler Framework | Deep-Suite |
|--------|-------------------|------------|
| Definition | "Not every codebase equally amenable to harnessing" | ✅ Same concept adopted |
| Assessment method | Qualitative description only (no concrete tool) | ✅ `/deep-harnessability` — 6 dimensions, 17 detectors, 0-10 score |
| Result usage | Diagnosis → manual judgment | ✅ Recommendation engine + Phase 1 research context auto-injection |
| Ashby's Law | "Topology commitment narrows LLM output space" | ✅ Topology detection → template-based guide/sensor scoping |
| Ecosystem awareness | Not discussed | ✅ TS checks skip for Python projects, Python checks skip for TS |

**Assessment: Deep-suite exceeds the framework.** Böckeler presents the concept; deep-suite implements a quantitative diagnostic tool.

### Harness Templates

| Aspect | Böckeler Framework | Deep-Suite |
|--------|-------------------|------------|
| Example topologies | Data dashboard (Node), CRUD service (JVM), Event processor (Go) | nextjs-app, react-spa, express-api, python-web, python-lib, generic |
| Bundle contents | Structure + tech stack + guides/sensors | guides (phase1/3/4) + sensor priorities + fitness_defaults + harnessability_hints |
| Extensibility | "80% coverage" goal | custom/ directory + deep merge + priority-based insertion |
| Version sync | Mentioned as "challenge" | Deep merge partially addresses (objects merge, arrays replace) |
| Topology detection | Not discussed (manual selection implied) | ✅ Automatic detection via marker files + dependencies + directory structure |

**Assessment: Equivalent.** 6 topologies cover the most common service types. Automatic detection is an improvement over the framework's implied manual selection.

### Self-Correction Loop

| Aspect | Böckeler Framework | Deep-Suite |
|--------|-------------------|------------|
| Feedback optimization | "Custom linter messages with self-correction instructions" | ✅ FIX feedback format (per-error correction instructions) |
| Correction loop | Feedback + Feedforward combined | ✅ SENSOR_RUN → SENSOR_FIX → SENSOR_CLEAN (per-sensor 3-round) |
| Scope | Single correction cycle implied | ✅ Multi-sensor pipeline: lint → typecheck → review-check, each independent |
| Trust calibration | "Inferential trust increases with strong model" | ✅ Inferential as Advisory only, computational as Required/Advisory |

**Assessment: Deep-suite exceeds the framework.** Böckeler mentions "custom linter messages"; deep-suite implements a **multi-round, multi-sensor self-correction state machine** with independent round tracking per sensor.

### Human Steering Loop

| Aspect | Böckeler Framework | Deep-Suite |
|--------|-------------------|------------|
| Pattern detection | "Detect when issue occurs multiple times" | ✅ Assumption Engine (session quality score-based auto-adjustment) |
| Harness improvement | "Agent can help build harness itself" | ✅ fitness-generator (codebase analysis → rule auto-suggestion) |
| Unified view | "Tooling that helps configure, sync, reason about controls" | ✅ /deep-harness-dashboard (effectiveness + action routing) |
| Action routing | Not discussed | ✅ suggested_action per finding type |

**Assessment: Equivalent to exceeding.** The Assumption Engine automates part of the steering loop — the harness evolves itself based on session quality data.

---

## 5. Deep-Suite Unique Contributions (Not in Framework)

| Feature | Plugin | Value |
|---------|--------|-------|
| **Phase Guard** — physical edit blocking | deep-work | Stronger than any computational guide the framework describes |
| **Receipt System** — per-slice JSON proof | deep-work | Makes work completion provable. Concretizes the framework's "accountability" concept |
| **Assumption Engine** — quality-based rule auto-evolution | deep-work | The harness improves itself. Automates the framework's "steering loop" |
| **3-Way Cross-Model Verification** | deep-review | Extends "LLM-as-judge" to 3-model parallel verification |
| **5-Phase Workflow** | deep-work | The framework discusses control mechanisms; deep-suite designs the entire development workflow |
| **deep-wiki** | deep-wiki | Cross-session knowledge accumulation. Extends the framework's "team knowledge" into a persistent system |
| **deep-evolve** | deep-evolve | Autonomous experimentation protocol. Outside the framework's scope entirely |
| **Harnessability Score** | deep-dashboard | Quantitative assessment tool. Framework only describes the concept qualitatively |
| **Effectiveness Dashboard** | deep-dashboard | Cross-plugin harness effectiveness measurement with action routing |

---

## 6. Remaining Gaps (Priority Order)

| Priority | Gap | Framework Importance | Implementation Difficulty | Notes |
|----------|-----|---------------------|--------------------------|-------|
| **1** | **Runtime monitoring** (SLO, error rates, latency, log anomaly) | High — core of Continuous timing | High — outside plugin scope, infra-dependent | Identified as #3B. Fundamental CLI plugin limitation |
| **2** | **LSP integration** | Medium — Computational Guide | Medium — Serena MCP available | Improves code navigation + refactoring quality |
| **3** | **Approved Fixtures** | Medium — Behaviour Harness | Low — fixtures/ directory + diff comparison | Golden data-based behavioral verification |
| **4** | **Dedicated Architecture Review skill** | Medium — Inferential Sensor | Low — deep-review extension | Layer violations, dependency direction, API consistency |
| **5** | **Browser-based verification** (Playwright) | Low — frontend-specific | Medium — Playwright integration | Only relevant for nextjs-app/react-spa topologies |
| **6** | **Codemods** | Low — Computational Guide | Medium | Agent can do code transformations directly, lower priority |
| **7** | **Runtime quality sampling** | Medium — Inferential Sensor | High — runtime access needed | Same infrastructure dependency as #1 |

---

## 7. Scorecard

| Framework Dimension | Score | Rationale |
|--------------------|-------|-----------|
| Computational Guides | **7/10** | Phase Guard + TDD are powerful but LSP/codemods missing |
| Inferential Guides | **8/10** | 5-Phase workflow + deep-wiki exceed framework level |
| Computational Sensors | **9/10** | Exceeds framework scope (13 sensors + drift + fitness) |
| Inferential Sensors | **7/10** | 3-way verification is strong but no architecture review |
| Maintainability | **8/10** | |
| Architecture Fitness | **8/10** | |
| Behaviour | **7/10** | |
| Pre-Integration Timing | **9/10** | |
| Post-Integration Timing | **8/10** | |
| Continuous Timing | **6/10** | Complete absence of runtime monitoring |
| Harnessability | **9/10** | Exceeds framework (quantitative tool implemented) |
| Harness Templates | **7/10** | |
| Self-Correction Loop | **9/10** | Exceeds framework (multi-round state machine) |
| Human Steering | **8/10** | Assumption Engine + Dashboard |
| **Overall** | **7.9/10** | |

---

## 8. Conclusion

Deep-suite covers approximately **80% of the Böckeler/Fowler framework** and exceeds it in several dimensions. The strongest areas are:

1. **Computational Sensors** (9/10) — 13+ sensors covering linting, type checking, coverage, mutation testing, drift detection, fitness rules, and review-check. More comprehensive than any specific tool the framework mentions.

2. **Self-Correction Loop** (9/10) — Multi-round, multi-sensor state machine with independent round tracking. The framework describes "custom linter messages"; deep-suite implements a full correction pipeline.

3. **Harnessability** (9/10) — The framework presents the concept qualitatively; deep-suite builds a quantitative diagnostic tool with 6 dimensions, 17 detectors, and a recommendation engine.

The most significant structural limitation is the **complete absence of runtime monitoring** (Continuous timing 6/10). SLO tracking, error rate monitoring, latency measurement, and log anomaly detection require deployment infrastructure access that is fundamentally outside the CLI plugin architecture. This is an inherent constraint of deep-suite's identity as a **development-time harness** rather than a production-time observability system.

The framework's insight that "good harness should not eliminate human input, but direct it to where input is most important" is well-reflected in deep-suite's design: Phase Guard blocks premature edits, the dashboard surfaces the highest-priority action, and the Assumption Engine evolves rules automatically — but the human remains the decision-maker at every gate.

---

## References

- [Harness Engineering for Coding Agent Users](https://martinfowler.com/articles/harness-engineering.html) — Birgitta Böckeler, 2026-04-02
- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) — Anthropic
- [Harness Engineering: Leveraging Codex](https://openai.com/index/harness-engineering/) — OpenAI
