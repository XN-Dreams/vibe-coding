import { filterTerms } from './filter.js';
import { CATEGORY_TITLES } from './categories.js';
import { deriveStates, STATE_LABEL, blockTimes } from './schedule-state.js';
import { formatCountdown, formatLocal, msUntil, viewerTimeZone } from './countdown.js';
import { esc, safeUrl } from './escape.js';
import { createMap } from './map.js';

const [terms, schedule, plant] = await Promise.all([
  fetch('glossary.json').then((r) => r.json()),
  fetch('schedule.json').then((r) => r.json()),
  fetch('plant.json').then((r) => r.json()),
]);

/* ---------------------------------------------------------------- tabs --- */

const VIEWS = ['map', 'schedule', 'glossary'];

function showView(name) {
  const view = VIEWS.includes(name) ? name : 'map';
  for (const v of VIEWS) {
    document.getElementById(`view-${v}`).hidden = v !== view;
    document.getElementById(`tab-${v}`).setAttribute('aria-current', v === view ? 'page' : 'false');
  }
}

// The hash IS the route, so every tab is linkable and the back button works.
// That is the whole feature: "#schedule" can be pasted into stream chat.
window.addEventListener('hashchange', () => {
  showView(location.hash.slice(1));
  // The canvas has no size while its tab is hidden, so it must be laid out
  // again the first time it becomes visible or it renders into a zero box.
  if (location.hash.slice(1) === 'map') network?.refresh();
});

/* ------------------------------------------------------------ schedule --- */

const tz = viewerTimeZone();
document.getElementById('tzline').textContent =
  `Times shown in your timezone (${tz}). The stream starts at 16:00 UTC.`;

const hhmm = (iso) =>
  new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
    .format(new Date(iso));

function programme(e, now) {
  const blocks = blockTimes(e, now);
  if (blocks.length === 0) return '';

  const rows = blocks
    .map(
      (b) => `<li class="blk${b.current ? ' blk--now' : ''}">
        <span class="blk__time">${esc(hhmm(b.starts_at))}</span>
        <span class="blk__title">${esc(b.title)}${b.current ? ' <em>on now</em>' : ''}</span>
        <span class="blk__detail">${esc(b.detail ?? '')}</span>
      </li>`
    )
    .join('');

  return `<details class="prog"${e.state === 'live' || e.state === 'next' ? ' open' : ''}>
    <summary>Running order &middot; ${blocks.length} blocks, in your time</summary>
    <ol class="blocks">${rows}</ol>
  </details>`;
}

function episodeCard(e, now) {
  const when = formatLocal(e.starts_at, tz);
  const covers = (e.covers ?? [])
    .map((c) => `<li>${esc(c)}</li>`)
    .join('');
  const links = Object.entries(e.links ?? {})
    .map(([k, v]) => `<a href="${esc(safeUrl(v))}">${esc(k)}</a>`)
    .join('');

  return `<article class="ep ep--${e.state}">
    <div class="ep__rail">
      <span class="ep__num">${e.episode}</span>
      <span class="ep__state">${STATE_LABEL[e.state]}</span>
    </div>
    <div class="ep__body">
      <h3 class="ep__title">${esc(e.title)}</h3>
      <p class="ep__when"><time datetime="${esc(e.starts_at)}">${esc(when)}</time> &middot; ${e.duration_hours}h</p>
      <p class="ep__summary">${esc(e.summary)}</p>
      ${covers ? `<ul class="ep__covers">${covers}</ul>` : ''}
      ${programme(e, now)}
      ${links ? `<p class="ep__links">${links}</p>` : ''}
    </div>
  </article>`;
}

function renderSchedule() {
  const now = new Date().toISOString();
  const episodes = deriveStates(schedule, now);

  document.getElementById('episodes').innerHTML = episodes.map((e) => episodeCard(e, now)).join('');

  const live = episodes.find((e) => e.state === 'live');
  const next = episodes.find((e) => e.state === 'next');
  const box = document.getElementById('upnext');

  if (live) {
    box.className = 'upnext upnext--live';
    box.innerHTML = `<p class="upnext__label">Live now</p>
      <p class="upnext__title">${esc(live.episode)}. ${esc(live.title)}</p>
      <p class="upnext__meta">Started ${esc(formatLocal(live.starts_at, tz))}</p>`;
    return;
  }

  if (!next) {
    box.className = 'upnext upnext--done';
    box.innerHTML = `<p class="upnext__label">Season complete</p>
      <p class="upnext__title">All ${episodes.length} episodes have aired</p>
      <p class="upnext__meta">The repo and the glossary stay up.</p>`;
    return;
  }

  box.className = 'upnext upnext--next';
  box.innerHTML = `<p class="upnext__label">Up next &middot; in ${esc(formatCountdown(msUntil(next.starts_at, now)))}</p>
    <p class="upnext__title">${esc(next.episode)}. ${esc(next.title)}</p>
    <p class="upnext__meta">${esc(formatLocal(next.starts_at, tz))} &middot; ${next.duration_hours} hours</p>`;
}

renderSchedule();
// Re-derive every minute so the countdown ticks and "next" rolls over on its
// own when an episode starts — without anyone editing a file.
setInterval(renderSchedule, 60_000);

/* ------------------------------------------------------------ glossary --- */

const results = document.getElementById('results');
const count = document.getElementById('count');
const input = document.getElementById('q');

function termCard(e) {
  return `<article class="term" id="${e.slug}">
    <h3>${esc(e.term)}</h3>
    <p class="short">${esc(e.short)}</p>
    <p class="why"><strong>Why it matters.</strong> ${esc(e.why)}</p>
    <p class="hear"><strong>You'll hear it.</strong> ${esc(e.hear_it)}</p>
  </article>`;
}

function renderGlossary(list) {
  count.textContent = `${list.length} of ${terms.length} terms`;

  if (list.length === 0) {
    results.innerHTML =
      '<p class="empty">No term matches that. Try a shorter word &mdash; or open a pull request and add it.</p>';
    return;
  }

  results.innerHTML = Object.entries(CATEGORY_TITLES)
    .map(([key, title]) => {
      const group = list
        .filter((e) => e.category === key)
        .sort((a, b) => a.term.localeCompare(b.term, 'en'));
      if (group.length === 0) return '';
      return `<section><h2>${esc(title)}</h2>${group.map(termCard).join('')}</section>`;
    })
    .join('');
}

input.addEventListener('input', () => renderGlossary(filterTerms(terms, input.value)));
renderGlossary(terms);


/* ------------------------------------------------------------- network --- */

const network = createMap({
  canvas: document.getElementById('netcanvas'),
  panel: document.getElementById('netpanel'),
  hud: document.getElementById('nethud'),
  stops: document.getElementById('netstops'),
  terms,
  plant,
});

// Routing runs last: the map must exist before a #map hash can lay it out.
showView(location.hash.slice(1));
if (location.hash.slice(1) !== 'map') network.refresh();
