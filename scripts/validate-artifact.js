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
//
// Trust model: local dev tool. <target>/<registry-path> are user-controlled —
// no path traversal guard since the user invokes us against their own filesystem.
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
  console.error('usage: validate-artifact.js [--strict] <path-to-artifact.json>');
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

function normalizeSchemaVersion(schemaVersion) {
  // Normalize MAJOR.MINOR so that "1.00" ≡ "1.0", preventing registry misses
  // caused by producer-side zero-padding differences. parseInt NaN-guards each
  // component — if a segment cannot be parsed the original string is returned.
  const parts = schemaVersion.split('.');
  const normalized = parts.map((s) => {
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? s : String(n);
  });
  return normalized.join('.');
}

function payloadRegistryPath(producer, artifactKind, schemaVersion) {
  // schema.version is "MAJOR.MINOR" per envelope schema. Normalize before
  // constructing the path so producers that emit "1.00" resolve to the same
  // registry entry as those that emit "1.0".
  const normalizedVersion = normalizeSchemaVersion(schemaVersion);
  return resolve(
    PAYLOAD_REGISTRY_DIR,
    producer,
    artifactKind,
    `v${normalizedVersion}.schema.json`,
  );
}

function main() {
  const argv = process.argv.slice(2);
  let strict = false;
  const positionals = [];
  for (const a of argv) {
    if (a === '--strict') {
      strict = true;
      continue;
    }
    if (a.startsWith('--strict=')) {
      const v = a.slice('--strict='.length);
      if (v === 'true') strict = true;
      else if (v === 'false') strict = false;
      else {
        usage(`--strict expects true|false, got "${v}"`);
        return;
      }
      continue;
    }
    positionals.push(a);
  }
  const unknownFlag = positionals.find((p) => p.startsWith('-'));
  if (unknownFlag) {
    usage(`unknown flag: ${unknownFlag}`);
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

  // Identity check: schema.name must match artifact_kind (cross-plugin trace contract).
  // The envelope schema makes both fields required separately; nothing in the schema
  // forces equality, so we enforce it here as an additional invariant.
  if (data.envelope.schema.name !== data.envelope.artifact_kind) {
    console.error(
      `✗ ${target} fails identity check: envelope.schema.name "${data.envelope.schema.name}" ` +
      `!= envelope.artifact_kind "${data.envelope.artifact_kind}"`,
    );
    process.exitCode = 1;
    return;
  }

  // Cross-field invariant (evolve-receipt): session identity must live in at least
  // one of envelope.session_id / payload.session_id, and when it appears in both
  // they must be equal — otherwise a single receipt advertises two identities and
  // corrupts downstream trace joins. The v1.0 payload schema no longer requires
  // payload.session_id (real emit carries it only in the envelope), and the
  // envelope schema makes session_id optional — nothing forces either constraint,
  // so we enforce them here (same pattern as the identity check above) to keep
  // evolve-receipt traceability (M4 telemetry / parent_run_id chain) intact.
  if (data.envelope.artifact_kind === 'evolve-receipt') {
    const envSessionId = data.envelope.session_id;
    const payloadSessionId = data.payload?.session_id;
    if (!envSessionId && !payloadSessionId) {
      console.error(
        `✗ ${target} fails session-identity check: evolve-receipt requires session_id in ` +
        `envelope.session_id or payload.session_id (both absent)`,
      );
      process.exitCode = 1;
      return;
    }
    if (envSessionId && payloadSessionId && envSessionId !== payloadSessionId) {
      console.error(
        `✗ ${target} fails session-identity check: evolve-receipt envelope.session_id ` +
        `"${envSessionId}" != payload.session_id "${payloadSessionId}" (must match when both present)`,
      );
      process.exitCode = 1;
      return;
    }
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
    const normalizedVersion = normalizeSchemaVersion(schemaVersion);
    if (strict) {
      console.error(
        `✗ ${target} fails strict-mode registry lookup (${producer}/${artifactKind}/v${normalizedVersion}) — no payload schema registered`,
      );
      process.exitCode = 1;
      return;
    }
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
