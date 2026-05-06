#!/usr/bin/env node
// Verifies pinned-plugin docs do not contradict suite-level policies.
//
// Policies are keyword-based (see docs/memory-hierarchy.md §Conflict catalog).
// Sentence-level NLP would over-fit; the regex approach lets maintainers
// audit and extend the dictionary explicitly.
//
// Files probed per plugin (at the pinned SHA):
//   - README.md
//   - CHANGELOG.md
//   - AGENTS.md (optional)
//   - CLAUDE.md (optional)
//   - .claude-plugin/plugin.json
//
// Exit codes: 0 clean, 1 conflict, 2 IO/fetch.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMarketplace, fetchPluginFile, FetchError } from './lib/fetch-plugin-files.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const PROBE_FILES = ['README.md', 'CHANGELOG.md', 'AGENTS.md', 'CLAUDE.md'];

// Each policy: regex flag + a "permit" regex that allows the keyword in
// historical / negated contexts (e.g., "we *removed* the version field").
// If `match` triggers and `permit` does not, fail.
const POLICIES = [
  {
    id: 'marketplace-version-field',
    file: '*',
    match: /marketplace\.json[^\n]{0,80}\bversion\b\s*(?:field|key|property)/i,
    permit: /(omit|removed|no longer|deprecated|do not declare|don't declare)/i,
    message: 'plugin doc requires/expects "version" field on marketplace.json plugin entry — suite policy says omit (single-source-of-truth = plugin.json.version)',
  },
  {
    id: 'schema_version-bump',
    file: '*',
    match: /schema_version[^\n]{0,40}\b1\.1\b/i,
    permit: /(forbidden|locked|never|do not|don't|x-\*)/i,
    message: 'plugin doc proposes schema_version > 1.0 — suite policy locks at 1.0 (forward-compat via x-* patternProperties)',
  },
  {
    id: 'data_flow-authoritative',
    file: '*',
    match: /data_flow[^\n]{0,80}(authoritative|comprehensive|complete graph|all cross-plugin)/i,
    permit: /(non-authoritative|not authoritative|intent only|not exhaustive)/i,
    message: 'plugin doc treats sidecar data_flow as authoritative graph — suite policy declares non-authoritative (M3 envelope is machine truth)',
  },
  {
    id: 'wiki_root-prefix',
    file: '*',
    match: /<wiki-root>\//,
    permit: /\(deprecated\)/i,
    message: 'plugin doc uses "<wiki-root>/" (hyphen) — suite canonical is "<wiki_root>/" (underscore) per W-R1 fix',
    only: ['deep-wiki', 'deep-work', 'deep-dashboard'],
  },
];

function lineNumberOf(text, idx) {
  return text.slice(0, idx).split('\n').length;
}

function checkFile({ plugin, path, text }) {
  const offenses = [];
  for (const pol of POLICIES) {
    if (pol.only && !pol.only.includes(plugin)) continue;
    const m = text.match(pol.match);
    if (!m) continue;
    if (pol.permit && pol.permit.test(text)) continue;
    offenses.push({
      plugin,
      file: path,
      line: lineNumberOf(text, m.index),
      policyId: pol.id,
      message: pol.message,
      snippet: text.split('\n')[lineNumberOf(text, m.index) - 1].trim(),
    });
  }
  return offenses;
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

  let drift = 0;
  let probed = 0;
  for (const info of market.plugins) {
    for (const probe of PROBE_FILES) {
      let text;
      try {
        text = fetchPluginFile({ ...info, path: probe });
      } catch (err) {
        if (err instanceof FetchError && /not found/.test(err.message)) continue;
        console.error(`error: fetch ${info.plugin}/${probe}: ${err.message}`);
        process.exitCode = 2;
        return;
      }
      probed++;
      const offenses = checkFile({ plugin: info.plugin, path: probe, text });
      for (const o of offenses) {
        const cacheRel = `.deep-suite-cache/${o.plugin}-${info.sha.slice(0, 7)}.../${o.file}:${o.line}`;
        console.error(`✗ ${cacheRel} — policy "${o.policyId}"`);
        console.error(`    ${o.message}`);
        console.error(`    snippet: ${o.snippet}`);
        drift++;
      }
    }
  }

  if (drift > 0) {
    console.error('');
    console.error('Fix options:');
    console.error('  - Plugin doc wrong → PR to plugin upstream + bump marketplace.json sha');
    console.error('  - Suite policy outdated → update CLAUDE.md §Conventions + POLICIES dictionary in this script');
    console.error('  - Historical mention → add a "permit" phrase (deprecated, removed, etc.) to the line');
    process.exitCode = 1;
    return;
  }
  console.log(`✓ no cross-plugin memory-hierarchy conflicts (${market.plugins.length} plugins, ${probed} files probed)`);
  process.exitCode = 0;
}

main();
