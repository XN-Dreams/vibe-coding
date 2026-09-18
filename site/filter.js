export function filterTerms(entries, query) {
  const q = query.trim().toLowerCase();
  if (q === '') return [...entries];
  return entries.filter((e) =>
    [e.term, e.short, e.why, e.hear_it].join(' ').toLowerCase().includes(q)
  );
}
