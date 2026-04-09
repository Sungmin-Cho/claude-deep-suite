# Deep-Suite Harness Engineering 개선 로드맵

> 기준 문서: [Harness Engineering for Coding Agent Users](https://martinfowler.com/articles/harness-engineering.html) — Böckeler, 2026-04-02
> Gap Analysis: [docs/harness-engineering-gap-analysis.md](./harness-engineering-gap-analysis.md)
> 작성일: 2026-04-09

---

## 약점 체크리스트

### Critical

- [x] **#1 Behaviour Harness 강화** — AI 생성 테스트 품질 검증 ✅ 2026-04-09
  - 심각도: Critical
  - 대상 플러그인: deep-work
  - 핵심 문제: TDD가 테스트 "존재"만 보장, "유의미성"은 미보장
  - 구현 완료:
    - [x] Mutation Testing 통합 (Stryker JS/TS, stryker-net C#, mutmut Python via generic-line)
    - [x] `/deep-mutation-test` 커맨드 — git diff 기반 scope, 자동 재생성 루프 (최대 3회)
    - [x] Implement phase 복귀 패턴 — Test phase 코드 수정 금지 불변식 준수
    - [x] Mutation Score를 Quality Gate (Advisory) + Session Quality Score (15%) 반영
    - [x] Receipt에 mutation_testing 필드 포함 (score, survived_details, auto_fix_rounds)
    - [x] Stryker 파서에 possibly_equivalent 태깅 (NoCoverage + 로깅 변이)
  - 미구현 (향후):
    - [ ] Approved Fixtures 패턴 (`fixtures/` 골든 입출력 데이터)
    - [ ] Browser-based 행동 검증 (Playwright critical path)

- [x] **#2 Computational Sensor 오케스트레이션 파이프라인** ✅ 2026-04-09
  - 심각도: Critical
  - 대상 플러그인: deep-work
  - 핵심 문제: Inferential 제어에 과도하게 의존, Computational 제어 부족
  - 구현 완료:
    - [x] 프로젝트 감지 엔진 (registry.json 기반, JS/TS/Python/C#/C++ + 사용자 확장)
    - [x] Linter 자동 실행 + 결과 파싱 (eslint, ruff, clang-tidy, dotnet-format + generic 파서)
    - [x] 타입 체커 자동 실행 (tsc, mypy, dotnet build, cmake)
    - [x] 커버리지 측정 통합 (coverage_flag 피기백 방식)
    - [x] 에이전트용 FIX 피드백 포맷 (에러별 수정 지침 주입)
    - [x] TDD 상태 머신 확장 (SENSOR_RUN → SENSOR_FIX → SENSOR_CLEAN)
    - [x] Self-Correction Loop: GREEN 후 자동 센서 실행, 최대 3회 자기 교정
    - [x] Receipt + Quality Gate 통합 (Sensor Clean=Required, Coverage=Advisory)
    - [x] Session Quality Score 5가지 가중치 (not_applicable 비례 배분)
    - [x] `/deep-sensor-scan` 독립 실행 커맨드
    - [x] Fail-closed 정책 (non-zero exit + 0 items = fail)
    - [x] Config/marker 파일 변경 시 센서 트리거
    - [x] Detection 결과 캐싱 (.sensor-detection-cache.json)

### High

- [x] **#3A 세션 간 드리프트 감지** ✅ 2026-04-09
  - 심각도: High
  - 대상 플러그인: deep-work
  - 핵심 문제: 개발 생명주기 밖의 지속적 센서 전무
  - 구현 완료:
    - [x] dead-export 감지 (JS/TS, grep 기반 export/import 교차 참조)
    - [x] stale-config 감지 (tsconfig, package.json, .eslintrc 깨진 참조)
    - [x] dependency-vuln 감지 (npm audit, Required gate)
    - [x] coverage-trend 감지 (baseline 비교, Phase 3 커버리지 재사용)
    - [x] Health Engine 오케스트레이터 (Promise.allSettled 병렬, 개별 타임아웃)
    - [x] Baseline commit/branch scoping (ancestor 검증, 자동 무효화)
    - [x] health-ignore.json 무시 목록
    - [x] Phase 1 Research 자동 실행 통합
  - 미구현 (향후 #3B):
    - [ ] 런타임 피드백 수집 (SLO, 에러율, 레이턴시) — 플러그인 범위 밖
    - [ ] 로그 이상 탐지
    - [ ] "Janitor" 백그라운드 스캔 자동화
    - [ ] deep-docs 주기적 cron 스캔

- [x] **#4 Architecture Fitness Function 시스템** ✅ 2026-04-09
  - 심각도: High
  - 대상 플러그인: deep-review, deep-work
  - 핵심 문제: 아키텍처 특성 선언 + 자동 검증 메커니즘 부재
  - 구현 완료:
    - [x] `.deep-review/fitness.json` 스키마 정의 (JSON 형식, zero-dependency)
    - [x] 4개 rule checker: file-metric (줄 수), forbidden-pattern (금지 패턴), structure (colocated), dependency (dep-cruiser circular)
    - [x] fitness-validator: 스키마 검증 + 규칙 실행 엔진 (required_missing 상태)
    - [x] fitness-generator: ecosystem-aware 자동 생성 (비 JS/TS에서 dependency 제외)
    - [x] Phase 4 Fitness Delta Gate (Advisory) + Health Required Gate (Required)
    - [x] Phase 4 baseline 자동 갱신
    - [x] deep-review 연동: fitness.json 리뷰 기준 주입 + receipt health_report 소비
    - [x] receipt scan_commit 기반 stale 판정
  - 미구현 (향후):
    - [ ] dep-cruiser layer-direction 검증 (v1은 circular만)
    - [ ] Python pip-audit 파서
    - [ ] custom 규칙 타입 (보안 모델 설계 후 v2에서 재도입)

### Medium

- [ ] **#5 Harness Templates — 토폴로지별 guides+sensors 번들**
  - 심각도: Medium
  - 대상 플러그인: deep-work
  - 구현 항목:
    - [ ] 서비스 토폴로지 감지 (Next.js SaaS, Python API, Event Processor 등)
    - [ ] 토폴로지별 guides+sensors 번들 정의
    - [ ] 프로필 시스템과 통합

- [ ] **#6 Self-Correction Loop 통합**
  - 심각도: Medium
  - 대상 플러그인: deep-work, deep-review
  - 구현 항목:
    - [ ] 구현 중 linter/static analysis → 자기 교정 사이클
    - [ ] deep-review를 Phase 3 내 인라인 피드백으로 통합
    - [ ] Sensor 결과 LLM-optimized 포맷 변환

### Low

- [ ] **#7 Harnessability 진단 기능**
  - 심각도: Low
  - 대상 플러그인: deep-work
  - 구현 항목:
    - [ ] 코드베이스 하네스 가능성 자동 평가
    - [ ] 타입 시스템, 모듈 경계, 활용 가능 sensor 진단
    - [ ] 하네스 전략 추천

- [ ] **#8 통합 하네스 대시보드**
  - 심각도: Low
  - 대상 플러그인: all
  - 구현 항목:
    - [ ] 5개 플러그인 센서 결과 통합 뷰
    - [ ] 하네스 효과성 피드백 루프
    - [ ] 인간 입력 라우팅 메커니즘

---

## 구현 진행 상황

| 약점 | 세션 | 상태 | 비고 |
|------|------|------|------|
| #1 Behaviour Harness | 2026-04-09 | ✅ 완료 | Mutation testing + 자동 재생성. 18 commits, 168 tests. Branch: `feat/computational-sensor-behaviour-harness` |
| #2 Computational Sensor | 2026-04-09 | ✅ 완료 | Linter/typecheck/coverage 파이프라인 + TDD 상태 머신 확장. Opus+Codex 3중 리뷰 통과 |
| #3A 드리프트 감지 | 2026-04-09 | ✅ 완료 | 4 drift sensors + Health Engine 오케스트레이터. 13 commits, 61 tests. Branch: `feat/health-engine-fitness-function`. Opus+Codex 3중 리뷰 통과 |
| #3B 런타임 모니터링 | — | 대기 | 플러그인 범위 밖 (SLO, 에러율, cron). 별도 설계 필요 |
| #4 Architecture Fitness | 2026-04-09 | ✅ 완료 | fitness.json + 4 rule checkers + generator + deep-review 연동. #3A와 동일 브랜치 |
| #5 Harness Templates | — | 대기 | |
| #6 Self-Correction Loop | — | 대기 | |
| #7 Harnessability 진단 | — | 대기 | |
| #8 통합 대시보드 | — | 대기 | |

---

## 참고

- Böckeler 프레임워크: 2x2 매트릭스(Guide/Sensor x Computational/Inferential)
- 핵심 원칙: "Computational sensor를 먼저 최대한 활용하고, Inferential sensor는 computational이 잡지 못하는 의미론적 문제에만 집중"
- deep-suite 플러그인은 git submodule로 구성 — 각 플러그인 레포에서 개별 작업 필요
