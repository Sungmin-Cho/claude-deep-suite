import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const CLI = resolve(repoRoot, 'scripts/validate-suite-extensions.js');

function runCli(args) {
  return spawnSync('node', [CLI, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 10000
  });
}

test('CLI exits 0 on schema-valid + referential-valid input', () => {
  const res = runCli(['tests/fixtures/valid-full.json']);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /validates against suite-extensions schema \+ referential integrity/);
});

test('CLI exits 1 with "fails schema validation" prefix on schema-invalid input', () => {
  const res = runCli(['tests/fixtures/invalid-missing-suite.json']);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /fails schema validation/);
});

test('CLI exits 1 with "fails referential integrity" prefix on orphan data_flow', () => {
  const res = runCli(['tests/fixtures/invalid-orphan-data-flow.json']);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /fails referential integrity/);
  assert.match(res.stderr, /not in plugins/);
});

test('CLI exits 2 on too many positional args (strict argv parsing)', () => {
  const res = runCli(['tests/fixtures/valid-minimal.json', 'tests/fixtures/valid-full.json']);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /expected 0 or 1 path argument/);
});

test('CLI exits 2 on missing target file', () => {
  const res = runCli(['tests/fixtures/does-not-exist.json']);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /target not found/);
});

test('CLI prints schema_version hint when /schema_version const violation occurs', () => {
  const res = runCli(['tests/fixtures/invalid-bad-schema-version.json']);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /fails schema validation/);
  assert.match(res.stderr, /schema_version is locked to "1.0"/);
  assert.match(res.stderr, /schemas\/README\.md §Schema versioning/);
});

test('CLI exits 1 with "fails schema validation" on JSON literal null input', () => {
  const res = runCli(['tests/fixtures/invalid-null-manifest.json']);
  assert.equal(res.status, 1, res.stderr);
  assert.match(res.stderr, /fails schema validation/);
});

test('CLI exits 2 on flag-shaped argv (--help)', () => {
  const res = runCli(['--help']);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /unknown flag: --help/);
});
