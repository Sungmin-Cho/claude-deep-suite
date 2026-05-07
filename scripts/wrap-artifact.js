#!/usr/bin/env node
// Wraps a legacy JSON artifact into the deep-suite envelope format. Helper for
// plugin maintainers performing M3 envelope adoption (Phase 2).
//
// Usage:
//   node scripts/wrap-artifact.js \
//     --producer <plugin>           e.g. deep-docs
//     --artifact-kind <kind>        e.g. last-scan
//     --schema-version <MAJOR.MINOR> e.g. 1.0
//     --producer-version <semver>   e.g. 1.1.0
//     --input <legacy.json>         payload-only JSON (becomes envelope.payload)
//     --output <wrapped.json>       output path (parent dir must exist)
//     [--run-id <ulid>]             override generated ULID
//     [--parent-run-id <ulid>]      cross-plugin trace parent
//     [--session-id <id>]           higher-level session marker
//     [--git-head <sha>]            override auto-detected git HEAD (e.g. for shallow CI clones)
//     [--git-branch <branch>]       override auto-detected git branch
//     [--dirty <true|false|unknown>] override auto-detected dirty flag
//
// Exit codes:
//   0 — wrapped successfully
//   1 — envelope failed validation (defensive — should be unreachable for
//       complete-input cases; surfaces if user supplies a bad --producer name etc.)
//   2 — usage / IO / argv error
//
// git context (head/branch/dirty) is auto-detected via `git` invocations.
// ULID generation: crypto.randomBytes + Crockford Base32 (no external dep).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const AjvCtor = Ajv2020.default ?? Ajv2020;
const addFormatsFn = addFormats.default ?? addFormats;

const ENVELOPE_SCHEMA_PATH = resolve(repoRoot, 'schemas/artifact-envelope.schema.json');

// Crockford's Base32 alphabet (per ULID spec), excludes I/L/O/U for visual disambiguation.
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function usage(extra) {
  if (extra) console.error(`error: ${extra}`);
  console.error('usage: wrap-artifact.js --producer <p> --artifact-kind <k> --schema-version <v>');
  console.error('                        --producer-version <semver> --input <legacy.json>');
  console.error('                        --output <wrapped.json>');
  console.error('                        [--run-id <ulid>] [--parent-run-id <ulid>] [--session-id <id>]');
  process.exitCode = 2;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      return { error: `unexpected positional argument: ${a}` };
    }
    if (a.includes('=')) {
      const eqIdx = a.indexOf('=');
      const key = a.slice(2, eqIdx);
      const value = a.slice(eqIdx + 1);
      args[key] = value;
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      return { error: `flag --${key} expects a value` };
    }
    args[key] = next;
    i++;
  }
  return { args };
}

function generateUlid(now = Date.now()) {
  // 48-bit timestamp ms (10 base32 chars) + 80-bit randomness (16 base32 chars).
  let out = '';

  // Timestamp portion.
  let ts = now;
  const tsChars = new Array(10);
  for (let i = 9; i >= 0; i--) {
    tsChars[i] = CROCKFORD[ts % 32];
    ts = Math.floor(ts / 32);
  }
  out += tsChars.join('');

  // Randomness portion: read 80 random bits, encode as 16 base32 chars.
  const randBytes = randomBytes(10); // 10 bytes = 80 bits
  let bitBuffer = 0n;
  for (const b of randBytes) bitBuffer = (bitBuffer << 8n) | BigInt(b);
  const randChars = new Array(16);
  for (let i = 15; i >= 0; i--) {
    randChars[i] = CROCKFORD[Number(bitBuffer & 31n)];
    bitBuffer >>= 5n;
  }
  out += randChars.join('');
  return out;
}

function safeGitOutput(cmd) {
  try {
    return execSync(cmd, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function detectGitContext() {
  const head = safeGitOutput('git rev-parse HEAD');
  const branch = safeGitOutput('git rev-parse --abbrev-ref HEAD');
  const status = safeGitOutput('git status --porcelain');
  if (head == null) {
    return { head: '0000000', branch: 'HEAD', dirty: 'unknown' };
  }
  return {
    head,
    branch: branch && branch !== 'HEAD' ? branch : 'HEAD',
    dirty: status == null ? 'unknown' : status.length > 0,
  };
}

function readJson(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    throw new Error(`cannot read ${path}: ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`cannot parse ${path}: ${err.message}`);
  }
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) {
    usage(parsed.error);
    return;
  }
  const a = parsed.args;
  const required = ['producer', 'artifact-kind', 'schema-version', 'producer-version', 'input', 'output'];
  for (const r of required) {
    if (!a[r]) {
      usage(`missing required flag --${r}`);
      return;
    }
  }

  if (!existsSync(ENVELOPE_SCHEMA_PATH)) {
    console.error(`error: envelope schema not found at ${ENVELOPE_SCHEMA_PATH}`);
    process.exitCode = 2;
    return;
  }

  const inputPath = resolve(process.cwd(), a.input);
  const outputPath = resolve(process.cwd(), a.output);

  let payload;
  try {
    payload = readJson(inputPath);
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exitCode = 2;
    return;
  }

  const git = detectGitContext();

  // Apply optional git override flags (useful for shallow CI clones or cross-repo invocations).
  if (a['git-head'] !== undefined) git.head = a['git-head'];
  if (a['git-branch'] !== undefined) git.branch = a['git-branch'];
  if (a['dirty'] !== undefined) {
    const d = a['dirty'];
    if (d === 'true') git.dirty = true;
    else if (d === 'false') git.dirty = false;
    else git.dirty = 'unknown';
  }

  const envelope = {
    producer: a.producer,
    producer_version: a['producer-version'],
    artifact_kind: a['artifact-kind'],
    run_id: a['run-id'] || generateUlid(),
    generated_at: new Date().toISOString(),
    schema: { name: a['artifact-kind'], version: a['schema-version'] },
    git,
    provenance: {
      source_artifacts: [],
      tool_versions: { node: process.version },
    },
  };
  if (a['session-id']) envelope.session_id = a['session-id'];
  if (a['parent-run-id']) envelope.parent_run_id = a['parent-run-id'];

  const wrapped = {
    $schema: 'https://raw.githubusercontent.com/Sungmin-Cho/claude-deep-suite/main/schemas/artifact-envelope.schema.json',
    schema_version: '1.0',
    envelope,
    payload,
  };

  // Defensive: validate envelope before writing so a bad --producer kebab-case
  // (e.g. "Deep_Docs") is caught here, not at consumer side.
  let envelopeSchema;
  try {
    envelopeSchema = readJson(ENVELOPE_SCHEMA_PATH);
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exitCode = 2;
    return;
  }

  const ajv = new AjvCtor({ strict: true, allErrors: true });
  addFormatsFn(ajv);
  let validate;
  try {
    validate = ajv.compile(envelopeSchema);
  } catch (err) {
    console.error(`error: envelope schema compile failed: ${err.message}`);
    process.exitCode = 2;
    return;
  }

  if (!validate(wrapped)) {
    console.error(`✗ wrapped artifact fails envelope schema (check --producer / --artifact-kind / --producer-version):`);
    for (const err of validate.errors ?? []) {
      const at = err.instancePath || '<root>';
      console.error(`  - ${at} ${err.message} (${err.keyword})`);
    }
    process.exitCode = 1;
    return;
  }

  try {
    writeFileSync(outputPath, JSON.stringify(wrapped, null, 2) + '\n');
  } catch (err) {
    console.error(`error: cannot write ${outputPath}: ${err.message}`);
    process.exitCode = 2;
    return;
  }

  console.log(`✓ wrapped → ${outputPath} (run_id=${envelope.run_id})`);
  process.exitCode = 0;
}

main();
