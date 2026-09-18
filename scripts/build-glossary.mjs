import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateGlossary, renderMarkdown } from './lib/glossary.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const raw = await readFile(join(root, 'data/glossary.json'), 'utf8');
const entries = JSON.parse(raw);

const { ok, errors } = validateGlossary(entries);
if (!ok) {
  console.error(`Glossary validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const targets = [
  [join(root, 'docs/glossary.md'), renderMarkdown(entries)],
  [join(root, 'site/glossary.json'), `${JSON.stringify(entries, null, 2)}\n`],
];

let stale = false;
for (const [path, content] of targets) {
  const current = await readFile(path, 'utf8').catch(() => null);
  if (current === content) continue;
  stale = true;
  if (check) console.error(`Out of date: ${path}`);
  else await writeFile(path, content, 'utf8');
}

if (check && stale) {
  console.error('Run `npm run build` and commit the result.');
  process.exit(1);
}
console.log(check ? 'Glossary is up to date.' : `Built ${entries.length} terms.`);
