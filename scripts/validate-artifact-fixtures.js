#!/usr/bin/env node
// Walks tests/fixtures/envelope-payloads/ and runs validate-artifact.js on
// every fixture. valid-* fixtures must exit 0 (envelope passes; payload either
// passes or registry-miss warning). invalid-* fixtures must exit 1 (envelope
// or payload failure). Anything else fails CI.
//
// Usage: npm run validate-artifact-fixtures
// Exit codes: 0 — all fixtures behaved as expected. 1 — at least one mismatch.
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, basename, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const VALIDATOR = resolve(repoRoot, 'scripts/validate-artifact.js');
const FIXTURE_ROOT = resolve(repoRoot, 'tests/fixtures/envelope-payloads');

function walk(root) {
  const out = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.json')) out.push(full);
  }
  return out;
}

function run(path) {
  return spawnSync('node', [VALIDATOR, path], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 10000,
  });
}

function expected(path) {
  const name = basename(path);
  if (name.startsWith('valid-')) return 0;
  if (name.startsWith('invalid-')) return 1;
  return null; // unknown convention — treat as warning
}

function main() {
  const fixtures = walk(FIXTURE_ROOT);
  if (fixtures.length === 0) {
    console.error('error: no fixtures found under tests/fixtures/envelope-payloads/');
    process.exitCode = 1;
    return;
  }

  let pass = 0;
  let fail = 0;
  let unknown = 0;
  const failures = [];

  for (const path of fixtures) {
    const want = expected(path);
    const rel = relative(repoRoot, path);
    if (want == null) {
      unknown++;
      console.warn(`? ${rel} — filename does not start with valid-/invalid-, skipping enforcement`);
      continue;
    }
    const res = run(path);
    if (res.status === want) {
      pass++;
      continue;
    }
    fail++;
    failures.push({ rel, want, got: res.status, stderr: res.stderr, stdout: res.stdout });
  }

  console.log(`fixtures: ${fixtures.length} (pass=${pass}, fail=${fail}, unknown=${unknown})`);

  if (fail > 0) {
    for (const f of failures) {
      console.error(`✗ ${f.rel} expected exit ${f.want}, got ${f.got}`);
      if (f.stderr) console.error(f.stderr.split('\n').map((l) => `    ${l}`).join('\n'));
    }
    process.exitCode = 1;
    return;
  }
  process.exitCode = 0;
}

main();
