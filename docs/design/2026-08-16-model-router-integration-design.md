# model-router × deep-suite 통합 — 최종 설계안

- 작성일: 2026-08-16
- 지위: **설계 확정 + §11 리뷰 보강** — `docs/research/`의 독립 리서치 3편을 종합·판정한 단일 설계. 이 문서가 세 리서치를 대체한다. §11은 2026-08-16 독립 이중 리뷰(claude-fable-5 · gpt-5.6-sol) 후 오케스트레이터 판정으로 닫은 규범이다. §11이 §4·§6의 동일 주제에 우선한다.
- 기준 리비전: model-router `6d12225` (local == origin/main, clean, **213 passed 재실측**) · deep-suite 마켓플레이스 핀 9종
- 검증 원칙: 리서치 간 상충 주장은 채택 전 전부 재실측했다(§1.2). 실측과 다른 리서치 진술은 본 설계에서 기각된다.

---

## 0. 결정 요약

| # | 결정 | 채택 출처 | 한 줄 근거 |
|---|---|---|---|
| D1 | model-router를 **suite의 10번째 플러그인**으로 배포한다. 마켓플레이스 수준 "기본 스킬"은 만들지 않는다(플랫폼에 없음) | 3편 만장일치 | 스킬의 배포 단위는 플러그인뿐(공식 문서) |
| D2 | 저장소는 **`deep-model-router`로 rename**, 플러그인 키 **`deep-model-router`**, 스킬명 **`model-router`** → 호출 `/deep-model-router:model-router`, `$deep-model-router:model-router` | R1+R2 (R3 기각) | Codex 계약 테스트가 `deep-*` URL을 강제(실측 `tests/codex-marketplace-contract.test.js:29`) — 테스트를 약화시키느니 네임스페이스를 따른다 |
| D3 | 아키텍처는 **"정책은 공유, 집행은 플러그인"** — decision plane(라우터) / execution plane(플러그인) 분리, `max(router, local floor)` 단조 병합 | 3편 만장일치 | work/review의 검증된 도메인 계약·안전 하한을 보존 |
| D4 | 소비는 **3-계층**: 스킬 본문은 세션당 1회(분류 규약 학습) / 반복 결정은 **versioned CLI JSON**(~58ms/route 실측) / ID·철자만 필요하면 **레지스트리 파싱** | R3+R2 종합 | SKILL.md 555줄을 위임마다 로드하는 것은 컨텍스트 낭비 |
| D5 | route JSON에 **프로토콜 identity 3필드**(`route_schema_version`·`router_plugin_version`·`policy_sha256`)를 업스트림 추가 — RouteRequestV1/RouteDecisionV1 계약 | R2 | 현 HEAD의 route JSON에 identity 필드 부재 실측 — 소비자가 호환성·정책 동일성을 판정할 수 없음 |
| D6 | 의존성: Claude는 **마켓플레이스 엔트리 `dependencies`**(sibling 소스 매니페스트 오염 없음) + `{plugin}--v{version}` 태그, Codex는 **router만 `INSTALLED_BY_DEFAULT`** + 계약 테스트 명시 예외 | R2 | "plugin.json **or in its marketplace entry**" 공식 문서로 확인. Codex 자동설치는 로컬 마켓플레이스 미작동 이슈(codex#28924)를 리스크로 명기 |
| D7 | 파일럿은 **병렬 2트랙**: deep-work **shadow**(측정 전용, 동작 불변) ∥ deep-loop **episode-boundary 라이브**(첫 실소비자, 신규 에피소드 경계에서만) | R2+R3 절충 | shadow는 무위험 parity 증거를 만들고, deep-loop는 이미 위임을 선언했으며 model-router PR #4가 deep-loop용 dispatch를 구현해 둔 상태 |
| D8 | deep-review는 **resolver-only, 마지막 순서** — tier→구체 모델 해석·effort 철자·가용성·폴백만 공유. critical의 3-reviewer/2-family floor, admission, rubric은 로컬 소유 불변 | R2 (R3 방향 일치) | 범용 CRITICAL 2석 리뷰로 대체하면 안전 하한이 **약해진다** — 독립 평가자 신뢰 경계 보존 |
| D9 | wiki/docs/memory는 **기본 정적 핀 유지, optional 트랙** — 진입 기준(§6 P4) 충족 시에만 위임 seam 라우팅 | R3 (R2의 priority-2 기각) | 가치 낮은 곳에 의존성 마찰을 먼저 만들지 않는다. R1도 "선택"으로 분류 |
| D10 | **gemini family를 레지스트리에 등재**(검증 원장 절차) — 역할 바인딩 재설계는 하지 않음 | R3 고유 발견 | suite 4곳이 이미 gemini 사용(work 리뷰 채널·review agy·memory 어댑터·loop 복구 프로파일). R1·R2는 미포착 |
| D11 | 관측: RouteDecisionV1 + dispatch receipt를 **M3 envelope payload `routing-decision`**으로 방출 → deep-dashboard 집계. payload 스키마는 P1에서 선등록 | R3+R2 공통 | 라우팅 결정이 suite 텔레메트리에 처음 잡히는 신설 이득 |
| D12 | 안전 계약: 단조 병합 no-downgrade 테스트 · exit-code 어댑터(deep-work fail-safe exit 0 유지) · HIGH/CRITICAL 오류의 silent-`main` 성공 전환 금지 · `TERMINATION_UNCONFIRMED` 후 write retry 차단 | R2 게이트 채택 | 라우터의 0/1/2/3/4 계약과 소비자별 실패 의미론이 다르다 — 어댑터가 번역, 절대 침묵 강등 금지 |

이전 연구(R3)의 미결 4건은 이 설계에서 전부 해소된다: 이름(D2 — rename), dispatch 시점(무의미 — 이미 구현·머지됨), gemini 범위(D10 — 등재만), deep-work 스코어러 주입(P2a shadow가 데이터로 답한다 — 사전 결정하지 않음).

---

## 1. 입력 문서와 판정 방법

### 1.1 입력 3편

| 축약 | 파일 (docs/research/) | 지위 | 강점 | 한계 |
|---|---|---|---|---|
| **R1** | `2026-08-16-model-router-as-suite-default-skill.md` | superseded draft(자체 선언) | 설치 레버 표(defaultEnabled·INSTALLED_BY_DEFAULT·codex#28924), suite 게이트 최초 발견(WORD_TO_NUM·URL 정규식), 어휘 매핑 초안, "인라인은 라우팅 안 함"·python3 미프로비저닝 제약 | 구 리비전 기준("로컬 14커밋 뒤"는 현재 거짓) |
| **R2** | `2026-08-16-model-router-deep-suite-integration.md` | canonical | 최신 리비전(6d12225) 기준, RouteRequest/DecisionV1 + provenance + 단조 병합, readiness 판정표, shadow-first 파일럿 논리, 검증 게이트 목록, 컨텍스트 실측(16,879 words / 58ms per route) | gemini family 갭 미포착, 정적 핀 플러그인에 과한 우선순위 |
| **R3** | `model-router-integration-research.md` (본 세션 이전 연구) | 입력 | 9-플러그인 파일:라인 전수 인벤토리, 플랫폼 실측 4건(Unknown-skill 에러 모델 등), gemini 4-사용처 발견, deep-loop 위임 선언 발견, 3-계층 소비 구도 | "dispatch 미구현"은 현재 거짓(당시 로컬 stale), 네이밍 권고가 URL 정규식 게이트 미반영 |

### 1.2 상충 주장 재실측 결과 (2026-08-16 저녁)

| 검증 항목 | 결과 | 판정 영향 |
|---|---|---|
| model-router HEAD | `6d12225` = origin/main, clean. PR #4 "deep-loop-dispatch-implementation" 머지 | R2 기준 채택. R1·R3의 stale 진술 기각 |
| `dispatch_agent.py` | **존재**(898줄) + `test_dispatch.py`(894줄) + `test_docs.py`(144줄) | "dispatch 미구현" 기각. D7의 deep-loop 트랙 근거 강화 |
| pytest | **213 passed in 62.44s** 재실측 | 그린 기준선 확정 |
| route JSON identity | `route_schema_version`/`router_plugin_version`/`policy_sha256` **부재**(top-level 키 전수 확인) | D5 업스트림 작업 확정 |
| Codex 계약 테스트 | `:29` URL 정규식 `^https://github.com/Sungmin-Cho/deep-`, `:31` 전 엔트리 `installation: 'AVAILABLE'` 단정 | D2 rename 확정, D6 테스트 예외 필요 확정 |
| `check-plugin-count.js` | `:40` `WORD_TO_NUM = { six..nine }`, `:67,74` 정규식 probe | P1 선행 수정 확정 |
| 사이드카 테스트 | plugin 키가 마켓플레이스와 **순서까지 deepEqual** | P1 사이드카 삽입 위치 제약 확정 |
| 마켓플레이스 엔트리 dependencies | 공식 문서 확인: "listing them in `plugin.json` **or in its marketplace entry**" + entry-level `dependencies` 예시 + `{plugin}--v{version}` 태그 + `claude plugin tag --push` | D6 확정 |
| 미설치 플러그인 스킬 호출 | `Unknown skill: <name>` 클린 도구 에러(금일 오전 실측, R3) | degrade 경로 구현 근거 유지 |

---

## 2. 확정 아키텍처

```text
        플러그인 도메인 분류기  +  로컬 안전 하한(local floor)
                          │
                          ▼  RouteRequestV1
        ┌─────────────────────────────────────────┐
        │   deep-model-router  (decision plane)   │
        │  registry · effort맵 · band · review ·  │
        │  fallback · retry/human-gate · receipt  │
        └─────────────────────────────────────────┘
                          │  RouteDecisionV1 (+identity)
                          ▼
            단조 병합: max(router 결정, local floor)
                          │
                          ▼
        플러그인 소유 executor · 권한 · durable state
                          │
                          ▼
      execution receipt + routing provenance  ──►  deep-dashboard
```

**소유권 분할(불변 계약):**

| deep-model-router 소유 | sibling 플러그인 소유 |
|---|---|
| 모델 레지스트리(구체 ID·가격·capability_tier·effort_ceiling — 유일 정본) | 도메인 분류(태스크→class/차원/flags 번역) |
| family별 effort 철자, transport 명령 문법 | 더 강한 로컬 하한(예: deep-review critical 3석/2-family) |
| 범용 risk band·오버라이드·워커/리뷰 정책·폴백+보상 | reviewer 역할·rubric·admission·mutation fingerprint |
| retry 예산·human-gate·routing confidence | 권한·mutation 경계·durable state·native dispatch |
| subprocess dispatch 감독(receipt·deadline·kill ladder) — POSIX CLI 브리지 한정 | native(Agent tool / multi_agent) 좌석의 감독·최종 성공 판정 |

**소비 3계층(D4):**

| 계층 | 방식 | 비용 | 사용처 |
|---|---|---|---|
| 스킬 | `/deep-model-router:model-router` 1회 로드 — 분류 규약·밴드 체계 학습 | 세션당 1회 (~7k tok) | 런/세션 초기화, 에스컬레이션 분기 판단 |
| CLI | `route_task.py --format json` (58ms/route 실측) | ~0 | 반복 결정: 에피소드/슬라이스/리뷰어 선택 |
| 레지스트리 | `config/model-routing.yaml` 파싱 | ~0 | ID·native effort 철자·ceiling만 필요한 resolver |

---

## 3. 배포 설계

### 3.1 식별자와 레이아웃 (D2)

| 항목 | 값 |
|---|---|
| 저장소 | `Sungmin-Cho/deep-model-router` (**기존 model-router rename** — 히스토리·이슈 보존, GitHub redirect로 구 URL 생존) |
| 플러그인 키 | `deep-model-router` |
| 스킬명 | `model-router` |
| 호출 | Claude `/deep-model-router:model-router` · Codex `$deep-model-router:model-router` |

```text
deep-model-router/
  .claude-plugin/plugin.json        # name=deep-model-router, version=SemVer (캐시 키 1순위)
  .codex-plugin/plugin.json
  AGENTS.md  CLAUDE.md
  skills/model-router/
    SKILL.md                        # 경로 참조는 전부 $SKILL_DIR 기준 (기존 DD-1 규약 유지)
    config/model-routing.yaml
    scripts/route_task.py
    scripts/dispatch_agent.py
    references/   tests/   agents/openai.yaml
```

원칙: default hook 없음(첫 route 시 capability preflight lazy 실행) · authentication `ON_USE` · sibling이 `../model-router`나 개인 심링크를 import하는 일 금지 · 실제 산출물 생기기 전 사이드카 `artifacts.writes` 광고 금지.

### 3.2 의존성·설치 메커니즘 (D6)

- **Claude**: 소비자 sibling의 **deep-suite 마켓플레이스 엔트리**에 `dependencies: [{ "name": "deep-model-router", "version": "^1.0" }]` 선언. sibling 저장소 자체의 plugin.json은 건드리지 않는다 — suite 밖 단독 설치에 결합을 만들지 않기 위함. 버전 해석용으로 router 저장소에 `deep-model-router--v{version}` 태그를 `claude plugin tag --push`로 발행.
- **Codex**: router 엔트리만 `policy.installation: INSTALLED_BY_DEFAULT`. 계약 테스트는 "router 키만 예외" 형태로 명시 수정(전역 완화 금지). codex#28924(로컬 마켓플레이스에서 자동설치 미작동)로 인해 자동설치를 신뢰하지 않는 degrade 경로가 필수다.
- **부재 시 degrade(공통 계약)**: 스킬 목록 사전 확인 또는 `Unknown skill` 에러 수신 → 소비자는 자기 내장 정책으로 저하하고, receipt에 `routing_provenance: local-fallback`을 기록한다. **고위험 작업의 로컬 안전 하한은 router 부재로 절대 낮아지지 않는다.**

### 3.3 suite 게이트 대응 체크리스트 (P1에서 전부 처리)

| 게이트 (실측 좌표) | 대응 |
|---|---|
| `tests/codex-marketplace-contract.test.js:29` URL 정규식 | rename으로 자연 통과 |
| 동 `:31` 전 엔트리 `AVAILABLE` | router 키 한정 예외로 테스트 수정 |
| `scripts/check-plugin-count.js:40` WORD_TO_NUM nine 한계 | `ten: 10` 추가(내러티브 "ten plugins" 이전에) |
| 사이드카 order-strict deepEqual | 마켓플레이스 삽입 위치와 동일한 순서로 사이드카 키 추가 |
| `check-pinned-plugin-paths.js` | 초기 `artifacts: { writes: [], reads: [] }` |
| 양-매니페스트 동기(`codex-marketplace-contract`) | 두 파일 동일 SHA 핀 + `docs:write` + `preflight` |
| `claude plugin validate .` | P0에서 router 저장소, P1에서 suite 각각 그린 확인 |

---

## 4. 프로토콜 설계 (D5·D12)

### RouteRequestV1 (소비자 → 라우터)

```yaml
route_schema_version: 1
task_class: IMPLEMENTATION            # 분류는 소비자 책임 (라우터는 대신하지 않는다)
complexity: 0..3
uncertainty: 0..3
blast_radius: 0..3
reversibility: 0..3
reasoning_centric: true|false
flags: []
runtime: claude_code|codex|grok
prior_failures: []                    # 모델 id 명시 (라우터는 추측하지 않는다)
availability_snapshot: {}             # 소비자가 이미 아는 가용성 (예: deep-review capability cache)
local_policy:                         # 단조 병합용 로컬 하한
  minimum_capability_tier:
  minimum_effort:
  minimum_reviewers:
  minimum_provider_families:
  allowed_families: []                # 신규 — native Agent 전용 소비자는 [claude]로 제한
                                      # (기본 바인딩이 크로스 패밀리라는 R1 §3.4 문제의 해법)
```

### RouteDecisionV1 (라우터 → 소비자)

기존 route JSON 전체 + 신규 identity 3필드:

```yaml
route_schema_version: 1
router_plugin_version: 1.x.y          # plugin.json.version과 동일
policy_sha256: <config 정규화 digest>
# ... 기존: selected_model/effort(3형)/review/terminal/requires_human_confirmation/...
```

### 병합·오류 규칙

1. **단조 병합만 허용**: 소비자는 `max(decision, local floor)`로만 합친다. 라우터가 더 약한 리뷰를 제안해도 로컬 floor가 이긴다. no-downgrade는 소비자 측 테스트로 고정한다.
2. **버전·digest 불일치는 침묵 성공 금지**: 미지원 `route_schema_version`, digest 불일치, invalid JSON → 소비자 degrade 경로 + provenance 기록.
3. **exit-code 어댑터**: 라우터의 `0/1/2/3/4`를 소비자 의미론으로 번역하는 것은 소비자 어댑터 책임. deep-work의 "항상 exit 0 + fail-safe JSON" 계약은 유지하되, HIGH/CRITICAL 라우트의 오류가 silent `main` 성공으로 변환되는 것은 금지(오류 사실을 fail-safe JSON에 명시 필드로 남긴다).
4. **인라인 작업은 라우팅하지 않는다**: deep-work plan/brainstorm의 `main` 고정 등 현행 인라인 경로는 설계상 라우터 범위 밖(R1 제약 계승).
5. **python3 preflight**: 소비자는 첫 CLI 호출 전 python3 가용성을 확인하고, 부재 시 3.2의 degrade와 동일 경로를 탄다(플러그인 런타임은 Node 중심, python은 자동 프로비저닝되지 않음).

---

## 5. 플러그인별 통합 설계

| 플러그인 | 연동 방식 | 유지하는 로컬 권위 | 단계 |
|---|---|---|---|
| deep-work | **shadow 비교 먼저**(동작 불변, old/new 결정과 downgrade 여부만 기록) → parity 임계 합의 후 model/effort resolver 소비 검토 | brainstorm/plan `main`, methodology digest·floor, pin 우선순위, session snapshot, fail-safe exit 0 | P2a |
| deep-loop | **신규 maker/checker 에피소드 경계에서만** Tier-CLI route, 결과를 durable state에 고정. 실행 중 에피소드 재라우팅 금지(연속성 보존) | respawn/handoff argv 연속성, kernel/executor 2-plane, receipt gate | P2b (첫 라이브) |
| deep-review | **resolver-only**: symbolic tier→구체 ID, effort 철자/ceiling, 가용성, generic fallback, provenance | artifact classifier, 역할·rubric, waves, **critical ≥3 reviewers / ≥2 provider families**, admission, mutation fingerprint | P3 |
| deep-evolve | role/run 시작 시 1회 route 후 **비교 epoch 동안 freeze**; 변경 시 새 epoch + provenance | 재현성, lineage | P4 |
| deep-wiki / deep-docs / deep-memory | **기본: 현행 유지**(정적 sonnet 핀 / 호스트 위임). optional: 진입 기준 충족 시 위임 직전 route | wiki lock·ingest 계약, docs read-only scanner, memory Step A 결정론 | P4 (optional) |
| deep-dashboard | 소비자 전용 — `routing-decision` envelope 집계 | no-inference | P5 |
| deep-goal | 연동하지 않음 | — | — |

**P4 optional 진입 기준**: ① P2b 라이브 소비자가 1 릴리스 이상 무회귀 운용 ② P2a shadow에서 downgrade 0 확인 ③ 해당 플러그인에 실제 모델 차등화 수요 발생(예: wiki 대량 fanout 시 haiku 강등 요구). 셋 다 전이면 착수하지 않는다.

---

## 6. 이행 로드맵

### P0 — router를 배포 가능한 플러그인으로 (deep-model-router 저장소)
1. 저장소 rename + `skills/model-router/` 표준 레이아웃 이전(경로는 `$SKILL_DIR` 기준 유지) + 양쪽 plugin manifest.
2. RouteDecisionV1 identity 3필드 + `allowed_families` 구현(+테스트).
3. gemini family 레지스트리 등재 — 검증 원장 절차대로 프로브 후 `verified` 기록 (D10).
4. SemVer 확정 + `deep-model-router--v{version}` 태그 발행. Codex front-end(AGENTS.md, §33 parity case 18) 완성.
5. `claude plugin validate .` + Claude/Codex 스킬 로드 스모크 + CLI 스모크.

### P1 — deep-suite 등재
1. 양쪽 매니페스트에 10번째 엔트리(동일 SHA 핀), 소비자 엔트리에 Claude `dependencies` 선언.
2. `WORD_TO_NUM.ten` 추가 → metadata.description "nine"→"ten" → 사이드카 순서-일치 삽입(+`x-model-routing` 권위 선언).
3. Codex 계약 테스트를 "router만 `INSTALLED_BY_DEFAULT`" 예외로 수정.
4. `payload-registry/deep-model-router/routing-decision/v1.0.schema.json` 선등록 (D11).
5. `docs:write` → `preflight` → isolated Codex 마켓플레이스 스모크. guides 라우팅 섹션 신설(bilingual).

### P2 — 병렬 파일럿
- **P2a deep-work shadow**: 기존 결정이 authority. 동일 입력에 router 결정을 병렬 계산, model/effort/review downgrade·version mismatch·latency만 기록. parity 임계 합의 전 dispatch 불변.
- **P2b deep-loop 라이브**: 신규 에피소드 경계에서 RouteRequestV1(CLI) 호출 → maker/checker model·effort 차등 → durable state 고정 → receipt에 provenance. router 부재 시 현행 단일 전파로 degrade.

### P3 — deep-review resolver-only (§5 계약대로)

### P4 — evolve freeze + optional seam (진입 기준 §5)

### P5 — 관측 완성과 중복 제거
- deep-dashboard `routing-decision` 집계 위젯.
- **증거 게이트 통과 항목만** 중복 카탈로그 제거(deep-work model-catalog의 구체 ID 상류화 등): shadow parity + no-downgrade + standalone fallback + live 스모크 전부 그린일 때. 정책 엔진 자체는 증거 없이 삭제하지 않는다.
- max-effort 정책을 레지스트리 `effort_ceiling` 단일 진실로 수렴(현행 3색: work 클램프 / loop 금지 / router ceiling).
- 개인 심링크(`~/.claude/skills/model-router`, `~/.codex/skills/model-router`) 제거.

### 필수 검증 게이트 (전 단계 공통 — R2 §10 채택·정리)

router 미설치/disabled/invalid-JSON/미지원 schema·digest에서의 degrade 동작 · 라우터 결정이 로컬 floor를 낮추지 않음(no-downgrade 테스트) · HIGH/CRITICAL 오류의 silent-`main` 금지 · `TERMINATION_UNCONFIRMED` 후 write retry 차단 · receipt 없는 launch를 완료로 간주하지 않음 · native dispatch와 subprocess receipt를 같은 증거로 과장하지 않음 · sibling의 suite-밖 단독 설치 무영향 · Claude dependency 자동설치 + namespaced 스킬 로드 실증 · Codex `INSTALLED_BY_DEFAULT` isolated 스모크 · 양-매니페스트/사이드카 계약 그린 · route/receipt → dashboard trace 관통.

---

## 7. 판정 기록 (adjudication log)

| 쟁점 | R1 | R2 | R3 | 채택 | 결정 근거 |
|---|---|---|---|---|---|
| 네이밍 | deep-model-router | repo deep-model-router + key deep-model-router | model-router 유지 | **R2** | URL 정규식 게이트 실측(:29). R3 권고는 이 게이트 미반영이므로 기각. 기존 저장소 rename으로 히스토리 보존 |
| 첫 파일럿 | (단계 1-2 일반론) | deep-work shadow 먼저, loop는 Phase 5 | deep-loop 먼저 | **절충(병렬)** | shadow는 동작 불변이라 loop 라이브와 상호 배타가 아님. loop를 뒤로 미룰 이유였던 연속성 우려는 "신규 에피소드 경계 한정"으로 이미 해소(R2 자신의 §7.3). PR #4가 loop용 dispatch를 선구현한 사실이 R3 순서를 지지 |
| 의존성 선언 위치 | plugin.json 중심 | 마켓플레이스 엔트리 | plugin.json (soft) | **R2** | 공식 문서로 entry-level 지원 확인. sibling 단독 설치에 결합 없음 |
| Codex 설치 | INSTALLED_BY_DEFAULT 신뢰 불가 경고 | router만 INSTALLED_BY_DEFAULT | (미러 관례 따름) | **R2+R1** | 채택하되 R1의 codex#28924를 리스크·degrade 필수 근거로 병기 |
| wiki/docs/memory | 선택 | priority 2 (P3) | 핀 유지 | **R3** | 소비자 없는 의존성(R1 §3.3)과 낮은 가치. optional 트랙 + 진입 기준으로 강등 |
| deep-review 범위 | 교체 시 손실 목록 | resolver-only + 3석/2-family 보존 | Tier 3 + 엔진 불변 | **R2** (R3 동일 방향의 정밀화) | critical floor 수치까지 명문화한 R2 안이 가장 구체적 |
| dispatch 계층 | 원격/Windows 비범위 | READY with limits | 미구현이므로 후속 | **R2** | 재실측으로 구현 확인. R3 진술 stale 처리 |
| gemini | (복구 프로파일만 인지) | 미포착 | 4-사용처 등재 요구 | **R3** | R3 고유 기여. P0 항목으로 채택 |
| 프로토콜 identity | 없음 | 3필드 + 단조 병합 | (config version 확인 수준) | **R2** | route JSON 부재 실측으로 확정 |
| 컨텍스트 전략 | description-상주 원칙 | 1회 로드 + CLI(58ms 실측) | 3-계층 | **R3 구도 + R2 실측** | 상호 보완 — 동일 결론의 두 표현 |

---

## 8. 리스크 레지스터 (통합)

| 리스크 | 대응 |
|---|---|
| 중앙 라우터 단일 실패점 | 전 소비자 standalone degrade + `local-fallback` provenance (부재 = 현행 동작) |
| 로컬 도메인 floor 약화 | 단조 병합 + no-downgrade 테스트 (D12) |
| version skew | schema version + plugin version + policy digest 3중 identity (D5) + entry semver 범위 |
| Codex 자동설치 미작동 (codex#28924) | degrade 경로 필수 + isolated 스모크를 P1 게이트로 |
| python3 미가용 | 첫 사용 preflight → degrade. 장기적으로 Node port 평가(비약속) |
| native vs subprocess 증거 혼동 | host-native 좌석 receipt는 host 소유로 구분, 감독기 receipt와 병기 금지 |
| deep-review 신뢰 경계 | resolver-only 한정, admission·floor 불변 (D8) |
| 실험 재현성(evolve) | route freeze + epoch provenance (P4) |
| deep-work 의미론 변화 | shadow 기간 dispatch 불변 + exit-0 fail-safe 유지 (D12) |
| 크로스 패밀리 기본 바인딩 | `local_policy.allowed_families` — native Agent 소비자는 `[claude]` (§4) |

## 9. 비범위 / 미증명 (구현 단계에서 acceptance evidence로 확보)

- `deep-model-router` 패키지의 실제 설치 성공(양 런타임 end-to-end)
- Claude dependency 자동설치 + Codex INSTALLED_BY_DEFAULT의 live 호환성
- 전 sibling 태스크 분류 ↔ RouteRequestV1의 의미적 동치(어휘 매핑은 R1 §6 초안을 출발점으로, shadow 데이터로 보정)
- native Agent/multi_agent 수명주기의 감독기 수준 종료 증명 · 원격 provider-side termination · Windows dispatch

## 10. 근거

- 재실측: §1.2 표 전체(2026-08-16). pytest `213 passed in 62.44s` @ 6d12225.
- 공식 문서: plugin-dependencies("or in its marketplace entry", `{plugin}--v{version}`, `claude plugin tag`), plugin-marketplaces, skills.
- 입력 리서치: `docs/research/` 3편 — 각 문서의 파일:라인 근거 목록은 해당 문서 §근거 절 참조.

---

## 11. 리뷰 보강 — 규범 확정 (2026-08-16)

HIGH 밴드 독립 리뷰 2석. `review_independence: planned` → 브리지 프로세스 2개(`claude -p` / `codex exec`)로 실행, receipt `design-r1-fable-retry` · `design-r2-sol` (`schema_valid: true`). 판정 좌석은 양 리뷰어보다 약하지 않은 미사용 모델이 없어 `judge_unavailable` — 오케스트레이터가 쟁점별로 채택/기각했다.

| 쟁점 | R1 (fable) | R2 (sol) | 판정 |
|---|---|---|---|
| 단조 병합 격자 | high | critical | **high 채택** — 미지정이지, 설계가 floor를 낮추라고 지시하지는 않음. §11.1이 격자를 닫는다 |
| exit 0–5 + degrade 경계 | high | critical | **high 채택** — 어댑터 표 누락. 설계는 silent-main을 금지한다. §11.3 |
| plugin-count `ten` | medium | critical | **medium/high** — P1 게이트 불완전. 안전 하한 붕괴는 아님. §11.6 |
| RouteRequestV1 ↔ CLI | high | high | **채택** §11.2 |
| policy_sha256 정규화 | high | high | **채택** §11.4 |
| CLI locator | (미제기) | high | **채택** §11.5 |
| P2 삽입 좌표 | medium | high | **채택** §11.7 — R2의 실측 좌표를 정본으로 |
| D8 mutation surface | (부분) | high | **채택** §11.8 |
| gemini dispatch 범위 | medium | high | **채택** §11.9 — unbound / resolver-only |
| D11 producer/path | (미제기) | high | **채택·정정** §11.10 — 스키마 소유 ≠ envelope producer |
| GitHub rename 순서 | medium | medium | **채택** §11.11 |
| P1 dependencies 범위 | (미제기) | medium | **채택** §11.11 — P2 소비자만 |

R2의 `FAIL`은 위 항목을 critical로 올린 결과다. 안전 하한 하락이 설계에 내장된 곳은 없으므로 종합 판정은 **PASS_WITH_CHANGES**. 본 절을 반영하면 P0–P2 구현 계획을 쓸 수 있다.

### 11.1 단조 병합 격자

**집행 주체:** 라우터가 `local_policy`를 **모델 resolve 이전**에 집행한다. 소비자 no-downgrade 테스트는 검증만 담당한다(이중 구현 금지, 이중 검증 허용).

| 필드 | 격자 | 생략/null | 빈 값 |
|---|---|---|---|
| `minimum_effort` | `effort_levels` 순서의 max (`MINIMAL < … < MAX`, `config/model-routing.yaml` `effort_levels`) | 제약 없음 | 제약 없음과 동일 |
| `minimum_capability_tier` | 정수 max | 제약 없음 | 제약 없음과 동일 |
| `minimum_reviewers` | 정수 max | 제약 없음 | 제약 없음과 동일 |
| `minimum_provider_families` | 정수 max | 제약 없음 | 제약 없음과 동일 |
| `allowed_families` | **교집합** (max 아님) | 추가 제약 없음 | **충족불능** — "임의 family"로 해석 금지 |

충족불능(교집합 공집합, 좌석 수/패밀리 수 미달, 선택된 모델의 `effort_ceiling`이 merged `minimum_effort` 미만)은 실행 가능한 라우트가 아니다. 기존 terminal `INDEPENDENCE_UNAVAILABLE`을 재사용하거나, 로컬 제약이 원인일 때는 `UNSATISFIABLE_LOCAL_POLICY`를 emit한다. **exit 1.** degrade로 약한 경로를 열지 않는다.

RouteDecisionV1에 다음을 추가한다:

```yaml
effective_policy:                 # 병합된 floor (라우터가 집행한 값)
  minimum_capability_tier:
  minimum_effort:
  minimum_reviewers:
  minimum_provider_families:
  allowed_families: []
selected_capability_tier:         # resolve된 워커 모델의 레지스트리 값
selected_families: []             # 워커+리뷰어 resolve family 집합
local_policy_applied: true|false
```

### 11.2 RouteRequestV1 전송

기존 플래그 표면은 유지한다. RouteRequestV1 전체는 **`--request-json <file>`** 한 경로로만  Nested 객체를 받는다. `--format json`은 **출력** 전용. 현행 `--json` 입력 가드가 미지 필드를 거부하는 동작은 유지하되, `--request-json` 스키마는 V1 필드를 허용한다.

| RouteRequestV1 | CLI |
|---|---|
| `route_schema_version` | `--request-json` 필수. 미지원 버전 → **exit 2** |
| `task_class` 및 4차원 · `reasoning_centric` · `flags` · `runtime` | 기존 플래그와 동일. request-json과 플래그가 동시에 오면 request-json이 이긴다 |
| `prior_failures: [model_id…]` | 내부적으로 `--prior-failures N` + `--prior-models`로 번역. 카운트/리스트 길이 불일치 → exit 2 |
| `availability_snapshot` | 아래 스키마. 라우터가 추측하지 않는다 |
| `local_policy` | `--request-json` only. §11.1로 집행 |
| 미지 필드 (top-level 또는 snapshot 중첩) | exit 2 |

`availability_snapshot` 스키마(추가 키 금지):

```yaml
unavailable_roles: []     # → --unavailable
unavailable_models: []    # → --unavailable-models
isolation: available|unavailable   # 생략 가능. → --isolation
isolation_evidence: []    # → --isolation-evidence. isolation 없이 evidence만 있으면 exit 2
```

우선순위: `--request-json` > 개별 플래그. `--request-json`과 레거시 `--json`(Task)이 같이 오면 `--request-json`이 요청 필드를 이긴다. `--json`은 계속 Task 공개 필드만 받고 미지 필드를 거부한다.

P0.2 범위는 identity 3필드 + `allowed_families`가 아니라 **RouteRequestV1 전 필드 수용 + Decision identity + effective_policy emit** 이다.

### 11.3 Exit-code 어댑터 (0–5)

라우터 계약은 이미 0/1/2/3/4/**5**다 (`route_task.py` docstring). 소비자 번역:

| exit / 증상 | 의미 | 소비자 |
|---|---|---|
| 0 | 문서대로 dispatch 가능 | 결정 소비. `dispatch_authorized: true` |
| 1 | terminal — 실행할 라우트 없음 | HIGH/CRITICAL(로컬 분류 또는 직전 완전 결정의 band) → **차단**. LOW/MEDIUM만 local-fallback |
| 2 | invalid input | 1과 동일 |
| 3 | dispatch 전 human gate | **degrade 금지.** gate를 전파 |
| 4 | 지금 실행, 사후 확인 | **degrade 금지.** 실행 + 사후 확인 의무 |
| 5 | 내부 오류 (라우트 결과가 아님) | 2와 동일 |
| 실행 파일 부재 · 비-JSON · 미지원 schema · digest 불일치 · 시그널 | 라우트 없음 | 2와 동일 |
| spawn 실패 · permission 거부 · timeout/deadline · 빈/잘린 stdout · 0–5 밖 exit · `dispatch_agent` `TERMINATION_UNCONFIRMED` | 라우트 없음 (`status: internal` 또는 `unavailable`) | 2와 동일. `dispatch_authorized: false`. `TERMINATION_UNCONFIRMED` 뒤에는 write-capable retry 금지 |

소비자 fail-safe JSON(특히 deep-work `model-routing-cli.js`의 exit-0 계약)에 남길 필수 필드:

```yaml
dispatch_authorized: true|false
status: ok|terminal|invalid|human_gate|deferred_confirm|internal|unavailable
degrade_reason: null | <string>
risk_band: LOW|MEDIUM|HIGH|CRITICAL|null
local_floor_applied: {}
routing_provenance: router | local-fallback
```

**P2a 한정:** 권위 경로는 현행 `model-routing-cli.js` 그대로(exit 0 + fail-safe `main`)다. 라우터 결과는 `router_shadow`에만 기록한다. 본 어댑터 표는 **라우터를 권위로 소비하는 시점**(P2b 라이브, P2a 이후 parity 합의)부터 강제한다. HIGH/CRITICAL shadow 실패를 권위 경로의 성공으로 **표시**하는 것도 금지 — shadow 객체에 오류를 그대로 남긴다.

### 11.4 `policy_sha256`

- **입력 집합:** `skills/model-router/config/model-routing.yaml` 하나. `agents/openai.yaml`은 포함하지 않는다.
- **정규화:** YAML `safe_load` → JSON (`sort_keys=true`, `separators=(',', ':')`, `ensure_ascii=true`) → UTF-8 → SHA-256 hex.
- **소비자 비교:** 세션 최초 관측 digest를 freeze. 이후 불일치 = 정책 변동 → 재라우트 또는 degrade(§11.3의 2와 동일). 플러그인 버전 핀은 "같은 `router_plugin_version`이면 digest가 같아야 한다"는 추가 검사다.
- 골든 픽스처를 라우터 테스트에 둔다(플랫폼 개행에 흔들리지 않게 정규화 후 해시).

### 11.5 호스트 중립 locator

개인 심링크와 `../deep-model-router` 소스 체크아웃 import는 금지(§3.1 유지).

탐색 순서:

1. `DEEP_MODEL_ROUTER_CLI`가 실행 파일이면 그것.
2. 호스트 플러그인 매니저가 `deep-model-router` 설치 루트를 알려 주면 `$ROOT/skills/model-router/scripts/route_task.py`.
3. 알려진 캐시 레이아웃만 탐색: Claude `~/.claude/plugins/cache/**/deep-model-router/<ver>/`, Codex 동등 경로. **소스 워크스페이스는 후보가 아니다.**
4. 실패 → python3 부재와 동일하게 §11.3 unavailable.

첫 호출 전 `python3` 존재 확인. 테스트: installed / disabled / missing / auto-install-failed. 개발·CI는 `DEEP_MODEL_ROUTER_CLI`만 사용한다.

### 11.6 P1 plugin-count

`WORD_TO_NUM.ten`만으로는 부족하다.

- probe alternation은 `WORD_TO_NUM` 키에서 생성한다(`ten` 누락 시 sensor dead-green 금지).
- `TOTAL` 타깃 전부의 내러티브(`README.md` / `README.ko.md` / `guides/context-management.md` / `guides/context-management.ko.md` / `guides/hook-patterns.md` / `guides/hook-patterns.ko.md` 등 현행 `nine`)를 함께 갱신한다.
- 회귀 픽스처: 단어 `ten`이 실제로 매치되는지, 남은 `nine`이 실패하는지.

### 11.7 P2 삽입 좌표

**P2a deep-work (shadow, 권위 불변)**

| 호출점 | 좌표 |
|---|---|
| 세션 초기 routing | `deep-work/skills/deep-work-orchestrator/SKILL.md` §1-8.5 2단계, `scripts/model-routing-cli.js` 호출 **직후** |
| research 재계산 | `deep-work/skills/deep-research/SKILL.md`의 `model-routing-cli.js` 호출 직후 |

- 권위 출력 `MR_OUT`은 바이트 단위로 현행과 동일하게 dispatch/state에 들어간다.
- 라우터 관측은 `model_routing_meta_json.router_shadow`에만 기록한다(phase-guard/dispatch가 읽지 않는 새 키).
- 기록: 입력 해시, RouteDecisionV1 identity, selected model/effort/review vs 구 결정, downgrade 여부, latency, exit, `dispatch_authorized`.
- pin·methodology floor·brainstorm/plan `main` 고정은 그대로 권위.

**P2b deep-loop (라이브, 신규 에피소드만)**

| 역할 | 좌표 | 순서 |
|---|---|---|
| maker | `deep-loop/skills/deep-loop-continue/SKILL.md` `dispatch_maker` | `adapter resolve` **이후**, `episode record --status in_progress` **이전** |
| checker | 같은 파일 `dispatch_checker` | Route A/B/C 선택 후, 실제 spawn **이전**. maker와 별도 route |

- 성공한 결정을 episode durable 필드 `routing`에 **원자적으로** 고정한다. 최소 키: `request`, `decision` identity 3필드, `selected_model`, `selected_effort_native`, `effective_policy`, `provenance`.
- **Maker 기록 API:** `recordEpisode` (`scripts/lib/episode.mjs`)와 CLI `episode record`를 확장한다. `--status in_progress --routing '<json>'`만 허용. 같은 `appendAnchored` `episode-record` 트랜잭션에서 `ep.routing`을 쓴다. `ep.routing`이 이미 있으면 거부(불변). `--routing` 없이 in_progress는 현행 동작(degrade).
- **Checker 기록 API:** `dispatchReview` (`scripts/lib/review.mjs`)와 CLI `review dispatch --routing '<json>'`를 확장한다. `newEpisode`가 checker를 만들 때 `routing`을 함께 심는다. 생성 후 `recordEpisode`로 routing을 추가하는 경로는 두지 않는다.
- resume/retry/fix 리더는 `episode.routing`이 있으면 그것만 소비하고, 없으면 현행 `session_profile` 전파로 degrade한다. 실행 중 재라우트 금지.
- 라우터 부재·§11.3 degrade 허용 밴드 → 현행 단일 전파.
- HIGH/CRITICAL에서 라우터 실패 → in_progress로 올리지 않고 `await_human`.

### 11.8 D8 resolver-only mutation surface

라우팅은 로컬 role / rubric / wave / admission 선택 **이후**다.

| 변경 가능 | 변경 금지 |
|---|---|
| 이미 고른 role의 구체 model id | 좌석 추가·삭제·라벨 변경 |
| native effort 철자 · ceiling clamp | provider family 변경 (로컬 planner가 명시 허용한 경우만 예외) |
| 동일 family generic fallback | rubric · admission · mutation fingerprint |
| provenance | critical floor (3 reviewers / 2 families) 하향 |

동일 provider 모델을 못 구하면 운영 실패이지 family 전환이 아니다. 테스트는 roles·rubrics·admission·reviewer count·provider-family count가 입출력에서 불변임을 증명한다.

### 11.9 D10 gemini — unbound family

P0는 gemini를 **등재만** 한다. dispatch 후보가 아니다.

- `effort_map`에 `gemini` 키를 넣는다(현행 invariant: `effort_map` 키 집합 = 레지스트리 family 집합).
- 모델 row에 `dispatchable: false` (또는 동등). `role_bindings`·fallback 리스트·reviewer 후보에 넣지 않는다.
- transport mechanism은 P0에 정의하지 않는다.
- 검증 원장 프로브 후 `verified`만 기록. 구체 ID·tier·ceiling·effort 토큰은 프로브 결과로 채운다.
- family-completeness 테스트는 "unbound family는 effort_map만 있고 binding에 없다"를 추가로 고정한다.

### 11.10 D11 envelope 소유권

- 스키마 정본: `schemas/payload-registry/deep-model-router/routing-decision/v1.0.schema.json` (P1 선등록).
- `envelope.producer`는 **파일을 쓰는 플러그인**이다. 라우터는 P0–P2에서 envelope를 쓰지 않는다.
- P2a/P2b는 먼저 기존 durable 객체에 payload를 임베드한다(work `router_shadow`, loop `episode.routing`).
- standalone envelope는 해당 소비자 단계에서 `schemas/payload-registry/<writer>/routing-decision/v1.0.schema.json`을 정본 `$ref`로 추가한 뒤에만 발행한다.
- payload는 RouteDecisionV1 + `effective_policy` + 소비자 merge 결과 + 있으면 dispatch `attempt_id`. 실행 receipt와 결정을 한 증거로 합치지 않는다.

### 11.11 로드맵 재배열

**P0 (로컬, GitHub rename 없음)**  
레이아웃 `skill/` → `skills/model-router/` · 양쪽 plugin manifest · §11.1–11.5·11.9 구현+테스트 · `claude plugin validate .` · SemVer `1.0.0`.

**P0→P1 게이트 (원격)**  
GitHub rename `Sungmin-Cho/model-router` → `Sungmin-Cho/deep-model-router` · origin 갱신 확인 · `deep-model-router--v1.0.0` 태그.

**P1**  
10번째 엔트리(동일 SHA) · Codex는 router만 `INSTALLED_BY_DEFAULT` · §11.6 · sidecar 순서 일치 + `x-model-routing` · **Claude `dependencies`는 P2 소비자만** (`deep-work`, `deep-loop`) · §11.10 스키마 선등록 · `docs:write` → `preflight` → isolated Codex 스모크 · 가이드 라우팅 섹션(bilingual).

**P2**  
§11.7 좌표로 병렬. P3+는 본 설계 §5·§6과 동일하되 D8은 §11.8을 따른다.
