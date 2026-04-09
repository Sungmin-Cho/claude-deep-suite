# Health Engine + Architecture Fitness Function Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **v2 notes:** 3-way 리뷰 반영 — custom 타입 제거, required_missing, baseline commit/branch scoping, receipt 발견 계약, v1 JS/TS 스코프 명시.
> **v3 notes:** 3-way 플랜 리뷰 반영 — fitness.json→fitness.json, baseline ancestor 검증, receipt scan_commit, 생태계 인지 generator, health-ignore.json, .eslintrc 검증, Task 9 분할, 센서 개별 타임아웃.

**Goal:** deep-work Phase 1 Research에 Health Engine을 추가하여 세션 간 드리프트를 감지하고, fitness.json 기반 아키텍처 규칙을 계산적으로 검증한다. deep-review가 fitness.json과 health_report를 소비하도록 연동한다.

**Architecture:** health/ 디렉토리에 통합 Health Engine. Phase 1에서 자동 실행되며 드리프트 센서(병렬) + coverage-trend(순차) + fitness 검증(순차)을 오케스트레이션. Phase 4에서 Fitness Delta + Health Required gate로 재검증. deep-review는 fitness.json을 리뷰 기준으로, receipt의 health_report를 컨텍스트로 소비.

**Tech Stack:** Node.js (node:test), CJS, Markdown (commands), JSON (fitness.json — zero-dependency 플러그인 유지)

**Spec:** `docs/superpowers/specs/2026-04-09-health-engine-fitness-function-design.md` (v2)

**Working Directories:**
- deep-work: `/Users/sungmin/Dev/deep-work/`
- deep-review: `/Users/sungmin/Dev/deep-review/`

**Branch:** `feat/health-engine-fitness-function` (base: `feat/computational-sensor-behaviour-harness` — #2 인프라 필요)

**Security Note:** fitness.json은 git으로 공유되는 프로젝트 파일이다. v1에서 custom 타입(임의 명령 실행)은 제거. dependency-vuln의 audit 명령은 registry.json(플러그인 내부 trusted config)에서만 정의. dep-cruiser 설치는 유저 명시적 승인 후에만 수행. 모든 외부 명령 실행은 `execFileSync`를 사용하여 shell injection을 방지한다. `runAudit`은 명령 문자열을 `[binary, ...args]`로 분리하여 `execFileSync(binary, args)`로 호출한다.

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
| `health/fitness/fitness-validator.js` | fitness.json 스키마 검증 + 규칙 실행 엔진 (JSON.parse — 외부 의존성 없음) |
| `health/fitness/fitness-generator.js` | fitness.json 자동 생성 로직 |
| `health/fitness/fitness.test.js` | fitness 검증 통합 테스트 |
| `health/health-check.js` | 통합 Health Engine 진입점 (오케스트레이션) |
| `health/health-check.test.js` | Health Engine 통합 테스트 |

### Modified Files (10)

| File | Changes |
|------|---------|
| `sensors/registry.json` | 각 ecosystem에 `audit` 필드 추가 |
| `commands/deep-work.md` | Phase 1 Research 흐름에 Health Check 단계 언급 추가 |
| `commands/deep-research.md` | Health Check 자동 실행 단계 + Health Report 컨텍스트 주입 |
| `commands/deep-test.md` | Fitness Delta Gate (Advisory) + Health Required Gate (Required) + Phase 4 baseline 갱신 추가 |
| `commands/deep-receipt.md` | health_report 필드 표시 |
| `commands/deep-status.md` | Health 상태 섹션 추가 |
| `package.json` | `files` 배열에 `health/` 추가 |
| (deep-review) `commands/deep-review.md` | Stage 3 prompt에 fitness.json 주입 + init에 안내 문구 |
| (deep-review) `agents/code-reviewer.md` | fitness.json 규칙 인지 지침 추가 |

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

10개 테스트:
- `readBaseline`: 파일 미존재 시 null 반환, 존재 시 JSON 파싱
- `writeBaseline`: commit/branch/updated_at 포함 기록
- `isBaselineValid`: branch 불일치 → false, 7일 초과 → false, 정상 → true, null → false
- `isBaselineValid`: commit이 현재 branch ancestor가 아님 → false (rebase/force-push 감지)
- `isBaselineValid`: git 없는 프로젝트 (commit=null) → branch+age만으로 판정

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

  it('invalidates when commit is not ancestor (rebase/force-push)', () => {
    // isBaselineValid에 isAncestor 콜백 주입 — git merge-base --is-ancestor 래퍼
    const notAncestor = () => false;
    assert.equal(isBaselineValid({ updated_at: new Date().toISOString(), commit: 'old', branch: 'main' }, 'new', 'main', { isAncestor: notAncestor }), false);
  });

  it('validates when commit is ancestor', () => {
    const yesAncestor = () => true;
    assert.equal(isBaselineValid({ updated_at: new Date().toISOString(), commit: 'old', branch: 'main' }, 'new', 'main', { isAncestor: yesAncestor }), true);
  });

  it('skips ancestor check when commit is null (non-git project)', () => {
    assert.equal(isBaselineValid({ updated_at: new Date().toISOString(), commit: null, branch: null }, null, null), true);
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

function isBaselineValid(baseline, currentCommit, currentBranch, options = {}) {
  if (!baseline) return false;
  // non-git project: commit/branch null → age-only check
  if (baseline.commit === null && currentCommit === null) {
    return Date.now() - new Date(baseline.updated_at).getTime() <= MAX_AGE_MS;
  }
  if (baseline.branch !== currentBranch) return false;
  if (Date.now() - new Date(baseline.updated_at).getTime() > MAX_AGE_MS) return false;
  // ancestor check: rebase/force-push 감지
  if (options.isAncestor && baseline.commit && currentCommit) {
    if (!options.isAncestor(baseline.commit, currentCommit)) return false;
  }
  return true;
}

// git merge-base --is-ancestor 래퍼 (health-check.js에서 주입)
function gitIsAncestor(ancestorCommit, descendantCommit) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestorCommit, descendantCommit], { stdio: 'pipe' });
    return true;
  } catch { return false; }
}

module.exports = { readBaseline, writeBaseline, isBaselineValid, gitIsAncestor, BASELINE_FILE };
```

- [ ] **Step 5: Run test → PASS**

- [ ] **Step 6: Commit**
```bash
git add health/ && git commit -m "feat(health): add baseline module with commit/branch scoping"
```

---

## Task 2: Dead Export Sensor

**Files:** Create: `health/drift/dead-export.js`, `health/drift/drift.test.js`

- [ ] **Step 1: Write 10 failing tests** for `scanDeadExports` in `drift.test.js`:
  - unused named export 감지
  - 모든 export가 import됨 → count 0
  - barrel 파일(index.js) export 제외
  - re-export 제외
  - module.exports 패턴 처리
  - ignore list 적용 (`.deep-work/health-ignore.json`의 `dead_export_ignore` 배열)
  - 빈 프로젝트 → count 0
  - **entry point 제외**: package.json main/bin에 지정된 파일의 export 제외
  - **라이브러리 프로젝트 전체 제외**: package.json에 `main` 또는 `exports` 필드가 있으면 모든 export 스캔 skip → not_applicable
  - **health-ignore.json 로드**: `.deep-work/health-ignore.json` 파일에서 `dead_export_ignore` 배열 읽기

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

- [ ] **Step 1: Add 6 stale-config tests**: broken package.json main, valid paths, broken tsconfig paths, no config files, **broken .eslintrc extends (미설치 플러그인)**, **.eslintrc 없으면 skip**

- [ ] **Step 2: Add 3 dependency-vuln tests**: npm audit JSON with high vuln, clean audit, malformed JSON

- [ ] **Step 3: Run test → FAIL**

- [ ] **Step 4: Implement stale-config.js**
  - `scanPackageJson(projectRoot)`: main, types, typings, module, bin 경로 확인
  - `scanTsConfig(projectRoot)`: compilerOptions.paths 경로 확인 (주석 제거 후 JSON 파싱)
  - `scanEslintrc(projectRoot)`: .eslintrc/.eslintrc.json의 extends/plugins 설치 확인 (`node_modules/` 존재 여부)
  - `scanStaleConfig(projectRoot)`: 통합 함수

- [ ] **Step 5: Implement dependency-vuln.js**
  - `parseNpmAudit(stdout)`: npm audit JSON 파싱. high/critical만 필터. 에러 시 `{ error: true }`
  - `runAudit(binary, args, timeout)`: `execFileSync(binary, args)` 사용. 명령 문자열은 호출 전에 `cmd.split(/\s+/)`로 `[binary, ...args]` 분리. non-zero exit에서도 stdout 파싱 (npm audit 특성)
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
  - **Phase 1에서는 baseline만 참조** (테스트 실행 없음). `currentCoverage`는 Phase 3 SENSOR_RUN의 `coverage_flag` 피기백 결과를 세션 상태에서 읽어 전달. Phase 3 미실행 시 coverage-trend는 `not_applicable`.

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
  - `validateFitness(parsed)`: version 확인, 규칙별 필수 필드(id, type, severity)/타입 enum(dependency, file-metric, forbidden-pattern, structure) 검증, 중복 id 거부. `{ valid, errors, validRules, skippedRules }`
  - `runFitnessCheck(projectRoot, validRules, options)`: 규칙별 checker 디스패치. 결과 집계. `options: { depCruiserAvailable, timeout }`
  - `loadFitness(projectRoot)`: `.deep-review/fitness.json` 로드. `JSON.parse` — 외부 의존성 없음. 파싱 실패 시 null + 경고

- [ ] **Step 5: Run test → PASS** (13개)

- [ ] **Step 6: Commit**
```bash
git add health/fitness/ && git commit -m "feat(health): add dependency-checker and fitness-validator with schema validation"
```

---

## Task 7: Fitness Generator

**Files:** Create: `health/fitness/fitness-generator.js`. Modify: `health/fitness/fitness.test.js`

- [ ] **Step 1: Add 6 tests**:
  - JS/TS 프로젝트: no-circular-deps + max-file-lines 포함
  - 계층 구조(controllers/services/repositories) 감지 → layer-direction 제안
  - config 모듈 감지 → no-direct-env-access 제안
  - 빈 프로젝트 → max-file-lines만 (dependency 규칙 제외)
  - **비 JS/TS 프로젝트 → no-circular-deps 제외** (dependency 타입은 JS/TS만 지원)
  - **colocated-tests 감지**: src/ 내 테스트 패턴 감지 시 제안

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement fitness-generator.js**
  - `UNIVERSAL_RULES`: max-file-lines (범용)
  - `JS_TS_RULES`: no-circular-deps (dependency 타입 — JS/TS에서만 검증 가능)
  - `detectLayers(projectRoot)`: src/ 하위 디렉토리 패턴 매칭
  - `detectConfigModule(projectRoot)`: src/config, config 등 존재 확인
  - `detectTestPattern(projectRoot)`: src/ 내 colocated test 패턴 감지
  - `isJsTsProject(projectRoot)`: package.json 또는 tsconfig.json 존재 여부
  - `generateFitnessRules(projectRoot)`: ecosystem-aware 규칙 생성. 비 JS/TS면 dependency 규칙 제외
  - `formatFitnessJson(rules)`: JSON 문자열 생성 (`JSON.stringify(rules, null, 2)`)

- [ ] **Step 4: Run test → PASS** (17개)

- [ ] **Step 5: Commit**
```bash
git add health/fitness/ && git commit -m "feat(health): add fitness-generator for auto-proposing fitness.json"
```

---

## Task 8: Health Check Engine (Orchestrator)

**Files:** Create: `health/health-check.js`. Modify: `health/health-check.test.js`

- [ ] **Step 1: Add 7 orchestrator tests**:
  - health report에 drift + fitness 섹션 + scan_commit 존재
  - drift 센서 병렬 실행 (5초 내 완료)
  - fitness 제공 시 결과 포함
  - fitness null 시 not_applicable
  - **개별 센서 타임아웃 초과 시 timeout 상태 기록** (Promise.race)
  - **전체 180초 초과 시 남은 센서 timeout**
  - **health-ignore.json 로드 → dead-export에 ignoreList 전달**

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement health-check.js**

  **options 인터페이스:**
  ```
  {
    ecosystems: {},          // #2 detect.js 결과
    baseline: null,          // readBaseline() 결과
    fitness: null,           // loadFitness() 결과 (JSON 객체)
    commit: 'abc1234',       // 현재 git HEAD commit
    branch: 'main',         // 현재 git branch
    currentCoverage: null,   // Phase 3 SENSOR_RUN 커버리지 결과 (Phase 1에서는 null)
    skipAudit: false,        // audit 실행 skip 여부
    depCruiserAvailable: false,
    healthIgnore: {},        // .deep-work/health-ignore.json 내용
    timeouts: { deadExport: 30000, depVuln: 30000, staleConfig: 10000, coverage: 60000, fitness: 60000, total: 180000 },
  }
  ```

  **구현:**
  - `runHealthCheck(projectRoot, options)`: async 함수
    1. `.deep-work/health-ignore.json` 로드 → `healthIgnore`
    2. `withTimeout(fn, ms)`: `Promise.race([fn(), timeout(ms)])` 래퍼 — 개별 센서 타임아웃
    3. `Promise.allSettled` — dead-export(30s) + stale-config(10s) + dependency-vuln(30s) 병렬
    4. coverage-trend(60s) 순차 — `currentCoverage` null이면 not_applicable
    5. fitness-validator(60s) 순차
    6. 전체 180초 초과 시 남은 센서를 timeout으로 기록
  - 반환값에 `scan_commit` 필드 포함 (deep-review stale 판정용)
  - `safeRun(fn)`: try/catch 래퍼
  - `formatDriftResult`, `formatDriftVuln`: 결과 정규화
  - CLI: `node health-check.js [projectRoot]` → JSON stdout

  **receipt health_report 스키마:**
  ```json
  {
    "scan_time": "...",
    "scan_commit": "abc1234",
    "drift": { ... },
    "fitness": { ... }
  }
  ```

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

## Task 9a: Research + Work Command Integration

**Files:** Modify: `commands/deep-research.md`, `commands/deep-work.md`, `package.json`

- [ ] **Step 1: Read current deep-research.md and deep-work.md**

- [ ] **Step 2: Add Health Check step to deep-research.md** (Step 1 이후, main research 전)

신규 섹션 `### 1-2. Health Check (자동)`:

```markdown
### 1-2. Health Check (자동)

프로젝트 상태를 자동 진단합니다. 별도 명령 불필요.

1. **Health Engine 실행**: `node "$CLAUDE_PLUGIN_DIR/health/health-check.js" "$PROJECT_ROOT"`
   - 드리프트 센서 4개 (병렬): dead-export, stale-config, dependency-vuln + coverage-trend
   - fitness.json 검증 (있으면)
   - 전체 타임아웃: 180초

2. **fitness.json 자동 생성 제안** (`.deep-review/fitness.json` 미존재 시):
   - `node "$CLAUDE_PLUGIN_DIR/health/fitness/fitness-generator.js" "$PROJECT_ROOT"` 실행
   - 결과를 AskUserQuestion으로 유저에게 제안
   - 승인 시: `.deep-review/fitness.json` 생성 + `git add`
   - 거부 시: fitness 검증 `not_applicable`

3. **dep-cruiser 설치 제안** (fitness.json에 dependency 규칙 + dep-cruiser 미설치 시):
   - 설명 + "npm install --save-dev dependency-cruiser" 제안
   - 승인 → 설치 후 검증. 거부 → required=required_missing, advisory=not_applicable

4. **Health Report를 research context에 주입**

5. **세션 상태 저장**:
   - `fitness_baseline`: 현재 fitness 위반 상태 (Phase 4 delta 비교용)
   - `unresolved_required_issues`: required_fail/required_missing 항목 (Phase 4 전파용)
```

- [ ] **Step 3: Add Health Check mention to deep-work.md**

Phase 1 Research 설명에 "Health Check이 자동으로 실행되어 드리프트 감지 및 fitness 검증을 수행합니다" 추가.

- [ ] **Step 4: Update package.json** — `files` 배열에 `"health/"` 추가

- [ ] **Step 5: Commit**
```bash
git add commands/deep-research.md commands/deep-work.md package.json && git commit -m "feat: integrate health engine into Phase 1 Research"
```

---

## Task 9b: Test + Receipt + Status Command Integration

**Files:** Modify: `commands/deep-test.md`, `commands/deep-receipt.md`, `commands/deep-status.md`

- [ ] **Step 1: Read current deep-test.md, deep-receipt.md, deep-status.md**

- [ ] **Step 2: Add 2 Quality Gates + baseline 갱신 to deep-test.md**

기존 Quality Gate 섹션에:

```markdown
#### Fitness Delta Gate (Advisory ⚠️)

1. Phase 1에서 저장한 `fitness_baseline`과 현재 fitness 검증 결과 비교
2. `node "$CLAUDE_PLUGIN_DIR/health/fitness/fitness-validator.js"` 재실행 (fitness.json이 있을 때만)
3. 새 위반 추가 없음 → ✅ PASS
4. 위반 감소 → ✅ PASS + 긍정 피드백
5. 위반 증가 → ⚠️ Advisory 경고 (차단 안 함, receipt에 기록)
6. fitness.json 없음 → not_applicable

#### Health Required Gate (Required ✅)

1. 세션 상태의 `unresolved_required_issues` 확인
2. 있으면: "Phase 1에서 발견된 required 이슈가 미해결입니다: [목록]. 이 상태로 완료하시겠습니까?"
3. AskUserQuestion으로 acknowledge 요구
4. acknowledge → receipt에 `acknowledged_required_issues` 기록 + 진행
5. 거부 → 이슈 해결 권장

#### Phase 4 Baseline 갱신

모든 Quality Gate 통과 후 (또는 acknowledge 후):
- `health-baseline.js` writeBaseline() 호출
- 현재 커버리지, dead_exports 수, fitness_violations 수를 baseline으로 기록
- 다음 세션의 Phase 1 비교 기준으로 사용

#### Session Quality Score 변경 없음

Health Check은 세션 시작 시점의 코드베이스 상태 진단이므로 Score에 반영하지 않음.
기존 5가지 가중치(Test Pass Rate, Rework Cycles, Plan Fidelity, Sensor Clean Rate, Mutation Score) 유지.
```

- [ ] **Step 3: Update deep-receipt.md** — health_report 필드 표시

```markdown
### Health Check (Phase 1 진단)
- 🔍 드리프트: dead-export {count}건 | coverage {delta}%p | vuln {critical+high}건 | stale {count}건
- 📐 Fitness: {passed}/{total} 통과 | 위반 delta: {delta}건
- ⚠️ Required: {acknowledged ? "acknowledged" : "미해결 N건"}
```

- [ ] **Step 4: Update deep-status.md** — Health 상태 섹션

```markdown
### Health Check
Health Check:
  드리프트: dead-export {N}건 ⚠️ | coverage {+/-N}%p ✅ | vuln {N}건 🔴 | stale {N}건 ✅
  Fitness:  {N}/{M} 통과 ✅ | required_missing: {N}건
```

- [ ] **Step 5: Commit**
```bash
git add commands/deep-test.md commands/deep-receipt.md commands/deep-status.md && git commit -m "feat: add fitness delta/health required gates + baseline refresh to Phase 4"
```

---

## Task 10: deep-review Modifications (cross-repo)

**Files:** Modify (in `/Users/sungmin/Dev/deep-review/`): `commands/deep-review.md`, `agents/code-reviewer.md`

- [ ] **Step 1: Read current deep-review.md and code-reviewer.md**

- [ ] **Step 2: Add fitness.json + receipt injection to Stage 3**

deep-review.md Stage 3 (리뷰 실행)에:

```markdown
**fitness.json 주입 (있으면):**
- `.deep-review/fitness.json` 파일 확인 → `JSON.parse`로 로드
- 있으면: code-reviewer prompt에 추가:
  "다음은 프로젝트의 계산적 아키텍처 규칙(fitness.json)입니다. 이 규칙들은 deep-work에서 자동 검증되지만, 리뷰 시 규칙의 의도를 기준으로 설계 방향성을 평가하세요."
- 없으면: skip (에러 아님)

**Receipt health_report 주입 (있으면):**
- Receipt 발견 계약:
  1. `.deep-work/sessions/` 디렉토리에서 가장 최근 세션의 receipt.json 탐색
  2. receipt의 `health_report.scan_commit`과 현재 `git rev-parse HEAD` 비교
  3. 일치 → health_report를 code-reviewer prompt에 추가
  4. 불일치 → "stale health report — skip" 경고 + 주입하지 않음
  5. receipt 없음 → skip (에러 아님)
```

- [ ] **Step 3: Add fitness.json awareness to code-reviewer.md**

fitness.json이 prompt에 포함된 경우의 리뷰 지침:
- 규칙의 의도 기반 설계 방향성 평가
- fitness.json에 없는 아키텍처 관점도 자유롭게 지적

- [ ] **Step 4: Add fitness.json guidance to init mode**

init 모드에 안내 문구:
- rules.yaml = inferential, fitness.json = computational 구분 설명
- `/deep-work` Phase 1에서 자동 생성 안내

- [ ] **Step 5: Commit**
```bash
cd /Users/sungmin/Dev/deep-review && git add commands/ agents/ && git commit -m "feat: integrate fitness.json and health_report into deep-review"
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
Task 1 (baseline) ──────────┬────────────────────────────┐
                             │                             │
Task 2 (dead-export) ──┐     │                             │
                       ├── Task 3 (stale+vuln) ───────────┤
                       │                                   │
                       └── Task 4 (coverage-trend) ←Task 1 ┼── Task 8 (health-check.js)
                                                           │
Task 5 (rule-checkers) ──── Task 6 (dep-checker + valid.) │
                                     │                     │
                            Task 7 (generator) ────────────┘
                                                           │
                                              Task 9a (research + work commands)
                                                           │
                                              Task 9b (test + receipt + status)
                                                           │
                                              Task 10 (deep-review) ← 9a 이후
                                                           │
                                              Task 11 (integration)
```

**병렬화 가능:**
- Tasks 1, 2, 5: 무의존
- Tasks 9a, 10: 서로 독립 (단 10은 receipt 계약을 참조하므로 9a 이후 권장)
- Tasks 9b: 9a와 독립 (다른 파일 수정)

**순차 필수:**
- 1 → 4 (baseline 의존)
- 2 → 3 (drift.test.js 공유)
- 5 → 6 → 7 (fitness 체인)
- 1-8 완료 → 9a, 9b, 10 → 11
