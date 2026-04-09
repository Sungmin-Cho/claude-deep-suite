# Harness Templates + Self-Correction + Harnessability + Dashboard Design

> deep-suite Harness Engineering 약점 #5, #6, #7, #8 보완 설계
> 기준: Böckeler/Fowler Harness Engineering Framework
> 날짜: 2026-04-09

---

## 1. 개요

### 해결하는 문제

1. **#5 Harness Templates** (Medium) — 토폴로지별 guides+sensors 번들 부재. 같은 JS/TS라도 Next.js SaaS vs Express API vs CLI tool은 전혀 다른 하네스가 필요하지만, 현재는 생태계(언어) 수준 감지만 존재.
2. **#6 Self-Correction Loop 통합** (Medium) — 센서 파이프라인이 "깨끗한 코드"(linter/typecheck pass)까지만 보장. "좋은 코드"(fitness 규칙 준수, 컨벤션 일치)는 Phase 4까지 미뤄짐. Keep Quality Left 원칙 위반.
3. **#7 Harnessability 진단** (Low) — 코드베이스가 얼마나 하네스하기 좋은지 평가하는 메커니즘 부재. 신규 프로젝트 온보딩 시 어떤 하네스 전략이 유효한지 알 수 없음.
4. **#8 통합 하네스 대시보드** (Low) — 5개 플러그인의 센서 결과를 통합 조회할 수 없음. 하네스 효과성 피드백 루프 부재.

### 설계 결정 요약

| 결정 항목 | 선택 |
|-----------|------|
| 토폴로지 감지 | registry.json 위에 별도 레이어. 생태계(언어) + 서비스 유형 2단 감지 |
| 템플릿 형식 | JSON 파일. 토폴로지별 guides + sensors + fitness_defaults + harnessability_hints |
| Self-Correction | review-check 센서 추가. SENSOR_RUN 파이프라인 재사용. computational + lightweight inferential |
| Harnessability | 6차원 계산적 평가. 독립 커맨드 + Phase 1 자동 실행 |
| 대시보드 | CLI 리포트 기본 + 유저 승인 시 마크다운 파일 생성 |
| #7, #8 위치 | **deep-dashboard** 독립 플러그인 (`~/Dev/deep-dashboard`). 마켓플레이스가 통합 |
| #5, #6 위치 | deep-work 플러그인 내부 |
| 구현 순서 | #5 → #7 → #6 → #8 (bottom-up 의존성 순) |

### 대상 플러그인

| 약점 | 플러그인 | 형태 |
|------|----------|------|
| #5 Harness Templates | deep-work | 모듈 (templates/, topology detector) |
| #6 Self-Correction Loop | deep-work | 센서 파이프라인 확장 (review-check 센서) |
| #7 Harnessability 진단 | deep-dashboard (신규) | 스킬 + lib |
| #8 통합 대시보드 | deep-dashboard (신규) | 스킬 + lib |

---

## 2. #5 Harness Templates

### 2.1 토폴로지 감지 레이어

registry.json이 **생태계**(JS/TS, Python 등)를 감지한다면, 토폴로지 레이어는 **서비스 유형**을 감지한다.

```
registry.json → "이 프로젝트는 TypeScript다"
topology    → "이 프로젝트는 Next.js App Router SaaS다"
```

**감지 방법**: marker 파일 + dependency 검사 + 디렉토리 구조. 우선순위가 높은(specific) 토폴로지가 먼저 매칭되고, 아무것도 매칭 안 되면 `generic` fallback.

### 2.2 v1 토폴로지 목록

| 토폴로지 ID | 감지 조건 | 예시 |
|-------------|-----------|------|
| `nextjs-app` | `next.config.*` 존재 + `app/` 디렉토리 | Next.js App Router |
| `react-spa` | react in deps, no next, no express/fastify | CRA, Vite React |
| `express-api` | express/fastify/hono in deps, no next | REST API 서버 |
| `python-web` | fastapi/flask/django in deps | Python 웹 서비스 |
| `python-lib` | Python 감지(pyproject.toml/setup.py) + 웹 프레임워크 없음 | CLI 도구, 라이브러리 |
| `generic` | 위 어느 것도 매칭 안 됨 | fallback |

감지 순서: priority 값이 높은 것부터 매칭. 복수 매칭 시 가장 높은 priority 우선.

| 토폴로지 ID | priority |
|-------------|----------|
| `nextjs-app` | 100 |
| `react-spa` | 90 |
| `express-api` | 80 |
| `python-web` | 70 |
| `python-lib` | 60 |
| `generic` | 0 |

사용자 정의 토폴로지는 `priority` 필드로 삽입 위치 결정.

### 2.3 토폴로지 감지 구현

```javascript
// topology-detector.js
// 입력: 프로젝트 루트 경로, registry.json 감지 결과
// 출력: { topology: string, confidence: "high"|"medium"|"low", details: {...} }

// 감지 로직:
// 1. package.json / pyproject.toml 등에서 dependencies 읽기
// 2. 디렉토리 구조 확인 (app/, src/, pages/ 등)
// 3. marker 파일 확인 (next.config.*, vite.config.* 등)
// 4. 토폴로지 목록을 priority 순으로 매칭 시도
// 5. 첫 매칭 반환, 없으면 generic
```

### 2.4 템플릿 구조

`templates/` 디렉토리에 토폴로지별 JSON 파일:

```json
{
  "topology": "nextjs-app",
  "display_name": "Next.js App Router",
  "guides": {
    "phase1": [
      "서버/클라이언트 컴포넌트 경계 확인",
      "API route 구조 파악",
      "데이터 패칭 패턴 확인 (RSC vs client fetch)"
    ],
    "phase3": [
      "'use client' 최소화 원칙",
      "Server Actions 우선",
      "레이아웃/페이지 분리 규칙 준수"
    ],
    "phase4": [
      "번들 크기 변화 확인",
      "hydration 에러 체크",
      "서버/클라이언트 경계 위반 확인"
    ]
  },
  "sensors": {
    "priority": ["lint", "typecheck", "coverage"],
    "recommended": ["bundle-size"],
    "skip_reason": {}
  },
  "fitness_defaults": {
    "rules": [
      {
        "id": "no-large-client-components",
        "type": "file-metric",
        "check": "line-count",
        "max": 200,
        "include": "**/*client*.tsx",
        "severity": "advisory"
      },
      {
        "id": "no-barrel-imports",
        "type": "forbidden-pattern",
        "pattern": "from '@/components'",
        "include": "app/**",
        "severity": "advisory"
      }
    ]
  },
  "harnessability_hints": {
    "type_system": "strict tsconfig 권장",
    "test_pattern": "colocated __tests__/ 또는 *.test.tsx"
  }
}
```

### 2.5 통합 지점

| 통합 대상 | 방식 |
|-----------|------|
| Phase 1 Research | 토폴로지 감지 → `guides.phase1` research context 주입 |
| Phase 3 Implement | `guides.phase3` 가이드 주입 |
| Phase 4 Test | `guides.phase4` 체크 기준 주입 |
| Fitness.json 생성 (#4) | `fitness_defaults`를 seed로 사용. 기존 generator 확장 |
| 센서 가중치 (#2) | `sensors.priority`로 센서 실행 순서/중요도 결정 |
| Harnessability (#7) | `harnessability_hints` 참조 |

### 2.6 사용자 확장

`templates/custom/` 디렉토리에 사용자 정의 토폴로지 추가 가능:

- 동일 토폴로지 ID면 사용자 정의가 **deep merge** (기본 위에 override):
  - 스칼라 값(string, number, boolean): 사용자 정의가 완전 대체
  - 객체(guides, sensors 등): 키 단위로 재귀 merge. 미지정 키는 기본값 유지
  - 배열(guides.phase3, fitness_defaults.rules 등): 사용자 정의가 **완전 대체** (append 아님). 기본 배열을 유지하려면 복사 후 추가
- 새 토폴로지 ID면 감지 목록에 추가
- 감지 조건은 `detect` 필드로 정의:

```json
{
  "topology": "turborepo-monorepo",
  "detect": {
    "require": ["turbo.json"],
    "any_of": ["package.json"]
  },
  "priority": 100,
  "display_name": "Turborepo Monorepo",
  "guides": { ... },
  "sensors": { ... }
}
```

---

## 3. #6 Self-Correction Loop 통합

### 3.1 개념

Phase 3의 센서 파이프라인에 **review-check 센서**를 추가. 기존 `SENSOR_RUN → SENSOR_FIX → SENSOR_CLEAN` 루프를 재사용하여, 코드가 "깨끗한" 것 넘어 "좋은" 것까지 자기 교정.

### 3.2 센서 파이프라인 확장

기존:
```
GREEN → SENSOR_RUN(lint) → SENSOR_RUN(typecheck) → SENSOR_CLEAN → 다음 슬라이스
```

확장:
```
GREEN → SENSOR_RUN(lint) → SENSOR_RUN(typecheck) → SENSOR_RUN(review-check) → SENSOR_CLEAN
                                                         │
                                                         ├─ 위반 발견 → SENSOR_FIX → GREEN 재확인 → 전체 센서 재실행
                                                         └─ 통과 → SENSOR_CLEAN
```

review-check은 기존 센서와 동일한 `SENSOR_RUN → FIX` 루프를 탄다. 최대 교정 횟수: **센서별 3회** (전체 공유 아님). lint 3회 + typecheck 3회 + review-check 3회 각각 독립.

### 3.3 review-check 센서 검사 항목

review-check은 2개 레이어로 구성. **always-on 레이어**는 항상 실행되고, **fitness 레이어**는 fitness.json이 있을 때만 추가 실행.

#### Always-on 레이어 (fitness.json 없어도 실행)

| 검사 | 소스 | 대상 | Gate |
|------|------|------|------|
| 토폴로지 가이드 위반 | 템플릿 `guides.phase3` | 슬라이스 변경 파일 | Advisory |
| 슬라이스 diff 컨벤션 체크 (inferential) | `rules.yaml` + 템플릿 `guides.phase3` | diff만 전달, 단일 프롬프트, 짧은 응답 강제 | Advisory |

always-on 레이어는 토폴로지 감지 결과만으로 동작. rules.yaml도 없으면 inferential 체크만 skip하고 토폴로지 가이드 체크는 유지. 모든 소스가 없는 경우(토폴로지 generic + rules.yaml 없음 + fitness.json 없음)에만 review-check 전체 `not_applicable`.

#### Fitness 레이어 (fitness.json 있을 때 추가)

| 검사 | 소스 | 대상 | Gate |
|------|------|------|------|
| fitness.json 규칙 위반 | `.deep-review/fitness.json` | 슬라이스에서 변경된 파일 | 규칙별 severity |
| 파일 크기 초과 | file-metric 규칙 | 변경/생성된 파일 | Required |
| 금지 패턴 | forbidden-pattern 규칙 | 변경된 파일의 diff | 규칙별 severity |
| colocated 테스트 누락 | structure 규칙 | 새로 생성된 소스 파일 | Advisory |

#### Gate 정책

- inferential 리뷰는 **Advisory** — 차단하지 않고 피드백만 제공. 에이전트가 판단하여 수정 여부 결정. 복수 소스(rules.yaml, topology guides)가 충돌 시 Advisory이므로 에이전트 재량
- computational 위반은 기존 정책(Required/Advisory) 따름

### 3.4 FIX 피드백 포맷

기존 #2의 에이전트용 FIX 포맷 재사용:

```
[REVIEW-CHECK] 2 violations found in slice "add-auth-middleware"

1. [REQUIRED] file-metric: src/middleware/auth.ts (287 lines > 250 max)
   FIX: 인증 로직과 미들웨어 설정을 분리하세요

2. [ADVISORY] convention: rules.yaml의 "no raw SQL" 위반 가능성
   CONTEXT: src/db/queries.ts:42 — raw query string detected
   FIX: ORM 쿼리 빌더 사용을 고려하세요
```

### 3.5 비용 안전장치

| 안전장치 | 조건 |
|----------|------|
| inferential 스킵 | diff 크기 500줄 초과 시 computational만 실행 |
| fitness.json 없음 | fitness 레이어만 skip. always-on 레이어는 유지 |
| 전체 not_applicable | 토폴로지 generic + rules.yaml 없음 + fitness.json 없음일 때만 |
| 비활성화 | `.deep-work/config.json`에서 `"review_check": false` |

### 3.6 기존 인프라 재사용

| 재사용 대상 | 출처 |
|-------------|------|
| SENSOR_RUN/FIX/CLEAN 상태 머신 | #2 구현 |
| FIX 피드백 포맷 | #2 파서 패턴 |
| Required/Advisory/Not_applicable 정책 | #2 gate 시스템 |
| fitness.json 규칙 실행 | #4 fitness-validator |
| receipt 통합 | #2 receipt 스키마 확장 |

---

## 4. #7 Harnessability 진단

### 4.1 개념

코드베이스가 "얼마나 하네스하기 좋은가"를 계산적으로 평가. Böckeler의 Harnessability 개념 — 타입 시스템이 강할수록, 모듈 경계가 명확할수록, 테스트 인프라가 갖춰져 있을수록 하네스가 효과적으로 작동한다.

### 4.2 위치 — 단일 소스 원칙

**deep-dashboard 플러그인** (`~/Dev/deep-dashboard`)이 harnessability의 **유일한 구현**을 소유.

- **`/deep-harnessability`** — 독립 스킬. deep-work 세션 밖에서도 실행 가능
- **결과 파일**: 실행 시 `.deep-dashboard/harnessability-report.json`에 결과 저장
- **Phase 1 연동** — deep-work Phase 1 Research에서:
  1. `.deep-dashboard/harnessability-report.json`이 존재하면 읽어서 research context에 주입 (최대 24시간 이내 결과만 유효)
  2. 파일이 없거나 stale이면 harnessability 없이 진행 (Phase 1 차단하지 않음)
- **이중 구현 금지** — deep-work에 별도 harnessability 로직을 두지 않음. 항상 deep-dashboard 결과를 소비하는 구조

### 4.3 평가 차원 (6개)

| 차원 | 측정 방법 | 가중치 |
|------|-----------|--------|
| **Type Safety** | strict tsconfig 여부, mypy strict 여부, any 타입 비율 | 25% |
| **Module Boundaries** | 순환 의존성 수, barrel export 비율, 평균 import depth | 20% |
| **Test Infrastructure** | 테스트 프레임워크 존재, 테스트 파일 비율, coverage 설정 | 20% |
| **Sensor Readiness** | registry.json 매칭 센서 수, 도구 설치 상태 | 15% |
| **Linter/Formatter** | eslint/ruff/prettier 설정 존재 + rule 엄격도 | 10% |
| **CI/CD** | CI 설정 파일 존재 (GitHub Actions, etc.) | 10% |

### 4.4 점수 산출

각 차원은 0-10 스케일. 차원별 점수는 **체크리스트 기반**: 해당 차원의 체크 항목 중 통과 비율 × 10.

```
차원별 점수 = (통과 항목 수 / 전체 항목 수) × 10

예: Type Safety 체크 항목 5개 중 4개 통과 → 8/10

총점 = Σ(차원별 점수 × 가중치) → 0-10 스케일
```

차원별 체크 항목의 세부 정의는 구현 플랜에서 확정. 스펙에서는 차원과 가중치만 정의.

등급:
- **8-10**: Excellent — 하네스가 최대 효과 발휘
- **5-7**: Good — 일부 개선 권장
- **3-4**: Fair — 하네스 효과 제한적, 개선 필요
- **0-2**: Poor — 기본 인프라 부족

### 4.5 추천 엔진

점수가 낮은 차원에 대해 구체적 개선 액션을 제안:

```
[Harnessability Report] Score: 6.2/10 (Good)

  Type Safety      ████████░░  8/10  ✓ tsconfig strict mode
  Module Bounds    ██████░░░░  6/10  ! 3 circular dependencies detected
  Test Infra       ███████░░░  7/10  ! no coverage config found
  Sensor Ready     ████████░░  8/10  ✓ lint, typecheck, coverage available
  Linter/Fmt       ████░░░░░░  4/10  ! no prettier/format config
  CI/CD            ██░░░░░░░░  2/10  ✗ no CI config detected

Recommendations:
  1. [Module] dep-cruiser로 순환 의존성 해소 → +1.2점 예상
  2. [Linter] prettier 설정 추가 → +0.6점 예상
  3. [CI/CD] GitHub Actions workflow 추가 → +0.8점 예상

Detected topology: nextjs-app
Template hints: strict tsconfig 권장, colocated __tests__/ 패턴
```

### 4.6 #5 연동

- 토폴로지 감지 결과를 활용해 **토폴로지 맞춤 권장사항** 제공
- `harnessability_hints` 필드를 참조해 해당 토폴로지의 모범 사례와 현재 상태 비교
- Phase 1에서 실행 시 토폴로지 + harnessability 점수를 research context에 주입

### 4.7 모든 측정은 computational

LLM 추론 없이 파일 존재 확인, config 파싱, grep 기반 계산만 사용. 결정적이고 재현 가능.

---

## 5. #8 통합 하네스 대시보드

### 5.1 개념

5개 플러그인(deep-work, deep-review, deep-docs, deep-wiki, deep-research)의 센서 결과를 하나의 뷰로 통합. 하네스 효과성을 한눈에 파악하고 어디에 주의가 필요한지 보여준다.

### 5.2 위치

**deep-dashboard 플러그인** (`~/Dev/deep-dashboard`)의 스킬 + lib.

- **`/deep-harness-dashboard`** — 독립 스킬. deep-work 세션 밖에서 실행
- 다른 플러그인에 런타임 의존 없음 — 파일시스템에서 데이터를 읽고, 라우팅 메타데이터로 액션을 제안

### 5.3 데이터 수집

기존 플러그인 출력물을 읽고, harnessability는 on-demand 계산:

| 소스 | 위치 | 수집 데이터 | 방식 |
|------|------|-------------|------|
| deep-work receipts | `.deep-work/receipts/*.json` | sensor_results, mutation_testing, health_report, fitness_delta | 읽기 |
| deep-review receipts | `.deep-review/receipts/*.json` | review findings, fitness 소비 결과 | 읽기 |
| deep-docs scan | `.deep-docs/last-scan.json` | 문서 freshness, dead references | 읽기 |
| Harnessability (#7) | `.deep-dashboard/harnessability-report.json` | 6차원 점수 | on-demand 계산 후 캐시 |
| Fitness status | `.deep-review/fitness.json` + 최근 검증 결과 | 규칙별 pass/fail | 읽기 |

**v1 지원 플러그인**: deep-work, deep-review, deep-docs. 이 3개에 대해 데이터 스키마가 정의됨.

**v1 미지원**: deep-wiki, deep-research. 데이터 계약 미정의. 해당 섹션은 `[no data contract]`로 표시. 향후 데이터 스키마 확정 시 추가.

플러그인이 미설치이거나 데이터가 없으면 해당 섹션은 `[not installed]` 또는 `[no data]`로 표시.

### 5.4 CLI 출력 구조

```
╔══════════════════════════════════════════════════════╗
║           Deep-Suite Harness Dashboard               ║
╠══════════════════════════════════════════════════════╣
║ Topology: nextjs-app │ Harnessability: 7.4/10 (Good)║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║ ◆ Health Status (last: 2026-04-09)                   ║
║   dead-export     ✓ clean                            ║
║   stale-config    ✓ clean                            ║
║   dependency-vuln ✗ 2 critical (npm audit)           ║
║   coverage-trend  ▼ -1.3% since baseline             ║
║                                                      ║
║ ◆ Fitness Rules (4 rules)                            ║
║   no-large-files     ✓ pass                          ║
║   no-circular-deps   ✓ pass                          ║
║   colocated-tests    ✗ 2 violations                  ║
║   no-console-log     ✓ pass                          ║
║                                                      ║
║ ◆ Recent Sessions (last 3)                           ║
║   #12 2026-04-09 quality:8.2 sensors:clean mut:94%   ║
║   #11 2026-04-08 quality:7.5 sensors:1fix  mut:87%   ║
║   #10 2026-04-07 quality:6.9 sensors:2fix  mut:91%   ║
║                                                      ║
║ ◆ Plugin Coverage                                    ║
║   deep-work    ✓ 12 sessions │ deep-review  ✓ 8 runs ║
║   deep-docs    ✓ last scan 2d│ deep-wiki    [no data]║
║   deep-research [not installed]                      ║
║                                                      ║
╠══════════════════════════════════════════════════════╣
║ Overall Harness Effectiveness: 7.1/10                ║
║                                                      ║
║ Suggested actions:                                   ║
║  1. npm audit fix (2 critical vulnerabilities)       ║
║  2. colocated-tests 위반 2건 수정 (deep-work 세션)    ║
╚══════════════════════════════════════════════════════╝

리포트 파일을 생성할까요? (y/n)
```

### 5.5 Harness Effectiveness 점수

모든 입력은 0-10으로 정규화한 뒤 가중 평균:

```
// 정규화
health_norm     = (clean 센서 수 / 전체 센서 수) × 10        // 0-10
fitness_norm    = (pass 규칙 수 / 전체 규칙 수) × 10          // 0-10
session_norm    = 최근 3세션 평균 quality score / 10           // 0-100 → 0-10
harnessability_norm = harnessability 점수                      // 이미 0-10
plugin_norm     = (데이터 있는 v1 플러그인 수 / v1 지원 플러그인 수) × 10  // 0-10

// 가중 평균
effectiveness = weighted_avg(
  health_norm      × 0.30,  // drift 센서 결과
  fitness_norm     × 0.25,  // 규칙 준수율
  session_norm     × 0.25,  // 최근 세션 품질
  harnessability_norm × 0.20   // 코드베이스 하네스 가능성
)
```

**plugin_coverage 제거**: v1 지원 플러그인(deep-work, deep-review, deep-docs) 중 데이터 존재 여부는 각 섹션의 `[no data]` 표시로 충분. 점수에 설치 여부를 반영하면 harness 효과성이 아닌 도구 채택도를 측정하게 됨. 데이터 없는 차원은 해당 가중치를 나머지에 비례 배분 (#2 Session Quality Score의 not_applicable 패턴 재사용).

### 5.6 커맨드 옵션

- 기본: CLI 테이블 출력 + 마크다운 생성 여부 프롬프트
- `--json`: JSON 출력 (파이프라인/자동화용)

### 5.7 마크다운 리포트 (유저 승인 시)

`harness-report-YYYY-MM-DD.md`로 프로젝트 루트에 생성. CLI 출력과 동일 내용을 마크다운 테이블 형식으로. git commit 여부도 유저에게 물어봄.

### 5.8 액션 라우팅

대시보드의 각 finding에 `suggested_action` 문자열을 포함하여 사용자가 다음 행동을 알 수 있게 한다. 읽기 전용 원칙은 유지하되, 발견 사항별로 어떤 커맨드를 실행하면 해결되는지 안내:

| Finding 유형 | suggested_action 예시 |
|-------------|----------------------|
| dependency-vuln | `npm audit fix` 또는 `pip audit --fix` |
| fitness violation | `deep-work 세션에서 해당 파일 리팩토링` |
| coverage decline | `deep-work 세션에서 커버리지 보강` |
| dead-export | `해당 export 제거 또는 health-ignore.json에 추가` |
| stale-config | `깨진 참조 경로 수정` |
| docs freshness | `/deep-docs-scan 실행` |

v1에서는 문자열 제안만 제공. 커맨드 자동 실행이나 플러그인 간 호출은 v2 범위.

---

## 6. 구현 순서

**#5 → #7 → #6 → #8** (Bottom-up 의존성 순)

| 순서 | 약점 | 선행 조건 | 구현 위치 |
|------|------|-----------|-----------|
| 1 | #5 Harness Templates | registry.json (#2) | deep-work |
| 2 | #7 Harnessability | #5 토폴로지 감지 | deep-dashboard (~/Dev/deep-dashboard) |
| 3 | #6 Self-Correction Loop | #4 fitness-validator, #2 SENSOR_RUN | deep-work |
| 4 | #8 Dashboard | #7 + 모든 플러그인 receipt 포맷 확정 | deep-dashboard (~/Dev/deep-dashboard) |

### 기존 인프라 재사용 맵

```
#2 registry.json 감지 ──→ #5 토폴로지 레이어 (위에 추가)
#2 SENSOR_RUN 파이프라인 ──→ #6 review-check 센서 (확장)
#2 파서 패턴 ──→ #6 FIX 피드백 포맷 (재사용)
#2 Required/Advisory 정책 ──→ #6 gate 시스템 (재사용)
#4 fitness-validator ──→ #6 computational 검사 (호출)
#4 fitness-generator ──→ #5 fitness_defaults seed (확장)
#5 토폴로지 감지 ──→ #7 토폴로지 맞춤 권장 (연동)
#7 harnessability 점수 ──→ #8 대시보드 섹션 (소비)
```

---

## 7. v1 스코프 경계

### 포함

- 6개 토폴로지 (nextjs-app, react-spa, express-api, python-web, python-lib, generic)
- review-check 센서 (computational + inferential 미니 리뷰)
- 6차원 harnessability 점수
- CLI 기반 통합 대시보드 + 선택적 마크다운 리포트
- 사용자 정의 토폴로지 확장

### 미포함 (향후)

- 토폴로지 자동 전환 (세션 중 감지 변경)
- Go, Rust, Java 토폴로지 (generic으로 처리)
- 프로필 시스템 통합 (로드맵에 명시되어 있으나, 프로필 시스템 자체가 미구현. 프로필 시스템 구현 후 템플릿과의 precedence/merge 규칙 설계)
- deep-wiki, deep-research 대시보드 데이터 계약 (해당 플러그인의 출력 스키마 확정 후)
- 대시보드 웹 UI
- 시계열 트렌드 시각화
- 플러그인 간 실시간 이벤트 전파
- 대시보드 액션 자동 실행 (v1은 문자열 제안만)
