#!/usr/bin/env node
// Verifies sidecar artifact paths actually appear in the pinned plugin source.
//
// Why: §M2 + backlog W-R1/W-R2. When the sidecar advertises that deep-work
// writes ".deep-work/<session>/session-receipt.json", that path *must* show
// up somewhere in deep-work's pinned source (hooks, skills, scripts, commands).
// Otherwise the suite is publishing a contract the plugin doesn't honor.
//
// Strategy:
//   For each plugin in marketplace.json:
//     For each path in suite-extensions.plugins[plugin].artifacts.{writes,reads}:
//       - Skip cross-plugin paths (path doesn't start with `.<plugin>/` and
//         doesn't reference the plugin's own conventions like `<wiki_root>`).
//       - Tokenize: replace `<...>` placeholders with `*`, split on `/`,
//         pick distinctive *static segments* (length > 3, not a pure-glob).
//       - Fetch a curated set of plugin source files (hooks/, skills/,
//         commands/, scripts/) at the pinned SHA, plus the plugin's CHANGELOG.md
//         and plugin.json. Search them for the static segments.
//       - Pass if at least one distinctive segment is found in at least one file.
//       - Fail otherwise — clear file:line pointing at the sidecar entry.
//
// Note: this is intentionally a heuristic gate, not a precise verifier. False
// positives (path shape matches but semantics differ) are out of scope; the
// goal is to catch the "sidecar advertises a path the plugin source never
// references" drift.
//
// Exit codes: 0 clean, 1 drift, 2 IO/fetch.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMarketplace, fetchPluginFile, FetchError } from './lib/fetch-plugin-files.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// Files we sample from each pinned plugin to grep for path tokens.
// Keep small to limit gh api calls. Prefer high-density files (skills/commands).
const PROBE_FILES = [
  '.claude-plugin/plugin.json',
  'CHANGELOG.md',
  'README.md',
];

// Pseudo-glob patterns ⇒ candidate file paths. Real listing not done — we
// just grep the union of PROBE_FILES + a few well-known per-plugin files.
const PER_PLUGIN_EXTRA = {
  'deep-work': ['skills/deep-test/SKILL.md', 'skills/deep-implement/SKILL.md', 'commands/deep-finish.md'],
  'deep-wiki': ['skills/wiki-schema/SKILL.md', 'commands/wiki-ingest.md'],
  'deep-evolve': ['skills/deep-evolve-workflow/SKILL.md'],
  'deep-review': ['skills/deep-review-workflow/SKILL.md', 'commands/deep-review.md'],
  'deep-docs': ['skills/deep-docs-workflow/SKILL.md', 'commands/deep-docs.md'],
  'deep-dashboard': ['skills/deep-harness-dashboard/SKILL.md', 'skills/deep-harnessability/SKILL.md'],
};

// Sidecar paths the plugin's *own* source naturally references vs. paths that
// belong to *other* plugins (cross-plugin reads). Heuristic: a path starting
// with the plugin's own root is "self"; everything else is "cross". We only
// gate the *self* paths — cross paths belong to the other plugin's contract.
function isOwnPath(plugin, path) {
  const pluginRoot = `.${plugin}/`;
  if (path.startsWith(pluginRoot)) return true;
  if (plugin === 'deep-wiki' && path.startsWith('<wiki_root>/')) return true;
  return false;
}

// Extract distinctive static segments from a path. Drop placeholders like
// `<session>` or `*` or short tokens (`/`, `**`).
function distinctiveSegments(path) {
  // Strip protocol prefixes (none expected); split on /
  const segs = path.split('/').filter(Boolean);
  const out = [];
  for (const s of segs) {
    if (s.includes('<') || s.includes('>')) continue;     // placeholder
    if (s === '**' || s === '*') continue;
    if (s.length < 4) continue;                            // too short to grep meaningfully
    out.push(s);
  }
  return out;
}

function buildHaystack({ pluginInfo }) {
  const probes = [...PROBE_FILES, ...(PER_PLUGIN_EXTRA[pluginInfo.plugin] ?? [])];
  const chunks = [];
  for (const probe of probes) {
    try {
      const text = fetchPluginFile({ ...pluginInfo, path: probe });
      chunks.push({ path: probe, text });
    } catch (err) {
      if (err instanceof FetchError && /not found/.test(err.message)) {
        continue; // missing probe is fine
      }
      throw err;
    }
  }
  return chunks;
}

function matchAny(chunks, segment) {
  return chunks.some((c) => c.text.includes(segment));
}

function findSidecarLine(sidecarText, plugin, path) {
  // Locate the line in the sidecar JSON where this exact path string appears.
  const lines = sidecarText.split('\n');
  // We want a line under the plugin block. Crude: find the plugin key first,
  // then match the path string after that.
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inBlock && line.includes(`"${plugin}":`)) inBlock = true;
    if (inBlock && line.includes(`"${path}"`)) return i + 1;
    if (inBlock && /^\s*}/.test(line) && line.split('"').length === 1) {
      // crude block-end heuristic
    }
  }
  // Fallback: any line containing the path literal
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`"${path}"`)) return i + 1;
  }
  return -1;
}

function main() {
  if (process.argv.length > 2) {
    console.error('error: this checker takes no arguments');
    process.exitCode = 2;
    return;
  }

  const sidecarPath = resolve(REPO_ROOT, '.claude-plugin/suite-extensions.json');
  const sidecarText = readFileSync(sidecarPath, 'utf8');
  const sidecar = JSON.parse(sidecarText);
  const market = readMarketplace(REPO_ROOT);

  let drift = 0;
  const checked = { plugins: 0, paths: 0 };

  for (const info of market.plugins) {
    const entry = sidecar.plugins?.[info.plugin];
    if (!entry) continue;
    let chunks;
    try {
      chunks = buildHaystack({ pluginInfo: info });
    } catch (err) {
      console.error(`error: failed to fetch source for ${info.plugin}: ${err.message}`);
      process.exitCode = 2;
      return;
    }
    checked.plugins++;

    const allPaths = [
      ...(entry.artifacts?.writes ?? []).map((p) => ({ p, kind: 'writes' })),
      ...(entry.artifacts?.reads ?? []).map((p) => ({ p, kind: 'reads' })),
    ];
    for (const { p, kind } of allPaths) {
      if (!isOwnPath(info.plugin, p)) continue; // gate self-paths only
      const segments = distinctiveSegments(p);
      if (segments.length === 0) continue;       // nothing meaningful to grep
      checked.paths++;
      const found = segments.some((s) => matchAny(chunks, s));
      if (!found) {
        const lineNo = findSidecarLine(sidecarText, info.plugin, p);
        const where = lineNo > 0 ? `:${lineNo}` : '';
        console.error(`✗ .claude-plugin/suite-extensions.json${where} — ${info.plugin}.${kind} path "${p}" not found in pinned source (SHA ${info.sha.slice(0, 7)})`);
        console.error(`    distinctive segments: ${segments.join(', ')}`);
        drift++;
      }
    }
  }

  if (drift > 0) {
    console.error('');
    console.error('Fix options:');
    console.error('  - Sidecar wrong → update suite-extensions.json to match the plugin\'s actual writer/reader path.');
    console.error('  - Plugin not yet emitting → bump marketplace.json sha once the plugin lands the path.');
    console.error('  - Probe file missing → add to scripts/check-pinned-plugin-paths.js PER_PLUGIN_EXTRA.');
    process.exitCode = 1;
    return;
  }
  console.log(`✓ pinned-plugin paths verified (${checked.plugins} plugins, ${checked.paths} self-paths sampled)`);
  process.exitCode = 0;
}

main();
