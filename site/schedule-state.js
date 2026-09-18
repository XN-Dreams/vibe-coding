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

/**
 * Absolute UTC start and end for each programme block, plus which one is
 * running at `now`.
 *
 * Blocks are stored as OFFSETS, never absolute times, so moving an episode to
 * a different day or hour carries its whole programme with it — there is no
 * second set of timestamps to keep in sync by hand.
 */
export function blockTimes(episode, now) {
  const base = Date.parse(episode.starts_at);
  const nowMs = now === undefined ? NaN : Date.parse(now);

  return (episode.blocks ?? []).map((b) => {
    const startMs = base + b.offset_minutes * 60_000;
    const endMs = startMs + b.duration_minutes * 60_000;
    return {
      ...b,
      starts_at: new Date(startMs).toISOString(),
      ends_at: new Date(endMs).toISOString(),
      current: Number.isNaN(nowMs) ? false : nowMs >= startMs && nowMs < endMs,
    };
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
