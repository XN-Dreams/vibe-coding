import { allStops, bayOf, isSequential, ROLES, FLOWS } from '../../site/plant-data.js';

export { allStops, bayOf, isSequential, ROLES, FLOWS };

export function validatePlant(zones, glossary) {
  const errors = [];
  const bySlug = new Map(glossary.map((t) => [t.slug, t]));
  const placed = new Map();
  const seenRole = new Set();

  for (const zone of zones) {
    const id = zone?.key ?? '(unnamed zone)';

    for (const field of ['key', 'zone', 'role', 'flow', 'tagline', 'bays']) {
      if (zone?.[field] === undefined) errors.push(`${id}: missing required field "${field}"`);
    }
    if (zone?.role !== undefined) {
      if (!ROLES.includes(zone.role)) errors.push(`${id}: unknown role "${zone.role}"`);
      else if (seenRole.has(zone.role)) errors.push(`${id}: role "${zone.role}" is already taken`);
      else seenRole.add(zone.role);
    }
    if (zone?.flow !== undefined && !FLOWS.includes(zone.flow)) {
      errors.push(`${id}: flow must be "sequence" or "parallel", got "${zone.flow}"`);
    }
    if (!Array.isArray(zone?.bays)) continue;

    for (const [i, bay] of zone.bays.entries()) {
      const where = `${id} bay ${i + 1}`;
      if (typeof bay?.title !== 'string' || bay.title.trim() === '') errors.push(`${where}: missing title`);
      if (!Array.isArray(bay?.stops) || bay.stops.length === 0) {
        errors.push(`${where}: has no stops — an empty bay draws an empty box`);
        continue;
      }
      for (const slug of bay.stops) {
        const term = bySlug.get(slug);
        if (!term) {
          errors.push(`${where}: "${slug}" is not a glossary term`);
          continue;
        }
        if (placed.has(slug)) {
          errors.push(`"${slug}" appears twice — already in the ${placed.get(slug)} zone`);
          continue;
        }
        placed.set(slug, id);
        if (term.category !== zone.key) {
          errors.push(`"${slug}" is category "${term.category}" but sits in the "${zone.key}" zone`);
        }
      }
    }
  }

  // The silent one: a term nothing places never appears in the plant at all.
  for (const t of glossary) {
    if (!placed.has(t.slug)) errors.push(`"${t.slug}" is in the glossary but in no zone — it would vanish from the plant`);
  }

  return { ok: errors.length === 0, errors };
}
