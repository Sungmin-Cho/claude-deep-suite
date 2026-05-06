# Plugin table template

The generator (`scripts/generate-reference-sections.js`) renders three flavours of the plugin table:

- **README.md** (English): `| [name](repo_url) | version | desc_first_sentence |`
- **README.ko.md** (한국어): same shape with Korean column headers
- **CLAUDE.md** (project memory): `| name | version | desc_first_sentence |` (no link wrapping — CLAUDE.md prefers compact display)

The version column reads `plugin.json.version` from the **pinned commit SHA** in `marketplace.json`, *not* the current HEAD of the plugin repo. This guarantees the suite docs reflect what the marketplace actually distributes.

The description column truncates to the first sentence (`description.split(/[.—]/)[0].trim()`) so multi-paragraph marketplace entries render as a single readable row. CLAUDE.md / README rows must never wrap.

This file is documentation only — the generator does not read it. The contract lives in `scripts/generate-reference-sections.js` (`renderPluginTable()`).
