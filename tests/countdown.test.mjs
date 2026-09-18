import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCountdown, formatLocal, msUntil } from '../site/countdown.js';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

test('formats a multi-day countdown', () => {
  assert.equal(formatCountdown(3 * DAY + 4 * HOUR), '3 days, 4 hours');
});

test('singularises one day and one hour', () => {
  assert.equal(formatCountdown(1 * DAY + 1 * HOUR), '1 day, 1 hour');
});

test('drops to hours and minutes inside a day', () => {
  assert.equal(formatCountdown(5 * HOUR + 20 * MIN), '5 hours, 20 min');
});

test('drops to minutes only inside an hour', () => {
  assert.equal(formatCountdown(20 * MIN), '20 min');
});

test('reads as starting now at zero and below', () => {
  assert.equal(formatCountdown(0), 'now');
  assert.equal(formatCountdown(-5 * HOUR), 'now');
});

test('rounds down rather than up, so it never overstates time remaining', () => {
  assert.equal(formatCountdown(59_999), '0 min');
});

test('msUntil measures from the reference time, not the wall clock', () => {
  assert.equal(msUntil('2026-09-21T16:00:00Z', '2026-09-21T15:00:00Z'), HOUR);
});

// The bug this guards: a viewer in Mexico City and a viewer in Berlin must see
// their OWN local hour for the same instant, not the publisher's.
test('renders the same instant differently in different timezones', () => {
  const iso = '2026-09-21T16:00:00Z';
  const utc = formatLocal(iso, 'UTC');
  const mx = formatLocal(iso, 'America/Mexico_City');
  const berlin = formatLocal(iso, 'Europe/Berlin');
  assert.match(utc, /16:00/);
  assert.match(mx, /10:00/);
  assert.match(berlin, /18:00/);
  assert.notEqual(mx, berlin);
});

test('includes the weekday, so a viewer knows which day it lands on locally', () => {
  assert.match(formatLocal('2026-09-21T16:00:00Z', 'UTC'), /Mon/);
});

// Crossing midnight is where naive "just add the offset" code gets the day wrong.
test('reports the correct local weekday when the offset crosses midnight', () => {
  const late = formatLocal('2026-09-22T02:00:00Z', 'America/Mexico_City');
  assert.match(late, /Mon/);
  assert.match(late, /20:00/);
});
