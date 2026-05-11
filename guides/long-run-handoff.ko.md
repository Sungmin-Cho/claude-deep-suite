[English](./long-run-handoff.md)

# Deep Suite Long-Run Handoff 가이드

이 문서는 **handoff artifact** — 한 Deep Suite 플러그인이 자연스러운 일시정지 지점에 도달했을 때 emit 하여 다른 플러그인이 작업을 이어받게 하는 표준화된 payload — 의 설계와 사용법을 정리한다. Canonical 시나리오는 **deep-work Phase 5 (Integrate) → deep-evolve outer loop** 이지만, 같은 artifact 가 임의의 cross-plugin / cross-session 연속 작업에도 쓰인다.

> Schema: `schemas/handoff.schema.json`. M3 [artifact-envelope](../docs/envelope-migration.md) 으로 감싼다 (`envelope.artifact_kind = "handoff"`, `envelope.schema = { name: "handoff", version: "1.0" }`).

---

## 1. Handoff vs receipt vs wiki page

Handoff 와 인접한 세 가지 artifact 가 이미 존재한다. 어떤 것을 쓸지:

| Artifact | 목적 | Consumer 모델 |
|---|---|---|
| **`session-receipt.json`** (deep-work) | "이 세션이 무엇을 어떻게 달성했는가." | 읽기 전용 audit; deep-review 와 dashboard 가 consume. |
| **`evolve-receipt.json`** (deep-evolve) | Evolve epoch scope 의 동일한 의미. | 동일. |
| **wiki page** (deep-wiki) | 세션이 끝나도 살아남는 durable, refactor-friendly 지식. | 미래 세션이 context 로 읽는다. |
| **`handoff.json`** (본 문서) | "여기서 멈췄으니 *다음 agent* 가 이걸 해야 한다. 그리고 이미 한 일은 이렇다." | 다음 agent 의 active *trigger*. `intent` + `next_action_brief` 가 수신자의 seed prompt 가 된다. |

Handoff 는 **연속성 지향 (continuation-oriented)** 이다. 과거를 문서화하는 receipt 나 지식을 보존하는 wiki page 를 대체하지 않고, 그 사이에 **바통 (baton)** 으로 위치한다.

---

## 2. Handoff envelope 한눈에

```json
{
  "$schema": "https://raw.githubusercontent.com/Sungmin-Cho/claude-deep-suite/main/schemas/artifact-envelope.schema.json",
  "schema_version": "1.0",
  "envelope": {
    "producer": "deep-work",
    "producer_version": "6.5.0",
    "artifact_kind": "handoff",
    "run_id": "01HX2VR8ABCDEFGHJKMNPQRSTW",
    "parent_run_id": "01HX2VR8ABCDEFGHJKMNPQRSTV",
    "generated_at": "2026-05-11T16:20:00Z",
    "schema": { "name": "handoff", "version": "1.0" },
    "git": { "head": "abc1234", "branch": "main", "dirty": false },
    "provenance": { "source_artifacts": [...], "tool_versions": {"node": "20.11.0"} }
  },
  "payload": {
    "schema_version": "1.0",
    "handoff_kind": "phase-5-to-evolve",
    "from":   { "producer": "deep-work", "session_id": "...", "phase": "integrate", "completed_at": "..." },
    "to":     { "producer": "deep-evolve", "intent": "performance-optimization", "scope_hint": "src/auth/jwt.ts" },
    "summary": "JWT 미들웨어 PR #123 머지. 8/8 slices GREEN.",
    "key_artifacts":     [ { "path": "...", "kind": "session-receipt", "run_id": "..." } ],
    "open_questions":    [ "Token rotation 전략 미결정" ],
    "completed_actions": [ "merged PR #123" ],
    "next_action_brief": "deep-evolve로 JWT verify 성능 최적화 — current p99=180ms, target <50ms ...",
    "context_window_state": { "compacted_at": "...", "compaction_strategy": "key-artifacts-only", "preserved_artifact_paths": [...] }
  }
}
```

Envelope 은 cross-plugin trace 메타데이터를, payload 는 handoff intent 를 담는다. 수신 agent 는 `next_action_brief` 를 *seed prompt* 로 — 명확하고 구체적이며 측정 가능한 target 을 포함한 — 읽는다.

---

## 3. `handoff_kind` — 시나리오 5종

| Kind | Producer → Consumer | 트리거 예시 |
|---|---|---|
| `phase-5-to-evolve` | deep-work Phase 5 (Integrate) → deep-evolve outer loop | "기능 머지 완료. 이제 더 빠르게 / 안전하게 / 테스트 강화하라." |
| `evolve-to-deep-work` | deep-evolve epoch 종료 → deep-work | "Evolve 가 점수 X 에서 plateau. 추가 개선엔 구조적 refactor 필요." |
| `slice-to-slice` | deep-work slice N → slice N+1 (같은 세션, compaction 후) | 드묾. 보통 slice receipt 가 연속성을 cover. Compaction 이 대부분의 context 를 버린 경우에 사용. |
| `session-resume` | 어떤 플러그인 세션 → 같은 플러그인의 새 세션 | Dormant 세션 (>24h) 재개; 새 context reset 용 직렬화된 상태. |
| `custom` | producer 정의 | `x-handoff-subkind` 확장 키로 구체화. |

`custom` 은 escape hatch — 시나리오가 표준 4종과 안 맞으면 `custom` + `x-handoff-subkind` 확장 키 조합을 쓴다. 비용: downstream tooling (dashboard, validator) 이 opaque 로 취급.

---

## 4. Canonical 시나리오 — deep-work Phase 5 → deep-evolve

M5 spec 이 명시적으로 호명한 시나리오. 단계별로:

### 4.1 Phase 5 가 handoff 발행

deep-work 가 Phase 5 Integrate 에 도달했고, 사용자가 `/deep-finish` 대신 deep-evolve 로 넘기는 옵션을 선택:

1. Phase 5 가 payload 를 계산:
   - 세션의 `session-receipt.json` (`run_id`, 완료된 slice, outcome)
   - Phase 4 Test artifacts (coverage, mutation score, perf baseline 있으면)
   - 리뷰 리포트들 (`.deep-review/reports/<ts>-review.md`)
2. plugin 이 payload 를 envelope 으로 wrap (`scripts/wrap-artifact.js` 또는 자체 emitter)
3. Wrapped artifact 를 `.deep-work/<session>/handoff.json` 에 기록
4. `envelope.parent_run_id` 를 session-receipt 의 `run_id` 로 설정 — trace chain 마무리.

```bash
# deep-work Phase 5 내부 (post-merge)
node "${CLAUDE_PROJECT_DIR}/.claude/plugins/.../wrap-artifact.js" \
  --producer deep-work \
  --kind handoff \
  --schema 'handoff:1.0' \
  --parent-run-id "$(jq -r '.envelope.run_id' .deep-work/$SESSION/session-receipt.json)" \
  --payload-file /tmp/handoff-payload.json \
  --out ".deep-work/$SESSION/handoff.json"
```

### 4.2 Handoff 로부터 deep-evolve 시동

```bash
/deep-evolve --resume-from-handoff .deep-work/2026-05-11-142500-jwt/handoff.json
```

deep-evolve 동작:
1. Handoff envelope 을 읽고 identity triplet 검증 (`producer = deep-work`, `artifact_kind = "handoff"`, `schema.name = "handoff"`, `schema.version = "1.0"` — strict 3-way check, deep-review 의 session-receipt unwrap 패턴 동일).
2. `payload.next_action_brief` 를 추출해 inner loop seed prompt 로 사용.
3. 자기 envelope 의 `parent_run_id` 를 handoff 의 `envelope.run_id` 로 설정 — trace chain 이 이제 3대 (session-receipt → handoff → evolve-receipt) 까지 도달.

### 4.3 Evolve epoch 종료 → 역방향 handoff (선택)

Evolve epoch 종료 (plateau, target 도달, budget 소진) 시 deep-evolve 가 자기 handoff 를 emit 할 수 있다:

```json
{
  "envelope": { "producer": "deep-evolve", "artifact_kind": "handoff", ... },
  "payload": {
    "handoff_kind": "evolve-to-deep-work",
    "from": { "producer": "deep-evolve", "phase": "epoch-3-plateau", "completed_at": "..." },
    "to":   { "producer": "deep-work", "intent": "structural-refactor",
              "scope_hint": "src/auth/jwt.ts:120-145 의 inner verify loop" },
    "summary": "p99 가 180ms → 90ms 로 감소 (target 은 <50ms). 추가 개선은 verify loop 구조 변경 필요 — evolve mutation budget 밖.",
    "next_action_brief": "deep-work 세션으로 src/auth/jwt.ts:120-145 refactor ..."
  }
}
```

이후 사용자 (또는 long-run controller) 가 이 handoff 를 입력으로 deep-work 을 시동한다.

---

## 5. Handoff 수신 — receiver 책임

`--resume-from-handoff <path>` 든 auto-discovery 든 handoff 를 수신한 플러그인은 반드시:

1. **Envelope identity triplet 검증** (`producer`, `artifact_kind`, `schema.name`) — payload 읽기 전. deep-review 의 session-receipt unwrap 패턴 참조.
2. **`payload.summary` 와 `payload.completed_actions` 먼저 읽기** — 이미 한 일을 다시 하지 않도록.
3. **`payload.open_questions` 를 사용자에게 노출** — 자율 동작이면 절대로 unresolved 결정을 silent 로 내리지 말 것.
4. **`payload.next_action_brief` 를 seed prompt 로 사용** — inner agent loop (또는 deep-work 진입 시 Phase 1 Research).
5. **`envelope.parent_run_id` 를 자기 출력에 설정** — handoff 의 `envelope.run_id` 로. Cross-plugin trace 보존.
6. **`payload.key_artifacts` 먼저 읽기** — 추가 context 가져오기 전에. Producer 가 명시적으로 선택한 것들.

`payload.context_window_state.compaction_strategy == "full-reset"` 이면 receiver 는 clean context 로 시작해야 한다 (producer 의 중간 상태를 복원하려 하지 말 것 — producer 가 명시적으로 그러지 말라고 했다).

---

## 6. Compaction 과 handoff 상호작용

Handoff 자체가 어떤 의미에서는 compaction artifact — producer 의 상태를 continuation brief 로 요약한다. 선택적 `payload.context_window_state` 블록은 handoff 직렬화 직전 producer 가 자기 메모리에 한 동작을 기록:

- `compaction_strategy = "key-artifacts-only"` → receiver 는 `preserved_artifact_paths` 를 읽어 full context 확보; producer 는 더 이상 그 외 내용을 "기억" 못 함.
- `compaction_strategy = "summary-only"` → `payload.summary` 만이 context 를 복원.
- `compaction_strategy = "full-history"` → compaction 없음; producer 의 transcript 전체가 메모리 / 복구 가능.
- `compaction_strategy = "receipt-only"` → 링크된 `session-receipt.json` 이 canonical state.

세션 *진행 중* producer 가 dashboard 용으로 emit 하는 standalone `compaction-state.json` artifact 는 `guides/context-management.ko.md` 참조; handoff 의 `context_window_state` 는 같은 아이디어의 handoff 시점 *snapshot* 이다.

---

## 7. Dashboard consumption

Dashboard aggregator (`claude-deep-dashboard`) 가 handoff artifacts 를 consume 해 M4-deferred 메트릭 `suite.handoff.roundtrip_success_rate` 채움:

```
roundtrip_success_rate =
  count(역방향 handoff 또는 매칭 evolve-receipt 가 있는 handoff) /
  count(handoff)
```

Handoff 가 "round-trip" 한다는 것: receiver 가 `evolve-to-deep-work` handoff 를 역방향 emit 하거나, `envelope.parent_run_id` 가 원 handoff 의 `run_id` 로 chain 된 최종 receipt 를 emit 하는 것. 어느 신호든 handoff 가 실제로 consume 된 — 그저 emit 만 된 것이 아닌 — 증거.

Adoption 경로: `docs/envelope-migration.md` §6 의 per-plugin adoption ledger 참조; dashboard 는 producer 2개 (deep-work + deep-evolve) 가 handoff emission 을 ship 한 시점에 이 메트릭을 활성화.

---

## 8. 안티패턴

| 안티패턴 | 왜 나쁜가 |
|---|---|
| 모호한 `next_action_brief` ("더 좋게 만들어") | Receiver 가 측정 가능한 target 을 못 받음; inner loop 가 빠르게 바닥. |
| Handoff 발행 후 `session-receipt.outcome_ref` 에서 링크 안 함 | 미래 reader 가 receipt 에서 handoff 로 항해 불가. Receipt 가 emit 시 `.deep-work/<session>/handoff.json` 을 reference 해야 한다. |
| `to.producer` 를 실제 미설치 플러그인으로 설정 | Receiver 가 픽업 불가; handoff 가 고아 (orphan) 가 됨. 사용자가 canonical fallback. |
| `parent_run_id` chain 누락 | Dashboard 가 lineage 재구성 불가; `roundtrip_success_rate` 가 undercount. |
| 같은 `run_id` 를 emit 마다 재사용 | 각 artifact 는 새 ULID 가 필수. |
| 거대한 `key_artifacts` 리스트 임베드 | Receiver 가 신호를 잡음에 잃음. ≤ 5 정도의 진짜 핵심 경로만; 나머지는 receipt 안에. |
| `custom` 을 `x-handoff-subkind` 없이 사용 | 툴링과 미래의 자기 자신에게 opaque. |

---

## 9. 빠른 레퍼런스

| 필드 | 필수 | 노트 |
|---|---|---|
| `schema_version` | yes | locked `"1.0"` |
| `handoff_kind` | yes | enum (5종) |
| `from.producer` | yes | kebab-case |
| `from.completed_at` | yes | RFC 3339 |
| `to.producer` | yes | kebab-case |
| `to.intent` | yes | short label |
| `summary` | yes | 단일 단락 |
| `next_action_brief` | yes | 측정 가능 target 포함 단락 |
| `key_artifacts[]` | no | repo-relative paths |
| `open_questions[]` | no | 사용자에게 surface |
| `completed_actions[]` | no | 이미 완료된 것 |
| `context_window_state` | no | producer-side compaction snapshot |

---

## 10. 더 읽기

- `schemas/handoff.schema.json` — authoritative schema
- `examples/handoff-phase5-to-evolve/` — 실행 가능 템플릿 (M5.3, 별도 PR)
- `guides/context-management.ko.md` — 짝을 이루는 compaction 정책
- `docs/envelope-migration.md` §6 — adoption ledger
- `docs/deep-suite-harness-roadmap.md` §M5 — 설계 근거

---

> *M5 milestone artifact. Schema v1.0 locked; additive 진화는 `x-*` 확장 키.*
