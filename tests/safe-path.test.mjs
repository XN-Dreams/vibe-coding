import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, sep } from 'node:path';
import { resolveSitePath } from '../scripts/lib/safe-path.mjs';

const ROOT = join('C:', 'repo', 'site');

test('serves index.html for the bare root', () => {
  assert.equal(resolveSitePath(ROOT, '/'), join(ROOT, 'index.html'));
});

test('serves a normal file inside the root', () => {
  assert.equal(resolveSitePath(ROOT, '/styles.css'), join(ROOT, 'styles.css'));
});

test('serves a file in a subdirectory of the root', () => {
  assert.equal(resolveSitePath(ROOT, '/assets/logo.svg'), join(ROOT, 'assets', 'logo.svg'));
});

test('refuses a parent-directory escape', () => {
  assert.equal(resolveSitePath(ROOT, '/../package.json'), null);
});

test('refuses a deep escape', () => {
  assert.equal(resolveSitePath(ROOT, '/../../../../etc/passwd'), null);
});

test('refuses a percent-encoded escape', () => {
  assert.equal(resolveSitePath(ROOT, '/..%2fpackage.json'), null);
});

// The bug a plain startsWith(root) check lets through: a SIBLING directory
// whose name merely begins with the root's name. Demonstrated live against the
// running server in episode 1 — it returned 200 and leaked the file.
test('refuses a sibling directory that shares the root name as a prefix', () => {
  assert.equal(resolveSitePath(ROOT, '/../site-secret/leak.txt'), null);
});

test('refuses the root directory itself', () => {
  assert.equal(resolveSitePath(ROOT, '/..'), null);
});

test('refuses malformed percent-encoding instead of throwing', () => {
  assert.equal(resolveSitePath(ROOT, '/%zz'), null);
});

test('ignores the query string', () => {
  assert.equal(resolveSitePath(ROOT, '/app.js?v=2'), join(ROOT, 'app.js'));
});

test('allows a filename that merely starts with dots', () => {
  assert.equal(resolveSitePath(ROOT, '/..hidden.txt'), join(ROOT, '..hidden.txt'));
});
