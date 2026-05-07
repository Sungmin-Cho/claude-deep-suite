#!/usr/bin/env node
// Lints README.md / README.ko.md / CLAUDE.md for plugin-table drift outside markers.
//
// Why: a future hand-editor might add a "v6.4.3" mention in the *narrative* part
// of README, but forget to bump marketplace.json. Our generator only refreshes
// the marker block, so a stray version number outside markers can lie silently.
//
// Strategy: enumerate plugin names from marketplace.json, then in each target
// file, count occurrences of `<plugin>` followed by a version-like token
// (`X.Y.Z`) outside marker blocks. If any are found, fail with file:line
// pointing at the offending line. The version inside marker blocks is the
// authoritative source.
//
// Exit codes: 0 = clean, 1 = drift, 2 = IO/usage.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMarketplace } from './lib/fetch-plugin-files.js';
import { startMarker, endMarker } from './lib/markers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const TARGETS = [
  { file: 'README.md', markerIds: ['plugin-table-en'] },
  { file: 'README.ko.md', markerIds: ['plugin-table-ko'] },
  { file: 'CLAUDE.md', markerIds: ['plugin-table-claude'] },
];

function maskMarkerBlocks(content, markerIds) {
  let out = content;
  for (const id of markerIds) {
    const start = startMarker(id);
    const end = endMarker(id);
    const re = new RegExp(`${escape(start)}[\\s\\S]*?${escape(end)}`, 'g');
    out = out.replace(re, (m) => '\n'.repeat(m.split('\n').length - 1));
  }
  return out;
}
function escape(s) { return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); }

function findOffenses({ content, masked, plugins, file }) {
  const lines = masked.split('\n');
  const issues = [];
  // Match `<plugin>` adjacent to version-like token (within ~30 chars).
  for (const p of plugins) {
    const re = new RegExp(`\\b${escape(p)}\\b[^\\n]{0,30}\\b\\d+\\.\\d+\\.\\d+\\b`);
    lines.forEach((line, idx) => {
      if (re.test(line)) {
        // Allow lines that explicitly *cite* a pinned-SHA history note (e.g., "v6.4.2 → v6.4.3").
        // For now, just flag every match. Maintainers can move the version into the marker block.
        issues.push({ file, line: idx + 1, plugin: p, snippet: line.trim() });
      }
    });
  }
  return issues;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
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
  const plugins = market.plugins.map((p) => p.plugin);

  let drift = 0;
  for (const t of TARGETS) {
    const filePath = resolve(REPO_ROOT, t.file);
    if (!existsSync(filePath)) {
      console.error(`error: ${t.file} not found`);
      process.exitCode = 2;
      return;
    }
    const content = readFileSync(filePath, 'utf8');
    const masked = maskMarkerBlocks(content, t.markerIds);
    const offenses = findOffenses({ content, masked, plugins, file: t.file });
    for (const o of offenses) {
      console.error(`✗ ${o.file}:${o.line} — "${o.plugin}" co-located with version literal outside marker block`);
      console.error(`    ${o.snippet}`);
      drift++;
    }
  }

  if (drift > 0) {
    console.error('');
    console.error(`Found ${drift} version-literal drift(s) outside generated marker blocks.`);
    console.error('Fix: move the version mention into marker block (regenerated from marketplace.json),');
    console.error('     or rephrase narrative to avoid hard-coded versions.');
    process.exitCode = 1;
    return;
  }
  console.log(`✓ no plugin-version drift outside marker blocks (${TARGETS.length} files)`);
  process.exitCode = 0;
}

main();
