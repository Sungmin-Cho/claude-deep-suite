[English](./integrated-workflow-guide.md)

# Deep Suite 통합 워크플로우 가이드

이 가이드는 deep-suite의 6개 플러그인이 실제 프로젝트에서 **어떻게 함께 동작하는지** 설명한다. 개별 플러그인의 기능 목록이 아니라, 개발자 관점에서의 **통합 사용 흐름**에 초점을 맞춘다.

---

## 한눈에 보는 플러그인 역할

```
개발 라이프사이클:

  기획        →      구현        →      검증        →      유지
  ─────────────────────────────────────────────────────────────
  deep-work         deep-work         deep-review       deep-docs
  (Research          (Implement        (독립 리뷰)        (문서 정비)
   + Plan)            + Test)
                    deep-evolve       deep-dashboard
                    (자율 최적화)      (하네스 진단)
                                      deep-wiki
                                      (지식 축적)
```

| 플러그인 | 핵심 질문 | 언제 쓰나 |
|---------|----------|----------|
| **deep-work** | "이걸 어떻게 설계하고 구현하지?" | 모든 코드 작업 — 기능, 버그, 리팩토링 |
| **deep-evolve** | "자동으로 더 좋게 만들 수 있나?" | 성능 최적화, 테스트 개선, 코드 품질 |
| **deep-review** | "이 코드가 정말 괜찮은가?" | PR 전 독립 검증 |
| **deep-docs** | "문서가 코드와 맞는가?" | 변경 후 문서 동기화 |
| **deep-wiki** | "배운 것을 어떻게 남기지?" | 세션 간 지식 축적 |
| **deep-dashboard** | "하네스가 잘 동작하는가?" | 프로젝트 건강도 진단, 개선 영역 파악 |

---

## 시나리오 1: 새 기능 개발 (전체 흐름)

### 예시: "Express API에 JWT 인증 미들웨어 추가"

#### Phase 1: deep-work로 분석 & 계획

```bash
/deep-work "JWT 기반 사용자 인증 미들웨어 추가"
```

deep-work가 자동으로 5-phase 워크플로우를 시작한다:

1. **Brainstorm** (선택적) — 왜 JWT인가? session vs JWT 트레이드오프. 사용자와 대화하며 요구사항 정리
2. **Research** — 코드베이스 심층 분석. 기존 미들웨어 패턴, 라우팅 구조, 테스트 인프라, 의존성 파악
3. **Plan** — 구현 계획서 작성. 파일별 변경 사항, 테스트 전략, 순서 정의. 사용자 승인 필요

이 단계에서 크로스 플러그인 데이터가 자동으로 활용된다:
- **harnessability-report.json**이 있으면 Research에서 "Type Safety 3.2/10 → tsconfig strict 모드 고려" 같은 컨텍스트 제공
- **evolve-insights.json**이 있으면 "guard clause 패턴이 이전 프로젝트에서 효과적이었음" 같은 인사이트 참조

#### Phase 2: deep-work로 구현

Plan 승인 후 자동으로 Implement 페이즈 진입:

4. **Implement** — TDD 기반 슬라이스별 구현. RED(실패 테스트) → GREEN(최소 구현) → REFACTOR 사이클 강제
5. **Test** — 전체 검증. 커버리지, 타입 체크, 린트 실행

```
슬라이스 1: auth middleware 뼈대
  → 테스트 작성 → 테스트 실패 확인 → 구현 → 테스트 통과 → 커밋

슬라이스 2: JWT 검증 로직
  → 테스트 작성 → ... → 커밋

슬라이스 3: 라우트 보호
  → 테스트 작성 → ... → 커밋
```

#### Phase 3: deep-review로 검증

구현 완료 후 PR 전에:

```bash
/deep-review
```

deep-review가 독립 에이전트로 코드를 검증한다:
- **Stage 1**: git 상태 감지 (clean/staged/unstaged)
- **Stage 2**: 프로젝트 규칙(rules.yaml) 로드
- **Stage 3**: Opus 서브에이전트가 전체 diff를 리뷰 (선택적으로 Codex 3-way 교차 검증)
- **Stage 4**: APPROVE / CONCERN / REQUEST_CHANGES 판정

deep-review는 자동으로 **recurring findings도 추출**한다 (v1.2.0):
- Stage 5.5에서 이전 리포트들을 분석하여 반복 패턴을 `recurring-findings.json`에 기록
- 다음 deep-evolve 세션에서 이 패턴이 실험 방향에 반영됨

#### Phase 4: deep-docs로 문서 정비

```bash
/deep-docs scan
```

CLAUDE.md, README, API 문서 등을 스캔하여 코드와의 괴리를 탐지. 자동 수정 가능한 항목은 `/deep-docs garden`으로 정비.

#### Phase 5: deep-wiki로 지식 축적

```bash
/wiki-ingest .deep-work/report.md
```

deep-work 세션 리포트를 위키에 축적. JWT 인증 구현에서 배운 패턴, 결정 이유, 트레이드오프를 영구 보존.

---

## 시나리오 2: 성능 최적화 (deep-evolve 중심)

### 예시: "ML 모델의 val_bpb를 자동으로 최적화"

#### Step 1: deep-evolve 세션 시작

```bash
/deep-evolve
```

deep-evolve가 프로젝트를 분석하고 평가 harness를 생성한다:

1. **프로젝트 분석** (5단계): 언어, 프레임워크, 테스트 인프라, 메트릭 감지
2. **목표 설정**: "val_bpb minimize" — 사용자와 확인
3. **Scaffolding**: `prepare.py` (평가 harness) + `program.md` (실험 지침) + `strategy.yaml` (전략 파라미터) 자동 생성

크로스 플러그인 데이터가 자동으로 활용된다:
- `recurring-findings.json`이 있으면 → Stage 3.5에서 읽어 prepare.py 시나리오 가중치 조정, program.md에 "알려진 반복 결함" 섹션 포함
- meta-archive에서 유사 프로젝트가 있으면 → 검증된 strategy.yaml 초기값으로 전이

#### Step 2: 자율 실험 루프

사용자가 자리를 비워도 에이전트가 자율적으로 실험을 반복한다:

```
Inner Loop (코드 진화):
  아이디어 앙상블(3개 후보 → 1개 선택) → 코드 수정 → 커밋 → 평가
  → score 향상? keep : git reset → 반복 (20회)

Outer Loop (전략 진화):
  Inner Loop 20회 완료 → Meta Analysis → strategy.yaml 조정
  → Q(v) 계산 → 전략 개선? keep : 이전 전략으로 복원
  → 정체? 전략 아카이브에서 분기 → 더 정체? prepare.py 확장
```

#### Step 3: 완료 & 크로스 플러그인 연동

실험 완료 시:

1. **evolve-receipt.json** 자동 생성 → deep-dashboard가 수집
2. **evolve-insights.json** 자동 생성 → 다음 deep-work 세션의 Research에서 참조
3. **6개 옵션 제시**:
   - "deep-review 실행 후 merge" — 코드 변경을 독립 검증 후 자동 merge
   - "deep-review 실행 후 PR 생성" — 독립 검증 후 PR
   - "main에 merge" / "PR 생성" / "branch 유지" / "폐기"

---

## 시나리오 3: 프로젝트 건강도 진단

### 예시: "프로젝트가 전반적으로 어떤 상태인지 파악하고 싶다"

#### Step 1: Harnessability 진단

```bash
/deep-harnessability
```

프로젝트의 6개 차원을 자동 분석:
- Type Safety, Test Infrastructure, CI/CD, Linting, Documentation, Architecture
- 각 차원 0-10점, 17개 계산적 detector가 자동 측정
- 결과는 `.deep-dashboard/harnessability-report.json`에 저장

#### Step 2: 통합 Dashboard

```bash
/deep-harness-dashboard
```

모든 플러그인의 데이터를 통합하여 효과성 점수를 산출:

```
+------------------------------------------------------+
|  Deep-Suite Harness Dashboard                        |
+------------------------------------------------------+
|  Topology: nextjs-app  Harnessability: 7.4/10 Good   |
+------------------------------------------------------+
|  Health Status                                       |
|  dead-export        clean                            |
|  dependency-vuln    ! 2 critical (npm audit)         |
+------------------------------------------------------+
|  Evolve                                              |
|  Experiments   80 (keep: 25%, crash: 6%)             |
|  Quality       78/100                                |
+------------------------------------------------------+
|  Effectiveness: 7.1/10                               |
+------------------------------------------------------+
|  Suggested actions                                   |
|  - npm audit fix (2 critical vulnerabilities)        |
|  - Review strategy.yaml - Q(v) declining             |
+------------------------------------------------------+
```

**5개 차원의 가중 합산**: health(0.25) + fitness(0.20) + session(0.20) + harnessability(0.15) + evolve(0.20)

#### Step 3: 조치 실행

Dashboard가 제안한 action을 따라 다른 플러그인을 실행:
- "npm audit fix" → 직접 실행
- "Run /deep-evolve with meta analysis" → `/deep-evolve` 실행
- "Add tests in next deep-work session" → `/deep-work "테스트 보강"`

---

## 시나리오 4: 지식 축적 & 재활용

### 예시: "기술 문서, 세션 결과, 외부 리소스를 영구 보존하고 싶다"

#### 외부 지식 축적

```bash
# URL에서 지식 추출
/wiki-ingest https://martinfowler.com/articles/harness-engineering.html

# 파일에서 지식 추출
/wiki-ingest docs/architecture-decision.md

# deep-work 세션 결과를 자동 축적
/wiki-ingest .deep-work/report.md
```

위키는 소스별로 페이지를 생성/업데이트하고, **같은 주제의 지식이 축적될수록 페이지가 풍부해진다** (accumulation principle).

#### 지식 검색 & 활용

```bash
# 위키에서 답을 찾기
/wiki-query "JWT 인증에서 refresh token rotation의 장단점은?"
```

위키에 축적된 지식을 기반으로 답변을 생성. 2개 이상의 페이지에서 교차 인사이트가 발생하면 자동으로 synthesis 페이지를 생성하여 위키에 다시 축적.

#### 위키 건강 관리

```bash
/wiki-lint
```

모순, 깨진 링크, 오래된 콘텐츠, 고아 페이지를 감지.

---

## 크로스 플러그인 데이터 흐름 (v2.1.0)

```
deep-work ──── receipts ────────→ deep-dashboard (수집)
deep-docs ──── last-scan.json ──→ deep-dashboard (수집)
deep-evolve ── evolve-receipt ──→ deep-dashboard (수집)

deep-review ── recurring-findings → deep-evolve (실험 방향 조향)
deep-evolve ── evolve-insights ──→ deep-work (research context)
deep-evolve ── review 트리거 ────→ deep-review (merge 전 검증)
deep-dashboard ─ harnessability ─→ deep-work (research context)
```

각 플러그인은 **독립적으로 동작**하면서, JSON 파일을 통해 서로의 결과를 소비한다. 플러그인이 설치되어 있지 않아도 다른 플러그인이 오류 없이 동작한다 (graceful degradation).

---

## 복잡도별 사용 가이드

### 간단한 버그 수정 (~30분)

```bash
/deep-work "로그인 500 에러 수정"
# → Research → Plan → Implement (TDD) → Test
# → /deep-review (선택적)
# → 커밋 & 머지
```

deep-work 하나로 충분. deep-review는 PR이 중요할 때만.

### 중간 규모 기능 (2-4시간)

```bash
/deep-work "Stripe 결제 연동 추가"
# → 5-phase 전체 (Brainstorm → ... → Test)
# → /deep-review (권장)
# → /deep-docs scan (문서 동기화)
# → /wiki-ingest (세션 결과 축적)
```

deep-work + deep-review + deep-docs. 세션 결과를 위키에 남기면 다음에 유사 작업 시 참조 가능.

### 대규모 최적화 (반나절+)

```bash
# 1. 현재 상태 진단
/deep-harness-dashboard

# 2. 자율 최적화
/deep-evolve "테스트 커버리지 90% 달성"
# → 에이전트가 자율적으로 수십 회 실험

# 3. 결과 검증
# → deep-evolve 완료 시 "deep-review 실행 후 merge" 선택

# 4. 지식 축적
/wiki-ingest .deep-evolve/report.md
```

전체 플러그인 스택 활용. dashboard로 진단 → evolve로 자율 개선 → review로 검증 → wiki로 축적.

---

## 사용자 팁

1. **항상 deep-work부터 시작하라** — "간단한" 작업도 plan 없는 구현은 대부분 리팩토링을 요구한다.

2. **deep-review는 PR 전에 실행하라** — 독립 에이전트가 신선한 시선으로 평가한다. Codex 3-way 교차 검증을 활성화하면 더 강력하다.

3. **deep-evolve는 명확한 메트릭이 있을 때 쓴다** — "코드를 더 좋게 만들어줘"는 너무 모호하다. "val_bpb 최소화", "테스트 통과율 100%" 같이 측정 가능한 목표를 주어야 한다.

4. **deep-dashboard는 정기적으로 실행하라** — 주 1회 정도 실행하면 프로젝트 건강도를 추적할 수 있다.

5. **deep-wiki에 모든 것을 남겨라** — 오늘의 삽질이 내일의 자산이다. 위키는 구조화된 지식이므로 RAG보다 정확하다.
