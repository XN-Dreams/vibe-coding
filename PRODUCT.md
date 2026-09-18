# PRODUCT.md

## Register

**Brand.** The glossary is not a lookup tool people tolerate — it is the thing that
makes the series feel worth following. Design is the product here.

## Users & purpose

People who are not professional developers and want to build real software with AI
coding agents. They arrive intimidated by vocabulary: they have heard "context
window" and "idempotent" and do not want to admit they don't know what they mean.

The job: turn a wall of unfamiliar words into something a person can explore, make
progress through, and feel ownership of. Learning the vocabulary *is* the first
skill the series teaches.

Context of use: evening, at home, on a laptop, curious and slightly out of their
depth, wanting to feel they are getting somewhere rather than studying.

## Brand personality

**Plotted · tactile · encouraging.**

Plotted — everything has a place and a connection; nothing is floating.
Tactile — it responds, it can be traced with a finger, it remembers you.
Encouraging — progress is visible and generous. Never a test you can fail.

## Aesthetic lane

**Mid-century transit / route-map poster.** Vignelli's 1972 NYC subway map, airline
route posters, airport wayfinding. Flat saturated colour, thick confident strokes,
geometric station markers, condensed signage type.

Chosen against the first-order reflex: "constellation" pulls immediately toward a
dark night sky with glowing stars, which is the obvious answer from the category
alone. The transit map is a better fit anyway — the data is literally a network of
named stops with interchanges, and transit maps are a design tradition built for
exactly the problem of making a dense network legible at a glance.

## Anti-references

- **No AI-slop defaults.** No cream/sand/beige grounds, no gradient text, no tiny
  uppercase eyebrows over every section, no identical rounded card grids.
- **No corporate docs site.** Not Confluence, not Notion-bland. It has a point of view.
- **No developer-tool dark mode.** No terminal green on black. The audience is
  explicitly people who are not professional developers, and the hacker aesthetic
  tells them they are in the wrong room. The map ground is dark by *chroma* — a deep
  petrol — not by absence of colour.
- **No editorial-typographic lane.** No display-serif-plus-mono-labels-plus-rules.

## Strategic design principles

1. **The map must be the same map every time.** Layout is deterministic from a fixed
   seed. A network that rearranges itself on every visit cannot be learned, and
   learning it is the point.
2. **Progress is generous, never punitive.** Visiting a term counts. There is no
   quiz you can fail, no streak to break, no score that goes down.
3. **The connections are the content.** 182 cross-references already exist in the
   data and the old design rendered none of them. They are the reason this is a map
   and not a list.
4. **Legible at 380px.** Transit maps were designed for pocket cards. If it does not
   work small, the metaphor is not being honoured.

## Accessibility

Colour alone never carries meaning — every line has a name and every station a
label. Keyboard navigable: the map is operable without a pointer, and a full text
list remains available as an equal path to the same content, not a degraded one.
Motion respects `prefers-reduced-motion`; the layout settles instantly rather than
animating when that is set.
