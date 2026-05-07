// Helpers for `<!-- deep-suite:auto-generated:<id>:start -->` ... `:end` markers.
// Generator and --check share the same parser to avoid drift.

export const MARKER_PREFIX = 'deep-suite:auto-generated:';

const escapeRe = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

export function startMarker(id) {
  return `<!-- ${MARKER_PREFIX}${id}:start -->`;
}

export function endMarker(id) {
  return `<!-- ${MARKER_PREFIX}${id}:end -->`;
}

// Replaces the content between start/end markers for `id` in `source`.
// `replacement` is a string; trailing/leading whitespace inside the block is
// normalized so byte-for-byte comparison in --check mode is stable.
//
// If the marker pair is missing, returns { ok: false, reason } so the caller
// can fail loudly (CI must distinguish "no markers" from "drift").
export function replaceBlock(source, id, replacement) {
  const start = startMarker(id);
  const end = endMarker(id);
  const re = new RegExp(
    `(${escapeRe(start)})([\\s\\S]*?)(${escapeRe(end)})`,
    'm'
  );
  if (!re.test(source)) {
    return { ok: false, reason: `markers for "${id}" not found` };
  }
  // Normalize: marker on its own line, blank line either side of body, trailing newline inside body.
  const normalized = `\n\n${replacement.replace(/\n+$/, '')}\n\n`;
  const next = source.replace(re, `$1${normalized}$3`);
  return { ok: true, content: next };
}

// Extracts the body between markers (used by --check to compute drift).
export function extractBlock(source, id) {
  const start = startMarker(id);
  const end = endMarker(id);
  const re = new RegExp(
    `${escapeRe(start)}([\\s\\S]*?)${escapeRe(end)}`,
    'm'
  );
  const m = source.match(re);
  if (!m) return { ok: false, reason: `markers for "${id}" not found` };
  return { ok: true, body: m[1] };
}

// Lists every marker id present in `source` (sorted). Useful for sanity:
// generator must cover every marker present in repo docs.
export function listMarkerIds(source) {
  const re = new RegExp(`<!-- ${escapeRe(MARKER_PREFIX)}([a-z][a-z0-9-]*):start -->`, 'g');
  const ids = new Set();
  for (const m of source.matchAll(re)) ids.add(m[1]);
  return [...ids].sort();
}
