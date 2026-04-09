# Health Engine + Architecture Fitness Function Design

> deep-suite Harness Engineering 약점 #3, #4 보완 설계
> 기준: Böckeler/Fowler Harness Engineering Framework
> 날짜: 2026-04-09

---

## 1. 개요

### 해결하는 문제

1. **#3A 세션 간 드리프트 감지** (High) — 개발 세션 사이에 코드베이스가 어떻게 변했는지 감지하는 센서가 전무. 데드 코드 축적, 커버리지 퇴화, 의존성 취약점 등이 조용히 누적. 범위를 플러그인 경계 내(개발 시점 연속 감시)로 한정. 런타임 피드백(SLO, 에러율)이나 자율 cron은 플러그인 범위를 넘어서므로 제외. (roadmap의 #3 Continuous Monitoring 중 session-start subset. 전체 #3은 #3A + #3B(런타임 모니터링, 향후)로 분리.)
2. **#4 Architecture Fitness Function 부재** (High) — 아키텍처 특성을 선언하고 계산적으로 검증하는 메커니즘이 없음. `rules.yaml`은 LLM이 읽을 뿐 강제하지 않음. (현재 Architecture Fitness Harness: 4/10)

### 설계 결정 요약

| 결정 항목 | 선택 |
|-----------|------|
| 아키텍처 | Phase 1 Research 통합 Health Engine (별도 hook/command 없음) |
| 엔진 위치 | deep-work `health/` 디렉토리 |
| fitness.yaml 생성 | 없으면 코드베이스 분석 후 자동 제안 → 유저 승인 |
| fitness.yaml 규칙 | **계산적으로 검증 가능한 것만** (dep-cruiser, 파일 크기, import 패턴 등) |
| dep-cruiser 미설치 | 설명 + 설치 제안. 거부 시 required dependency 규칙은 `required_missing` (실패), advisory는 skip. grep fallback 없음 |
| 재검증 | Phase 4 Test에서 Fitness Delta Gate (Advisory) |
| deep-review 연동 | fitness.yaml을 리뷰 기준으로 소비 + receipt의 health_report 참조 |
| #2 인프라 재사용 | 파서 패턴, Required/Advisory/Not_applicable + Required_missing 정책, receipt 스키마 |
| v1 언어 스코프 | dead-export, stale-config: JS/TS만. dependency 타입: JS/TS만 (dep-cruiser). file-metric, forbidden-pattern, structure: 범용 |
| custom 타입 | v1에서 제거. 향후 per-command 승인 + allowlist 패턴으로 재도입 |
| .deep-review/ 소유권 | 프로젝트의 리뷰 설정 디렉토리 (플러그인 전용이 아님). deep-review 미설치 시에도 deep-work가 생성 가능 |
| 대상 플러그인 | deep-work (Health Engine) + deep-review (fitness 소비) |
| Session Quality Score | 변경 없음 — Health Check은 세션 시작 시점 진단이므로 별도 가시성 |

---

## 2. 전체 흐름

```
/deep-work 시작
  └── Phase 1: Research
       ├── 기존 코드베이스 분석
       └── Health Check (자동)
            ├── Drift Scan
            │    ├── dead-export 감지
            │    ├── 커버리지 퇴화 감지
            │    ├── 의존성 취약점 감지
            │    └── stale config 감지
            ├── Fitness Check
            │    ├── fitness.yaml 로드 (없으면 자동 생성 제안)
            │    └── 규칙별 계산적 검증
            └── Health Report → research context 주입

  └── Phase 3: Implement
       └── (기존 SENSOR_RUN 흐름 — #2에서 구현 완료)

  └── Phase 4: Test
       ├── 기존 Quality Gates (#2)
       └── Fitness Delta Gate (Advisory)
            └── "이번 구현이 새 위반을 추가했는가?"

deep-review (별도 플러그인):
  └── 리뷰 시 fitness.yaml 규칙 참조
  └── receipt의 health_report 참조
```

---

## 3. Drift Scan 설계

Phase 1 Research에서 실행되는 4개 드리프트 센서. 모두 계산적(computational) — LLM 추론 없이 결정적 결과 반환.

| 센서 | 감지 대상 | 방법 | Gate 유형 | v1 스코프 |
|------|-----------|------|-----------|-----------|
| **dead-export** | 사용되지 않는 export | grep 기반 export/import 교차 참조 | Advisory | JS/TS만 |
| **coverage-trend** | 커버리지 퇴화 | 이전 세션 baseline 대비 비교 | Advisory | 범용 (registry 기반) |
| **dependency-vuln** | 알려진 취약점 | `npm audit --json` / `pip audit` 등 | Required | registry에 audit 정의된 생태계 |
| **stale-config** | 깨진 참조 | config 파일 내 경로/파일 존재 확인 | Advisory | JS/TS만 (tsconfig, package.json, eslintrc) |

v1 미지원 생태계(Go, Rust, Java 등)에서는 해당 센서가 `not_applicable`로 처리. registry.json에 audit 필드를 추가하면 dependency-vuln은 확장 가능.

### 3.1 dead-export (JS/TS only)

```
입력: 프로젝트 소스 파일 목록
동작:
  1. export 문 수집 (regex: export {name}, export default, module.exports)
  2. import/require 문에서 참조 수집
  3. export되었지만 어디서도 import되지 않은 심볼 목록 생성
  4. 제외 목록:
     - entry point (package.json main/bin/exports, index 파일)
     - 라이브러리 프로젝트 (package.json에 main/exports 필드 → 외부 소비용 export 전체 제외)
     - re-export (export { foo } from './bar')
     - barrel 파일 (index.ts/index.js에서의 export)
  5. dynamic import (import(), require(variable))는 감지 불가 → false positive 허용
출력: { deadExports: [{file, name, line}], count: N }
```

**정확도 기대치**: grep 기반이므로 false positive 발생 가능. Advisory 등급이므로 차단하지 않음. 유저가 `.deep-work/health-ignore.json`에 무시 목록을 추가할 수 있음:
```json
{ "dead_export_ignore": ["src/utils/legacy.ts:oldHelper"] }
```

### 3.2 coverage-trend

```
입력: .deep-work/health-baseline.json (이전 세션 저장)
동작:
  1. baseline 파일 존재 확인 (없으면 skip → not_applicable)
  2. 현재 커버리지 실행 (#2의 coverage_flag 재사용)
  3. baseline 대비 delta 계산
  4. 5%p 이상 하락 시 경고
출력: { baseline: 85.2, current: 82.1, delta: -3.1, degraded: false }
```

### 3.3 dependency-vuln

```
입력: #2 registry의 생태계 감지 결과
동작:
  JS/TS: npm audit --json (severity: high/critical만)
  Python: pip audit --json 또는 safety check
  C#: dotnet list package --vulnerable
  audit 명령은 registry.json의 각 ecosystem에 "audit" 필드로 추가:
    "audit": { "cmd": "npm audit --json", "parser": "npm-audit" }
  미정의 ecosystem은 dependency-vuln을 not_applicable로 처리
출력: { vulnerabilities: [{package, severity, advisory}], critical: N, high: N }
```

### 3.4 stale-config

```
입력: 프로젝트 루트의 config 파일들
동작:
  tsconfig.json → paths, include, exclude의 경로 존재 확인
  package.json → main, types, bin 경로 존재 확인
  .eslintrc → extends/plugins 설치 확인
출력: { staleRefs: [{file, key, expected, exists}], count: N }
```

### 3.5 Baseline 관리

```json
// .deep-work/health-baseline.json
{
  "updated_at": "2026-04-09T14:30:00Z",
  "commit": "abc1234",
  "branch": "main",
  "coverage": { "line": 85.2, "branch": 72.1 },
  "dead_exports": 3,
  "fitness_violations": 1
}
```

- Phase 4 Test 통과 후 자동 갱신 (다음 세션의 비교 기준)
- `.gitignore`에 추가하지 않음 — 팀 공유 가능
- **무효화 조건** (어느 하나라도 해당되면 baseline 재기록):
  - 현재 branch가 baseline의 `branch`와 불일치
  - baseline의 `commit`이 현재 branch의 ancestor가 아님 (rebase/force-push 감지)
  - `updated_at`이 7일 이상
- 무효화 시: "baseline이 현재 상태와 불일치합니다. 새로 기록합니다" 안내 후 현재 상태를 baseline으로 대체

### 3.6 Health Report 포맷 (research context 주입용)

```markdown
## Health Check Report

### Drift Scan
- dead-export: 미사용 export 3개 발견 (utils/legacy.ts, helpers/old.ts)
- coverage-trend: 85.2% → 85.5% (+0.3%p)
- dependency-vuln: critical 1건 (lodash CVE-2025-XXXX)
- stale-config: 깨진 참조 없음

### 권장 조치
- [ ] lodash 업데이트 필요 (npm audit fix)
- [ ] utils/legacy.ts의 미사용 export 정리 고려
```

이 포맷으로 Research phase의 컨텍스트에 주입하면, 에이전트가 구현 설계 시 이 정보를 자연스럽게 고려.

---

## 4. Architecture Fitness Function 설계

### 4.1 fitness.yaml 스키마

프로젝트 루트의 `.deep-review/fitness.yaml`에 계산적으로 검증 가능한 아키텍처 규칙을 선언.

```yaml
# .deep-review/fitness.yaml
version: 1
generated_at: "2026-04-09T14:30:00Z"

rules:
  # 1. 의존성 방향 규칙
  - id: no-circular-deps
    type: dependency
    description: "순환 의존성 금지"
    check: circular
    severity: required

  - id: layer-direction
    type: dependency
    description: "controller → service → repository 단방향"
    check: direction
    layers:
      - { name: controllers, pattern: "src/controllers/**" }
      - { name: services, pattern: "src/services/**" }
      - { name: repositories, pattern: "src/repositories/**" }
    allowed: [[controllers, services], [services, repositories]]
    severity: required

  # 2. 파일 크기 / 복잡도 제한
  - id: max-file-lines
    type: file-metric
    description: "단일 파일 500줄 제한"
    check: line-count
    max: 500
    include: "src/**/*.{ts,js}"
    severity: advisory

  # 3. 금지된 패턴
  - id: no-console-in-prod
    type: forbidden-pattern
    description: "프로덕션 코드에 console.log 금지"
    pattern: "console\\.(log|debug|info)"
    include: "src/**/*.{ts,js}"
    exclude: "**/*.test.*"
    severity: advisory

  - id: no-direct-env-access
    type: forbidden-pattern
    description: "process.env 직접 접근 금지 — config 모듈 경유"
    pattern: "process\\.env\\."
    include: "src/**/*.{ts,js}"
    exclude: "src/config/**"
    severity: required

  # 4. 구조 규칙
  - id: colocated-tests
    type: structure
    description: "테스트 파일은 소스와 같은 디렉토리에 위치"
    check: colocated
    source: "src/**/*.ts"
    test: "src/**/*.test.ts"
    severity: advisory

```

> **`custom` 타입은 v1에서 제거.** fitness.yaml은 git으로 공유되는 프로젝트 파일이므로, 임의 명령 실행은 보안 경계를 넘어선다. 향후 per-command 승인 + allowlist 패턴(예: `node scripts/**`, `npm run *`)을 설계한 후 v2에서 재도입.

### 4.2 규칙 타입별 검증 엔진

| type | 검증 방법 | 외부 도구 | v1 스코프 |
|------|-----------|-----------|-----------|
| `dependency` | dep-cruiser | dep-cruiser | JS/TS만 |
| `file-metric` | `wc -l`, 파일 시스템 직접 읽기 | 없음 | 범용 |
| `forbidden-pattern` | grep (ripgrep 또는 내장 regex) | 없음 | 범용 |
| `structure` | glob 패턴 매칭 | 없음 | 범용 |

핵심 원칙: `dependency` 외에는 외부 도구 의존 없음. `file-metric`, `forbidden-pattern`, `structure`는 언어와 무관하게 동작.

### 4.3 dependency 규칙 검증 정책 (JS/TS only)

```
fitness.yaml에 dependency 타입 규칙 존재
  └── dep-cruiser 설치 확인
       ├── 설치됨 → 정상 검증
       └── 미설치
            ├── 설명: "dep-cruiser는 JS/TS 프로젝트의 의존성 방향,
            │         순환 참조를 정적 분석하는 도구입니다.
            │         fitness.yaml의 dependency 규칙 검증에 필요합니다."
            ├── 제안: "npm install --save-dev dependency-cruiser 설치를 진행할까요?"
            └── 유저 선택
                 ├── 승인 → 설치 후 검증
                 └── 거부:
                      ├── severity: required → `required_missing` (실패 상태)
                      │   "required dependency 규칙을 사용하려면 dep-cruiser가 필요합니다"
                      │   Phase 4까지 전파 — 유저 acknowledge 요구
                      └── severity: advisory → `not_applicable` (skip)
                           나머지 규칙(file-metric, forbidden-pattern 등)은 정상 실행
```

**severity와 gate behavior 분리**: `required`는 "이 규칙이 중요하다"는 선언이며, 도구 미설치로 검증 불가 시 "검증되지 않은 required 규칙이 있다"는 사실 자체가 실패. `not_applicable`로 조용히 넘어가지 않음.

### 4.4 자동 생성 로직 (Phase 1 Research)

fitness.yaml이 없을 때의 자동 제안 흐름:

```
1. 프로젝트 구조 분석
   ├── 디렉토리 구조 스캔 (src/, lib/, controllers/, services/ 등)
   ├── import 그래프 샘플링 (상위 20개 파일)
   └── 기존 config 분석 (tsconfig paths, eslint rules 등)

2. 패턴 매칭 → 규칙 제안
   ├── 계층 구조 감지 → layer-direction 규칙
   ├── config 모듈 존재 → no-direct-env-access 규칙
   ├── 테스트 디렉토리 패턴 감지 → colocated-tests 규칙
   └── 공통 규칙 항상 포함: no-circular-deps, max-file-lines

3. 에이전트가 유저에게 제안
   "프로젝트 분석 결과 다음 fitness function을 추천합니다:
    - [required] 순환 의존성 금지
    - [required] controller → service → repo 단방향
    - [advisory] 파일 500줄 제한
    승인하시겠습니까?"

4. 유저 승인 → .deep-review/fitness.yaml 생성 + git add
```

### 4.5 Phase 4 Delta Check

Phase 1에서 "현재 위반 상태"를 기록해두고, Phase 4에서 "이번 구현이 새 위반을 추가했는지" 비교.

```
Phase 1 baseline: { violations: { "no-console-in-prod": 2 } }
Phase 4 current:  { violations: { "no-console-in-prod": 3 } }
Delta: +1건 → Advisory 경고 "이번 구현에서 console.log 1건 추가됨"
```

- 새 위반 추가 없음 → PASS
- 위반 감소 → PASS + 긍정 피드백
- 위반 증가 → Advisory 경고 (차단하지 않되 receipt에 기록)
- fitness.yaml 없음 → not_applicable (skip)

---

## 5. deep-review 연동 설계

### 5.1 핵심 원칙

| 파일 | 성격 | 검증 주체 | 위치 |
|------|------|-----------|------|
| `rules.yaml` | Inferential — LLM이 판단 | deep-review (Opus subagent) | `.deep-review/` |
| `fitness.yaml` | Computational — 코드가 판단 | deep-work (Health Engine) | `.deep-review/` |

역할 분리: deep-work가 계산적 검증을 수행하고, deep-review는 그 결과를 소비. deep-review에 검증 엔진을 복제하지 않음.

### 5.2 연동 포인트

**1) fitness.yaml 공유 (파일 시스템)**

`.deep-review/fitness.yaml`은 두 플러그인이 공유하는 계약:
- deep-work Phase 1에서 생성/검증 → 결과를 receipt에 기록
- deep-review는 fitness.yaml을 Opus subagent prompt에 포함 → "이 규칙들은 계산적으로 검증되지만, 리뷰 시 관련 아키텍처 의도도 함께 고려하라"

**2) Health Report 소비 (receipt 경유)**

**Receipt 발견 계약:**
- 경로: `.deep-work/sessions/{session-id}/receipt.json` (deep-work 표준 경로)
- 선택 순서: 현재 세션의 receipt → 가장 최근 세션의 receipt → 없으면 skip
- stale 판정: receipt의 `scan_time`이 현재 코드와 무관한 경우 (commit hash 불일치) → skip
- missing: receipt 없으면 health_report 없이 리뷰 진행 (에러 아님)
- deep-review Stage 3 prompt 주입: receipt 발견 시 health_report 섹션을 Opus subagent prompt에 추가

deep-work receipt의 `health_report` 필드를 deep-review가 읽으면:
- 드리프트 이슈를 리뷰 컨텍스트에 포함
- fitness 위반 delta를 리뷰 포인트로 활용

**3) deep-review init 확장**

`/deep-review init`에서 rules.yaml 생성 시 안내 추가:
```
"아키텍처 규칙을 계산적으로 강제하려면 deep-work의 fitness.yaml을 사용하세요.
 /deep-work 세션 Phase 1에서 자동으로 fitness.yaml 생성을 제안합니다."
```

fitness.yaml 직접 생성은 deep-work의 책임. deep-review init에서는 안내만.

### 5.3 독립 동작 보장

| 시나리오 | deep-work | deep-review |
|----------|-----------|-------------|
| 둘 다 설치 | Health Check 실행 + receipt 기록 | receipt + fitness.yaml 참조 리뷰 |
| deep-work만 | Health Check 실행 | — |
| deep-review만 | — | fitness.yaml 있으면 참조, 없으면 rules.yaml만으로 리뷰 |
| 둘 다 미설치 | — | — |

어떤 조합이든 에러 없이 동작. 연동 시 더 강력해질 뿐.

---

## 6. Quality Gate + Receipt 통합

### 6.1 Phase 4 Quality Gates

기존 Quality Gate 체계에 2개 gate 추가:

```
Phase 4: Test — Quality Gates

기존 (#2에서 구현):
  Sensor Clean    (Required)  — lint/typecheck 통과
  Coverage Report (Advisory)  — 커버리지 수치 보고
  Mutation Score  (Advisory)  — mutation testing 결과

신규:
  Fitness Delta   (Advisory)  — 이번 구현이 새 fitness 위반을 추가했는가?
  Health Required (Required)  — Phase 1의 미해결 required 실패 전파
```

**Fitness Delta가 Advisory인 이유**: fitness 위반이 의도적일 수 있음 (예: 급한 hotfix에서 console.log 임시 추가). 차단보다는 인지시키고 receipt에 기록.

**Health Required Gate 동작**:
- Phase 1에서 `required_fail` 또는 `required_missing` 상태인 항목을 Phase 4까지 전파
- dependency-vuln critical/high 미해결, 또는 required dependency 규칙 도구 미설치 등
- Phase 4에서 유저에게 acknowledge 요구: "Phase 1에서 발견된 required 이슈가 미해결입니다: [목록]. 이 상태로 완료하시겠습니까?"
- acknowledge 시: receipt에 `acknowledged_required_issues` 필드 기록 + 진행
- 거부 시: 세션을 Phase 1로 되돌리거나, 이슈 해결 후 재실행 권장

### 6.2 Receipt 스키마 확장

```json
{
  "slice": "SLICE-001",
  "tdd_state": "SENSOR_CLEAN",
  "test_results": { "pass": 12, "fail": 0 },
  "sensor_results": {},
  "mutation_testing": {},

  "health_report": {
    "scan_time": "2026-04-09T14:30:00Z",
    "drift": {
      "dead_exports": {
        "status": "advisory",
        "count": 3,
        "items": [
          { "file": "src/utils/legacy.ts", "name": "oldHelper", "line": 42 }
        ]
      },
      "coverage_trend": {
        "status": "pass",
        "baseline": 85.2,
        "current": 85.5,
        "delta": 0.3
      },
      "dependency_vuln": {
        "status": "required_fail",
        "critical": 0,
        "high": 1,
        "items": [
          { "package": "lodash", "severity": "high", "advisory": "CVE-2025-XXXX" }
        ]
      },
      "stale_config": {
        "status": "pass",
        "count": 0
      }
    },
    "fitness": {
      "yaml_exists": true,
      "total_rules": 5,
      "passed": 4,
      "failed": 1,
      "not_applicable": 0,
      "violations": [
        {
          "id": "no-console-in-prod",
          "severity": "advisory",
          "count": 3,
          "delta": "+1",
          "details": [{ "file": "src/api/handler.ts", "line": 55 }]
        }
      ]
    }
  }
}
```

### 6.3 Session Quality Score

변경 없음. Health Check은 세션 시작 시점의 코드베이스 상태 진단(유저의 이번 작업 품질이 아님)이므로, Session Quality Score에 반영하면 부당. 대신 receipt의 `health_report`로 별도 가시성 제공.

---

## 7. 파일 구조

### deep-work — 신규 파일 (13개)

```
deep-work/
  health/
    health-check.js                # 통합 Health Engine (진입점)
    health-check.test.js           # Health Engine 테스트
    drift/
      dead-export.js               # 미사용 export 감지 (JS/TS only)
      coverage-trend.js            # 커버리지 퇴화 감지
      dependency-vuln.js           # 의존성 취약점 감지 (파싱 로직 내장)
      stale-config.js              # 깨진 참조 감지 (JS/TS only)
      drift.test.js                # 드리프트 센서 통합 테스트
    fitness/
      fitness-validator.js         # fitness.yaml 스키마 검증 + 규칙 검증 엔진
      fitness-generator.js         # fitness.yaml 자동 생성 로직
      rule-checkers/
        dependency-checker.js      # dep-cruiser 연동 (dependency 타입, JS/TS only)
        file-metric-checker.js     # line-count 등 (file-metric 타입, 범용)
        pattern-checker.js         # forbidden-pattern 타입 (범용)
        structure-checker.js       # colocated 등 (structure 타입, 범용)
      fitness.test.js              # fitness 검증 통합 테스트
    health-baseline.js             # baseline 읽기/쓰기 (commit/branch scoping)
```

> `custom-checker.js` 제거 (v1에서 custom 타입 미지원). `dependency-vuln.js`에 audit 파싱 로직 내장 (별도 파서 불필요).

### deep-work — 수정 파일 (6개)

| 파일 | 변경 내용 |
|------|-----------|
| `commands/deep-work.md` | Phase 1 Research에 Health Check 단계 추가 |
| `commands/deep-research.md` | Health Report 컨텍스트 주입 지점 명시 |
| `commands/deep-test.md` | Fitness Delta Gate (Advisory) 추가 |
| `commands/deep-receipt.md` | health_report 필드 표시 |
| `commands/deep-status.md` | Health 상태 섹션 추가 |
| `package.json` | `files` 배열에 `health/` 추가 |

### deep-review — 수정 파일 (3개)

| 파일 | 변경 내용 |
|------|-----------|
| `commands/deep-review.md` | Stage 3 prompt에 fitness.yaml 주입 로직 추가 |
| `agents/code-reviewer.md` | fitness.yaml 규칙 인지 지침 추가 |
| `commands/deep-review.md` (init) | fitness.yaml 안내 문구 추가 |

### 모듈 의존성

```
health-check.js (진입점)
  ├── drift/ (dead-export + dependency-vuln + stale-config 병렬 실행)
  │    ├── dead-export.js               (JS/TS only)
  │    ├── dependency-vuln.js           ← sensors/registry.json (#2) audit 필드 확장
  │    └── stale-config.js              (JS/TS only)
  ├── drift/coverage-trend.js           ← sensors/detect.js (#2) 재사용 (순차)
  ├── fitness/fitness-validator.js      (순차)
  │    ├── rule-checkers/dependency-checker.js  ← dep-cruiser (JS/TS only, optional)
  │    ├── rule-checkers/file-metric-checker.js (범용)
  │    ├── rule-checkers/pattern-checker.js     (범용)
  │    └── rule-checkers/structure-checker.js   (범용)
  ├── fitness/fitness-generator.js
  └── health-baseline.js                ← commit/branch scoping
```

---

## 8. 에러 처리 및 엣지 케이스

### 8.1 Health Check 실패 정책

#2의 fail-closed 정책을 이어받되, Health Check은 Phase 1에서 실행되므로 세션 진행을 차단하지 않음.

| 상황 | 동작 | 근거 |
|------|------|------|
| Health Engine 자체 크래시 | 경고 출력 + Phase 1 계속 진행 | Health Check 실패가 구현 작업을 막으면 안 됨 |
| 개별 드리프트 센서 크래시 | 해당 센서 `error` 상태 + 나머지 센서 실행 | 센서 간 독립성 |
| fitness.yaml 파싱 오류 | 경고 + fitness 검증 skip | 깨진 YAML이 세션을 막지 않음 |
| dep-cruiser 실행 오류 | dependency 규칙 `error` 상태 + 나머지 규칙 실행 | 도구 오류가 다른 검증을 막지 않음 |
| `npm audit` 타임아웃 | dependency-vuln `timeout` 상태 | 네트워크 의존이므로 관대하게 |
| fitness.yaml 없음 + 자동 생성 제안 거부 | fitness 검증 전체 `not_applicable` | 유저 선택 존중 |
| baseline 파일 없음 (첫 세션) | coverage-trend `not_applicable` + fitness delta 전체 baseline으로 기록 | 비교 대상 없음 |
| Phase 4 Fitness Delta 재검증 실패 | Advisory 경고만 | 이미 Advisory Gate |

### 8.2 타임아웃 전략

```
Health Check 전체: 180초 (Phase 1 내에서)
  ├── Drift Scan (병렬 실행, 최대 60초):
  │    ├── dead-export: 30초
  │    ├── dependency-vuln: 30초 (네트워크 의존)
  │    └── stale-config: 10초
  │    (Promise.allSettled — 상호 의존성 없음)
  ├── coverage-trend: 60초 (#2의 coverage 실행 재사용, 순차)
  └── fitness-validator: 60초 (순차)
       ├── dep-cruiser: 30초
       └── 나머지 rule-checkers: 각 10초
```

- dead-export + dependency-vuln + stale-config은 **병렬 실행** (wall-clock ~30초)
- coverage-trend는 테스트 실행이 필요하므로 순차
- fitness-validator는 드리프트 센서 이후 순차
- 예상 wall-clock: ~150초 (병렬 30 + coverage 60 + fitness 60)
- 전체 180초를 초과하면 남은 센서를 `timeout`으로 기록하고 진행

### 8.3 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| 모노레포에서 여러 fitness.yaml | 프로젝트 루트의 `.deep-review/fitness.yaml`만 사용. 하위 패키지별 fitness는 향후 |
| fitness.yaml 규칙이 0개 | 파일 존재하되 규칙 없음 → `not_applicable` (에러 아님) |
| fitness.yaml version이 지원되지 않는 값 | 경고 + fitness 검증 전체 skip (`not_applicable`). Forward-compatibility 정책 — 팀원 간 플러그인 버전 불일치 대응 |
| fitness.yaml 스키마 오류 (필수 필드 누락, 잘못된 type enum, 중복 id) | 오류 목록 출력 + 해당 규칙 skip. 유효한 규칙만 실행 |
| deep-work 없이 deep-review에서 fitness.yaml 참조 | 파일이 있으면 Opus prompt에 포함. 계산적 검증은 수행하지 않음 (deep-review의 역할이 아님) |
| 브랜치 전환 후 baseline 불일치 | commit/branch scoping으로 자동 무효화 + 재기록 |
| git이 없는 프로젝트 | dead-export, stale-config, dependency-vuln, fitness 동작. baseline의 commit/branch 필드는 null — 시간 기반 무효화만 적용 |
| 비 JS/TS 프로젝트 | dead-export, stale-config: `not_applicable`. dependency 타입 fitness: `required_missing`. file-metric, forbidden-pattern, structure: 정상 동작 |

---

## 참고 문서

- [Harness Engineering for Coding Agent Users](https://martinfowler.com/articles/harness-engineering.html) — Birgitta Böckeler, 2026-04-02
- [이전 설계: Computational Sensor + Behaviour Harness](./2026-04-09-computational-sensor-behaviour-harness-design.md) — #1, #2 구현 스펙
- [Gap Analysis](../harness-engineering-gap-analysis.md) — Böckeler 프레임워크 기준 약점 진단
- [Roadmap](../harness-engineering-roadmap.md) — 8개 약점 체크리스트
