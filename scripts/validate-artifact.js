#!/usr/bin/env node
// Validates a JSON artifact against the deep-suite envelope schema and (when
// available) against the registered payload schema for the producer × artifact_kind
// × schema.version triple.
//
// Usage:
//   node scripts/validate-artifact.js <path-to-artifact.json>
//
// Exit codes:
//   0 — valid (envelope passed; payload either passed or skipped on registry miss)
//   1 — validation failure. Distinguish phases by stderr prefix:
//       "✗ ... fails envelope schema:"   → Phase 1 (artifact-envelope.schema.json)
//       "✗ ... fails payload schema (<producer>/<kind>/v<v>):" → Phase 2 (registry)
//   2 — usage / IO / schema-compile / argv error
//
// Registry layout (Phase 1 design decision A1, plan §3):
//   schemas/payload-registry/<producer>/<artifact_kind>/v<MAJOR.MINOR>.schema.json
//
// Registry miss is informational (stderr "! ... payload schema not found ...")
// and does NOT fail validation — Phase 2 plugin migrations seed payload schemas
// gradually.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const AjvCtor = Ajv2020.default ?? Ajv2020;
const addFormatsFn = addFormats.default ?? addFormats;

const ENVELOPE_SCHEMA_PATH = resolve(repoRoot, 'schemas/artifact-envelope.schema.json');
const PAYLOAD_REGISTRY_DIR = resolve(repoRoot, 'schemas/payload-registry');

function usage(extra) {
  if (extra) console.error(`error: ${extra}`);
  console.error('usage: validate-artifact.js <path-to-artifact.json>');
  process.exitCode = 2;
}

function readJson(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    console.error(`error: cannot read ${path}: ${err.message}`);
    process.exitCode = 2;
    return { ok: false };
  }
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch (err) {
    console.error(`error: cannot parse ${path}: ${err.message}`);
    process.exitCode = 2;
    return { ok: false };
  }
}

function compileSchema(ajv, schema, label) {
  try {
    return ajv.compile(schema);
  } catch (err) {
    console.error(`error: ${label} schema compile failed: ${err.message}`);
    process.exitCode = 2;
    return null;
  }
}

function reportAjvErrors(errors, prefixLabel) {
  console.error(prefixLabel);
  for (const err of errors ?? []) {
    const at = err.instancePath || '<root>';
    console.error(`  - ${at} ${err.message} (${err.keyword})`);
  }
}

function payloadRegistryPath(producer, artifactKind, schemaVersion) {
  // schema.version is "MAJOR.MINOR" per envelope schema. Registry filename uses
  // the same literal — no normalization, so a producer that emits "1.0" and a
  // producer that emits "1.00" land in different files (intentional: schema
  // bumps must be explicit).
  return resolve(
    PAYLOAD_REGISTRY_DIR,
    producer,
    artifactKind,
    `v${schemaVersion}.schema.json`,
  );
}

function main() {
  const positionals = process.argv.slice(2);
  const flag = positionals.find((p) => p.startsWith('-'));
  if (flag) {
    usage(`unknown flag: ${flag}`);
    return;
  }
  if (positionals.length !== 1) {
    usage(`expected exactly 1 path argument, got ${positionals.length}`);
    return;
  }
  const target = resolve(process.cwd(), positionals[0]);

  if (!existsSync(ENVELOPE_SCHEMA_PATH)) {
    console.error(`error: envelope schema not found at ${ENVELOPE_SCHEMA_PATH}`);
    process.exitCode = 2;
    return;
  }
  if (!existsSync(target)) {
    console.error(`error: target not found at ${target}`);
    process.exitCode = 2;
    return;
  }

  const envelopeSchemaResult = readJson(ENVELOPE_SCHEMA_PATH);
  if (!envelopeSchemaResult.ok) return;
  const dataResult = readJson(target);
  if (!dataResult.ok) return;
  const data = dataResult.data;

  const ajv = new AjvCtor({ strict: true, allErrors: true });
  addFormatsFn(ajv);

  const validateEnvelope = compileSchema(ajv, envelopeSchemaResult.data, 'envelope');
  if (!validateEnvelope) return;

  const envelopeOk = validateEnvelope(data);
  if (!envelopeOk) {
    reportAjvErrors(validateEnvelope.errors, `✗ ${target} fails envelope schema:`);
    process.exitCode = 1;
    return;
  }

  // Envelope passed → registry lookup for payload schema.
  const env = data.envelope;
  const producer = env.producer;
  const artifactKind = env.artifact_kind;
  const schemaVersion = env.schema?.version;

  if (!producer || !artifactKind || !schemaVersion) {
    // Should be unreachable post-envelope-validation but be defensive.
    console.error(`✗ ${target} envelope passed but missing producer/artifact_kind/schema.version`);
    process.exitCode = 1;
    return;
  }

  const registryPath = payloadRegistryPath(producer, artifactKind, schemaVersion);

  if (!existsSync(registryPath)) {
    console.error(
      `! ${target} payload schema not found in registry (${producer}/${artifactKind}/v${schemaVersion}) — envelope-only validation`,
    );
    console.log(`✓ ${target} validates against envelope schema (payload schema unregistered)`);
    process.exitCode = 0;
    return;
  }

  const payloadSchemaResult = readJson(registryPath);
  if (!payloadSchemaResult.ok) return; // sets exitCode = 2 already

  const validatePayload = compileSchema(
    ajv,
    payloadSchemaResult.data,
    `payload (${producer}/${artifactKind}/v${schemaVersion})`,
  );
  if (!validatePayload) return;

  const payloadOk = validatePayload(data.payload);
  if (!payloadOk) {
    reportAjvErrors(
      validatePayload.errors,
      `✗ ${target} fails payload schema (${producer}/${artifactKind}/v${schemaVersion}):`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `✓ ${target} validates against envelope schema + payload schema (${producer}/${artifactKind}/v${schemaVersion})`,
  );
  process.exitCode = 0;
}

main();
