#!/usr/bin/env node
// Verifies that integrated-workflow-guide{,.ko}.md narrative version mentions
// (e.g., "deep-work v6.4.2") match the pinned plugin.json.version for each plugin.
//
// Strategy: fetch each plugin's plugin.json at the pinned SHA, then for each
// guide, scan for `<plugin> v<X.Y.Z>` and `<plugin>` followed by a `vX.Y.Z`
// within ~40 chars. Flag mismatches with file:line.
//
// Note: this is intentionally narrative-aware. The marker block itself is
// generated; this checker focuses on the prose around it.
//
// Exit codes: 0 clean, 1 drift, 2 IO/usage/fetch.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMarketplace, fetchPluginJson, FetchError } from './lib/fetch-plugin-files.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const TARGETS = [
  'guides/integrated-workflow-guide.md',
  'guides/integrated-workflow-guide.ko.md',
];

// Only flag *canonical* "this guide reflects <plugin> vX.Y.Z" claims, not
// historical mentions like "(new in deep-work v6.3.0)". The canonical claim
// is the bold form `**<plugin> vX.Y.Z**` (used in the "Reflects ..." preamble).
function findOffenses({ content, file, plugins, versions }) {
  const lines = content.split('\n');
  const issues = [];
  for (const p of plugins) {
    const re = new RegExp(`\\*\\*${escape(p)}\\s+v(\\d+\\.\\d+\\.\\d+)\\*\\*`, 'g');
    const expectedVer = versions[p];
    if (!expectedVer) continue;
    lines.forEach((line, i) => {
      for (const m of line.matchAll(re)) {
        if (m[1] !== expectedVer) {
          issues.push({
            file, line: i + 1, plugin: p, found: m[1], expected: expectedVer, snippet: line.trim()
          });
        }
      }
    });
  }
  return issues;
}
function escape(s) { return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); }

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
      versions[p.plugin] = json.version;
    } catch (err) {
      if (err instanceof FetchError) {
        console.error(`error: fetch failed for ${p.plugin}: ${err.message}`);
      } else {
        console.error(`error: ${err.message}`);
      }
      process.exitCode = 2;
      return;
    }
  }
  const pluginNames = market.plugins.map((p) => p.plugin);

  let drift = 0;
  for (const t of TARGETS) {
    const filePath = resolve(REPO_ROOT, t);
    if (!existsSync(filePath)) {
      console.error(`error: ${t} not found`);
      process.exitCode = 2;
      return;
    }
    const content = readFileSync(filePath, 'utf8');
    const offenses = findOffenses({ content, file: t, plugins: pluginNames, versions });
    for (const o of offenses) {
      console.error(`✗ ${o.file}:${o.line} — ${o.plugin} v${o.found}, expected v${o.expected}`);
      console.error(`    ${o.snippet}`);
      drift++;
    }
  }

  if (drift > 0) {
    console.error('');
    console.error('Fix: bump marketplace.json sha (so plugin.json.version matches), or update the guide text.');
    process.exitCode = 1;
    return;
  }
  console.log(`✓ guide narrative versions match pinned plugin.json.version (${TARGETS.length} files, ${pluginNames.length} plugins)`);
  process.exitCode = 0;
}

main();
