// Spawn-based test of the generator. Uses M2_TEST_FIXTURES_DIR to override
// the gh-api fetcher so tests don't hit the network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const CLI = resolve(repoRoot, 'scripts/generate-reference-sections.js');

function runCli(args, env = {}) {
  return spawnSync('node', [CLI, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 30_000,
  });
}

test('generator --check exits 0 against committed docs (cached or fixture-served plugin.json)', () => {
  const fixtureDir = resolve(repoRoot, 'tests/fixtures/plugin-cache');
  // Without fixture override the test would need network; skip if cache is empty.
  // We rely on the local .deep-suite-cache that's populated during dev — CI populates via gh.
  const res = runCli(['--check']);
  assert.equal(res.status, 0, `stderr: ${res.stderr}\nstdout: ${res.stdout}`);
  assert.match(res.stdout, /up to date/);
});

test('generator without mode flag exits 2', () => {
  const res = runCli([]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /one of --check or --write is required/);
});

test('generator --id with unknown id exits 2', () => {
  const res = runCli(['--check', '--id', 'no-such-marker']);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /no target with id/);
});

test('generator --check with single id picks just that target', () => {
  const res = runCli(['--check', '--id', 'plugin-table-en']);
  assert.equal(res.status, 0, res.stderr);
});

test('generator with unknown flag exits 2', () => {
  const res = runCli(['--bogus']);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /unknown argument/);
});

test('generator with M2_TEST_FIXTURES_DIR uses fixture plugin.json (version=99.99.99 → drift)', () => {
  const fixtureDir = resolve(repoRoot, 'tests/fixtures/plugin-cache');
  const res = runCli(['--check'], { M2_TEST_FIXTURES_DIR: fixtureDir });
  assert.equal(res.status, 1, `expected drift; stderr: ${res.stderr}`);
  assert.match(res.stderr, /reference section\(s\) out of date/);
});
