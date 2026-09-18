import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarise, visit, traceRoute, EMPTY } from '../site/progress.js';

const terms = [
  { slug: 'token', category: 'core', related: ['prompt'] },
  { slug: 'prompt', category: 'core', related: ['token'] },
  { slug: 'commit', category: 'engineering', related: [] },
  { slug: 'branch', category: 'engineering', related: [] },
];

test('an empty progress state reports nothing visited', () => {
  const s = summarise(terms, EMPTY);
  assert.equal(s.visited, 0);
  assert.equal(s.total, 4);
  assert.equal(s.percent, 0);
  assert.equal(s.routes, 0);
});

test('visiting a station counts it once, however many times you return', () => {
  let p = visit(EMPTY, 'token');
  p = visit(p, 'token');
  p = visit(p, 'token');
  assert.equal(summarise(terms, p).visited, 1);
});

test('progress is never punitive — visiting only ever adds', () => {
  const before = summarise(terms, visit(visit(EMPTY, 'token'), 'prompt')).visited;
  const after = summarise(terms, visit(visit(visit(EMPTY, 'token'), 'prompt'), 'commit')).visited;
  assert.ok(after > before);
});

test('reports completion per line, not just overall', () => {
  const p = visit(visit(EMPTY, 'token'), 'prompt');
  const s = summarise(terms, p);
  assert.equal(s.lines.core.visited, 2);
  assert.equal(s.lines.core.total, 2);
  assert.equal(s.lines.core.complete, true);
  assert.equal(s.lines.engineering.complete, false);
});

test('percent rounds down, so 100% means genuinely everything', () => {
  const p = ['token', 'prompt', 'commit'].reduce(visit, EMPTY);
  assert.equal(summarise(terms, p).percent, 75);
  const all = ['token', 'prompt', 'commit', 'branch'].reduce(visit, EMPTY);
  assert.equal(summarise(terms, all).percent, 100);
});

// A "route" is following a See also link from one term to a connected one. It is
// the mechanic that rewards exploring the network rather than reading a list.
test('tracing a route between connected terms counts it', () => {
  const p = traceRoute(EMPTY, 'token', 'prompt');
  assert.equal(summarise(terms, p).routes, 1);
});

test('the same route traced twice counts once, either direction', () => {
  let p = traceRoute(EMPTY, 'token', 'prompt');
  p = traceRoute(p, 'token', 'prompt');
  p = traceRoute(p, 'prompt', 'token');
  assert.equal(summarise(terms, p).routes, 1);
});

test('tracing a route also visits both of its ends', () => {
  const p = traceRoute(EMPTY, 'token', 'prompt');
  const s = summarise(terms, p);
  assert.equal(s.visited, 2);
});

test('summarise ignores stored slugs that no longer exist in the glossary', () => {
  const p = visit(visit(EMPTY, 'token'), 'a-term-we-deleted');
  const s = summarise(terms, p);
  assert.equal(s.visited, 1, 'a removed term must not inflate progress past the total');
  assert.ok(s.percent <= 100);
});

test('state is plain data, so it survives a round trip through storage', () => {
  const p = traceRoute(visit(EMPTY, 'commit'), 'token', 'prompt');
  const revived = JSON.parse(JSON.stringify(p));
  assert.deepEqual(summarise(terms, revived), summarise(terms, p));
});
