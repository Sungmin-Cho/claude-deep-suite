# Deep-Suite Harness Engineering Gap Analysis

> Böckeler/Fowler의 Harness Engineering 프레임워크 기준 Deep-Suite 정밀 진단
> 분석일: 2026-04-09
> 기준 문서: https://martinfowler.com/articles/harness-engineering.html

---

## 분석 방법론

Birgitta Böckeler(Thoughtworks)의 2x2 매트릭스(Guide/Sensor x Computational/Inferential)와 3대 규제 카테고리(Maintainability, Architecture Fitness, Behaviour), 타이밍 모델(Keep Quality Left), Harnessability, Harness Templates를 기준축으로 deep-suite 5개 플러그인의 커버리지를 매핑.

핵심 공식: **Agent = Model + Harness**

---

## 강점: deep-suite가 잘 하고 있는 것

| Böckeler 원칙 | Deep-suite 구현 | 플러그인 |
|---|---|---|
| Generator-Evaluator 분리 | Opus subagent + 3-way cross-model 검증 | deep-review |
| Sprint Contract | 슬라이스별 YAML 계약 + 자동/수동 검증 기준 | deep-review + deep-work |
| Phase Guard (Computational Guide) | PreToolUse hook으로 코드 편집 물리적 차단 | deep-work |
| TDD 강제 (Behaviour Sensor) | RED→GREEN 상태 머신 | deep-work |
| Evidence/Receipt 시스템 | 슬라이스별 JSON proof | deep-work |
| 하네스 진화 | Assumption Engine (세션 품질 스코어 기반 규칙 자동 조정) | deep-work |
| Guide 품질 유지 | dead reference, moved path 자동 탐지/수정 | deep-docs |
| 지식 축적 | Karpathy 패턴 기반 위키 | deep-wiki |

---

## 2x2 매트릭스 커버리지

```
              ┌─────────────────────────┬──────────────────────────┐
              │   Computational         │   Inferential            │
┌─────────────┼─────────────────────────┼──────────────────────────┤
│             │ ✅ Phase Guard hook     │ ✅ research.md, plan.md  │
│  Guides     │ ✅ TDD state machine    │ ✅ brainstorm.md         │
│ (Feedforward│ ✅ protect-readonly     │ ✅ Sprint Contract       │
│  제어)      │ ⛔ LSP/Language Server  │ ✅ deep-wiki 지식 베이스 │
│             │ ⛔ codemods             │ ⛔ MCP 기반 지식 검색    │
│             │ ⛔ linter config        │ ⛔ 컨텍스트별 컨벤션 스킬│
│             │ ⛔ type-check config    │                          │
├─────────────┼─────────────────────────┼──────────────────────────┤
│             │ ✅ test pass/fail       │ ✅ Opus code review      │
│  Sensors    │ ✅ file-tracker hook    │ ✅ cross-model verify    │
│ (Feedback   │ ✅ doc scan (freshness) │ ✅ drift check           │
│  제어)      │ ✅ eslint/ruff/clang    │ ✅ SOLID review          │
│             │ ✅ tsc/mypy/dotnet      │ ✅ entropy scan          │
│             │ ✅ coverage (piggybck)  │ ⛔ architecture review   │
│             │ ✅ mutation testing     │ ⛔ runtime sampling      │
│             │ ✅ fitness.json rules   │                          │
│             │ ✅ dead-export scan     │                          │
│             │ ✅ stale-config scan    │                          │
│             │ ✅ dependency-vuln      │                          │
│             │ ⛔ runtime monitoring   │                          │
└─────────────┴─────────────────────────┴──────────────────────────┘
```

**2026-04-09 업데이트 1:** Computational Sensor 파이프라인 구현 완료 — eslint, tsc, ruff, mypy, dotnet, clang-tidy, coverage 피기백, mutation testing(Stryker) 통합. Inferential 과의존 구조가 Computational+Inferential 균형 구조로 개선됨.

**2026-04-09 업데이트 2:** Health Engine + Architecture Fitness Function 구현 완료 — 4개 드리프트 센서(dead-export, stale-config, dependency-vuln, coverage-trend), fitness.json 기반 4개 rule checker(file-metric, forbidden-pattern, structure, dependency), ecosystem-aware generator, Phase 1/4 통합, deep-review 연동. Continuous 타이밍 갭 부분 해소(세션 간 드리프트 감지). Architecture Fitness 4/10 → 7/10으로 개선.

---

## 3대 규제 카테고리별 진단

### Maintainability Harness — 7/10 (양호)

**있음**: SOLID 리뷰, Insight 분석, 엔트로피 스캔, TDD 강제, deep-docs

**없음**:
- 순환 복잡도 임계값 강제 (보고만 하고 차단 안 함)
- 스타일 위반 감지/강제 (외부 linter 의존)
- 데드 코드 감지
- 테스트 커버리지 품질 검증

### Architecture Fitness Harness — 7/10 (개선됨, 2026-04-09)

**있음**: Drift Check, deep-review "architecture fit" 기준, **fitness.json 선언적 규칙 + 계산적 검증**, **file-metric (줄 수 제한)**, **forbidden-pattern (금지 패턴)**, **structure (colocated 테스트)**, **dependency (순환 의존성, dep-cruiser)**, **fitness-generator (자동 생성 제안)**, **Phase 4 Fitness Delta Gate**, **Health Required Gate (required_missing 전파)**

**없음** (향후):
- dep-cruiser layer-direction 검증 (v1은 circular만)
- 성능 회귀 테스트
- 관찰가능성 표준 강제
- API 품질 Linting
- custom 규칙 타입 (보안 모델 설계 후)

### Behaviour Harness — 7/10 (개선됨, 2026-04-09)

**있음**: TDD 강제, Sprint Contract, deep-review 정확성 기준, **Mutation Testing (Stryker/mutmut)**, **자동 재생성 루프 (최대 3회)**, **Implement phase 복귀 패턴**, **Mutation Score Quality Gate**, **possibly_equivalent 태깅**

**없음** (향후):
- Approved Fixtures 패턴
- 브라우저 기반 행동 검증 (Playwright)
- 시각적 회귀 테스트

Mutation testing으로 AI 생성 테스트의 **유의미성**을 자동 검증. survived mutant 발견 시 Implement phase로 복귀하여 TDD 루프로 테스트 보강.

---

## 타이밍(Change Lifecycle) 분석

| 단계 | 커버리지 | 주요 빈 곳 |
|------|----------|-----------|
| Pre-Integration | 양호 (개선) | ✅ linter/타입 체크 자동 실행(SENSOR_RUN). pre-commit hook은 미구현 |
| Post-Integration | 양호 (개선) | ✅ mutation testing(Phase 4). ✅ Fitness Delta Gate. architecture review 전용 없음 |
| **Continuous** | **부분 해소 (개선)** | ✅ 세션 간 드리프트 감지(dead-export, stale-config, dep-vuln, coverage-trend). ⛔ 런타임 피드백, 로그 이상 탐지 전무 |

---

## 구조적 불균형

> **Inferential 제어에 과도하게 의존하고, Computational 제어가 부족하다.**

| 측면 | Computational | Inferential |
|------|--------------|-------------|
| 비용 | 밀리초, 거의 무료 | 초~분, 토큰 비용 |
| 결정성 | 결정적 — 항상 같은 결과 | 비결정적 — 다른 결과 가능 |
| 신뢰도 | 높음 | 확률적 |
| deep-suite 활용 | ✅ 개선됨 (linter, typecheck, coverage, mutation) | 적절 |

---

## 약점 심각도 분류

| 순위 | 약점 | 프레임워크 영역 | 심각도 |
|------|------|----------------|--------|
| 1 | ~~Behaviour Harness 부재~~ → **✅ 구현 완료** (mutation testing + 자동 재생성) | 규제 카테고리 #3 | ✅ Resolved |
| 2 | ~~Computational Sensor 오케스트레이션 부재~~ → **✅ 구현 완료** (linter/typecheck/coverage 파이프라인) | Sensor x Computational | ✅ Resolved |
| 3A | ~~Continuous Monitoring (세션 간 드리프트)~~ → **✅ 구현 완료** (4 drift sensors + Health Engine) | 타이밍 (Continuous) | ✅ Resolved |
| 3B | **Continuous Monitoring (런타임)** — SLO, 에러율, cron 스캔 | 타이밍 (Continuous) | 🟡 High |
| 4 | ~~Architecture Fitness Function 부재~~ → **✅ 구현 완료** (fitness.json + 4 rule checkers + deep-review 연동) | 규제 카테고리 #2 | ✅ Resolved |
| 5 | **Harness Templates 부재** | Harness Templates | 🟡 Medium |
| 6 | **Self-Correction Loop 미통합** | Steering Loop | 🟡 Medium |
| 7 | **Harnessability 진단 부재** | Harnessability | 🟢 Low |
| 8 | **통합 대시보드 부재** | Human Steering | 🟢 Low |

---

## 개선 로드맵

### Phase 1: Computational Sensor 파이프라인 (가장 높은 ROI)

deep-work Phase 3/4에 프로젝트 감지 기반 computational sensor 자동 실행:

```
package.json 감지 → npm run lint, npm run typecheck, npm run test -- --coverage
pyproject.toml 감지 → ruff check, mypy, pytest --cov
Cargo.toml 감지 → cargo clippy, cargo test
go.mod 감지 → golangci-lint, go test -cover
```

- 결과를 receipt에 통합, quality gate에 반영
- 에러 메시지에 에이전트용 수정 지침 주입 (OpenAI/Stripe 패턴)

### Phase 2: Behaviour Harness 강화

- **Mutation Testing 통합**: Stryker(JS/TS), mutmut(Python) → AI 생성 테스트 실질적 품질 측정
- **Approved Fixtures**: `fixtures/` 디렉토리에 골든 입출력 데이터 → 기능 테스트 기준선
- **Browser-based 검증**: 프론트엔드 프로젝트에서 Playwright로 critical path 자동 검증

### Phase 3: Architecture Fitness

- `.deep-review/fitness.yaml`에 아키텍처 특성 선언 (성능 임계값, 번들 크기, 레이어 규칙)
- 구현 후 자동 검증 → quality gate 통합
- dep-cruiser 기반 의존성 방향 규칙

### Phase 4: Continuous Monitoring + Harness Templates

- deep-docs에 주기적 스캔 cron 추가
- 토폴로지별 harness template 번들 (Next.js SaaS, Python API, Event Processor 등)
- 런타임 센서 프레임워크 (SLO 모니터링, 로그 이상 탐지)

---

## 참고 문서

- [Harness Engineering for Coding Agent Users](https://martinfowler.com/articles/harness-engineering.html) — Birgitta Böckeler, 2026-04-02
- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) — Anthropic
- [Harness Engineering: Leveraging Codex](https://openai.com/index/harness-engineering/) — OpenAI
