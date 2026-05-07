import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const CLI = resolve(repoRoot, 'scripts/validate-artifact.js');
const FIXTURE_ROOT = resolve(repoRoot, 'tests/fixtures/envelope-payloads');

function runCli(args) {
  return spawnSync('node', [CLI, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 10000,
  });
}

function walkFixtures(root) {
  const out = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkFixtures(full));
    else if (entry.endsWith('.json')) out.push(full);
  }
  return out;
}

test('CLI exits 0 on every valid-* fixture (envelope + payload registered)', () => {
  const valids = walkFixtures(FIXTURE_ROOT).filter((p) => /\bvalid-/.test(p));
  assert.ok(valids.length >= 8, `expected ≥8 valid fixtures, got ${valids.length}`);
  for (const path of valids) {
    const res = runCli([path]);
    assert.equal(res.status, 0, `${path}\nstderr=${res.stderr}\nstdout=${res.stdout}`);
    assert.match(res.stdout, /validates against envelope schema/);
  }
});

test('CLI exits 1 with envelope-phase prefix on invalid-bad-run-id (minLength)', () => {
  const fixture = resolve(
    FIXTURE_ROOT,
    'deep-docs/last-scan/v1.0/invalid-bad-run-id.json',
  );
  const res = runCli([fixture]);
  assert.equal(res.status, 1, res.stderr);
  assert.match(res.stderr, /fails envelope schema/);
  assert.match(res.stderr, /run_id/);
  assert.match(res.stderr, /minLength/);
});

test('CLI exits 1 with envelope-phase prefix on invalid-missing-payload', () => {
  const fixture = resolve(
    FIXTURE_ROOT,
    'deep-docs/last-scan/v1.0/invalid-missing-payload.json',
  );
  const res = runCli([fixture]);
  assert.equal(res.status, 1, res.stderr);
  assert.match(res.stderr, /fails envelope schema/);
  assert.match(res.stderr, /payload/);
});

test('CLI exits 1 with payload-phase prefix on invalid-payload-missing-required', () => {
  const fixture = resolve(
    FIXTURE_ROOT,
    'deep-docs/last-scan/v1.0/invalid-payload-missing-required.json',
  );
  const res = runCli([fixture]);
  assert.equal(res.status, 1, res.stderr);
  assert.match(res.stderr, /fails payload schema \(deep-docs\/last-scan\/v1\.0\)/);
  assert.match(res.stderr, /findings/);
});

test('CLI exits 0 with registry-miss warning on unknown producer/kind triple', () => {
  const dir = mkdtempSync(join(tmpdir(), 'm3-validate-'));
  try {
    const fixture = join(dir, 'unregistered.json');
    writeFileSync(fixture, JSON.stringify({
      schema_version: '1.0',
      envelope: {
        producer: 'deep-docs',
        producer_version: '1.1.0',
        artifact_kind: 'no-such-kind',
        run_id: '01J9X7K2A8M0V4PN3R5BQ8E2WT',
        generated_at: '2026-05-07T09:00:00Z',
        schema: { name: 'no-such-kind', version: '1.0' },
        git: { head: 'a6b3485', branch: 'main', dirty: false },
        provenance: { source_artifacts: [], tool_versions: {} },
      },
      payload: { anything: true },
    }, null, 2));
    const res = runCli([fixture]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stderr, /payload schema not found in registry/);
    assert.match(res.stdout, /payload schema unregistered/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI exits 2 on missing target file', () => {
  const res = runCli(['tests/fixtures/envelope-payloads/does-not-exist.json']);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /target not found/);
});

test('CLI exits 2 on flag-shaped argv (--help)', () => {
  const res = runCli(['--help']);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /unknown flag: --help/);
});

test('CLI exits 2 on too few positional args', () => {
  const res = runCli([]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /expected exactly 1 path argument/);
});
