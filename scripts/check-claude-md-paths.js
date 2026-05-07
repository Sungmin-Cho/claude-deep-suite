#!/usr/bin/env node
// Verifies CLAUDE.md §Project Structure references real on-disk paths.
//
// Strategy: find `^## Project Structure` heading, read until next `^## ` heading,
// extract paths from the fenced code block (we look for lines containing patterns
// like `path/to/dir/` or `path/to/file.ext`), and check `existsSync()` for each.
//
// Heuristic: lines that begin with a path-like token (no leading "—" or "|"),
// optionally followed by spaces, then "—" or "/" terminator. Ignore lines that
// look like commentary.
//
// Exit codes: 0 clean, 1 drift, 2 IO/usage.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// `git check-ignore` returns exit 0 if the path is ignored, 1 if not, 128 on
// "not in a git repo" or other error. We use it to soft-skip *only* gitignored
// paths — anything else missing-on-disk is real structural drift.
function isGitIgnored(repoRelative) {
  const res = spawnSync('git', ['-C', REPO_ROOT, 'check-ignore', '-q', repoRelative], {
    encoding: 'utf8',
  });
  if (res.error) return false;
  return res.status === 0;
}

function extractStructureBlock(md) {
  const startRe = /^##\s+Project Structure\s*$/m;
  const startMatch = md.match(startRe);
  if (!startMatch) return null;
  const startIdx = startMatch.index + startMatch[0].length;
  const after = md.slice(startIdx);
  const nextHeader = after.match(/^##\s+/m);
  const block = nextHeader ? after.slice(0, nextHeader.index) : after;
  const fence = block.match(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/);
  if (!fence) return null;
  return { body: fence[1], offset: startIdx + fence.index + fence[0].indexOf('\n') + 1 };
}

function pathCandidates(body) {
  const lines = body.split('\n');
  const out = [];
  let currentDir = '';
  lines.forEach((rawLine, i) => {
    if (!rawLine.trim()) return;
    const indent = rawLine.match(/^(\s*)/)[1].length;
    const stripped = rawLine.replace(/^\s+/, '');
    // First whitespace-delimited token. Allow "/" inside (e.g., "superpowers/specs/").
    const token = stripped.split(/[\s—│]/)[0];
    if (!token) return;

    // Directory header (top-level, indent 0, ends with "/"): set currentDir, skip filesystem check (it's a real dir)
    if (indent === 0 && token.endsWith('/')) {
      currentDir = token;
      out.push({ token, lineNo: i, parent: '' });
      return;
    }
    // Top-level files (e.g., "package.json / package-lock.json"): each side may be path-y; emit one candidate per token.
    if (indent === 0) {
      currentDir = '';
    }

    // Skip globs, templates, URLs.
    if (token.includes('*')) return;
    if (token.startsWith('http://') || token.startsWith('https://')) return;
    if (token.includes('<') || token.includes('>')) return;

    // Looks path-y if contains "/" or has a known file extension.
    const looksPathy =
      token.includes('/') ||
      /\.(md|json|js|ts|sh|py|yaml|yml|html|css|sql)$/i.test(token);
    if (!looksPathy) return;

    // If the token looks like a relative segment under the current parent, prepend parent.
    const fullPath = indent > 0 && currentDir && !token.startsWith('/') && !token.startsWith('.')
      ? `${currentDir}${token}`
      : token;
    out.push({ token: fullPath, originalToken: token, lineNo: i, parent: currentDir });

    // Top-level lines like "package.json / package-lock.json" — also pick up second token after "/"
    if (indent === 0) {
      const slash = stripped.match(/^\S+\s*\/\s*(\S+)/);
      if (slash) {
        const second = slash[1];
        if (
          !second.includes('*') &&
          !second.startsWith('http') &&
          !second.includes('<') &&
          (second.includes('/') || /\.(md|json|js|ts|sh|py|yaml|yml)$/i.test(second))
        ) {
          out.push({ token: second, originalToken: second, lineNo: i, parent: '' });
        }
      }
    }
  });
  return out;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    console.error('error: this checker takes no arguments');
    process.exitCode = 2;
    return;
  }
  // M2_TEST_CLAUDE_MD overrides the target file (test scaffolding). Existence
  // checks for paths inside the override still resolve relative to REPO_ROOT,
  // so fixtures can describe real-or-bogus paths against the live repo tree.
  const claudePath = process.env.M2_TEST_CLAUDE_MD
    ? resolve(process.env.M2_TEST_CLAUDE_MD)
    : resolve(REPO_ROOT, 'CLAUDE.md');
  if (!existsSync(claudePath)) {
    console.error(`error: CLAUDE.md not found at ${claudePath}`);
    process.exitCode = 2;
    return;
  }
  const md = readFileSync(claudePath, 'utf8');
  const block = extractStructureBlock(md);
  if (!block) {
    console.error('error: CLAUDE.md has no "## Project Structure" fenced block');
    process.exitCode = 2;
    return;
  }
  const candidates = pathCandidates(block.body);
  const lineCountToBlock = md.slice(0, block.offset).split('\n').length;

  let drift = 0;
  let skipped = 0;
  for (const c of candidates) {
    const trailing = c.token.endsWith('/') ? c.token.slice(0, -1) : c.token;
    const target = resolve(REPO_ROOT, trailing);
    if (existsSync(target)) continue;
    // Soft-pass ONLY for explicitly gitignored paths — CI clones legitimately
    // lack docs/superpowers/, etc., per the repo's gitignore policy. Anything
    // else (typos, references to files the dev forgot to commit) must fail:
    // an "untracked" path that doesn't exist on disk is real drift, not local
    // configuration. Closes review C1 (false-pass on ONBOARDING.md).
    if (isGitIgnored(trailing)) {
      skipped++;
      continue;
    }
    const lineNo = lineCountToBlock + c.lineNo;
    console.error(`✗ CLAUDE.md:${lineNo} — Project Structure references missing path: ${c.token}`);
    drift++;
  }

  if (drift > 0) {
    console.error('');
    console.error(`Fix: create the missing path or remove the Project Structure entry.`);
    process.exitCode = 1;
    return;
  }
  const verified = candidates.length - skipped;
  const skipNote = skipped > 0 ? ` (${skipped} gitignored path${skipped > 1 ? 's' : ''} soft-skipped — legitimately local-only)` : '';
  console.log(`✓ all ${verified} Project Structure paths exist${skipNote}`);
  process.exitCode = 0;
}

main();
