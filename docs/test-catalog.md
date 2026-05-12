# Deep Suite — Test Catalog (M5.5)

> M5.5 (Test Catalog Migration) 산출물. 분석 §우선순위 #4의 **8개 테스트 카탈로그**를
> 6 plugin repo에 분산 배치하기 위한 cross-reference. 새 testing framework 도입 없이
> 기존 `node:test` 패턴(`phase-guard-hardening.test.js` 모범)을 plugin repo 별로 확산한다.
>
> **마지막 갱신**: 2026-05-12 (#7 dangerous-command denylist closure)
> **상태**: **5/8 완료**, 남은 2 항목 (#3 hook golden, #5 stale-recovery)
> **Spec**: `docs/deep-suite-harness-roadmap.md` §M5.5
> **Handoff**: `docs/superpowers/plans/2026-05-12-m5.5-remaining-tests-handoff.md` (gitignored)

---

## Catalog (8 tests)

| # | 테스트 | 책임 plugin | 위치 | 실행 | 상태 |
|---|---|---|---|---|---|
| 1 | manifest-doc sync | suite | §1 below | `npm test` + `npm run docs:sync` | ✅ M2 (2026-05-07, PR #7) |
| 2 | artifact schema fixture | suite | §2 below | `npm run validate-artifact-fixtures` | ✅ M3 Phase 1 (2026-05-07, PR #8) |
| 3 | hook golden | deep-work, deep-evolve, deep-wiki | §3 below (pending) | (TBD) | 🔴 M5.5 남음 |
| 4 | cross-platform CI matrix | deep-work, deep-evolve, deep-wiki, deep-review | §4 below | GH Actions (push + PR) | ✅ 2026-05-12 (suite PR #17) |
| 5 | stale-recovery | deep-review, deep-wiki, deep-evolve | §5 below (pending) | (TBD) | 🔴 M5.5 남음 |
| 6 | null-signal redistribution | deep-dashboard | §6 below | `npm test` (in deep-dashboard) | ✅ 2026-05-11 (PR #11) |
| 7 | dangerous-command denylist | suite + deep-work | §7 below | `npm test` 양쪽 | ✅ 2026-05-12 (this PR) |
| 8 | context handoff round-trip | deep-work + deep-evolve | §8 below | `npm test` 양쪽 | ✅ 2026-05-12 (M5.7 absorbed) |

---

## §1. manifest-doc sync (M2-absorbed)

**Goal**: marketplace SHA → `plugin.json.version` → suite docs(README/CLAUDE/guides) → sidecar(`suite-extensions.json`) → memory hierarchy 5개 layer 일관성.

**Files**:
- `tests/cli-sync-checkers.test.js` — 6 `check-*` 스크립트 spawnSync 시나리오
- `tests/markers.test.js` — auto-generated marker round-trip
- `tests/generate-reference-sections.test.js` — `generate-reference-sections.js --check/--write/--id` CLI
- `scripts/check-readme-plugin-table.js` / `check-claude-md-paths.js` / `check-guide-version.js` / `check-semver-sha-sync.js` / `check-pinned-plugin-paths.js` / `check-memory-hierarchy.js`

**Run**:
```bash
npm test                       # all node:test files
npm run docs:check             # marker drift only
npm run docs:sync              # 6 check-* in sequence
```

**CI**: `.github/workflows/manifest-doc-sync.yml` (PR + push + daily cron)

---

## §2. artifact schema fixture (M3-absorbed)

**Goal**: M3 envelope + payload-registry × 6 producer schema 호환성. valid-* fixture는 통과, invalid-* fixture는 명시된 사유로 거부.

**Files**:
- `schemas/artifact-envelope.schema.json` (Draft 2020-12, SemVer 2.0.0 strict)
- `schemas/payload-registry/<producer>/<artifact_kind>/v<MAJOR.MINOR>.schema.json` (8 seeds across 6 producers)
- `scripts/validate-artifact.js` — single-file CLI validator
- `scripts/validate-artifact-fixtures.js` — bulk CI gate
- `scripts/wrap-artifact.js` — Phase 2 plugin-maintainer helper
- `tests/validate-artifact.test.js` — CLI scenarios (envelope/payload phase + registry-miss)
- `tests/wrap-artifact.test.js` — roundtrip + override + kebab-case reject
- `tests/fixtures/envelope-payloads/<producer>/<kind>/v<v>/{valid-*,invalid-*}.json`

**Run**:
```bash
npm run validate-artifact-fixtures       # 24 fixtures, fail on any non-match
npm run validate-artifact -- <path.json> # single-file
npm test                                 # full suite (includes both .test.js above)
```

---

## §3. hook golden test (🔴 M5.5 남음)

**Goal**: PreToolUse / Stop / SessionStart hook의 stdout JSON + exit code + stderr를 fixture로 stabilize. 모범: deep-work `hooks/scripts/phase-guard-hardening.test.js`.

**Pattern (when implemented)**: `tests/fixtures/hook-input-*.json` + `tests/expected/hook-output-*.json` 비교.

**Per-plugin scope**:
- **deep-work** — PreToolUse phase-guard + SessionStart fitness-sync
- **deep-evolve** — PreToolUse experiment-guard (existence 확인 필요) + Stop
- **deep-wiki** — SessionStart auto-ingest-candidate

**Effort**: plugin × (1-2d). Total ~5d. Parallelizable.

**Reference**: handoff §2 #3.

---

## §4. cross-platform CI matrix (M5.5 #4)

**Goal**: macOS bash 3.2 + Linux GNU bash 양쪽에서 plugin test suite green. M5.7 R1 W2 (BSD/GNU `stat`) 가족의 첫 자동 catch 사례.

**Files** (4 plugins, identical pattern):
- `claude-deep-work/.github/workflows/tests.yml` — `os: [ubuntu-latest, macos-latest]` × `node-version: 20` + `bash --version` 출력 + `npm test` + 3 bash regression scripts
- `claude-deep-evolve/.github/workflows/tests.yml` — same matrix
- `claude-deep-wiki/.github/workflows/tests.yml` — same matrix
- `claude-deep-review/.github/workflows/tests.yml` — complements existing `phase6-protocol.yml`

**Closure record (2026-05-12)**:
- deep-work PR #27 merge `954a1bc` (v6.6.1 — included BSD/GNU `stat` reverse-order fix in `test-v6.4.2-regression.sh` §2 caught by new ubuntu leg on first run)
- deep-evolve PR #13 merge `7acb0c6`
- deep-wiki PR #14 merge `750c468`
- deep-review PR #10 merge `e278aff`
- suite PR #17 merge `983cb24` — 4 SHA bump + marker regen

**Run**: GitHub Actions on push/PR. Local mirror: `bash --version && npm test` on each repo.

---

## §5. stale-recovery test (🔴 M5.5 남음)

**Goal**: pending-scan 미완료, mutation lock leftover, interrupted session 등 비정상 종료 후 자동 복구 검증. setup에서 lock 파일/pending state 인공 생성 → plugin entry point 실행 → clean recovery 확인.

**Per-plugin scope**:
- **deep-review** — `.deep-review/.mutation.lock` dir + `.pending-mutation.json` → `auto_recover()` 가 user staging 보존하면서 release
- **deep-wiki** — `<wiki_root>/.wiki-meta/.pending-scan` → next scan이 detect + complete
- **deep-evolve** — 중단된 session의 `current.json` + journal → `/deep-resume` clean restore

**Effort**: plugin × (1-2d). Total ~5d.

**Reference**: handoff §2 #5.

---

## §6. null-signal redistribution (M5.5 #6)

**Goal**: deep-dashboard harnessability scorer의 `not_applicable` 처리를 pin. **No-redistribution semantic 채택** — wholly-NA dim은 `score = 0` × `weight`로 total에 contribution; weight renormalize는 일부러 안 함 (total 안정성 + ecosystem-mismatch 페널티 보존).

**Files**:
- `claude-deep-dashboard/lib/harnessability/missing-signal.test.js` — 290 lines, 6 tests:
  - wholly-NA dim
  - partial-NA dim
  - drift guard (renormalization regression)
  - 1-of-6 dim ceiling
  - multiple-NA defensive
  - Python mirror (Python scorer parity check)

**Run** (in `claude-deep-dashboard` repo):
```bash
npm test
```

**Closure**: PR #11 merge 2026-05-11.

---

## §7. dangerous-command denylist (M5.5 #7) ✅ 2026-05-12

**Goal**: example pack의 strict-mode hook(`denylist-guard.sh`) + deep-work `phase-guard.sh`가 destructive Bash 명령을 차단하는지 검증.

### Suite side

**Files**:
- `examples/hooks-strict-mode/scripts/denylist-guard.sh` — 7 family case branch (force-push / hard-reset-remote / rm-rf / sql-destructive / kubectl-destructive / npm-publish / curl-pipe-shell), each with own `CLAUDE_ALLOW_*` override env.
- `examples/hooks-strict-mode/.claude/settings.json` — 13 `if`-rule matchers wired to the 7 families.
- `tests/denylist.test.sh` — **54 assertions**: per-family {block + family-named stderr + WHY substring + override hint + override=1 bypass + override=0 still blocks} + unknown-family fail-closed + no-arg fail-closed. macOS bash 3.2 + GNU bash 5+ compatible.
- `tests/examples.test.js` — wrapper `test('tests/denylist.test.sh — ...')` spawns the .sh and asserts exit 0.
- `tests/examples.test.js` — settings.json family-set assertion (`hooks-strict-mode/.claude/settings.json covers all 7 documented dangerous-command families`).

**Run** (from suite root):
```bash
npm test                             # 125 tests including the .sh wrapper
bash tests/denylist.test.sh          # standalone .sh (54 case assertions)
```

**Fault injection verified**: removing `rm-rf` case → 5 failures (block + override paths). Swapping `CLAUDE_ALLOW_FORCE_PUSH` env name → 3 failures.

### deep-work side

**Files**:
- `hooks/scripts/phase-guard.sh` — Phase 5 (idle + `phase5_entered_at`, no `phase5_completed_at`) read-mostly allowlist + destructive-target check + compound-operator block + git read-only subcommand allowlist. Plus non-implement (research/plan/test/brainstorm) Bash flows to `phase-guard-core.preToolUseEnforcement` which runs `detectBashFileWrite()`.
- `hooks/scripts/phase-guard-core.js` — `BASH_FILE_WRITE_PATTERNS` includes `git push|reset --hard|clean -f`, `tar -x`, `sed -i`, `rsync`, in-place edits, etc.
- `tests/phase-guard-denylist.test.js` — **32 cases**:
  - Phase 5 denylist 12 (rm-rf /, `/bin/rm`, git push --force/-f, git reset --hard, DROP TABLE via psql, kubectl delete --all, npm publish, curl|sh, &&-chain, tar extract) — each pinned to observed rejection mechanism (`destructive-target` | `git-allowlist` | `allowlist-miss` | `compound-operator`)
  - Non-implement phase 18 (research/plan/test × 6 destructive Bash patterns)
  - Negative controls 2 (Phase 5 read-only git status passes; implement+relaxed allows)

**Run** (from `claude-deep-work` root):
```bash
npm test       # 119 tests (was 87 pre-denylist)
```

**Fault injection verified**: removing destructive command loop in `phase-guard.sh` → 3 expected RED.

---

## §8. context handoff round-trip (M5.5 #8 — M5.7 absorbed)

**Goal**: M5 `handoff.json` envelope이 producer→consumer round-trip에서 보존되는지. deep-work이 생성한 handoff를 deep-evolve가 수용 → deep-evolve가 새 handoff 생성 → deep-work이 재수용.

**Files**:
- `claude-deep-work/tests/handoff-roundtrip.test.js` — 25 assertions; dashboard `unwrapStrict` 계약 mirror
- `claude-deep-evolve/tests/handoff-roundtrip.test.js` — 24 assertions; same contract

**Run** (each repo):
```bash
npm test
```

**Closure**: M5.7 (2026-05-12) — deep-work PR #26 merge `d2c2035` (v6.6.0) + deep-evolve PR #12 merge `dc3d85f` (v3.3.0) + suite PR #16 merge `fb44232` (marketplace SHA bump).

**E2E smoke (post-M5.6 activation)**: 3 M5-activated dashboard metrics numeric — `suite.handoff.roundtrip_success_rate=1.0`, `suite.compaction.frequency=2`, `suite.compaction.preserved_artifact_ratio=0.417`.

---

## Maintenance

- **Adding a test row**: keep this catalog 1:1 with `docs/deep-suite-harness-roadmap.md` §M5.5 §"8개 테스트 분배" table. Roadmap is the spec; this is the cross-reference.
- **Plugin status change**: update both the §N section and the top-of-doc table row simultaneously. The `npm run docs:sync` checkers do **not** validate this doc — it's narrative.
- **When #3 or #5 ships**: replace `(pending)` / `(TBD)` cells with actual file paths + run commands + PR references.
- **6-month timer (2026-11-07)**: when triggered, this catalog must show how each plugin's tests verify the envelope adoption contract.
