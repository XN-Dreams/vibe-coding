/**
 * Progress through the glossary network.
 *
 * Two mechanics, both additive by design: you VISIT a station by opening it, and
 * you TRACE a route by following a "see also" link from one term to a connected
 * one. Nothing here ever subtracts. There is no streak to break and no score that
 * falls — the glossary is for people who already feel behind, and a progress bar
 * that punishes them is worse than no progress bar.
 *
 * State is plain arrays so it round-trips through localStorage unchanged.
 */

export const EMPTY = { visited: [], routes: [] };

const routeKey = (a, b) => [a, b].sort().join('~');

export function visit(state, slug) {
  if (state.visited.includes(slug)) return state;
  return { ...state, visited: [...state.visited, slug] };
}

/** Following a see-also link. Counts the route, and both stations it joins. */
export function traceRoute(state, from, to) {
  const key = routeKey(from, to);
  const routes = state.routes.includes(key) ? state.routes : [...state.routes, key];
  return visit(visit({ ...state, routes }, from), to);
}

export function summarise(terms, state) {
  // Only count slugs that still exist. A term deleted from the glossary must not
  // leave someone stranded above 100% with no way to get back down.
  const live = new Set(terms.map((t) => t.slug));
  const visited = state.visited.filter((s) => live.has(s));

  const lines = {};
  for (const t of terms) {
    lines[t.category] ??= { visited: 0, total: 0, complete: false };
    lines[t.category].total++;
    if (visited.includes(t.slug)) lines[t.category].visited++;
  }
  for (const line of Object.values(lines)) {
    line.complete = line.total > 0 && line.visited === line.total;
  }

  return {
    visited: visited.length,
    total: terms.length,
    percent: terms.length === 0 ? 0 : Math.floor((visited.length / terms.length) * 100),
    routes: state.routes.length,
    lines,
  };
}

export function isVisited(state, slug) {
  return state.visited.includes(slug);
}
