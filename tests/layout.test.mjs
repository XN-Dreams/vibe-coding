import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutNetwork } from '../site/layout.js';

const terms = [
  { slug: 'a', term: 'A', category: 'core', related: ['b', 'c'] },
  { slug: 'b', term: 'B', category: 'core', related: ['a'] },
  { slug: 'c', term: 'C', category: 'engineering', related: ['a', 'd'] },
  { slug: 'd', term: 'D', category: 'engineering', related: ['c'] },
  { slug: 'e', term: 'E', category: 'discipline', related: [] },
];

const BOX = { width: 800, height: 600 };

// The load-bearing property. A map you have to re-learn on every visit is not a
// map. Without a seeded generator this passes by luck and fails in production.
test('the same input always produces the same layout', () => {
  const a = layoutNetwork(terms, BOX);
  const b = layoutNetwork(terms, BOX);
  assert.deepEqual(a.nodes, b.nodes);
});

// Needs a graph big enough to have more than one stable arrangement. With five
// nodes and four category anchors the simulation converges to the same answer
// from any starting point, which is correct behaviour and proves nothing.
test('a different seed produces a different layout', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({
    slug: `t${i}`,
    term: `T${i}`,
    category: ['core', 'claude-code', 'engineering', 'discipline'][i % 4],
    related: i > 3 ? [`t${i - 4}`] : [],
  }));
  const a = layoutNetwork(many, BOX, { seed: 1 });
  const b = layoutNetwork(many, BOX, { seed: 99 });
  assert.notDeepEqual(a.nodes, b.nodes);
});

test('places every term exactly once', () => {
  const { nodes } = layoutNetwork(terms, BOX);
  assert.equal(nodes.length, terms.length);
  assert.equal(new Set(nodes.map((n) => n.slug)).size, terms.length);
});

test('keeps every node inside the box, allowing for its own radius', () => {
  const { nodes } = layoutNetwork(terms, BOX);
  for (const n of nodes) {
    assert.ok(n.x >= 0 && n.x <= BOX.width, `${n.slug} x=${n.x} outside 0..${BOX.width}`);
    assert.ok(n.y >= 0 && n.y <= BOX.height, `${n.slug} y=${n.y} outside 0..${BOX.height}`);
  }
});

test('produces one edge per connection, without duplicating the reverse', () => {
  const { edges } = layoutNetwork(terms, BOX);
  // a-b, a-c, c-d  — a<->b and a<->c are each declared from both sides
  assert.equal(edges.length, 3);
});

test('drops an edge pointing at a term that does not exist', () => {
  const broken = [{ slug: 'x', term: 'X', category: 'core', related: ['nowhere'] }];
  const { edges } = layoutNetwork(broken, BOX);
  assert.deepEqual(edges, []);
});

test('gives every node a degree, so hubs can be drawn larger', () => {
  const { nodes } = layoutNetwork(terms, BOX);
  const byslug = Object.fromEntries(nodes.map((n) => [n.slug, n]));
  assert.equal(byslug.a.degree, 2);
  assert.equal(byslug.e.degree, 0);
});

test('separates nodes rather than stacking them on one point', () => {
  const { nodes } = layoutNetwork(terms, BOX);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      assert.ok(Math.hypot(dx, dy) > 8, `${nodes[i].slug} and ${nodes[j].slug} overlap`);
    }
  }
});

test('scales to a phone-sized box without pushing nodes out', () => {
  const small = { width: 360, height: 520 };
  const { nodes } = layoutNetwork(terms, small);
  for (const n of nodes) {
    assert.ok(n.x >= 0 && n.x <= small.width);
    assert.ok(n.y >= 0 && n.y <= small.height);
  }
});

test('handles an empty glossary without throwing', () => {
  const { nodes, edges } = layoutNetwork([], BOX);
  assert.deepEqual(nodes, []);
  assert.deepEqual(edges, []);
});

test('never emits a NaN coordinate', () => {
  const { nodes } = layoutNetwork(terms, BOX);
  for (const n of nodes) {
    assert.ok(Number.isFinite(n.x), `${n.slug} x is not finite`);
    assert.ok(Number.isFinite(n.y), `${n.slug} y is not finite`);
  }
});

// Regression: separate() used to run BEFORE fitToBox(), which rescaled the
// layout and silently undid the spacing it had just guaranteed. With only a
// handful of nodes the scale expands, so the bug was invisible — it needs
// enough nodes that the fit has to COMPRESS.
test('holds minimum separation even when the fit has to compress', () => {
  const many = Array.from({ length: 65 }, (_, i) => ({
    slug: `t${i}`,
    term: `T${i}`,
    category: ['core', 'claude-code', 'engineering', 'discipline'][i % 4],
    related: i > 0 ? [`t${i - 1}`] : [],
  }));
  const { nodes } = layoutNetwork(many, { width: 900, height: 640 });
  let closest = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      closest = Math.min(closest, Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y));
    }
  }
  assert.ok(closest > 14, `stations only ${closest.toFixed(1)}px apart — they will overlap`);
});

// Four coloured lines that all sit on the same centroid are not four lines.
test('keeps each category coherent rather than blending them together', () => {
  const many = Array.from({ length: 48 }, (_, i) => ({
    slug: `t${i}`,
    term: `T${i}`,
    category: ['core', 'claude-code', 'engineering', 'discipline'][i % 4],
    related: [],
  }));
  const { nodes } = layoutNetwork(many, { width: 900, height: 640 });

  const centroid = (cat) => {
    const ns = nodes.filter((n) => n.category === cat);
    return [ns.reduce((a, n) => a + n.x, 0) / ns.length, ns.reduce((a, n) => a + n.y, 0) / ns.length];
  };
  const cs = ['core', 'claude-code', 'engineering', 'discipline'].map(centroid);

  let closestPair = Infinity;
  for (let i = 0; i < cs.length; i++) {
    for (let j = i + 1; j < cs.length; j++) {
      closestPair = Math.min(closestPair, Math.hypot(cs[i][0] - cs[j][0], cs[i][1] - cs[j][1]));
    }
  }
  assert.ok(closestPair > 90, `category centroids only ${closestPair.toFixed(0)}px apart — the lines blend`);
});
