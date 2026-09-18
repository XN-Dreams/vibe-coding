import { layoutPlant } from './plant-layout.js';
import { visit, traceRoute, summarise, isVisited, EMPTY } from './progress.js';
import { esc } from './escape.js';

/**
 * The glossary as a plant.
 *
 * Two earlier designs over-claimed structure. A force graph put terms where the
 * springs stopped. A transit line put every domain in a left-to-right order,
 * which asserted that eighteen unrelated controls are a sequence you walk
 * through. They are not.
 *
 * A zone now declares whether its bays are ordered, and arrows are drawn only
 * where that claim is made. Grouping is always shown; flow only where it exists.
 */

const ZONE_COLOUR = {
  control: '#FF6A45',
  machine: '#F5B82E',
  floor: '#35D6CE',
  qc: '#F473B4',
};

const GROUND = '#0B2A2E';
const PLATE = '#0F3439';
const INK = '#EAF6F4';
const MUTED = 'rgba(234, 246, 244, .55)';
const HAIR = 'rgba(234, 246, 244, .16)';
const STORAGE_KEY = 'vibe-coding:progress:v1';

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!parsed) return EMPTY;
    return {
      visited: Array.isArray(parsed.visited) ? parsed.visited : [],
      routes: Array.isArray(parsed.routes) ? parsed.routes : [],
    };
  } catch {
    return EMPTY;
  }
}

function saveProgress(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* progress is a nicety; storage failure must never break the plant */
  }
}

export function createMap({ canvas, panel, hud, stops, terms, plant, onOpen }) {
  const ctx = canvas.getContext('2d');
  const bySlug = new Map(terms.map((t) => [t.slug, t]));
  const zoneByKey = new Map(plant.map((z) => [z.key, z]));

  let progress = loadProgress();
  let model = { zones: [], bays: [], stops: [], flows: [], conduits: [], rail: { x: 0, w: 0 } };
  let hovered = null;
  let selected = null;
  let view = { scale: 1, x: 0, y: 0 };
  let pointer = null;
  let k = 1;
  const touches = new Map();
  let pinchStart = null;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- layout --- */

  function relayout() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const box = { width: rect.width, height: rect.height };
    k = Math.min(1.45, Math.max(0.7, Math.sqrt((box.width * box.height) / (1200 * 800))));
    model = layoutPlant(plant, terms, box);
    view = { scale: 1, x: 0, y: 0 };
    renderStops(rect);
    draw();
  }

  function renderStops(rect) {
    const linked = new Set();
    for (const c of model.conduits) {
      linked.add(c.a.slug);
      linked.add(c.b.slug);
    }
    stops.innerHTML = model.stops
      .map(
        (s) => `<button type="button" class="stop" data-slug="${esc(s.slug)}"
            style="left:${(s.x / rect.width) * 100}%;top:${(s.y / rect.height) * 100}%"
            aria-label="${esc(s.term)} — ${esc(s.zoneName)}, ${esc(s.bay)}${
              linked.has(s.slug) ? ', connects to another zone' : ''
            }">${esc(s.term)}</button>`
      )
      .join('');
  }

  /* ------------------------------------------------------------ drawing --- */

  const P = (p) => ({ x: p.x * view.scale + view.x, y: p.y * view.scale + view.y });
  const S = (n) => n * k * Math.min(view.scale, 1.6);

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function arrow(from, to, colour, width, dashed) {
    const a = P(from);
    const b = P(to);
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.setLineDash(dashed ? [S(4), S(4)] : []);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const head = S(5);
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - head * Math.cos(ang - 0.5), b.y - head * Math.sin(ang - 0.5));
    ctx.lineTo(b.x - head * Math.cos(ang + 0.5), b.y - head * Math.sin(ang + 0.5));
    ctx.closePath();
    ctx.fill();
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const focus = hovered ?? selected;
    const focusStop = focus ? model.stops.find((s) => s.slug === focus) : null;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. zone plates
    for (const z of model.zones) {
      const dim = focusStop && focusStop.zone !== z.key;
      const p = P(z);
      ctx.globalAlpha = dim ? 0.3 : 1;

      ctx.fillStyle = PLATE;
      roundRect(p.x, p.y, z.w * view.scale, z.h * view.scale, S(6));
      ctx.fill();
      ctx.strokeStyle = HAIR;
      ctx.lineWidth = S(1);
      ctx.stroke();

      ctx.font = `800 ${Math.round(S(12))}px "Big Shoulders Display", Archivo, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = ZONE_COLOUR[z.role];
      ctx.fillText(z.zone.toUpperCase(), p.x + S(9), p.y + S(7));

      // A zone that is not a sequence says so, in words. Colour alone would not.
      ctx.font = `600 ${Math.round(S(7.5))}px Archivo, system-ui, sans-serif`;
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'right';
      ctx.fillText(
        z.sequential ? 'STAGES RUN LEFT TO RIGHT' : 'NO ORDER — REACH FOR WHAT YOU NEED',
        p.x + z.w * view.scale - S(9),
        p.y + S(9)
      );
      ctx.globalAlpha = 1;
    }

    // 2. bays
    ctx.textAlign = 'left';
    for (const b of model.bays) {
      const dim = focusStop && focusStop.zone !== b.zone;
      const p = P(b);
      ctx.globalAlpha = dim ? 0.22 : 1;

      const zone = model.zones.find((z) => z.key === b.zone);
      ctx.strokeStyle = `${ZONE_COLOUR[zone.role]}55`;
      ctx.lineWidth = S(1);
      roundRect(p.x, p.y, b.w * view.scale, b.h * view.scale, S(4));
      ctx.stroke();

      ctx.font = `700 ${Math.round(S(8.5))}px Archivo, system-ui, sans-serif`;
      ctx.fillStyle = ZONE_COLOUR[zone.role];
      ctx.textBaseline = 'bottom';
      ctx.fillText(b.title.toUpperCase(), p.x + S(5), p.y - S(3));
      ctx.globalAlpha = 1;
    }

    // 3. flow — stage arrows inside sequential zones, and the plant spine
    for (const f of model.flows) {
      if (f.kind === 'stage') {
        const zone = model.zones.find((z) => z.key === f.zone);
        const dim = focusStop && focusStop.zone !== f.zone;
        ctx.globalAlpha = dim ? 0.2 : 0.9;
        arrow(f.from, f.to, ZONE_COLOUR[zone.role], S(2));
      } else {
        ctx.globalAlpha = 0.75;
        arrow(f.from, f.to, INK, S(2), true);
        const mid = P({ x: f.from.x, y: (f.from.y + f.to.y) / 2 });
        ctx.save();
        ctx.translate(mid.x, mid.y);
        ctx.rotate(-Math.PI / 2);
        ctx.font = `700 ${Math.round(S(7.5))}px Archivo, system-ui, sans-serif`;
        ctx.fillStyle = MUTED;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(f.label.toUpperCase(), 0, -S(4));
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // 4. conduits between zones
    ctx.setLineDash([S(2), S(5)]);
    ctx.lineWidth = S(1.2);
    for (const c of model.conduits) {
      const lit = focus && (c.a.slug === focus || c.b.slug === focus);
      ctx.globalAlpha = focus ? (lit ? 0.9 : 0.05) : 0.18;
      ctx.strokeStyle = lit ? INK : 'rgba(234,246,244,.5)';
      const a = P(c.a);
      const b = P(c.b);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo(a.x, (a.y + b.y) / 2, b.x, (a.y + b.y) / 2, b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // 5. the machines themselves
    for (const s of model.stops) {
      const p = P(s);
      const online = isVisited(progress, s.slug);
      const active = s.slug === focus;
      const dim = focusStop && focusStop.zone !== s.zone && !active;
      const zone = model.zones.find((z) => z.key === s.zone);
      const colour = ZONE_COLOUR[zone.role];

      ctx.globalAlpha = dim ? 0.2 : 1;
      const r = S(active ? 6.5 : 5);

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = online ? colour : GROUND;
      ctx.fill();
      ctx.strokeStyle = active ? '#FFFFFF' : colour;
      ctx.lineWidth = S(active ? 2.6 : 1.8);
      ctx.stroke();

      if (active || online || view.scale > 1.35) {
        ctx.font = `600 ${Math.round(S(9))}px Archivo, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const y = p.y + r + S(3);
        ctx.lineWidth = S(3);
        ctx.strokeStyle = PLATE;
        ctx.strokeText(s.term, p.x, y);
        ctx.fillStyle = active ? '#FFFFFF' : online ? INK : MUTED;
        ctx.fillText(s.term, p.x, y);
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ----------------------------------------------------------- the HUD --- */

  function renderHud() {
    const s = summarise(terms, progress);
    const rows = plant
      .map((z) => {
        const stat = s.lines[z.key] ?? { visited: 0, total: 0, complete: false };
        const pct = stat.total ? Math.round((stat.visited / stat.total) * 100) : 0;
        return `<button type="button" class="line${stat.complete ? ' line--done' : ''}" data-zone="${esc(z.key)}">
          <span class="line__dot" style="background:${ZONE_COLOUR[z.role]}"></span>
          <span class="line__name">${esc(z.zone)}</span>
          <span class="line__bar"><i style="width:${pct}%;background:${ZONE_COLOUR[z.role]}"></i></span>
          <span class="line__n">${stat.visited}/${stat.total}</span>
          <span class="line__tag">${esc(z.tagline)}</span>
        </button>`;
      })
      .join('');

    hud.innerHTML = `<p class="hud__total"><strong>${s.visited}</strong> of ${s.total} machines online
      &middot; <strong>${s.routes}</strong> conduits opened</p>${rows}`;
  }

  /* --------------------------------------------------------- the panel --- */

  function open(slug, from) {
    const t = bySlug.get(slug);
    if (!t) return;
    const stop = model.stops.find((s) => s.slug === slug);
    const zone = zoneByKey.get(t.category);

    progress = from ? traceRoute(progress, from, slug) : visit(progress, slug);
    saveProgress(progress);
    selected = slug;

    const inBay = model.stops.filter((s) => s.zone === t.category && s.bay === stop?.bay);
    const related = (t.related ?? [])
      .filter((r) => bySlug.has(r))
      .map((r) => {
        const other = bySlug.get(r);
        const off = other.category !== t.category;
        return `<button type="button" class="chip${off ? ' chip--change' : ''}" data-goto="${esc(r)}" data-from="${esc(slug)}">
            <span class="chip__dot" style="background:${ZONE_COLOUR[zoneByKey.get(other.category)?.role ?? 'floor']}"></span>${esc(other.term)}${
              off ? '<span class="chip__x">other zone</span>' : ''
            }</button>`;
      })
      .join('');

    const siblings = inBay
      .filter((s) => s.slug !== slug)
      .map((s) => `<button type="button" class="chip chip--bay" data-goto="${esc(s.slug)}">${esc(s.term)}</button>`)
      .join('');

    panel.innerHTML = `<article class="station">
      <p class="station__line" style="color:${ZONE_COLOUR[zone?.role ?? 'floor']}">${esc(zone?.zone ?? t.category)}</p>
      <p class="station__section">${esc(stop?.bay ?? '')}${
        zone && zone.flow === 'parallel' ? ' &middot; no fixed order' : ''
      }</p>
      <h3 class="station__term">${esc(t.term)}</h3>
      <p class="station__short">${esc(t.short)}</p>
      <p class="station__why"><b>Why it matters.</b> ${esc(t.why)}</p>
      <p class="station__hear">${esc(t.hear_it)}</p>
      ${siblings ? `<p class="station__onward">Also in this bay</p><div class="chips">${siblings}</div>` : ''}
      ${related ? `<p class="station__onward">Connects to</p><div class="chips">${related}</div>` : ''}
    </article>`;
    panel.hidden = false;

    renderHud();
    draw();
    onOpen?.(t);
  }

  /* ----------------------------------------------------------- wiring --- */

  const nodeAt = (cx, cy) => {
    let best = null;
    let bestD = 22 * k;
    for (const s of model.stops) {
      const p = P(s);
      const d = Math.hypot(p.x - cx, p.y - cy);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  };

  function zoomBy(factor, cx, cy) {
    const next = Math.min(4, Math.max(0.5, view.scale * factor));
    view.x = cx - ((cx - view.x) / view.scale) * next;
    view.y = cy - ((cy - view.y) / view.scale) * next;
    view.scale = next;
    draw();
  }

  const fit = () => {
    view = { scale: 1, x: 0, y: 0 };
    draw();
  };

  canvas.addEventListener('pointermove', (ev) => {
    if (touches.has(ev.pointerId)) touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (touches.size === 2) {
      const pair = [...touches.values()];
      const dist = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y);
      const rect = canvas.getBoundingClientRect();
      const mx = (pair[0].x + pair[1].x) / 2 - rect.left;
      const my = (pair[0].y + pair[1].y) / 2 - rect.top;
      if (pinchStart) zoomBy(dist / pinchStart, mx, my);
      pinchStart = dist;
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (pointer) {
      view.x += ev.clientX - pointer.x;
      view.y += ev.clientY - pointer.y;
      pointer = { x: ev.clientX, y: ev.clientY };
      draw();
      return;
    }
    const hit = nodeAt(ev.clientX - rect.left, ev.clientY - rect.top);
    const slug = hit ? hit.slug : null;
    if (slug !== hovered) {
      hovered = slug;
      canvas.style.cursor = slug ? 'pointer' : 'grab';
      draw();
    }
  });

  canvas.addEventListener('pointerdown', (ev) => {
    touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (touches.size === 2) {
      pointer = null;
      pinchStart = null;
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const hit = nodeAt(ev.clientX - rect.left, ev.clientY - rect.top);
    if (hit) {
      open(hit.slug);
      return;
    }
    pointer = { x: ev.clientX, y: ev.clientY };
    canvas.setPointerCapture(ev.pointerId);
    canvas.style.cursor = 'grabbing';
  });

  const endPan = (ev) => {
    if (ev && ev.pointerId !== undefined) touches.delete(ev.pointerId);
    if (touches.size < 2) pinchStart = null;
    pointer = null;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerup', endPan);
  canvas.addEventListener('pointercancel', endPan);
  canvas.addEventListener('pointerleave', (ev) => {
    endPan(ev);
    if (hovered) {
      hovered = null;
      draw();
    }
  });

  canvas.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomBy(ev.deltaY < 0 ? 1.12 : 0.89, ev.clientX - rect.left, ev.clientY - rect.top);
    },
    { passive: false }
  );

  stops.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.stop');
    if (btn) open(btn.dataset.slug);
  });
  stops.addEventListener('focusin', (ev) => {
    const btn = ev.target.closest('.stop');
    if (btn) {
      hovered = btn.dataset.slug;
      draw();
    }
  });

  panel.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-goto]');
    if (el) open(el.dataset.goto, el.dataset.from);
  });

  hud.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-zone]');
    if (!el) return;
    const first = model.stops.find((s) => s.zone === el.dataset.zone);
    if (first) open(first.slug);
  });

  let resizeTimer;
  let lastSize = '';
  const onResize = () => {
    const r = canvas.getBoundingClientRect();
    const sig = `${Math.round(r.width)}x${Math.round(r.height)}`;
    if (sig === lastSize || r.width < 2) return;
    lastSize = sig;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(relayout, reduceMotion ? 0 : 140);
  };
  if (typeof ResizeObserver === 'function') new ResizeObserver(onResize).observe(canvas);
  else window.addEventListener('resize', onResize);

  const centre = () => {
    const r = canvas.getBoundingClientRect();
    return [r.width / 2, r.height / 2];
  };
  const zi = document.getElementById('zoomin');
  const zo = document.getElementById('zoomout');
  const zf = document.getElementById('zoomfit');
  if (zi) zi.addEventListener('click', () => zoomBy(1.25, ...centre()));
  if (zo) zo.addEventListener('click', () => zoomBy(0.8, ...centre()));
  if (zf) zf.addEventListener('click', fit);

  relayout();
  renderHud();

  return { open, zoomBy, fit, refresh: relayout };
}
