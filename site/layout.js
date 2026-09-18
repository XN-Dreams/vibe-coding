/**
 * Lay the glossary out as a network.
 *
 * Deterministic on purpose. `Math.random()` would give a different map every
 * visit, and a map you cannot learn the shape of is just a picture. A seeded
 * generator means the station you found last week is still where you left it.
 */

/** Mulberry32 — small, fast, and repeatable from a seed. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEFAULTS = {
  seed: 20260918,
  iterations: 320,
  repulsion: 5200,
  springLength: 74,
  springStrength: 0.03,
  gravity: 0.012,
  damping: 0.86,
  cohesion: 0.14,
  minSeparation: 26,
};

export function layoutNetwork(terms, box, options = {}) {
  // Distances tuned for one canvas size are wrong at every other size: on a wide
  // desktop the network becomes a cluster of dots in the middle, and on a phone
  // the stations pile on top of each other. Scale them with the drawing area.
  const k = Math.sqrt((box.width * box.height) / (1000 * 700));
  const scaled = {
    springLength: DEFAULTS.springLength * clamp(k, 0.55, 1.9),
    minSeparation: DEFAULTS.minSeparation * clamp(k, 0.6, 1.8),
    repulsion: DEFAULTS.repulsion * clamp(k * k, 0.4, 2.6),
  };
  const opt = { ...DEFAULTS, ...scaled, ...options };
  if (terms.length === 0) return { nodes: [], edges: [] };

  const index = new Map(terms.map((t, i) => [t.slug, i]));
  const random = rng(opt.seed);

  // Seed positions on a ring, grouped by category, so each line starts as a
  // contiguous arc instead of being untangled from a random cloud.
  const categories = [...new Set(terms.map((t) => t.category))];

  // One fixed anchor per line, spaced evenly around the ring. These are where
  // each category is pulled back toward throughout the simulation.
  const anchors = {};
  categories.forEach((cat, i) => {
    const angle = (i / categories.length) * Math.PI * 2 - Math.PI / 2;
    // Elliptical, not circular: a circular anchor ring in a 16:9 canvas settles
    // into a tall column and leaves two thirds of the width empty.
    anchors[cat] = {
      x: box.width / 2 + Math.cos(angle) * box.width * 0.34,
      y: box.height / 2 + Math.sin(angle) * box.height * 0.3,
    };
  });
  const nodes = terms.map((t) => {
    const band = categories.indexOf(t.category);
    const spread = (Math.PI * 2) / categories.length;
    const angle = band * spread + random() * spread;
    const spreadFactor = 0.16 + random() * 0.2;
    return {
      slug: t.slug,
      term: t.term,
      category: t.category,
      degree: 0,
      x: box.width / 2 + Math.cos(angle) * box.width * spreadFactor,
      y: box.height / 2 + Math.sin(angle) * box.height * spreadFactor,
      vx: 0,
      vy: 0,
    };
  });

  // One edge per connection. `related` is declared from both ends, so dedupe.
  const seen = new Set();
  const edges = [];
  for (const t of terms) {
    for (const other of t.related ?? []) {
      if (!index.has(other)) continue; // a reference to a term that is gone
      const key = [t.slug, other].sort().join('~');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: index.get(t.slug), b: index.get(other) });
      nodes[index.get(t.slug)].degree++;
      nodes[index.get(other)].degree++;
    }
  }

  for (let step = 0; step < opt.iterations; step++) {
    for (const n of nodes) {
      n.fx = 0;
      n.fy = 0;
    }

    // Every node pushes every other apart.
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) {
          // Exactly coincident: nudge deterministically rather than divide by zero.
          dx = (i - j) * 0.01 + 0.01;
          dy = 0.01;
          d2 = dx * dx + dy * dy;
        }
        const force = opt.repulsion / d2;
        const d = Math.sqrt(d2);
        const fx = (dx / d) * force;
        const fy = (dy / d) * force;
        a.fx += fx;
        a.fy += fy;
        b.fx -= fx;
        b.fy -= fy;
      }
    }

    // Connected nodes pull together.
    for (const e of edges) {
      const a = nodes[e.a];
      const b = nodes[e.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const force = (d - opt.springLength) * opt.springStrength;
      const fx = (dx / d) * force;
      const fy = (dy / d) * force;
      a.fx += fx;
      a.fy += fy;
      b.fx -= fx;
      b.fy -= fy;
    }

    // Each line pulls toward its own anchor. Without this the four categories
    // settle on top of one another and the "four coloured lines" read as one
    // undifferentiated cloud — which is the whole point of the map, lost.
    const centroids = categoryCentroids(nodes, categories);
    for (const n of nodes) {
      const anchor = anchors[n.category];
      const c = centroids[n.category];
      n.fx += (anchor.x - c.x) * opt.cohesion;
      n.fy += (anchor.y - c.y) * opt.cohesion;
    }

    // Gentle pull to centre keeps unconnected terms from drifting to the edge.
    for (const n of nodes) {
      n.fx += (box.width / 2 - n.x) * opt.gravity;
      n.fy += (box.height / 2 - n.y) * opt.gravity;

      n.vx = (n.vx + n.fx) * opt.damping;
      n.vy = (n.vy + n.fy) * opt.damping;
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  // Order matters here, and getting it wrong is silent.
  //
  // separate() guarantees a minimum gap; fitToBox() rescales. Running them the
  // other way round lets the rescale compress the layout and quietly undo the
  // spacing that was just enforced — stations end up 5px apart with every test
  // still green, because a small graph scales UP and never exposes it.
  fitToBox(nodes, box);
  separate(nodes, opt.minSeparation);
  clampToBox(nodes, box);

  return {
    nodes: nodes.map(({ fx, fy, vx, vy, ...keep }) => ({
      ...keep,
      x: round(keep.x),
      y: round(keep.y),
    })),
    edges,
  };
}

const round = (n) => Math.round(n * 100) / 100;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** The factor the renderer should scale station and label sizes by. */
export function sizeScale(box) {
  return clamp(Math.sqrt((box.width * box.height) / (1000 * 700)), 0.7, 1.6);
}

function categoryCentroids(nodes, categories) {
  const acc = {};
  for (const c of categories) acc[c] = { x: 0, y: 0, n: 0 };
  for (const n of nodes) {
    acc[n.category].x += n.x;
    acc[n.category].y += n.y;
    acc[n.category].n++;
  }
  for (const c of categories) {
    acc[c].x /= acc[c].n || 1;
    acc[c].y /= acc[c].n || 1;
  }
  return acc;
}

/** Last line of defence: nothing may sit outside the drawing area. */
function clampToBox(nodes, box) {
  const pad = 18;
  for (const n of nodes) {
    n.x = Math.min(box.width - pad, Math.max(pad, n.x));
    n.y = Math.min(box.height - pad, Math.max(pad, n.y));
  }
}

function separate(nodes, min) {
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= min) continue;
        if (d < 0.001) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const push = (min - d) / 2;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
}

/** Scale and translate the settled layout to fill the box without clipping. */
function fitToBox(nodes, box) {
  const pad = 22;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min((box.width - pad * 2) / spanX, (box.height - pad * 2) / spanY);

  const offsetX = (box.width - spanX * scale) / 2;
  const offsetY = (box.height - spanY * scale) / 2;

  for (const n of nodes) {
    n.x = (n.x - minX) * scale + offsetX;
    n.y = (n.y - minY) * scale + offsetY;
  }
}
