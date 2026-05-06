// Spawn-based smoke tests for the M2 sync checkers.
// These run against the real repo state, expecting all checks green.
// Drift cases use M2_TEST_FIXTURES_DIR to inject mismatched plugin.json data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function run(script, args = [], env = {}) {
  return spawnSync('node', [resolve(repoRoot, `scripts/${script}`), ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 30_000,
  });
}

const fixtureDir = resolve(repoRoot, 'tests/fixtures/plugin-cache');

// --- check-readme-plugin-table.js ---

test('check-readme-plugin-table.js exits 0 on clean repo', () => {
  const res = run('check-readme-plugin-table.js');
  assert.equal(res.status, 0, res.stderr);
});

test('check-readme-plugin-table.js exits 2 with arguments', () => {
  const res = run('check-readme-plugin-table.js', ['extra']);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /takes no arguments/);
});

// --- check-claude-md-paths.js ---

test('check-claude-md-paths.js exits 0 against committed CLAUDE.md', () => {
  const res = run('check-claude-md-paths.js');
  assert.equal(res.status, 0, res.stderr);
});

// --- check-guide-version.js ---

test('check-guide-version.js exits 0 against committed guides', () => {
  const res = run('check-guide-version.js');
  assert.equal(res.status, 0, res.stderr);
});

test('check-guide-version.js exits 1 when fixture plugin.json says version=99.99.99', () => {
  const res = run('check-guide-version.js', [], { M2_TEST_FIXTURES_DIR: fixtureDir });
  assert.equal(res.status, 1, `stderr: ${res.stderr}`);
  assert.match(res.stderr, /expected v99\.99\.99/);
});

// --- check-semver-sha-sync.js ---

test('check-semver-sha-sync.js exits 0 against committed marker tables', () => {
  const res = run('check-semver-sha-sync.js');
  assert.equal(res.status, 0, res.stderr);
});

test('check-semver-sha-sync.js exits 1 when fixture plugin.json says version=99.99.99', () => {
  const res = run('check-semver-sha-sync.js', [], { M2_TEST_FIXTURES_DIR: fixtureDir });
  assert.equal(res.status, 1, `stderr: ${res.stderr}`);
  assert.match(res.stderr, /expected v99\.99\.99/);
});

// --- check-pinned-plugin-paths.js ---

test('check-pinned-plugin-paths.js exits 0 against committed sidecar', () => {
  // Uses real cache — depends on .deep-suite-cache being populated locally OR
  // gh CLI being available. CI populates via gh; local dev relies on cache.
  const res = run('check-pinned-plugin-paths.js');
  assert.equal(res.status, 0, res.stderr);
});

// --- check-memory-hierarchy.js ---

test('check-memory-hierarchy.js exits 0 against committed plugin docs', () => {
  const res = run('check-memory-hierarchy.js');
  assert.equal(res.status, 0, res.stderr);
});
