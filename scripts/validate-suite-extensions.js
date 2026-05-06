#!/usr/bin/env node
// Validates .claude-plugin/suite-extensions.json against the schema +
// post-schema referential integrity (data_flow.from/to ↔ plugins keys).
//
// Usage:
//   node scripts/validate-suite-extensions.js [path-to-extensions.json]
//
// Exit codes:
//   0 — valid (schema + referential integrity both pass)
//   1 — validation failure. Distinguish phases by stderr prefix:
//       "✗ ... fails schema validation:"     → Phase 1 (JSON Schema)
//       "✗ ... fails referential integrity:" → Phase 2 (data_flow.from/to)
//   2 — usage / IO / schema-compile / argv error
//
// data_flow.via is a DISPLAY-ONLY label (handoff §5 option 1) — not validated.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const AjvCtor = Ajv2020.default ?? Ajv2020;
const addFormatsFn = addFormats.default ?? addFormats;

const SCHEMA_PATH = resolve(repoRoot, 'schemas/suite-extensions.schema.json');
const DEFAULT_TARGET = resolve(repoRoot, '.claude-plugin/suite-extensions.json');

function usage(extra) {
  if (extra) console.error(`error: ${extra}`);
  console.error('usage: validate-suite-extensions.js [path-to-extensions.json]');
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

function validateReferentialIntegrity(data) {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    return ['<root> not a plain object — referential check requires schema-validated input'];
  }
  if (data.plugins != null && typeof data.plugins !== 'object') {
    return ['/plugins not a plain object'];
  }
  const errors = [];
  const plugins = data.plugins ?? {};
  const pluginKeys = new Set(Object.keys(plugins));
  const edges = Array.isArray(data.data_flow) ? data.data_flow : [];

  edges.forEach((edge, idx) => {
    if (typeof edge !== 'object' || edge == null) {
      errors.push(`/data_flow/${idx} not an object`);
      return;
    }
    if (edge.from && !pluginKeys.has(edge.from)) {
      errors.push(`/data_flow/${idx}/from "${edge.from}" not in plugins (typo? schema cannot enforce cross-key refs — validator-CLI custom phase)`);
    }
    if (edge.to && !pluginKeys.has(edge.to)) {
      errors.push(`/data_flow/${idx}/to "${edge.to}" not in plugins`);
    }
    // Note: edge.via is a display-only label (handoff §5 option 1) — not validated here.
  });
  return errors;
}

function main() {
  const positionals = process.argv.slice(2);
  if (positionals.length > 1) {
    usage(`expected 0 or 1 path argument, got ${positionals.length}: ${positionals.join(' ')}`);
    return;
  }
  const target = positionals[0] ? resolve(process.cwd(), positionals[0]) : DEFAULT_TARGET;

  if (!existsSync(SCHEMA_PATH)) {
    console.error(`error: schema not found at ${SCHEMA_PATH}`);
    process.exitCode = 2;
    return;
  }
  if (!existsSync(target)) {
    console.error(`error: target not found at ${target}`);
    process.exitCode = 2;
    return;
  }

  const schemaResult = readJson(SCHEMA_PATH);
  if (!schemaResult.ok) return;
  const schema = schemaResult.data;
  const dataResult = readJson(target);
  if (!dataResult.ok) return;
  const data = dataResult.data;

  let validate;
  try {
    const ajv = new AjvCtor({ strict: true, allErrors: true });
    addFormatsFn(ajv);
    validate = ajv.compile(schema);
  } catch (err) {
    console.error(`error: schema compile failed: ${err.message}`);
    process.exitCode = 2;
    return;
  }

  const ok = validate(data);
  if (!ok) {
    console.error(`✗ ${target} fails schema validation:`);
    let sawSchemaVersionConst = false;
    for (const err of validate.errors ?? []) {
      const at = err.instancePath || '<root>';
      console.error(`  - ${at} ${err.message} (${err.keyword})`);
      if (err.keyword === 'const' && at === '/schema_version') {
        sawSchemaVersionConst = true;
      }
    }
    if (sawSchemaVersionConst) {
      console.error('');
      console.error('  Note: schema_version is locked to "1.0" by design.');
      console.error('        For forward-compat extensions use `x-*` patternProperties.');
      console.error('        See schemas/README.md §Schema versioning.');
    }
    process.exitCode = 1;
    return;
  }

  const refErrors = validateReferentialIntegrity(data);
  if (refErrors.length > 0) {
    console.error(`✗ ${target} fails referential integrity:`);
    for (const e of refErrors) console.error(`  - ${e}`);
    process.exitCode = 1;
    return;
  }

  console.log(`✓ ${target} validates against suite-extensions schema + referential integrity`);
  process.exitCode = 0;
}

main();
