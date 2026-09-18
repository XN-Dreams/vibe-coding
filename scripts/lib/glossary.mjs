import { CATEGORIES } from '../../site/categories.js';

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
