export const STATE_LABEL = {
  aired: 'Aired',
  live: 'Live now',
  next: 'Up next',
  planned: 'Planned',
};

const endMs = (e) => Date.parse(e.starts_at) + e.duration_hours * 3600_000;

/**
 * Attach a derived `state` to every episode, given the current time.
 *
 * Nothing in the data file says which episode is next — the clock does. An
 * authored "next" field would go stale the moment an episode aired, and then
 * the public page would lie to everyone who opened it.
 */
export function deriveStates(entries, now) {
  const nowMs = Date.parse(now);
  const sorted = [...entries].sort((a, b) => a.episode - b.episode);

  const soonest = sorted
    .filter((e) => Date.parse(e.starts_at) > nowMs)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];

  return sorted.map((e) => {
    let state;
    if (nowMs >= endMs(e)) state = 'aired';
    else if (nowMs >= Date.parse(e.starts_at)) state = 'live';
    else if (soonest && e.episode === soonest.episode) state = 'next';
    else state = 'planned';
    return { ...e, state };
  });
}

/** The soonest episode that has not started yet, or null. */
export function nextEpisode(entries, now) {
  const nowMs = Date.parse(now);
  return (
    [...entries]
      .filter((e) => Date.parse(e.starts_at) > nowMs)
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0] ?? null
  );
}
