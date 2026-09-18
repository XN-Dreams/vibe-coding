import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/**
 * Headless smoke test for the network map.
 *
 * There is no browser here, so the DOM is stubbed to the exact surface map.js
 * touches and the canvas context records every call. That is enough to catch
 * the failures that actually happen — a mistyped context method, a NaN
 * coordinate, an exception on open — without pretending it replaces looking at
 * the thing. It does not check that the map is legible. A person does that.
 */

const terms = JSON.parse(await readFile(new URL('../data/glossary.json', import.meta.url), 'utf8'));

function stubElement() {
  const el = {
    innerHTML: '',
    hidden: true,
    style: {},
    dataset: {},
    listeners: {},
    addEventListener(type, fn) {
      (this.listeners[type] ??= []).push(fn);
    },
    setPointerCapture() {},
    getBoundingClientRect: () => ({ width: 1000, height: 700, left: 0, top: 0 }),
    closest: () => null,
    querySelector: () => null,
  };
  return el;
}

function stubCanvas(calls) {
  const el = stubElement();
  el.width = 0;
  el.height = 0;
  el.getContext = () =>
    new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'canvas') return el;
          return (...args) => {
            calls.push({ fn: String(prop), args });
            for (const a of args) {
              if (typeof a === 'number') {
                assert.ok(Number.isFinite(a), `ctx.${String(prop)} received a non-finite value: ${a}`);
              }
            }
          };
        },
        set() {
          return true;
        },
      }
    );
  return el;
}

function install(calls) {
  const nodes = {
    netcanvas: stubCanvas(calls),
    netpanel: stubElement(),
    nethud: stubElement(),
    netstops: stubElement(),
  };
  const store = new Map();

  globalThis.document = { getElementById: (id) => nodes[id] ?? stubElement() };
  globalThis.window = {
    devicePixelRatio: 2,
    matchMedia: () => ({ matches: true }), // reduced motion: settle instantly
    addEventListener() {},
  };
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
  };
  globalThis.requestAnimationFrame = () => 0;
  return nodes;
}

test('builds the whole network without throwing, and draws it', async () => {
  const calls = [];
  const nodes = install(calls);
  const { createMap } = await import('../site/map.js');

  const map = createMap({
    canvas: nodes.netcanvas,
    panel: nodes.netpanel,
    hud: nodes.nethud,
    stops: nodes.netstops,
    terms,
  });

  assert.ok(map, 'createMap returned nothing');

  const arcs = calls.filter((c) => c.fn === 'arc').length;
  assert.ok(arcs >= terms.length, `expected at least ${terms.length} station circles, drew ${arcs}`);
  assert.ok(calls.some((c) => c.fn === 'stroke'), 'no track was stroked');
  assert.ok(calls.some((c) => c.fn === 'fillText'), 'no station was labelled');
});

test('gives every station a focusable, labelled control', async () => {
  const calls = [];
  const nodes = install(calls);
  const { createMap } = await import('../site/map.js');
  createMap({ canvas: nodes.netcanvas, panel: nodes.netpanel, hud: nodes.nethud, stops: nodes.netstops, terms });

  const buttons = nodes.netstops.innerHTML.match(/class="stop"/g) ?? [];
  assert.equal(buttons.length, terms.length, 'a station is unreachable by keyboard');
  assert.ok(/aria-label="/.test(nodes.netstops.innerHTML), 'stops carry no accessible name');
  assert.ok(/interchange/.test(nodes.netstops.innerHTML), 'interchanges are not announced');
});

test('opening a station records progress and renders its entry', async () => {
  const calls = [];
  const nodes = install(calls);
  const { createMap } = await import('../site/map.js');
  const map = createMap({ canvas: nodes.netcanvas, panel: nodes.netpanel, hud: nodes.nethud, stops: nodes.netstops, terms });

  map.open('context-window');

  assert.equal(nodes.netpanel.hidden, false, 'the panel stayed hidden');
  assert.ok(/Context window/.test(nodes.netpanel.innerHTML), 'the term is not in the panel');
  assert.ok(/Why it matters/.test(nodes.netpanel.innerHTML), 'the why line is missing');
  assert.ok(/1<\/strong> of 65/.test(nodes.nethud.innerHTML), `progress not counted: ${nodes.nethud.innerHTML.slice(0, 120)}`);
});

test('tracing a route counts the route and both of its stations', async () => {
  const calls = [];
  const nodes = install(calls);
  const { createMap } = await import('../site/map.js');
  const map = createMap({ canvas: nodes.netcanvas, panel: nodes.netpanel, hud: nodes.nethud, stops: nodes.netstops, terms });

  map.open('context-window');
  map.open('token', 'context-window');

  assert.ok(/2<\/strong> of 65/.test(nodes.nethud.innerHTML), 'both stations were not counted');
  assert.ok(/<strong>1<\/strong> routes/.test(nodes.nethud.innerHTML), 'the route was not counted');
});

test('survives localStorage being unavailable', async () => {
  const calls = [];
  const nodes = install(calls);
  globalThis.localStorage = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  };
  const { createMap } = await import('../site/map.js');
  const map = createMap({ canvas: nodes.netcanvas, panel: nodes.netpanel, hud: nodes.nethud, stops: nodes.netstops, terms });
  map.open('token');
  assert.ok(/Token/.test(nodes.netpanel.innerHTML), 'blocked storage broke the map');
});
