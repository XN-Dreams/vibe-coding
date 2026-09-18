import { orderedStops, sectionOf } from './lines-data.js';

/**
 * Geometry for the route map.
 *
 * No physics. The previous version settled the terms with a force simulation,
 * which meant a station's position recorded where the springs happened to stop
 * and nothing else. Here the routes are drawn, the order along them is authored
 * in data/lines.json, and position carries meaning: further right is further
 * through the material.
 *
 * All four lines leave one origin on the left, so the map answers "where do I
 * start?" before it answers anything else.
 */

// Normalised waypoints per line. Each begins at the shared origin, fans out to
// its own band, then runs right with a gentle profile so the four routes read
// as drawn rather than ruled.
const ROUTES = {
  core: [[0.045, 0.5], [0.105, 0.33], [0.175, 0.17], [0.42, 0.12], [0.68, 0.19], [0.96, 0.14]],
  'claude-code': [[0.045, 0.5], [0.105, 0.45], [0.175, 0.39], [0.42, 0.43], [0.68, 0.35], [0.96, 0.39]],
  engineering: [[0.045, 0.5], [0.105, 0.56], [0.175, 0.62], [0.42, 0.58], [0.68, 0.67], [0.96, 0.61]],
  discipline: [[0.045, 0.5], [0.105, 0.68], [0.175, 0.85], [0.42, 0.90], [0.68, 0.81], [0.96, 0.87]],
};

const FIRST_STOP_AT = 0.16; // arc fraction where stations begin, clear of the fan
const LAST_STOP_AT = 0.995;

export function layoutRoutes(lines, glossary, box) {
  const bySlug = new Map(glossary.map((t) => [t.slug, t]));
  const pad = Math.min(box.width, box.height) * 0.035;
  const inner = { w: box.width - pad * 2, h: box.height - pad * 2 };

  const toPx = ([nx, ny]) => ({ x: pad + nx * inner.w, y: pad + ny * inner.h });

  const stations = [];
  const sections = [];
  const routes = [];
  const origin = toPx(ROUTES.core[0]);

  for (const line of lines) {
    const pts = (ROUTES[line.key] ?? ROUTES.core).map(toPx);
    const path = polyline(pts);
    routes.push({ key: line.key, points: samplePath(path, 64) });

    const stops = orderedStops(line);
    const placed = stops.map((slug, i) => {
      const t =
        stops.length === 1
          ? (FIRST_STOP_AT + LAST_STOP_AT) / 2
          : FIRST_STOP_AT + (i / (stops.length - 1)) * (LAST_STOP_AT - FIRST_STOP_AT);
      const p = pointAt(path, t);
      const term = bySlug.get(slug);
      const station = {
        slug,
        term: term?.term ?? slug,
        line: line.key,
        index: i,
        section: sectionOf(line, slug),
        x: round(p.x),
        y: round(p.y),
        t,
      };
      stations.push(station);
      return station;
    });

    // A bracket per section, spanning its first to its last stop.
    for (const section of line.sections ?? []) {
      const members = placed.filter((s) => section.stops.includes(s.slug));
      if (members.length === 0) continue;
      const from = members[0];
      const to = members[members.length - 1];
      // Labels sit above the line, except the topmost line where there is no
      // room above — those drop below instead.
      const above = line.key !== 'core';
      sections.push({
        line: line.key,
        title: section.title,
        from: { x: from.x, y: from.y },
        to: { x: to.x, y: to.y },
        label: {
          x: round((from.x + to.x) / 2),
          y: round((from.y + to.y) / 2 + (above ? -26 : 30)),
        },
        above,
      });
    }
  }

  // The rare cross-line links are the genuine interchanges. There are only a
  // handful, which is exactly why they are worth drawing: they are the places
  // one journey actually touches another.
  const byStation = new Map(stations.map((s) => [s.slug, s]));
  const seen = new Set();
  const interchanges = [];
  for (const term of glossary) {
    for (const other of term.related ?? []) {
      const a = byStation.get(term.slug);
      const b = byStation.get(other);
      if (!a || !b || a.line === b.line) continue;
      const key = [a.slug, b.slug].sort().join('~');
      if (seen.has(key)) continue;
      seen.add(key);
      interchanges.push({ a, b });
    }
  }

  return { stations, sections, interchanges, routes, origin };
}

/* ------------------------------------------------------------- geometry --- */

const round = (n) => Math.round(n * 100) / 100;

/** A Catmull-Rom-ish smoothed polyline with cumulative arc length. */
function polyline(points) {
  const dense = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const steps = 22;
    for (let s = 0; s < steps; s++) {
      dense.push(catmullRom(p0, p1, p2, p3, s / steps));
    }
  }
  dense.push(points[points.length - 1]);

  const lengths = [0];
  for (let i = 1; i < dense.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y));
  }
  return { dense, lengths, total: lengths[lengths.length - 1] || 1 };
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a, b, c, d) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
}

/** The point at arc-length fraction `t` along the path. */
function pointAt(path, t) {
  const target = Math.max(0, Math.min(1, t)) * path.total;
  let lo = 0;
  let hi = path.lengths.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (path.lengths[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const span = path.lengths[i] - path.lengths[i - 1] || 1;
  const f = (target - path.lengths[i - 1]) / span;
  const a = path.dense[i - 1];
  const b = path.dense[i];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

function samplePath(path, count) {
  return Array.from({ length: count + 1 }, (_, i) => {
    const p = pointAt(path, i / count);
    return { x: round(p.x), y: round(p.y) };
  });
}
