@AGENTS.md

## Claude Code only

`claude plugin validate .` must stay green. It is the official marketplace-schema conformance check, and the reason suite metadata lives in the sidecar rather than in `marketplace.json`. Run it after any `.claude-plugin/` change — `npm run preflight` does not cover it.
