# Regression fixture for review C1

The path below is intentionally bogus — `nonexistent-typo-file.md` is not in
the repo and is not gitignored. The hardened soft-skip predicate must NOT
silently pass over it. See `scripts/check-claude-md-paths.js` and
`tests/cli-sync-checkers.test.js` "regression: bogus path".

## Project Structure

```
README.md                       — real, exists
nonexistent-typo-file.md        — bogus, must trigger drift
package.json                    — real, exists
```

## Conventions

placeholder
