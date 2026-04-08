# Harness Engineering Plugins Design Spec

## 배경

Anthropic의 "Harness Design for Long-Running Application Development"와 OpenAI의 "Harness Engineering: Leveraging Codex in an Agent-First World"에서 추출한 인사이트를 deep-suite 플러그인에 적용한다.

핵심 인사이트:
- **Generator-Evaluator 분리** (Anthropic): 모델은 자기 작업을 객관적으로 평가하지 못한다. 독립된 Evaluator가 필수.
- **에이전트 가독성 환경** (OpenAI): 에이전트가 접근할 수 없는 것은 존재하지 않는 것. 리포지터리가 기록 시스템이어야 한다.
- **기계적 강제** (OpenAI): 문서화만으로는 불충분. 규칙을 코드로 승격하여 자동 적용.
- **조합 가능한 독립 플러그인**: 사용자가 자신의 harness에 필요한 것만 골라 쓰는 구조.

## 설계 원칙

1. **각 플러그인은 독립 사용 가능** — 다른 플러그인 없이도 단독 동작
2. **함께 쓰면 시너지** — 플러그인 감지 후 자동 연동 (의존성 아님)
3. **사용자 선택 존중** — 설정보다 대화, 강제보다 제안
4. **최상 모델로 평가** — Evaluator는 Generator보다 높은 판단력 필요

---

## 1. deep-review (신규 플러그인)

### 정체성

- **이름**: deep-review
- **설명**: AI 코딩 에이전트의 작업을 독립적으로 평가하는 Evaluator 플러그인
- **카테고리**: Productivity
- **경로**: ~/dev/deep-review/

### 커맨드

```
/deep-review              — 현재 변경사항을 독립 에이전트로 리뷰
/deep-review --contract   — Sprint Contract 기반 리뷰 (성공 기준 대비 검증)
/deep-review --qa         — App QA 모드 (앱 부팅 + 브라우저 테스트)
/deep-review --entropy    — 엔트로피 스캔 (코드 드리프트, 패턴 불일치 탐지)
/deep-review init         — 프로젝트별 리뷰 규칙 초기화 (.deep-review/)
```

### 출력 구조

```
.deep-review/
├── config.yaml           — 리뷰 설정 (모드, 규칙, 이전 답변 기억 등)
├── rules.yaml            — 아키텍처/취향 규칙 (사용자 정의)
├── contracts/            — Sprint Contract 파일들
│   └── SPRINT-001.yaml   — 성공 기준, 검증 방법, 결과
├── reports/              — 리뷰 리포트
│   └── 2026-04-08-review.md
└── entropy-log.jsonl     — 엔트로피 탐지 이력
```

### Mode 1: Code Review (모든 프로젝트)

#### 환경별 분기

```
deep-review 실행
  │
  ├─ git 리포지터리인가?
  │   │
  │   ├─ NO → Claude Opus 서브에이전트 단독 리뷰 (파일 기반)
  │   │
  │   └─ YES → 커밋된 상태인가?
  │       │
  │       ├─ NO → "WIP 커밋을 생성할까요?" (사용자 확인)
  │       │    ├─ 수락 → WIP 커밋 후 진행
  │       │    └─ 거부 → Claude Opus 서브에이전트 단독 리뷰 (unstaged diff 기반)
  │       │
  │       └─ YES → Codex 설치+인증 확인
  │            ├─ OK → 3-way 병렬 리뷰
  │            └─ 미설치 → 1회 알림 + Claude Opus 서브에이전트 단독 리뷰
```

어떤 환경이든 최소 Claude Opus 서브에이전트 리뷰는 항상 보장된다.

#### 리뷰 파이프라인 (4단계)

**Stage 1 — Collect**: git diff 수집 (또는 non-git에서 변경 파일 수집), 관련 테스트 파일 식별

**Stage 2 — Contract Check** (Sprint Contract가 있을 때):
- 계약의 각 성공 기준을 검증
- 결과: PASS / FAIL / PARTIAL + 근거

```yaml
# .deep-review/contracts/SPRINT-001.yaml
slice: SLICE-001
title: "엔티티 삭제 기능"
criteria:
  - description: "사용자가 엔티티를 클릭하여 선택할 수 있다"
    verification: auto
    status: null  # Evaluator가 채움
  - description: "선택 상태에서 Delete 키를 누르면 엔티티가 제거된다"
    verification: auto
    status: null
```

**Stage 3 — Deep Review**: 교차 검증 구조

```
3-way 병렬 리뷰 (git + Codex 환경):
  ├─ Claude Opus 서브에이전트: 5가지 관점 구조적 리뷰
  ├─ codex:review --background --base HEAD~{N}
  └─ codex:adversarial-review --background --base HEAD~{N}
      "{rules.yaml + contract에서 추출한 포커스 텍스트}"

fallback (non-git 또는 Codex 미설치):
  └─ Claude Opus 서브에이전트 단독 리뷰
```

Claude Opus 서브에이전트의 5가지 리뷰 관점:

| 관점 | 검사 내용 |
|------|-----------|
| 정확성 | 로직 버그, 엣지 케이스, 에러 핸들링 누락 |
| 아키텍처 정합성 | rules.yaml 위반, 레이어 경계 침범, 종속성 방향 |
| 엔트로피 | 중복 코드, 기존 패턴과의 불일치, ad-hoc 헬퍼 생성 |
| 테스트 충분성 | 변경 대비 테스트 커버리지, 누락된 테스트 시나리오 |
| 가독성 | 에이전트가 다음에 이 코드를 읽을 때 이해할 수 있는가 |

**Stage 4 — Verdict**: 교차 검증 합성

```
전원 일치 지적 → 높은 확신 (🔴)
2/3 지적       → 중간 확신 (🟡)
단독 지적      → 낮은 확신 (참고)
전원 통과      → 안전 (🟢)
```

최종 판정:
- **APPROVE** — 문제 없음, 병합 가능
- **REQUEST_CHANGES** — 구체적 수정 사항 목록 (Codex 있으면 codex:rescue 위임 제안)
- **CONCERN** — 판단 필요 사항을 사람에게 에스컬레이션

#### 모델 설정

```yaml
# .deep-review/config.yaml
review_model: opus    # 기본값: opus (최상 모델)
# review_model: sonnet  # 비용 절감 시 사용자가 변경 가능
```

#### rules.yaml 예시

```yaml
# .deep-review/rules.yaml
architecture:
  layers: [types, config, repo, service, runtime, ui]
  direction: top-down
  cross_cutting: [auth, telemetry, providers]

style:
  max_file_lines: 300
  naming: kebab-case
  logging: structured

entropy:
  prefer_shared_utils: true
  max_similar_blocks: 3
  validate_at_boundaries: true
```

사용자가 rules.yaml을 정의하지 않으면 범용 기본값으로 동작하고, 점진적으로 규칙 추가.

### Mode 2: App QA (웹앱 프로젝트, 선택적)

#### 진입 흐름 — 항상 사용자에게 질문

```
Mode 2 트리거
  │
  ├─ 1. 프로젝트 자동 탐색
  │   └─ package.json, Makefile 등에서 앱 실행 명령 후보 추출
  │
  ├─ 2. 질문: "앱을 어떻게 실행하나요?"
  │   ├─ (A) npm run dev (감지된 후보)
  │   ├─ (B) 직접 입력
  │   └─ (C) 이미 실행 중 — URL만 알려주기
  │   (이전 답변이 있으면 기본값으로 제시)
  │
  ├─ 3. 질문: "어떤 기능을 테스트할까요?"
  │   ├─ (A) Sprint Contract 기준 전체 (deep-work 연동 시)
  │   ├─ (B) 이번 변경사항 관련 기능만
  │   └─ (C) 직접 설명
  │
  ├─ 4. QA 실행
  └─ 5. Report
```

#### QA 파이프라인

**Stage 1 — Boot**: 앱 프로세스 백그라운드 시작, 부팅 완료 대기

**Stage 2 — Discover**: base_url에서 페이지 구조 탐색, 인터랙션 요소 식별

**Stage 3 — Journey Test**: 사용자 여정 실행
- 사전 정의된 여정 파일이 있으면 사용
- 없으면 Sprint Contract 기준에서 자동 생성
- 여정 파일도 contract도 없으면 자동 탐색 모드

```yaml
# .deep-review/journeys/create-entity.yaml
name: "엔티티 생성 및 삭제"
steps:
  - navigate: "/editor"
  - click: "[data-testid='add-entity']"
  - assert: "새 엔티티가 캔버스에 나타남"
  - click: "생성된 엔티티"
  - press: "Delete"
  - assert: "엔티티가 캔버스에서 제거됨"
```

**Stage 4 — Observe**: 테스트 중 신호 수집

| 신호 | 수집 방법 | 판단 기준 |
|------|-----------|-----------|
| 콘솔 에러 | CDP console.error | 0건이어야 PASS |
| 네트워크 실패 | CDP 네트워크 모니터링 | 4xx/5xx 0건 |
| 스크린샷 | 각 단계별 캡처 | 리포트에 첨부 |
| 성능 | 페이지 로드 시간 | 설정 임계값 이내 |
| 접근성 | 기본 a11y 검사 | 경고 레벨 |

**Stage 5 — Report**: Mode 1 리포트에 App QA 섹션 추가

#### 브라우저 도구 선택 (자동 감지)

```
1순위: Playwright MCP (plugin:playwright 설치 시)
2순위: claude-in-chrome MCP (설치 시)
3순위: 없음 → Mode 2 비활성, 사용자에게 알림
```

### deep-work 연동 (deep-work 설치 시 자동)

| deep-work Phase | deep-review 동작 |
|---|---|
| Phase 2 (Plan) | Sprint Contract 자동 생성 — plan.md 슬라이스별 criteria를 .deep-review/contracts/에 추출 |
| Phase 3 (Implement) | 슬라이스 완료 시 Mode 1 자동 호출 |
| Phase 4 (Test) | 전체 리포트 + (설정 시) Mode 2 App QA |

연동은 deep-work의 hook이 deep-review 존재를 감지하는 방식. deep-review에는 deep-work 의존성 없음.

---

## 2. deep-docs (신규 플러그인)

### 정체성

- **이름**: deep-docs
- **설명**: CLAUDE.md/AGENTS.md 등 에이전트 지침 문서의 신선도를 검증하고 자동 정비하는 가드닝 에이전트
- **카테고리**: Productivity
- **경로**: ~/dev/deep-docs/

### 근거

OpenAI: "doc-gardening 에이전트가 반복 실행되어 오래된 문서를 찾아 수정 PR을 연다"
OpenAI: "지침이 너무 많으면 지침이 되지 않음. 순식간에 망가짐."

### 커맨드

```
/deep-docs scan     — 문서 신선도 스캔
/deep-docs garden   — 자동 정비 (사용자 확인 후 수정)
/deep-docs audit    — 문서 품질 리포트
```

### /deep-docs scan

코드와 문서 간 괴리를 탐지:

1. **죽은 참조 탐지**: 문서에서 참조하는 파일, 함수, 클래스가 코드에 존재하는지 검증
2. **구조 불일치**: 문서가 설명하는 디렉토리 구조 vs 실제 구조
3. **오래된 규칙**: 문서의 규칙이 실제 코드 패턴과 모순되는지 (예: "snake_case 사용" 규칙인데 코드는 camelCase)
4. **커버리지 갭**: 코드에 존재하지만 문서에 없는 주요 모듈/패턴

출력:
```markdown
# Document Health Report

## CLAUDE.md
- 🔴 죽은 참조 3건: `src/auth/middleware.ts` (삭제됨), ...
- 🟡 구조 불일치: "src/utils/" 섹션 — 실제로는 "src/shared/"로 리네임됨
- 🟢 규칙 정합성: 양호

## Score: 6/10 (정비 권장)
```

### /deep-docs garden

scan 결과를 기반으로 자동 수정:

1. 죽은 참조 → 현재 경로/이름으로 업데이트
2. 구조 불일치 → 실제 구조 반영
3. 비대한 파일 → "맵 vs 매뉴얼" 원칙 적용, 분리 제안
4. 모든 수정은 **diff로 사용자에게 보여주고 확인 후 적용**

### /deep-docs audit

문서 품질을 정량 평가:

| 지표 | 측정 | 기준 |
|------|------|------|
| 파일 크기 | 라인 수 | CLAUDE.md ~100줄 권장 (OpenAI의 AGENTS.md 기준) |
| 신선도 | 마지막 수정 vs 코드 변경 | 30일 이상 미수정 시 경고 |
| 참조 정확도 | 죽은 참조 비율 | 0% 목표 |
| 중복도 | 여러 문서 간 중복 내용 | 중복 시 통합 제안 |
| 맵 vs 매뉴얼 | 직접 지침 vs 외부 포인터 비율 | 포인터 비율 높을수록 양호 |

### deep-work 연동

Phase 1 (Research) 시작 시 deep-docs가 설치되어 있으면:
- CLAUDE.md 신선도를 빠르게 스캔
- 오래되었으면 경고: "CLAUDE.md가 30일 이상 업데이트되지 않았습니다. /deep-docs garden을 실행하시겠습니까?"

### deep-wiki 연동

deep-wiki가 설치되어 있으면:
- garden 수정 이력을 위키에 자동 기록 제안
- 반복 패턴 (같은 유형의 오류가 계속 발생)을 위키 "문서 관리 원칙" 페이지로 축적

---

## 3. 기존 플러그인 강화

### deep-work

| ID | 항목 | 설명 |
|---|---|---|
| W1 | Sprint Contract 생성 | Phase 2에서 슬라이스별 acceptance criteria를 .deep-review/contracts/로 자동 추출 |
| W2 | deep-review 자동 호출 | Phase 3 슬라이스 완료 시 + Phase 4에서 deep-review 플러그인 감지 후 자동 호출 |

### deep-wiki

| ID | 항목 | 설명 |
|---|---|---|
| K1 | deep-work 산출물 자동 ingest | 세션 완료 시 deep-wiki 설치 감지 → report.md ingest 제안 |
| K2 | 리뷰 결과 축적 | deep-review가 반복 지적하는 패턴을 위키 "팀 규칙" 페이지로 축적 제안 |

### deep-evolve

| ID | 항목 | 설명 |
|---|---|---|
| E1 | deep-review 평가 하네스 활용 | 실험 루프의 최종 검증 시 deep-review를 정성 평가로 호출 (매 실험이 아닌 N회마다 또는 최종) |

---

## 4. 구현 경로

### 디렉토리

```
~/dev/deep-review/     — 신규 생성
~/dev/deep-docs/       — 신규 생성
~/dev/deep-work/       — 기존 (W1, W2 강화)
~/dev/deep-wiki/       — 기존 (K1, K2 강화)
~/dev/deep-evolve/     — 기존 (E1 강화)
```

### 우선순위

```
1순위 (동시 개발):
  ├─ deep-review v1.0 — Mode 1 (Code Review) + Codex 교차 검증
  └─ deep-docs v1.0 — scan + garden + audit

2순위 (1순위 완료 후):
  ├─ deep-review v1.1 — Mode 2 (App QA)
  ├─ deep-work W1, W2 — Sprint Contract + deep-review 연동
  └─ deep-wiki K1, K2 — 자동 ingest + 리뷰 축적

3순위:
  └─ deep-evolve E1 — deep-review 평가 하네스 활용
```

### 보류

- **deep-guard** (아키텍처 린터): deep-review의 rules.yaml + 엔트로피 탐지가 충분히 커버하는지 확인 후 판단
