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

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

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
  const claudePath = resolve(REPO_ROOT, 'CLAUDE.md');
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
  for (const c of candidates) {
    const trailing = c.token.endsWith('/') ? c.token.slice(0, -1) : c.token;
    const target = resolve(REPO_ROOT, trailing);
    if (!existsSync(target)) {
      const lineNo = lineCountToBlock + c.lineNo;
      console.error(`✗ CLAUDE.md:${lineNo} — Project Structure references missing path: ${c.token}`);
      drift++;
    }
  }

  if (drift > 0) {
    console.error('');
    console.error(`Fix: create the missing path or remove the Project Structure entry.`);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ all ${candidates.length} Project Structure paths exist`);
  process.exitCode = 0;
}

main();
