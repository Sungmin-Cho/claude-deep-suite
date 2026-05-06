# Claude Deep Suite

Claude Code 플러그인 마켓플레이스. 6개의 플러그인을 번들링하여 구조화된 개발, 지식 관리, 자율 실험, 독립 코드 리뷰, 문서 정비, 하네스 진단을 제공한다.

Harness Engineering 프레임워크(Agent = Model + Harness) 기반으로, Guides(feedforward) × Sensors(feedback)를 Computational/Inferential 축에 배치한다.

## Plugins

| Plugin | Version | Description |
|--------|---------|-------------|
| deep-work | 6.4.2 | Evidence-Driven Development Protocol (Brainstorm → Research → Plan → Implement → Test → Integrate) |
| deep-wiki | 1.4.1 | LLM-managed markdown wiki (v1.4.1 Track C synthesizer agent split for trust-boundary closure — 3 split agents `wiki-synthesizer-{analysis,worker,inline}`; active agents have `tools:[Read,Glob,Grep,WebFetch]` — Write physically removed → tool-level M1 closure; qualified namespace routing closes v1.4.0 dogfood caller voluntary downgrade; `scripts/lint-agent-tools.sh` Bash 3.2 portable manifest; `_post_dispatch_dirty_scan()` at 3 sites WIKI_TEST_MODE=1 gated; inline file DORMANT with rot-mitigation header. A5 single-source + A4 multi-source paths preserved structurally from v1.4.0, NOT byte-identical) |
| deep-evolve | 3.1.1 | Autonomous Experimentation Protocol with virtual parallel N-seed exploration and hardened runtime guards |
| deep-review | 1.3.4 | Independent Evaluator with cross-model verification + Phase 6 subagent delegation (hardened) |
| deep-docs | 1.1.0 | Document gardening agent |
| deep-dashboard | 1.1.1 | Cross-plugin harness diagnostics |

각 플러그인은 별도 Git 리포지토리로 관리: `github.com/Sungmin-Cho/claude-deep-{name}`

## Project Structure

```
.claude-plugin/
  marketplace.json                — 마켓플레이스 매니페스트 (공식 Claude schema)
  suite-extensions.json           — Suite 사이드카 매니페스트 (M1, suite tooling 전용)
schemas/
  suite-extensions.schema.json    — Sidecar manifest JSON Schema (Draft 2020-12)
  artifact-envelope.schema.json   — M3 cross-plugin envelope (forward-compat)
  README.md                       — Schema 사용·기여·버전 정책
scripts/
  validate-suite-extensions.js    — ajv 기반 sidecar validator (Phase 1 schema + Phase 2 referential)
  README.md                       — Script convention 및 inventory
tests/
  validate-suite-extensions.test.js — 26 in-process schema/envelope/cross-ref 테스트 (node:test)
  cli.test.js                     — 6 spawnSync CLI 시나리오 (exit code + stderr prefix)
  fixtures/                       — 12 schema + 8 envelope fixture
package.json / package-lock.json  — Node 20+ ESM 프로젝트 (private, ajv + ajv-formats devDeps)
guides/
  integrated-workflow-guide.md    — 6개 플러그인 통합 워크플로우 (EN)
  integrated-workflow-guide.ko.md — 6개 플러그인 통합 워크플로우 (KO)
docs/
  harness-engineering-*.md        — Böckeler/Fowler 기반 분석·로드맵 (8개 약점, 완료)
  deep-suite-harness-analysis.md  — Addy Osmani 기반 cross-plugin contract 분석
  backlog-*.md / next-session-*.md — 작업 백로그 및 세션 인계 노트
  superpowers/specs/              — 플러그인 설계 문서 (이력)
  superpowers/plans/              — 플러그인 구현 계획 (이력)
README.md / README.ko.md          — 프로젝트 소개 (EN/KO)
ONBOARDING.md                     — 신규 팀원 온보딩 가이드
```

## Conventions

- 이 리포지토리는 마켓플레이스 메타데이터·통합 가이드·분석 문서만 포함. 플러그인 소스 코드는 각 플러그인 리포지토리에 있음
- 문서는 한국어/영어 병행. README와 `guides/integrated-workflow-guide`는 양쪽 모두 유지
- **버전 정책 = plugin SemVer + marketplace SHA pinning**:
  - 각 플러그인의 cache key = 그 플러그인 repo의 `plugin.json.version` (SemVer, 예: `6.4.2`)
  - `marketplace.json`의 `sha` = source pinning (어느 commit을 fetch할지)
  - `marketplace.json` plugin entry에는 `version` 필드를 두지 않음 — `plugin.json.version`이 단일 진실원본이므로 중복 선언 회피
  - 공식 우선순위(plugins-reference §Version management): plugin.json.version → marketplace entry.version → commit SHA → unknown
- **Suite 사이드카(M1)**:
  - 모든 cross-plugin 메타데이터는 `.claude-plugin/suite-extensions.json`에만 추가하고 `marketplace.json`은 손대지 않는다 (공식 schema 호환 유지).
  - Sidecar 변경은 `npm test` (32 tests) + `npm run validate` (Phase 1 schema + Phase 2 referential) + `claude plugin validate .` (marketplace 무수정) 3개를 모두 통과해야 한다.
  - Schema는 `1.0`으로 잠겨있고 forward-compat 추가는 `x-*` patternProperties로만 한다. Breaking change는 `*-v2.schema.json` 신규 파일 발행. 자세한 내용은 `schemas/README.md`.
  - `data_flow[].via`는 display-only 라벨 — 검증 안 함. 머신 트레이스는 M3 envelope이 담당.
