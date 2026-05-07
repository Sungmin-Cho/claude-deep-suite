import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const WRAP_CLI = resolve(repoRoot, 'scripts/wrap-artifact.js');
const VALIDATE_CLI = resolve(repoRoot, 'scripts/validate-artifact.js');

function makeTmp() {
  return mkdtempSync(join(tmpdir(), 'm3-wrap-'));
}

function runWrap(args, cwd) {
  return spawnSync('node', [WRAP_CLI, ...args], {
    cwd: cwd ?? repoRoot,
    encoding: 'utf8',
    timeout: 10000,
  });
}

function runValidate(args) {
  return spawnSync('node', [VALIDATE_CLI, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 10000,
  });
}

test('wrap → validate roundtrip succeeds for deep-docs/last-scan', () => {
  const dir = makeTmp();
  try {
    const input = join(dir, 'legacy.json');
    const output = join(dir, 'wrapped.json');
    writeFileSync(input, JSON.stringify({ scanned_paths: ['CLAUDE.md'], findings: [] }));

    const wrapRes = runWrap([
      '--producer', 'deep-docs',
      '--artifact-kind', 'last-scan',
      '--schema-version', '1.0',
      '--producer-version', '1.1.0',
      '--input', input,
      '--output', output,
    ]);
    assert.equal(wrapRes.status, 0, wrapRes.stderr);
    assert.match(wrapRes.stdout, /run_id=[0-9A-HJKMNP-TV-Z]{26}/);

    const validateRes = runValidate([output]);
    assert.equal(validateRes.status, 0, validateRes.stderr);
    assert.match(validateRes.stdout, /validates against envelope schema \+ payload schema/);

    const wrapped = JSON.parse(readFileSync(output, 'utf8'));
    assert.equal(wrapped.schema_version, '1.0');
    assert.ok(wrapped.$schema, '$schema link populated');
    assert.equal(wrapped.envelope.producer, 'deep-docs');
    assert.equal(wrapped.envelope.artifact_kind, 'last-scan');
    assert.equal(wrapped.envelope.schema.version, '1.0');
    assert.match(wrapped.envelope.run_id, /^[0-9A-HJKMNP-TV-Z]{26}$/);
    assert.ok(wrapped.envelope.generated_at, 'generated_at populated');
    assert.deepEqual(wrapped.payload, { scanned_paths: ['CLAUDE.md'], findings: [] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('wrap respects --run-id, --parent-run-id, --session-id overrides', () => {
  const dir = makeTmp();
  try {
    const input = join(dir, 'legacy.json');
    const output = join(dir, 'wrapped.json');
    writeFileSync(input, JSON.stringify({ scanned_paths: [], findings: [] }));

    const customRun = '01HZZZZZZZZZZZZZZZZZZZZZZZ';
    const customParent = '01HYYYYYYYYYYYYYYYYYYYYYYY';
    const wrapRes = runWrap([
      '--producer', 'deep-docs',
      '--artifact-kind', 'last-scan',
      '--schema-version', '1.0',
      '--producer-version', '1.1.0',
      '--input', input,
      '--output', output,
      '--run-id', customRun,
      '--parent-run-id', customParent,
      '--session-id', 'sess-123',
    ]);
    assert.equal(wrapRes.status, 0, wrapRes.stderr);

    const wrapped = JSON.parse(readFileSync(output, 'utf8'));
    assert.equal(wrapped.envelope.run_id, customRun);
    assert.equal(wrapped.envelope.parent_run_id, customParent);
    assert.equal(wrapped.envelope.session_id, 'sess-123');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('wrap exits 1 when --producer violates kebab-case (envelope schema reject)', () => {
  const dir = makeTmp();
  try {
    const input = join(dir, 'legacy.json');
    const output = join(dir, 'wrapped.json');
    writeFileSync(input, JSON.stringify({ scanned_paths: [], findings: [] }));

    const wrapRes = runWrap([
      '--producer', 'Deep_Docs',
      '--artifact-kind', 'last-scan',
      '--schema-version', '1.0',
      '--producer-version', '1.1.0',
      '--input', input,
      '--output', output,
    ]);
    assert.equal(wrapRes.status, 1, wrapRes.stderr);
    assert.match(wrapRes.stderr, /fails envelope schema/);
    assert.match(wrapRes.stderr, /producer/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('wrap exits 2 on missing required flag', () => {
  const wrapRes = runWrap([
    '--producer', 'deep-docs',
    // missing --artifact-kind
    '--schema-version', '1.0',
    '--producer-version', '1.1.0',
    '--input', '/tmp/x.json',
    '--output', '/tmp/y.json',
  ]);
  assert.equal(wrapRes.status, 2);
  assert.match(wrapRes.stderr, /missing required flag --artifact-kind/);
});

test('wrap exits 2 on bad input path', () => {
  const wrapRes = runWrap([
    '--producer', 'deep-docs',
    '--artifact-kind', 'last-scan',
    '--schema-version', '1.0',
    '--producer-version', '1.1.0',
    '--input', '/tmp/m3-does-not-exist.json',
    '--output', '/tmp/m3-out.json',
  ]);
  assert.equal(wrapRes.status, 2);
  assert.match(wrapRes.stderr, /cannot read/);
});

test('wrap exits 2 on flag without value', () => {
  const wrapRes = runWrap(['--producer']);
  assert.equal(wrapRes.status, 2);
  assert.match(wrapRes.stderr, /flag --producer expects a value/);
});

test('wrap accepts --key=value GNU-style flags', () => {
  const dir = makeTmp();
  try {
    const input = join(dir, 'legacy.json');
    const output = join(dir, 'wrapped.json');
    writeFileSync(input, JSON.stringify({ scanned_paths: [], findings: [] }));

    const wrapRes = runWrap([
      `--producer=deep-docs`,
      `--artifact-kind=last-scan`,
      `--schema-version=1.0`,
      `--producer-version=1.1.0`,
      `--input=${input}`,
      `--output=${output}`,
    ]);
    assert.equal(wrapRes.status, 0, wrapRes.stderr);

    const wrapped = JSON.parse(readFileSync(output, 'utf8'));
    assert.equal(wrapped.envelope.producer, 'deep-docs');
    assert.equal(wrapped.envelope.artifact_kind, 'last-scan');
    assert.match(wrapped.envelope.run_id, /^[0-9A-HJKMNP-TV-Z]{26}$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('wrap respects --git-head, --git-branch, --dirty overrides', () => {
  const dir = makeTmp();
  try {
    const input = join(dir, 'legacy.json');
    const output = join(dir, 'wrapped.json');
    writeFileSync(input, JSON.stringify({ scanned_paths: [], findings: [] }));

    const wrapRes = runWrap([
      '--producer', 'deep-docs',
      '--artifact-kind', 'last-scan',
      '--schema-version', '1.0',
      '--producer-version', '1.1.0',
      '--input', input,
      '--output', output,
      '--git-head', 'deadbeefdeadbeef',
      '--git-branch', 'feat/test-override',
      '--dirty', 'true',
    ]);
    assert.equal(wrapRes.status, 0, wrapRes.stderr);

    const wrapped = JSON.parse(readFileSync(output, 'utf8'));
    assert.equal(wrapped.envelope.git.head, 'deadbeefdeadbeef');
    assert.equal(wrapped.envelope.git.branch, 'feat/test-override');
    assert.equal(wrapped.envelope.git.dirty, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('wrap exits 2 on invalid --dirty value', () => {
  const wrapRes = runWrap([
    '--producer', 'deep-docs', '--artifact-kind', 'last-scan',
    '--schema-version', '1.0', '--producer-version', '1.1.0',
    '--input', '/tmp/x.json', '--output', '/tmp/y.json',
    '--dirty', 'yes',  // typo, not in allow-list
  ]);
  assert.equal(wrapRes.status, 2);
  assert.match(wrapRes.stderr, /must be one of true\|false\|unknown/);
});

test('wrap exits 2 on unknown flag (typo guard)', () => {
  const wrapRes = runWrap([
    '--producer', 'deep-docs', '--artifact-kind', 'last-scan',
    '--schema-version', '1.0', '--producer-version', '1.1.0',
    '--input', '/tmp/x.json', '--output', '/tmp/y.json',
    '--gut-head', 'deadbeef',  // typo for --git-head
  ]);
  assert.equal(wrapRes.status, 2);
  assert.match(wrapRes.stderr, /unknown flag --gut-head/);
});

test('wrap detects git context from process.cwd()', () => {
  const dir = makeTmp();
  try {
    // Initialise a fresh git repo in the tmp dir so its HEAD differs from suite repo HEAD.
    execSync('git init', { cwd: dir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: dir, stdio: 'ignore' });
    const tmpInput = join(dir, 'legacy.json');
    writeFileSync(tmpInput, JSON.stringify({ scanned_paths: [], findings: [] }));
    execSync(`git add .`, { cwd: dir, stdio: 'ignore' });
    execSync('git commit -m "init"', { cwd: dir, stdio: 'ignore' });

    const tmpHead = execSync('git rev-parse HEAD', { cwd: dir, encoding: 'utf8' }).trim();
    const suiteHead = execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
    // The two repos must have different HEADs for this test to be meaningful.
    assert.notEqual(tmpHead, suiteHead, 'tmpdir HEAD should differ from suite repo HEAD');

    const output = join(dir, 'wrapped.json');
    const wrapRes = runWrap([
      '--producer', 'deep-docs',
      '--artifact-kind', 'last-scan',
      '--schema-version', '1.0',
      '--producer-version', '1.1.0',
      '--input', tmpInput,
      '--output', output,
    ], dir); // run with cwd=dir so process.cwd() is the tmp git repo
    assert.equal(wrapRes.status, 0, wrapRes.stderr);

    const wrapped = JSON.parse(readFileSync(output, 'utf8'));
    assert.equal(wrapped.envelope.git.head, tmpHead, 'envelope.git.head must reflect tmpdir repo, not suite repo');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
