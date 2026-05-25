#!/usr/bin/env node
// install-hooks — copy repo-tracked git hooks into this clone's hooks dir.
//
// Wired to the npm `prepare` lifecycle so a fresh `npm install` activates the
// pre-push preflight gate automatically. Deliberately best-effort: it must
// NEVER fail the install (e.g. `npm ci` in CI, a non-git tarball, or a
// read-only hooks dir) — on any problem it warns and exits 0.
//
// A managed hook carries the `deep-suite:managed-hook` marker. We install/refresh
// our own hook but never clobber a pre-existing unmanaged hook (we warn instead).
import { readFileSync, writeFileSync, existsSync, chmodSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const MARKER = 'deep-suite:managed-hook';
const HOOKS = ['pre-push'];

function warn(msg) {
  console.error(`[install-hooks] ${msg}`);
}

function gitHooksDir(repoRoot) {
  // `git rev-parse --git-path hooks` resolves correctly for plain clones,
  // worktrees, and custom core.hooksPath. Returns a path relative to cwd.
  const res = spawnSync('git', ['rev-parse', '--git-path', 'hooks'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (res.error || res.status !== 0) return null;
  const out = (res.stdout || '').trim();
  if (!out) return null;
  return resolve(repoRoot, out);
}

function main() {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const srcDir = join(repoRoot, 'scripts', 'hooks');

  const hooksDir = gitHooksDir(repoRoot);
  if (!hooksDir) {
    warn('not a git working tree (or git unavailable) — skipping hook install.');
    return; // exit 0
  }

  let installed = 0;
  for (const name of HOOKS) {
    const src = join(srcDir, name);
    const dest = join(hooksDir, name);
    if (!existsSync(src)) {
      warn(`source hook missing: scripts/hooks/${name} — skipping.`);
      continue;
    }
    try {
      if (existsSync(dest)) {
        const cur = readFileSync(dest, 'utf8');
        if (!cur.includes(MARKER)) {
          warn(`existing unmanaged ${name} hook found — leaving it untouched.`);
          warn(`  to adopt the deep-suite gate, merge scripts/hooks/${name} manually.`);
          continue;
        }
      }
      if (!existsSync(hooksDir)) mkdirSync(hooksDir, { recursive: true });
      writeFileSync(dest, readFileSync(src, 'utf8'));
      chmodSync(dest, 0o755);
      installed++;
    } catch (err) {
      warn(`could not install ${name}: ${err.message} — skipping.`);
    }
  }

  if (installed > 0) {
    console.log(`[install-hooks] installed ${installed} git hook(s): ${HOOKS.join(', ')}`);
  }
}

try {
  main();
} catch (err) {
  // Last-resort guard: never break `npm install` / `npm ci`.
  warn(`unexpected error: ${err?.message ?? err} — skipping.`);
}
