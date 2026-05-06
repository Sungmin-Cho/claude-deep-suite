<!-- deep-suite:auto-generated:artifact-io-graph:start -->

# Cross-Plugin Artifact I/O Graph

**Auto-generated** by `scripts/generate-reference-sections.js`. Do not hand-edit.

Every `writes`/`reads` path declared in `.claude-plugin/suite-extensions.json` rendered as Mermaid. Reader/writer mismatch is a contract bug — `scripts/check-pinned-plugin-paths.js` verifies the pinned plugin source contains each path literal.

```mermaid
flowchart LR
  deep-work-->|writes|p1[".deep-work/<session>/session-receipt.json"]
  deep-work-->|writes|p2[".deep-work/<session>/receipts/SLICE-*.json"]
  deep-work-->|writes|p3[".deep-work/harness-history/harness-sessions.jsonl"]
  p4[".deep-dashboard/harnessability-report.json"]-->|reads|deep-work
  p5[".deep-evolve/<session>/evolve-insights.json"]-->|reads|deep-work
  p6[".deep-review/recurring-findings.json"]-->|reads|deep-work
  p7["<wiki_root>/.wiki-meta/index.json"]-->|reads|deep-work
  deep-wiki-->|writes|p8["<wiki_root>/log.jsonl"]
  deep-wiki-->|writes|p7["<wiki_root>/.wiki-meta/index.json"]
  deep-wiki-->|writes|p9["<wiki_root>/.wiki-meta/.versions/*"]
  deep-wiki-->|writes|p10["<wiki_root>/pages/**/*.md"]
  p11["<wiki_root>/.wiki-meta/.pending-scan"]-->|reads|deep-wiki
  deep-evolve-->|writes|p12[".deep-evolve/current.json"]
  deep-evolve-->|writes|p13[".deep-evolve/<session>/evolve-receipt.json"]
  deep-evolve-->|writes|p5[".deep-evolve/<session>/evolve-insights.json"]
  deep-evolve-->|writes|p14[".deep-evolve/<session>/forum.jsonl"]
  p6[".deep-review/recurring-findings.json"]-->|reads|deep-evolve
  deep-review-->|writes|p15[".deep-review/reports/<timestamp>-review.md"]
  deep-review-->|writes|p16[".deep-review/responses/<timestamp>-response.md"]
  deep-review-->|writes|p6[".deep-review/recurring-findings.json"]
  deep-review-->|writes|p17[".deep-review/entropy-log.jsonl"]
  p1[".deep-work/<session>/session-receipt.json"]-->|reads|deep-review
  p18[".deep-review/contracts/SLICE-*.yaml"]-->|reads|deep-review
  p19[".deep-review/fitness.json"]-->|reads|deep-review
  deep-docs-->|writes|p20[".deep-docs/last-scan.json"]
  deep-dashboard-->|writes|p4[".deep-dashboard/harnessability-report.json"]
  p21[".deep-work/**"]-->|reads|deep-dashboard
  p22[".deep-review/**"]-->|reads|deep-dashboard
  p23[".deep-docs/**"]-->|reads|deep-dashboard
  p24[".deep-evolve/**"]-->|reads|deep-dashboard
  p25["<wiki_root>/.wiki-meta/**"]-->|reads|deep-dashboard
```

<!-- deep-suite:auto-generated:artifact-io-graph:end -->
