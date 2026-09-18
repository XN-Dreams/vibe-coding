export const ROLES = ['control', 'machine', 'floor', 'qc'];
export const FLOWS = ['sequence', 'parallel'];

/** Every stop in a zone, bays flattened. Order is only meaningful when flow === 'sequence'. */
export function allStops(zone) {
  return (zone.bays ?? []).flatMap((b) => b.stops ?? []);
}

/** Which bay a stop sits in, or null. */
export function bayOf(zone, slug) {
  for (const b of zone.bays ?? []) {
    if ((b.stops ?? []).includes(slug)) return b.title;
  }
  return null;
}

/**
 * Does this zone claim its bays are ordered?
 *
 * This is the whole point of the field. The previous design drew every domain
 * as a line, which asserted that eighteen unrelated controls were a sequence
 * you walk through. They are not. A zone now has to say so, and the drawing
 * only draws arrows where the data claims flow.
 */
export function isSequential(zone) {
  return zone.flow === 'sequence';
}
