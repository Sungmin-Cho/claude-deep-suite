#!/usr/bin/env node
// release-bump — automate the suite-side release workflow for one plugin.
//
// Why: the manifest-doc-sync CI gate went red for days because a plugin SHA
// bump landed on main without the follow-up regeneration steps (docs:write →
// docs:sync) + sidecar reconcile (see CLAUDE.md §Release workflow). This script
// makes the correct path a single command so the regen can't be skipped:
//
//   1. set marketplace.json `source.sha` (canonical pin) for <plugin> to <sha>
//      (and the redundant top-level `sha` mirror, if the entry carries one),
//      optionally updating the narrative description;
//   2. run `npm run docs:write` to regenerate the auto-generated marker regions;
//   3. run `npm run preflight` (full local CI gate) to verify — surfacing any
//      sidecar artifact / guide-narrative drift the bump introduced.
//
// It deliberately does NOT git-commit/push — that stays a human step. On a
// preflight failure it points at the likely manual reconcile (sidecar artifacts
// path, guide narrative version), mirroring the three drift classes this repo
// has actually hit.
//
// Usage:
//   node scripts/release-bump.js <plugin> <sha40> [--description="…"]
//                                                 [--dry-run] [--no-verify]
//   npm run release:bump -- <plugin> <sha40>
//
// Flags:
//   --description="…"  also replace the plugin's marketplace narrative blurb.
//   --dry-run          validate + print the planned marketplace edit; write
//                      nothing, run no sub-commands. (used by tests)
//   --no-verify        write + docs:write, but skip the preflight gate.
//
// Exit codes: 0 ok, 1 usage/verify failure, 2 IO.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const MARKET_PATH = resolve(REPO_ROOT, '.claude-plugin/marketplace.json');

const SHA_RE = /^[0-9a-f]{40}$/;

// ── pure helpers (unit-tested; no IO) ───────────────────────────────────────

export function isFullSha(s) {
  return typeof s === 'string' && SHA_RE.test(s);
}

export function listPluginNames(marketText) {
  const data = JSON.parse(marketText);
  return (data.plugins ?? []).map((p) => p.name);
}

// Returns { text, oldSha, newVersionHint } or throws Error with a clear message.
// `text` is the rewritten marketplace.json content (2-space + trailing \n),
// byte-faithful to the parser's canonical serialization (proven roundtrip).
export function applyBump(marketText, plugin, sha, { description } = {}) {
  if (!isFullSha(sha)) {
    throw new Error(
      `sha must be a full 40-char lowercase hex commit (got ${JSON.stringify(sha)}). ` +
        `Capture it with: git -C ../${plugin} rev-parse main`
    );
  }
  const data = JSON.parse(marketText);
  const entry = (data.plugins ?? []).find((p) => p.name === plugin);
  if (!entry) {
    const names = (data.plugins ?? []).map((p) => p.name).join(', ');
    throw new Error(`unknown plugin "${plugin}". Known: ${names}`);
  }
  if (!entry.source || typeof entry.source !== 'object') {
    throw new Error(`marketplace entry "${plugin}" has no source object`);
  }
  const oldSha = entry.source.sha;
  entry.source.sha = sha;
  // Some entries carry a redundant top-level `sha` mirror (e.g. deep-wiki) —
  // keep it in lockstep so it doesn't drift into a second source of truth.
  if (Object.prototype.hasOwnProperty.call(entry, 'sha')) entry.sha = sha;
  if (typeof description === 'string' && description.length > 0) {
    entry.description = description;
  }
  return { text: JSON.stringify(data, null, 2) + '\n', oldSha };
}

// ── arg parsing ──────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const positionals = [];
  const flags = { dryRun: false, noVerify: false, description: undefined };
  for (const a of argv) {
    if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--no-verify') flags.noVerify = true;
    else if (a.startsWith('--description=')) flags.description = a.slice('--description='.length);
    else if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`);
    else positionals.push(a);
  }
  return { positionals, flags };
}

const USAGE =
  'usage: node scripts/release-bump.js <plugin> <sha40> [--description="…"] [--dry-run] [--no-verify]';

// ── IO / orchestration ───────────────────────────────────────────────────────

function run(cmd, args) {
  const res = spawnSync(cmd, args, { cwd: REPO_ROOT, stdio: 'inherit' });
  if (res.error) throw res.error;
  return res.status ?? 1;
}

function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`error: ${err.message}`);
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  const [plugin, sha] = parsed.positionals;
  if (!plugin || !sha) {
    console.error('error: <plugin> and <sha40> are required');
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  let marketText;
  try {
    marketText = readFileSync(MARKET_PATH, 'utf8');
  } catch (err) {
    console.error(`error: cannot read marketplace.json: ${err.message}`);
    process.exitCode = 2;
    return;
  }

  let result;
  try {
    result = applyBump(marketText, plugin, sha, { description: parsed.flags.description });
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  const short = sha.slice(0, 7);
  const oldShort = (result.oldSha ?? '???????').slice(0, 7);

  if (parsed.flags.dryRun) {
    console.log(`[dry-run] ${plugin}: source.sha ${oldShort} → ${short}`);
    if (parsed.flags.description) console.log('[dry-run] description would be replaced');
    console.log('[dry-run] no files written, no sub-commands run.');
    process.exitCode = 0;
    return;
  }

  if (result.oldSha === sha && !parsed.flags.description) {
    console.error(`note: ${plugin} source.sha is already ${short} — regenerating docs anyway.`);
  }

  try {
    writeFileSync(MARKET_PATH, result.text);
  } catch (err) {
    console.error(`error: cannot write marketplace.json: ${err.message}`);
    process.exitCode = 2;
    return;
  }
  console.log(`✓ marketplace.json: ${plugin} source.sha ${oldShort} → ${short}`);

  console.log('→ npm run docs:write (regenerate marker regions)');
  const docsStatus = run('npm', ['run', '--silent', 'docs:write']);
  if (docsStatus !== 0) {
    console.error('✗ docs:write failed — check the generator output above.');
    process.exitCode = 1;
    return;
  }

  if (parsed.flags.noVerify) {
    console.log('⚠ --no-verify: skipping preflight gate.');
    printNextSteps(plugin, short);
    process.exitCode = 0;
    return;
  }

  console.log('→ npm run preflight (local CI gate)');
  const gateStatus = run('npm', ['run', '--silent', 'preflight']);
  if (gateStatus !== 0) {
    console.error('');
    console.error('✗ preflight failed after the bump. Common manual reconciles:');
    console.error('  - guide narrative: un-bold/bump version mentions in guides/integrated-workflow-guide{,.ko}.md');
    console.error('  - sidecar artifacts: align .claude-plugin/suite-extensions.json writes/reads with the new pinned source');
    console.error('  - sidecar schema: forward-compat keys must use the ^x- namespace (schema locked at 1.0)');
    console.error('Re-run `npm run preflight` after fixing.');
    process.exitCode = 1;
    return;
  }

  console.log('✓ preflight green.');
  printNextSteps(plugin, short);
  process.exitCode = 0;
}

function printNextSteps(plugin, short) {
  console.log('');
  console.log('Next (manual): review the diff, then commit + push:');
  console.log(`  git add -A && git commit -m "chore: bump ${plugin} to <vX.Y.Z> — <summary> (${short})"`);
  console.log('  git push origin main');
}

// Only run main() when invoked as a CLI, not when imported by tests.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}
