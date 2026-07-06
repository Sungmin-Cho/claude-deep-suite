[English](./context-management.md)

# Deep Suite Context Management 정책

이 문서는 **compaction**, **output offloading**, **full context reset** 의 세 가지 — 장시간 실행 작업에서 agent 추론 품질을 보존하는 핵심 레버 — 에 대한 suite 차원 정책을 정리한다. Addy Osmani 와 Anthropic 팀이 long-running agent 의 반복적인 실패 모드로 명시한 영역; Deep Suite 는 9개 플러그인이 일관되게 동작하도록 정책을 여기로 모은다.

이 정책은 runtime-neutral 하다. Claude Code와 Codex 모두 context pressure를 견디기 위해 durable artifact에 의존한다. 다만 runtime별 trigger는 다르므로, 이 문서에서 Claude Code hook 또는 auto-compaction을 언급하는 부분은 그 메커니즘이 실제 이벤트 소스인 경우로 한정된다.

> Schema: `schemas/compaction-state.schema.json`. Producer 들은 envelope-wrapped compaction-state artifact 를 emit 해 dashboard (`claude-deep-dashboard`) 가 `suite.compaction.frequency` 와 `suite.compaction.preserved_artifact_ratio` (M4-deferred 메트릭) 를 집계할 수 있게 한다.

---

## 1. 네 가지 정책 한 표로

| 정책 | 트리거 | 동작 | Artifact |
|---|---|---|---|
| **1. Compaction** | Phase 전환, slice GREEN, loop epoch 종료, window >80% | 중간 transcript 폐기; 명명된 artifact 만 보존 | `compaction-state.json` emit |
| **2. Output offloading** | 큰 tool output (sensor, search, test run) | `.deep-<plugin>/<session>/...` 로 디스크 기록; working memory 에는 요약만 | receipt 의 path reference |
| **3. Full reset** | Cross-plugin handoff, >24h dormancy, retry recovery | 새 세션, 사전 context 없음; artifact 만으로 재구성 | `handoff.json` 이 유일한 다리 |
| **4. Compaction-state artifact** | 정책 1 발동 시마다 | Compaction 이벤트를 envelope wrap → dashboard 가 consume | `compaction-state.json` (본 schema) |

네 정책은 합성된다: Phase 5 → evolve handoff (정책 3) 은 보통 `compaction-state` artifact (정책 4) 를 포함하여 무엇이 보존됐는지 (정책 1) 를 기록하고, 그것은 일찍이 offload 된 (정책 2) receipt/artifact 들을 가리킨다.

---

## 2. 정책 1 — Compaction 트리거

플러그인은 다음 경계 중 하나에서 compaction 한다. **권장 동작** 컬럼은 기본값 — `hooks_intentionally_empty_reason` 또는 sidecar 의 동등 필드에 문서화되면 deviation OK.

| 트리거 | 권장 동작 | 왜 |
|---|---|---|
| **Phase 전환** (deep-work 의 Research → Plan → Implement → Test → Integrate) | 경계에서 manual compaction; Phase artifact (research.md, plan.md, ...) 가 다음 Phase 의 유일한 입력. | 각 Phase 의 working memory 가 다음 Phase 를 오염; Phase artifact 가 큐레이션된 handoff. |
| **Slice GREEN** (TDD slice 의 RED → GREEN → REFACTOR 직후) | Inline compaction: slice 의 RED/REFACTOR 대화 폐기; slice receipt 만 보존. | RED-cycle 탐색은 slice 경계 너머에서 거의 무용. |
| **Loop epoch 종료** (deep-evolve epoch 종료) | Full handoff + reset 권장 (정책 3). | Epoch 는 설계된 경계; receipt + insights 가 무엇을 기억할지 요약. |
| **Window > 80%** | Auto compaction (Claude Code 기본). 이 트리거에서 `compaction-state.json` 을 emit 해 dashboard 가 빈도를 surface 하도록 권장. | Hard cap. Dashboard 의 `suite.compaction.frequency` 메트릭이 여기서 가장 actionable — 이 트리거에 자주 도달하는 세션은 scope creep 의심. |
| **Stop hook** | 선택적 compaction (serialize-on-stop, 예: long async work). | 다음 세션이 디스크 state 에서 resume 할 때만 유용; 그렇지 않으면 receipt 가 cover. |

### Compaction 전략 (`compaction-state.compaction_strategy`)

| 전략 | 보존되는 것 | 폐기되는 것 |
|---|---|---|
| `key-artifacts-only` | `preserved_artifact_paths[]` 의 artifact 경로; 그 외 중간 state 없음. | Tool-call trace, 중간 edit, 탐색. |
| `receipt-only` | Session/slice receipt. | 그 외 모든 것. |
| `summary-only` | Producer 가 작성한 자연어 요약. | 요약 외 모든 것. |
| `selective-message-drop` | Producer 가 선택한 핵심 turn. | 그 외 turn. |
| `full-reset` | Working memory 비움; state 는 디스크의 receipt 에. | 모든 것. |
| `custom` | Producer 정의. | Producer 정의. |

deep-work Phase 전환 기본값: `key-artifacts-only`. deep-evolve epoch 종료 기본값: `receipt-only` (evolve-receipt 가 포괄적이므로).

---

## 3. 정책 2 — Output offloading

큰 output 은 working memory 에 두면 context 를 오염시킨다. Suite 기본: **디스크에 쓰고, receipt 에는 path + 한 줄 요약만 유지**.

| Output 종류 | Offload 위치 | Receipt 요약 |
|---|---|---|
| Sensor 결과 (eslint, tsc, coverage) | `.deep-<plugin>/<session>/sensors/<sensor>.txt` | 한 줄: pass/fail + count |
| Test runner output (전체) | `.deep-<plugin>/<session>/test-output.txt` | 한 줄: pass/fail count + duration |
| Search / grep 결과 | 1회 사용 후 폐기; cross-reference 되는 경우만 archive | n/a |
| 큰 diff 또는 patch | 이미 git 에 있음; receipt 가 commit SHA 참조 | sha + 1-line scope |
| Wiki page 내용 | 이미 `<wiki_root>/pages/<page>.md` 에 있음; receipt 가 path 참조 | path + 1-line topic |

**패턴**: receipt 는 index, offload 된 파일은 저장소. 미래 reader (deep-review, deep-dashboard) 가 index 에 grep 해 가져올 가치 있는 것을 찾는다.

**안티패턴**: 원본 tool output 을 Slack-style 요약 로그에 붙여넣기. 슬롯이 작아 더 유용한 context 를 evict 한다.

---

## 4. 정책 3 — Full reset

다음 경우 full context reset (새 세션, 사전 transcript 없음) 이 적절:

1. **Cross-plugin handoff** — deep-work → deep-evolve, 또는 deep-evolve → deep-work. Handoff artifact (`handoff.json`, `guides/long-run-handoff.ko.md` 참조) 가 유일한 다리; receiver 는 sender 의 중간 state 를 재구성하려 하지 말 것.
2. **Dormant >24h** — idle 상태였던 세션 재개 시 사전 context 가 stale (코드베이스가 변했고 의존성이 업데이트됐을 수 있다). 이전의 `handoff.json` 또는 `session-receipt.json` 을 canonical resume state 로 취급; 그 외엔 fresh.
3. **Validation 실패 후 retry** — receipt 가 validation 에 실패 (예: refactor 후 schema mismatch) 하면 retry 는 clean 으로 시작; 오염된 context 를 "고치려" 하지 말 것.

회복 면 (recovery surface) 은 handoff: clean 세션이 `payload.summary` + `payload.key_artifacts[]` + `payload.next_action_brief` 로 context 를 완전히 재구성할 수 있다.

---

## 5. 정책 4 — Compaction-state artifact

정책 1 이 발동하면 producer 는 dashboard consumption 용 `compaction-state.json` artifact 를 emit 해야 한다:

```json
{
  "$schema": "https://raw.githubusercontent.com/Sungmin-Cho/claude-deep-suite/main/schemas/artifact-envelope.schema.json",
  "schema_version": "1.0",
  "envelope": {
    "producer": "deep-work",
    "producer_version": "6.5.0",
    "artifact_kind": "compaction-state",
    "run_id": "01HX2VR8...",
    "parent_run_id": "01HX2VR8...",
    "generated_at": "2026-05-11T15:30:00Z",
    "schema": { "name": "compaction-state", "version": "1.0" },
    "git": { "head": "abc1234", "branch": "main", "dirty": false },
    "provenance": { "source_artifacts": [], "tool_versions": {"node": "20.11.0"} }
  },
  "payload": {
    "schema_version": "1.0",
    "compacted_at": "2026-05-11T15:30:00Z",
    "trigger": "phase-transition",
    "session_id": "2026-05-11-142500-jwt-middleware",
    "preserved_artifact_paths": [
      ".deep-work/2026-05-11-142500-jwt-middleware/research.md",
      ".deep-work/2026-05-11-142500-jwt-middleware/plan.md"
    ],
    "discarded_summary": "Phase 1 Research 탐색: 23 tool calls, ~18k tokens.",
    "pre_compaction_tokens": 84500,
    "post_compaction_tokens": 22300,
    "compaction_strategy": "key-artifacts-only"
  }
}
```

Dashboard 의 `lib/suite-collector.js` 가 filesystem scan 으로 이를 발견 (cross-plugin shared payload 는 registry 등록 불필요, `schemas/README.md` 참조). 계산:

- `suite.compaction.frequency` = 세션당 / producer 당 `compaction-state.json` artifact 수
- `suite.compaction.preserved_artifact_ratio` = `len(preserved_artifact_paths) / (len(preserved_artifact_paths) + len(discarded_artifact_paths))`

`discarded_artifact_paths` 가 생략되면 dashboard 는 해당 artifact 의 `preserved_artifact_ratio` 를 undefined 로 취급해야 한다 (zero 가 아닌); dashboard 의 M4-deferred 메트릭 계산 디테일 참조.

---

## 6. 각 플러그인의 현재 위치

| 플러그인 | 정책 1 (compaction) | 정책 2 (offloading) | 정책 3 (full reset) | 정책 4 (artifact emit) |
|---|---|---|---|---|
| **deep-work** | Phase 전환 (manual), slice GREEN (inline) | Sensor output 을 `.deep-work/<session>/sensors/` | `/deep-finish` 가 세션 종료; handoff.json 이 다음으로 bridge | M5.7+ (per-plugin PR) |
| **deep-evolve** | Epoch 종료 (full handoff) | Forum / receipt 을 `.deep-evolve/<session>/` | `--resume-from-handoff` 가 canonical resume | M5.7+ |
| **deep-wiki** | 묵시적 (각 ingest 가 자체 short session) | Wiki content 를 `<wiki_root>/pages/` | n/a (long-run loop 없음) | optional |
| **deep-review** | n/a (single-pass reviewer) | Report 를 `.deep-review/reports/` | 각 호출이 독립 | n/a |
| **deep-docs** | n/a (single-pass garden) | Scan 을 `.deep-docs/last-scan.json` | 각 호출이 독립 | n/a |
| **deep-dashboard** | n/a (read-only consumer) | n/a | n/a | 타 producer 의 compaction-state 를 **consume** |

deep-review, deep-docs, deep-dashboard 가 `hooks_active: []` 를 ship 하는 이유와 동일 — 이들은 설계상 single-invocation 이므로 compaction 정책이 불필요.

---

## 7. 안티패턴

| 안티패턴 | 왜 나쁜가 |
|---|---|
| 모든 tool call 마다 적극 compaction | 너무 많은 context 손실; 후속 단계가 방금 발견한 것을 재탐색. |
| 절대 compaction 안 하고 Claude 의 80% auto-compaction 에 의존 | Auto-compaction 은 opportunistic 하고 어떤 artifact 가 중요한지 모름; 보존 state 품질 예측 불가. |
| 디스크 offload 후 receipt 에 path 미참조 | 미래 reader 가 거기 볼 줄 모름; offload 가 보이지 않음. |
| "context 가 길다" 이유로 세션 중간 full-reset | Live working memory 를 불필요하게 폐기; receipt 가 in-flight intent 를 못 잡았을 수 있음. Reset 은 진짜 경계용. |
| `parent_run_id` chain 없이 compaction-state emit | Dashboard 가 compaction 을 원 세션에 attribute 못 함. |
| Receipt 먼저 안 쓰고 `compaction-state.compaction_strategy: "full-reset"` 사용 | Receiver 가 읽을 게 없음; reset 이 손실 (lossy). (참고: `full-reset` 은 `compaction-state.json` payload 에서만 유효 — `handoff.json` 의 `context_window_state.compaction_strategy` 는 이 값을 의도적으로 제외; 비슷한 모양을 표현하려면 `"summary-only"` 또는 `"receipt-only"` 사용.) |
| 모든 tool call 마다 `compaction-state.json` emit (over-instrument) | Dashboard 잡음 증식; 진짜 경계에서만 emit. |

---

## 8. 빠른 레퍼런스

| 필드 | 필수 | 노트 |
|---|---|---|
| `schema_version` | yes | locked `"1.0"` |
| `compacted_at` | yes | RFC 3339 |
| `trigger` | yes | enum (6종) |
| `preserved_artifact_paths[]` | yes | 빈 배열 = full reset |
| `session_id` | no | dashboard per-session grouping 에 권장 |
| `discarded_artifact_paths[]` | no | `preserved_artifact_ratio` 계산 입력 |
| `discarded_summary` | no | audit-only |
| `pre_compaction_tokens` | no | producer-side 추정 |
| `post_compaction_tokens` | no | producer-side 추정 |
| `compaction_strategy` | no | enum (6종) |

---

## 9. 더 읽기

- `schemas/compaction-state.schema.json` — authoritative schema
- `guides/long-run-handoff.ko.md` — long-run 의 handoff 쪽 (`context_window_state` 의미 공유)
- `guides/hook-patterns.ko.md` §3.4 — Stop hook 에서 `compaction-state.json` emit
- `docs/envelope-migration.md` §6 — adoption ledger (각 플러그인이 언제 emit 시작하는지)
- `docs/deep-suite-harness-roadmap.md` §M5 — 설계 근거 (Addy Osmani context-management 참조)

---

> *M5 milestone artifact. Schema v1.0 locked; additive 진화는 `x-*` 확장 키.*
