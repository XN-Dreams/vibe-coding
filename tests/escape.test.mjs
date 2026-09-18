import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, safeUrl } from '../site/escape.js';

test('escapes the characters that break out of HTML', () => {
  assert.equal(esc('<script>'), '&lt;script&gt;');
  assert.equal(esc('a & b'), 'a &amp; b');
});

// The attribute case: without escaping quotes, a value can close the attribute
// and add its own, e.g. title=" onmouseover=alert(1) x="
test('escapes both quote styles, so it is safe inside an attribute', () => {
  assert.equal(esc('" onmouseover="x'), '&quot; onmouseover=&quot;x');
  assert.equal(esc("' onload='x"), '&#39; onload=&#39;x');
});

test('coerces non-strings rather than throwing', () => {
  assert.equal(esc(3), '3');
  assert.equal(esc(null), 'null');
});

test('leaves ordinary text alone', () => {
  assert.equal(esc('Context window'), 'Context window');
});

test('allows http and https URLs through unchanged', () => {
  assert.equal(safeUrl('https://example.com/a?b=1'), 'https://example.com/a?b=1');
  assert.equal(safeUrl('http://example.com'), 'http://example.com');
});

test('allows relative links', () => {
  assert.equal(safeUrl('/docs/glossary.md'), '/docs/glossary.md');
  assert.equal(safeUrl('#schedule'), '#schedule');
  assert.equal(safeUrl('./app.js'), './app.js');
});

// The hole escaping alone does NOT close: this is well-formed HTML that runs
// code on click, and esc() passes it through untouched.
test('neutralises a javascript: URL', () => {
  assert.equal(safeUrl('javascript:alert(1)'), '#');
});

test('neutralises scheme variants that try to dodge a naive check', () => {
  for (const bad of ['JavaScript:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)']) {
    assert.equal(safeUrl(bad), '#', `expected "${bad}" to be neutralised`);
  }
});

test('neutralises anything that does not parse as a URL', () => {
  assert.equal(safeUrl('not a url at all'), '#');
  assert.equal(safeUrl(''), '#');
});
