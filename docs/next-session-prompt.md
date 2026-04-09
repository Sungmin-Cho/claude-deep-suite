# Next Session Prompt

아래 프롬프트를 다음 세션 시작 시 그대로 붙여넣기:

---

## 컨텍스트

이전 두 세션에서 Martin Fowler/Böckeler의 "Harness Engineering" 프레임워크를 기준으로 deep-suite 플러그인의 약점을 분석하고 4개 약점을 구현했다.

### 완료된 구현

**세션 1: 약점 #1 + #2**
- deep-work 브랜치: `feat/computational-sensor-behaviour-harness` (18 commits, 168 tests, main 미머지)
- 내용: registry.json 동적 감지, 8개 파서, TDD 상태 머신 확장(SENSOR_RUN/FIX/CLEAN), sensor-trigger hook, /deep-sensor-scan + /deep-mutation-test, Quality Gate 3개, Session Quality Score 5가지 가중치

**세션 2: 약점 #3A + #4**
- deep-work 브랜치: `feat/health-engine-fitness-function` (16 commits, 61 new tests + 168 기존 = 229 total, main 미머지, base: feat/computational-sensor-behaviour-harness)
- deep-review 브랜치: `feat/fitness-health-integration` (3 commits, main 미머지)
- 내용: Health Engine(4 drift sensors 병렬 + fitness.json 검증), Phase 1/4 통합, deep-review 연동
- 핵심 결정: fitness.yaml→fitness.json(zero-dep), required_missing, baseline commit/branch scoping, ecosystem-aware generator, custom 타입 제거
- 3-way 리뷰(Opus+Codex+Codex adversarial) 스펙/플랜/구현 각각 수행

### 미머지 브랜치 체인

```
deep-work main
  └── feat/computational-sensor-behaviour-harness (#1+#2, 18 commits)
       └── feat/health-engine-fitness-function (#3A+#4, 16 commits)

deep-review main
  └── feat/fitness-health-integration (#4 연동, 3 commits)
```

### 읽어야 할 문서 (우선순위 순)

1. `docs/harness-engineering-roadmap.md` — 8개 약점 체크리스트. #1,#2,#3A,#4 완료. #3B,#5-#8 대기.
2. `docs/harness-engineering-gap-analysis.md` — Böckeler 프레임워크 기준 약점 진단. Architecture Fitness 4/10→7/10. Continuous 타이밍 "부분 해소".
3. `docs/superpowers/specs/2026-04-09-health-engine-fitness-function-design.md` — #3A+#4 설계 스펙 v3.
4. `docs/superpowers/plans/2026-04-09-health-engine-fitness-function.md` — #3A+#4 구현 플랜 v3.
5. `docs/superpowers/specs/2026-04-09-computational-sensor-behaviour-harness-design.md` — #1+#2 설계 스펙.
6. `docs/superpowers/plans/2026-04-09-computational-sensor-behaviour-harness.md` — #1+#2 구현 플랜.

### 남은 약점 (#3B, #5-#8)

| # | 약점 | 심각도 | 핵심 내용 |
|---|------|--------|-----------|
| 3B | 런타임 모니터링 | High | SLO, 에러율, cron 스캔. 플러그인 범위 밖 — 별도 설계 필요. |
| 5 | Harness Templates | Medium | 토폴로지별(Next.js SaaS, Python API 등) guides+sensors 번들. Ashby 법칙. |
| 6 | Self-Correction Loop 통합 | Medium | deep-review를 Phase 3 내 인라인 피드백으로 통합. #2의 SENSOR_RUN 루프가 기반 인프라. |
| 7 | Harnessability 진단 | Low | 코드베이스 하네스 가능성 자동 평가. 타입 시스템, 모듈 경계, 활용 가능 sensor 진단. |
| 8 | 통합 하네스 대시보드 | Low | 5개 플러그인 센서 결과 통합 뷰. 하네스 효과성 피드백 루프. |

### 작업 방식

이전 세션과 동일한 워크플로우:
1. 로드맵 문서를 읽고 다음 약점의 범위를 확인
2. /superpowers:brainstorming 으로 디자인 브레인스토밍
3. 디자인 스펙 작성 → Opus+Codex 3-way 리뷰 → 수정
4. 구현 플랜 작성 → Opus+Codex 3-way 리뷰 → 수정
5. Subagent-Driven Development로 구현
6. 3중 리뷰 (Opus + Codex standard + Codex adversarial) → 수정
7. 문서 업데이트 (roadmap, gap-analysis, README, CHANGELOG)

## 요청

**우선 작업: 미머지 브랜치 정리**

3개 feature 브랜치를 main에 머지해줘:
1. deep-work: `feat/computational-sensor-behaviour-harness` → main
2. deep-work: `feat/health-engine-fitness-function` → main (1번 머지 후)
3. deep-review: `feat/fitness-health-integration` → main

머지 후 남은 약점 #5-#8 brainstorming을 시작해줘. 로드맵 문서부터 읽고 시작해.
