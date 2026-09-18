import { layoutNetwork, sizeScale } from './layout.js';
import { CATEGORY_TITLES } from './categories.js';
import { visit, traceRoute, summarise, isVisited, EMPTY } from './progress.js';
import { esc } from './escape.js';

/**
 * The glossary as a transit network.
 *
 * Every term is a station, every cross-reference a section of track, every
 * category a line. Terms with many connections are drawn as interchanges,
 * because that is what they are: the words you cannot avoid passing through.
 */

const LINE = {
  core: '#F5B82E',
  'claude-code': '#FF6A45',
  engineering: '#35D6CE',
  discipline: '#F473B4',
};

const GROUND = '#0B2A2E';
const TRACK_NEUTRAL = 'rgba(226, 244, 242, 0.22)';
const HUB_DEGREE = 8;

const STORAGE_KEY = 'vibe-coding:progress:v1';

/** localStorage throws in private windows and with site data blocked. */
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
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
    /* progress is a nicety; never let storage failure break the map */
  }
}

export function createMap({ canvas, panel, hud, stops, terms, onOpen }) {
  const ctx = canvas.getContext('2d');
  const bySlug = new Map(terms.map((t) => [t.slug, t]));

  let progress = loadProgress();
  let graph = { nodes: [], edges: [] };
  let hovered = null;
  let selected = null;
  let view = { scale: 1, x: 0, y: 0 };
  let pointer = null;
  let k = 1;                       // station/label size factor for this canvas
  const touches = new Map();       // active pointers, for pinch
  let pinchStart = null;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let reveal = reduceMotion ? 1 : 0;
  let revealing = false;

  /* ------------------------------------------------------------- layout --- */

  function relayout() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const box = { width: rect.width, height: rect.height };
    k = sizeScale(box);
    graph = layoutNetwork(terms, box);
    view = { scale: 1, x: 0, y: 0 };   // a relayout is a new map; reset the camera
    renderStops(rect);
    draw();
  }

  /* -------------------------------------------------- accessible layer --- */

  // A focusable button per station, positioned over the canvas. The map is
  // operable by keyboard and reachable by a screen reader without the canvas
  // having to be anything other than a picture.
  function renderStops(rect) {
    stops.innerHTML = graph.nodes
      .map(
        (n) => `<button type="button" class="stop" data-slug="${esc(n.slug)}"
            style="left:${(n.x / rect.width) * 100}%;top:${(n.y / rect.height) * 100}%"
            aria-label="${esc(n.term)} — ${esc(CATEGORY_TITLES[n.category])} line${
              n.degree >= HUB_DEGREE ? ', interchange' : ''
            }">${esc(n.term)}</button>`
      )
      .join('');
  }

  /* ------------------------------------------------------------ drawing --- */

  const toScreen = (n) => ({ x: n.x * view.scale + view.x, y: n.y * view.scale + view.y });

  function draw() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const neighbours = new Set();
    const focus = hovered ?? selected;
    if (focus) {
      for (const e of graph.edges) {
        if (graph.nodes[e.a].slug === focus) neighbours.add(graph.nodes[e.b].slug);
        if (graph.nodes[e.b].slug === focus) neighbours.add(graph.nodes[e.a].slug);
      }
    }

    // Track first, stations on top — the same order a printed map is separated in.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const shown = Math.ceil(graph.edges.length * reveal);

    graph.edges.slice(0, shown).forEach((e) => {
      const a = graph.nodes[e.a];
      const b = graph.nodes[e.b];
      const sameLine = a.category === b.category;
      const lit = focus && (a.slug === focus || b.slug === focus);

      const pa = toScreen(a);
      const pb = toScreen(b);

      ctx.strokeStyle = lit ? '#FFFFFF' : sameLine ? LINE[a.category] : TRACK_NEUTRAL;
      ctx.globalAlpha = focus ? (lit ? 1 : 0.18) : sameLine ? 0.78 : 1;
      ctx.lineWidth = (lit ? 4.5 : sameLine ? 3.4 : 1.6) * k * Math.min(view.scale, 1.6);

      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    for (const n of graph.nodes) {
      const p = toScreen(n);
      const hub = n.degree >= HUB_DEGREE;
      const seen = isVisited(progress, n.slug);
      const active = n.slug === focus;
      const dim = focus && !active && !neighbours.has(n.slug);

      const r = (hub ? 9 : 6) * k * Math.min(view.scale, 1.5);
      ctx.globalAlpha = dim ? 0.25 : 1;

      // Interchange stations get the double ring a transit map gives them.
      if (hub) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = LINE[n.category];
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = seen ? LINE[n.category] : GROUND;
      ctx.fill();
      ctx.strokeStyle = active ? '#FFFFFF' : LINE[n.category];
      ctx.lineWidth = active ? 3 : 2.2;
      ctx.stroke();

      // Labelling every station at once is unreadable. Show the ones you have
      // visited, the interchanges, and whatever you are pointing at.
      const label = active || hub || seen;
      if (label && !dim) {
        ctx.font = `600 ${Math.round(11 * k * Math.min(view.scale, 1.4))}px Archivo, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const text = n.term;
        const y = p.y + r + 6;
        ctx.lineWidth = 3;
        ctx.strokeStyle = GROUND;
        ctx.strokeText(text, p.x, y);
        ctx.fillStyle = active ? '#FFFFFF' : seen ? '#EAF6F4' : 'rgba(234,246,244,0.72)';
        ctx.fillText(text, p.x, y);
      }
      ctx.globalAlpha = 1;
    }

    // One reveal loop, ever. Without the guard, any draw() triggered by a
    // hover or a pan during the intro starts a second loop advancing the same
    // counter, and the animation runs at a multiple of its intended speed.
    if (reveal < 1 && !revealing) {
      revealing = true;
      const step = () => {
        reveal = Math.min(1, reveal + 0.045);
        if (reveal < 1) requestAnimationFrame(step);
        else revealing = false;
        draw();
      };
      requestAnimationFrame(step);
    }
  }

  /* ----------------------------------------------------------- the HUD --- */

  function renderHud() {
    const s = summarise(terms, progress);
    const lines = Object.entries(CATEGORY_TITLES)
      .map(([key, title]) => {
        const l = s.lines[key] ?? { visited: 0, total: 0, complete: false };
        const pct = l.total ? Math.round((l.visited / l.total) * 100) : 0;
        return `<div class="line${l.complete ? ' line--done' : ''}">
          <span class="line__dot" style="background:${LINE[key]}"></span>
          <span class="line__name">${esc(title)}</span>
          <span class="line__bar"><i style="width:${pct}%;background:${LINE[key]}"></i></span>
          <span class="line__n">${l.visited}/${l.total}</span>
        </div>`;
      })
      .join('');

    hud.innerHTML = `<p class="hud__total"><strong>${s.visited}</strong> of ${s.total} stations
      &middot; <strong>${s.routes}</strong> routes traced</p>${lines}`;
  }

  /* --------------------------------------------------------- the panel --- */

  function open(slug, from) {
    const t = bySlug.get(slug);
    if (!t) return;

    progress = from ? traceRoute(progress, from, slug) : visit(progress, slug);
    saveProgress(progress);
    selected = slug;

    const related = (t.related ?? [])
      .filter((r) => bySlug.has(r))
      .map(
        (r) =>
          `<button type="button" class="chip" data-goto="${esc(r)}" data-from="${esc(slug)}">
             <span class="chip__dot" style="background:${LINE[bySlug.get(r).category]}"></span>${esc(
            bySlug.get(r).term
          )}</button>`
      )
      .join('');

    panel.innerHTML = `<article class="station">
      <p class="station__line" style="color:${LINE[t.category]}">${esc(CATEGORY_TITLES[t.category])}</p>
      <h3 class="station__term">${esc(t.term)}</h3>
      <p class="station__short">${esc(t.short)}</p>
      <p class="station__why"><b>Why it matters.</b> ${esc(t.why)}</p>
      <p class="station__hear">${esc(t.hear_it)}</p>
      ${related ? `<p class="station__onward">Onward from here</p><div class="chips">${related}</div>` : ''}
    </article>`;
    panel.hidden = false;

    renderHud();
    draw();
    onOpen?.(t);
  }

  /* ---------------------------------------------------------- wiring --- */

  const nodeAt = (cx, cy) => {
    let best = null;
    let bestD = 26 * k;
    for (const n of graph.nodes) {
      const p = toScreen(n);
      const d = Math.hypot(p.x - cx, p.y - cy);
      if (d < bestD) {
        bestD = d;
        best = n;
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

  function fit() {
    view = { scale: 1, x: 0, y: 0 };
    draw();
  }

  canvas.addEventListener('pointermove', (ev) => {
    if (touches.has(ev.pointerId)) touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    // Two fingers: pinch. Without this the map is unusable on a touch device,
    // where there is no wheel to zoom with.
    if (touches.size === 2) {
      const [a, b] = [...touches.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = canvas.getBoundingClientRect();
      const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
      if (pinchStart) zoomBy(dist / pinchStart, mid.x, mid.y);
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
    const slug = hit?.slug ?? null;
    if (slug !== hovered) {
      hovered = slug;
      canvas.style.cursor = slug ? 'pointer' : 'grab';
      draw();
    }
  });

  canvas.addEventListener('pointerdown', (ev) => {
    touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (touches.size === 2) { pointer = null; pinchStart = null; return; }
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
    if (ev?.pointerId !== undefined) touches.delete(ev.pointerId);
    if (touches.size < 2) pinchStart = null;
    pointer = null;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerup', endPan);
  canvas.addEventListener('pointercancel', endPan);
  canvas.addEventListener('pointerleave', () => {
    endPan();
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
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      // Zoom about the cursor, not the origin, or the map runs away from you.
      zoomBy(ev.deltaY < 0 ? 1.12 : 0.89, mx, my);
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
    const chip = ev.target.closest('.chip');
    if (chip) open(chip.dataset.goto, chip.dataset.from);
  });

  let resizeTimer;
  let lastSize = '';
  const onResize = () => {
    const r = canvas.getBoundingClientRect();
    const sig = `${Math.round(r.width)}x${Math.round(r.height)}`;
    if (sig === lastSize || r.width < 2) return;   // hidden tab, or no real change
    lastSize = sig;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(relayout, 140);
  };

  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(onResize).observe(canvas);
  } else {
    window.addEventListener('resize', onResize);
  }

  // Zoom is not wheel-only: a trackpad-less mouse, a touch device and a keyboard
  // user all need a control they can actually reach.
  const centre = () => {
    const r = canvas.getBoundingClientRect();
    return [r.width / 2, r.height / 2];
  };
  document.getElementById('zoomin')?.addEventListener('click', () => zoomBy(1.25, ...centre()));
  document.getElementById('zoomout')?.addEventListener('click', () => zoomBy(0.8, ...centre()));
  document.getElementById('zoomfit')?.addEventListener('click', fit);

  relayout();
  renderHud();

  return {
    open,
    zoomBy,
    fit,
    reset() {
      progress = EMPTY;
      saveProgress(progress);
      selected = null;
      panel.hidden = true;
      renderHud();
      draw();
    },
    refresh: relayout,
  };
}
