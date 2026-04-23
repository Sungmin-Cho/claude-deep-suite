# Claude Deep Suite

Claude Code 플러그인 마켓플레이스. 6개의 플러그인을 번들링하여 구조화된 개발, 지식 관리, 자율 실험, 독립 코드 리뷰, 문서 정비, 하네스 진단을 제공한다.

Harness Engineering 프레임워크(Agent = Model + Harness) 기반으로, Guides(feedforward) × Sensors(feedback)를 Computational/Inferential 축에 배치한다.

## Plugins

| Plugin | Version | Description |
|--------|---------|-------------|
| deep-work | 6.4.0 | Evidence-Driven Development Protocol (Brainstorm → Research → Plan → Implement → Test → Integrate) |
| deep-wiki | 1.1.2 | LLM-managed markdown wiki |
| deep-evolve | 3.0.0 | Autonomous Experimentation Protocol with cross-plugin feedback |
| deep-review | 1.3.2 | Independent Evaluator with cross-model verification + Codex auto-exposure protocol |
| deep-docs | 1.1.0 | Document gardening agent |
| deep-dashboard | 1.1.1 | Cross-plugin harness diagnostics |

각 플러그인은 별도 Git 리포지토리로 관리: `github.com/Sungmin-Cho/claude-deep-{name}`

## Project Structure

```
.claude-plugin/marketplace.json  — 마켓플레이스 매니페스트
docs/
  harness-engineering-*.md       — 아키텍처 분석 및 로드맵
  superpowers/specs/             — 플러그인 설계 문서
  superpowers/plans/             — 플러그인 구현 계획
README.md / README.ko.md        — 프로젝트 소개 (EN/KO)
```

## Conventions

- 이 리포지토리는 마켓플레이스 메타데이터와 문서만 포함. 플러그인 소스 코드는 각 플러그인 리포지토리에 있음
- 문서는 한국어/영어 병행. README는 양쪽 모두 유지
- 플러그인 버전은 `marketplace.json`에서 관리
