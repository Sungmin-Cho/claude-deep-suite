import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  startMarker,
  endMarker,
  replaceBlock,
  extractBlock,
  listMarkerIds,
} from '../scripts/lib/markers.js';

test('startMarker / endMarker compose deterministically', () => {
  assert.equal(startMarker('foo'), '<!-- deep-suite:auto-generated:foo:start -->');
  assert.equal(endMarker('foo'), '<!-- deep-suite:auto-generated:foo:end -->');
});

test('replaceBlock fills empty markers with normalized whitespace', () => {
  const src = `pre\n${startMarker('x')}\n${endMarker('x')}\npost`;
  const r = replaceBlock(src, 'x', 'BODY');
  assert.equal(r.ok, true);
  assert.match(r.content, /<!-- deep-suite:auto-generated:x:start -->\n\nBODY\n\n<!-- deep-suite:auto-generated:x:end -->/);
});

test('replaceBlock preserves content outside markers byte-for-byte', () => {
  const src = `head\n\n${startMarker('y')}\nold\n${endMarker('y')}\n\ntail`;
  const r = replaceBlock(src, 'y', 'new');
  assert.equal(r.ok, true);
  assert.ok(r.content.startsWith('head\n\n'));
  assert.ok(r.content.endsWith('\n\ntail'));
});

test('replaceBlock fails when markers absent', () => {
  const r = replaceBlock('no markers here', 'missing', 'x');
  assert.equal(r.ok, false);
  assert.match(r.reason, /not found/);
});

test('extractBlock returns body between markers', () => {
  const src = `${startMarker('a')}\nhello\n${endMarker('a')}`;
  const r = extractBlock(src, 'a');
  assert.equal(r.ok, true);
  assert.equal(r.body.trim(), 'hello');
});

test('listMarkerIds returns sorted unique ids', () => {
  const src = `${startMarker('z')}${endMarker('z')}\n${startMarker('a')}${endMarker('a')}\n${startMarker('z')}${endMarker('z')}`;
  assert.deepEqual(listMarkerIds(src), ['a', 'z']);
});
