/** Every stop on a line, in narrative order, sections flattened. */
export function orderedStops(line) {
  return (line.sections ?? []).flatMap((s) => s.stops ?? []);
}

/** Which section a stop belongs to, or null. */
export function sectionOf(line, slug) {
  for (const s of line.sections ?? []) {
    if ((s.stops ?? []).includes(slug)) return s.title;
  }
  return null;
}
