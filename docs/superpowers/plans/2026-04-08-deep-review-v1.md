# deep-review v1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 코딩 에이전트의 작업을 독립적으로 평가하는 Evaluator 플러그인을 구현한다 (Mode 1: Code Review).

**Architecture:** Claude Code 플러그인으로 구현. 주 커맨드(`/deep-review`)가 환경을 감지하고, 독립 Opus 서브에이전트를 spawn하여 코드 리뷰를 수행한다. Codex 플러그인이 설치+인증되어 있으면 3-way 병렬 교차 검증을 실행한다. Sprint Contract 파일이 있으면 성공 기준 대비 검증을 추가한다.

**Tech Stack:** Claude Code Plugin SDK (markdown commands/skills/agents), Bash hooks, YAML config

**Spec:** `docs/superpowers/specs/2026-04-08-harness-engineering-plugins-design.md`

---

## File Structure

```
~/dev/deep-review/
├── .claude-plugin/
│   └── plugin.json              # 플러그인 매니페스트
├── commands/
│   └── deep-review.md           # 메인 커맨드 (리뷰 + init 서브커맨드를 인수로 처리)
├── skills/
│   └── deep-review-workflow/
│       ├── SKILL.md             # 리뷰 워크플로우 스킬 정의
│       └── references/
│           ├── review-criteria.md    # 5가지 리뷰 관점 상세
│           ├── codex-integration.md  # Codex 교차 검증 가이드
│           ├── contract-schema.md    # Sprint Contract 스키마
│           └── report-format.md      # 리포트 형식 가이드
├── agents/
│   └── code-reviewer.md         # 독립 Opus 리뷰어 에이전트
├── hooks/
│   ├── hooks.json               # hook 정의 (없음 — deep-review 자체는 hook 불필요)
│   └── scripts/
│       └── detect-environment.sh # 환경 감지 스크립트 (git/codex 상태)
├── package.json
├── README.md
└── CHANGELOG.md
```

---

### Task 1: 플러그인 스캐폴드

**Files:**
- Create: `~/dev/deep-review/.claude-plugin/plugin.json`
- Create: `~/dev/deep-review/package.json`
- Create: `~/dev/deep-review/README.md`
- Create: `~/dev/deep-review/CHANGELOG.md`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p ~/dev/deep-review/.claude-plugin
mkdir -p ~/dev/deep-review/commands
mkdir -p ~/dev/deep-review/skills/deep-review-workflow/references
mkdir -p ~/dev/deep-review/agents
mkdir -p ~/dev/deep-review/hooks/scripts
```

- [ ] **Step 2: plugin.json 작성**

```json
{
  "name": "deep-review",
  "version": "1.0.0",
  "description": "Independent Evaluator for AI coding agents — cross-model code review with Codex integration",
  "author": {
    "name": "Sungmin-Cho"
  },
  "license": "MIT",
  "category": "Productivity",
  "keywords": ["code-review", "evaluator", "harness-engineering", "quality"]
}
```

- [ ] **Step 3: package.json 작성**

```json
{
  "name": "deep-review",
  "version": "1.0.0",
  "description": "Independent Evaluator for AI coding agents — cross-model code review with Codex integration",
  "author": {
    "name": "Sungmin-Cho"
  },
  "license": "MIT",
  "keywords": ["code-review", "evaluator", "harness-engineering", "quality"]
}
```

- [ ] **Step 4: README.md 작성**

```markdown
# deep-review

AI 코딩 에이전트의 작업을 독립적으로 평가하는 Evaluator 플러그인.

## Features

- **독립 Evaluator**: Generator와 분리된 Opus 서브에이전트가 코드 리뷰
- **교차 모델 검증**: Codex 플러그인 설치 시 3-way 병렬 리뷰 (Claude + Codex Review + Codex Adversarial)
- **Sprint Contract**: 성공 기준 대비 구조적 검증
- **엔트로피 탐지**: 코드 드리프트, 패턴 불일치, 중복 감지
- **환경 적응**: git/non-git, Codex 유무에 관계없이 동작

## Installation

\`\`\`bash
claude plugin add deep-review
\`\`\`

## Commands

| Command | Description |
|---------|-------------|
| `/deep-review` | 현재 변경사항을 독립 에이전트로 리뷰 |
| `/deep-review --contract` | Sprint Contract 기반 리뷰 |
| `/deep-review --entropy` | 엔트로피 스캔 |
| `/deep-review init` | 프로젝트별 리뷰 규칙 초기화 |
```

- [ ] **Step 5: CHANGELOG.md 작성**

```markdown
# Changelog

## [1.0.0] - 2026-04-08

### Added
- Mode 1: Code Review — 독립 Opus 서브에이전트 리뷰
- Codex 교차 검증 (codex:review + codex:adversarial-review)
- Sprint Contract 소비 및 검증
- 엔트로피 탐지
- 환경 자동 감지 (git/non-git, Codex 유무)
- `/deep-review init` — 프로젝트별 규칙 초기화
```

- [ ] **Step 6: git 초기화 및 커밋**

```bash
cd ~/dev/deep-review
git init
git add -A
git commit -m "chore: scaffold deep-review plugin structure"
```

---

### Task 2: 환경 감지 스크립트

**Files:**
- Create: `~/dev/deep-review/hooks/scripts/detect-environment.sh`

- [ ] **Step 1: detect-environment.sh 작성**

이 스크립트는 커맨드에서 호출되어 현재 환경 상태를 key=value 형식으로 출력한다.
jq 의존성 없이 순수 bash로 동작한다. 브라우저 도구 감지는 v1.1(App QA)에서 추가 — v1.0에서는 제외하여 hang 방지.

```bash
#!/usr/bin/env bash
set -euo pipefail

# === 1. Git 리포지터리 여부 ===
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "is_git=false"
  echo "has_commits=false"
  echo "change_state=non-git"
  echo "codex_installed=false"
  exit 0
fi

echo "is_git=true"

# === 2. 커밋 존재 여부 ===
if ! git rev-parse HEAD >/dev/null 2>&1; then
  echo "has_commits=false"
  echo "change_state=initial"
  # Codex 감지 후 종료
  if [ -d "$HOME/.claude/plugins/cache/openai-codex" ]; then
    echo "codex_installed=true"
  else
    echo "codex_installed=false"
  fi
  exit 0
fi

echo "has_commits=true"

# === 3. 변경 상태 세분화 (spec 요구: staged/unstaged/mixed/untracked-only/clean) ===
staged=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
unstaged=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
untracked=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

echo "staged=$staged"
echo "unstaged=$unstaged"
echo "untracked=$untracked"

if [ "$staged" -eq 0 ] && [ "$unstaged" -eq 0 ] && [ "$untracked" -eq 0 ]; then
  echo "change_state=clean"
elif [ "$staged" -gt 0 ] && [ "$unstaged" -gt 0 ]; then
  echo "change_state=mixed"
elif [ "$staged" -gt 0 ]; then
  echo "change_state=staged"
elif [ "$unstaged" -gt 0 ]; then
  echo "change_state=unstaged"
else
  echo "change_state=untracked-only"
fi

# === 4. review base 결정 (안전한 fallback 체인) ===
review_base=""
review_base_method=""

# 시도 1: merge-base with remote default branch
for remote_ref in "origin/HEAD" "origin/main" "origin/master"; do
  if git rev-parse --verify "$remote_ref" >/dev/null 2>&1; then
    candidate=$(git merge-base HEAD "$remote_ref" 2>/dev/null || true)
    if [ -n "$candidate" ]; then
      review_base="$candidate"
      review_base_method="merge-base"
      break
    fi
  fi
done

# 시도 2: HEAD~1 (커밋이 2개 이상일 때만)
if [ -z "$review_base" ]; then
  commit_count=$(git rev-list --count HEAD 2>/dev/null || echo "1")
  if [ "$commit_count" -gt 1 ]; then
    review_base="HEAD~1"
    review_base_method="head-parent"
  fi
fi

# 시도 3: root commit (커밋이 1개뿐) — empty tree hash 사용
if [ -z "$review_base" ]; then
  review_base="4b825dc642cb6eb9a060e54bf899d69f7cb46617"
  review_base_method="empty-tree"
fi

echo "review_base=$review_base"
echo "review_base_method=$review_base_method"

# shallow clone 여부
if [ -f "$(git rev-parse --git-dir)/shallow" ]; then
  echo "is_shallow=true"
else
  echo "is_shallow=false"
fi

# === 5. Codex 플러그인 감지 (파일 시스템만, 네트워크 호출 없음) ===
if [ -d "$HOME/.claude/plugins/cache/openai-codex" ]; then
  echo "codex_installed=true"
else
  echo "codex_installed=false"
fi
```

- [ ] **Step 2: 실행 권한 부여**

```bash
chmod +x ~/dev/deep-review/hooks/scripts/detect-environment.sh
```

- [ ] **Step 3: 로컬에서 테스트**

```bash
cd ~/dev/deep-review
bash hooks/scripts/detect-environment.sh
```

Expected: JSON 출력 — `is_git: true`, `has_commits: true`, `change_state`, `codex_installed` 등

- [ ] **Step 4: 커밋**

```bash
cd ~/dev/deep-review
git add hooks/scripts/detect-environment.sh
git commit -m "feat: add environment detection script (git/codex/browser)"
```

---

### Task 3: 리뷰 기준 참조 문서

**Files:**
- Create: `~/dev/deep-review/skills/deep-review-workflow/references/review-criteria.md`
- Create: `~/dev/deep-review/skills/deep-review-workflow/references/codex-integration.md`
- Create: `~/dev/deep-review/skills/deep-review-workflow/references/contract-schema.md`
- Create: `~/dev/deep-review/skills/deep-review-workflow/references/report-format.md`

- [ ] **Step 1: review-criteria.md 작성**

```markdown
# Review Criteria — 5가지 리뷰 관점

독립 Evaluator가 코드를 평가할 때 사용하는 5가지 관점.

## 1. 정확성 (Correctness)

- 로직 버그: 조건문 오류, off-by-one, null/undefined 미처리
- 엣지 케이스: 빈 입력, 최대값, 동시성, 타임아웃
- 에러 핸들링: try-catch 누락, 에러 삼킴, 부적절한 fallback
- 타입 안전성: 런타임 타입 불일치, 암묵적 형변환

평가: 버그 하나당 🔴. 없으면 🟢.

## 2. 아키텍처 정합성 (Architecture Compliance)

rules.yaml이 있으면 해당 규칙 기준, 없으면 일반 원칙:
- 레이어 경계 침범: UI에서 DB 직접 접근, 순환 의존성
- 종속성 방향 위반: 하위 레이어가 상위 레이어를 import
- 관심사 분리: 하나의 함수/파일이 여러 책임을 가짐
- API 경계: 내부 구현 세부사항이 외부로 노출

평가: 위반당 🔴 또는 🟡. 없으면 🟢.

## 3. 엔트로피 (Entropy Detection)

- 중복 코드: 3회 이상 반복되는 유사 블록
- 패턴 불일치: 기존 코드베이스의 패턴과 다른 방식으로 구현
- ad-hoc 헬퍼: 공유 유틸리티가 있는데 새로 만든 경우
- 네이밍 불일치: 기존 컨벤션과 다른 네이밍

평가: 건당 🟡. 심각하면 🔴.

## 4. 테스트 충분성 (Test Adequacy)

- 변경된 로직에 대한 테스트 존재 여부
- happy path + error path 커버리지
- 새로운 함수/메서드에 대한 단위 테스트
- 통합 테스트 필요 여부 판단

평가: 테스트 없으면 🔴. 부분적이면 🟡. 충분하면 🟢.

## 5. 가독성 (Agent Readability)

"다음에 이 코드를 읽을 에이전트가 이해할 수 있는가?"
- 함수/변수 이름이 의도를 명확히 전달하는가
- 복잡한 로직에 주석이 있는가
- 파일 크기가 적절한가 (300줄 이하 권장)
- 매직 넘버, 하드코딩된 값이 없는가

평가: 건당 🟡. 없으면 🟢.
```

- [ ] **Step 2: codex-integration.md 작성**

```markdown
# Codex Integration Guide

## 감지 방법

Codex 플러그인 설치 여부:
- `$HOME/.claude/plugins/cache/openai-codex` 디렉토리 존재 확인
- 또는 환경 감지 스크립트의 `codex_installed` 필드

인증 상태 확인:
- Codex 커맨드를 사용하기 전 에이전트가 직접 확인해야 함
- codex:setup 상태를 체크하거나, 첫 실행 시 실패하면 fallback

## 3-way 병렬 리뷰

Codex가 사용 가능할 때 3개 리뷰를 **동시 실행**:

1. **Claude Opus 서브에이전트** (Agent tool, model: opus)
   - 독립 컨텍스트에서 5가지 관점 리뷰
   - 항상 실행됨

2. **codex:review** (Skill tool, background)
   - `codex:review --background --base {review_base}`
   - 커밋된 상태에서만 실행 가능

3. **codex:adversarial-review** (Skill tool, background)
   - `codex:adversarial-review --background --base {review_base} "{focus_text}"`
   - focus_text: rules.yaml 규칙 + contract criteria에서 자동 생성

## 포커스 텍스트 생성

rules.yaml과 contract에서 adversarial-review의 포커스를 자동 구성:

```
rules.yaml의 architecture.layers가 정의되어 있으면:
  → "레이어 경계 위반({layers 목록})과 종속성 방향을 집중 검토"

rules.yaml의 entropy 규칙이 있으면:
  → "중복 코드, ad-hoc 헬퍼, 패턴 불일치를 집중 검토"

contract criteria가 있으면:
  → "다음 성공 기준이 실제로 충족되는지 검토: {criteria 목록}"
```

## Fallback

Codex 사용 불가 시:
1. **1회만** 사용자에게 알림: "Codex 플러그인이 설치되어 있으면 교차 모델 검증이 가능합니다."
2. Claude Opus 서브에이전트 단독 리뷰로 진행
3. 알림은 세션당 1회 — `.deep-review/config.yaml`의 `codex_notified` 플래그로 관리

## 합성 (Synthesis)

3개 리뷰 결과를 하나의 리포트로 합성:

| 패턴 | 확신도 | 처리 |
|------|--------|------|
| 3/3 일치 | 높음 🔴 | 자동 REQUEST_CHANGES |
| 2/3 일치 | 중간 🟡 | REQUEST_CHANGES (낮은 확신 표시) |
| 1/3 단독 | 낮음 | 참고 사항으로 표시 |
| 0/3 | 안전 🟢 | APPROVE |
```

- [ ] **Step 3: contract-schema.md 작성**

```markdown
# Sprint Contract Schema

## 파일 위치

`.deep-review/contracts/SLICE-{NNN}.yaml`

## 스키마

```yaml
slice: SLICE-001                    # 슬라이스 ID (plan.md 매핑)
title: "기능 제목"                    # 사람이 읽을 수 있는 제목
source_plan: "plan.md#slice-001"    # plan.md 내 원본 위치
created_at: "2026-04-08T10:00:00Z"  # 생성 시각
status: active                      # active | archived
criteria:
  - id: C1                          # 고유 ID
    description: "성공 기준 설명"     # 검증할 내용
    verification: auto              # auto | manual | mixed
    prerequisites: []               # 전제 조건 (auth, test-data, feature-flag 등)
    status: null                    # PASS | FAIL | PARTIAL | SKIP (Evaluator가 채움)
    evidence: null                  # 검증 근거 (Evaluator가 채움)
```

## verification 타입

- `auto`: Evaluator가 코드 분석 또는 App QA로 자동 검증
- `manual`: 자동 검증 불가. SKIP 처리, 리포트에 "수동 확인 필요"
- `mixed`: 일부 자동, 일부 수동. 자동 가능한 부분만 검증

## 매핑 규칙

plan.md → contract 추출:
- `### SLICE-{NNN}: 제목` → `SLICE-{NNN}.yaml`
- bullet 항목 → criteria 배열
- verification 기본값: `auto`
- "수동", "manual", "확인 필요" 키워드 → `manual`

## 변경 처리

- plan.md 수정 → 기존 contract와 diff → 사용자에게 업데이트 제안
- 새 슬라이스 → 새 contract 생성
- 삭제된 슬라이스 → status를 `archived`로 변경 (파일 삭제 안 함)
- 동일 슬라이스 재실행 → 기존 contract 업데이트 (멱등)
```

- [ ] **Step 4: report-format.md 작성**

```markdown
# Review Report Format

## 파일 위치

`.deep-review/reports/{YYYY-MM-DD}-review.md`

## 구조

```markdown
# Deep Review Report — {날짜}

## Summary
- **Verdict**: {APPROVE | REQUEST_CHANGES | CONCERN}
- **Review Mode**: {Claude Opus Only | 3-way Cross-Model}
- **Issues**: {🔴 N건, 🟡 N건, ℹ️ N건}

## Sprint Contract: {SLICE-ID} (있을 때만)
| 기준 | 상태 | 근거 |
|------|------|------|
| {description} | {✅ PASS / ❌ FAIL / ⚠️ PARTIAL / ⏭️ SKIP} | {evidence} |

## Cross-Model Verification (Codex 사용 시)
| 항목 | Claude | Codex | Codex Adversarial | 확신도 |
|------|--------|-------|-------------------|--------|
| {issue} | {🔴/🟡/—} | {🔴/🟡/—} | {🔴/🟡/—} | {높음/중간/낮음} |

## Code Review
### 🔴 Critical
{구체적 이슈, 파일:라인, 수정 제안}

### 🟡 Warning
{구체적 이슈, 파일:라인, 수정 제안}

### 🟢 Passed
{통과한 관점 목록}

## Entropy Scan (--entropy 사용 시)
{중복 코드, 패턴 불일치, ad-hoc 헬퍼 목록}
```

## Verdict 결정 규칙

- 🔴 이슈가 1건 이상 → REQUEST_CHANGES
- 🟡만 있고 전원 일치 → REQUEST_CHANGES
- 🟡만 있고 의견 분리 → CONCERN (사람에게 에스컬레이션)
- 🟢만 → APPROVE
```

- [ ] **Step 5: 커밋**

```bash
cd ~/dev/deep-review
git add skills/deep-review-workflow/references/
git commit -m "docs: add review criteria, codex integration, contract schema, report format references"
```

---

### Task 4: 독립 리뷰어 에이전트

**Files:**
- Create: `~/dev/deep-review/agents/code-reviewer.md`

- [ ] **Step 1: code-reviewer.md 작성**

```markdown
---
name: code-reviewer
model: opus
color: red
description: |
  독립적인 코드 리뷰어 에이전트. Generator의 컨텍스트를 공유하지 않는
  별도 에이전트로서, 코드 변경사항을 5가지 관점에서 평가한다.
whenToUse: |
  deep-review 커맨드에서 자동으로 spawn된다. 직접 호출하지 않는다.
tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Code Reviewer Agent

당신은 독립적인 코드 리뷰어입니다. 당신은 코드를 작성한 에이전트가 **아닙니다**.
코드를 작성한 에이전트의 컨텍스트를 전혀 모르는 상태에서, 오직 코드 자체만 보고 평가합니다.

## 리뷰 원칙

1. **자기 승인 편향 없음**: 이 코드는 당신이 쓴 것이 아닙니다. 객관적으로 평가하세요.
2. **구체적 근거**: 모든 지적에는 파일 경로, 라인 번호, 구체적 이유를 포함합니다.
3. **수정 제안**: 문제를 지적할 때 반드시 수정 방법도 제안합니다.
4. **심각도 분류**: 🔴 Critical (버그, 보안), 🟡 Warning (품질, 엔트로피), ℹ️ Info (스타일)

## 리뷰 절차

### 입력

프롬프트에서 다음 정보를 받습니다:
- `diff`: 리뷰할 코드 변경사항 (git diff 또는 파일 목록)
- `rules_yaml`: 프로젝트 아키텍처/스타일 규칙 (없을 수 있음)
- `contract`: Sprint Contract 성공 기준 (없을 수 있음)

### 절차

1. **변경 파일 읽기**: diff에 포함된 모든 파일을 Read로 읽습니다.
2. **관련 코드 탐색**: 변경된 함수가 호출하거나 호출되는 코드를 Grep으로 찾습니다.
3. **테스트 파일 확인**: 변경에 대응하는 테스트 파일을 Glob으로 찾습니다.
4. **5가지 관점 평가**: `review-criteria.md` 참조
5. **Contract 검증**: contract가 있으면 각 criteria를 코드에서 검증
6. **리포트 작성**: `report-format.md` 형식으로 출력

### 5가지 관점

| # | 관점 | 검사 내용 |
|---|------|-----------|
| 1 | 정확성 | 로직 버그, 엣지 케이스, 에러 핸들링 |
| 2 | 아키텍처 정합성 | rules.yaml 위반, 레이어 경계, 종속성 방향 |
| 3 | 엔트로피 | 중복 코드, 패턴 불일치, ad-hoc 헬퍼 |
| 4 | 테스트 충분성 | 변경 대비 커버리지, 누락 시나리오 |
| 5 | 가독성 | 에이전트가 다음에 읽을 때 이해 가능한가 |

### Contract 검증

contract가 제공되면 각 criteria에 대해:
- `verification: auto` → 코드를 읽고 충족 여부 판단
- `verification: manual` → SKIP 처리, "수동 확인 필요" 표시
- `verification: mixed` → 자동 가능한 부분만 검증, 나머지 SKIP

### 출력 형식

`report-format.md`의 구조를 따라 마크다운으로 출력합니다.
Verdict는 반드시 APPROVE, REQUEST_CHANGES, CONCERN 중 하나입니다.
```

- [ ] **Step 2: 커밋**

```bash
cd ~/dev/deep-review
git add agents/code-reviewer.md
git commit -m "feat: add independent code-reviewer agent (Opus model)"
```

---

### Task 5: 리뷰 워크플로우 스킬

**Files:**
- Create: `~/dev/deep-review/skills/deep-review-workflow/SKILL.md`

- [ ] **Step 1: SKILL.md 작성**

```markdown
---
name: deep-review-workflow
description: |
  deep-review 플러그인의 코어 워크플로우 정의. 환경 감지, 리뷰 파이프라인,
  교차 검증, 리포트 합성 등 전체 리뷰 프로세스를 가이드한다.
user-invocable: false
---

# Deep Review Workflow

이 스킬은 `/deep-review` 커맨드에서 로드되어 리뷰 프로세스를 가이드합니다.

## 참조 문서

- `references/review-criteria.md` — 5가지 리뷰 관점
- `references/codex-integration.md` — Codex 교차 검증
- `references/contract-schema.md` — Sprint Contract 스키마
- `references/report-format.md` — 리포트 형식

## 4단계 파이프라인

### Stage 1: Collect (변경 수집)

1. 환경 감지 스크립트 실행: `bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/detect-environment.sh`
2. 결과를 key=value 형식으로 파싱
3. 결과에 따라 diff 수집:
   - `change_state=non-git` → 사용자에게 리뷰할 파일 목록 요청
   - `change_state=initial` → 모든 파일 대상 리뷰
   - `change_state=clean` → `git diff {review_base}..HEAD`
   - `change_state=staged` → `git diff --cached`
   - `change_state=unstaged` → `git diff`
   - `change_state=mixed` → `git diff HEAD` (staged + unstaged 모두)
   - `change_state=untracked-only` → `git ls-files --others --exclude-standard`로 파일 목록 수집
3. diff에서 제외: 바이너리, vendor/, node_modules/, *.min.js, *.generated.*

### Stage 2: Contract Check (계약 검증)

1. `.deep-review/contracts/` 디렉토리 확인
2. contract 파일이 있으면 로드
3. `--contract` 플래그가 있거나, deep-work 연동 시 자동 실행
4. 없으면 이 단계 건너뜀

### Stage 3: Deep Review (교차 검증)

환경에 따라 리뷰어 구성이 달라짐:

**Case A: non-git 또는 커밋 0건**
→ Claude Opus 서브에이전트 단독 리뷰

**Case B: git + 커밋 있음 + Codex 미설치**
→ Claude Opus 서브에이전트 단독 리뷰
→ 세션 내 최초 1회 Codex 설치 안내

**Case C: git + 커밋 있음 + Codex 설치+인증**
→ 3-way 병렬 실행:
  1. Agent(code-reviewer, model: opus) — 독립 리뷰
  2. Skill(codex:review --background --base {base}) — 코드 리뷰
  3. Skill(codex:adversarial-review --background --base {base} "{focus}") — 적대적 리뷰

**커밋되지 않은 상태에서:**
- 사용자에게 WIP 커밋 제안
- 수락 → WIP 커밋 후 Case C
- 거부 → Claude Opus 리뷰 (diff 기반) + 가능하면 Codex도 실행

### Stage 4: Verdict (판정)

1. 모든 리뷰 결과 수집
2. 교차 검증 합성 (`codex-integration.md` 참조)
3. Verdict 결정: APPROVE / REQUEST_CHANGES / CONCERN
4. 리포트 생성: `.deep-review/reports/{날짜}-review.md`
5. REQUEST_CHANGES 시 + Codex 있으면: "codex:rescue로 수정을 위임하시겠습니까?" 제안

## config.yaml 스키마

```yaml
# .deep-review/config.yaml
review_model: opus              # opus | sonnet (리뷰어 모델)
codex_notified: false           # Codex 설치 안내 1회 표시 여부
last_review: null               # 마지막 리뷰 시각
app_qa:                         # Mode 2 (v1.1에서 구현)
  last_command: null
  last_url: null
```
```

- [ ] **Step 2: 커밋**

```bash
cd ~/dev/deep-review
git add skills/deep-review-workflow/SKILL.md
git commit -m "feat: add deep-review-workflow skill (4-stage pipeline)"
```

---

### Task 6: 메인 커맨드 — `/deep-review`

**Files:**
- Create: `~/dev/deep-review/commands/deep-review.md`

- [ ] **Step 1: deep-review.md 작성**

```markdown
---
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, Skill, AskUserQuestion
description: 현재 변경사항을 독립 에이전트로 리뷰합니다. init으로 규칙 초기화, --contract로 Sprint Contract 기반 검증, --entropy로 엔트로피 스캔.
argument-hint: "[init] [--contract] [--entropy]"
---

# /deep-review — Independent Code Review

현재 코드 변경사항을 독립된 Evaluator 에이전트로 리뷰합니다.

## Argument Dispatch

- `init` → "init 모드" 섹션으로 분기 (프로젝트별 규칙 초기화)
- `--contract` / `--entropy` / 인수 없음 → "리뷰 모드"로 진행

## Prerequisites

`deep-review-workflow` 스킬을 로드합니다.

## 0. Auto-create .deep-review/ (리뷰 모드, 최초 실행 시)

`.deep-review/` 디렉토리가 없으면 **자동 생성** (init 실행 없이도 동작 보장):
```bash
mkdir -p .deep-review/contracts .deep-review/reports .deep-review/journeys
```
config.yaml이 없으면 기본값으로 생성:
```yaml
review_model: opus
codex_notified: false
```
rules.yaml은 생성하지 않음 (없으면 범용 기본 관점으로 리뷰).

## Steps (리뷰 모드)

### 1. 환경 감지

```bash
bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/detect-environment.sh
```

결과를 key=value 형식으로 파싱하여 환경 상태를 파악합니다.

### 2. 변경사항 수집 (Stage 1: Collect)

환경에 따라 diff를 수집합니다:

**non-git 환경 (change_state=non-git):**
- AskUserQuestion: "어떤 파일을 리뷰할까요?"
- 지정된 파일들의 전체 내용을 수집

**git + 커밋 0건 (change_state=initial):**
- 모든 파일 대상 리뷰 (empty tree hash 기준)

**git + clean (change_state=clean):**
- `git diff {review_base}..HEAD`로 최근 변경 수집

**git + staged/unstaged/mixed:**
- 해당 상태에 맞는 diff 수집 (staged: `--cached`, unstaged: `git diff`, mixed: `git diff HEAD`)
- AskUserQuestion으로 WIP 커밋 제안: "Codex 교차 검증을 위해 WIP 커밋을 생성할까요?"
  - 수락: `git add -A && git commit -m "wip: deep-review checkpoint"`
  - 거부: diff 기반으로 진행 (Claude Opus + 가능하면 Codex도)

**git + untracked-only:**
- `git ls-files --others --exclude-standard`로 파일 목록 수집 후 내용 읽기

diff에서 제외: 바이너리, vendor/, node_modules/, *.min.js, *.generated.*, *.lock

### 3. Contract 로드 (Stage 2: Contract Check)

`--contract` 플래그가 있거나, `.deep-review/contracts/` 에 파일이 있으면:
- 가장 최근 contract 파일을 로드
- 특정 슬라이스 지정 시 해당 contract만 로드

### 4. 리뷰 실행 (Stage 3: Deep Review)

**Claude Opus 서브에이전트 (항상 실행):**

Agent tool로 `code-reviewer` 에이전트를 spawn합니다:
- `model: "opus"` (config.yaml의 review_model로 오버라이드 가능)
- prompt에 포함: diff 내용, rules.yaml (있으면), contract (있으면)

**Codex 교차 검증 (git + Codex 사용 가능 시):**

병렬로 실행:
- `codex:review --background --base {review_base}`
- `codex:adversarial-review --background --base {review_base} "{focus_text}"`

focus_text 생성:
- rules.yaml이 있으면: 아키텍처 규칙, 엔트로피 규칙에서 추출
- contract가 있으면: criteria 목록 추가
- 둘 다 없으면: "코드 품질, 버그, 아키텍처 문제를 집중 검토"

**Codex 미설치 시:**
- `.deep-review/config.yaml`의 `codex_notified` 확인
- false이면 1회 알림: "Codex 플러그인이 설치되어 있으면 교차 모델 검증이 가능합니다. 설치: claude plugin add codex"
- `codex_notified: true`로 업데이트

### 5. 합성 및 판정 (Stage 4: Verdict)

모든 리뷰 결과를 수집한 후:

1. 교차 검증 합성 (Codex 결과가 있을 때):
   - 전원 일치 지적 → 🔴 높은 확신
   - 2/3 지적 → 🟡 중간 확신
   - 단독 지적 → 참고
   - 전원 통과 → 🟢

2. Verdict 결정:
   - 🔴 1건 이상 → **REQUEST_CHANGES**
   - 🟡만, 전원 일치 → **REQUEST_CHANGES**
   - 🟡만, 의견 분리 → **CONCERN**
   - 🟢만 → **APPROVE**

3. 리포트 저장: `.deep-review/reports/{YYYY-MM-DD}-review.md`

4. REQUEST_CHANGES + Codex 있을 때:
   "수정을 codex:rescue로 위임하시겠습니까?"

### 6. 엔트로피 스캔 (--entropy)

`--entropy` 플래그가 있으면 추가 스캔:
- 프로젝트 전체에서 중복 코드 블록 탐지
- 기존 유틸리티와 중복되는 새 헬퍼 함수 탐지
- 네이밍 컨벤션 불일치 탐지
- 결과를 `.deep-review/entropy-log.jsonl`에 append

### 7. App QA (--qa) — v1.1에서 구현

현재 v1.0에서는: "App QA는 deep-review v1.1에서 지원 예정입니다."

---

## Steps (init 모드 — 인수가 "init"일 때)

### 1. 기존 설정 확인

`.deep-review/` 디렉토리가 이미 존재하는지 확인합니다.
- 존재하면: AskUserQuestion "이미 초기화되어 있습니다. 다시 초기화할까요?"
- 없으면: 진행

### 2. 디렉토리 생성

```bash
mkdir -p .deep-review/contracts
mkdir -p .deep-review/reports
mkdir -p .deep-review/journeys
```

### 3. 프로젝트 분석

코드베이스를 탐색하여 아키텍처 규칙을 추론합니다:

1. **언어/프레임워크 감지**: package.json, pyproject.toml, Cargo.toml 등
2. **디렉토리 구조 분석**: src/, lib/, components/ 등의 패턴
3. **기존 린터 규칙**: .eslintrc, .prettierrc, ruff.toml 등에서 스타일 규칙 추출
4. **네이밍 컨벤션**: 기존 파일/함수의 네이밍 패턴 분석

### 4. 사용자와 대화형 규칙 설정 (AskUserQuestion)

분석 결과를 바탕으로 AskUserQuestion으로 질문:

"프로젝트를 분석했습니다. 다음 규칙을 적용할까요?"

**(A) 아키텍처 레이어:**
- 감지된 레이어 구조 제시 (또는 "감지된 구조 없음")
- 사용자가 수정/추가/건너뛰기 가능

**(B) 스타일 규칙:**
- 감지된 네이밍 컨벤션, 파일 크기 제한 등
- 기존 린터 규칙과 통합

**(C) 엔트로피 규칙:**
- 공유 유틸리티 선호 여부
- 유사 블록 반복 허용 횟수

### 5. config.yaml 생성

```yaml
# .deep-review/config.yaml
review_model: opus
codex_notified: false
last_review: null
app_qa:
  last_command: null
  last_url: null
```

### 6. rules.yaml 생성

사용자 확인을 받은 규칙으로 생성합니다. 예시:

```yaml
# .deep-review/rules.yaml
# Generated by /deep-review init on {날짜}

architecture:
  layers: []          # 사용자 정의 또는 빈 배열
  direction: top-down
  cross_cutting: []

style:
  max_file_lines: 300
  naming: null        # 감지된 컨벤션 또는 null
  logging: null

entropy:
  prefer_shared_utils: true
  max_similar_blocks: 3
  validate_at_boundaries: true
```

### 7. .gitignore 업데이트

`.deep-review/reports/`를 .gitignore에 추가할지 사용자에게 확인:
- 리포트는 보통 커밋할 필요 없음 (일시적)
- config.yaml과 rules.yaml은 커밋 권장

### 8. 완료 메시지

"deep-review 초기화 완료. `/deep-review`로 리뷰를 시작하세요."

(이 init 로직은 메인 커맨드 deep-review.md의 "init 모드" 섹션에 포함되어 있음 — 별도 커맨드 파일 없음)

```

- [ ] **Step 2: 커밋**

```bash
cd ~/dev/deep-review
git add commands/deep-review.md
git commit -m "feat: add /deep-review command (review + init mode, AskUserQuestion)"
```

---

### Task 7: hooks.json (빈 구조)

**Files:**
- Create: `~/dev/deep-review/hooks/hooks.json`

- [ ] **Step 1: hooks.json 작성**

deep-review v1.0은 자체 hook이 필요하지 않습니다 (deep-work이 deep-review를 호출하는 구조). 빈 hooks.json을 생성하여 향후 확장을 준비합니다.

```json
{
  "description": "deep-review hooks (v1.0: no active hooks)",
  "hooks": {}
}
```

- [ ] **Step 2: 커밋**

```bash
cd ~/dev/deep-review
git add hooks/hooks.json
git commit -m "chore: add empty hooks.json for future extensibility"
```

---

### Task 8: 통합 테스트 — 전체 플러그인 동작 확인

**Files:**
- None (수동 테스트)

- [ ] **Step 1: 플러그인 설치 테스트**

```bash
cd ~/dev/deep-review
claude plugin add ./
```

Expected: 플러그인이 로컬에서 로드됨

- [ ] **Step 2: /deep-review init 실행**

테스트 프로젝트 디렉토리에서:
```bash
cd /tmp/test-project
git init && echo "test" > index.js && git add . && git commit -m "init"
```

Claude Code에서 `/deep-review init` 실행.
Expected: `.deep-review/` 디렉토리 생성, 대화형 규칙 설정

- [ ] **Step 3: /deep-review 실행**

테스트 변경 생성:
```bash
echo "function broken() { return undefined.foo; }" >> index.js
git add . && git commit -m "add broken function"
```

Claude Code에서 `/deep-review` 실행.
Expected:
- 환경 감지 성공
- Opus 서브에이전트가 리뷰 실행
- `.deep-review/reports/` 에 리포트 생성
- Verdict 출력

- [ ] **Step 4: 최종 커밋**

```bash
cd ~/dev/deep-review
git add -A
git commit -m "chore: finalize deep-review v1.0 plugin"
```

---

## Out of Scope for v1.0

다음 항목은 spec에 정의되어 있으나 v1.0 plan에서는 **명시적으로 제외**:

| 항목 | 이유 | 예정 버전 |
|------|------|-----------|
| Mode 2: App QA (--qa) | 브라우저 도구 의존, 별도 설계 필요 | v1.1 |
| deep-work W1: Sprint Contract 생성 (plan.md → contracts/) | deep-work 플러그인 수정 필요, 별도 plan | 2순위 plan |
| deep-work W2: Phase 3/4 자동 호출 hook | deep-work 플러그인 수정 필요 | 2순위 plan |
| deep-wiki K1, K2: 자동 ingest, 리뷰 축적 | deep-wiki 플러그인 수정 필요 | 2순위 plan |
| deep-evolve E1: deep-review 평가 하네스 | deep-evolve 플러그인 수정 필요 | 3순위 plan |

v1.0은 **deep-review 독립 동작**에 집중한다. Contract 파일은 수동으로 생성하거나, 향후 deep-work W1에서 자동 생성된다.
