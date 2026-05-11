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

function makeValidator(schemaPath) {
  const schema = readJson(schemaPath);
  const ajv = new AjvCtor({ strict: true, allErrors: true });
  addFormatsFn(ajv);
  return ajv.compile(schema);
}

// --- handoff payload schema (7 fixtures) ---

test('handoff schema compiles', () => {
  const validate = makeValidator('schemas/handoff.schema.json');
  assert.equal(typeof validate, 'function');
});

test('handoff-valid-minimal passes', () => {
  const validate = makeValidator('schemas/handoff.schema.json');
  const data = readJson('tests/fixtures/handoff-valid-minimal.json');
  const ok = validate(data);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
});

test('handoff-valid-full passes (all optional fields + x-* extension)', () => {
  const validate = makeValidator('schemas/handoff.schema.json');
  const data = readJson('tests/fixtures/handoff-valid-full.json');
  const ok = validate(data);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
});

test('handoff-invalid-missing-required fails (missing to + next_action_brief)', () => {
  const validate = makeValidator('schemas/handoff.schema.json');
  const data = readJson('tests/fixtures/handoff-invalid-missing-required.json');
  const ok = validate(data);
  assert.equal(ok, false);
  const keywords = (validate.errors ?? []).map((e) => e.keyword);
  assert.ok(keywords.includes('required'));
});

test('handoff-invalid-bad-kind fails (enum)', () => {
  const validate = makeValidator('schemas/handoff.schema.json');
  const data = readJson('tests/fixtures/handoff-invalid-bad-kind.json');
  const ok = validate(data);
  assert.equal(ok, false);
  assert.ok((validate.errors ?? []).some((e) => e.keyword === 'enum'));
});

test('handoff-invalid-bad-producer fails (pattern — kebab-case)', () => {
  const validate = makeValidator('schemas/handoff.schema.json');
  const data = readJson('tests/fixtures/handoff-invalid-bad-producer.json');
  const ok = validate(data);
  assert.equal(ok, false);
  assert.ok((validate.errors ?? []).some((e) => e.keyword === 'pattern'));
});

test('handoff-invalid-bad-schema-version fails (const — locked at 1.0)', () => {
  const validate = makeValidator('schemas/handoff.schema.json');
  const data = readJson('tests/fixtures/handoff-invalid-bad-schema-version.json');
  const ok = validate(data);
  assert.equal(ok, false);
  assert.ok((validate.errors ?? []).some((e) => e.keyword === 'const'));
});

test('handoff-invalid-unknown-property fails (additionalProperties false; non-x- prefix)', () => {
  const validate = makeValidator('schemas/handoff.schema.json');
  const data = readJson('tests/fixtures/handoff-invalid-unknown-property.json');
  const ok = validate(data);
  assert.equal(ok, false);
  assert.ok((validate.errors ?? []).some((e) => e.keyword === 'additionalProperties'));
});

test('handoff schema allows x-* forward-compat at root', () => {
  // Inline mutation of the valid-minimal fixture to assert x-* keys round-trip.
  const validate = makeValidator('schemas/handoff.schema.json');
  const data = readJson('tests/fixtures/handoff-valid-minimal.json');
  data['x-extension'] = { freeform: true };
  const ok = validate(data);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
});

// --- compaction-state payload schema (8 fixtures) ---

test('compaction-state schema compiles', () => {
  const validate = makeValidator('schemas/compaction-state.schema.json');
  assert.equal(typeof validate, 'function');
});

test('compaction-valid-minimal passes', () => {
  const validate = makeValidator('schemas/compaction-state.schema.json');
  const data = readJson('tests/fixtures/compaction-valid-minimal.json');
  const ok = validate(data);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
});

test('compaction-valid-full passes (all optional fields + x-* extension)', () => {
  const validate = makeValidator('schemas/compaction-state.schema.json');
  const data = readJson('tests/fixtures/compaction-valid-full.json');
  const ok = validate(data);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
});

test('compaction-valid-full-reset passes (empty preserved_artifact_paths is valid)', () => {
  const validate = makeValidator('schemas/compaction-state.schema.json');
  const data = readJson('tests/fixtures/compaction-valid-full-reset.json');
  const ok = validate(data);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
});

test('compaction-invalid-missing-required fails (missing trigger)', () => {
  const validate = makeValidator('schemas/compaction-state.schema.json');
  const data = readJson('tests/fixtures/compaction-invalid-missing-required.json');
  const ok = validate(data);
  assert.equal(ok, false);
  assert.ok((validate.errors ?? []).some((e) => e.keyword === 'required'));
});

test('compaction-invalid-bad-trigger fails (enum)', () => {
  const validate = makeValidator('schemas/compaction-state.schema.json');
  const data = readJson('tests/fixtures/compaction-invalid-bad-trigger.json');
  const ok = validate(data);
  assert.equal(ok, false);
  assert.ok((validate.errors ?? []).some((e) => e.keyword === 'enum'));
});

test('compaction-invalid-bad-datetime fails (format)', () => {
  const validate = makeValidator('schemas/compaction-state.schema.json');
  const data = readJson('tests/fixtures/compaction-invalid-bad-datetime.json');
  const ok = validate(data);
  assert.equal(ok, false);
  assert.ok((validate.errors ?? []).some((e) => e.keyword === 'format'));
});

test('compaction-invalid-negative-tokens fails (minimum)', () => {
  const validate = makeValidator('schemas/compaction-state.schema.json');
  const data = readJson('tests/fixtures/compaction-invalid-negative-tokens.json');
  const ok = validate(data);
  assert.equal(ok, false);
  assert.ok((validate.errors ?? []).some((e) => e.keyword === 'minimum'));
});

test('compaction-invalid-unknown-property fails (additionalProperties false; non-x- prefix)', () => {
  const validate = makeValidator('schemas/compaction-state.schema.json');
  const data = readJson('tests/fixtures/compaction-invalid-unknown-property.json');
  const ok = validate(data);
  assert.equal(ok, false);
  assert.ok((validate.errors ?? []).some((e) => e.keyword === 'additionalProperties'));
});

// --- envelope-wrap roundtrip (assert payload schema composes with M3 envelope) ---

test('handoff payload wraps cleanly inside M3 artifact-envelope (composition smoke test)', () => {
  const envelopeValidate = makeValidator('schemas/artifact-envelope.schema.json');
  const payloadValidate = makeValidator('schemas/handoff.schema.json');
  const payload = readJson('tests/fixtures/handoff-valid-full.json');
  const wrapped = {
    $schema: 'https://raw.githubusercontent.com/Sungmin-Cho/claude-deep-suite/main/schemas/artifact-envelope.schema.json',
    schema_version: '1.0',
    envelope: {
      producer: 'deep-work',
      producer_version: '6.5.0',
      artifact_kind: 'handoff',
      run_id: '01HX2VR8ABCDEFGHJKMNPQRSTW',
      generated_at: '2026-05-11T16:20:00Z',
      schema: { name: 'handoff', version: '1.0' },
      git: { head: 'abc1234', branch: 'main', dirty: false },
      provenance: {
        source_artifacts: [],
        tool_versions: { node: '20.11.0' }
      }
    },
    payload
  };
  assert.equal(envelopeValidate(wrapped), true, JSON.stringify(envelopeValidate.errors, null, 2));
  assert.equal(payloadValidate(wrapped.payload), true, JSON.stringify(payloadValidate.errors, null, 2));
});

test('compaction-state payload wraps cleanly inside M3 artifact-envelope (composition smoke test)', () => {
  const envelopeValidate = makeValidator('schemas/artifact-envelope.schema.json');
  const payloadValidate = makeValidator('schemas/compaction-state.schema.json');
  const payload = readJson('tests/fixtures/compaction-valid-full.json');
  const wrapped = {
    $schema: 'https://raw.githubusercontent.com/Sungmin-Cho/claude-deep-suite/main/schemas/artifact-envelope.schema.json',
    schema_version: '1.0',
    envelope: {
      producer: 'deep-work',
      producer_version: '6.5.0',
      artifact_kind: 'compaction-state',
      run_id: '01HX2VR8ABCDEFGHJKMNPQRSTX',
      generated_at: '2026-05-11T15:30:00Z',
      schema: { name: 'compaction-state', version: '1.0' },
      git: { head: 'abc1234', branch: 'main', dirty: false },
      provenance: {
        source_artifacts: [],
        tool_versions: { node: '20.11.0' }
      }
    },
    payload
  };
  assert.equal(envelopeValidate(wrapped), true, JSON.stringify(envelopeValidate.errors, null, 2));
  assert.equal(payloadValidate(wrapped.payload), true, JSON.stringify(payloadValidate.errors, null, 2));
});
