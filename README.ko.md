[English](./README.md) | **한국어**

# Claude Deep Suite

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) 플러그인 통합 마켓플레이스. 구조화된 개발, 지식 관리, 자율 실험, 독립 코드 리뷰, 문서 가드닝, 하네스 진단을 위한 여섯 가지 플러그인을 하나로 묶어 제공합니다.

## 플러그인

| 플러그인 | 설명 |
|---------|------|
| [deep-work](https://github.com/Sungmin-Cho/claude-deep-work) | 증거 기반 개발 프로토콜 |
| [deep-wiki](https://github.com/Sungmin-Cho/claude-deep-wiki) | LLM 관리형 마크다운 위키 |
| [deep-evolve](https://github.com/Sungmin-Cho/claude-deep-evolve) | 자율 실험 프로토콜 |
| [deep-review](https://github.com/Sungmin-Cho/claude-deep-review) | 독립 Evaluator + 교차 모델 검증 |
| [deep-docs](https://github.com/Sungmin-Cho/claude-deep-docs) | 문서 가드닝 에이전트 |
| [deep-dashboard](https://github.com/Sungmin-Cho/claude-deep-dashboard) | 크로스 플러그인 하네스 진단 |

---

## 설치

### 사전 요구사항

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI 설치 및 설정 완료

### 마켓플레이스 추가

```bash
/plugin marketplace add Sungmin-Cho/claude-deep-suite
```

### 플러그인 설치

```bash
# 전체 설치
/plugin install deep-work@Sungmin-Cho-claude-deep-suite
/plugin install deep-wiki@Sungmin-Cho-claude-deep-suite
/plugin install deep-evolve@Sungmin-Cho-claude-deep-suite
/plugin install deep-review@Sungmin-Cho-claude-deep-suite
/plugin install deep-docs@Sungmin-Cho-claude-deep-suite
/plugin install deep-dashboard@Sungmin-Cho-claude-deep-suite

# 필요한 것만 설치
/plugin install deep-work@Sungmin-Cho-claude-deep-suite
```

---

## 하네스 엔지니어링 아키텍처

Deep Suite는 [Harness Engineering](https://martinfowler.com/articles/harness-engineering.html) 프레임워크(Böckeler/Fowler, 2026)를 구현합니다 — **Agent = Model + Harness** 원칙. 각 플러그인은 Guide(피드포워드) × Sensor(피드백)의 2×2 매트릭스에서 Computational(결정적)과 Inferential(LLM 기반) 제어의 특정 역할을 담당합니다.

### 2x2 매트릭스: 각 플러그인의 위치

```
                +---------------------------+---------------------------+
                |  Computational            |  Inferential              |
+---------------+---------------------------+---------------------------+
|               |                           |                           |
|  Guides       |  deep-work                |  deep-work                |
|  (피드포워드  |  +- Phase Guard hook      |  +- research/plan/brain   |
|   제어)       |  +- TDD 상태 머신         |  +- Sprint Contract       |
|               |  +- 토폴로지 템플릿       |                           |
|               |                           |  deep-wiki                |
|               |                           |  +- 지속적 지식 축적      |
|               |                           |                           |
|               |                           |  deep-docs                |
|               |                           |  +- 문서 신선도 가이드    |
+---------------+---------------------------+---------------------------+
|               |                           |                           |
|  Sensors      |  deep-work                |  deep-review              |
|  (피드백      |  +- Linter + 타입 체크    |  +- Opus 코드 리뷰        |
|   제어)       |  +- 커버리지 + 뮤테이션   |  +- 3-way 교차 모델       |
|               |  +- 4개 드리프트 센서     |  +- SOLID + 엔트로피      |
|               |  +- Fitness 규칙          |                           |
|               |  +- review-check 센서     |  deep-work                |
|               |                           |  +- 드리프트 체크         |
|               |  deep-docs                |                           |
|               |  +- 문서 신선도 스캔      |                           |
|               |                           |                           |
|               |  deep-dashboard           |                           |
|               |  +- Harnessability        |                           |
|               |  +- Effectiveness         |                           |
+---------------+---------------------------+---------------------------+
```

### 개발 라이프사이클 흐름

```
 Phase 0     Phase 1      Phase 2    Phase 3        Phase 4     Post
 Brainstorm  Research     Plan       Implement      Test        Review
 |           |            |          |              |           |
 |      deep-wiki <-- knowledge --> deep-wiki       |           |
 |           |            |          |              |           |
 |    deep-dashboard      |          |              |           |
 |    (harnessability)    |          |              |           |
 |           |            |          |              |           |
 |    Health Engine       |   SENSOR_RUN pipeline   |           |
 |    +- drift scan       |   +- lint               |           |
 |    +- fitness check    |   +- typecheck          |           |
 |           |            |   +- review-check       |           |
 |      topology -----------> guides.phase3         |           |
 |      detection         |          |              |           |
 |           |            |          |       mutation test      |
 |           |            |          |       fitness delta      |
 |           |            |          |              |           |
 |           |            |          |              |    deep-review
 |           |            |          |              |    3-way verify
 |           |            |          |              |           |
 +===========+============+==========+==============+===========+
                                                          |
 Continuous: deep-docs (doc scan) <-----------------------+
             deep-dashboard (effectiveness + action routing)
             deep-evolve (autonomous experimentation)
```

### 플러그인 데이터 흐름

```
 deep-work ------ receipts -------> deep-dashboard (collector)
    |                                    |
    +-- health_report ----------------> deep-review (fitness-aware review)
    |                                    |
    +-- fitness.json <----------------> deep-review (rule consumption)
    |                                    |
 deep-docs -- last-scan.json -----> deep-dashboard (collector)
    |                                    |
 deep-dashboard                          v
    +-- harnessability ---------------> deep-work Phase 1 (research context)
    +-- effectiveness ----------------> user (CLI report + optional markdown)
```

### 프레임워크 커버리지

| 차원 | 핵심 강점 |
|------|-----------|
| Computational Sensors | 5개 생태계에 걸쳐 13+ 센서 |
| Self-Correction Loop | 멀티 라운드, 멀티 센서 상태 머신 |
| Harnessability | 정량적 진단 도구 (6차원) |
| Pre-Integration | Phase Guard + TDD + SENSOR_RUN 파이프라인 |
| Human Steering | Assumption Engine + Dashboard |
| Continuous Timing | 정적 분석 강함, 런타임 모니터링 없음 |

---

## deep-work

**증거 기반 개발 프로토콜** — 단일 커맨드로 구조화된 증거 기반 소프트웨어 개발을 자동 진행합니다.

### 문제

AI 코딩 도구가 복잡한 작업을 수행할 때, 코드베이스를 이해하지 않고 구현에 뛰어들거나, 기존 아키텍처와 충돌하는 패턴을 도입하거나, 검증 없이 작업 완료를 선언하는 경우가 많습니다.

### 해결

`/deep-work "task"` 하나로 **Brainstorm → Research → Plan → Implement → Test** 전체 파이프라인을 자동 실행합니다. 구현 단계가 아닌 페이즈에서는 코드 파일 수정이 훅으로 물리적 차단됩니다.

### 주요 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/deep-work <task>` | 자동 플로우 — 전체 파이프라인 실행. 플랜 승인만 필요. |
| `/deep-status` | 통합 뷰 — 진행상황, 리포트, 영수증, 히스토리, 가정 |
| `/deep-debug` | 근본 원인 조사 기반 체계적 디버깅 |
| `/deep-research` | 수동 Phase 1 — 코드베이스 심층 분석 |
| `/deep-plan` | 수동 Phase 2 — 슬라이스 기반 구현 계획 |
| `/deep-implement` | 수동 Phase 3 — TDD 강제 슬라이스 실행 |
| `/deep-test` | Phase 4 — 품질 게이트 포함 검증 |
| `/deep-sensor-scan` | Computational Sensor 스캔 — linter, 타입 체커, 커버리지 |
| `/deep-mutation-test` | Mutation Testing — AI 생성 테스트 품질 검증 |

### 워크플로우 페이즈

```
Phase 0  Brainstorm    디자인 탐색 — "어떻게 하기 전에 왜"
Phase 1  Research      코드베이스 심층 분석 및 문서화
Phase 2  Plan          슬라이스 기반 구현 계획 (사용자 승인 필요)
Phase 3  Implement     TDD 강제 실행 — 실패 테스트 → 코드 → 영수증
Phase 4  Test          영수증 검사, 스펙 준수, 품질 게이트
```

### 핵심 기능

- **페이즈 잠금 파일 편집** — Phase 3 외부에서 코드 변경 차단
- **TDD 강제** — 실패 테스트 먼저, 그다음 구현
- **영수증 기반 증거** — 모든 슬라이스에서 완료 증거 수집
- **품질 게이트** — 드리프트 체크, SOLID 리뷰, 인사이트 분석, Sensor Clean, Mutation Score
- **Computational Sensor** — linter/타입 체커/커버리지 자동 실행 + 자기 교정 루프 (SENSOR_RUN → SENSOR_FIX → SENSOR_CLEAN)
- **Mutation Testing** — AI 생성 테스트 품질 자동 검증. survived mutant 발견 시 자동 재생성 (최대 3회)
- **자동 플로우** — 하나의 커맨드로 전체 워크플로우 구동
- **Completeness Policy** — placeholder 금지 패턴으로 plan 품질 강제 *(v5.8)*
- **코드 스케치 크기별 완성도** — slice 크기(S/M/L)에 비례한 코드 상세도 *(v5.8)*
- **Research 추적성** — 태그된 발견사항 [RF/RA]으로 연구→plan 결정 연결 *(v5.8)*

[전체 문서 →](https://github.com/Sungmin-Cho/claude-deep-work)

---

## deep-wiki

**LLM 관리형 마크다운 위키** — [Karpathy의 LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 철학을 구현한 지속적 지식 축적 시스템.

### 아이디어

매번 지식을 재발견하는 방식(RAG) 대신, Claude Code가 점진적으로 위키를 구축하고 유지합니다. 새 소스를 추가하면 LLM이 읽고, 핵심 정보를 추출하고, 기존 위키에 통합합니다. 지식은 시간이 지남에 따라 복리로 쌓입니다.

### 주요 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/wiki-setup <path>` | 위키 디렉토리 구조 초기화 |
| `/wiki-ingest <source>` | 소스(URL, 파일, 텍스트)를 읽고 위키 페이지 생성/업데이트 |
| `/wiki-query <question>` | 위키 검색 후 인용 포함 근거 기반 답변 생성 |
| `/wiki-lint` | 건강 검사 — 스키마 위반, 고립 페이지, 깨진 링크 |
| `/wiki-rebuild` | 페이지 프론트매터에서 인덱스 재생성 |

### 아키텍처

```
원본 소스  →  위키 (마크다운 페이지)  →  스키마 (관리 규칙)
```

- **플랫 페이지** — 태그가 카테고리를 대체, 이동으로 인한 깨진 링크 없음
- **자동 린트** — 매 인제스트/리빌드 후 자동 실행
- **자동 파일링** — 2개 이상 페이지를 종합한 쿼리 결과는 위키에 자동 저장
- **Obsidian 호환** — Obsidian 볼트로 사용 가능

[전체 문서 →](https://github.com/Sungmin-Cho/claude-deep-wiki)

---

## deep-evolve

**자율 실험 프로토콜** — 목표를 지정하면, deep-evolve가 측정 기반 실험 루프를 통해 프로젝트를 체계적으로 개선합니다.

### 영감

Andrej Karpathy의 [autoresearch](https://github.com/karpathy/autoresearch)에서 영감을 받았습니다 — AI 에이전트가 자율적으로 연구를 수행하는 실험. deep-evolve는 이 방법론을 ML 훈련에서 **모든 소프트웨어 프로젝트**로 일반화합니다.

### 작동 방식

1. **분석** — 5단계 프로젝트 심층 분석 (구조, 의존성, 코드, 메트릭, 확인)
2. **평가 harness 생성** — 프로젝트에 맞춤화된 평가 harness 생성 (CLI용 `prepare.py` 또는 MCP/도구 기반 `prepare-protocol.md`)
3. **실험 루프** — 자율적으로 코드 수정, 평가, 개선 유지, 퇴보 폐기
4. **재개** — 크래시 안전 저널 기반 상태 머신, 세션 간 재개
5. **리포트** — 통계, 점수 추이, 핵심 발견, 교훈

### 실험 사이클

```
아이디어 선택 → 코드 수정 → 평가 → 점수 향상?
                                    ├─ 예 → 유지
                                    └─ 아니오 → 폐기 → 반복
```

### 주요 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/deep-evolve` | 새 세션 시작 (대화형 목표/타겟 선택) |
| `/deep-evolve <N>` | N번 실험 실행 |
| `/deep-evolve "goal"` | 특정 목표로 시작 |

### 지원 도메인

| 도메인 | 예시 메트릭 | 평가 모드 |
|--------|------------|-----------|
| ML / 훈련 | val_bpb, loss, accuracy | CLI |
| 퀀트 금융 | Sharpe ratio, max drawdown | CLI |
| 테스트 커버리지 | 통과율, 시나리오 커버리지 | CLI |
| 코드 품질 | 패턴 준수율, 린트 점수 | CLI |
| 게임 엔진 | 리플레이 정확도, 프레임 타임 | Protocol (MCP) |
| GUI 앱 | UI 상태 일치율, 접근성 | Protocol |
| 외부 시스템 | API 정확도, 파이프라인 성공률 | Protocol |

[전체 문서 →](https://github.com/Sungmin-Cho/claude-deep-evolve)

---

## deep-review

**독립 Evaluator** — AI 코딩 에이전트의 작업을 독립된 Opus 서브에이전트로 리뷰합니다. Codex 플러그인이 설치되어 있으면 3-way 교차 모델 검증을 실행합니다.

### 영감

Anthropic의 [Harness Design](https://www.anthropic.com/engineering/harness-design-long-running-apps)에서 영감 — Generator-Evaluator 분리로 자기 승인 편향을 구조적으로 제거합니다.

### 리뷰 파이프라인

```
수집 → 계약 검증 → 심층 리뷰 → 판정
                    ├─ Claude Opus (항상)
                    ├─ codex:review (설치 시)
                    └─ codex:adversarial-review (설치 시)
```

### 주요 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/deep-review` | 독립 Opus 에이전트로 현재 변경사항 리뷰 |
| `/deep-review --contract` | Sprint Contract 기반 검증 |
| `/deep-review --entropy` | 엔트로피 스캔 (코드 드리프트, 패턴 불일치) |
| `/deep-review init` | 프로젝트별 리뷰 규칙 초기화 |

### 핵심 기능

- **독립 평가자** — Generator 컨텍스트를 공유하지 않는 별도 Opus 서브에이전트
- **교차 모델 검증** — Codex 설치 시 3-way 병렬 리뷰
- **Sprint Contract** — 구조화된 성공 기준 검증
- **환경 적응** — git/non-git, Codex 유무에 관계없이 동작

[전체 문서 →](https://github.com/Sungmin-Cho/claude-deep-review)

---

## deep-docs

**문서 가드닝 에이전트** — CLAUDE.md, AGENTS.md 등 에이전트 지침 문서의 신선도를 검증하고 자동 정비합니다.

### 영감

OpenAI의 [Harness Engineering](https://openai.com/index/harness-engineering/)에서 영감 — "doc-gardening 에이전트가 반복 실행되어 오래된 문서를 찾아 수정 PR을 연다."

### 주요 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/deep-docs scan` | 오래된 참조, 이동된 경로, 만료된 예시 탐지 |
| `/deep-docs garden` | 사용자 확인 후 자동 수정 |
| `/deep-docs audit` | 문서 건강 상태 정량 리포트 |

### 핵심 기능

- **경로 범위 신선도** — 참조된 코드 경로가 문서 수정 이후 변경되었는지 확인
- **auto-fix / audit-only 분리** — 기계적 수정만 자동, 주관적 검사는 리포트만
- **지속 가능한 스캔 아티팩트** — `.deep-docs/last-scan.json` (HEAD SHA, branch 포함)
- **정량 점수** — 크기, 신선도, 참조 정확도, 중복도

[전체 문서 →](https://github.com/Sungmin-Cho/claude-deep-docs)

---

## deep-dashboard

**크로스 플러그인 하네스 진단** — 코드베이스의 하네스 가능성을 평가하고, deep-work, deep-review, deep-docs의 센서 결과를 통합 뷰로 제공합니다.

### 영감

Böckeler/Fowler의 [Harness Engineering](https://martinfowler.com/articles/harness-engineering.html) 프레임워크 기반 — 대시보드가 전체 deep-suite 생태계의 하네스 효과성을 측정하여 피드백 루프를 닫습니다.

### 주요 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/deep-harnessability` | 코드베이스 하네스 가능성 평가 — 6차원, 0-10 점수 + 추천 |
| `/deep-harness-dashboard` | 통합 뷰 — 건강, 피트니스, 세션, 효과성, 제안 액션 |

### Harnessability 차원

| 차원 | 가중치 | 측정 대상 |
|------|--------|-----------|
| Type Safety | 25% | tsconfig strict, mypy strict, 타입 힌트 |
| Module Boundaries | 20% | dep-cruiser 설정, 정리된 src, 엔트리 포인트 |
| Test Infrastructure | 20% | 테스트 프레임워크, 테스트 파일, 커버리지 설정 |
| Sensor Readiness | 15% | linter, 타입 체커, lock 파일 |
| Linter & Formatter | 10% | eslint/ruff 설정, prettier/biome |
| CI/CD | 10% | CI 설정, CI에서 테스트 실행 |

### 대시보드 기능

- **건강 상태** — 드리프트 센서 결과 (dead-export, stale-config, dep-vuln, coverage-trend)
- **피트니스 규칙** — 아키텍처 피트니스 함수 pass/fail
- **세션 품질** — 최근 3세션 평균
- **효과성 점수** — 가중 집계 (0-10), not_applicable 재배분
- **액션 라우팅** — 발견 사항별 다음 행동 제안
- **마크다운 내보내기** — 사용자 승인 시 리포트 파일 생성

[전체 문서 →](https://github.com/Sungmin-Cho/claude-deep-dashboard)

---

## 라이선스

MIT
