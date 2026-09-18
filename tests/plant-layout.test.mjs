import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { layoutPlant } from '../site/plant-layout.js';

const glossary = JSON.parse(await readFile(new URL('../data/glossary.json', import.meta.url), 'utf8'));
const plant = JSON.parse(await readFile(new URL('../data/plant.json', import.meta.url), 'utf8'));

const BOX = { width: 1200, height: 800 };
const build = (box = BOX) => layoutPlant(plant, glossary, box);

test('places every glossary term exactly once', () => {
  const { stops } = build();
  assert.equal(stops.length, glossary.length);
  assert.equal(new Set(stops.map((s) => s.slug)).size, glossary.length);
});

test('is deterministic', () => {
  assert.deepEqual(build().stops, build().stops);
});

// THE test for this rework. Drawing a stage arrow inside a parallel zone is
// exactly the lie the transit map told: it asserts that eighteen unrelated
// controls are a sequence you walk through.
test('draws stage arrows only inside zones that declare a sequence', () => {
  const { flows } = build();
  const sequential = new Set(plant.filter((z) => z.flow === 'sequence').map((z) => z.key));
  const parallel = new Set(plant.filter((z) => z.flow === 'parallel').map((z) => z.key));

  const stageFlows = flows.filter((f) => f.kind === 'stage');
  assert.ok(stageFlows.length > 0, 'no stage arrows at all — the sequential zones lost their flow');

  for (const f of stageFlows) {
    assert.ok(sequential.has(f.zone), `a stage arrow was drawn inside "${f.zone}", which is not a sequence`);
    assert.ok(!parallel.has(f.zone), `"${f.zone}" is parallel but got an arrow`);
  }
});

test('gives each sequential zone one arrow fewer than it has bays', () => {
  const { flows } = build();
  for (const z of plant.filter((x) => x.flow === 'sequence')) {
    const n = flows.filter((f) => f.kind === 'stage' && f.zone === z.key).length;
    assert.equal(n, z.bays.length - 1, `${z.key} should chain ${z.bays.length - 1} stages`);
  }
});

test('keeps the four zones stacked without overlapping', () => {
  const { zones } = build();
  assert.equal(zones.length, plant.length);
  const sorted = [...zones].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) {
    assert.ok(sorted[i].y >= sorted[i - 1].y + sorted[i - 1].h, `${sorted[i].key} overlaps ${sorted[i - 1].key}`);
  }
});

test('puts the control room above the machine, and quality control across the bottom', () => {
  const { zones } = build();
  const at = (role) => zones.find((z) => z.role === role);
  assert.ok(at('control').y < at('machine').y, 'the control room should sit above the machine');
  assert.ok(at('machine').y < at('floor').y, 'the machine should feed the shop floor');
  assert.ok(at('qc').y > at('floor').y, 'quality control belongs under the whole plant');
});

test('keeps every bay inside its own zone', () => {
  const { zones, bays } = build();
  const byKey = Object.fromEntries(zones.map((z) => [z.key, z]));
  for (const b of bays) {
    const z = byKey[b.zone];
    assert.ok(b.x >= z.x - 0.5 && b.x + b.w <= z.x + z.w + 0.5, `bay "${b.title}" escapes its zone horizontally`);
    assert.ok(b.y >= z.y - 0.5 && b.y + b.h <= z.y + z.h + 0.5, `bay "${b.title}" escapes its zone vertically`);
  }
});

test('keeps every stop inside its own bay', () => {
  const { bays, stops } = build();
  const byBay = new Map(bays.map((b) => [`${b.zone}~${b.title}`, b]));
  for (const s of stops) {
    const b = byBay.get(`${s.zone}~${s.bay}`);
    assert.ok(b, `stop ${s.slug} has no bay`);
    assert.ok(s.x >= b.x && s.x <= b.x + b.w, `${s.slug} sits outside bay "${b.title}"`);
    assert.ok(s.y >= b.y && s.y <= b.y + b.h, `${s.slug} sits outside bay "${b.title}"`);
  }
});

test('keeps everything inside the canvas at several sizes', () => {
  for (const box of [BOX, { width: 380, height: 620 }, { width: 1800, height: 950 }]) {
    const { stops, zones } = layoutPlant(plant, glossary, box);
    for (const s of stops) {
      assert.ok(s.x >= 0 && s.x <= box.width, `${s.slug} x=${s.x} outside 0..${box.width}`);
      assert.ok(s.y >= 0 && s.y <= box.height, `${s.slug} y=${s.y} outside 0..${box.height}`);
    }
    for (const z of zones) {
      assert.ok(z.x >= 0 && z.x + z.w <= box.width + 0.5, `${z.key} escapes horizontally at ${box.width}px`);
      assert.ok(z.y >= 0 && z.y + z.h <= box.height + 0.5, `${z.key} escapes vertically at ${box.height}px`);
    }
  }
});

test('never emits a non-finite coordinate', () => {
  const { stops, bays, zones, flows } = build();
  for (const o of [...stops, ...bays, ...zones]) {
    assert.ok(Number.isFinite(o.x) && Number.isFinite(o.y), 'a shape has a bad coordinate');
  }
  for (const f of flows) {
    assert.ok(Number.isFinite(f.from.x) && Number.isFinite(f.to.y), 'a flow has a bad coordinate');
  }
});

test('chains the zones themselves: control feeds the machine feeds the floor', () => {
  const { flows } = build();
  const zoneFlows = flows.filter((f) => f.kind === 'zone');
  assert.ok(zoneFlows.length >= 3, `expected the plant spine, got ${zoneFlows.length} zone flows`);
  for (const f of zoneFlows) assert.ok(f.label, 'a zone flow carries no label');
});

test('routes the cross-zone links as conduits', () => {
  const { conduits } = build();
  assert.equal(conduits.length, 23);
  for (const c of conduits) assert.notEqual(c.a.zone, c.b.zone, 'a conduit must join two different zones');
});

test('gives a wider bay to a bay with more stops', () => {
  const { bays } = build();
  const floor = bays.filter((b) => b.zone === 'engineering');
  const six = floor.find((b) => b.title === 'Making it run');
  const four = floor.find((b) => b.title === 'Where you type');
  assert.ok(six.w > four.w, 'a six-stop bay should be wider than a four-stop bay');
});

test('scales with the canvas', () => {
  const small = layoutPlant(plant, glossary, { width: 600, height: 700 });
  const large = layoutPlant(plant, glossary, { width: 1800, height: 950 });
  const w = (r) => r.zones.find((z) => z.role === 'floor').w;
  assert.ok(w(large) > w(small) * 1.5);
});
