import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateGlossary, renderMarkdown } from './lib/glossary.mjs';
import { validateSchedule, scheduleWarnings, renderScheduleMarkdown } from './lib/schedule.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const now = new Date().toISOString();

const read = async (p) => JSON.parse(await readFile(join(root, p), 'utf8'));

const glossary = await read('data/glossary.json');
const schedule = await read('data/schedule.json');

const problems = [
  ['glossary', validateGlossary(glossary)],
  ['schedule', validateSchedule(schedule)],
].filter(([, r]) => !r.ok);

if (problems.length > 0) {
  for (const [name, r] of problems) {
    console.error(`${name} validation failed (${r.errors.length}):`);
    for (const e of r.errors) console.error(`  - ${e}`);
  }
  process.exit(1);
}

// Drift warnings are deliberately non-fatal. A missing recap link should not
// block an unrelated deploy at 1am after an eight-hour stream.
for (const w of scheduleWarnings(schedule, now)) console.warn(`  warning: ${w}`);

const targets = [
  ['docs/glossary.md', renderMarkdown(glossary)],
  ['docs/schedule.md', renderScheduleMarkdown(schedule)],
  ['site/glossary.json', `${JSON.stringify(glossary, null, 2)}\n`],
  ['site/schedule.json', `${JSON.stringify(schedule, null, 2)}\n`],
];

let stale = false;
for (const [rel, content] of targets) {
  const path = join(root, rel);
  const current = await readFile(path, 'utf8').catch(() => null);
  if (current === content) continue;
  stale = true;
  if (check) console.error(`Out of date: ${rel}`);
  else await writeFile(path, content, 'utf8');
}

if (check && stale) {
  console.error('Run `npm run build` and commit the result.');
  process.exit(1);
}

console.log(
  check
    ? 'Generated files are up to date.'
    : `Built ${glossary.length} terms and ${schedule.length} episodes.`
);
