import { layoutRoutes } from './route-layout.js';
import { visit, traceRoute, summarise, isVisited, EMPTY } from './progress.js';
import { esc } from './escape.js';

/**
 * The glossary as four routes out of one origin.
 *
 * The earlier version was a force-directed graph, and a station's position
 * recorded only where the springs happened to stop. Here the routes are drawn
 * and the order along them is authored: further right is further through the
 * material. That is what makes it navigable rather than decorative.
 */

const LINE = {
  core: '#F5B82E',
  'claude-code': '#FF6A45',
  engineering: '#35D6CE',
  discipline: '#F473B4',
};

const GROUND = '#0B2A2E';
const INK = '#EAF6F4';
const MUTED = 'rgba(234, 246, 244, .58)';
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
    /* progress is a nicety; storage failure must never break the map */
  }
}

export function createMap({ canvas, panel, hud, stops, terms, lines, onOpen }) {
  const ctx = canvas.getContext('2d');
  const bySlug = new Map(terms.map((t) => [t.slug, t]));
  const lineByKey = new Map(lines.map((l) => [l.key, l]));

  let progress = loadProgress();
  let map = { stations: [], sections: [], interchanges: [], routes: [], origin: { x: 0, y: 0 } };
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
    k = Math.min(1.5, Math.max(0.72, Math.sqrt((box.width * box.height) / (1200 * 760))));
    map = layoutRoutes(lines, terms, box);
    view = { scale: 1, x: 0, y: 0 };
    renderStops(rect);
    draw();
  }

  function renderStops(rect) {
    // A stop that links to another line is an interchange, and a screen reader
    // user needs to be told that as plainly as a sighted one sees the connector.
    const changeHere = new Set();
    for (const link of map.interchanges) {
      changeHere.add(link.a.slug);
      changeHere.add(link.b.slug);
    }

    stops.innerHTML = map.stations
      .map(
        (s) => `<button type="button" class="stop" data-slug="${esc(s.slug)}"
            style="left:${(s.x / rect.width) * 100}%;top:${(s.y / rect.height) * 100}%"
            aria-label="Stop ${s.index + 1} on the ${esc(lineByKey.get(s.line)?.name ?? s.line)} line, ${esc(
              s.section ?? ''
            )}: ${esc(s.term)}${changeHere.has(s.slug) ? ', interchange - connects to another line' : ''}">${esc(s.term)}</button>`
      )
      .join('');
  }

  /* ------------------------------------------------------------ drawing --- */

  const P = (p) => ({ x: p.x * view.scale + view.x, y: p.y * view.scale + view.y });
  const S = (n) => n * k * Math.min(view.scale, 1.6);

  function draw() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const focus = hovered ?? selected;
    const focusStation = focus ? map.stations.find((s) => s.slug === focus) : null;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. the four routes
    for (const route of map.routes) {
      const dim = focusStation && focusStation.line !== route.key;
      ctx.strokeStyle = LINE[route.key];
      ctx.globalAlpha = dim ? 0.2 : 1;
      ctx.lineWidth = S(5.5);
      ctx.beginPath();
      route.points.forEach((p, i) => {
        const q = P(p);
        if (i === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      });
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 2. interchanges - the places one journey actually touches another
    ctx.setLineDash([S(3), S(4)]);
    ctx.lineWidth = S(1.4);
    ctx.strokeStyle = 'rgba(234,246,244,.32)';
    for (const link of map.interchanges) {
      const lit = focus && (link.a.slug === focus || link.b.slug === focus);
      ctx.globalAlpha = focus ? (lit ? 0.95 : 0.07) : 0.3;
      const pa = P(link.a);
      const pb = P(link.b);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // 3. section brackets - the blocks each journey is divided into
    if (view.scale > 0.85) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const sec of map.sections) {
        const dim = focusStation && focusStation.line !== sec.line;
        ctx.globalAlpha = dim ? 0.15 : 0.85;
        const a = P(sec.from);
        const b = P(sec.to);
        const y = sec.above ? Math.min(a.y, b.y) - S(17) : Math.max(a.y, b.y) + S(19);

        ctx.strokeStyle = LINE[sec.line];
        ctx.lineWidth = S(1.2);
        ctx.beginPath();
        ctx.moveTo(a.x, y);
        ctx.lineTo(b.x, y);
        ctx.stroke();

        ctx.font = `700 ${Math.round(S(9.5))}px Archivo, system-ui, sans-serif`;
        const text = sec.title.toUpperCase();
        const w = ctx.measureText(text).width + S(10);
        ctx.fillStyle = GROUND;
        ctx.fillRect(P(sec.label).x - w / 2, y - S(7), w, S(14));
        ctx.fillStyle = LINE[sec.line];
        ctx.fillText(text, P(sec.label).x, y);
      }
      ctx.globalAlpha = 1;
    }

    // 4. stations
    for (const s of map.stations) {
      const p = P(s);
      const seen = isVisited(progress, s.slug);
      const active = s.slug === focus;
      const dim = focusStation && focusStation.line !== s.line && !active;
      const isFirst = s.index === 0;

      ctx.globalAlpha = dim ? 0.2 : 1;
      const r = S(isFirst ? 8 : 5.5);

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = seen ? LINE[s.line] : GROUND;
      ctx.fill();
      ctx.strokeStyle = active ? '#FFFFFF' : LINE[s.line];
      ctx.lineWidth = S(active ? 3 : 2.2);
      ctx.stroke();

      const label = active || seen || isFirst || view.scale > 1.45;
      if (label && !dim) {
        ctx.font = `600 ${Math.round(S(10.5))}px Archivo, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        // Alternate above and below, so consecutive stops cannot collide.
        const below = s.index % 2 === 0;
        const y = below ? p.y + r + S(4) : p.y - r - S(15);
        ctx.lineWidth = S(3);
        ctx.strokeStyle = GROUND;
        ctx.strokeText(s.term, p.x, y);
        ctx.fillStyle = active ? '#FFFFFF' : seen ? INK : MUTED;
        ctx.fillText(s.term, p.x, y);
      }
      ctx.globalAlpha = 1;
    }

    // 5. the beacon - the first question a map has to answer is "where do I start?"
    const o = P(map.origin);
    ctx.beginPath();
    ctx.arc(o.x, o.y, S(12), 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.font = `800 ${Math.round(S(9))}px "Big Shoulders Display", Archivo, sans-serif`;
    ctx.fillStyle = GROUND;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START', o.x, o.y);
  }

  /* ----------------------------------------------------------- the HUD --- */

  function renderHud() {
    const s = summarise(terms, progress);
    const rows = lines
      .map((l) => {
        const stat = s.lines[l.key] ?? { visited: 0, total: 0, complete: false };
        const pct = stat.total ? Math.round((stat.visited / stat.total) * 100) : 0;
        return `<button type="button" class="line${stat.complete ? ' line--done' : ''}" data-line="${esc(l.key)}">
          <span class="line__dot" style="background:${LINE[l.key]}"></span>
          <span class="line__name">${esc(l.name)}</span>
          <span class="line__bar"><i style="width:${pct}%;background:${LINE[l.key]}"></i></span>
          <span class="line__n">${stat.visited}/${stat.total}</span>
          <span class="line__tag">${esc(l.tagline)}</span>
        </button>`;
      })
      .join('');

    hud.innerHTML = `<p class="hud__total"><strong>${s.visited}</strong> of ${s.total} stops
      &middot; <strong>${s.routes}</strong> interchanges used</p>${rows}`;
  }

  /* --------------------------------------------------------- the panel --- */

  function open(slug, from) {
    const t = bySlug.get(slug);
    if (!t) return;
    const station = map.stations.find((s) => s.slug === slug);

    progress = from ? traceRoute(progress, from, slug) : visit(progress, slug);
    saveProgress(progress);
    selected = slug;

    const line = lineByKey.get(t.category);
    const onLine = map.stations.filter((s) => s.line === t.category).sort((a, b) => a.index - b.index);
    const pos = station ? station.index : 0;
    const next = onLine[pos + 1];
    const prev = onLine[pos - 1];

    const related = (t.related ?? [])
      .filter((r) => bySlug.has(r))
      .map((r) => {
        const other = bySlug.get(r);
        const off = other.category !== t.category;
        return `<button type="button" class="chip${off ? ' chip--change' : ''}" data-goto="${esc(r)}" data-from="${esc(slug)}">
            <span class="chip__dot" style="background:${LINE[other.category]}"></span>${esc(other.term)}${
              off ? '<span class="chip__x">change here</span>' : ''
            }</button>`;
      })
      .join('');

    panel.innerHTML = `<article class="station">
      <p class="station__line" style="color:${LINE[t.category]}">${esc(line?.name ?? t.category)} &middot; stop ${pos + 1} of ${onLine.length}</p>
      <p class="station__section">${esc(station?.section ?? '')}</p>
      <h3 class="station__term">${esc(t.term)}</h3>
      <p class="station__short">${esc(t.short)}</p>
      <p class="station__why"><b>Why it matters.</b> ${esc(t.why)}</p>
      <p class="station__hear">${esc(t.hear_it)}</p>
      <nav class="stepper">
        ${prev ? `<button type="button" class="step" data-goto="${esc(prev.slug)}">&larr; ${esc(prev.term)}</button>` : '<span></span>'}
        ${next ? `<button type="button" class="step step--next" data-goto="${esc(next.slug)}" data-from="${esc(slug)}">${esc(next.term)} &rarr;</button>` : '<span class="step step--end">End of the line</span>'}
      </nav>
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
    let bestD = 24 * k;
    for (const s of map.stations) {
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

  // Clicking a line in the legend opens its first stop: the "where do I start
  // on this journey" answer.
  hud.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-line]');
    if (!el) return;
    const first = map.stations.find((s) => s.line === el.dataset.line && s.index === 0);
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
