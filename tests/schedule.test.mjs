import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSchedule,
  deriveStates,
  nextEpisode,
  scheduleWarnings,
  renderScheduleMarkdown,
  blockTimes,
} from '../scripts/lib/schedule.mjs';

const ep = (n, startsAt, extra = {}) => ({
  episode: n,
  slug: `episode-${n}`,
  title: `Episode ${n}`,
  starts_at: startsAt,
  duration_hours: 8,
  summary: 'What happens in this one.',
  covers: ['A thing', 'Another thing'],
  links: {},
  ...extra,
});

const EP1 = ep(1, '2026-09-18T16:00:00Z', { links: { recap: 'https://example.com/ep1' } });
const EP2 = ep(2, '2026-09-21T16:00:00Z');
const EP3 = ep(3, '2026-09-28T16:00:00Z');

// ---------- validation ----------

test('accepts a well-formed schedule', () => {
  const r = validateSchedule([EP1, EP2, EP3]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
});

test('rejects a missing required field', () => {
  const { summary, ...broken } = EP2;
  const r = validateSchedule([broken]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /summary/i);
});

test('rejects a non-ISO start time', () => {
  const r = validateSchedule([{ ...EP2, starts_at: 'Monday 6pm' }]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /iso/i);
});

// A bare local timestamp is the bug that silently shows every overseas viewer
// the wrong hour, so it is rejected outright rather than coerced.
test('rejects a start time without an explicit UTC marker', () => {
  const r = validateSchedule([{ ...EP2, starts_at: '2026-09-21T16:00:00' }]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /utc|z\b/i);
});

test('rejects a duplicate episode number', () => {
  const r = validateSchedule([EP1, { ...EP2, episode: 1 }]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /duplicate episode/i);
});

test('rejects a duplicate slug', () => {
  const r = validateSchedule([EP1, { ...EP2, slug: 'episode-1' }]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /duplicate slug/i);
});

test('rejects a malformed slug', () => {
  const r = validateSchedule([{ ...EP2, slug: 'Episode Two' }]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /slug/i);
});

test('rejects a non-positive duration', () => {
  for (const bad of [0, -1, '8']) {
    const r = validateSchedule([{ ...EP2, duration_hours: bad }]);
    assert.equal(r.ok, false, `expected ${bad} to be rejected`);
    assert.match(r.errors[0], /duration/i);
  }
});

test('reports every error, not just the first', () => {
  const r = validateSchedule([
    { ...EP2, episode: 0 },
    { ...EP3, duration_hours: -1 },
  ]);
  assert.ok(r.errors.length >= 2);
});

// ---------- derived state ----------

test('derives aired for an episode that has finished', () => {
  const [a] = deriveStates([EP1], '2026-09-19T12:00:00Z');
  assert.equal(a.state, 'aired');
});

test('derives live during the broadcast window', () => {
  const [a] = deriveStates([EP1], '2026-09-18T20:00:00Z');
  assert.equal(a.state, 'live');
});

test('derives next for the soonest future episode only', () => {
  const states = deriveStates([EP1, EP2, EP3], '2026-09-19T12:00:00Z');
  assert.deepEqual(states.map((e) => e.state), ['aired', 'next', 'planned']);
});

// The whole reason state is derived: an un-updated file cannot lie. Roll the
// clock forward past episode 2 without touching the data and "next" moves on
// by itself.
test('next advances on its own once an episode airs, with no data change', () => {
  const before = deriveStates([EP1, EP2, EP3], '2026-09-19T12:00:00Z');
  const after = deriveStates([EP1, EP2, EP3], '2026-09-22T12:00:00Z');
  assert.equal(before.find((e) => e.state === 'next').episode, 2);
  assert.equal(after.find((e) => e.state === 'next').episode, 3);
});

test('an episode exactly at its start time is live, not next', () => {
  const [a] = deriveStates([EP1], '2026-09-18T16:00:00Z');
  assert.equal(a.state, 'live');
});

test('an episode exactly at its end time has aired', () => {
  const [a] = deriveStates([EP1], '2026-09-19T00:00:00Z');
  assert.equal(a.state, 'aired');
});

test('nextEpisode returns the soonest episode that has not started', () => {
  assert.equal(nextEpisode([EP1, EP3, EP2], '2026-09-19T12:00:00Z').episode, 2);
});

test('nextEpisode returns null when every episode is in the past', () => {
  assert.equal(nextEpisode([EP1, EP2, EP3], '2027-01-01T00:00:00Z'), null);
});

// ---------- drift warnings (non-fatal) ----------

test('warns about an aired episode with no recap or vod link', () => {
  const w = scheduleWarnings([EP1, EP2], '2026-09-22T12:00:00Z');
  assert.ok(w.some((m) => /episode 2/.test(m) && /recap|vod/.test(m)));
});

test('does not warn about an aired episode that has a recap link', () => {
  const w = scheduleWarnings([EP1], '2026-09-19T12:00:00Z');
  assert.ok(!w.some((m) => /episode 1/.test(m)));
});

test('warns when the series has run out of future episodes', () => {
  const w = scheduleWarnings([EP1], '2027-01-01T00:00:00Z');
  assert.ok(w.some((m) => /no future episodes/i.test(m)));
});

// ---------- markdown ----------

test('renders episodes in episode order regardless of input order', () => {
  const md = renderScheduleMarkdown([EP3, EP1, EP2]);
  assert.ok(md.indexOf('Episode 1') < md.indexOf('Episode 2'));
  assert.ok(md.indexOf('Episode 2') < md.indexOf('Episode 3'));
});

test('carries the do-not-edit banner', () => {
  assert.match(renderScheduleMarkdown([EP1]), /generated/i);
});

test('markdown render is deterministic', () => {
  assert.equal(renderScheduleMarkdown([EP1, EP2]), renderScheduleMarkdown([EP1, EP2]));
});

// ---------- programme blocks ----------

const withBlocks = (blocks) => ({ ...EP2, blocks });

test('accepts blocks that tile the episode window in order', () => {
  const r = validateSchedule([
    withBlocks([
      { offset_minutes: 0, duration_minutes: 240, title: 'First half', detail: 'x' },
      { offset_minutes: 240, duration_minutes: 240, title: 'Second half', detail: 'y' },
    ]),
  ]);
  assert.equal(r.ok, true, r.errors.join('; '));
});

test('rejects blocks that overlap', () => {
  const r = validateSchedule([
    withBlocks([
      { offset_minutes: 0, duration_minutes: 200, title: 'A', detail: 'x' },
      { offset_minutes: 150, duration_minutes: 100, title: 'B', detail: 'y' },
    ]),
  ]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /overlap/i);
});

test('rejects blocks listed out of order', () => {
  const r = validateSchedule([
    withBlocks([
      { offset_minutes: 240, duration_minutes: 100, title: 'B', detail: 'y' },
      { offset_minutes: 0, duration_minutes: 100, title: 'A', detail: 'x' },
    ]),
  ]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /order/i);
});

// The invariant that matters to a viewer: a published block time must fall
// inside the stream. A block that runs past the end is a promise we cannot keep.
test('rejects a block that runs past the end of the episode', () => {
  const r = validateSchedule([
    withBlocks([{ offset_minutes: 0, duration_minutes: 600, title: 'Too long', detail: 'x' }]),
  ]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /past the end|exceeds/i);
});

test('rejects a block with a non-positive duration', () => {
  const r = validateSchedule([
    withBlocks([{ offset_minutes: 0, duration_minutes: 0, title: 'Nothing', detail: 'x' }]),
  ]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /duration/i);
});

test('rejects a block missing a title', () => {
  const r = validateSchedule([withBlocks([{ offset_minutes: 0, duration_minutes: 60, detail: 'x' }])]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /title/i);
});

test('treats blocks as optional', () => {
  const { blocks, ...noBlocks } = withBlocks([]);
  assert.equal(validateSchedule([noBlocks]).ok, true);
});

test('blockTimes returns an absolute UTC start for each block', () => {
  const e = withBlocks([
    { offset_minutes: 0, duration_minutes: 150, title: 'A', detail: 'x' },
    { offset_minutes: 170, duration_minutes: 160, title: 'B', detail: 'y' },
  ]);
  const times = blockTimes(e);
  assert.equal(times[0].starts_at, '2026-09-21T16:00:00.000Z');
  assert.equal(times[1].starts_at, '2026-09-21T18:50:00.000Z');
});

test('blockTimes marks which block is running at a given moment', () => {
  const e = withBlocks([
    { offset_minutes: 0, duration_minutes: 150, title: 'A', detail: 'x' },
    { offset_minutes: 150, duration_minutes: 150, title: 'B', detail: 'y' },
  ]);
  const times = blockTimes(e, '2026-09-21T19:00:00Z');
  assert.deepEqual(times.map((b) => b.current), [false, true]);
});
