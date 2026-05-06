[English](./README.md) | **한국어**

# Claude Deep Suite

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) 플러그인 통합 마켓플레이스. 구조화된 개발, 지식 관리, 자율 실험, 독립 코드 리뷰, 문서 가드닝, 하네스 진단을 위한 여섯 가지 플러그인을 하나로 묶어 제공합니다.

## 플러그인

<!-- deep-suite:auto-generated:plugin-table-ko:start -->

| 플러그인 | 버전 | 설명 |
|---|---|---|
| [deep-work](https://github.com/Sungmin-Cho/claude-deep-work) | 6.4.2 | Evidence-Driven Development Protocol |
| [deep-wiki](https://github.com/Sungmin-Cho/claude-deep-wiki) | 1.4.1 | LLM-managed markdown wiki |
| [deep-evolve](https://github.com/Sungmin-Cho/claude-deep-evolve) | 3.1.1 | Autonomous Experimentation Protocol |
| [deep-review](https://github.com/Sungmin-Cho/claude-deep-review) | 1.3.4 | Independent Evaluator for AI coding agents |
| [deep-docs](https://github.com/Sungmin-Cho/claude-deep-docs) | 1.1.0 | Document gardening agent |
| [deep-dashboard](https://github.com/Sungmin-Cho/claude-deep-dashboard) | 1.1.1 | Cross-plugin harness diagnostics |

<!-- deep-suite:auto-generated:plugin-table-ko:end -->

> 위 표는 `.claude-plugin/marketplace.json` 과 각 플러그인의 pinned `plugin.json.version` 으로부터 자동 생성됩니다. 직접 편집하지 말고 marketplace 를 수정하세요. 갱신은 `node scripts/generate-reference-sections.js --write`.

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
|  (Feedforward |  +- Phase Guard hook      |  +- research/plan/brain   |
|   Control)    |  +- TDD state machine     |  +- Sprint Contract       |
|               |  +- Topology templates    |                           |
|               |                           |  deep-wiki                |
|               |                           |  +- Persistent knowledge  |
|               |                           |                           |
|               |                           |  deep-docs                |
|               |                           |  +- Document freshness    |
+---------------+---------------------------+---------------------------+
|               |                           |                           |
|  Sensors      |  deep-work                |  deep-review              |
|  (Feedback    |  +- Linters + typecheck   |  +- Opus code review      |
|   Control)    |  +- Coverage + mutation   |  +- 3-way cross-model     |
|               |  +- 4 drift sensors       |  +- SOLID + entropy       |
|               |  +- Fitness rules         |                           |
|               |  +- review-check sensor   |  deep-work                |
|               |                           |  +- Drift check           |
|               |  deep-docs                |                           |
|               |  +- Doc freshness scan    |                           |
|               |                           |                           |
|               |  deep-dashboard           |                           |
|               |  +- Harnessability        |                           |
|               |  +- Effectiveness         |                           |
+---------------+---------------------------+---------------------------+
```

### 개발 라이프사이클 흐름

```
 Phase 0     Phase 1      Phase 2    Phase 3        Phase 4     Phase 5
 Brainstorm  Research     Plan       Implement      Test        Integrate
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
 |           |            |          |              |  Phase 5가 설치된 플러그인
 |           |            |          |              |  아티팩트를 읽고
 |           |            |          |              |  → LLM이 다음 액션 랭킹
 |           |            |          |              |  → 사용자 선택 (루프 ≤5)
 |           |            |          |              |           |
 +===========+============+==========+==============+===========+====→ /deep-finish
                                                          |
 Continuous: deep-docs (doc scan) <-----------------------+
             deep-dashboard (effectiveness + action routing)
             deep-evolve (autonomous experimentation)
             deep-review (독립 Opus 검증)
```

### 플러그인 데이터 흐름

```
 deep-work ------- receipts -------> deep-dashboard (수집)
    |                                    |
    +-- health_report ----------------> deep-review (fitness-aware review)
    |                                    |
    +-- fitness.json <----------------> deep-review (rule consumption)
    |                                    |
 deep-docs ---- last-scan.json ---> deep-dashboard (수집)
    |                                    |
 deep-evolve -- evolve-receipt ----> deep-dashboard (수집)
    |                                    |
 deep-dashboard                          v
    +-- harnessability ---------------> deep-work Phase 1 (research context)
    +-- effectiveness ----------------> user (CLI report + optional markdown)

 deep-review -- recurring-findings -> deep-evolve (실험 방향 조향)
 deep-evolve -- evolve-insights ---> deep-work (research context)
 deep-evolve -- review 트리거 -----> deep-review (merge 전 검증)
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

### 통합 워크플로우 — 함께 사용하는 방법

각 플러그인은 독립적으로 동작하지만, 함께 사용할 때 진정한 힘이 발휘된다. 프로젝트 라이프사이클에서의 역할:

| 플러그인 | 핵심 질문 | 언제 쓰나 |
|---------|----------|----------|
| **deep-work** | "이걸 어떻게 설계하고 구현하지?" | 모든 코드 작업 — 기능, 버그, 리팩토링 |
| **deep-evolve** | "자동으로 더 좋게 만들 수 있나?" | 성능 최적화, 테스트 개선 |
| **deep-review** | "이 코드가 정말 괜찮은가?" | PR 전 독립 검증 |
| **deep-docs** | "문서가 코드와 맞는가?" | 변경 후 문서 동기화 |
| **deep-wiki** | "배운 것을 어떻게 남기지?" | 세션 간 지식 축적 |
| **deep-dashboard** | "하네스가 잘 동작하는가?" | 프로젝트 건강도 진단 |

**복잡도별 사용 가이드:**

```bash
# 간단한 버그 수정 (30분) — deep-work 하나로 충분, Phase 5 스킵
/deep-work --skip-integrate "로그인 500 에러 수정"

# 중간 규모 기능 (2-4시간) — Phase 5가 review/docs/wiki를 조율
/deep-work "Stripe 결제 연동 추가"
# → Phase 5가 /deep-review, /deep-docs scan, /wiki-ingest를 top-3 추천 (루프)

# 즉석 추천 — 활성 세션 중 언제든
/deep-integrate

# 대규모 최적화 (반나절+) — 전체 플러그인 스택
/deep-harness-dashboard                                  # 프로젝트 건강도 진단
/deep-evolve "테스트 커버리지 90% 달성"                    # 자율 실험
# → "deep-review 실행 후 merge" 선택                     # 자동 검증 후 merge
/wiki-ingest .deep-evolve/<session-id>/                  # 학습 결과 축적
```

단계별 상세 시나리오는 [통합 워크플로우 가이드](guides/integrated-workflow-guide.ko.md)를 참조.

---

## deep-work

**증거 기반 개발 프로토콜** — 단일 커맨드로 구조화된 증거 기반 소프트웨어 개발을 자동 진행합니다.

### 문제

AI 코딩 도구가 복잡한 작업을 수행할 때, 코드베이스를 이해하지 않고 구현에 뛰어들거나, 기존 아키텍처와 충돌하는 패턴을 도입하거나, 검증 없이 작업 완료를 선언하는 경우가 많습니다.

### 해결

`/deep-work "task"` 하나로 **Brainstorm → Research → Plan → Implement → Test → Integrate** 전체 파이프라인을 자동 실행합니다. 구현 단계가 아닌 페이즈에서는 코드 파일 수정이 훅으로 물리적 차단됩니다.

### 주요 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/deep-work <task>` | 자동 플로우 — 전체 파이프라인 실행. 플랜 승인만 필요. |
| `/deep-work --skip-integrate <task>` | 위와 동일하나 Phase 5 스킵 후 `/deep-finish`로 직행 |
| `/deep-integrate` | 수동 Phase 5 — 설치된 플러그인 아티팩트 기반 top-3 AI 추천 (스킵 후 재진입) |
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
Phase 0  Brainstorm    디자인 탐색 — "어떻게 하기 전에 왜" (스킵 가능)
Phase 1  Research      코드베이스 심층 분석 및 문서화
Phase 2  Plan          슬라이스 기반 구현 계획 (사용자 승인 필요)
Phase 3  Implement     TDD 강제 실행 — 실패 테스트 → 코드 → 영수증
Phase 4  Test          영수증 검사, 스펙 준수, 품질 게이트
Phase 5  Integrate     설치된 플러그인 아티팩트 읽기 → LLM top-3 추천
                       → 사용자 선택 (≤5라운드). 스킵 가능. (v6.3.0)
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
- **Slice Review** — 센서 파이프라인 이후 슬라이스별 2단계 독립 리뷰 (스펙 준수 + 코드 품질) *(v6.0.1)*
- **Red Flags** — implement/test 단계 합리화 방지 테이블 *(v6.0.1)*
- **Pre-flight Check** — TDD 시작 전 전제조건 검증 *(v6.0.1)*
- **Phase 5 Integrate** — Test 완료 후 AI가 top-3 다음 액션(review/docs/wiki/dashboard/evolve)을 추천, 최대 5라운드 대화형 루프 *(v6.3.0)*
- **Team/Solo 위임** — Research/Implement는 항상 subagent에 위임. team 모드에서 Research는 3-way 병렬, Implement는 Agent Team 또는 multi-subagent 선택 프롬프트 제공. solo는 단일 agent 순차 실행. Receipt 사후 검증으로 TDD 계약 강제. *(v6.4.1)*
- **Profile schema v3** — `interactive_each_session` 배열, `defaults.*` 분리, 세션별 항목 ask. v2→v3 자동 마이그레이션 (atomic write + flock + idempotent + .v2-backup + rollback). *(v6.4.2)*
- **Session recommender sub-agent** — Sonnet 기본, fenced JSON 추천, 모델 allowlist `^(haiku|sonnet|opus)$`. 신규 플래그: `--no-ask`, `--recommender=MODEL`, `--no-recommender`. *(v6.4.2)*
- **알림 시스템 제거** — notify.sh, notify-parse.test.js, notification-guide.md 삭제; webhook 통합 끊김. **Breaking change.** *(v6.4.2)*

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
- **페이지 I/O의 subagent 위임** (v1.1.2) — 모든 ingest가 전용 `wiki-synthesizer` 에이전트로 dispatch. 에이전트가 소스 읽기 / create vs update 판단 / 페이지 쓰기 / 버전 백업을 담당하고, 메인 세션은 메타데이터(`index.json`, `log.jsonl`, `sources/*.yaml`)만 관리. SessionStart 훅의 멀티 파일 자동 ingest에서 컨텍스트 압박이 유의미하게 감소.
- **멀티 페이지 ingest의 병렬 tool dispatch** (v1.1.3) — `wiki-synthesizer`가 각 phase(source read / candidate survey / backup / page write) 내부의 독립 tool call을 한 메시지에 묶어 발행. LLM 추론 이상으로 wall-clock을 지배하던 ~3N 순차 round-trip이 제거됨. README에 cloud-synced `wiki_root` latency 경고 추가.
- **Hash 정규화 + promotion regression guard** (v1.1.4) — `/wiki-ingest` Step 8d가 `source_hashes` 값을 정규식 검증 후 agent가 해싱 불가한 경우 `origin`에서 post-hoc 재계산 → `sources/*.yaml:content_hash`는 항상 실제 sha256 반영. promotion block은 `.last-scan`을 먼저 읽고 역행 차단 — 버전 전환기 stale `.pending-scan` / 수동 파일 변경에도 방어.
- **Throughput + lint 강화** (v1.2.0) — 3축 릴리즈, 4-cycle review 거침 (총 49 issue surface, 33건 fix, 16건 v1.2.1+/v1.3.0+ deferred). **Throughput**: 선택적 `auto_ingest:` config 블록 (path glob + frontmatter-tag opt-in)이 SessionStart hook 호출 빈도를 줄임; `/wiki-ingest` Step 1.5 hash-skip이 `file`/`deep-work-report` source의 sha256이 기존 `.wiki-meta/sources/<slug>.yaml:content_hash`와 일치하면 batch에서 drop, 단 wiki 측 state integrity 검증 (페이지 존재, frontmatter slug, terminal log)을 gating으로 — 실패 시 `ingest-repair` 자가복구 경로로 fall-through; `wiki-synthesizer` Phase 1 candidate survey가 skim-then-deep (top-K ≤ 5)로 변경 + Phase 1c skim-skipped supplied candidate에 대한 안전망. **Lint**: 새 `[SCAN-WINDOW]` invariant check + `--fix` stale `.pending-scan` 자동 정리; `tags: [leaf]` + `lint.orphan_ignore` globs로 orphan 분류; broken-link 검사가 fenced code block 제외; `pages_created` same-batch dedup guard로 multi-source batch에서도 "log 전체에 한 번만" invariant 보존. **`ingest-repair` 액션**: bytes는 같지만 페이지가 missing/corrupted일 때 wiki state 복구; `pages_created:[]` 제약으로 lint Step 6 LOG-INVARIANT 보존 (자가복구는 lifecycle restoration이지 새 creation이 아님).
- **v1.2.0 backlog 정리 + cycle-2 critical 회귀 수정** (v1.2.1) — 3-cycle review 후 패치 릴리즈 (14 backlog 항목 + 5건 cycle-2 critical 회귀 + 1건 cycle-3 cross-validated config-fail-open). **Hash-skip 무결성 (Step 1.5 강화)**: in-batch slug allocator (newline-delimited claim ledger + on-disk yaml lookup)로 fresh same-batch basename 충돌 정확 처리 (R3W1+CR-A); `log.jsonl` 부재 또는 `no-prior-terminal-log` 시 강제 `ingest-repair` — yaml이 authoritative provenance record (R3W2+W-α 주의사항); inline-list yaml parser, single-quote strip mirror, 명시적 `SKIPPED=()` / `REPAIR=()` 초기화 (RW3+RW4+RW7). **Wiki-lint 거짓 양성 제거**: `http(s)://` target broken-link 검사 제외 (T10 — dogfood에서 발견된 5건 거짓 양성 해결); `strip_code_blocks()`가 block-context-aware로 변경, `in_indented_code` state로 multi-line indented code 정확히 strip하면서 list continuation은 보존 (W7+CR-C). **Per-source provenance**: B5 dual-classification — per-source yaml은 pre-dedup snapshot (full attribution), log emission은 post-dedup arrays (invariant 보존); bash 3.2.57의 broken `("${ARR[@]:-}")` 패턴을 length-guarded array literal init으로 교체 (CR-B); Step 10 prose가 명시적으로 post-dedup arrays 참조 (CR-D). **문서 정확성**: README A5 cloud-mirror `VAULT_ROOT` 주의사항 (R3W3); auto_ingest pause 가이드 정정 + parser-compatible block-form YAML (R3W4 + cycle-3 hot-fix). **스펙 다듬기**: hook 50-line frontmatter guard reorder + line-1 opening guard로 본문 horizontal rule이 frontmatter mode로 leak 방지 (RW5+CR-E); synthesizer "four to six message boundaries" + Phase 1c breakdown (RW6); Step 10 SKIPPED/REPAIR drain forward-pointer (RW2).
- **A4 synthesizer fanout (Approach B) + 훅 YAML 파서 확장 + 6개 폴리시** (v1.3.0) — 2-cycle plan-side 리뷰 (24→8 issue, 모두 Plan #2 fix 회귀) + final-code-reviewer pass (1 Critical pre-push 수정) + post-implementation Cycle 3 (2 ship-blocker 수정, 5건 spec-vs-impl drift는 v1.3.1로 deferred) 후 architectural minor 릴리즈. **Architectural**: `wiki-synthesizer` worker mode (`mode: "worker"` opt-in; default `"inline"` — single-source는 v1.2.1과 byte-identical) — 다중 소스 `/wiki-ingest`가 정렬된 origin round-robin으로 `min(3, N)` parallel worker subagent 분할, worker는 분석 + draft return (writes NONE), main이 cross-worker B5 dual-classification ledger로 aggregate 후 기존 글로벌 lock 아래 write. Branch-scoped lock 획득: 다중 소스는 Phase 0 (worker가 안정 wiki snapshot 보기), 단일 소스는 Phase 3 (v1.2.1 timing, byte-identical). Cross-worker page 충돌 시 worker mode로 second-pass `wiki-synthesizer` dispatch (새 `colliding_drafts` input field) — 충돌하는 body들을 한 페이지로 merge, v1.2.1 multi-source merge invariant + single-writer invariant (main이 Phase 3에서 merged content write) 동시 보존. Worker cap 3 하드코딩; configurable knob은 v1.4.0+로 보류. 훅 YAML 파서 확장: `auto_ingest.ignore_globs`가 block + inline + dotted form 수용 (mixed 시 additive union); 같은 broaden을 `wiki-lint.md` `lint.orphan_ignore` mirror parser에도 적용; pre-existing 잠재 multi-item block-list drop 버그도 fix (`print` 후 `next` 누락). **폴리시**: delimiter-aware awk slug allocator extractor (3개 anchored rule + `\47` POSIX escape, embedded opposite-kind quotes 처리 — Cycle-1 CV-3에서 `[^"']*` sed 제안이 실제로 fix하지 못함을 cross-validation 후 awk로 reframe); tab-indent를 코드 블록 marker로 인식 (W-γ closure); CommonMark 스펙대로 post-list 2-blank reset (W-δ closure); CLAUDE.md에 spec/plan ordering convention 추가 (Tier 1.4 — 위치 표현 사용 시 surrounding pattern 명시); CLAUDE.md memo + companion deep-review PR로 config/parser 실행 체크 가이드라인; README config syntax sweep + v1.2.1 cycle-3의 stale "block-form only / silently ignored" 괄호 제거. **새 lifecycle action**: 3-strike all-workers-fail trigger 시 `ingest-fail` emit (counter `<wiki>/.wiki-meta/.pending-scan-retry-count` format `<window_epoch>:<count>`, 성공 시 reset); stuck `.pending-scan` promote + user-visible error. **새 storage layout**: `<wiki>/.wiki-meta/.failed-sources.tsv` partial-fail per-source 재시도 manifest (TSV `<path>\t<reason>\t<ts>`; hook reader는 v1.3.1로 deferred per CV3-C); `.pending-scan-retry-count` counter file. **Tier 3 close**: D=status-quo (R3W2 prose-only 유지), E=defer-v1.4.0+ (cache_local). **Backwards compat**: 단일 소스 `/wiki-ingest`는 v1.2.1과 byte-identical (state AND lock timing). v1.3.1 backlog는 `docs/followup-2026-05-02-v1.3.0.md`에 추적.
- **Track C synthesizer 에이전트 분리로 trust-boundary 폐쇄** (v1.4.1) — 4-cycle plan-side 리뷰 (fix-and-go cap; 38건 substantive cycle-fix 적용) + 2-round deep-review 교차 검증 (3-way Opus + Codex review + Codex adversarial) 후 패치 릴리즈. Round 1에서 3건 fix (R1 worker `source_shard` index-wrap, R2 inline/analysis/worker별 frontmatter parsing 차이를 위한 per-agent parse gate, Y1 `lint-agent-tools.sh`의 `set -euo pipefail` + `mktemp` cleanup trap); Round 2에서 1건 fix (R-P1 `shasum` 부재인 Linux 환경을 위한 `shasum -a 256 || sha256sum` aggregate fallback). **Architectural**: 단일 `wiki-synthesizer`를 3개 분리 에이전트로 교체 — `wiki-synthesizer-inline` (v1.3.0 inline-mode 계약 동결, DORMANT — `status:dormant` + `last_known_active:v1.3.0` + `contract_frozen_at:a9966c7` rot-mitigation 헤더), `wiki-synthesizer-analysis` (v1.4.0 analysis-mode가 `page_plan` + sub-threshold `inline_bodies` emit), `wiki-synthesizer-worker` (v1.3.0 worker-mode 다중 소스 A4 dispatch + second-pass collision merge용). Active 에이전트 (analysis + worker) frontmatter는 `tools: [Read, Glob, Grep, WebFetch]` — Write/Edit/MultiEdit/Bash/NotebookEdit 물리적 제거 (tool-level M1 폐쇄: prompt-injection 받아도 파일 쓸 수 없음; v1.4.0 실증 실패 모드 — 14 워커 중 2개가 계약 외부에 file write — 닫힘). 기존 `wiki-synthesizer.md` 삭제 — Option B (compat shim 없음); `subagent_type: "wiki-synthesizer"` 사용하는 외부 caller는 qualified namespace `deep-wiki:wiki-synthesizer-{inline|analysis|worker}`로 전환 필수 (BREAKING). Step 7.6.A에 `general-purpose` fallback 금지 명시 코멘트 추가 (V-0 Mechanism B 실증: qualified `deep-wiki:wiki-X`는 런타임에 resolve, unqualified `wiki-X`는 error — caller가 자발적으로 `subagent_type: "general-purpose"`로 downgrade하여 caller의 전체 tool set을 상속받던 v1.4.0 dogfood 실패 모드 폐쇄). **툴링**: 신규 `scripts/lint-agent-tools.sh` (Bash 3.2 portable, `awk` 기반 frontmatter manifest enforcement; 4-에이전트 레지스트리 — `wiki-synthesizer-inline`은 full Write set 허용, active 에이전트는 Read+Glob+Grep+WebFetch만 허용; WebFetch URL allowlist는 승인된 도메인 prefix와 string-match); `commands/wiki-ingest.md`의 3개 invocation site (Step 7.5.M-A 다중 소스 dispatch, Step 7.5.M-B Case B2 second-pass collision merge dispatch, Step 7.6.B-post Stage 2 page-writer dispatch)에 신규 `_post_dispatch_dirty_scan()` shell 함수 추가 — 각 에이전트 dispatch 후 worktree에서 예상치 못한 write 스캔; `WIKI_TEST_MODE=1` env var로 gating (production 비용 zero; off-root /tmp write 패턴은 Layer 2 in-root scope로 부분 차단). **V-runs (검증)**: V-0 PASS Mechanism B (qualified-namespace resolution이 실제 `claude` 런타임에서 실증 검증됨); V-1 PASS 3개 surface 모두 (caller가 `wiki-synthesizer-{analysis,worker,inline}` dispatch 가능하며 예상 response shape 수신); V-2/V-3 UNDETERMINED-extrapolated per Path A (런타임 메타데이터 API 없이는 tool-level enforcement 실증 불가; active 에이전트 frontmatter `tools` 배열에서 Write/Edit/MultiEdit/Bash/NotebookEdit 물리적 부재로 보장). **알려진 한계**: L1 — V-0 PASS는 Claude Code 런타임이 dispatch된 에이전트의 정체성을 caller에 노출하는 메타데이터 API 없이는 best-effort; Track C v2 (full runtime introspection-based enforcement)는 런타임 API가 메타데이터 노출을 지원할 때까지 보류. L2 — `_post_dispatch_dirty_scan()` `§3.9` scope는 wiki root만 검사, off-root `/tmp` write는 검사 안 함 (워커가 `pages/` + wiki root 모두 외부에 file write하던 v1.4.0 실증 실패 모드는 이 레이어로 감지되지 않음); process-level sandboxing (container 또는 seccomp filter)은 v1.5.0+로 보류. CHANGELOG에 두 한계 모두 honest disclosure. **하위 호환성**: A5 단일 소스 page-fanout 경로 (v1.4.0) + A4 다중 소스 경로 (v1.3.0) 구조적 보존 — 동일 Stage 1/2/3 시퀀스, 동일 lock branch-scoping, 동일 `partial_fail` sentinel + cascading + `partial-fail-recovery` repair_reason, 동일 Step 7.7.A-F 실패 처리. NOT byte-identical: split-agent dispatch shape 변경 (caller가 unified 에이전트의 `mode:` parameter 대신 3개 에이전트 이름 중 하나 지정). 모든 v1.2.0+ invariant 보존; A4×A5 결합은 여전히 v1.4.2+로 보류. **마이그레이션**: BREAKING — 외부 caller는 unqualified `subagent_type: "wiki-synthesizer"`에서 qualified `deep-wiki:wiki-synthesizer-{inline|analysis|worker}`로 전환 필수; Option B per compat shim 없음 (multi-version dual-maintenance 부담보다 clean cut 우선).
- **A5 단일 소스 페이지 단위 fanout** (v1.4.0) — 4-cycle plan-side 리뷰 (18→7→9→7 items, fix-and-go cap; 38건 substantive fix 적용) + post-implementation drift check (3-way: 6 issues — 2 critical 2/3 agreement + 4 single-reviewer warnings) + Codex adversarial post-fix pass (3 issues: 2 high + 1 medium design-limitation 문서화) 후 minor 릴리즈. 단일 소스 `/wiki-ingest`가 페이지 본문 생성을 N개의 `wiki-page-writer` worker에 분산 병렬화. 초기 real-vault dogfood (14-page plan, 295-page wiki)는 Claude Code 런타임 concurrent-subagent cap ~3 환경에서 총 ~17분 wall-clock 측정 (Stage 1 ~7분 analysis + Stage 2 ~10분 worker dispatch; effective parallelism ~2.7×, 14× 아님) — v1.3.0 ~15분 단일 소스 baseline 대비 미감소. 원래 ≤5분 목표는 무제한 subagent 병렬성을 전제했으며, 정량적 per-stage 측정 + 병렬성 cap 정량화는 v1.4.1 B1 fault-injection + B3 phase_timing_ms telemetry로 보류. Karpathy "10–15 page touches per source" 속성 보존 — A5는 누가 페이지를 쓰는지 바꾸지 페이지 수를 바꾸지 않음. **Architectural**: 1-source ingest 3-stage 파이프라인 신설. **Stage 1**은 synthesizer를 `mode: "analysis"` (신규 contract, v1.3.0 inline+worker mode에 additive)로 invoke — synthesizer가 source + cross-page candidates 읽고, 각 영향 페이지를 기술하는 `page_plan` 배열 emit (`{file, action, frontmatter_meta, source_excerpts, intent_summary, novel_facts, preserve_sections, existing_page_body, existing_body_hash}`). Sub-threshold (`len(page_plan) < a5_fanout_threshold`, default 3) 시 Stage 1이 각 entry의 전체 `page_content`를 담은 `inline_bodies`도 emit하여 Stage 2 완전 skip. **Stage 2** (활성 시) 단일 Agent-tool-message-turn에서 `page_plan` entry마다 `wiki-page-writer` worker dispatch — worker는 entry payload만 받음 (`tools: []` — 파일 I/O 없음), 그 한 페이지의 `page_content`만 생성, `{file, page_content, frontmatter_meta, worker_status, fail_reason}` 반환. **Stage 3** (main, lock 아래)은 모든 draft에 mandatory C3 optimistic concurrency check (update: body 재 read + sha256을 `existing_body_hash`와 비교; create: existence check), Rule 7 backup, atomic-write (tmp + rename), v1.3.0 Step 8-11 metadata 파이프라인 UNCHANGED 실행, 그 다음 `partial_fail` sentinel write/remove (Step 7.6.F)를 lock release BEFORE에 처리 (post-review fix C2 — Step 12 release가 sentinel rewrite 이전에 실행되던 race window 차단), 마지막에 Step 12 release + Step 13 auto-lint를 Step 7.6.G에서 실행. **Step 1.5 partial_fail cascading (A1)**: `<wiki>/.wiki-meta/sources/<slug>.yaml`의 새 optional 필드 `partial_fail: {ts, failed_pages, reason}` — Fanout 실행에서 어떤 페이지든 실패 시 write됨; Step 1.5가 bytes-hash 검사 BEFORE에 partial_fail을 cascade하여 source bytes 동일해도 다음 세션에서 REPAIR override 강제 (신규 `partial-fail-recovery` repair_reason 값); Sentinel removal-on-success (Step 7.6.F Case ii)가 retry loop 끊음. `log.jsonl`의 `ingest` action에 FAILED_PAGES OR FAILED_WORKERS non-empty일 때 `pages_failed: [<file>...]` 추가 (additive; wiki-lint Step 6 LOG-INVARIANT scan 영향 없음). **숨김 설정**: 신규 optional `<wiki>/.wiki-meta/.config.json`에 `a5_fanout_threshold` (default 3) + `a5_worker_timeout_sec` (default 90, W9에 따라 aspirational — Agent tool은 per-call timeout knob 미노출). python3 → jq fallback으로 로드, 둘 다 없을 시 default 적용 + W10 stderr warning. **실패 처리 Step 7.7.A-F**: per-worker fail (A) → FAILED_WORKERS + SUCCESS_DRAFTS loop BEFORE에 PARTIAL_FAIL toggle (P5); all-workers fail (B) → A7 lock + R4-Adv-Adv-2 first-ingest baseline yaml materialization (sentinel writer가 부재 yaml corrupt 방지) + 3-strike retry counter; mid-loop write fail (C) → A6 abort with R4-R4-2 symmetric mv-fail handling; C3 concurrency abort (D) → continue (다른 페이지는 여전히 write 가능); worker timeout (E) → per-worker fail과 동일; metadata pipeline failure recovery (F, R4-Adv-Adv-1) — Step 7.6.C가 페이지를 쓴 AFTER Step 8-13 실패 → 모든 WRITTEN entry를 failed로 mark, held lock 아래 sentinel write, best-effort log emit, `.pending-scan` promote NOT. **보안/정확성 post-review fix**: filename basename 검증 (`^[a-z0-9][a-z0-9-]*\.md$`) Step 7.6.B Gate 3.5 + Step 7.6.C defense-in-depth, 어떤 filesystem op BEFORE에 적용 (worker `file: "../log.jsonl"`이 `pages/` 외부에 쓰이기 전에 차단; Step 8b regex가 catch하기 이전 시점); frontmatter_meta subfield 검증 (title/tags/aliases/sources_final)을 jq → python3 fallback 체인으로, 누락 subfield는 page_plan에서 fallback (provenance corruption 차단). **하위 호환성**: 다중 소스 A4 경로는 v1.3.0과 byte-identical (worker mode + B5 dual-classification + Phase 0 lock + second-pass collision merge); section header를 `Step 7.5.A/B/C/D` → `Step 7.5.M-A/B/C/D`로 disambiguation rename, cross-reference 모두 sweep. 단일 소스 semantics 보존 but byte-identical NOT — v1.4.0은 1-source를 v1.3.0의 inline-mode 대신 analysis-mode로 routing (~10–25% wall-clock variance). 모든 v1.2.0+ invariant 보존. A4×A5 결합은 v1.4.1+로 보류. **알려진 한계**: Phase 6 sandbox tests (W2 fault-injection knob → v1.4.1); analysis-mode trust boundary (M1 — `wiki-synthesizer`가 inline-mode에 필요한 `Write` tool 보유; analysis-mode "no write" 규칙은 prompt-enforced only; **2026-05-05 real-vault dogfood에서 14 워커 중 2개가 계약 외부에 file write — 실증됨**; synthesizer agent split (Track C)을 통한 full tool-level enforcement 우선순위가 v1.4.x에서 격상).

[전체 문서 →](https://github.com/Sungmin-Cho/claude-deep-wiki)

---

## deep-evolve

**자율 실험 프로토콜** — 목표를 지정하면, deep-evolve가 측정 기반 실험 루프를 통해 프로젝트를 체계적으로 개선합니다. v2.1에서 크로스 플러그인 피드백 도입: deep-review의 반복 발견사항이 실험 방향을 조향하고, evolve-insights가 deep-work 리서치 컨텍스트에 공급되며, deep-evolve가 merge 전 검증을 위해 deep-review를 트리거합니다. v3.0에서 AAR 기반 레이어 추가 (엔트로피 추적, legibility gate, shortcut detector, diagnose-retry). **v3.1에서 virtual parallel N-seed 탐색 추가**: 각 세션이 N=1..9개 독립 seed worktree를 적응형 스케줄러로 조정, 공유 forum으로 seed 간 관찰, 세션 종료 시 synthesis로 per-seed 결과를 단일 best 브랜치로 병합. v3.1.1은 stdout metric 실패 처리, sealed prepare read/write guard, scheduler journal 계약, 패키징 범위를 강화합니다. v3.0.x 세션은 VERSION_TIER 라우팅으로 완전 지원.

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
| `/deep-review --respond` | 리뷰 피드백에 증거 기반 대응 (v1.3.3부터 Phase 6가 Sonnet 서브에이전트로 위임됨) |
| `/deep-review init` | 프로젝트별 리뷰 규칙 초기화 |

### 핵심 기능

- **독립 평가자** — Generator 컨텍스트를 공유하지 않는 별도 Opus 서브에이전트
- **교차 모델 검증** — Codex 설치 시 3-way 병렬 리뷰
- **Phase 6 서브에이전트 위임** (v1.3.3) — `/deep-review --respond`의 IMPLEMENT 단계를 전용 `phase6-implementer` Sonnet 서브에이전트에 심각도 그룹별로 위임. Main 세션은 Phase 1~5(판단) 유지, 서브에이전트가 항목별 Edit + 테스트 수행. Main은 content-aware delta(`git hash-object`) + allowlist + `git commit --only` pathspec-limited 커밋으로 fail-closed 검증. dispatch 실패 시 main 직접 수행으로 graceful fallback.
- **Phase 6 trust-boundary hardening + 플랫폼 호환성** (v1.3.4) — 4-round cross-model review 로 잠재 trust-boundary 버그 + 플랫폼 이슈 5건 발굴·해결: staged rename 감지 (`--name-status -M`, staged ∪ unstaged 합집합), pre-existing dirty 외부 경로를 통한 allowlist 우회 차단, dirty recovery 의 index + worktree 동기 복원, tracked-but-deleted WIP 보존, macOS `/bin/bash` 3.2 호환 (TSV temp file 이 `declare -A` 대체), `ubuntu-latest` + `macos-latest` CI matrix 추가. e2e 커버리지 5 → 11 시나리오 (E1~E11).
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

## Suite Extensions (사이드카 매니페스트)

Claude Code 공식 `marketplace.json` 스키마에 들어가지 못하는 cross-plugin 메타데이터를 사이드카 파일 `.claude-plugin/suite-extensions.json`에 보관하고, [`schemas/suite-extensions.schema.json`](./schemas/suite-extensions.schema.json) (JSON Schema Draft 2020-12)으로 검증한다.

**왜 사이드카인가?** `marketplace.json`은 closed schema (`additionalProperties: false`)이다. `runtime`, `capabilities`, `artifacts` 같은 suite-only 필드를 추가하면 `claude plugin validate`가 무시하거나 거부한다. 사이드카 패턴은 공식 매니페스트를 깨끗하게 유지하면서 suite 도구가 추가 메타데이터를 소비할 수 있게 한다.

**내용:**

- `suite.name` (`marketplace.json.name`과 동일해야 함), `harness_taxonomy`, `telemetry_namespace`
- `plugins.<name>` — 플러그인별 `runtime`, `capabilities`, `artifacts.{writes,reads}`, `hooks_active`, optional `hooks_intentionally_empty_reason`, optional `consumer_only`
- `data_flow[]` — producer → consumer edge. `via`는 display-only 라벨 (machine-readable cross-plugin trace는 M3 artifact envelope이 담당)

**스키마 버전은 `1.0`으로 잠금**. 추가 forward-compat 확장은 root, suite, plugin entry 레벨의 `x-*` patternProperties를 통해 한다. Breaking change는 새 스키마 파일(`suite-extensions-v2.schema.json`)이 필요하다. [`schemas/README.md`](./schemas/README.md) §Schema versioning 참조.

**검증:**

```bash
npm install                       # ajv + ajv-formats (devDeps 전용)
npm test                          # 32 unit + spawnSync CLI 테스트
npm run validate                  # 실제 .claude-plugin/suite-extensions.json 검증
```

검증은 두 단계로 동작한다 — JSON Schema (Phase 1) + `data_flow.from`/`to`에 대한 post-schema referential integrity (Phase 2). Phase는 stderr prefix로 구분되고 exit code는 `0`/`1`/`2` (성공 / 검증 실패 / IO·usage·compile 오류)이다.

두 번째 스키마 [`artifact-envelope.schema.json`](./schemas/artifact-envelope.schema.json)은 M3 마일스톤에서 플러그인이 채택할 공통 envelope을 정의한다 — cross-plugin traceability와 deep-dashboard 집계용.

---

## 라이선스

MIT
