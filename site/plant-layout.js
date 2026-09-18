import { allStops, bayOf, isSequential } from './plant-data.js';

/**
 * Geometry for the plant.
 *
 * The two designs before this one both over-claimed structure. A force graph
 * put terms where the springs stopped, which meant nothing. A transit line put
 * them in a left-to-right order, which asserted that eighteen unrelated
 * controls are a sequence you walk through — they are not.
 *
 * Here a zone has to DECLARE whether its bays are ordered, and only a zone that
 * claims a sequence gets arrows drawn between its bays. Grouping is always
 * drawn; flow is drawn only where flow is real.
 */

// Vertical share of the plant, in stacking order. The shop floor is the widest
// stage of the process and gets the most room.
const ZONE_ORDER = ['control', 'machine', 'floor', 'qc'];
const ZONE_SHARE = { control: 0.26, machine: 0.2, floor: 0.32, qc: 0.22 };

const ZONE_FLOWS = [
  ['control', 'machine', 'drives'],
  ['machine', 'floor', 'produces'],
  ['floor', 'qc', 'must pass'],
];

export function layoutPlant(zones, glossary, box) {
  const bySlug = new Map(glossary.map((t) => [t.slug, t]));
  const pad = Math.max(10, Math.min(box.width, box.height) * 0.028);
  const gutter = Math.max(14, box.height * 0.035); // room for the spine arrows
  const railW = Math.min(74, Math.max(40, box.width * 0.07)); // left spine column

  const usableH = box.height - pad * 2 - gutter * (ZONE_ORDER.length - 1);
  const left = pad + railW;
  const usableW = box.width - left - pad;

  const byRole = new Map(zones.map((z) => [z.role, z]));
  const laidZones = [];
  const bays = [];
  const stops = [];
  const flows = [];

  let y = pad;
  for (const role of ZONE_ORDER) {
    const zone = byRole.get(role);
    if (!zone) continue;
    const h = usableH * (ZONE_SHARE[role] ?? 0.25);

    const laid = {
      key: zone.key,
      role,
      zone: zone.zone,
      tagline: zone.tagline,
      flow: zone.flow,
      sequential: isSequential(zone),
      x: round(left),
      y: round(y),
      w: round(usableW),
      h: round(h),
    };
    laidZones.push(laid);

    layoutBays(zone, laid, bays, stops, flows, bySlug);
    y += h + gutter;
  }

  // The plant spine: which zone feeds which. These are real, so they are drawn.
  const zoneAt = (role) => laidZones.find((z) => z.role === role);
  for (const [fromRole, toRole, label] of ZONE_FLOWS) {
    const a = zoneAt(fromRole);
    const b = zoneAt(toRole);
    if (!a || !b) continue;
    flows.push({
      kind: 'zone',
      label,
      from: { x: round(a.x - railW * 0.5), y: round(a.y + a.h) },
      to: { x: round(b.x - railW * 0.5), y: round(b.y) },
    });
  }

  // Cross-zone term links: the pipes between departments.
  const byStop = new Map(stops.map((s) => [s.slug, s]));
  const seen = new Set();
  const conduits = [];
  for (const term of glossary) {
    for (const other of term.related ?? []) {
      const a = byStop.get(term.slug);
      const b = byStop.get(other);
      if (!a || !b || a.zone === b.zone) continue;
      const key = [a.slug, b.slug].sort().join('~');
      if (seen.has(key)) continue;
      seen.add(key);
      conduits.push({ a, b });
    }
  }

  return { zones: laidZones, bays, stops, flows, conduits, rail: { x: round(pad), w: round(railW) } };
}

function layoutBays(zone, laid, bays, stops, flows, bySlug) {
  const list = zone.bays ?? [];
  if (list.length === 0) return;

  const titleH = Math.min(26, laid.h * 0.22);
  const bayGap = Math.max(8, laid.w * 0.012);
  const innerY = laid.y + titleH;
  const innerH = laid.h - titleH - 4;

  // Width proportional to how much each bay has to hold, so a six-stop bay is
  // wider than a three-stop one instead of everything being forced equal.
  const weights = list.map((b) => (b.stops ?? []).length);
  const totalW = weights.reduce((a, b) => a + b, 0) || 1;
  const available = laid.w - bayGap * (list.length - 1);

  let x = laid.x;
  const placedBays = [];
  for (const [i, bay] of list.entries()) {
    const w = (available * weights[i]) / totalW;
    const laidBay = {
      zone: laid.key,
      title: bay.title,
      index: i,
      sequential: laid.sequential,
      x: round(x),
      y: round(innerY),
      w: round(w),
      h: round(innerH),
    };
    bays.push(laidBay);
    placedBays.push(laidBay);

    placeStops(bay, laidBay, laid, stops, bySlug, zone);
    x += w + bayGap;
  }

  // Arrows between bays — ONLY where the zone declares a sequence.
  if (laid.sequential) {
    for (let i = 1; i < placedBays.length; i++) {
      const a = placedBays[i - 1];
      const b = placedBays[i];
      flows.push({
        kind: 'stage',
        zone: laid.key,
        from: { x: round(a.x + a.w), y: round(a.y + a.h / 2) },
        to: { x: round(b.x), y: round(b.y + b.h / 2) },
      });
    }
  }
}

function placeStops(bay, laidBay, laid, stops, bySlug, zone) {
  const list = bay.stops ?? [];
  const padX = Math.max(6, laidBay.w * 0.06);
  const padY = Math.max(16, laidBay.h * 0.18);
  const innerW = Math.max(1, laidBay.w - padX * 2);
  const innerH = Math.max(1, laidBay.h - padY * 1.4);

  // A grid inside the bay. Within a bay nothing is ordered, so a grid is the
  // honest arrangement: these belong together, and that is all it claims.
  const cols = Math.max(1, Math.min(list.length, Math.round(Math.sqrt(list.length * (innerW / Math.max(innerH, 1))))));
  const rows = Math.ceil(list.length / cols);

  list.forEach((slug, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = laidBay.x + padX + (cols === 1 ? innerW / 2 : (innerW * col) / (cols - 1 || 1));
    const cy = laidBay.y + padY + (rows === 1 ? innerH / 2 : (innerH * row) / (rows - 1 || 1));
    const term = bySlug.get(slug);
    stops.push({
      slug,
      term: term?.term ?? slug,
      zone: laid.key,
      zoneName: laid.zone,
      role: laid.role,
      bay: bay.title,
      index: i,
      x: round(Math.min(laidBay.x + laidBay.w, Math.max(laidBay.x, cx))),
      y: round(Math.min(laidBay.y + laidBay.h, Math.max(laidBay.y, cy))),
    });
  });
}

const round = (n) => Math.round(n * 100) / 100;
