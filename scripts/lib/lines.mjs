/**
 * The narrative structure of the map.
 *
 * A force-directed graph put every term where the physics happened to settle,
 * which meant the position of a station carried no information at all. This
 * file is the missing half: four ordered routes, each divided into named
 * sections, read left to right. Where a term sits on its line is a claim about
 * when you need it.
 */

import { orderedStops, sectionOf } from '../../site/lines-data.js';

export { orderedStops, sectionOf };

export function validateLines(lines, glossary) {
  const errors = [];
  const bySlug = new Map(glossary.map((t) => [t.slug, t]));
  const placed = new Map(); // slug -> line key that carries it

  for (const line of lines) {
    const id = line?.key ?? '(unnamed line)';

    for (const field of ['key', 'name', 'tagline', 'sections']) {
      if (line?.[field] === undefined) errors.push(`${id}: missing required field "${field}"`);
    }
    if (!Array.isArray(line?.sections)) continue;

    for (const [i, section] of line.sections.entries()) {
      const where = `${id} section ${i + 1}`;
      if (typeof section?.title !== 'string' || section.title.trim() === '') {
        errors.push(`${where}: missing title`);
      }
      if (!Array.isArray(section?.stops) || section.stops.length === 0) {
        errors.push(`${where} ("${section?.title ?? '?'}"): has no stops — an empty section draws an empty bracket`);
        continue;
      }

      for (const slug of section.stops) {
        const term = bySlug.get(slug);
        if (!term) {
          errors.push(`${where}: "${slug}" is not a glossary term`);
          continue;
        }
        if (placed.has(slug)) {
          errors.push(`"${slug}" appears twice — already on the ${placed.get(slug)} line`);
          continue;
        }
        placed.set(slug, id);
        if (term.category !== line.key) {
          errors.push(`"${slug}" is category "${term.category}" but sits on the "${line.key}" line`);
        }
      }
    }
  }

  // The silent one: a term in the glossary that no line carries never appears
  // on the map, and nothing else would ever notice.
  for (const t of glossary) {
    if (!placed.has(t.slug)) errors.push(`"${t.slug}" is in the glossary but on no line — it would vanish from the map`);
  }

  return { ok: errors.length === 0, errors };
}
