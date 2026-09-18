import { CATEGORIES, CATEGORY_TITLES } from '../../site/categories.js';

export { CATEGORIES };

const REQUIRED = ['term', 'slug', 'category', 'short', 'why', 'hear_it', 'related'];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validateGlossary(entries) {
  const errors = [];
  const seen = new Set();
  const slugs = new Set(entries.map((e) => e?.slug).filter(Boolean));

  for (const entry of entries) {
    const id = entry?.slug ?? entry?.term ?? '(unnamed entry)';

    for (const field of REQUIRED) {
      if (entry?.[field] === undefined) errors.push(`${id}: missing required field "${field}"`);
    }
    if (entry?.category && !CATEGORIES.includes(entry.category)) {
      errors.push(`${id}: unknown category "${entry.category}"`);
    }
    if (entry?.slug) {
      if (!SLUG.test(entry.slug)) {
        errors.push(`${id}: slug "${entry.slug}" must be lowercase letters, digits and hyphens`);
      }
      if (seen.has(entry.slug)) errors.push(`${id}: duplicate slug "${entry.slug}"`);
      seen.add(entry.slug);
    }
    for (const ref of entry?.related ?? []) {
      if (!slugs.has(ref)) errors.push(`${id}: related slug "${ref}" matches no entry`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function renderMarkdown(entries) {
  const byTerm = new Map(entries.map((e) => [e.slug, e.term]));
  const lines = [
    '# Glossary',
    '',
    '> Generated from `data/glossary.json` by `npm run build`. Do not hand-edit.',
    '',
  ];

  for (const category of CATEGORIES) {
    const group = entries
      .filter((e) => e.category === category)
      .sort((a, b) => a.term.localeCompare(b.term, 'en'));
    if (group.length === 0) continue;

    lines.push(`## ${CATEGORY_TITLES[category]}`, '');
    for (const e of group) {
      lines.push(`<a id="${e.slug}"></a>`, '', `### ${e.term}`, '', e.short, '', `**Why it matters.** ${e.why}`, '', `**You'll hear it.** ${e.hear_it}`, '');
      if (e.related.length > 0) {
        const links = e.related.map((r) => `[${byTerm.get(r)}](#${r})`).join(' · ');
        lines.push(`**See also.** ${links}`, '');
      }
    }
  }

  return lines.join('\n');
}
