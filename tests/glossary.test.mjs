import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateGlossary } from '../scripts/lib/glossary.mjs';

const valid = {
  term: 'Token',
  slug: 'token',
  category: 'core',
  short: 'A chunk of text the model counts in — roughly three quarters of a word.',
  why: 'Everything you pay for and every limit you hit is measured in these.',
  hear_it: '"That blew the token budget."',
  related: [],
};

test('accepts a well-formed entry', () => {
  const result = validateGlossary([valid]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('rejects an entry missing a required field', () => {
  const { why, ...missing } = valid;
  const result = validateGlossary([missing]);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /token.*why/i);
});

test('rejects an unknown category', () => {
  const result = validateGlossary([{ ...valid, category: 'made-up' }]);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /category/i);
});

test('rejects a slug that is not lowercase-hyphenated', () => {
  for (const bad of ['Token', 'two words', 'quote"s', '<script>']) {
    const result = validateGlossary([{ ...valid, slug: bad }]);
    assert.equal(result.ok, false, `expected "${bad}" to be rejected`);
    assert.match(result.errors[0], /slug/i);
  }
});

test('rejects duplicate slugs', () => {
  const result = validateGlossary([valid, { ...valid, term: 'Token (again)' }]);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /duplicate/i);
});

test('rejects a related slug that points at no entry', () => {
  const result = validateGlossary([{ ...valid, related: ['ghost-term'] }]);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /ghost-term/);
});

test('accepts a related slug that points at a real entry', () => {
  const other = { ...valid, term: 'Prompt', slug: 'prompt' };
  const result = validateGlossary([{ ...valid, related: ['prompt'] }, other]);
  assert.equal(result.ok, true);
});

test('reports every error, not just the first', () => {
  const result = validateGlossary([
    { ...valid, slug: 'a', category: 'nope' },
    { ...valid, slug: 'b', related: ['ghost'] },
  ]);
  assert.equal(result.errors.length, 2);
});
