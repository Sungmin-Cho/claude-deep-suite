import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
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

function collectShellScripts(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectShellScripts(p));
    } else if (entry.isFile() && entry.name.endsWith('.sh')) {
      out.push(p);
    }
  }
  return out;
}

// --- shell script bash -n syntax check ---

const EXAMPLE_SCRIPTS = collectShellScripts(resolve(repoRoot, 'examples'));

test('example pack contains at least 4 shell scripts (regression: deletions get caught)', () => {
  // hooks-suite-baseline/scripts: session-open, pre-tool-guard, stop-flush-metrics = 3
  // hooks-strict-mode/scripts: session-open, denylist-guard, stop-flush-metrics = 3
  // Total ≥ 6. We assert ≥ 4 so future re-org (e.g., script merging) still passes.
  assert.ok(
    EXAMPLE_SCRIPTS.length >= 4,
    `expected ≥4 shell scripts, found ${EXAMPLE_SCRIPTS.length}`
  );
});

for (const script of EXAMPLE_SCRIPTS) {
  const rel = script.slice(repoRoot.length + 1);
  test(`${rel} passes bash -n syntax check`, () => {
    const result = spawnSync('bash', ['-n', script], { encoding: 'utf8' });
    assert.equal(
      result.status,
      0,
      `bash -n failed for ${rel}:\n${result.stderr || result.stdout}`
    );
  });
}

// --- shellcheck (optional, skipped if not installed) ---

function shellcheckAvailable() {
  const probe = spawnSync('shellcheck', ['--version'], { encoding: 'utf8' });
  return probe.status === 0;
}

for (const script of EXAMPLE_SCRIPTS) {
  const rel = script.slice(repoRoot.length + 1);
  test(`${rel} passes shellcheck (skipped if not installed)`, (t) => {
    if (!shellcheckAvailable()) {
      t.skip('shellcheck not installed in this environment');
      return;
    }
    const result = spawnSync('shellcheck', ['--severity=warning', script], { encoding: 'utf8' });
    assert.equal(
      result.status,
      0,
      `shellcheck (severity=warning) failed for ${rel}:\n${result.stdout}\n${result.stderr}`
    );
  });
}

// --- handoff template envelope + payload validation ---

test('examples/handoff-phase5-to-evolve/handoff-template.json passes M3 envelope schema', () => {
  const envelopeValidate = makeValidator('schemas/artifact-envelope.schema.json');
  const data = readJson('examples/handoff-phase5-to-evolve/handoff-template.json');
  const ok = envelopeValidate(data);
  assert.equal(ok, true, JSON.stringify(envelopeValidate.errors, null, 2));
});

test('examples/handoff-phase5-to-evolve/handoff-template.json payload passes handoff schema', () => {
  const payloadValidate = makeValidator('schemas/handoff.schema.json');
  const data = readJson('examples/handoff-phase5-to-evolve/handoff-template.json');
  const ok = payloadValidate(data.payload);
  assert.equal(ok, true, JSON.stringify(payloadValidate.errors, null, 2));
});

test('examples/handoff-phase5-to-evolve/handoff-template.json envelope.artifact_kind matches schema.name (wrap-artifact.js invariant)', () => {
  const data = readJson('examples/handoff-phase5-to-evolve/handoff-template.json');
  assert.equal(data.envelope.artifact_kind, 'handoff');
  assert.equal(data.envelope.schema.name, 'handoff');
});

// --- settings.json structural sanity ---

const SETTINGS_FILES = [
  'examples/hooks-suite-baseline/.claude/settings.json',
  'examples/hooks-strict-mode/.claude/settings.json'
];

for (const settingsFile of SETTINGS_FILES) {
  test(`${settingsFile} is valid JSON with the expected hooks structure`, () => {
    const data = readJson(settingsFile);
    assert.ok(data.hooks, 'must have top-level "hooks" object');
    assert.ok(Array.isArray(data.hooks.SessionStart), 'SessionStart must be an array');
    assert.ok(Array.isArray(data.hooks.PreToolUse), 'PreToolUse must be an array');
    assert.ok(Array.isArray(data.hooks.Stop), 'Stop must be an array');
    // Every command path under hooks must use ${CLAUDE_PROJECT_DIR} prefix
    // (drop-in safety: absolute paths would couple the example to one user's filesystem).
    const allCommands = [];
    for (const event of Object.values(data.hooks)) {
      for (const entry of event) {
        for (const hook of entry.hooks || []) {
          if (hook.type === 'command') allCommands.push(hook.command);
        }
      }
    }
    assert.ok(allCommands.length > 0, 'expected at least one command hook');
    for (const cmd of allCommands) {
      assert.ok(
        cmd.startsWith('${CLAUDE_PROJECT_DIR}/scripts/'),
        `command must use \${CLAUDE_PROJECT_DIR}/scripts/ prefix (got: ${cmd})`
      );
    }
  });
}

// --- denylist-guard.sh case-based execution (M5.5 #7 acceptance) ---
// shellcheck above only proves the script parses cleanly. This block runs the
// guard with each family argv and asserts exit code + stderr — i.e. proves the
// case branches are wired correctly. Authoritative test lives in
// tests/denylist.test.sh (bash 3.2 / GNU bash 5+ portable); this wrapper just
// makes the .sh visible to `npm test` so CI runs both halves.

test('tests/denylist.test.sh — denylist-guard.sh blocks all 7 families with correct override env vars', () => {
  const sh = resolve(repoRoot, 'tests/denylist.test.sh');
  assert.ok(existsSync(sh), `denylist.test.sh missing at ${sh}`);
  const result = spawnSync('bash', [sh], { encoding: 'utf8' });
  assert.equal(
    result.status,
    0,
    `denylist.test.sh failed (exit ${result.status}):\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
  // Sanity: the script's banner + summary line should be in stdout. Catches
  // accidental silent exit-0 (e.g. set -e bailing before the assert loop).
  assert.match(result.stdout, /denylist\.test\.sh — running 7 family blocks/);
  assert.match(result.stdout, /Results: \d+ passed, 0 failed/);
});

test('hooks-strict-mode/.claude/settings.json covers all 7 documented dangerous-command families (M5 spec acceptance criteria)', () => {
  // Family-set assertion (not raw rule count) — prevents the regression where
  // a future PR could delete a family while keeping ≥5 rules and still pass.
  // The denylist-guard.sh `case` statement is the authoritative family list.
  const EXPECTED_FAMILIES = new Set([
    'force-push',
    'hard-reset-remote',
    'rm-rf',
    'sql-destructive',
    'kubectl-destructive',
    'npm-publish',
    'curl-pipe-shell'
  ]);
  const data = readJson('examples/hooks-strict-mode/.claude/settings.json');
  const observedFamilies = new Set();
  for (const entry of data.hooks.PreToolUse || []) {
    for (const hook of entry.hooks || []) {
      if (hook.type !== 'command' || !hook.command) continue;
      // command shape: "${CLAUDE_PROJECT_DIR}/scripts/denylist-guard.sh <family>"
      // The family is the last whitespace-separated token.
      const parts = hook.command.trim().split(/\s+/);
      if (parts.length < 2) continue;
      observedFamilies.add(parts[parts.length - 1]);
    }
  }
  for (const family of EXPECTED_FAMILIES) {
    assert.ok(
      observedFamilies.has(family),
      `strict-mode settings.json missing family '${family}'. Observed: ${[...observedFamilies].sort().join(', ')}`
    );
  }
  // Also assert no unknown families that denylist-guard.sh's case statement
  // would reject (defense in depth — typo in settings.json caught here).
  for (const family of observedFamilies) {
    assert.ok(
      EXPECTED_FAMILIES.has(family),
      `strict-mode settings.json references unknown family '${family}' — add it to denylist-guard.sh case statement or fix the typo`
    );
  }
});
