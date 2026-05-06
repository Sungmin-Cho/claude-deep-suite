# Claude Deep Suite

Claude Code 플러그인 마켓플레이스. 6개의 플러그인을 번들링하여 구조화된 개발, 지식 관리, 자율 실험, 독립 코드 리뷰, 문서 정비, 하네스 진단을 제공한다.

Harness Engineering 프레임워크(Agent = Model + Harness) 기반으로, Guides(feedforward) × Sensors(feedback)를 Computational/Inferential 축에 배치한다.

## Plugins

<!-- deep-suite:auto-generated:plugin-table-claude:start -->

| Plugin | Version | Description |
|---|---|---|
| deep-work | 6.4.2 | Evidence-Driven Development Protocol |
| deep-wiki | 1.4.1 | LLM-managed markdown wiki |
| deep-evolve | 3.1.1 | Autonomous Experimentation Protocol |
| deep-review | 1.3.4 | Independent Evaluator for AI coding agents |
| deep-docs | 1.1.0 | Document gardening agent |
| deep-dashboard | 1.1.1 | Cross-plugin harness diagnostics |

<!-- deep-suite:auto-generated:plugin-table-claude:end -->

> 표는 `scripts/generate-reference-sections.js` 가 marketplace + pinned `plugin.json.version` 으로부터 자동 생성. narrative 영역(이 단락 포함)은 hand-curated.

각 플러그인은 별도 Git 리포지토리로 관리: `github.com/Sungmin-Cho/claude-deep-{name}`

## Project Structure

```
.claude-plugin/
  marketplace.json                — 마켓플레이스 매니페스트 (공식 Claude schema)
  suite-extensions.json           — Suite 사이드카 매니페스트 (M1, suite tooling 전용)
.github/workflows/
  manifest-doc-sync.yml           — M2 CI (PR + push + daily cron, 6 check-* + generate --check)
schemas/
  suite-extensions.schema.json    — Sidecar manifest JSON Schema (Draft 2020-12)
  artifact-envelope.schema.json   — M3 cross-plugin envelope (forward-compat, SemVer 2.0.0 strict)
  README.md                       — Schema 사용·기여·버전 정책
scripts/
  validate-suite-extensions.js    — ajv 기반 sidecar validator (Phase 1 schema + Phase 2 referential)
  generate-reference-sections.js  — M2 marker-based reference generator (--check / --write)
  check-readme-plugin-table.js    — M2 narrative drift gate (plugin name + version literal outside markers)
  check-claude-md-paths.js        — M2 §Project Structure 경로 존재 검증
  check-guide-version.js          — M2 guide 인 narrative version 일관성
  check-semver-sha-sync.js        — M2 marketplace.sha → plugin.json.version → docs marker 일관성
  check-pinned-plugin-paths.js    — M2 sidecar artifacts paths ↔ pinned plugin source grep (W-R1, W-R2)
  check-memory-hierarchy.js       — M2 cross-plugin policy keyword conflict 검사
  lib/markers.js                  — auto-generated marker parser/replacer
  lib/fetch-plugin-files.js       — gh api + .deep-suite-cache 캐시 fetcher
  README.md                       — Script convention 및 inventory
templates/
  README-plugin-table.tmpl.md     — generator 산출물 형식 문서화
  data-flow-diagram.tmpl.md       — generator 산출물 형식 문서화
  source-pinning.tmpl.md          — generator 산출물 형식 문서화
tests/
  validate-suite-extensions.test.js — schema/envelope/cross-ref 테스트 (W-R4 SemVer 2.0.0 추가)
  cli.test.js                     — validator CLI 시나리오 (exit code + stderr prefix)
  markers.test.js                 — markers.js round-trip 테스트
  generate-reference-sections.test.js — generator CLI 시나리오 (--check/--write/--id, fixture override)
  cli-sync-checkers.test.js       — 6 check-* 스크립트 spawnSync 시나리오
  fixtures/                       — schema + envelope + plugin-cache fixture
package.json / package-lock.json  — Node 20+ ESM 프로젝트 (private, ajv + ajv-formats devDeps)
guides/
  integrated-workflow-guide.md    — 6개 플러그인 통합 워크플로우 (EN)
  integrated-workflow-guide.ko.md — 6개 플러그인 통합 워크플로우 (KO)
docs/
  harness-engineering-*.md        — Böckeler/Fowler 기반 분석·로드맵 (8개 약점, 완료)
  deep-suite-harness-analysis.md  — Addy Osmani 기반 cross-plugin contract 분석
  memory-hierarchy.md             — M2 cross-plugin memory hierarchy 계약 (suite ↔ plugin)
  source-pinning.md               — M2 auto-generated source-pinning 표
  capability-matrix.md            — M2 auto-generated capability matrix
  artifact-io-graph.md            — M2 auto-generated cross-plugin artifact I/O graph
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
  - Sidecar 변경은 `npm test` + `npm run validate` (Phase 1 schema + Phase 2 referential) + `claude plugin validate .` (marketplace 무수정) 3개를 모두 통과해야 한다.
  - Schema는 `1.0`으로 잠겨있고 forward-compat 추가는 `x-*` patternProperties로만 한다. Breaking change는 `*-v2.schema.json` 신규 파일 발행. 자세한 내용은 `schemas/README.md`.
  - `data_flow[].via`는 display-only 라벨 — 검증 안 함. `data_flow` 자체는 **non-authoritative** (intent-only). 머신 트레이스는 M3 envelope이 담당.
  - Envelope의 `producer_version`은 SemVer 2.0.0 strict (build metadata + prerelease 모두 허용, leading-zero/empty-prerelease 거부).
- **Manifest-Doc Sync (M2)**:
  - README/CLAUDE/guide 의 plugin 표·버전·data-flow 영역은 `<!-- deep-suite:auto-generated:<id>:start -->` ... `:end` 마커 사이만 generator 가 갱신. narrative 영역은 hand-curated.
  - `marketplace.json` SHA 변경 시 `npm run docs:write` 로 marker 영역을 재생성하고 `npm run docs:sync` 가 모두 통과해야 한다 (CI: `.github/workflows/manifest-doc-sync.yml` PR + push + daily cron).
  - Cross-plugin memory hierarchy 는 `docs/memory-hierarchy.md` 가 정의. 신규 정책 추가는 거기 표 + `scripts/check-memory-hierarchy.js POLICIES` 양쪽 갱신.
  - Sidecar paths 는 pinned plugin source 와 1:1 일치해야 한다 (`scripts/check-pinned-plugin-paths.js` enforced; W-R1, W-R2 회귀 차단).
  - `<wiki_root>/` (underscore) 가 wiki paths 의 canonical prefix. `<wiki-root>/` (hyphen) 은 금지.
