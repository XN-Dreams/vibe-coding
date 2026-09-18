import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validatePlant, allStops, bayOf, isSequential } from '../scripts/lib/plant.mjs';

const glossary = JSON.parse(await readFile(new URL('../data/glossary.json', import.meta.url), 'utf8'));
const plant = JSON.parse(await readFile(new URL('../data/plant.json', import.meta.url), 'utf8'));

const tinyGlossary = [
  { slug: 'a', term: 'A', category: 'core' },
  { slug: 'b', term: 'B', category: 'core' },
];
const tiny = [
  {
    key: 'core', zone: 'The machine', role: 'machine', flow: 'sequence', tagline: 'x',
    bays: [{ title: 'A', stops: ['a'] }, { title: 'B', stops: ['b'] }],
  },
];

test('the real plant is valid against the real glossary', () => {
  const r = validatePlant(plant, glossary);
  assert.equal(r.ok, true, r.errors.join('\n'));
});

test('the four zones carry all 65 terms exactly once', () => {
  const all = plant.flatMap(allStops);
  assert.equal(all.length, glossary.length);
  assert.equal(new Set(all).size, glossary.length);
});

test('rejects a glossary term that no zone places', () => {
  const r = validatePlant(tiny, [...tinyGlossary, { slug: 'c', term: 'C', category: 'core' }]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /vanish|no zone/i);
});

test('rejects a stop that is not a glossary term', () => {
  const bad = [{ ...tiny[0], bays: [{ title: 'A', stops: ['a', 'b', 'ghost'] }] }];
  assert.match(validatePlant(bad, tinyGlossary).errors[0], /ghost/);
});

test('rejects the same term placed twice', () => {
  const dupe = [{ ...tiny[0], bays: [{ title: 'A', stops: ['a', 'b'] }, { title: 'B', stops: ['b'] }] }];
  assert.match(validatePlant(dupe, tinyGlossary).errors[0], /twice/i);
});

test('rejects an empty bay', () => {
  const empty = [{ ...tiny[0], bays: [{ title: 'A', stops: ['a', 'b'] }, { title: 'E', stops: [] }] }];
  assert.match(validatePlant(empty, tinyGlossary).errors[0], /no stops/i);
});

test('rejects an unknown role', () => {
  const bad = [{ ...tiny[0], role: 'canteen' }];
  assert.match(validatePlant(bad, tinyGlossary).errors[0], /role/i);
});

test('rejects two zones claiming the same role', () => {
  const g = [...tinyGlossary, { slug: 'c', term: 'C', category: 'discipline' }];
  const dup = [tiny[0], { key: 'discipline', zone: 'QC', role: 'machine', flow: 'parallel', tagline: 'x', bays: [{ title: 'C', stops: ['c'] }] }];
  assert.match(validatePlant(dup, g).errors[0], /already taken/i);
});

// The field that exists specifically to stop the drawing over-claiming order.
test('rejects a flow value that is neither sequence nor parallel', () => {
  const bad = [{ ...tiny[0], flow: 'sort-of' }];
  assert.match(validatePlant(bad, tinyGlossary).errors[0], /flow/i);
});

test('every real zone declares whether its bays are ordered', () => {
  for (const z of plant) {
    assert.ok(['sequence', 'parallel'].includes(z.flow), `${z.key} does not declare its flow`);
  }
});

// The critique that caused this rework: the control room and QC are NOT
// sequences, and nothing should draw them as one.
test('the control room and quality control are explicitly not sequences', () => {
  assert.equal(isSequential(plant.find((z) => z.role === 'control')), false);
  assert.equal(isSequential(plant.find((z) => z.role === 'qc')), false);
});

test('the machine and the shop floor are sequences', () => {
  assert.equal(isSequential(plant.find((z) => z.role === 'machine')), true);
  assert.equal(isSequential(plant.find((z) => z.role === 'floor')), true);
});

test('bayOf names the bay a stop sits in', () => {
  assert.equal(bayOf(tiny[0], 'b'), 'B');
  assert.equal(bayOf(tiny[0], 'nope'), null);
});

test('reports every problem, not just the first', () => {
  const bad = [{ key: 'core', zone: 'z', role: 'machine', flow: 'sequence', tagline: 't', bays: [{ title: 'A', stops: ['g1', 'g2'] }] }];
  assert.ok(validatePlant(bad, tinyGlossary).errors.length >= 3);
});

// --- narrative honesty (the challenge pass) ---

// The contradiction this closes: QC's own tagline said "not a stage at the end"
// while it was drawn as a plate at the bottom with a MUST PASS arrow into it.
test('every quality-control bay names the zone it gates', () => {
  const qc = plant.find((z) => z.role === 'qc');
  for (const bay of qc.bays) {
    assert.ok(bay.gates, `QC bay "${bay.title}" gates nothing — it would render as a terminal stage`);
    assert.ok(
      plant.some((z) => z.role === bay.gates),
      `QC bay "${bay.title}" gates "${bay.gates}", which is not a zone`
    );
  }
});

test('quality control never gates itself', () => {
  const qc = plant.find((z) => z.role === 'qc');
  for (const bay of qc.bays) assert.notEqual(bay.gates, 'qc');
});

// A definition is not a stage of a process. "What it is" had a flow arrow into
// "What goes in", which claimed that definitions flow into inputs.
test('a bay marked inFlow:false is excluded from its sequence', () => {
  const machine = plant.find((z) => z.role === 'machine');
  assert.equal(machine.bays[0].inFlow, false, 'the identity bay must not sit in the flow');
  assert.ok(machine.bays.slice(1).every((b) => b.inFlow !== false), 'the actual stages must stay in flow');
});

test('exactly one bay in the whole plant is the entry point', () => {
  const entries = plant.flatMap((z) => z.bays.filter((b) => b.entry).map((b) => `${z.role}/${b.title}`));
  assert.equal(entries.length, 1, `expected one entry point, found ${entries.length}: ${entries.join(', ')}`);
});

test('the entry point sits in a zone a newcomer can actually start from', () => {
  const zone = plant.find((z) => z.bays.some((b) => b.entry));
  assert.equal(zone.role, 'machine', 'a beginner starts by learning what the thing is');
});
