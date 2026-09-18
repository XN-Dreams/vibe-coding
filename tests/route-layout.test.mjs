import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { layoutRoutes } from '../site/route-layout.js';

const glossary = JSON.parse(await readFile(new URL('../data/glossary.json', import.meta.url), 'utf8'));
const lines = JSON.parse(await readFile(new URL('../data/lines.json', import.meta.url), 'utf8'));

const BOX = { width: 1200, height: 760 };
const build = (box = BOX) => layoutRoutes(lines, glossary, box);

test('places every glossary term exactly once', () => {
  const { stations } = build();
  assert.equal(stations.length, glossary.length);
  assert.equal(new Set(stations.map((s) => s.slug)).size, glossary.length);
});

test('is deterministic — the same map every time', () => {
  assert.deepEqual(build().stations, build().stations);
});

// The whole point of the rework. In a force layout a station's position meant
// nothing; here, further along the line must mean further through the material.
test('lays each line out in narrative order, left to right', () => {
  const { stations } = build();
  for (const line of lines) {
    const onLine = stations.filter((s) => s.line === line.key).sort((a, b) => a.index - b.index);
    for (let i = 1; i < onLine.length; i++) {
      assert.ok(
        onLine[i].x > onLine[i - 1].x,
        `${line.key}: ${onLine[i].slug} (#${onLine[i].index}) is left of ${onLine[i - 1].slug}`
      );
    }
  }
});

test('gives every station its line, its index and its section', () => {
  const { stations } = build();
  const first = stations.find((s) => s.slug === 'vibe-coding');
  assert.equal(first.line, 'core');
  assert.equal(first.index, 0);
  assert.equal(first.section, 'The machine');
});

test('returns a single shared origin for the whole network', () => {
  const { origin } = build();
  assert.ok(Number.isFinite(origin.x) && Number.isFinite(origin.y));
  assert.ok(origin.x < BOX.width * 0.15, 'the origin should sit at the left, where reading starts');
});

test('every line begins near the shared origin and ends near the right edge', () => {
  const { stations, origin } = build();
  for (const line of lines) {
    const onLine = stations.filter((s) => s.line === line.key).sort((a, b) => a.index - b.index);
    const first = onLine[0];
    const last = onLine[onLine.length - 1];
    assert.ok(first.x - origin.x < BOX.width * 0.3, `${line.key} does not start near the origin`);
    assert.ok(last.x > BOX.width * 0.8, `${line.key} does not reach the right edge`);
  }
});

test('keeps the four lines in separate horizontal bands', () => {
  const { stations } = build();
  const mid = (key) => {
    const ys = stations.filter((s) => s.line === key && s.x > BOX.width * 0.3).map((s) => s.y);
    return ys.reduce((a, b) => a + b, 0) / ys.length;
  };
  const bands = lines.map((l) => mid(l.key)).sort((a, b) => a - b);
  for (let i = 1; i < bands.length; i++) {
    assert.ok(bands[i] - bands[i - 1] > BOX.height * 0.12, `bands ${i - 1} and ${i} overlap`);
  }
});

test('keeps every station inside the box', () => {
  for (const box of [BOX, { width: 380, height: 560 }, { width: 1800, height: 900 }]) {
    const { stations } = layoutRoutes(lines, glossary, box);
    for (const s of stations) {
      assert.ok(s.x >= 0 && s.x <= box.width, `${s.slug} x=${s.x} outside 0..${box.width}`);
      assert.ok(s.y >= 0 && s.y <= box.height, `${s.slug} y=${s.y} outside 0..${box.height}`);
    }
  }
});

test('never emits a non-finite coordinate', () => {
  const { stations } = build();
  for (const s of stations) {
    assert.ok(Number.isFinite(s.x) && Number.isFinite(s.y), `${s.slug} has a bad coordinate`);
  }
});

test('describes each section with a span along its line', () => {
  const { sections } = build();
  const total = lines.reduce((n, l) => n + l.sections.length, 0);
  assert.equal(sections.length, total);
  for (const s of sections) {
    assert.ok(s.title && s.line, 'a section is missing its title or line');
    assert.ok(s.to.x >= s.from.x, `${s.title}: span runs backwards`);
    assert.ok(Number.isFinite(s.label.x) && Number.isFinite(s.label.y));
  }
});

test('marks the cross-line links as interchanges', () => {
  const { interchanges } = build();
  // 23 unique pairs cross a line boundary. Counting these with a `a < b`
  // filter gives 7 and is wrong: it drops every link declared only from the
  // alphabetically-later side.
  assert.equal(interchanges.length, 23);
  for (const i of interchanges) {
    assert.notEqual(i.a.line, i.b.line, 'an interchange must join two different lines');
  }
});

test('returns the route polyline each line is drawn along', () => {
  const { routes } = build();
  assert.equal(routes.length, lines.length);
  for (const r of routes) {
    assert.ok(r.points.length >= 4, `${r.key} route has too few points to curve`);
    for (const p of r.points) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  }
});

test('spaces stations further apart on a wider canvas', () => {
  const gap = (box) => {
    const { stations } = layoutRoutes(lines, glossary, box);
    const onLine = stations.filter((s) => s.line === 'engineering').sort((a, b) => a.index - b.index);
    return onLine[1].x - onLine[0].x;
  };
  assert.ok(gap({ width: 1800, height: 900 }) > gap({ width: 600, height: 560 }) * 1.5);
});
