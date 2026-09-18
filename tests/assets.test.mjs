import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';

/**
 * Structural guard over the published site.
 *
 * `npm run check` only compares the files it already knows how to generate, so
 * when the map started fetching lines.json and the build had no target for it,
 * check still reported "up to date" and CI would have deployed a map with no
 * data in it. Nothing compared what the page ASKS FOR against what ships.
 */

const siteDir = new URL('../site/', import.meta.url);
const files = await readdir(siteDir);
const scripts = files.filter((f) => f.endsWith('.js'));
const sources = Object.fromEntries(
  await Promise.all(scripts.map(async (f) => [f, await readFile(new URL(f, siteDir), 'utf8')]))
);

const exists = async (name) => {
  try {
    await access(new URL(name, siteDir));
    return true;
  } catch {
    return false;
  }
};

test('every file the page fetches at runtime is actually published', async () => {
  const fetched = new Set();
  for (const src of Object.values(sources)) {
    for (const m of src.matchAll(/fetch\(\s*['"]([^'"]+)['"]/g)) fetched.add(m[1]);
  }
  assert.ok(fetched.size > 0, 'no fetch() calls found — this guard would pass vacuously');

  for (const name of fetched) {
    assert.ok(await exists(name), `site/${name} is fetched at runtime but not present in site/`);
  }
});

test('every module the page imports is actually published', async () => {
  for (const [file, src] of Object.entries(sources)) {
    for (const m of src.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g)) {
      assert.ok(await exists(m[1]), `site/${file} imports ./${m[1]}, which is not in site/`);
    }
  }
});

test('index.html references only files that exist', async () => {
  const html = await readFile(new URL('index.html', siteDir), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="(?!https?:|#|mailto:)([^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 0, 'no local references found in index.html');
  for (const ref of refs) {
    assert.ok(await exists(ref), `index.html references ${ref}, which is not in site/`);
  }
});

test('generated site data matches its source in data/', async () => {
  for (const [src, out] of [
    ['glossary.json', 'glossary.json'],
    ['schedule.json', 'schedule.json'],
    ['lines.json', 'lines.json'],
  ]) {
    const a = JSON.parse(await readFile(new URL(`../data/${src}`, import.meta.url), 'utf8'));
    const b = JSON.parse(await readFile(new URL(out, siteDir), 'utf8'));
    assert.deepEqual(b, a, `site/${out} is stale — run npm run build`);
  }
});
