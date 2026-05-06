import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const readJson = (p) => JSON.parse(readFileSync(resolve(repoRoot, p), 'utf8'));

const AjvCtor = Ajv2020.default ?? Ajv2020;
const addFormatsFn = addFormats.default ?? addFormats;

function makeSidecarValidator() {
  const schema = readJson('schemas/suite-extensions.schema.json');
  const ajv = new AjvCtor({ strict: true, allErrors: true });
  addFormatsFn(ajv);
  return ajv.compile(schema);
}

function makeEnvelopeValidator() {
  const schema = readJson('schemas/artifact-envelope.schema.json');
  const ajv = new AjvCtor({ strict: true, allErrors: true });
  addFormatsFn(ajv);
  return ajv.compile(schema);
}

// --- suite-extensions schema (12 fixtures, 13 tests) ---

test('suite-extensions schema compiles', () => {
  const validate = makeSidecarValidator();
  assert.equal(typeof validate, 'function');
});

test('valid-minimal passes', () => {
  const validate = makeSidecarValidator();
  const data = readJson('tests/fixtures/valid-minimal.json');
  const ok = validate(data);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
});

test('valid-full passes (3 plugins, all optional fields, data_flow)', () => {
  const validate = makeSidecarValidator();
  const data = readJson('tests/fixtures/valid-full.json');
  const ok = validate(data);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
});

test('valid-with-x-extension passes (x-* forward-compat at root + suite + pluginEntry)', () => {
  const validate = makeSidecarValidator();
  const data = readJson('tests/fixtures/valid-with-x-extension.json');
  const ok = validate(data);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
});

test('invalid-missing-suite fails (required)', () => {
  const validate = makeSidecarValidator();
  const data = readJson('tests/fixtures/invalid-missing-suite.json');
  assert.equal(validate(data), false);
  const reasons = validate.errors.map(e => e.keyword);
  assert.ok(reasons.includes('required'), JSON.stringify(validate.errors));
});

test('invalid-bad-plugin-name fails (double-hyphen "deep--work" rejected by patternProperties + additionalProperties=false)', () => {
  const validate = makeSidecarValidator();
  const data = readJson('tests/fixtures/invalid-bad-plugin-name.json');
  assert.equal(validate(data), false);
  const reasons = validate.errors.map(e => e.keyword);
  assert.ok(
    reasons.includes('pattern') || reasons.includes('additionalProperties'),
    'expected pattern or additionalProperties: ' + JSON.stringify(validate.errors)
  );
});

test('invalid-unknown-property fails (additionalProperties)', () => {
  const validate = makeSidecarValidator();
  const data = readJson('tests/fixtures/invalid-unknown-property.json');
  assert.equal(validate(data), false);
  const reasons = validate.errors.map(e => e.keyword);
  assert.ok(reasons.includes('additionalProperties'), JSON.stringify(validate.errors));
});

test('invalid-bad-runtime fails (enum)', () => {
  const validate = makeSidecarValidator();
  const data = readJson('tests/fixtures/invalid-bad-runtime.json');
  assert.equal(validate(data), false);
  const reasons = validate.errors.map(e => e.keyword);
  assert.ok(reasons.includes('enum'), JSON.stringify(validate.errors));
});

test('invalid-duplicate-runtime fails (uniqueItems)', () => {
  const validate = makeSidecarValidator();
  const data = readJson('tests/fixtures/invalid-duplicate-runtime.json');
  assert.equal(validate(data), false);
  const reasons = validate.errors.map(e => e.keyword);
  assert.ok(reasons.includes('uniqueItems'), JSON.stringify(validate.errors));
});

test('invalid-bad-hook-event fails (hooks_active enum)', () => {
  const validate = makeSidecarValidator();
  const data = readJson('tests/fixtures/invalid-bad-hook-event.json');
  assert.equal(validate(data), false);
  const reasons = validate.errors.map(e => e.keyword);
  assert.ok(reasons.includes('enum'), JSON.stringify(validate.errors));
});

test('invalid-bad-schema-version fails (const)', () => {
  const validate = makeSidecarValidator();
  const data = readJson('tests/fixtures/invalid-bad-schema-version.json');
  assert.equal(validate(data), false);
  const reasons = validate.errors.map(e => e.keyword);
  assert.ok(reasons.includes('const'), JSON.stringify(validate.errors));
});

test('invalid-empty-plugins fails (minProperties)', () => {
  const validate = makeSidecarValidator();
  const data = readJson('tests/fixtures/invalid-empty-plugins.json');
  assert.equal(validate(data), false);
  const reasons = validate.errors.map(e => e.keyword);
  assert.ok(reasons.includes('minProperties'), JSON.stringify(validate.errors));
});

test('invalid-orphan-data-flow PASSES schema (referential integrity is validator-only — JSON Schema cannot express cross-key refs; see scripts/validate-suite-extensions.js Phase 2 + tests/cli.test.js)', () => {
  const validate = makeSidecarValidator();
  const data = readJson('tests/fixtures/invalid-orphan-data-flow.json');
  const ok = validate(data);
  assert.equal(ok, true, 'schema-level should accept; CLI Phase 2 catches orphan');
});

// --- artifact-envelope schema (8 fixtures, 9 tests) ---

test('artifact-envelope schema compiles', () => {
  const validate = makeEnvelopeValidator();
  assert.equal(typeof validate, 'function');
});

test('envelope-valid passes', () => {
  const validate = makeEnvelopeValidator();
  const data = readJson('tests/fixtures/envelope-valid.json');
  const ok = validate(data);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
});

test('envelope-valid-dirty-unknown passes (dirty="unknown" + parent_run_id + structured tool_versions)', () => {
  const validate = makeEnvelopeValidator();
  const data = readJson('tests/fixtures/envelope-valid-dirty-unknown.json');
  const ok = validate(data);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
});

test('envelope-valid-with-x-extension passes (x-* at root + envelope)', () => {
  const validate = makeEnvelopeValidator();
  const data = readJson('tests/fixtures/envelope-valid-with-x-extension.json');
  const ok = validate(data);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
});

test('envelope-invalid fails (missing required envelope fields → required)', () => {
  const validate = makeEnvelopeValidator();
  const data = readJson('tests/fixtures/envelope-invalid.json');
  assert.equal(validate(data), false);
  const reasons = validate.errors.map(e => e.keyword);
  assert.ok(reasons.includes('required'), JSON.stringify(validate.errors));
});

test('envelope-invalid-bad-sha fails (git.head pattern)', () => {
  const validate = makeEnvelopeValidator();
  const data = readJson('tests/fixtures/envelope-invalid-bad-sha.json');
  assert.equal(validate(data), false);
  const reasons = validate.errors.map(e => e.keyword);
  assert.ok(reasons.includes('pattern'), JSON.stringify(validate.errors));
});

test('envelope-invalid-bad-semver fails (producer_version SemVer pattern)', () => {
  const validate = makeEnvelopeValidator();
  const data = readJson('tests/fixtures/envelope-invalid-bad-semver.json');
  assert.equal(validate(data), false);
  const reasons = validate.errors.map(e => e.keyword);
  assert.ok(reasons.includes('pattern'), JSON.stringify(validate.errors));
});

test('envelope-invalid-bad-datetime fails (generated_at format)', () => {
  const validate = makeEnvelopeValidator();
  const data = readJson('tests/fixtures/envelope-invalid-bad-datetime.json');
  assert.equal(validate(data), false);
  const reasons = validate.errors.map(e => e.keyword);
  assert.ok(reasons.includes('format'), JSON.stringify(validate.errors));
});

test('envelope-invalid-dirty-numeric fails (dirty:1 matches neither boolean nor "unknown" → oneOf branch coverage)', () => {
  const validate = makeEnvelopeValidator();
  const data = readJson('tests/fixtures/envelope-invalid-dirty-numeric.json');
  assert.equal(validate(data), false);
  const reasons = validate.errors.map(e => e.keyword);
  assert.ok(
    reasons.includes('oneOf') || reasons.includes('type') || reasons.includes('const'),
    'expected oneOf/type/const: ' + JSON.stringify(validate.errors)
  );
});

// --- W-R4: SemVer 2.0.0 strict (3 fixtures) ---

test('envelope-invalid-bad-semver-leading-zero fails ("01.0.0" → SemVer 2.0.0 §2 disallows leading-zero numerics)', () => {
  const validate = makeEnvelopeValidator();
  const data = readJson('tests/fixtures/envelope-invalid-bad-semver-leading-zero.json');
  assert.equal(validate(data), false);
  const reasons = validate.errors.map(e => e.keyword);
  assert.ok(reasons.includes('pattern'), JSON.stringify(validate.errors));
});

test('envelope-valid-with-build-metadata passes ("1.0.0+commit.abc.123" — SemVer 2.0.0 build metadata)', () => {
  const validate = makeEnvelopeValidator();
  const data = readJson('tests/fixtures/envelope-valid-with-build-metadata.json');
  const ok = validate(data);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
});

test('envelope-invalid-empty-prerelease-id fails ("1.2.3-.." → SemVer 2.0.0 §9 disallows empty prerelease ids)', () => {
  const validate = makeEnvelopeValidator();
  const data = readJson('tests/fixtures/envelope-invalid-empty-prerelease-id.json');
  assert.equal(validate(data), false);
  const reasons = validate.errors.map(e => e.keyword);
  assert.ok(reasons.includes('pattern'), JSON.stringify(validate.errors));
});

// --- Real-file cross-references (drift protection) ---

test('actual .claude-plugin/suite-extensions.json validates against schema', () => {
  const validate = makeSidecarValidator();
  const data = readJson('.claude-plugin/suite-extensions.json');
  const ok = validate(data);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
});

test('actual suite-extensions plugin keys match marketplace.json names (order-strict)', () => {
  const mk = readJson('.claude-plugin/marketplace.json');
  const ext = readJson('.claude-plugin/suite-extensions.json');
  const mkNames = mk.plugins.map(p => p.name);
  const extNames = Object.keys(ext.plugins);
  assert.deepEqual(extNames, mkNames);
});

test('actual suite.name matches marketplace.name', () => {
  const mk = readJson('.claude-plugin/marketplace.json');
  const ext = readJson('.claude-plugin/suite-extensions.json');
  assert.equal(ext.suite.name, mk.name);
});

test('actual sidecar passes referential integrity (data_flow.from/to all in plugins)', () => {
  const ext = readJson('.claude-plugin/suite-extensions.json');
  const pluginKeys = new Set(Object.keys(ext.plugins));
  const orphans = (ext.data_flow ?? []).flatMap((edge, idx) => {
    const errs = [];
    if (!pluginKeys.has(edge.from)) errs.push(`edge[${idx}].from "${edge.from}"`);
    if (!pluginKeys.has(edge.to)) errs.push(`edge[${idx}].to "${edge.to}"`);
    return errs;
  });
  assert.deepEqual(orphans, [], 'all data_flow endpoints should reference existing plugin keys');
});
