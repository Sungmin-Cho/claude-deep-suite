# Health Engine + Architecture Fitness Function Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **v2 notes:** 3-way 리뷰 반영 — custom 타입 제거, required_missing, baseline commit/branch scoping, receipt 발견 계약, v1 JS/TS 스코프 명시.

**Goal:** deep-work Phase 1 Research에 Health Engine을 추가하여 세션 간 드리프트를 감지하고, fitness.yaml 기반 아키텍처 규칙을 계산적으로 검증한다. deep-review가 fitness.yaml과 health_report를 소비하도록 연동한다.

**Architecture:** health/ 디렉토리에 통합 Health Engine. Phase 1에서 자동 실행되며 드리프트 센서(병렬) + coverage-trend(순차) + fitness 검증(순차)을 오케스트레이션. Phase 4에서 Fitness Delta + Health Required gate로 재검증. deep-review는 fitness.yaml을 리뷰 기준으로, receipt의 health_report를 컨텍스트로 소비.

**Tech Stack:** Node.js (node:test), CJS, Markdown (commands), YAML (fitness.yaml)

**Spec:** `docs/superpowers/specs/2026-04-09-health-engine-fitness-function-design.md` (v2)

**Working Directories:**
- deep-work: `/Users/sungmin/Dev/deep-work/`
- deep-review: `/Users/sungmin/Dev/deep-review/`

**Branch:** `feat/health-engine-fitness-function` (base: `feat/computational-sensor-behaviour-harness` — #2 인프라 필요)

**Security Note:** fitness.yaml은 git으로 공유되는 프로젝트 파일이다. v1에서 custom 타입(임의 명령 실행)은 제거. dependency-vuln의 audit 명령은 registry.json(플러그인 내부 trusted config)에서만 정의. dep-cruiser 설치는 유저 명시적 승인 후에만 수행. 모든 외부 명령 실행은 `execFileSync`를 사용하여 shell injection을 방지한다.

---

## File Structure

### New Files (15)

| File | Responsibility |
|------|---------------|
| `health/health-baseline.js` | baseline 읽기/쓰기 (commit/branch scoping, 무효화 판정) |
| `health/drift/dead-export.js` | JS/TS 미사용 export 감지 (grep 기반) |
| `health/drift/stale-config.js` | JS/TS config 파일 깨진 참조 감지 |
| `health/drift/dependency-vuln.js` | 의존성 취약점 감지 (audit 파싱 내장) |
| `health/drift/coverage-trend.js` | 커버리지 퇴화 감지 (baseline 비교) |
| `health/drift/drift.test.js` | 4개 드리프트 센서 통합 테스트 |
| `health/fitness/rule-checkers/file-metric-checker.js` | 파일 줄 수 제한 검증 (범용) |
| `health/fitness/rule-checkers/pattern-checker.js` | 금지 패턴 검증 (범용) |
| `health/fitness/rule-checkers/structure-checker.js` | 파일 구조 규칙 검증 (범용) |
| `health/fitness/rule-checkers/dependency-checker.js` | dep-cruiser 연동 (JS/TS only) |
| `health/fitness/fitness-validator.js` | fitness.yaml 스키마 검증 + 규칙 실행 엔진 |
| `health/fitness/fitness-generator.js` | fitness.yaml 자동 생성 로직 |
| `health/fitness/fitness.test.js` | fitness 검증 통합 테스트 |
| `health/health-check.js` | 통합 Health Engine 진입점 (오케스트레이션) |
| `health/health-check.test.js` | Health Engine 통합 테스트 |

### Modified Files (9)

| File | Changes |
|------|---------|
| `sensors/registry.json` | 각 ecosystem에 `audit` 필드 추가 |
| `commands/deep-research.md` | Health Check 자동 실행 단계 + Health Report 컨텍스트 주입 |
| `commands/deep-test.md` | Fitness Delta Gate (Advisory) + Health Required Gate (Required) 추가 |
| `commands/deep-receipt.md` | health_report 필드 표시 |
| `commands/deep-status.md` | Health 상태 섹션 추가 |
| `package.json` | `files` 배열에 `health/` 추가 |
| (deep-review) `commands/deep-review.md` | Stage 3 prompt에 fitness.yaml 주입 + init에 안내 문구 |
| (deep-review) `agents/code-reviewer.md` | fitness.yaml 규칙 인지 지침 추가 |

---

## Task 1: Branch + Directory + Baseline Module

**Files:** Create: `health/health-baseline.js`, `health/health-check.test.js` (baseline 테스트만 먼저)

- [ ] **Step 1: Create branch and directory structure**
```bash
cd /Users/sungmin/Dev/deep-work
git checkout feat/computational-sensor-behaviour-harness
git checkout -b feat/health-engine-fitness-function
mkdir -p health/drift health/fitness/rule-checkers
```

- [ ] **Step 2: Write failing tests for health-baseline.js**

파일: `health/health-check.test.js`

8개 테스트:
- `readBaseline`: 파일 미존재 시 null 반환, 존재 시 JSON 파싱
- `writeBaseline`: commit/branch/updated_at 포함 기록
- `isBaselineValid`: branch 불일치 → false, 7일 초과 → false, 정상 → true, null → false

```javascript
'use strict';
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { readBaseline, writeBaseline, isBaselineValid } = require('./health-baseline.js');

describe('health-baseline', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns null when baseline file does not exist', () => {
    assert.equal(readBaseline(path.join(tmpDir, '.deep-work')), null);
  });

  it('reads and parses existing baseline', () => {
    const dir = path.join(tmpDir, '.deep-work');
    fs.mkdirSync(dir, { recursive: true });
    const data = { updated_at: '2026-04-09T14:30:00Z', commit: 'abc', branch: 'main', coverage: { line: 85 }, dead_exports: 3, fitness_violations: 1 };
    fs.writeFileSync(path.join(dir, 'health-baseline.json'), JSON.stringify(data));
    assert.deepEqual(readBaseline(dir), data);
  });

  it('writes baseline with commit and branch', () => {
    const dir = path.join(tmpDir, '.deep-work');
    fs.mkdirSync(dir, { recursive: true });
    writeBaseline(dir, { coverage: { line: 90 } }, 'def', 'feat/x');
    const written = JSON.parse(fs.readFileSync(path.join(dir, 'health-baseline.json'), 'utf-8'));
    assert.equal(written.commit, 'def');
    assert.equal(written.branch, 'feat/x');
    assert.equal(typeof written.updated_at, 'string');
  });

  it('invalidates when branch differs', () => {
    assert.equal(isBaselineValid({ updated_at: new Date().toISOString(), commit: 'a', branch: 'main' }, 'a', 'other'), false);
  });

  it('invalidates when older than 7 days', () => {
    const old = new Date(Date.now() - 8 * 86400000).toISOString();
    assert.equal(isBaselineValid({ updated_at: old, commit: 'a', branch: 'main' }, 'a', 'main'), false);
  });

  it('validates when branch and age match', () => {
    assert.equal(isBaselineValid({ updated_at: new Date().toISOString(), commit: 'a', branch: 'main' }, 'a', 'main'), true);
  });

  it('validates when commit differs but branch matches', () => {
    assert.equal(isBaselineValid({ updated_at: new Date().toISOString(), commit: 'a', branch: 'main' }, 'b', 'main'), true);
  });

  it('handles null baseline', () => {
    assert.equal(isBaselineValid(null, 'a', 'main'), false);
  });
});
```

- [ ] **Step 3: Run test → FAIL** (`node --test health/health-check.test.js`)

- [ ] **Step 4: Implement health-baseline.js**

```javascript
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const BASELINE_FILE = 'health-baseline.json';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function readBaseline(baselineDir) {
  try { return JSON.parse(fs.readFileSync(path.join(baselineDir, BASELINE_FILE), 'utf-8')); }
  catch { return null; }
}

function writeBaseline(baselineDir, data, commit, branch) {
  fs.mkdirSync(baselineDir, { recursive: true });
  const baseline = { updated_at: new Date().toISOString(), commit, branch, ...data };
  fs.writeFileSync(path.join(baselineDir, BASELINE_FILE), JSON.stringify(baseline, null, 2));
  return baseline;
}

function isBaselineValid(baseline, currentCommit, currentBranch) {
  if (!baseline) return false;
  if (baseline.branch !== currentBranch) return false;
  if (Date.now() - new Date(baseline.updated_at).getTime() > MAX_AGE_MS) return false;
  return true;
}

module.exports = { readBaseline, writeBaseline, isBaselineValid, BASELINE_FILE };
```

- [ ] **Step 5: Run test → PASS**

- [ ] **Step 6: Commit**
```bash
git add health/ && git commit -m "feat(health): add baseline module with commit/branch scoping"
```

---

## Task 2: Dead Export Sensor

**Files:** Create: `health/drift/dead-export.js`, `health/drift/drift.test.js`

- [ ] **Step 1: Write 7 failing tests** for `scanDeadExports` in `drift.test.js`:
  - unused named export 감지
  - 모든 export가 import됨 → count 0
  - barrel 파일(index.js) export 제외
  - re-export 제외
  - module.exports 패턴 처리
  - ignore list 적용
  - 빈 프로젝트 → count 0

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement dead-export.js**
  - `collectFiles(dir, extensions)`: 재귀 파일 수집 (node_modules, . 디렉토리 제외)
  - `extractExportNames(content)`: 3가지 패턴 (export function/const, export {}, module.exports = {})
  - `extractImportNames(content)`: 4가지 패턴 (import {}, import default, const {} = require, require())
  - `isBarrelFile(filePath)`: index.* 파일 감지
  - `scanDeadExports(projectRoot, extensions, options)`: 메인 함수. ignoreList 지원

- [ ] **Step 4: Run test → PASS**

- [ ] **Step 5: Commit**
```bash
git add health/drift/ && git commit -m "feat(health): add dead-export drift sensor (JS/TS only)"
```

---

## Task 3: Stale Config + Dependency Vuln Sensors

**Files:** Create: `health/drift/stale-config.js`, `health/drift/dependency-vuln.js`. Modify: `sensors/registry.json`, `health/drift/drift.test.js`

- [ ] **Step 1: Add 4 stale-config tests**: broken package.json main, valid paths, broken tsconfig paths, no config files

- [ ] **Step 2: Add 3 dependency-vuln tests**: npm audit JSON with high vuln, clean audit, malformed JSON

- [ ] **Step 3: Run test → FAIL**

- [ ] **Step 4: Implement stale-config.js**
  - `scanPackageJson(projectRoot)`: main, types, typings, module, bin 경로 확인
  - `scanTsConfig(projectRoot)`: compilerOptions.paths 경로 확인 (주석 제거 후 JSON 파싱)
  - `scanStaleConfig(projectRoot)`: 통합 함수

- [ ] **Step 5: Implement dependency-vuln.js**
  - `parseNpmAudit(stdout)`: npm audit JSON 파싱. high/critical만 필터. 에러 시 `{ error: true }`
  - `runAudit(cmd, timeout)`: `execFileSync` 사용. non-zero exit에서도 stdout 파싱 (npm audit 특성)
  - `scanDependencyVuln(ecosystems, timeout)`: ecosystem별 audit 실행. 파싱 내장.

- [ ] **Step 6: Add audit field to registry.json**
  - javascript/typescript: `"audit": { "cmd": "npm audit --json" }`
  - python: `"audit": { "cmd": "pip audit --format json" }`

- [ ] **Step 7: Run test → PASS** (14개: dead-export 7 + stale-config 4 + dependency-vuln 3)

- [ ] **Step 8: Commit**
```bash
git add health/drift/ sensors/registry.json && git commit -m "feat(health): add stale-config and dependency-vuln drift sensors"
```

---

## Task 4: Coverage Trend Sensor

**Files:** Create: `health/drift/coverage-trend.js`. Modify: `health/drift/drift.test.js`

- [ ] **Step 1: Add 5 tests**: degradation beyond threshold, within threshold, null baseline, no coverage in baseline, improvement

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement coverage-trend.js**
  - `analyzeCoverageTrend(baseline, currentCoverage, threshold)`: baseline과 현재 커버리지 비교. threshold 기본 5%p.
  - baseline null/coverage 없음 → `{ status: 'not_applicable' }`

- [ ] **Step 4: Run test → PASS** (19개)

- [ ] **Step 5: Commit**
```bash
git add health/drift/ && git commit -m "feat(health): add coverage-trend drift sensor"
```

---

## Task 5: Fitness Rule Checkers (file-metric, pattern, structure)

**Files:** Create: `health/fitness/rule-checkers/file-metric-checker.js`, `pattern-checker.js`, `structure-checker.js`, `health/fitness/fitness.test.js`

- [ ] **Step 1: Write 6 failing tests** (2 per checker):
  - file-metric: 500줄 초과 감지, 모두 범위 내 → pass
  - pattern: 금지 패턴 감지, exclude 패턴 존중
  - structure: 비-colocated 테스트 감지, colocated → pass

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement file-metric-checker.js**
  - `collectByGlob(rootDir, pattern)`: glob 패턴 기반 파일 수집 (node_modules 제외)
  - `checkFileMetric(projectRoot, rule)`: line-count check. `{ ruleId, passed, violations }`

- [ ] **Step 4: Implement pattern-checker.js**
  - `checkForbiddenPattern(projectRoot, rule)`: regex 매칭. exclude 패턴 지원. `collectByGlob` 재사용.

- [ ] **Step 5: Implement structure-checker.js**
  - `checkStructure(projectRoot, rule)`: colocated check. source 파일별 expected test 파일 존재 확인.

- [ ] **Step 6: Run test → PASS** (6개)

- [ ] **Step 7: Commit**
```bash
git add health/fitness/ && git commit -m "feat(health): add file-metric, pattern, and structure fitness checkers"
```

---

## Task 6: Dependency Checker + Fitness Validator

**Files:** Create: `health/fitness/rule-checkers/dependency-checker.js`, `health/fitness/fitness-validator.js`. Modify: `health/fitness/fitness.test.js`

- [ ] **Step 1: Add 7 tests**:
  - dependency-checker: dep-cruiser 미설치 + required → required_missing, 미설치 + advisory → not_applicable
  - fitness-validator: unsupported version 거부, missing fields 거부, unknown type (custom) 거부, valid yaml 수용, invalid rules skip + valid rules 실행

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement dependency-checker.js**
  - `isDepCruiserAvailable()`: `execFileSync('npx', ['--no-install', 'depcruise', '--version'])` try/catch
  - `checkDependency(projectRoot, rule, options)`: available → dep-cruiser 실행. unavailable → severity 기반 required_missing/not_applicable

- [ ] **Step 4: Implement fitness-validator.js**
  - `VALID_TYPES`: `dependency`, `file-metric`, `forbidden-pattern`, `structure` (custom 없음)
  - `validateFitnessYaml(yaml)`: version 확인, 규칙별 필수 필드/타입 검증. `{ valid, errors, validRules, skippedRules }`
  - `runFitnessCheck(projectRoot, validRules, options)`: 규칙별 checker 디스패치. 결과 집계.
  - `loadFitnessYaml(projectRoot)`: `.deep-review/fitness.yaml` 로드 + 간이 YAML 파서

- [ ] **Step 5: Run test → PASS** (13개)

- [ ] **Step 6: Commit**
```bash
git add health/fitness/ && git commit -m "feat(health): add dependency-checker and fitness-validator with schema validation"
```

---

## Task 7: Fitness Generator

**Files:** Create: `health/fitness/fitness-generator.js`. Modify: `health/fitness/fitness.test.js`

- [ ] **Step 1: Add 4 tests**:
  - 항상 no-circular-deps + max-file-lines 포함
  - 계층 구조(controllers/services/repositories) 감지 → layer-direction 제안
  - config 모듈 감지 → no-direct-env-access 제안
  - 빈 프로젝트 → common rules만 (2개)

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement fitness-generator.js**
  - `COMMON_RULES`: no-circular-deps, max-file-lines
  - `detectLayers(projectRoot)`: src/ 하위 디렉토리 패턴 매칭
  - `detectConfigModule(projectRoot)`: src/config, config 등 존재 확인
  - `generateFitnessRules(projectRoot)`: 공통 + 감지된 규칙 조합
  - `formatFitnessYaml(rules)`: YAML 문자열 생성

- [ ] **Step 4: Run test → PASS** (17개)

- [ ] **Step 5: Commit**
```bash
git add health/fitness/ && git commit -m "feat(health): add fitness-generator for auto-proposing fitness.yaml"
```

---

## Task 8: Health Check Engine (Orchestrator)

**Files:** Create: `health/health-check.js`. Modify: `health/health-check.test.js`

- [ ] **Step 1: Add 4 orchestrator tests**:
  - health report에 drift + fitness 섹션 존재
  - drift 센서 병렬 실행 (5초 내 완료)
  - fitnessYaml 제공 시 결과 포함
  - fitnessYaml null 시 not_applicable

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement health-check.js**
  - `runHealthCheck(projectRoot, options)`: async 함수
    1. `Promise.allSettled` — dead-export + stale-config + dependency-vuln 병렬
    2. coverage-trend 순차
    3. fitness-validator 순차
  - `safeRun(fn)`: try/catch 래퍼
  - `formatDriftResult`, `formatDriftVuln`: 결과 정규화
  - CLI: `node health-check.js [projectRoot]` → JSON stdout

- [ ] **Step 4: Run test → PASS** (12개: baseline 8 + orchestrator 4)

- [ ] **Step 5: Run all health tests**
```bash
node --test health/health-check.test.js && node --test health/drift/drift.test.js && node --test health/fitness/fitness.test.js
```

- [ ] **Step 6: Commit**
```bash
git add health/ && git commit -m "feat(health): add health-check orchestrator with parallel drift scan"
```

---

## Task 9: deep-work Command Modifications

**Files:** Modify: `commands/deep-research.md`, `commands/deep-test.md`, `commands/deep-receipt.md`, `commands/deep-status.md`, `package.json`

- [ ] **Step 1: Read current commands** (deep-research.md, deep-test.md, deep-receipt.md, deep-status.md)

- [ ] **Step 2: Add Health Check step to deep-research.md** (Step 1 이후, main research 전)

신규 섹션 `### 1-2. Health Check (자동)`:
1. Health Engine 실행 지침
2. fitness.yaml 자동 생성 제안 흐름 (AskUserQuestion)
3. Health Report research context 주입 포맷
4. Phase 1 fitness baseline 기록
5. unresolved_required_issues 세션 상태 저장

- [ ] **Step 3: Add 2 Quality Gates to deep-test.md**

기존 Quality Gate 섹션에:
- Fitness Delta Gate (Advisory): Phase 1 baseline vs 현재 delta 비교
- Health Required Gate (Required): Phase 1 required_fail/required_missing 전파 + AskUserQuestion acknowledge

- [ ] **Step 4: Update deep-receipt.md** — health_report 필드 표시 (드리프트 + fitness 한줄 요약)

- [ ] **Step 5: Update deep-status.md** — Health 상태 섹션 (드리프트 4항목 + fitness 통과율)

- [ ] **Step 6: Update package.json** — `files` 배열에 `"health/"` 추가

- [ ] **Step 7: Commit**
```bash
git add commands/ package.json && git commit -m "feat: integrate health engine into research/test/receipt/status commands"
```

---

## Task 10: deep-review Modifications

**Files:** Modify (in `/Users/sungmin/Dev/deep-review/`): `commands/deep-review.md`, `agents/code-reviewer.md`

- [ ] **Step 1: Read current deep-review.md and code-reviewer.md**

- [ ] **Step 2: Add fitness.yaml + receipt injection to Stage 3**

deep-review.md Stage 3 (리뷰 실행)에:
- `.deep-review/fitness.yaml` 존재 확인 → code-reviewer prompt에 추가
- Receipt 발견 계약: `.deep-work/sessions/{session-id}/receipt.json` 탐색 → health_report 주입
- 없으면 skip (에러 아님)

- [ ] **Step 3: Add fitness.yaml awareness to code-reviewer.md**

fitness.yaml이 prompt에 포함된 경우의 리뷰 지침:
- 규칙의 의도 기반 설계 방향성 평가
- fitness.yaml에 없는 아키텍처 관점도 자유롭게 지적

- [ ] **Step 4: Add fitness.yaml guidance to init mode**

init 모드에 안내 문구:
- rules.yaml = inferential, fitness.yaml = computational 구분 설명
- `/deep-work` Phase 1에서 자동 생성 안내

- [ ] **Step 5: Commit**
```bash
cd /Users/sungmin/Dev/deep-review && git add commands/ agents/ && git commit -m "feat: integrate fitness.yaml and health_report into deep-review"
```

---

## Task 11: Integration Verification

**Files:** No new production files.

- [ ] **Step 1: Run all health tests**
```bash
cd /Users/sungmin/Dev/deep-work && node --test health/health-check.test.js && node --test health/drift/drift.test.js && node --test health/fitness/fitness.test.js
```
Expected: All PASS

- [ ] **Step 2: Run existing sensor tests (regression)**
```bash
cd /Users/sungmin/Dev/deep-work && node --test sensors/detect.test.js && node --test sensors/run-sensors.test.js && node --test sensors/parsers/parsers.test.js && node --test hooks/scripts/phase-guard-core.test.js && node --test hooks/scripts/sensor-trigger.test.js
```
Expected: All PASS (기존 168개 테스트 유지)

- [ ] **Step 3: Verify health-check.js CLI**
```bash
node health/health-check.js .
```
Expected: JSON with `drift` and `fitness` sections

- [ ] **Step 4: Verify package.json files**
```bash
node -e "const p=require('./package.json');console.log(p.files.includes('health/')?'OK':'MISSING')"
```
Expected: `OK`

- [ ] **Step 5: Commit integration verification**
```bash
git add -A && git commit -m "test: integration verification for health engine"
```

---

## Task Dependencies

```
Task 1 (baseline) ───────────────────────────────────────┐
                                                          │
Task 2 (dead-export) ──┐                                  │
                       ├── Task 3 (stale-config + vuln) ──┤
                       │                                   │
Task 4 (coverage-trend) ──────────────────────────────────┼── Task 8 (health-check.js)
                                                           │
Task 5 (rule-checkers) ──── Task 6 (dep-checker + valid.) │
                                     │                     │
                            Task 7 (generator) ────────────┘
                                                           │
                                                Task 9 (deep-work commands)
                                                           │
                                                Task 10 (deep-review)
                                                           │
                                                Task 11 (integration)
```

**병렬화 가능:**
- Tasks 1, 2: 무의존
- Tasks 5, 4: 무의존
- Tasks 9, 10: 서로 독립

**순차 필수:**
- 2 → 3 (drift.test.js 공유)
- 5 → 6 → 7 (fitness 체인)
- 1-8 완료 → 9, 10 → 11
