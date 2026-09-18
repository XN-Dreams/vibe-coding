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

test('chains only the bays that are actually in the flow', () => {
  const { flows } = build();
  for (const z of plant.filter((x) => x.flow === 'sequence')) {
    const inFlow = z.bays.filter((b) => b.inFlow !== false).length;
    const n = flows.filter((f) => f.kind === 'stage' && f.zone === z.key).length;
    assert.equal(n, inFlow - 1, `${z.key} should chain ${inFlow - 1} stages, not ${n}`);
  }
});

// The contradiction this closes: QC's caption said "not a stage at the end"
// while a MUST PASS arrow pointed into it from the shop floor.
test('nothing flows INTO quality control', () => {
  const { flows, zones } = build();
  const qc = zones.find((z) => z.role === 'qc');
  for (const f of flows.filter((x) => x.kind === 'zone')) {
    assert.ok(
      f.to.y < qc.y,
      'a zone flow terminates in quality control, which makes it a final stage again'
    );
  }
});

test('each quality-control bay sends a gate arrow UP into the zone it governs', () => {
  const { flows, zones } = build();
  const gates = flows.filter((f) => f.kind === 'gate');
  const qc = plant.find((z) => z.role === 'qc');
  assert.equal(gates.length, qc.bays.length, 'every QC bay must gate something');
  for (const g of gates) {
    assert.ok(g.to.y < g.from.y, 'a gate must point upward, into what it governs');
  }
});

test('marks a single entry bay for a newcomer to start from', () => {
  const { entry } = build();
  assert.ok(entry, 'the plant has no entry point');
  assert.equal(entry.title, 'What it is');
  assert.equal(entry.inFlow, false, 'the entry plate is not a stage of the process');
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

// Bounded by the CONTENT box, not the canvas. On a phone the plant is
// deliberately taller than the viewport and panning reveals the rest; the
// invariant that still matters is that nothing falls outside the drawing.
test('keeps everything inside the drawing at several sizes', () => {
  for (const box of [BOX, { width: 380, height: 620 }, { width: 1800, height: 950 }]) {
    const { stops, zones, content } = layoutPlant(plant, glossary, box);
    for (const s of stops) {
      assert.ok(s.x >= 0 && s.x <= content.width, `${s.slug} x=${s.x} outside 0..${content.width}`);
      assert.ok(s.y >= 0 && s.y <= content.height, `${s.slug} y=${s.y} outside 0..${content.height}`);
    }
    for (const z of zones) {
      assert.ok(z.x >= 0 && z.x + z.w <= content.width + 0.5, `${z.key} escapes horizontally at ${box.width}px`);
      assert.ok(z.y >= 0 && z.y + z.h <= content.height + 0.5, `${z.key} escapes vertically at ${box.width}px`);
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

// At 380px the shop floor's five bays came out 48px wide each, which is not a
// diagram. Bays wrap onto more rows instead, and the plant grows taller than
// the canvas so panning reveals it.
test('never squeezes a bay below a readable width', () => {
  for (const box of [{ width: 1200, height: 800 }, { width: 860, height: 640 }, { width: 380, height: 620 }]) {
    const { bays } = layoutPlant(plant, glossary, box);
    const narrowest = Math.min(...bays.map((b) => b.w));
    assert.ok(narrowest > 100, `bays shrink to ${narrowest.toFixed(0)}px at ${box.width}px wide`);
  }
});

test('grows the drawing taller than the canvas rather than compressing it', () => {
  const phone = layoutPlant(plant, glossary, { width: 380, height: 620 });
  assert.ok(phone.content.height > 620, 'the phone layout did not grow to fit its content');
  const desktop = layoutPlant(plant, glossary, { width: 1200, height: 800 });
  assert.equal(desktop.content.height, 800, 'a desktop layout should fit exactly, not scroll');
});

test('still keeps every bay inside its zone after wrapping', () => {
  const { zones, bays } = layoutPlant(plant, glossary, { width: 380, height: 620 });
  const byKey = Object.fromEntries(zones.map((z) => [z.key, z]));
  for (const b of bays) {
    const z = byKey[b.zone];
    assert.ok(b.x >= z.x - 0.5 && b.x + b.w <= z.x + z.w + 0.5, `"${b.title}" escapes horizontally when wrapped`);
    assert.ok(b.y >= z.y - 0.5 && b.y + b.h <= z.y + z.h + 1, `"${b.title}" escapes vertically when wrapped`);
  }
});
