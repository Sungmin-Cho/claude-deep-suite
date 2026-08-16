# model-router × deep-suite Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `deep-model-router` as the 10th suite plugin and land the P2 pilots (deep-work shadow + deep-loop live) without weakening any sibling safety floor.

**Architecture:** Policy stays in the router (decision plane). Siblings keep execution, durable state, and local floors. Consumers call `route_task.py --request-json` via a host-neutral locator, merge is enforced inside the router (`max` / intersection per §11.1), and HIGH/CRITICAL failures never become silent `main`.

**Tech Stack:** Python 3 (router CLI + pytest), Node 20 ESM (suite gates + sibling runtimes), Claude/Codex plugin manifests, Orca worktrees for sibling PRs.

**Spec:** `docs/design/2026-08-16-model-router-integration-design.md` (§0–§10 + **§11 우선**).

## Global Constraints

- Plugin key `deep-model-router`, skill name `model-router`, GitHub repo `claude-deep-model-router` (rename is the P0→P1 gate, not a P0 coding prerequisite).
- Local checkout is `/Users/sungmin/Dev/claude-plugins/deep-model-router`. Skill tree must become `skills/model-router/` (`$SKILL_DIR` relative paths stay valid).
- No personal symlink and no `../deep-model-router` import. Locator is `DEEP_MODEL_ROUTER_CLI` → installed plugin cache only.
- Router exits remain `0/1/2/3/4/5`. Consumer adapters must not treat 3/4 as degrade.
- Sidecar `artifacts.writes` stay empty until a real emit exists.
- Marketplace plugin order and sidecar plugin key order stay deepEqual.
- Sibling work happens in **new Orca worktrees**, not the sibling main checkouts.
- This plan's execution scope is **P0 + P1 + P2**. P3–P5 are named only as follow-ons.

---

## File map

### P0 — `deep-model-router`

| Path | Role |
|---|---|
| `skill/` → `skills/model-router/` | Standard plugin skill layout |
| `.claude-plugin/plugin.json` | Claude manifest, `name=deep-model-router`, `version=1.0.0` |
| `.codex-plugin/plugin.json` | Codex parity + interface block |
| `AGENTS.md` / `CLAUDE.md` | Codex/Claude front-end |
| `skills/model-router/scripts/route_task.py` | Request V1, identity, merge, emit |
| `skills/model-router/scripts/policy_digest.py` | Canonical `policy_sha256` |
| `skills/model-router/scripts/locate_router.py` | Host-neutral locator (also usable as reference) |
| `skills/model-router/config/model-routing.yaml` | `dispatchable`, gemini unbound family |
| `skills/model-router/tests/test_request_v1.py` | Request JSON + merge + digest + locator |
| `skills/model-router/tests/test_routing.py` | Existing suite stays green; identity fields added |

### P1 — `deep-suite`

| Path | Role |
|---|---|
| `.claude-plugin/marketplace.json` | 10th entry + `dependencies` on work/loop |
| `.agents/plugins/marketplace.json` | Mirror + router `INSTALLED_BY_DEFAULT` |
| `.claude-plugin/suite-extensions.json` | Same-order key + empty artifacts |
| `scripts/check-plugin-count.js` | `ten` + probes from `WORD_TO_NUM` |
| `tests/codex-marketplace-contract.test.js` | Router-only installation exception |
| `schemas/payload-registry/deep-model-router/routing-decision/v1.0.schema.json` | Canonical payload |
| README / guides TOTAL narratives | `nine` → `ten` |

### P2a — `deep-work` worktree

| Path | Role |
|---|---|
| `scripts/router-shadow.js` | Invoke locator + record comparison |
| `skills/deep-work-orchestrator/SKILL.md` §1-8.5 | Call after `model-routing-cli.js` |
| `skills/deep-research/SKILL.md` | Same |
| tests | Authority bytes unchanged; shadow key written |

### P2b — `deep-loop` worktree

| Path | Role |
|---|---|
| `scripts/lib/episode.mjs` `recordEpisode` | `--routing` on `in_progress` |
| `scripts/lib/review.mjs` `dispatchReview` | `--routing` at checker create |
| `scripts/deep-loop.mjs` | CLI flags |
| `skills/deep-loop-continue/SKILL.md` | Call route before in_progress / before spawn |
| tests | Freeze, overwrite reject, HIGH/CRITICAL block |

---

### Task 1: P0 layout + manifests

**Repo:** `deep-model-router`  
**Files:**
- Move: `skill/**` → `skills/model-router/**` (git mv)
- Create: `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `AGENTS.md`, `CLAUDE.md`
- Modify: any CI / pytest path that hard-codes `skill/`
- Update: personal skill symlinks are **not** part of the commit; they stay a local convenience until P5

**Interfaces:**
- Produces: plugin name `deep-model-router`, version `1.0.0`, skill path `skills/model-router/SKILL.md`

- [ ] **Step 1: Write the failing path-literal test first**

Add `skills/model-router/tests/test_plugin_layout.py` (path can live next to the current tests under `skill/tests/` before the move) that asserts:

```python
def test_scripts_can_see_plugin_manifest():
    here = Path(__file__).resolve()
    root = next(p for p in here.parents if (p / ".claude-plugin" / "plugin.json").is_file())
    data = json.loads((root / ".claude-plugin" / "plugin.json").read_text())
    assert data["name"] == "deep-model-router"
    assert data["version"] == "1.0.0"
```

Run it: expected FAIL (no plugin.json yet).

- [ ] **Step 2: Move the skill tree, then add manifests**

```bash
cd /Users/sungmin/Dev/claude-plugins/deep-model-router
git mv skill skills/model-router
```

- [ ] **Step 2: Write Claude manifest**

```json
{
  "name": "deep-model-router",
  "version": "1.0.0",
  "description": "Deterministic model/effort/review router for Claude Code, Codex, and Grok",
  "author": { "name": "Sungmin-Cho" },
  "repository": "https://github.com/Sungmin-Cho/claude-deep-model-router.git",
  "license": "MIT",
  "category": "Productivity",
  "keywords": ["routing", "model-selection", "review-policy", "harness"]
}
```

Codex manifest copies name/version/description and adds `skills: "./skills/"` plus the standard `interface` block (mirror `deep-goal/.codex-plugin/plugin.json`).

- [ ] **Step 3: Point tests at the new tree**

`skills/model-router/tests/*.py` currently do `parent.parent / "scripts"`. After the move, `Path(__file__).resolve().parent.parent / "scripts"` still works. Grep the repo for `skill/` path literals and fix.

- [ ] **Step 4: Validate**

```bash
cd /Users/sungmin/Dev/claude-plugins/deep-model-router
python3 -m pytest skills/model-router/tests/ -q
claude plugin validate .
```

Expected: 213+ passed; `claude plugin validate .` green.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: package model-router as deep-model-router plugin"
```

---

### Task 2: P0 identity + `policy_sha256`

**Repo:** `deep-model-router`  
**Files:**
- Create: `skills/model-router/scripts/policy_digest.py`
- Modify: `skills/model-router/scripts/route_task.py` emit (`result` dict ~1879)
- Test: `skills/model-router/tests/test_request_v1.py`

**Interfaces:**
- Produces: `policy_sha256(config_path) -> str` (64 hex)
- Decision always includes `route_schema_version: 1`, `router_plugin_version` (from plugin.json), `policy_sha256`

Canonicalization (spec §11.4):

```python
def policy_sha256(config_path: Path) -> str:
    raw = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    blob = json.dumps(raw, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()
```

- [ ] **Step 1: Failing tests**

```python
def test_decision_carries_identity_fields():
    out = r(task_class="MECHANICAL")
    assert out["route_schema_version"] == 1
    assert out["router_plugin_version"] == "1.0.0"
    assert re.fullmatch(r"[0-9a-f]{64}", out["policy_sha256"])

def test_policy_digest_is_stable_and_comment_insensitive():
    a = policy_sha256(CFG_PATH)
    # rewrite yaml with an extra comment only → digest unchanged
    ...
```

- [ ] **Step 2: Run — expect FAIL** (`KeyError` / missing keys)

- [ ] **Step 3: Implement digest + emit**

Resolve `router_plugin_version` by walking ancestors of `scripts/route_task.py` until `.claude-plugin/plugin.json` exists (after the layout move that is **three** parents: `scripts/` → `model-router/` → `skills/` → repo root). Do not hard-code the version and do not assume a fixed depth in production code — the walk is the contract; add a test that the file is found from the scripts directory.

- [ ] **Step 4: pytest green + commit** `feat: emit RouteDecisionV1 identity fields`

---

### Task 3: P0 `--request-json` + local_policy merge

**Repo:** `deep-model-router`  
**Files:**
- Modify: `route_task.py` `build_parser`, `main`, `route()`
- Test: `tests/test_request_v1.py`

**Interfaces:**
- Consumes: RouteRequestV1 file (spec §4 + §11.1–11.2)
- Produces: Decision + `effective_policy`, `selected_capability_tier`, `selected_families`, `local_policy_applied`
- New terminal: `UNSATISFIABLE_LOCAL_POLICY` (exit 1)

Request schema accepted by `--request-json`:

```python
REQUEST_V1_KEYS = {
    "route_schema_version", "task_class", "complexity", "uncertainty",
    "blast_radius", "reversibility", "reasoning_centric", "flags",
    "runtime", "prior_failures", "availability_snapshot", "local_policy",
}
AVAIL_KEYS = {
    "unavailable_roles", "unavailable_models", "isolation", "isolation_evidence",
}
LOCAL_POLICY_KEYS = {
    "minimum_capability_tier", "minimum_effort", "minimum_reviewers",
    "minimum_provider_families", "allowed_families",
}
```

Rules:
- `route_schema_version` required; not `1` → `ValidationError` → exit 2
- unknown key at top-level, in `availability_snapshot`, or in `local_policy` → exit 2
- `prior_failures` is a list of model ids → `prior_failures=len(ids)`, `prior_models=ids`
- `--request-json` wins over flags
- merge **before** resolve (spec §11.1)
- empty `allowed_families` list is unsatisfiable; omitted/null is no extra constraint
- `effort_below_floor` after merge against a model ceiling that cannot satisfy `minimum_effort` → `UNSATISFIABLE_LOCAL_POLICY` if the local floor is what made it impossible; existing `effort_below_floor` + human gate stays for *router* floors that are still executable

- [ ] **Step 1: Failing tests (write first)**

```python
def test_request_json_unknown_field_exits_2(tmp_path):
    p = tmp_path / "req.json"
    p.write_text(json.dumps({
        "route_schema_version": 1, "task_class": "MECHANICAL",
        "complexity": 0, "uncertainty": 0, "blast_radius": 0, "reversibility": 0,
        "extra": True,
    }))
    assert main(["--request-json", str(p), "--format", "json"]) == 2

def test_allowed_families_empty_is_unsatisfiable(tmp_path):
    ...
    out = json.loads(...)
    assert out["terminal"] == "UNSATISFIABLE_LOCAL_POLICY"

def test_allowed_families_intersection_with_claude_only_native():
    # local_policy.allowed_families=["claude"] must not seat an openai worker
    ...

def test_minimum_effort_max_is_monotonic():
    # router would pick MEDIUM; local minimum_effort=HIGH → effective HIGH
    ...

def test_minimum_capability_tier_and_reviewer_and_family_floors():
    # each lattice field independently raises; combined uses per-field max
    ...

def test_unsatisfiable_when_allowed_intersection_cannot_seat_min_families():
    ...

def test_isolation_evidence_without_isolation_exits_2():
    ...

def test_request_json_wins_over_legacy_json_and_flags():
    ...

def test_nested_unknown_field_in_local_policy_exits_2():
    ...
```

- [ ] **Step 2: Implement parser + merge + emit fields**
- [ ] **Step 3: pytest + commit** `feat: accept RouteRequestV1 and enforce local_policy`

---

### Task 4: P0 gemini unbound family + dispatchable flag

**Repo:** `deep-model-router`  
**Files:**
- Modify: `config/model-routing.yaml` models + `effort_map`
- Modify: config loader so `effort_map` keys == registry families still holds
- Modify: resolver skips `dispatchable: false` models for role bindings and reviewer candidates
- Test: existing `test_defects.py` family-completeness + new unbound test

**Interfaces:**
- Registry row (probe then fill; suite already uses this id):

```yaml
gemini_flash:
  id: gemini-3.6-flash-high
  family: gemini
  capability_tier: 1
  dispatchable: false
  verified: true   # only after a real probe in this environment
  price_per_mtok: { input: 0, output: 0 }  # fill from probe / public price
```

```yaml
effort_map:
  gemini:
    MINIMAL: low
    LOW: low
    MEDIUM: medium
    HIGH: high
    VERY_HIGH: high
    MAX: high
```

Do **not** add gemini to `role_bindings` or fallback lists.

- [ ] **Step 1: Probe** `gemini` CLI if present; if absent, still register with `verified: false` and `dispatchable: false` (do not invent a transport).
- [ ] **Step 2: Tests** — unbound family is in `effort_map`, not in any binding; resolver never returns its id.
- [ ] **Step 3: commit** `feat: register unbound gemini family`

---

### Task 5: P0 locator algorithm + consumer-copyable module

The locator **cannot live only inside the plugin it locates**. P0 publishes the algorithm and a 40-line reference implementation. Each consumer copies it (P2 tasks).

**Repo:** `deep-model-router`  
**Files:**
- Create: `skills/model-router/scripts/locate_router.py` (reference + self-test)
- Create: `docs/locator.md` (normative order, identical to the function docstring)

**Interfaces:**

```python
def locate_router_cli(env: dict, home: Path) -> Path | None:
    """
    1. env['DEEP_MODEL_ROUTER_CLI'] if that path is an executable file
    2. env['DEEP_MODEL_ROUTER_ROOT']/skills/model-router/scripts/route_task.py
       if that file exists (plugin-manager / test injection)
    3. Claude cache: home/.claude/plugins/cache/**/deep-model-router/<ver>/skills/model-router/scripts/route_task.py
       (highest semver directory)
    4. Codex cache: home/.codex/plugins/**/deep-model-router/**/skills/model-router/scripts/route_task.py
    Never return: home/.claude/skills/model-router, any path whose resolved
    parent is a source checkout (no .claude-plugin/plugin.json name match),
    or ../deep-model-router relative to the caller.
    """
```

Node consumers reimplement the same order as `locateDeepModelRouter({env, home})` in their own repo (Task 9/10). They do not import the Python file at runtime.

- [ ] **RED tests first:** env hit; `DEEP_MODEL_ROUTER_ROOT` hit; cache hit; missing → None; personal symlink rejected; `../deep-model-router` rejected; python3 missing is a consumer-side `unavailable` (tested in P2 adapters)
- [ ] Implement + commit `feat: add host-neutral router locator`

P0 complete when: pytest green, `claude plugin validate .` green, identity fields present, request-json works.

---

### Task 6: P0→P1 remote cutover

**Repo:** `deep-model-router` (GitHub)

P1 marketplace edits are **forbidden** until every item below succeeds:

- [ ] `gh repo rename claude-deep-model-router`
- [ ] `git remote -v` shows `https://github.com/Sungmin-Cho/claude-deep-model-router.git`
- [ ] `git ls-remote https://github.com/Sungmin-Cho/model-router.git HEAD` still resolves (redirect)
- [ ] `git tag deep-model-router--v1.0.0 && git push origin main --tags`
- [ ] Record the immutable 40-char SHA of `origin/main` after the push; that SHA is the only pin P1 may write

If rename or tag push fails, **stop and ask the human**. Do not edit suite manifests.

---

### Task 7: P1 suite gates + 10th entry

**Repo:** `deep-suite` (this checkout)

**Files:**
- Modify: `scripts/check-plugin-count.js` — `WORD_TO_NUM.ten = 10`; build probe alternation from keys
- Modify: every `TOTAL` narrative (`README.md`, `README.ko.md`, `guides/context-management.md`, `.ko`, `guides/hook-patterns.md`, `.ko`, marketplace `metadata.description`)
- Test: existing checker tests + a fixture that `"ten plugins"` is visible and a leftover `"nine plugins"` fails
- Modify: `tests/codex-marketplace-contract.test.js`

```javascript
const installation = plugin.name === 'deep-model-router'
  ? 'INSTALLED_BY_DEFAULT'
  : 'AVAILABLE';
assert.equal(plugin.policy.installation, installation);
```

- Insert plugin **10th** in both manifests, same SHA, URL `https://github.com/Sungmin-Cho/claude-deep-model-router.git`
- Claude marketplace only, on `deep-work` and `deep-loop` entries:

```json
"dependencies": [{ "name": "deep-model-router", "version": "^1.0.0" }]
```

- Sidecar: add `deep-model-router` as the last `plugins` key (same order as marketplace) with `artifacts: { writes: [], reads: [] }`, `hooks_active: []`, `hooks_intentionally_empty_reason` (lazy preflight, no default hook), and root-or-plugin `x-model-routing` authority declaration (`decision_plane: deep-model-router`, `schema: RouteRequestV1/RouteDecisionV1`)
- Create payload schema at `schemas/payload-registry/deep-model-router/routing-decision/v1.0.schema.json` requiring `route_schema_version`, `router_plugin_version`, `policy_sha256`, `effective_policy`, and optional `attempt_id`. `envelope.producer` is **not** this plugin for P0–P2 (no router-written envelope; add a test that the router repo emits none).
- `npm run docs:write && npm run preflight`
- `claude plugin validate .`
- Isolated Codex marketplace smoke (spec P1):

```bash
tmp_home=$(mktemp -d)
mkdir -p "$tmp_home/.codex"
CODEX_HOME="$tmp_home/.codex" HOME="$tmp_home" \
  codex plugin marketplace add "$PWD"
# expect the added marketplace to list deep-model-router with INSTALLED_BY_DEFAULT
rm -rf "$tmp_home"
```

- [ ] **Step 1: plugin-count tests/fixtures first** (red on current `nine`)
- [ ] **Step 2: narratives + WORD_TO_NUM + probes**
- [ ] **Step 3: manifests + sidecar + schema + contract test**
- [ ] **Step 4: preflight + validate**
- [ ] **Step 5: commit** `feat: register deep-model-router as the tenth suite plugin`

---

### Task 8: P1 bilingual guide section

**Repo:** `deep-suite`

- Add a short "Model routing" section to `guides/` (en + ko): 3-layer consumption, locator, degrade, no-downgrade.
- Do not put version literals outside markers.
- `npm run docs:sync`

---

### Task 9: P2a deep-work shadow (Orca worktree)

**Repo:** `deep-work` via

```bash
orca worktree create --repo id:133552df-6f21-4e76-b69d-a6bf680c722f --name dmr-p2a-shadow --no-parent --json
```

**Files:**
- Create: `scripts/lib/locate-deep-model-router.js` (copy of Task 5 algorithm)
- Create: `scripts/lib/router-adapter.js` — `translateRouteOutcome({exit, stdout, stderr, processState})` implementing every §11.3 row
- Create: `scripts/router-shadow.js`
- Modify: orchestrator §1-8.5 and `deep-research/SKILL.md` immediately after `model-routing-cli.js`
- Test: `scripts/router-shadow.test.js`, `scripts/lib/router-adapter.test.js`, `scripts/lib/locate-deep-model-router.test.js`

`router-shadow.js` contract:

```javascript
// invoke locate + python3 route_task.py --request-json --format json
// never throw into the orchestrator; on any §11.3 failure return
// { authority: mrOut, shadow: { dispatch_authorized:false, status, degrade_reason, ... } }
export function recordRouterShadow({ mrOut, request, env }) { ... }
```

State: write `model_routing_meta_json.router_shadow` only. Phase-guard and dispatch must ignore the key.

Shadow also stores `policy_sha256` and freezes the first observation of the session; a later mismatch sets `status: invalid` and must not change `MR_OUT`.

- [ ] **RED first:** authority clone; HIGH/CRITICAL error does not rewrite `model_routing`; adapter table for exits 0–5 + spawn/timeout/signal/empty/out-of-range/`TERMINATION_UNCONFIRMED`; digest freeze + mismatch; locator env/cache/missing/python3-unavailable
- [ ] Wire both call sites
- [ ] Worktree tests green
- [ ] Commit on the worktree branch `feat: shadow-compare deep-model-router decisions`

---

### Task 10: P2b deep-loop live (Orca worktree)

**Repo:** `deep-loop` via

```bash
orca worktree create --repo id:c561bb24-e313-4132-9632-b68069ad0353 --name dmr-p2b-live --no-parent --json
```

**Files:**
- Create: `scripts/lib/locate-deep-model-router.mjs` (Task 5 algorithm)
- Create: `scripts/lib/router-adapter.mjs` — `translateRouteOutcome` (§11.3 complete matrix)
- Modify: `scripts/lib/episode.mjs` `recordEpisode` — optional `routing`, only with `status === 'in_progress'`, reject if `ep.routing` already set, same `appendAnchored` transaction
- Modify: `scripts/deep-loop.mjs` `episode record` — parse `--routing` JSON
- Modify: `scripts/lib/review.mjs` `dispatchReview` + `newEpisode` — optional `routing` at create
- Modify: `scripts/deep-loop.mjs` `review dispatch --routing`
- Modify: `scripts/lib/respawn.mjs` (~599) — if `episode.routing` exists, use `selected_model` / `selected_effort_native`; do not re-invoke the router
- Modify: `scripts/lib/session-profile.mjs` — must not overwrite a frozen `episode.routing`
- Modify: `skills/deep-loop-continue/SKILL.md` maker (after `adapter resolve`, before `episode record --status in_progress`) and checker (after route selection, before spawn)
- Tests: `tests/router-adapter.test.mjs`, `tests/episode-routing.test.mjs`, `tests/resume-routing-freeze.test.mjs`

- [ ] **RED first:** `recordEpisode` / `dispatchReview` freeze + overwrite reject; adapter 0–5 + process failures + `TERMINATION_UNCONFIRMED` write-retry fence; digest freeze/mismatch; `respawn.mjs` and `session-profile.mjs` reuse freeze and never call locator on an in_progress/done episode; missing routing degrades to `session_profile`; HIGH/CRITICAL router failure does not call `record --status in_progress`
- [ ] Implement APIs
- [ ] Skill text
- [ ] Commit `feat: freeze router decisions at new episode boundaries`

---

### Task 11: Follow-ons (do not execute in this plan)

- P3 deep-review resolver-only (§11.8)
- P4 evolve freeze + optional wiki/docs/memory
- P5 dashboard widget + remove personal symlinks + catalog de-dupe after evidence gates

---

## Self-review

**Spec coverage**
- D1–D4, D6: Tasks 1, 5, 7
- D5 identity + request: Tasks 2–3
- D7 pilots: Tasks 9–10
- D8 surface: Task 11 (later) — P2 does not touch review
- D10 gemini: Task 4
- D11 schema: Task 7; writers embed until P5
- D12 adapter: Task 3 emit + Tasks 9–10 consumers
- §11.1–11.11: Tasks 3, 5, 7, 9, 10

**Placeholder scan:** gemini probe may leave `verified: false` — that is specified, not TBD.

**Type consistency:** `routing` / `router_shadow` / `effective_policy` names match §11.

## Execution notes

- P0 and P1 are sequential (P1 needs the P0 SHA).
- P2a and P2b start only after P1 preflight is green, and run in parallel Orca worktrees.
- Do not commit `.deep-suite-cache/` review receipts.
