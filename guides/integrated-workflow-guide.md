[한국어](./integrated-workflow-guide.ko.md)

# Deep Suite Integrated Workflow Guide

This guide explains how the 6 plugins in deep-suite **work together** during a real project. Rather than listing each plugin's features, it focuses on the integrated flow from a developer's perspective.

---

## Plugin Roles at a Glance

```
Development Lifecycle:

  Plan          →      Build        →      Verify       →      Maintain
  ─────────────────────────────────────────────────────────────────────
  deep-work           deep-work           deep-review       deep-docs
  (Research            (Implement          (independent      (document
   + Plan)              + Test)             review)           gardening)
                      deep-evolve         deep-dashboard
                      (autonomous          (harness
                       optimization)        diagnostics)
                                           deep-wiki
                                           (knowledge
                                            accumulation)
```

| Plugin | Core Question | When to Use |
|--------|--------------|-------------|
| **deep-work** | "How do I design and implement this?" | Every code task — features, bugs, refactors |
| **deep-evolve** | "Can I automatically make this better?" | Performance optimization, test improvement, code quality |
| **deep-review** | "Is this code actually good?" | Pre-PR independent verification |
| **deep-docs** | "Do docs match the code?" | Post-change documentation sync |
| **deep-wiki** | "How do I preserve what I learned?" | Knowledge accumulation across sessions |
| **deep-dashboard** | "Is the harness working well?" | Project health diagnosis, improvement areas |

---

## Scenario 1: New Feature Development (Full Flow)

### Example: "Add JWT authentication middleware to Express API"

#### Phase 1: Analyze & Plan with deep-work

```bash
/deep-work "Add JWT-based user authentication middleware"
```

deep-work automatically starts a 5-phase workflow:

1. **Brainstorm** (optional) — Why JWT? Session vs JWT tradeoffs. Discuss requirements with the user.
2. **Research** — Deep codebase analysis. Existing middleware patterns, routing structure, test infrastructure, dependencies.
3. **Plan** — Implementation plan with file-by-file changes, test strategy, ordering. Requires user approval.

At this stage, cross-plugin data is automatically utilized:
- If **harnessability-report.json** exists, Research includes context like "Type Safety 3.2/10 — consider enabling tsconfig strict mode"
- If **evolve-insights.json** exists, Research references insights like "guard clause pattern was effective in previous projects"

#### Phase 2: Implement with deep-work

After plan approval, the Implement phase begins automatically:

4. **Implement** — TDD-enforced slice-by-slice implementation. RED (failing test) → GREEN (minimal code) → REFACTOR cycle enforced per slice.
5. **Test** — Full verification: coverage, type checking, linting.

```
Slice 1: auth middleware skeleton
  → Write test → Verify failure → Implement → Tests pass → Commit

Slice 2: JWT verification logic
  → Write test → ... → Commit

Slice 3: Route protection
  → Write test → ... → Commit
```

#### Phase 3: Verify with deep-review

Before creating a PR:

```bash
/deep-review
```

deep-review runs an independent agent to evaluate the code:
- **Stage 1**: Detect git state (clean/staged/unstaged)
- **Stage 2**: Load project rules (rules.yaml)
- **Stage 3**: Opus sub-agent reviews the full diff (optionally with Codex 3-way cross-verification)
- **Stage 4**: Verdict — APPROVE / CONCERN / REQUEST_CHANGES

deep-review also **automatically extracts recurring findings** (v1.2.0):
- Stage 5.5 analyzes previous reports for repeated patterns → writes `recurring-findings.json`
- The next deep-evolve session uses these patterns to steer experiment direction

#### Phase 4: Sync docs with deep-docs

```bash
/deep-docs scan
```

Scans CLAUDE.md, README, API docs for drift from code. Auto-fixable items are repaired with `/deep-docs garden`.

#### Phase 5: Accumulate knowledge with deep-wiki

```bash
/wiki-ingest .deep-work/report.md
```

Ingests the deep-work session report into the wiki. Patterns, decisions, and tradeoffs from the JWT implementation are permanently preserved.

---

## Scenario 2: Performance Optimization (deep-evolve focused)

### Example: "Automatically optimize ML model val_bpb"

#### Step 1: Start deep-evolve session

```bash
/deep-evolve
```

deep-evolve analyzes the project and generates an evaluation harness:

1. **Project analysis** (5 stages): language, framework, test infrastructure, metrics detection
2. **Goal setting**: "val_bpb minimize" — confirmed with user
3. **Scaffolding**: Auto-generates `prepare.py` (eval harness) + `program.md` (experiment instructions) + `strategy.yaml` (strategy parameters)

Cross-plugin data is automatically utilized:
- If `recurring-findings.json` exists → Stage 3.5 reads it to bias prepare.py scenario weights and add "known recurring defects" to program.md
- If meta-archive has a similar project → transfers validated strategy.yaml initial values

#### Step 2: Autonomous experiment loop

The agent runs experiments autonomously, even while you're away:

```
Inner Loop (code evolution):
  Idea ensemble (3 candidates → select 1) → Code modification → Commit → Evaluate
  → Score improved? Keep : git reset → Repeat (20 rounds)

Outer Loop (strategy evolution):
  20 Inner Loop rounds complete → Meta Analysis → Adjust strategy.yaml
  → Compute Q(v) → Strategy improved? Keep : Restore previous strategy
  → Stagnation? Fork from strategy archive → Still stuck? Expand prepare.py
```

#### Step 3: Completion & cross-plugin integration

When experiments complete:

1. **evolve-receipt.json** auto-generated → deep-dashboard collects it
2. **evolve-insights.json** auto-generated → next deep-work session's Research references it
3. **6 options presented**:
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
- Type Safety, Test Infrastructure, CI/CD, Linting, Documentation, Architecture
- Each scored 0-10 by 17 computational detectors
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
# Extract knowledge from a URL
/wiki-ingest https://martinfowler.com/articles/harness-engineering.html

# Extract knowledge from a file
/wiki-ingest docs/architecture-decision.md

# Auto-accumulate deep-work session results
/wiki-ingest .deep-work/report.md
```

The wiki creates/updates pages per source. **Pages get richer as more knowledge accumulates** on the same topic (accumulation principle).

#### Search & leverage knowledge

```bash
# Find answers grounded in wiki content
/wiki-query "What are the pros and cons of refresh token rotation in JWT auth?"
```

Generates answers based on accumulated wiki knowledge. When cross-page insights emerge from 2+ pages, a synthesis page is automatically created and filed back into the wiki.

#### Wiki health management

```bash
/wiki-lint
```

Detects contradictions, broken links, stale content, and orphan pages.

---

## Cross-Plugin Data Flow (v2.1.0)

```
deep-work ──── receipts ────────→ deep-dashboard (collection)
deep-docs ──── last-scan.json ──→ deep-dashboard (collection)
deep-evolve ── evolve-receipt ──→ deep-dashboard (collection)

deep-review ── recurring-findings → deep-evolve (experiment steering)
deep-evolve ── evolve-insights ──→ deep-work (research context)
deep-evolve ── review trigger ───→ deep-review (pre-merge verification)
deep-dashboard ─ harnessability ─→ deep-work (research context)
```

Each plugin operates **independently** and exchanges data through JSON files. If a plugin isn't installed, others still work without errors (graceful degradation).

---

## Usage Guide by Complexity

### Quick bug fix (~30 min)

```bash
/deep-work "fix login 500 error"
# → Research → Plan → Implement (TDD) → Test
# → /deep-review (optional)
# → commit & merge
```

deep-work alone is sufficient. Use deep-review only for critical PRs.

### Medium feature (2-4 hours)

```bash
/deep-work "add Stripe payment integration"
# → full 5-phase (Brainstorm → ... → Test)
# → /deep-review (recommended)
# → /deep-docs scan (sync documentation)
# → /wiki-ingest (accumulate session results)
```

deep-work + deep-review + deep-docs. Accumulating session results in the wiki makes them available for future reference.

### Large-scale optimization (half-day+)

```bash
# 1. Diagnose current state
/deep-harness-dashboard

# 2. Autonomous optimization
/deep-evolve "achieve 90% test coverage"
# → agent autonomously runs dozens of experiments

# 3. Verify results
# → select "deep-review then merge" at completion

# 4. Accumulate learnings
/wiki-ingest .deep-evolve/report.md
```

Full plugin stack. Dashboard for diagnosis → Evolve for autonomous improvement → Review for verification → Wiki for accumulation.

---

## Tips

1. **Always start with deep-work** — Even for "simple" tasks. Skipping research and planning usually leads to rework.

2. **Run deep-review before PRs** — An independent agent catches what self-review misses. Enable Codex 3-way cross-verification for even stronger coverage.

3. **Use deep-evolve with measurable goals** — "Make the code better" is too vague. "Minimize val_bpb" or "achieve 100% test pass rate" gives the agent a clear target.

4. **Run deep-dashboard regularly** — Weekly `/deep-harness-dashboard` runs help track project health trends and identify where to invest.

5. **Accumulate everything in deep-wiki** — Today's struggle is tomorrow's asset. Session reports, external docs, and technical decisions in the wiki compound over time.
