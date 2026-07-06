#!/usr/bin/env node
// Verifies the pinned-SHA provenance of real-emit envelope fixtures.
//
// Why: a real-emit fixture (tests/fixtures/envelope-payloads/**/valid-real-emit*.json)
// is a static snapshot of a producer's actual emit at a pinned SHA. Nothing
// re-checks it after a `marketplace.json` SHA bump, so a producer whose emit
// shape changed would leave the fixture green against a stale shape — reopening
// the schema↔emit drift class. Each real-emit fixture carries a root
// `x-provenance` key ({ producer, source, captured_at_sha }); this checker
// asserts captured_at_sha still equals the producer's current marketplace pin.
//
// This is a *conservative deterministic guard*: it only answers "did the SHA
// move?", not "did the emit shape actually change". A no-op SHA bump also turns
// it RED, forcing a maintainer to re-verify the emit and refresh captured_at_sha
// (cheap). Full pinned-source emit extraction/diff is intentionally out of scope.
//
// Checks:
//   (presence)    a fixture named *real-emit* MUST carry a root x-provenance.
//   (producer)    x-provenance.producer must match the producer derived from the
//                 fixture path (envelope-payloads/<producer>/...).
//   (pin)         x-provenance.captured_at_sha must equal marketplace source.sha
//                 for that producer.
//
// Test override: M2_TEST_PROVENANCE_FIXTURE_DIR walks that directory instead of
// the default fixture root (drift-injection scaffolding).
//
// Exit codes: 0 clean, 1 drift, 2 IO/usage.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, relative, join, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMarketplace } from './lib/fetch-plugin-files.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_FIXTURE_ROOT = resolve(REPO_ROOT, 'tests/fixtures/envelope-payloads');

function walk(root) {
  const out = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.json')) out.push(full);
  }
  return out;
}

// producer = the path segment immediately under envelope-payloads/.
function producerFromPath(fixtureRoot, path) {
  const rel = relative(fixtureRoot, path);
  return rel.split(sep)[0] || null;
}

function main() {
  if (process.argv.length > 2) {
    console.error('error: this checker takes no arguments');
    process.exitCode = 2;
    return;
  }
  const fixtureRoot = process.env.M2_TEST_PROVENANCE_FIXTURE_DIR
    ? resolve(process.env.M2_TEST_PROVENANCE_FIXTURE_DIR)
    : DEFAULT_FIXTURE_ROOT;
  if (!existsSync(fixtureRoot)) {
    console.error(`error: fixture root not found at ${fixtureRoot}`);
    process.exitCode = 2;
    return;
  }

  let pins;
  try {
    pins = new Map(readMarketplace(REPO_ROOT).plugins.map((p) => [p.plugin, p.sha]));
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exitCode = 2;
    return;
  }

  const issues = [];
  let checked = 0;
  for (const path of walk(fixtureRoot)) {
    const rel = relative(REPO_ROOT, path);
    const isRealEmit = /real-emit/.test(basename(path));
    let doc;
    try {
      doc = JSON.parse(readFileSync(path, 'utf8'));
    } catch (err) {
      issues.push(`✗ ${rel} — cannot parse JSON: ${err.message}`);
      continue;
    }
    const prov = doc['x-provenance'];

    if (!prov) {
      if (isRealEmit) {
        issues.push(`✗ ${rel} — real-emit fixture missing root x-provenance ({ producer, source, captured_at_sha })`);
      }
      continue; // non-real-emit fixtures without provenance are fine
    }

    checked++;
    const pathProducer = producerFromPath(fixtureRoot, path);
    if (prov.producer !== pathProducer) {
      issues.push(`✗ ${rel} — x-provenance.producer "${prov.producer}" != producer from path "${pathProducer}"`);
    }
    const pin = pins.get(pathProducer);
    if (!pin) {
      issues.push(`✗ ${rel} — no marketplace pin for producer "${pathProducer}"`);
    } else if (prov.captured_at_sha !== pin) {
      issues.push(
        `✗ ${rel} — captured_at_sha ${prov.captured_at_sha} != marketplace pin ${pin}; ` +
        `run \`git show ${pin}:${prov.source}\` and refresh the fixture + x-provenance`,
      );
    }
  }

  if (issues.length > 0) {
    for (const i of issues) console.error(i);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ fixture provenance matches marketplace pins (${checked} x-provenance fixture(s) checked)`);
  process.exitCode = 0;
}

main();
