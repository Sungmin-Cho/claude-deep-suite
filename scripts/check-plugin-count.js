#!/usr/bin/env node
// Verifies that plugin-COUNT narrative ("N plugins" / "N개 플러그인" / "N-plugin")
// across the marketplace description, the suite guides, CLAUDE.md, and the README
// matches the authoritative count.
//
// Why: no prior M2 checker compared a count phrase to marketplace.plugins.length,
// so marketplace.description ("eight") and the guides ("6") drifted silently as
// the suite grew 6 → 8 → 9. This closes that sensor gap.
//
// Model:
//   - The single source of truth for the *total* is marketplace.plugins.length.
//     Targets tagged `expected: TOTAL` assert against it.
//   - A *curated subset* (the integrated-workflow guide covers the 7 M3-adopter
//     artifact-workflow plugins, not all 9) asserts an explicit literal instead,
//     and additionally cross-checks the count against the number of plugins named
//     in its "Reflects ..." preamble (self-consistency — catches the 6-vs-7 class).
//   - A legitimate subset phrase on another line (README "remaining six") is
//     allow-listed so it is never mistaken for a total.
//
// Scope: this checks the *number* only. Capability-list completeness (e.g. a
// missing deep-loop phrase in the marketplace description) is a one-time copy
// fix, not a sensor target.
//
// Test override: M2_TEST_PLUGIN_COUNT_DIR points to a directory of drift copies
// keyed by basename (marketplace.json / <guide>.md / CLAUDE.md / README*.md);
// when present the checker reads that file's text instead of the repo's. The
// authoritative total is always taken from the repo marketplace.json.
//
// Exit codes: 0 clean, 1 drift, 2 IO/usage.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMarketplace } from './lib/fetch-plugin-files.js';
import { startMarker, endMarker } from './lib/markers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const TOTAL = Symbol('marketplace.plugins.length');

const WORD_TO_NUM = { six: 6, seven: 7, eight: 8, nine: 9 };
function tokenToNum(tok) {
  const t = String(tok).toLowerCase();
  if (t in WORD_TO_NUM) return WORD_TO_NUM[t];
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}
function escape(s) { return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); }

function maskMarkerBlocks(content, markerIds = []) {
  let out = content;
  for (const id of markerIds) {
    const re = new RegExp(`${escape(startMarker(id))}[\\s\\S]*?${escape(endMarker(id))}`, 'g');
    out = out.replace(re, (m) => '\n'.repeat(m.split('\n').length - 1));
  }
  return out;
}

// Curated assertion table. Each probe's capture group 1 is the count token
// (a number word or a digit). `allow` lines are legitimate subsets, skipped
// during scanning. `reflects` (integrated-workflow only) cross-checks the count
// against the plugins named in the "Reflects ..." preamble.
const TARGETS = [
  {
    id: 'marketplace metadata.description',
    source: 'marketplace',
    expected: TOTAL,
    probes: [/\b(six|seven|eight|nine|\d+)\s+plugins\b/i],
    note: 'marketplace description count must equal marketplace.plugins.length',
  },
  {
    id: 'guides/context-management.md',
    file: 'guides/context-management.md',
    expected: TOTAL,
    probes: [/\bthe\s+(six|seven|eight|nine|\d+)\s+plugins\s+behave\b/i],
    note: 'suite-wide policy → total',
  },
  {
    id: 'guides/context-management.ko.md',
    file: 'guides/context-management.ko.md',
    expected: TOTAL,
    probes: [/(\d+)\s*개\s*플러그인이\s*일관되게/],
    note: 'suite-wide policy → total (KO)',
  },
  {
    id: 'guides/hook-patterns.md',
    file: 'guides/hook-patterns.md',
    expected: TOTAL,
    probes: [/how\s+the\s+(six|seven|eight|nine|\d+)\s+Deep Suite plugins\b/i],
    note: 'suite-wide policy → total',
  },
  {
    id: 'guides/hook-patterns.ko.md',
    file: 'guides/hook-patterns.ko.md',
    expected: TOTAL,
    probes: [/Deep Suite\s+(\d+)\s*개\s*플러그인이/],
    note: 'suite-wide policy → total (KO)',
  },
  {
    id: 'guides/integrated-workflow-guide.md',
    file: 'guides/integrated-workflow-guide.md',
    expected: 7,
    probes: [
      /how\s+the\s+(six|seven|eight|nine|\d+)\s+plugins\s+in\s+deep-suite/i,
      /all\s+(six|seven|eight|nine|\d+)\s+plugins\s+adopt\s+the\s+M3/i,
    ],
    reflects: /Reflects\b([\s\S]*?)adopt the M3/i,
    note: 'curated M3-adopter subset — count must equal the plugins named in the Reflects preamble',
  },
  {
    id: 'guides/integrated-workflow-guide.ko.md',
    file: 'guides/integrated-workflow-guide.ko.md',
    expected: 7,
    probes: [
      /deep-suite의[\s\S]{0,40}?(\d+)\s*개\s*플러그인/,
      /(\d+)\s*개\s*플러그인\s*모두\s*M3/,
    ],
    reflects: /반영 버전:([\s\S]*?)채택/,
    note: 'curated M3-adopter subset (KO)',
  },
  {
    id: 'CLAUDE.md',
    file: 'CLAUDE.md',
    markerIds: ['plugin-table-claude'],
    expected: 7,
    probes: [/(\d+)-plugin integrated workflow/i],
    note: 'guide label — matches the integrated-workflow curated subset',
  },
  {
    id: 'README.md',
    file: 'README.md',
    markerIds: ['plugin-table-en'],
    expected: TOTAL,
    probes: [
      /install one plugin, not\s+(six|seven|eight|nine|\d+)\b/i,
      /\(all\s+(six|seven|eight|nine|\d+)\)/i,
    ],
    allow: [/remaining\s+(six|seven|eight|nine|\d+)\s+plugins/i],
    note: 'total-count phrases → total; "remaining six" is a legitimate subset (allow-listed)',
  },
  {
    id: 'README.ko.md',
    file: 'README.ko.md',
    markerIds: ['plugin-table-ko'],
    expected: TOTAL,
    probes: [
      /(\d+)\s*개\s*다\s*말고/,
      /(\d+)\s*개\s*모두/,
    ],
    allow: [/나머지\s*(\d+)\s*개/],
    note: 'total-count phrases → total; "나머지 6개" is a legitimate subset (allow-listed) (KO)',
  },
];

function resolveText(target, overrideDir) {
  const name = target.source === 'marketplace' ? 'marketplace.json' : basename(target.file);
  if (overrideDir) {
    const o = resolve(overrideDir, name);
    if (existsSync(o)) return { text: readFileSync(o, 'utf8'), rel: `${target.id} (override)` };
  }
  const repoPath = target.source === 'marketplace'
    ? resolve(REPO_ROOT, '.claude-plugin/marketplace.json')
    : resolve(REPO_ROOT, target.file);
  if (!existsSync(repoPath)) return null;
  const rel = target.source === 'marketplace'
    ? '.claude-plugin/marketplace.json (metadata.description)'
    : target.file;
  return { text: readFileSync(repoPath, 'utf8'), rel };
}

function main() {
  if (process.argv.length > 2) {
    console.error('error: this checker takes no arguments');
    process.exitCode = 2;
    return;
  }
  const overrideDir = process.env.M2_TEST_PLUGIN_COUNT_DIR
    ? resolve(process.env.M2_TEST_PLUGIN_COUNT_DIR)
    : null;

  let total;
  try {
    total = readMarketplace(REPO_ROOT).plugins.length;
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exitCode = 2;
    return;
  }

  const issues = [];
  for (const target of TARGETS) {
    const expected = target.expected === TOTAL ? total : target.expected;
    const resolved = resolveText(target, overrideDir);
    if (!resolved) {
      console.error(`error: ${target.id} not found`);
      process.exitCode = 2;
      return;
    }
    const masked = maskMarkerBlocks(resolved.text, target.markerIds);
    const lines = masked.split('\n');
    lines.forEach((line, idx) => {
      if ((target.allow ?? []).some((re) => re.test(line))) return;
      for (const probe of target.probes) {
        const m = line.match(probe);
        if (!m) continue;
        const found = tokenToNum(m[1]);
        if (found !== expected) {
          issues.push({
            rel: resolved.rel, line: idx + 1, found: m[1], expected, note: target.note, snippet: line.trim(),
          });
        }
      }
    });

    // Self-consistency: the curated subset's count must equal the number of
    // distinct plugins named in its "Reflects ..." preamble (catches 6-vs-7).
    if (target.reflects) {
      const seg = resolved.text.match(target.reflects);
      if (seg) {
        const named = new Set();
        for (const b of seg[1].matchAll(/\*\*(deep-[a-z]+)\s+v\d/g)) named.add(b[1]);
        if (named.size !== expected) {
          issues.push({
            rel: resolved.rel, line: null, found: `${named.size} named in preamble`, expected,
            note: 'Reflects preamble self-consistency', snippet: `named: ${[...named].join(', ')}`,
          });
        }
      }
    }
  }

  if (issues.length > 0) {
    for (const i of issues) {
      const at = i.line == null ? i.rel : `${i.rel}:${i.line}`;
      console.error(`✗ ${at} — count "${i.found}" != expected ${i.expected} (${i.note})`);
      console.error(`    ${i.snippet}`);
    }
    console.error('');
    console.error('Fix: correct the count in the narrative (totals = marketplace.plugins.length;');
    console.error('     curated subsets keep their literal), or update the assertion table.');
    process.exitCode = 1;
    return;
  }
  console.log(`✓ plugin-count narrative coherent (total=${total}; ${TARGETS.length} targets, subsets self-consistent)`);
  process.exitCode = 0;
}

main();
