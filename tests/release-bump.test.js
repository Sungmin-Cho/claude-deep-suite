// Tests for scripts/release-bump.js.
//
// Pure helpers (applyBump / isFullSha) are unit-tested directly — no IO.
// CLI behavior is exercised only on paths with NO side effects: validation
// failures (exit 1 before any write/spawn) and --dry-run (reads only). The
// real write→docs:write→preflight path hits the network + mutates files, so it
// is intentionally NOT spawned here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { applyBump, isFullSha, listPluginNames } from '../scripts/release-bump.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const SCRIPT = resolve(repoRoot, 'scripts/release-bump.js');
const MARKET = resolve(repoRoot, '.claude-plugin/marketplace.json');

const NEW = 'f'.repeat(40);

function cli(args = []) {
  return spawnSync('node', [SCRIPT, ...args], { cwd: repoRoot, encoding: 'utf8', timeout: 20_000 });
}

// ── isFullSha ────────────────────────────────────────────────────────────────

test('isFullSha accepts a 40-char lowercase hex sha', () => {
  assert.equal(isFullSha('0123456789abcdef0123456789abcdef01234567'), true);
});

test('isFullSha rejects short / uppercase / non-hex', () => {
  assert.equal(isFullSha('abc123'), false);
  assert.equal(isFullSha('F'.repeat(40)), false);
  assert.equal(isFullSha('g'.repeat(40)), false);
  assert.equal(isFullSha(undefined), false);
});

// ── applyBump ─────────────────────────────────────────────────────────────────

test('applyBump throws on a bad sha', () => {
  const text = readFileSync(MARKET, 'utf8');
  assert.throws(() => applyBump(text, 'deep-work', 'not-a-sha'), /40-char/);
});

test('applyBump throws on an unknown plugin and lists known names', () => {
  const text = readFileSync(MARKET, 'utf8');
  assert.throws(() => applyBump(text, 'deep-nope', NEW), /unknown plugin.*deep-work/s);
});

test('applyBump changes ONLY the sha bytes for a single-sha entry', () => {
  const before = readFileSync(MARKET, 'utf8');
  const { text, oldSha } = applyBump(before, 'deep-work', NEW);
  assert.ok(text.includes(NEW), 'new sha present');
  assert.notEqual(oldSha, NEW);
  // Reversing the new→old substitution must reproduce the original byte-for-byte,
  // proving the bump touched nothing but the sha.
  assert.equal(text.split(NEW).join(oldSha), before);
});

test('applyBump keeps the redundant top-level sha mirror in lockstep (deep-wiki)', () => {
  const before = readFileSync(MARKET, 'utf8');
  const data = JSON.parse(before);
  const wiki = data.plugins.find((p) => p.name === 'deep-wiki');
  assert.ok(wiki && Object.prototype.hasOwnProperty.call(wiki, 'sha'), 'fixture precondition: deep-wiki has a top-level sha');
  const { text } = applyBump(before, 'deep-wiki', NEW);
  const after = JSON.parse(text);
  const w = after.plugins.find((p) => p.name === 'deep-wiki');
  assert.equal(w.source.sha, NEW);
  assert.equal(w.sha, NEW);
});

test('applyBump with same sha + no description is byte-identical (idempotent)', () => {
  const before = readFileSync(MARKET, 'utf8');
  const cur = JSON.parse(before).plugins.find((p) => p.name === 'deep-docs').source.sha;
  const { text } = applyBump(before, 'deep-docs', cur);
  assert.equal(text, before);
});

test('applyBump replaces the description when provided', () => {
  const before = readFileSync(MARKET, 'utf8');
  const { text } = applyBump(before, 'deep-docs', NEW, { description: 'NEW BLURB' });
  assert.equal(JSON.parse(text).plugins.find((p) => p.name === 'deep-docs').description, 'NEW BLURB');
});

test('listPluginNames returns the marketplace plugin names', () => {
  const names = listPluginNames(readFileSync(MARKET, 'utf8'));
  assert.ok(names.includes('deep-memory') && names.includes('deep-work'));
});

// ── CLI (no-side-effect paths only) ───────────────────────────────────────────

test('CLI exits 1 with usage when args are missing', () => {
  const res = cli([]);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /required/);
  assert.match(res.stderr, /usage:/);
});

test('CLI exits 1 on a bad sha', () => {
  const res = cli(['deep-work', 'deadbeef']);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /40-char/);
});

test('CLI exits 1 on an unknown plugin', () => {
  const res = cli(['deep-nope', NEW.replace(/f/g, 'a')]);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /unknown plugin/);
});

test('CLI exits 1 on an unknown flag', () => {
  const res = cli(['deep-work', NEW.replace(/f/g, 'a'), '--bogus']);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /unknown flag/);
});

test('CLI --dry-run validates without writing or running sub-commands', () => {
  const before = readFileSync(MARKET, 'utf8');
  const res = cli(['deep-work', NEW.replace(/f/g, 'a'), '--dry-run']);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /\[dry-run\]/);
  assert.equal(readFileSync(MARKET, 'utf8'), before, 'marketplace.json must be untouched by --dry-run');
});
