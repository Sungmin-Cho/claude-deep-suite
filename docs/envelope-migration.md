# M3 Common Artifact Envelope — Migration Guide

> **Audience**: 6 plugin maintainers (deep-work, deep-wiki, deep-evolve,
> deep-review, deep-docs, deep-dashboard).
> **Phase 1 status (suite-side infra)**: 본 가이드는 Phase 2 plugin migration 시
> 1차 참조 문서. envelope schema, validator, wrap helper, payload registry는
> suite repo에 lock된 상태.

---

## 1. What is the envelope?

모든 cross-plugin JSON artifact는 다음 형태로 wrap된다:

```json
{
  "$schema": "https://raw.githubusercontent.com/Sungmin-Cho/claude-deep-suite/main/schemas/artifact-envelope.schema.json",
  "schema_version": "1.0",
  "envelope": {
    "producer": "<plugin-name>",
    "producer_version": "<plugin.json.version>",
    "artifact_kind": "<kebab-case>",
    "run_id": "<ULID>",
    "session_id": "<optional>",
    "parent_run_id": "<optional cross-plugin trace parent>",
    "generated_at": "<RFC 3339>",
    "schema": { "name": "<artifact-kind>", "version": "<MAJOR.MINOR>" },
    "git": { "head": "<sha>", "branch": "<name>", "worktree": "<optional>", "dirty": false },
    "provenance": {
      "source_artifacts": [{ "path": "...", "run_id": "<optional>" }],
      "tool_versions": { "node": "20.x" }
    }
  },
  "payload": { /* plugin-specific content (validated against payload registry) */ }
}
```

**Authoritative schema**: `schemas/artifact-envelope.schema.json` (locked at v1.0,
forward-compat via `x-*` patternProperties only — see `schemas/README.md`).

---

## 2. Why envelope?

| 목적 | 메커니즘 |
|---|---|
| Cross-plugin trace | `run_id` (per-artifact) + `parent_run_id` (chain) |
| Schema drift detection | `schema.version` ↔ suite-side `schemas/payload-registry/` lookup |
| Aggregation freshness | `generated_at` (RFC 3339, monotonic) |
| Producer attribution | `producer` + `producer_version` (SemVer 2.0.0 strict) |
| Reproducibility | `git.head` + `git.dirty` + `provenance.tool_versions` |
| Forward compat | `x-*` extensions at root + `envelope` block |

---

## 3. Migration order (Phase 2)

권장 순서 (변경 비용 오름차순). **병렬 자율** (handoff §2 Q4 답변 = 옵션 B):

| 순서 | Plugin | Artifact | 위치 | 비용 |
|---|---|---|---|---|
| 1 | deep-docs | `.deep-docs/last-scan.json` | writer in plugin repo | 최소 (이미 schema_version + provenance 보유) |
| 2 | deep-dashboard | `.deep-dashboard/harnessability-report.json` | writer in plugin repo | 낮음 |
| 3 | deep-work | `.deep-work/<session>/session-receipt.json` + `receipts/SLICE-*.json` | Stop hook receipt writer | 중간 |
| 4 | deep-evolve | `.deep-evolve/<session>/evolve-receipt.json` + `evolve-insights.json` | completion protocol writer | 중간 |
| 5 | deep-review | `.deep-review/recurring-findings.json` (+ optional report `.md` sidecar) | Stage 5.5 writer | 중간 |
| 6 | deep-wiki | `<wiki_root>/.wiki-meta/index.json` | wiki-schema | 높음 (구조 변경 영향) |

병렬 진행 가능: 6 plugin PR이 동시 in-flight여도 schema 단위 의존이 없다.
dashboard envelope-aware read는 Phase 3 / M4 범위.

---

## 4. Per-plugin migration steps

각 plugin repo에서:

### 4.1 Phase 1 placeholder schemas (important)

The 8 payload schemas under `schemas/payload-registry/<producer>/<kind>/v1.0.schema.json` shipped in Phase 1 are intentionally **placeholders**: they declare `type: object` + forward-compat `^x-` extensions, but do **not** enforce `required` fields or specific `properties`. Phase 2 plugin migration PRs replace each placeholder with the authoritative shape derived from the plugin's live `current-emit.json`. Until that PR lands for a given plugin:

- `validate-artifact <wrapped.json>` (default) → envelope schema enforced + payload "any object"
- `validate-artifact --strict <wrapped.json>` → also requires registry hit (i.e., that the producer/kind/version triple has a registered placeholder schema). The placeholder accepts any payload; the strict mode catches typos in producer/artifact_kind/schema.version.

When you (Phase 2 maintainer) replace a placeholder, your PR should:
1. Update the schema to reflect actual emit fields (with real `required` / `properties`).
2. Add a fixture per shape — at minimum `valid-minimal.json` and one `invalid-*.json`.
3. Run `npm run validate-artifact-fixtures` (CI gate) to confirm coverage.

### 4.2 Branch + helper sample

```bash
git checkout -b feat/m3-envelope-adoption

# Suite repo의 wrap helper로 sample emit 생성 (의존 추가 아님 — 일회성)
node /path/to/claude-deep-suite/scripts/wrap-artifact.js \
  --producer deep-docs \
  --artifact-kind last-scan \
  --schema-version 1.0 \
  --producer-version 1.1.0 \
  --input current-emit.json \
  --output sample-wrapped.json

# Suite repo의 validator로 contract 통과 확인
node /path/to/claude-deep-suite/scripts/validate-artifact.js sample-wrapped.json
```

### 4.3 Writer 코드 변경

기존 `writeFileSync(path, JSON.stringify(payload))` 패턴을 envelope wrap으로 전환:

```js
// Zero-dep ULID generator (suite 정책: 외부 패키지 추가 불필요).
// 자세한 구현은 claude-deep-suite scripts/wrap-artifact.js 참조.
// ulid npm 패키지도 동작함 (`npm install ulid` 후 아래 주석 참고).
import { randomBytes } from 'node:crypto';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function generateUlid(now = Date.now()) {
  // 48-bit timestamp + 80-bit randomness, Crockford Base32 26 chars.
  // Timestamp encoded MSB-first (per ULID spec) so lex sort = time sort.
  let ts = now;
  const tsChars = new Array(10);
  for (let i = 9; i >= 0; i--) {
    tsChars[i] = CROCKFORD[ts % 32];
    ts = Math.floor(ts / 32);
  }
  // Randomness portion (80 bits → 16 base32 chars).
  const r = randomBytes(10);
  let rb = 0n;
  for (const b of r) rb = (rb << 8n) | BigInt(b);
  const randChars = new Array(16);
  for (let i = 15; i >= 0; i--) {
    randChars[i] = CROCKFORD[Number(rb & 31n)];
    rb >>= 5n;
  }
  return tsChars.join('') + randChars.join('');
}
// 또는: import { ulid as generateUlid } from 'ulid';  // npm install ulid

import pkg from './plugin.json' assert { type: 'json' };
import { execSync } from 'node:child_process';

function detectGit() {
  try {
    const head = execSync('git rev-parse HEAD', { stdio: ['ignore','pipe','ignore'] }).toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore','pipe','ignore'] }).toString().trim();
    const status = execSync('git status --porcelain', { stdio: ['ignore','pipe','ignore'] }).toString();
    return { head, branch: branch || 'HEAD', dirty: status.length > 0 };
  } catch {
    return { head: '0000000', branch: 'HEAD', dirty: 'unknown' };
  }
}

const wrapped = {
  schema_version: '1.0',
  envelope: {
    producer: 'deep-docs',
    producer_version: pkg.version,                // plugin.json.version source-of-truth
    artifact_kind: 'last-scan',
    run_id: generateUlid(),       // 또는 ulid() if using the ulid npm package
    generated_at: new Date().toISOString(),
    schema: { name: 'last-scan', version: '1.0' },
    git: detectGit(),
    provenance: {
      source_artifacts: [],
      tool_versions: { node: process.version },
    },
  },
  payload: legacyPayload,
};
writeFileSync(path, JSON.stringify(wrapped, null, 2) + '\n');
```

### 4.4 `parent_run_id` chain (consumer plugins)

자기 artifact가 *다른 plugin의 artifact를 입력으로* 가질 때 chain을 명시:

| Producer | 소비 artifact | chain set |
|---|---|---|
| deep-review | deep-work session-receipt | `parent_run_id = <session-receipt run_id>` |
| deep-evolve | deep-review recurring-findings | `parent_run_id = <recurring-findings run_id>` |
| deep-work (research phase) | deep-evolve evolve-insights | `parent_run_id = <evolve-insights run_id>` |
| deep-dashboard | 다수 (배열로 `provenance.source_artifacts[].run_id`) | `parent_run_id` 단일 set 어려움 — `source_artifacts[].run_id`만 세팅하고 `parent_run_id` omit |

**chain test 의무**: PR에 다음 형식 contract test 추가:
```js
// tests/envelope-chain.test.js
test('review report parent_run_id matches consumed session-receipt run_id', () => {
  // Read both artifacts, assert review.envelope.parent_run_id === session.envelope.run_id
});
```

### 4.5 Plugin self-tests

- Emit 결과를 suite repo `validate-artifact.js`로 cross-check (플러그인 자체 CI는 suite 의존 없음 — 로컬 dev에서만 확인하면 충분)
- Plugin 자체 test에서 envelope schema는 inline JSON 또는 fetched copy로 검증 가능

### 4.6 Plugin 메타데이터

- README / CHANGELOG: "v<next>: artifact emits M3 envelope (cf. claude-deep-suite/docs/envelope-migration.md)"
- `plugin.json.version` patch 또는 minor bump (envelope adoption은 minor 권장 — 새 contract 추가)

### 4.7 PR merge → suite SHA bump

Plugin PR merge 후 suite repo에서 *별도 PR*:
```bash
# claude-deep-suite repo
git checkout -b chore/marketplace-bump-deep-docs
# .claude-plugin/marketplace.json 의 deep-docs entry sha만 갱신
npm run docs:write    # marker 표 자동 갱신
npm run docs:sync     # check-semver-sha-sync + check-pinned-plugin-paths + check-memory-hierarchy 자동 통과 검증
```

---

## 5. Compat matrix

| Producer state | Envelope | Payload registry hit | Validator outcome | Dashboard read |
|---|---|---|---|---|
| Pre-M3 (legacy) | ❌ | ❌ | n/a (validator skipped) | legacy fallback (직접 read) |
| M3 envelope, registry seed | ✅ | ✅ | exit 0 | envelope-aware (M4) |
| M3 envelope, no registry | ✅ | ❌ | exit 0 + warning | envelope-aware (payload opaque) |
| M3 envelope, schema mismatch | ✅ | ✅, payload fail | exit 1 | dashboard fallback + warning |
| M3 envelope, bad envelope | ❌ | n/a | exit 1 | dashboard skip + error |

---

## 6. Migration window timer

**시작점** (handoff §2 Q3 답변 = 옵션 B): **첫 plugin envelope adoption merge 시점**.

- 첫 plugin adopt 시점 기록 위치: 본 문서 §6.1 (아래 표 갱신)
- 6개월 timer 의미: "기간 종료 후 dashboard가 legacy plugin을 fallback이 아닌
  warning으로 표시". **legacy 강제 차단은 별도 결정** — 본 문서에 명시 일정
  못 박지 않음.

### 6.1 Adoption ledger (Phase 3 갱신 — 2026-05-11)

| Plugin | Envelope-emitting since (commit) | merged_at | timer notes |
|---|---|---|---|
| deep-docs | `3cc522933916a9e54e920ef2b694a879e24a01b1` | 2026-05-07 | **T+0 시작점 (first plugin merge)** |
| deep-dashboard | `cfd07bd5c1feb37f85bc86d91b0987f1e8eb1910` | 2026-05-07 | M4 close `3c3f417da81691bb8bf98aefd7adcc86610cda79` (2026-05-11) — suite telemetry + 16 metrics |
| deep-work | `6f23e79a72af30c730e97f309167d060856fa697` | 2026-05-07 | |
| deep-evolve | `9b867b1e23c2c5b35cfca239fe691f3eb864b499` | 2026-05-08 | |
| deep-review | `a76473fdbd540127f7c9492c76934a198dc9602b` | 2026-05-08 | |
| deep-wiki | `4f5cbf8c6a2c6cff352389c4f914cab678bcf4ad` | 2026-05-11 | Phase 2 final (6/6 완료 트리거) |

> _T+0 = 2026-05-07 (deep-docs `3cc522933916a9e54e920ef2b694a879e24a01b1` first plugin merge). T+0+6mo = 2026-11-07 — 도달 시 dashboard warning 활성화 PR을 issue로 발행._

---

## 7. Trace example (Phase 3 / M4 활용)

deep-work session → deep-review → deep-evolve → deep-dashboard 의 4단계 cross-plugin
trace가 envelope `run_id` chain으로 어떻게 traceable해지는지 예시:

```
session-receipt.json
  envelope.run_id           = SESSION_R
  envelope.parent_run_id    = (none)

review/reports/...sidecar.json
  envelope.run_id           = REVIEW_R
  envelope.parent_run_id    = SESSION_R          ← deep-review가 deep-work 결과 소비
  envelope.provenance.source_artifacts[0].run_id = SESSION_R

recurring-findings.json
  envelope.run_id           = RECUR_R
  envelope.parent_run_id    = REVIEW_R           ← Stage 5.5 가 review report 소비

evolve-receipt.json
  envelope.run_id           = EVOLVE_R
  envelope.parent_run_id    = RECUR_R            ← evolve가 recurring-findings 입력으로

harnessability-report.json
  envelope.run_id           = DASH_R
  envelope.parent_run_id    = (none — multi-source aggregator)
  envelope.provenance.source_artifacts[].run_id ← [SESSION_R, REVIEW_R, RECUR_R, EVOLVE_R]
```

dashboard가 `harnessability-report.json` 의 source_artifacts 를 펴서 chain
reconstruction → 4단계 trace tree 시각화 가능.

---

## 8. FAQ

**Q. Plugin이 suite-side validator를 의존으로 끌어와야 하나?**
A. No. validator는 plugin 메인테이너의 *local dev cross-check 도구*. Plugin 자체
CI는 envelope schema만 inline copy로 들고가도 충분.

**Q. `schema.version` 을 bump하려면?**
A. additive 변경(신규 optional 필드)은 **minor bump** (`1.0` → `1.1`). registry는
양쪽 schema (`v1.0.schema.json`, `v1.1.schema.json`) 를 모두 보유하고 producer가
emit하는 `schema.version` 으로 lookup. breaking 변경은 **major bump** + 새 schema
파일 + Phase 2 마이그레이션 round 2.

**Q. `run_id` 형식 강제는?**
A. envelope schema 자체는 `minLength: 1` lock (M1 lock 정책). ULID 26-char 강제는
*fixture 차원* + wrap helper의 자동 생성으로 사실상 표준화. plugin이 임의 string을
emit해도 schema는 통과 (단, dashboard chain reconstruction 효율↓).

**Q. `dirty: "unknown"` 은 언제?**
A. shallow CI clone 또는 detached worktree 등 git status 조회 실패 시. wrap helper가
자동으로 fallback 처리.

**Q. `head: '0000000'` 은 언제?**
A. wrap helper가 git context 자동 감지 실패 시 (non-git 디렉토리, shallow CI clone 등)
fallback으로 emit하는 sentinel 값. envelope schema regex `^[a-f0-9]{7,40}$` 를 통과하는
7-zero 문자열. dashboard가 chain reconstruction 시 이 sentinel을 보면 'producer git
context unavailable'로 해석해야 한다 (실제 commit SHA 아님). 명시적 git 정보 필요 시
`--git-head` override 사용.

---

## 9. Cross-references

- `docs/superpowers/plans/2026-05-07-m3-handoff.md` (Phase 1/2/3 split, §2 4 questions, avoid catalog)
- `docs/superpowers/plans/2026-05-07-m3-direct-implementation.md` (Phase 1 plan 답변)
- `docs/deep-suite-harness-roadmap.md` §M3 (spec)
- `schemas/README.md` §Schema versioning policy
- `scripts/validate-artifact.js` / `scripts/wrap-artifact.js` (suite-side tooling)
- `schemas/payload-registry/` (8 producer × kind seeds)

---

**End of migration guide**.
