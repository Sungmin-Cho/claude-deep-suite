# Source-pinning template

The generator emits `docs/source-pinning.md` from `marketplace.json`:

| Plugin | Repo | SHA | Pinned at |
|---|---|---|---|
| deep-work | `Sungmin-Cho/claude-deep-work` | `df3ac9d` | (ISO date when this generator last ran) |

The "Pinned at" column is the *generation timestamp*, not the upstream commit date. Daily cron re-runs the generator; the column updates every time a SHA bumps. To check upstream commit dates, follow the SHA link.

`docs/capability-matrix.md` and `docs/artifact-io-graph.md` are likewise auto-generated. All three files live under markers and must never be hand-edited (CI rejects).

This file is documentation only — the generator does not read it. The contract lives in `scripts/generate-reference-sections.js` (`renderSourcePinning()`, `renderCapabilityMatrix()`, `renderArtifactIoGraph()`).
