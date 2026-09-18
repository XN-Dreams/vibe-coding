import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateLines, orderedStops, sectionOf } from '../scripts/lib/lines.mjs';

const glossary = JSON.parse(await readFile(new URL('../data/glossary.json', import.meta.url), 'utf8'));
const lines = JSON.parse(await readFile(new URL('../data/lines.json', import.meta.url), 'utf8'));

const tiny = [
  {
    key: 'core',
    name: 'Start here',
    tagline: 'x',
    sections: [
      { title: 'A', stops: ['a'] },
      { title: 'B', stops: ['b'] },
    ],
  },
];
const tinyGlossary = [
  { slug: 'a', term: 'A', category: 'core' },
  { slug: 'b', term: 'B', category: 'core' },
];

test('the real lines are valid against the real glossary', () => {
  const r = validateLines(lines, glossary);
  assert.equal(r.ok, true, r.errors.join('\n'));
});

// The silent failure this exists to stop: a term added to the glossary but
// never routed onto a line just vanishes from the map, with nothing to notice.
test('rejects a glossary term that no line carries', () => {
  const orphaned = [...tinyGlossary, { slug: 'c', term: 'C', category: 'core' }];
  const r = validateLines(tiny, orphaned);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /c.*no line|not on any line/i);
});

test('rejects a stop that is not a real glossary term', () => {
  const bad = [{ ...tiny[0], sections: [{ title: 'A', stops: ['a', 'ghost'] }] }];
  const r = validateLines(bad, tinyGlossary);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /ghost/);
});

test('rejects the same term appearing twice', () => {
  const dupe = [
    { ...tiny[0], sections: [{ title: 'A', stops: ['a', 'b'] }, { title: 'B', stops: ['b'] }] },
  ];
  const r = validateLines(dupe, tinyGlossary);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /twice|duplicate/i);
});

test('rejects a stop whose category does not match its line', () => {
  const mismatched = [{ ...tiny[0], sections: [{ title: 'A', stops: ['a', 'b'] }] }];
  const g = [tinyGlossary[0], { slug: 'b', term: 'B', category: 'discipline' }];
  const r = validateLines(mismatched, g);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /category/i);
});

test('rejects an empty section', () => {
  const empty = [{ ...tiny[0], sections: [{ title: 'A', stops: ['a', 'b'] }, { title: 'Empty', stops: [] }] }];
  const r = validateLines(empty, tinyGlossary);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /empty|no stops/i);
});

test('rejects a line missing its name or tagline', () => {
  const { tagline, ...noTag } = tiny[0];
  const r = validateLines([noTag], tinyGlossary);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /tagline/i);
});

test('reports every problem, not just the first', () => {
  const bad = [{ key: 'core', name: 'x', tagline: 'y', sections: [{ title: 'A', stops: ['ghost1', 'ghost2'] }] }];
  const r = validateLines(bad, tinyGlossary);
  assert.ok(r.errors.length >= 3, `expected several errors, got ${r.errors.length}`);
});

// --- ordering ---

test('flattens a line to its stops in narrative order', () => {
  assert.deepEqual(orderedStops(tiny[0]), ['a', 'b']);
});

test('the start-here line opens on vibe coding', () => {
  const start = lines.find((l) => l.key === 'core');
  assert.equal(orderedStops(start)[0], 'vibe-coding');
});

test('every real line has at least two sections, so it reads as a journey', () => {
  for (const l of lines) {
    assert.ok(l.sections.length >= 2, `${l.key} has only ${l.sections.length} section(s)`);
  }
});

test('the four lines together carry all 65 terms exactly once', () => {
  const all = lines.flatMap(orderedStops);
  assert.equal(all.length, glossary.length);
  assert.equal(new Set(all).size, glossary.length);
});

test('sectionOf names the section a stop belongs to', () => {
  assert.equal(sectionOf(tiny[0], 'b'), 'B');
  assert.equal(sectionOf(tiny[0], 'nope'), null);
});
