[English](./context-engineering.md)

# Deep Suite Context Engineering

상시 로드되는 컨텍스트 — `CLAUDE.md`, `AGENTS.md`, 스킬 본문, 스킬 `description` frontmatter — 를 Claude 5세대 모델이 전부 읽을 만큼 작게, 그러면서 load-bearing 한 내용은 하나도 잃지 않을 만큼 조밀하게 유지하는 방법.

출처는 [The New Rules of Context Engineering for Claude 5-Generation Models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models) (Thariq Shihipar, Anthropic, 2026-07-24), deep-dashboard 파일럿(§9)으로 검증했다. 설계 기록: [`docs/superpowers/specs/2026-07-27-context-engineering-refactor-design.md`](../docs/superpowers/specs/2026-07-27-context-engineering-refactor-design.md).

---

## 1. 여섯 가지 규칙

Anthropic은 Claude Code 시스템 프롬프트의 80% 이상을 제거하고도 코딩 평가에서 손실이 없음을 확인했고, 지침을 여섯 개의 뒤집기로 다시 정리했다.

1. 규칙을 준다 → **판단을 위임한다**
2. 예시를 준다 → **인터페이스를 설계한다**
3. 전부 앞에 넣는다 → **점진 공개(progressive disclosure)를 쓴다**
4. 반복해서 말한다 → **도구 설명을 단순하게 둔다**
5. CLAUDE.md 파일에 기억을 둔다 → **auto-memory**
6. 단순한 스펙 → **풍부한 reference**

규칙 1·3·4는 전면 적용한다. 규칙 2는 선별 적용 — 새 코드를 만들어 강제하는 대신, 이미 존재하는 checker나 schema에 텍스트 규칙을 위임하는 경우에만 쓴다. 규칙 5·6은 기능 작업이며 다이어트의 범위 밖이다.

---

## 2. 4-버킷

모든 문단과 지시문을 네 가지 판정 중 하나로 분류한다.

### DELETE

출처·이력 태그(버전 태그, `NO2` 같은 fix ID, spec 절 참조) — 제약 본문은 남기고 꼬리표만 뗀다. 이력은 git과 CHANGELOG 소관이다. 모델이 주변 문맥으로 판단할 수 있는 훈육. 시스템 프롬프트·형제 스킬·suite `CLAUDE.md`가 이미 보장하는 중복. 주석 달린 디렉터리 트리처럼 코드에서 자명한 사실.

deep-dashboard의 26줄짜리 "🚨 CRITICAL — Plugin Update Workflow"는 `marketplace.json`과 suite README를 손으로 고치라고 지시하고 있었다. suite가 이미 `npm run release:bump`로 자동화하고 `version` 필드까지 없앤 뒤였는데도 그랬다. 단순 중복이 아니라 **틀린** 내용이었고, CRITICAL 표시 때문에 올바른 지시보다 더 크게 들렸다. 이것은 `AGENTS.md` §Release의 다섯 줄 포인터와 진짜 예외 하나(§6 8단계)로 대체됐다.

함께 삭제된 것: bar-label → dimension-id → weight 6행 표. 가중치는 `lib/harnessability/checklist.json`의 소관이고, 문서 사본은 조용히 썩는 두 번째 정의이기 때문이다. 반쪽 절 하나만 살아남았다 — "레이블은 `payload.dimensions[].label`의 표시용 축약"이라는, 그 표가 담고 있던 유일한 비-코드 사실.

### KEEP

코드만 봐서는 알 수 없는 제약(`marketplace.json` 수정 금지, `<wiki_root>/` underscore 규칙, 단일-writer 불변식, 멱등성·락 계약), 안전 게이트(phase-guard, TDD 게이트, denylist), 크로스 플러그인 계약(M3 envelope 필드, state file 스키마, `suite-extensions.json` 광고 경로).

KEEP은 그대로 두라는 뜻이 아니다. 파일럿의 "Loaded-SKILL routing handoff" 섹션은 호스트별 튜토리얼 bullet 두 개와 주의 문단 하나를 제약 문단 하나로 합치고 같은 파일이 이미 하던 상호 참조 한 줄을 덜어내 36줄에서 20줄이 됐다. 제약은 전부 살아남았다 — `dirname` 유도, Codex에는 `CLAUDE_*`가 없다는 사실, "cwd로 root를 추론하지 말 것", fallback 커맨드 두 줄 verbatim. 사라진 것은 그 주변의 튜토리얼뿐이다.

### MOVE

조건부로만 필요한 상세는 스킬 옆 `references/`로 옮기고, 진입 `SKILL.md`에는 "언제 그 파일을 읽는지" 포인터 한 줄만 남긴다. `deep-review/skills/*/references/`와 `deep-evolve/skills/*/protocols/`가 기존 표준 형태다 — 세 번째 형태를 새로 만들지 말고 둘 중 하나를 따른다.

### REPLACE

이미 존재하는 checker나 schema가 강제할 수 있는 텍스트 규칙은 삭제하고 위임한다. 파일럿에서는 17개 메트릭 열거가 `lib/metrics-catalog.yaml` 포인터로, envelope payload 필드 목록이 `lib/suite-constants.js`의 `PAYLOAD_REQUIRED_FIELDS` 참조로 바뀌었다.

---

## 3. KEEP 절대 목록과 그 우선순위

절대 지우지 않고, 바꿔 쓰지 않고, 포인터로 대체하지 않는다: 스킬 트리거 문구(EN/KO, verbatim) · M3 envelope 필드 계약 · state file 스키마 · freshness·락·멱등 계약 · denylist·phase-guard 게이트 · `suite-extensions.json` 광고 경로.

**우선순위.** "같은 말을 두 번 하지 말고 포인터를 써라"는 일반 규칙은 이 목록과 계약 인벤토리의 불변식에 양보한다. 불변식이 같은 문장을 스킬 두 곳과 `AGENTS.md`에 요구한다면 세 번 쓴다. 리뷰어가 지적할 수 있는 중복이, 독자가 놓칠 수 있는 계약보다 싸다. (파일럿 Task 2 controller ruling.)

---

## 4. 수치 가이드는 상한이지 목표가 아니다

| 대상 | 가이드 |
|---|---|
| `CLAUDE.md` + `AGENTS.md` 합산 | ≤ ~4 KB |
| 진입 `SKILL.md` | ≤ ~10 KB / 500줄 |
| 스킬 `description` | 이전 크기의 절반 이하 |

**계약 충실도가 바이트보다 우선한다.** deep-dashboard는 합산 11.1 KB로 릴리스됐다 — 사전에 허용받은 ~6 KB조차 약 5 KB 넘겼다. 잔여분은 전부 KEEP 텍스트다: 열거된 `EXPECTED_SOURCES` 15개, envelope read guard 5개와 silent-null 정책, gotcha 9개. 식별된 유일한 레버 — `EXPECTED_SOURCES`를 포인터로 — 는 의도적으로 당기지 않고 PR에 기록했지만, 그 값어치는 ~0.4 KB뿐이라 목표 근처에도 가지 못한다. 이 초과의 정직한 형태는 이렇다: **5 KB 초과이고 그것을 메울 레버가 없다.** 누군가 깜빡한 재량 감량이 아니다. Ruling: **수치 가이드는 soft, KEEP 목록은 hard.** 초과분과 당기지 않은 레버를 기록하되, 숫자를 억지로 맞추지 않는다.

**description 절반 감량에는 바닥이 있다.** 트리거 목록은 움직일 수 없고, 파일럿에서 description 바이트의 약 30%였다. 두 description이 −50.2%·−50.1%에 도달한 것은 프레이밍까지 줄였기 때문이다(`Trigger phrases include ` → `Triggers on `, "This skill should be used when the user…" 서문 → 동사 선행 절 하나). 트리거 목록이 더 긴 repo에서는 트리거를 자르지 않는 한 절반이 산술적으로 불가능하며, 자르는 것은 §3이 금지한다. 대신 초과를 기록한다.

---

## 5. AGENTS.md가 단일 소스

공유 파일 하나, 호스트 둘.

- `AGENTS.md`가 공유 런타임 규칙·gotcha·계약을 전부 담고, **self-contained**다 — 내부 `@` import 금지. Codex가 지원하지 않기 때문이다.
- `CLAUDE.md`는 1행 `@AGENTS.md` + Claude 전용 내용. 전용 내용이 없어 stub으로 남는 경우가 많다.
- import는 단방향이다. `CLAUDE.md` → `AGENTS.md`, 역방향은 없다.
- §4의 ~4 KB 가이드는 두 파일의 **합산**에 적용된다.

이미 "Codex Project Guide" 성격의 `AGENTS.md`가 있는 repo에서는 `CLAUDE.md`의 공유 내용을 그쪽으로 합병하고 중복이 된 것을 지운다. 내용을 옮기지 않고 import 줄만 추가하는 것은 표준이 아니다 — 두 파일을 다 로드할 뿐이다.

---

## 6. repo별 런북

1. **계약 인벤토리를 먼저 뽑는다.** 편집 전에: state file 스키마, 게이트, envelope 필드, 광고 경로, 크로스 스킬 참조. 이것이 판정 워크시트이자 리뷰어의 체크 기준이며, PR에 함께 나간다.
2. **4-버킷을 적용한다** — `CLAUDE.md`, `AGENTS.md`, 스킬 본문, description.
3. **재진술한 모든 계약을 한 번의 sweep으로 코드와 대조한다**(§7). 리뷰 대응이 아니라 리뷰 **전에** 한다.
4. **기계 게이트** green: repo 자체 테스트 스위트와 문서 checker.
5. **`/deep-review` 수렴.** 오케스트레이션 산출물은 scratchpad에 둔다 — run fingerprint가 untracked 파일을 포함하므로 `.deep-review/tmp` 아래에 쓰면 라운드가 무효화된다. 거기에 놓일 수 있는 것은 SSOT가 지정한 statics(routing plan, context, diff)뿐이며, 그것도 pre-capture 이전에 기록된 경우에 한한다. 파일럿에서 라운드 전체를 날린 운영 실패 두 가지: 리뷰어 어댑터가 승인-공백 섹션을 지역화하면(`"(없음)"`) strict canonical 파서가 그것을 배제해, 리뷰어가 APPROVE했는데도 확장 라운드가 무효가 된다. 그리고 codex-cli 버전 드리프트는 `--output-last-message` 캡처를 깨뜨리는데, 이 경우 canonical 리포트는 브리지 stdout에서 verbatim으로 복구할 수 있다.
6. **버전 bump.** 다이어트만이면 patch, `references/` 분할이 생기면 minor. 그다음 버전 표면 **전체**를 훑는다: 파일럿의 `check:version-sync`는 매니페스트 3개만 커버했고 실제 표면은 7개 파일이었으며, 3개만 올린 결과 브랜치가 red가 됐다.

   | 위치 | checker 커버? |
   |---|---|
   | `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `package.json` | 예 |
   | envelope fixture `producer_version` (`plugin.json.version`과 일치 필수) | 아니오 |
   | release-validator 스크립트의 `RELEASE_VERSION` 상수 | 아니오 |
   | 버전 리터럴을 pin 하는 contract 테스트 2개 | 아니오 |

   릴리스 커밋 전에 자기 repo의 위치를 직접 열거한다 — lockfile, 추가 fixture 등. checker는 바닥이지 지도가 아니다.
7. **PR 후 squash 머지.**
8. **suite re-pin**: `npm run release:bump -- <plugin> <sha40>` 후 `npm run preflight`. `scripts/release-bump.js`는 `.claude-plugin/marketplace.json`만 쓴다 — **`.agents/plugins/marketplace.json`은 수동으로 동기화해야 한다.** `tests/codex-marketplace-contract.test.js`가 누락을 잡아내지만, preflight 시점에야 잡는다.

---

## 7. 두 가지 검증 규칙

**인벤토리 행은 주장이지 증거가 아니다.** 인벤토리는 문서가 코드에 대해 *뭐라고 말하는지*를 기록할 뿐인데, 리뷰어는 그것을 "동작을 확인했다"는 보증으로 읽는다. 그래서 행을 그대로 옮기는 다이어트는 오류를 새 위치마다 전파한다. 리뷰 전에 각 행을 소스와 한 번에 대조한다. 크로스 repo 주장은 기억에 의존하지 말고 소비자 repo의 **현재** 소스를 열어야 한다 — 파일럿에서 인벤토리 두 행이 잘못된 24시간 freshness 주장을 4개 위치로 실어 날랐고, 소비자 파일을 한 번도 열지 않았기 때문에 제거에 리뷰 3라운드가 들었다.

**모든 재진술은 공격 표면이다.** 재진술된 계약은 맞거나 틀릴 수만 있을 뿐, 코드보다 더 옳을 수는 없다. 권위 있는 파일 — `lib/suite-constants.js`, `checklist.json`, schema — 로의 포인터를 우선하고, 독자가 그 값을 눈앞에 두지 않으면 행동할 수 없거나 §3이 의무화한 경우에만 재진술한다. 절약되는 바이트가 적어도 REPLACE를 노릴 가치가 있는 이유가 이것이다: 썩을 수 있는 것을 제거한다.

---

## 8. PR 첨부물과 CHANGELOG

모든 다이어트 PR은 세 가지를 첨부한다: before/after 바이트 표, 행별 판정이 붙은 계약 인벤토리, 버킷별 삭제/이동 요약. §4의 초과분도 근거와 함께 여기에 넣는다.

CHANGELOG 항목은 각 repo에 `docs/DOCS_RULE.md`가 있다면 그에 따라 사용자 관점에서 간결하게 유지한다(deep-loop에는 없다). 바이트 수치, 인벤토리 집계, 리뷰 이력은 PR 본문 소관이다 — 파일럿의 첫 항목이 이것들을 CHANGELOG에 넣었다가 리뷰에서 덜어냈다.

---

## 9. 파일럿 결과 — deep-dashboard v1.5.1

| 대상 | Before | After | Δ |
|---|---:|---:|---:|
| `CLAUDE.md` + `AGENTS.md` | 17,788 B | 11,110 B | −37.5% |
| 진입 `SKILL.md` 2개 | 17,418 B | 14,139 B | −18.8% |
| **상시 로드 총합** | **35,206 B** | **25,249 B** | **−28.3%** |
| `deep-harnessability` description | 655 B | 326 B | −50.2% |
| `deep-harness-dashboard` description | 804 B | 401 B | −50.1% |

트리거 문구 16개 전부 verbatim 보존, 인벤토리 64행 전부 매핑, 미결 0.

흥미로운 숫자는 거꾸로 움직인 쪽이다. 리뷰 2라운드 직후 두 대상은 9,645 B와 13,878 B였다 — 실제 릴리스보다 더 깎인 상태였다. 3~5라운드에서 **약 1.7 KB가 되돌아왔고**, 전부 코드와 모순되던 주장을 대체한 수정된 계약 텍스트였다. APPROVE에 도달하는 데 `/deep-review` 5라운드가 걸렸고, task 단위 리뷰 2회까지 합쳐 수용된 warning이 13건이었는데, CHANGELOG 스타일 위반 1건을 빼면 전부 코드와 맞지 않는 재진술 계약이었다. 4라운드의 sweep 하나만으로 그런 주장 27건을 점검해 7건을 고치고 20건을 확인했다.

이것이 파일럿의 핵심이자 §7이 존재하는 이유다: 다이어트는 쌌고, 비용은 전부 검증에 있었다.
