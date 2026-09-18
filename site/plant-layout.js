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

// The plant spine. Quality control is deliberately absent: it is not a stage
// the work passes through at the end, it is a set of gates over what is above
// it, and each QC bay points up at the zone it governs instead.
const ZONE_FLOWS = [
  ['control', 'machine', 'drives'],
  ['control', 'floor', 'drives'],
  ['machine', 'floor', 'produces'],
];

// A bay narrower than this cannot hold a title and a grid of machines. At
// phone width the shop floor's five bays were 48px each, which is not a
// diagram, it is a smear.
const MIN_BAY_W = 132;

export function layoutPlant(zones, glossary, box) {
  const bySlug = new Map(glossary.map((t) => [t.slug, t]));
  const pad = Math.max(10, Math.min(box.width, box.height) * 0.028);
  const gutter = Math.max(14, box.height * 0.035); // room for the spine arrows
  const railW = Math.min(74, Math.max(40, box.width * 0.07)); // left spine column

  const left = pad + railW;
  const usableW = box.width - left - pad;

  // How many bays fit across at this width? When they do not all fit, they wrap
  // onto more rows and the ZONE gets taller - which makes the whole plant taller
  // than the canvas, and panning reveals the rest. Squeezing is not an option.
  const rowsFor = (zone) => {
    const n = (zone.bays ?? []).length || 1;
    const perRow = Math.max(1, Math.min(n, Math.floor(usableW / MIN_BAY_W)));
    return { perRow, rows: Math.ceil(n / perRow) };
  };

  const rowPlan = new Map(zones.map((z) => [z.role, rowsFor(z)]));
  const tallest = Math.max(...[...rowPlan.values()].map((r) => r.rows));

  const shareWeights = {};
  for (const role of ZONE_ORDER) {
    const rows = rowPlan.get(role)?.rows ?? 1;
    shareWeights[role] = (ZONE_SHARE[role] ?? 0.25) * (1 + (rows - 1) * 0.8);
  }
  const shareTotal = Object.values(shareWeights).reduce((a, b) => a + b, 0) || 1;

  // Grow the drawing to fit its content rather than compressing the content.
  const contentH = tallest > 1 ? box.height * (1 + (tallest - 1) * 0.55) : box.height;
  const usableH = contentH - pad * 2 - gutter * (ZONE_ORDER.length - 1);

  const byRole = new Map(zones.map((z) => [z.role, z]));
  const laidZones = [];
  const bays = [];
  const stops = [];
  const flows = [];

  let y = pad;
  for (const role of ZONE_ORDER) {
    const zone = byRole.get(role);
    if (!zone) continue;
    const plan = rowPlan.get(role) ?? { perRow: 1, rows: 1 };
    // A zone whose bays wrapped needs proportionally more height. Shares are
    // weighted by row count and normalised, so they still fill the drawing.
    const h = usableH * (shareWeights[role] / shareTotal);

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

    layoutBays(zone, laid, bays, stops, flows, bySlug, plan.perRow);
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

  // QC gates: each bay points UP into the zone it governs. This is what makes
  // quality control a layer over the plant rather than a stage at the end.
  for (const bay of bays) {
    if (!bay.gates) continue;
    const target = laidZones.find((z) => z.role === bay.gates);
    if (!target) continue;
    flows.push({
      kind: 'gate',
      zone: bay.zone,
      label: 'gates',
      from: { x: round(bay.x + bay.w / 2), y: round(bay.y) },
      to: { x: round(bay.x + bay.w / 2), y: round(target.y + target.h) },
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

  const entry = bays.find((b) => b.entry) ?? null;

  return {
    zones: laidZones,
    bays,
    stops,
    flows,
    conduits,
    entry,
    content: { width: round(box.width), height: round(contentH) },
    rail: { x: round(pad), w: round(railW) },
  };
}

function layoutBays(zone, laid, bays, stops, flows, bySlug, perRow) {
  const list = zone.bays ?? [];
  if (list.length === 0) return;

  const titleH = Math.min(26, laid.h * 0.22);
  const bayGap = Math.max(8, laid.w * 0.012);
  const innerY = laid.y + titleH;
  const innerH = laid.h - titleH - 4;

  // Width proportional to how much each bay has to hold, so a six-stop bay is
  // wider than a three-stop one instead of everything being forced equal.
  const cols = Math.max(1, Math.min(perRow ?? list.length, list.length));
  const rowCount = Math.ceil(list.length / cols);
  const rowH = (innerH - bayGap * (rowCount - 1)) / rowCount;

  const placedBays = [];
  for (const [i, bay] of list.entries()) {
    const row = Math.floor(i / cols);
    const inRow = list.slice(row * cols, row * cols + cols);
    const rowWeights = inRow.map((b) => (b.stops ?? []).length);
    const rowTotal = rowWeights.reduce((a, b) => a + b, 0) || 1;
    const available = laid.w - bayGap * (inRow.length - 1);

    const col = i % cols;
    let x = laid.x;
    for (let c = 0; c < col; c++) x += (available * rowWeights[c]) / rowTotal + bayGap;

    const w = (available * rowWeights[col]) / rowTotal;
    const bayY = innerY + row * (rowH + bayGap);
    const laidBay = {
      zone: laid.key,
      title: bay.title,
      index: i,
      sequential: laid.sequential,
      inFlow: bay.inFlow !== false,
      entry: bay.entry === true,
      gates: bay.gates ?? null,
      x: round(x),
      y: round(bayY),
      w: round(w),
      h: round(rowH),
    };
    bays.push(laidBay);
    placedBays.push(laidBay);

    placeStops(bay, laidBay, laid, stops, bySlug, zone);
  }

  // Arrows between bays - ONLY where the zone declares a sequence, and only
  // between bays that are actually IN that sequence. "What it is" is an identity
  // plate, not a stage; an arrow from it would claim definitions flow into inputs.
  if (laid.sequential) {
    const chain = placedBays.filter((b) => b.inFlow);
    for (let i = 1; i < chain.length; i++) {
      const a = chain[i - 1];
      const b = chain[i];
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
