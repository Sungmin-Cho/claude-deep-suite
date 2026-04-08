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
  │   └─ YES → git 상태 분류
  │       │
  │       ├─ 커밋 0건 (초기 리포) → Claude Opus 단독 리뷰 (파일 기반)
  │       │
  │       ├─ 커밋 있음 + 변경 없음 → 최근 커밋 기준 리뷰
  │       │
  │       ├─ 커밋 있음 + 변경 있음 (staged/unstaged/mixed/untracked-only)
  │       │   └─ "WIP 커밋을 생성할까요?" (사용자 확인)
  │       │       ├─ 수락 → WIP 커밋 후 Codex 교차 검증 가능
  │       │       └─ 거부 → Claude Opus 리뷰 (diff 기반)
  │       │                + Codex도 working tree diff로 가능하면 병렬 실행
  │       │
  │       └─ Codex 설치+인증 확인
  │            ├─ 설치+인증 OK → 3-way 병렬 리뷰
  │            ├─ 설치됨+미인증 → "codex:setup으로 인증이 필요합니다" 알림 + Claude Opus 단독
  │            └─ 미설치 → 1회 알림 + Claude Opus 단독 리뷰
```

**diff 수집 시 제외 대상**: 바이너리 파일, vendor/, node_modules/, 생성된 파일(*.generated.*, *.min.js 등)은 자동 제외하거나 요약만 포함.

**review base 결정**: `HEAD~{N}`이 없거나 shallow clone인 경우, `git merge-base`로 base branch 분기점을 찾거나, 불가능하면 전체 파일 기반 리뷰로 fallback.

어떤 환경이든 최소 Claude Opus 서브에이전트 리뷰는 항상 보장된다.

#### 리뷰 파이프라인 (4단계)

**Stage 1 — Collect**: git diff 수집 (또는 non-git에서 변경 파일 수집), 관련 테스트 파일 식별

**Stage 2 — Contract Check** (Sprint Contract가 있을 때):
- 계약의 각 성공 기준을 검증
- 결과: PASS / FAIL / PARTIAL / SKIP + 근거

```yaml
# .deep-review/contracts/SLICE-001.yaml
slice: SLICE-001
title: "엔티티 삭제 기능"
source_plan: "plan.md#slice-001"  # plan.md 내 원본 위치
created_at: "2026-04-08T10:00:00Z"
criteria:
  - id: C1
    description: "사용자가 엔티티를 클릭하여 선택할 수 있다"
    verification: auto        # auto | manual | mixed
    status: null              # Evaluator가 채움
  - id: C2
    description: "선택 상태에서 Delete 키를 누르면 엔티티가 제거된다"
    verification: auto
    prerequisites: []         # 인증, 테스트 데이터, 피처 플래그 등
    status: null
  - id: C3
    description: "삭제 후 선택 상태가 초기화된다"
    verification: auto
    status: null
  - id: C4
    description: "삭제 작업이 서버에 정상 반영된다"
    verification: manual      # 자동 검증 불가 → Evaluator가 SKIP 처리
    status: null
```

**Contract 스키마 규칙:**
- `verification: auto` — Evaluator가 코드 분석 또는 App QA로 자동 검증
- `verification: manual` — 자동 검증 불가, SKIP 처리하고 리포트에 "수동 확인 필요"로 표시
- `verification: mixed` — 일부 자동, 일부 수동. 자동 가능한 부분만 검증
- `prerequisites` — 인증, 테스트 데이터 시딩, 피처 플래그, 외부 서비스 등 전제 조건 명시
- 슬라이스 ID → 파일명 매핑: `SLICE-{NNN}` → `SLICE-{NNN}.yaml` (1:1)
- 계획 변경 시: plan.md 변경 감지 → 기존 contract와 diff → 사용자에게 "contract 업데이트할까요?" 제안
- 멱등성: 동일 슬라이스에 대해 재실행 시 기존 contract를 업데이트 (새로 생성하지 않음)

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
- 없으면 Sprint Contract 기준에서 **자동화 가능한 criteria만** 여정으로 생성
- `verification: manual` 또는 `prerequisites`가 충족 불가능한 criteria는 SKIP
- 여정 파일도 contract도 없으면 자동 탐색 모드 (발견한 페이지/요소 기반 기본 테스트)

```yaml
# .deep-review/journeys/create-entity.yaml
name: "엔티티 생성 및 삭제"
source_contract: "SLICE-001"  # 어느 contract에서 생성되었는지
steps:
  - navigate: "/editor"
  - click: "[data-testid='add-entity']"
  - assert: "새 엔티티가 캔버스에 나타남"
  - click: "생성된 엔티티"
  - press: "Delete"
  - assert: "엔티티가 캔버스에서 제거됨"
skipped_criteria:
  - id: C4
    reason: "서버 반영 확인은 수동 검증 필요 (verification: manual)"
```

**Journey 자동 생성의 한계**: Contract에서 journey를 자동 생성하는 것은 UI 중심의 happy-path에 한정된다. 다음 경우는 자동 생성하지 않고 리포트에서 "수동 확인 필요"로 명시:
- 인증/세션이 필요한 흐름 (prerequisites에 auth가 있는 경우)
- 테스트 데이터 시딩이 필요한 경우
- 피처 플래그에 의존하는 기능
- 외부 서비스/API 의존성
- 백엔드 전용 로직 (UI 진입점이 없는 경우)

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

| deep-work Phase | deep-review 동작 | 트리거 |
|---|---|---|
| Phase 2 (Plan) | Sprint Contract 자동 생성 — plan.md 슬라이스별 criteria를 .deep-review/contracts/에 추출 | plan.md 파일 생성/변경 감지 |
| Phase 3 (Implement) | 슬라이스 완료 시 Mode 1 자동 호출 | deep-work의 TDD 상태 머신이 GREEN 도달 시 |
| Phase 4 (Test) | 전체 리포트 + (설정 시) Mode 2 App QA | Phase 4 진입 시 |

**"슬라이스 완료" 감지 방법**: deep-work의 phase-guard-core.js TDD 상태 머신에서 슬라이스가 `GREEN` 또는 `REFACTOR` 완료 상태에 도달하면 deep-review를 트리거. 구체적으로 PostToolUse hook에서 상태 전이를 감지.

**Contract 추출 파서**: plan.md에서 `### SLICE-{NNN}` 헤딩 아래의 bullet list를 criteria로 추출. 매핑 규칙:
- plan.md의 `### SLICE-001: 엔티티 삭제 기능` → `.deep-review/contracts/SLICE-001.yaml`
- bullet 항목 (`- 사용자가...`) → criteria 배열의 각 항목
- `verification` 기본값: `auto`. 수동 확인 키워드("수동", "manual", "확인 필요") 감지 시 `manual`로 설정

**계획 변경 처리**: plan.md가 수정되면 기존 contracts와 diff하여:
- 새 슬라이스 추가 → 새 contract 생성
- 기존 슬라이스 criteria 변경 → "contract 업데이트할까요?" 제안
- 슬라이스 삭제 → contract 아카이브 (삭제하지 않음, status를 `archived`로)

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

코드와 문서 간 괴리를 탐지. **auto-fix 가능 항목**과 **audit-only 항목**을 명확히 구분:

**Auto-fix 가능 (garden에서 자동 수정):**
1. **죽은 참조**: 문서에서 참조하는 파일/함수/클래스가 코드에 존재하지 않음
2. **이동/리네임된 경로**: 문서의 경로가 실제와 다름 (git log로 이동 추적)
3. **오래된 예시/명령어**: 문서의 코드 예시나 CLI 명령어가 실제와 불일치
4. **중복 지침 블록**: 여러 문서에 동일한 내용이 반복됨
5. **크기/구성 가이드**: 파일이 과도하게 큰 경우 분리 제안

**Audit-only (리포트에만 표시, 자동 수정 안 함):**
6. **규칙-코드 모순 추론**: 문서의 규칙이 실제 코드 패턴과 모순 (false positive 가능성 높음)
7. **커버리지 갭 추론**: 주요 모듈이 문서에 없음 (아키텍처 추론 필요)
8. **맵 vs 매뉴얼 판단**: 직접 지침 vs 외부 포인터 비율 평가

출력:
```markdown
# Document Health Report

## CLAUDE.md
- 🔴 죽은 참조 3건: `src/auth/middleware.ts` (삭제됨), ... [auto-fix 가능]
- 🟡 경로 이동: "src/utils/" → 실제 "src/shared/" [auto-fix 가능]
- ℹ️ 규칙 모순 의심: snake_case 규칙이나 코드 72%가 camelCase [audit-only]
- ℹ️ 커버리지 갭: src/payments/ 모듈 미문서화 [audit-only]

## Score: 6/10 (정비 권장)
## Auto-fixable: 4건 | Audit-only: 2건
```

### /deep-docs garden

scan 결과 중 **auto-fix 가능 항목만** 자동 수정:

1. 죽은 참조 → 현재 경로/이름으로 업데이트
2. 이동/리네임된 경로 → 실제 경로로 업데이트
3. 오래된 예시/명령어 → 현재 코드 기반으로 업데이트
4. 중복 지침 → 대표 위치 하나로 통합, 나머지는 포인터로 변환
5. 비대한 파일 → 분리 제안 (자동 분리는 아님, 제안만)
6. 모든 수정은 **diff로 사용자에게 보여주고 확인 후 적용**
7. audit-only 항목은 garden에서 수정하지 않음 — 리포트에서 참고용으로만 표시

### /deep-docs audit

문서 품질을 정량 평가:

| 지표 | 측정 | 기준 |
|------|------|------|
| 파일 크기 | 라인 수 | CLAUDE.md ~100줄 권장 (OpenAI의 AGENTS.md 기준) |
| 신선도 | **문서가 설명하는 경로/모듈**의 코드 변경 vs 문서 수정일 비교 (path-scoped) | 해당 영역 코드가 변경된 후 문서가 미수정이면 경고 |
| 참조 정확도 | 죽은 참조 비율 | 0% 목표 |
| 중복도 | 여러 문서 간 중복 내용 | 중복 시 통합 제안 |
| 맵 vs 매뉴얼 | 직접 지침 vs 외부 포인터 비율 | 포인터 비율 높을수록 양호 (audit-only) |

**신선도 측정 방법**: 문서 내에서 참조하는 파일 경로들을 추출 → 해당 경로들의 `git log --since` 확인 → 문서 수정일 이후에 코드 변경이 있으면 "stale" 판정. 단순 "30일 미수정"이 아니라 **실제로 관련 코드가 변경되었는지**를 기준으로 판단.

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
  │   └─ Sprint Contract 소비 로직 포함 (contracts/ 디렉토리 읽기)
  ├─ deep-docs v1.0 — scan + garden + audit
  └─ deep-work W1 — Sprint Contract 생성 (plan.md → contracts/ 추출)
      ※ deep-review가 contract을 소비하려면 deep-work가 생성해야 하므로
        W1은 1순위에 포함. 단, deep-review는 contract 없이도 독립 동작.

2순위 (1순위 완료 후):
  ├─ deep-review v1.1 — Mode 2 (App QA)
  ├─ deep-work W2 — Phase 3/4에서 deep-review 자동 호출 hook
  └─ deep-wiki K1, K2 — 자동 ingest + 리뷰 축적

3순위:
  └─ deep-evolve E1 — deep-review 평가 하네스 활용
```

### 보류

- **deep-guard** (아키텍처 린터): deep-review의 rules.yaml + 엔트로피 탐지가 충분히 커버하는지 확인 후 판단
