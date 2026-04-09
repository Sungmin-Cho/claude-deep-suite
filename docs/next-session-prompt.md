# Next Session Prompt

아래 프롬프트를 다음 세션 시작 시 그대로 붙여넣기:

---

## 컨텍스트

이전 세션들에서 Martin Fowler/Böckeler의 "Harness Engineering" 프레임워크를 기준으로 deep-suite 플러그인의 약점을 분석하고 **8개 약점 모두 구현 완료**했다.

### 완료된 구현

**세션 1: 약점 #1 + #2**
- deep-work 브랜치: `feat/computational-sensor-behaviour-harness` (18 commits, 168 tests)
- 내용: registry.json 동적 감지, 8개 파서, TDD 상태 머신 확장(SENSOR_RUN/FIX/CLEAN), sensor-trigger hook, /deep-sensor-scan + /deep-mutation-test, Quality Gate 3개, Session Quality Score 5가지 가중치

**세션 2: 약점 #3A + #4**
- deep-work 브랜치: `feat/health-engine-fitness-function` (16 commits, 61 new tests + 168 기존 = 229 total, base: feat/computational-sensor-behaviour-harness)
- deep-review 브랜치: `feat/fitness-health-integration` (3 commits)
- 내용: Health Engine(4 drift sensors 병렬 + fitness.json 검증), Phase 1/4 통합, deep-review 연동
- 핵심 결정: fitness.yaml→fitness.json(zero-dep), required_missing, baseline commit/branch scoping, ecosystem-aware generator, custom 타입 제거

**세션 3: 약점 #5 + #6 + #7 + #8**
- deep-work: #5 Harness Templates, #6 Self-Correction Loop
- deep-dashboard (신규 플러그인, ~/Dev/deep-dashboard): #7 Harnessability 진단, #8 통합 대시보드

**#5 Harness Templates** (deep-work):
- topology-registry.json (6개: nextjs-app, react-spa, express-api, python-web, python-lib, generic)
- topology-detector.js (우선순위 기반 + custom topology 지원)
- template-loader.js (deep merge: 오브젝트 재귀, 배열 교체)
- 6개 topology JSON 템플릿 (guides phase1/3/4, sensors, fitness_defaults, harnessability_hints)
- Phase 1 Research + Phase 3 Implement 통합
- fitness-generator.js 확장 (template fitness_defaults seed)

**#6 Self-Correction Loop** (deep-work):
- review-check.js 센서 (always-on: topology guides + fitness: fitness.json rules, 2레이어)
- config disable 지원 (.deep-work/config.json의 review_check: false)
- 파이프라인 통합 (lint → typecheck → review-check, 센서별 3라운드 독립 제한)
- Receipt 스키마 확장 (review-check 결과)
- v1 scope: computational only (inferential mini-review는 v2, changedFiles 범위 지정은 v2)

**#7 Harnessability 진단** (deep-dashboard, 신규 플러그인):
- 6차원 스코어 (type_safety 25%, module_boundaries 20%, test_infra 20%, sensor_readiness 15%, linter_formatter 10%, ci_cd 10%)
- 17개 계산적 감지기 (파일/설정 파일 검사 전용)
- 에코시스템 인식 (TS 체크 Python 스킵, Python 체크 TS 스킵)
- saveReport() → .deep-dashboard/harnessability-report.json (generated_at 포함)
- /deep-harnessability 스킬

**#8 통합 대시보드** (deep-dashboard, 신규 플러그인):
- collector.js (deep-work, deep-review, deep-docs 데이터 수집, v1 3개 플러그인)
- effectiveness.js (4차원 가중 점수: health 30%, fitness 25%, session 25%, harnessability 20%, not_applicable 재분배, 최근 3세션)
- action-router.js (발견 유형별 suggested_action)
- formatter.js (CLI 테이블 + 마크다운 출력)
- /deep-harness-dashboard 스킬
- 사용자 승인 플로우 (마크다운 리포트 생성)

### 플러그인 위치

| 플러그인 | 경로 |
|---------|------|
| deep-work | ~/Dev/deep-work |
| deep-review | ~/Dev/deep-review |
| deep-docs | ~/Dev/deep-docs |
| deep-wiki | ~/Dev/deep-wiki |
| deep-dashboard | ~/Dev/deep-dashboard ← 신규 |

### 읽어야 할 문서 (우선순위 순)

1. `docs/harness-engineering-roadmap.md` — 8개 약점 체크리스트. 모두 완료.
2. `docs/harness-engineering-gap-analysis.md` — Böckeler 프레임워크 기준 현황. #5-#8 업데이트 반영.

### 다음 작업 후보

모든 Harness Engineering 약점이 해소되었으므로 다음 방향 중 선택:

1. **#3B 런타임 모니터링** — SLO, 에러율, 로그 이상 탐지. 플러그인 범위 밖이므로 별도 설계 필요.
2. **미머지 브랜치 정리** — deep-work 2개 feature 브랜치 + deep-review 1개 브랜치 main 머지.
3. **Approved Fixtures 패턴** (#1 미구현 항목) — fixtures/ 골든 입출력 데이터.
4. **신규 이니셔티브** — Harness Engineering 이외 개선 영역 탐색.

### 작업 방식

이전 세션과 동일한 워크플로우:
1. 로드맵 문서를 읽고 다음 약점의 범위를 확인
2. /superpowers:brainstorming 으로 디자인 브레인스토밍
3. 디자인 스펙 작성 → Opus+Codex 3-way 리뷰 → 수정
4. 구현 플랜 작성 → Opus+Codex 3-way 리뷰 → 수정
5. Subagent-Driven Development로 구현
6. 3중 리뷰 (Opus + Codex standard + Codex adversarial) → 수정
7. 문서 업데이트 (roadmap, gap-analysis, README, CHANGELOG)
