import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterTerms } from '../site/filter.js';

const entries = [
  { term: 'Token', slug: 'token', category: 'core', short: 'A chunk of text.',
    why: 'Limits are measured in these.', hear_it: '"Out of tokens."', related: [] },
  { term: 'Pull request', slug: 'pull-request', category: 'engineering',
    short: 'A proposal to merge your branch.', why: 'It is where review happens.',
    hear_it: '"Open a PR."', related: [] },
];

test('returns every entry for an empty query', () => {
  assert.equal(filterTerms(entries, '').length, 2);
});

test('returns every entry for a whitespace-only query', () => {
  assert.equal(filterTerms(entries, '   ').length, 2);
});

test('matches on the term, case-insensitively', () => {
  const result = filterTerms(entries, 'TOKEN');
  assert.equal(result.length, 1);
  assert.equal(result[0].slug, 'token');
});

test('matches on the definition body, not just the term', () => {
  const result = filterTerms(entries, 'merge');
  assert.equal(result[0].slug, 'pull-request');
});

test('ignores surrounding whitespace in the query', () => {
  assert.equal(filterTerms(entries, '  token  ').length, 1);
});

test('returns an empty array when nothing matches', () => {
  assert.deepEqual(filterTerms(entries, 'zzzz'), []);
});

test('does not mutate the input array', () => {
  const copy = [...entries];
  filterTerms(entries, 'token');
  assert.deepEqual(entries, copy);
});
