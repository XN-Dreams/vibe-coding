import { deriveStates, nextEpisode, blockTimes, STATE_LABEL } from '../../site/schedule-state.js';

export { deriveStates, nextEpisode, blockTimes, STATE_LABEL };

const endMs = (e) => Date.parse(e.starts_at) + e.duration_hours * 3600_000;

const REQUIRED = ['episode', 'slug', 'title', 'starts_at', 'duration_hours', 'summary', 'covers'];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/**
 * Validate the schedule.
 *
 * Note what is NOT here: a hand-written status field. An authored "next" goes
 * stale the moment the episode airs, and then the public page lies to everyone
 * who opens it. State is derived from the timestamps instead — see deriveStates.
 * The data carries facts; the clock carries state.
 */
export function validateSchedule(entries) {
  const errors = [];
  const seenEpisode = new Set();
  const seenSlug = new Set();

  for (const e of entries) {
    const id = e?.slug ?? `episode ${e?.episode}` ?? '(unnamed)';

    for (const field of REQUIRED) {
      if (e?.[field] === undefined) errors.push(`${id}: missing required field "${field}"`);
    }

    if (!Number.isInteger(e?.episode) || e.episode < 1) {
      errors.push(`${id}: episode must be a positive integer`);
    } else if (seenEpisode.has(e.episode)) {
      errors.push(`${id}: duplicate episode number ${e.episode}`);
    } else {
      seenEpisode.add(e.episode);
    }

    if (e?.slug !== undefined) {
      if (!SLUG.test(e.slug)) errors.push(`${id}: slug must be lowercase letters, digits and hyphens`);
      else if (seenSlug.has(e.slug)) errors.push(`${id}: duplicate slug "${e.slug}"`);
      else seenSlug.add(e.slug);
    }

    if (typeof e?.duration_hours !== 'number' || e.duration_hours <= 0) {
      errors.push(`${id}: duration_hours must be a positive number`);
    }

    if (e?.starts_at !== undefined) {
      if (typeof e.starts_at !== 'string' || Number.isNaN(Date.parse(e.starts_at))) {
        errors.push(`${id}: starts_at must be an ISO 8601 timestamp`);
      } else if (!ISO_UTC.test(e.starts_at)) {
        // A bare local-time string means every viewer in a different timezone
        // reads a different, wrong start time. Demand the Z.
        errors.push(`${id}: starts_at must end in Z (explicit UTC), got "${e.starts_at}"`);
      }
    }

    if (e?.covers !== undefined && !Array.isArray(e.covers)) {
      errors.push(`${id}: covers must be an array`);
    }

    if (e?.blocks !== undefined) errors.push(...blockErrors(e, id));
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Programme blocks are what make an eight-hour stream followable: a viewer can
 * see that "the framework question" starts at 18:50 their time and join for
 * that. Which means a published block time is a promise, so the invariants are
 * strict — no overlaps, no gaps out of order, nothing running past the end.
 */
function blockErrors(e, id) {
  const errors = [];

  if (!Array.isArray(e.blocks)) return [`${id}: blocks must be an array`];

  const windowMinutes = (e.duration_hours ?? 0) * 60;
  let prevEnd = -1;
  let prevOffset = -1;

  for (const [i, b] of e.blocks.entries()) {
    const where = `${id} block ${i + 1}`;

    if (typeof b?.title !== 'string' || b.title.trim() === '') {
      errors.push(`${where}: missing title`);
    }
    if (!Number.isFinite(b?.offset_minutes) || b.offset_minutes < 0) {
      errors.push(`${where}: offset_minutes must be zero or more`);
      continue;
    }
    if (!Number.isFinite(b?.duration_minutes) || b.duration_minutes <= 0) {
      errors.push(`${where}: duration_minutes must be a positive number`);
      continue;
    }

    if (b.offset_minutes < prevOffset) {
      errors.push(`${where}: blocks must be listed in start order`);
    } else if (b.offset_minutes < prevEnd) {
      errors.push(`${where} ("${b.title}") overlaps the block before it`);
    }
    if (b.offset_minutes + b.duration_minutes > windowMinutes) {
      errors.push(`${where} ("${b.title}") runs past the end of the episode`);
    }

    prevOffset = b.offset_minutes;
    prevEnd = b.offset_minutes + b.duration_minutes;
  }

  return errors;
}


/**
 * Non-fatal drift warnings. Deliberately NOT errors: a stale recap link should
 * not block an unrelated deploy at 1am after a stream.
 */
export function scheduleWarnings(entries, now) {
  const nowMs = Date.parse(now);
  const warnings = [];
  for (const e of entries) {
    if (nowMs >= endMs(e) && !e.links?.vod && !e.links?.recap) {
      warnings.push(`episode ${e.episode} (${e.slug}) has aired but has no vod or recap link`);
    }
  }
  if (nextEpisode(entries, now) === null && entries.length > 0) {
    warnings.push('no future episodes scheduled — the site will show an empty "up next"');
  }
  return warnings;
}

export function renderScheduleMarkdown(entries) {
  const rows = [...entries].sort((a, b) => a.episode - b.episode);
  const lines = [
    '# Schedule',
    '',
    '> Generated from `data/schedule.json` by `npm run build`. Do not hand-edit.',
    '',
    'All times below are UTC. [The site](https://xn-dreams.github.io/vibe-coding/#schedule)',
    'shows them in your own timezone.',
    '',
    '| # | Episode | Starts (UTC) | Length |',
    '|---|---------|--------------|--------|',
  ];

  for (const e of rows) {
    const when = e.starts_at.replace('T', ' ').replace(/:00(\.\d+)?Z$/, ' UTC');
    lines.push(`| ${e.episode} | ${e.title} | ${when} | ${e.duration_hours}h |`);
  }

  lines.push('');
  for (const e of rows) {
    lines.push(`### ${e.episode}. ${e.title}`, '', e.summary, '');
    if (e.covers?.length) lines.push(`**Covers.** ${e.covers.join(' · ')}`, '');
  }

  return lines.join('\n');
}
