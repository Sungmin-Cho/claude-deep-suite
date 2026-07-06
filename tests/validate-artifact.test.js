import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
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

// Payload-phase prefix coverage will return when Phase 2 plugin migrations
// seed real `required` arrays in payload-registry schemas.

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

test('CLI normalizes schema.version with leading/trailing zeros (1.00 → 1.0)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'm3-validate-'));
  try {
    const fixture = join(dir, 'valid-schema-version-normalized.json');
    writeFileSync(fixture, JSON.stringify({
      schema_version: '1.0',
      envelope: {
        producer: 'deep-docs',
        producer_version: '1.2.0',
        artifact_kind: 'last-scan',
        run_id: '01J9X7K2A8M0V4PN3R5BQ8E2WT',
        generated_at: '2026-05-07T09:00:00Z',
        schema: { name: 'last-scan', version: '1.00' },
        git: { head: 'a6b3485', branch: 'main', dirty: false },
        provenance: { source_artifacts: [], tool_versions: {} },
      },
      payload: {
        provenance: { is_git: true },
        documents: [],
        summary: { total_issues: 0, auto_fixable: 0, audit_only: 0 },
      },
    }, null, 2));
    const res = runCli([fixture]);
    assert.equal(res.status, 0, `stderr=${res.stderr}\nstdout=${res.stdout}`);
    assert.match(res.stdout, /validates against envelope schema \+ payload schema/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI exits 1 with strict-mode registry-miss prefix on unregistered triple', () => {
  const dir = mkdtempSync(join(tmpdir(), 'm3-validate-'));
  try {
    const fixture = join(dir, 'unregistered-strict.json');
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
    const res = runCli(['--strict', fixture]);
    assert.equal(res.status, 1, `stderr=${res.stderr}\nstdout=${res.stdout}`);
    assert.match(res.stderr, /fails strict-mode registry lookup/);
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

test('CLI accepts --strict=true (GNU-style)', () => {
  const fixture = resolve(FIXTURE_ROOT, 'deep-docs/last-scan/v1.0/valid-minimal.json');
  const res = runCli(['--strict=true', fixture]);
  assert.equal(res.status, 0, res.stderr);
});

test('CLI accepts --strict=false (GNU-style)', () => {
  const fixture = resolve(FIXTURE_ROOT, 'deep-docs/last-scan/v1.0/valid-minimal.json');
  const res = runCli(['--strict=false', fixture]);
  assert.equal(res.status, 0, res.stderr);
});

test('CLI exits 2 on --strict=<invalid> value', () => {
  const fixture = resolve(FIXTURE_ROOT, 'deep-docs/last-scan/v1.0/valid-minimal.json');
  const res = runCli(['--strict=yes', fixture]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /--strict expects true\|false/);
});

test('CLI exits 1 with identity-check prefix on schema.name vs artifact_kind mismatch', () => {
  const fixture = resolve(
    FIXTURE_ROOT,
    'deep-docs/last-scan/v1.0/invalid-schema-name-mismatch.json',
  );
  const res = runCli([fixture]);
  assert.equal(res.status, 1, res.stderr);
  assert.match(res.stderr, /fails identity check/);
  assert.match(res.stderr, /schema\.name.*artifact_kind/);
});

test('CLI exits 1 with session-identity prefix on evolve-receipt missing session_id everywhere', () => {
  const fixture = resolve(
    FIXTURE_ROOT,
    'deep-evolve/evolve-receipt/v1.0/invalid-no-session-identity.json',
  );
  const res = runCli([fixture]);
  assert.equal(res.status, 1, res.stderr);
  assert.match(res.stderr, /fails session-identity check/);
  assert.match(res.stderr, /envelope\.session_id or payload\.session_id/);
});

test('CLI exits 1 with session-identity prefix on evolve-receipt session_id mismatch (envelope != payload)', () => {
  const fixture = resolve(
    FIXTURE_ROOT,
    'deep-evolve/evolve-receipt/v1.0/invalid-session-identity-mismatch.json',
  );
  const res = runCli([fixture]);
  assert.equal(res.status, 1, res.stderr);
  assert.match(res.stderr, /fails session-identity check/);
  assert.match(res.stderr, /envelope\.session_id.*!=.*payload\.session_id/);
  assert.match(res.stderr, /must match when both present/);
});

test('CLI exits 0 on evolve-receipt real-emit — session_id in envelope only, payload omits it (identity preserved)', () => {
  const fixture = resolve(
    FIXTURE_ROOT,
    'deep-evolve/evolve-receipt/v1.0/valid-real-emit.json',
  );
  const doc = JSON.parse(readFileSync(fixture, 'utf8'));
  assert.ok(doc.envelope.session_id, 'fixture must carry envelope.session_id');
  assert.equal(doc.payload.session_id, undefined, 'fixture payload must omit session_id (real emit shape)');
  const res = runCli([fixture]);
  assert.equal(res.status, 0, `stderr=${res.stderr}\nstdout=${res.stdout}`);
});

test('all valid-* fixtures use 26-char Crockford ULID for run_id / parent_run_id / source_artifacts.run_id', () => {
  const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  const valids = walkFixtures(FIXTURE_ROOT).filter((p) => /\bvalid-/.test(p));
  assert.ok(valids.length >= 8, `expected ≥8 valid fixtures, got ${valids.length}`);
  const failures = [];
  for (const path of valids) {
    let doc;
    try {
      doc = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      failures.push(`${path}: cannot parse JSON`);
      continue;
    }
    const env = doc.envelope ?? {};
    const check = (fieldPath, value) => {
      if (value === undefined) return; // optional field — skip
      if (!ULID_RE.test(value)) {
        failures.push(`${path}: ${fieldPath} "${value}" is not a 26-char Crockford ULID`);
      }
    };
    check('envelope.run_id', env.run_id);
    check('envelope.parent_run_id', env.parent_run_id);
    for (const [i, sa] of (env.provenance?.source_artifacts ?? []).entries()) {
      check(`envelope.provenance.source_artifacts[${i}].run_id`, sa.run_id);
    }
  }
  if (failures.length > 0) {
    assert.fail(`ULID lint failures:\n${failures.map((f) => `  - ${f}`).join('\n')}`);
  }
});
