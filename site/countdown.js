const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Milliseconds from `now` until `iso`. Negative once it has started. */
export function msUntil(iso, now) {
  return Date.parse(iso) - Date.parse(now);
}

/**
 * Human countdown. Always rounds DOWN, so it can never tell someone they have
 * more time than they do.
 */
export function formatCountdown(ms) {
  if (ms <= 0) return 'now';

  const minutes = Math.floor(ms / MIN);
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;

  if (days > 0) return `${plural(days, 'day')}, ${plural(hours, 'hour')}`;
  if (hours > 0) return `${plural(hours, 'hour')}, ${mins} min`;
  return `${mins} min`;
}

/**
 * Render a UTC instant in a viewer's own timezone.
 *
 * Intl does the offset AND the calendar arithmetic, which is the part that
 * matters: an episode at 02:00 UTC Tuesday is Monday evening in Mexico City,
 * and code that just adds an offset to the hour gets that day wrong.
 */
export function formatLocal(iso, timeZone, locale = 'en-GB') {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
    timeZoneName: 'short',
  }).format(new Date(iso));
}

/** The viewer's own timezone, with a sane fallback if the browser will not say. */
export function viewerTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
