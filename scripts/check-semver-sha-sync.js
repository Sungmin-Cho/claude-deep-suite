#!/usr/bin/env node
// Verifies marketplace.entry.sha → plugin.json.version → suite docs.
//
// Algorithm (per plugin):
//   1. Fetch the plugin's plugin.json at the pinned SHA.
//   2. Compare against the version that suite docs claim — sourced from
//      generated marker blocks in README.md / README.ko.md / CLAUDE.md.
//   3. Fail if any of:
//      - plugin.json.version absent at that SHA
//      - version mismatches what marker blocks say
//
// This is the "cache key drift" guard from roadmap §M2 — sidecar SHA and
// suite docs version must agree about what the marketplace will distribute.
//
// Exit codes: 0 clean, 1 drift, 2 IO/usage/fetch.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMarketplace, fetchPluginJson, FetchError } from './lib/fetch-plugin-files.js';
import { extractBlock } from './lib/markers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const TARGETS = [
  { file: 'README.md', id: 'plugin-table-en' },
  { file: 'README.ko.md', id: 'plugin-table-ko' },
  { file: 'CLAUDE.md', id: 'plugin-table-claude' },
];

// Pull `<plugin>` and version from a row like `| [name](url) | 6.4.2 | desc |`
// or `| name | 6.4.2 | desc |`.
function rowsFromMarker(body) {
  const lines = body.split('\n');
  const rows = new Map(); // plugin -> version
  for (const line of lines) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map((s) => s.trim());
    if (cells.length < 4) continue;
    // Header rows: skip if Version cell is "Version" / "버전" / "---".
    const verCell = cells[2];
    if (!/^\d+\.\d+\.\d+/.test(verCell)) continue;
    // Plugin name is in cell 1; strip markdown link if present.
    const nameCell = cells[1];
    const nameMatch = nameCell.match(/^(?:\[)?([a-z][a-z0-9-]+?)(?:\])?(?:\(.*\))?$/);
    if (!nameMatch) continue;
    rows.set(nameMatch[1], verCell);
  }
  return rows;
}

function main() {
  if (process.argv.length > 2) {
    console.error('error: this checker takes no arguments');
    process.exitCode = 2;
    return;
  }

  let market;
  try {
    market = readMarketplace(REPO_ROOT);
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exitCode = 2;
    return;
  }

  const versions = {};
  for (const p of market.plugins) {
    try {
      const json = fetchPluginJson(p);
      if (!json.version) {
        console.error(`✗ ${p.plugin}@${p.sha.slice(0, 7)} plugin.json missing "version" field`);
        process.exitCode = 1;
        return;
      }
      versions[p.plugin] = json.version;
    } catch (err) {
      console.error(`error: fetch failed for ${p.plugin}: ${err.message}`);
      process.exitCode = 2;
      return;
    }
  }

  let drift = 0;
  for (const t of TARGETS) {
    const filePath = resolve(REPO_ROOT, t.file);
    if (!existsSync(filePath)) {
      console.error(`error: ${t.file} not found`);
      process.exitCode = 2;
      return;
    }
    const content = readFileSync(filePath, 'utf8');
    const block = extractBlock(content, t.id);
    if (!block.ok) {
      console.error(`error: ${t.file}: ${block.reason}`);
      process.exitCode = 2;
      return;
    }
    const rows = rowsFromMarker(block.body);
    for (const p of market.plugins) {
      const docVer = rows.get(p.plugin);
      const expected = versions[p.plugin];
      if (!docVer) {
        console.error(`✗ ${t.file} marker "${t.id}" missing row for "${p.plugin}"`);
        drift++;
        continue;
      }
      if (docVer !== expected) {
        console.error(`✗ ${t.file} marker "${t.id}" — ${p.plugin} v${docVer}, expected v${expected} (pinned SHA ${p.sha.slice(0, 7)})`);
        drift++;
      }
    }
  }

  if (drift > 0) {
    console.error('');
    console.error('Fix: node scripts/generate-reference-sections.js --write');
    console.error('     (or bump marketplace.json sha to a commit whose plugin.json.version matches the docs)');
    process.exitCode = 1;
    return;
  }
  console.log(`✓ marketplace SHA → plugin.json.version → suite docs all agree (${market.plugins.length} plugins, ${TARGETS.length} files)`);
  process.exitCode = 0;
}

main();
