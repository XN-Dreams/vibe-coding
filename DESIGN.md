# DESIGN.md

The visual system. `PRODUCT.md` answers who and why; this answers how it looks.

Derived in part from running `extract-design-system` against the live site — see
**What the extraction actually told us** at the bottom, which is the more useful
half.

## Theme

Two grounds, on purpose.

**The page** follows the viewer's OS theme through tokens, light-first.
**The map** carries its own ground in both themes, the way a photograph or a
printed chart does. A map is an object on the page, not a region of it.

## Color

Light (bare `:root`; dark redefines only these tokens):

| Token | Light | Role |
|---|---|---|
| `--bg` | `#fbfaf8` | page ground |
| `--surface` | `#ffffff` | raised surfaces |
| `--text` | `#1c1a17` | body ink |
| `--muted` | `#5f5952` | secondary ink |
| `--line` | `#e4dfd8` | hairlines |
| `--accent` | `#7a4f28` | one accent, ≤10% of surface |

The map ground, fixed in both themes:

| Token | Value | Role |
|---|---|---|
| `--ground` | `#0b2a2e` | deep petrol |
| `--ground-ink` | `#eaf6f4` | station labels |

**Dark by chroma, not by absence of colour.** `#0b2a2e` is a saturated petrol, not
a near-black. That is the whole reason the map does not read as a developer
terminal — which `PRODUCT.md` rules out explicitly, because the audience is people
who are not professional developers and the hacker aesthetic tells them they are in
the wrong room.

### The four lines

Each category is a transit line. Colour never carries meaning alone — every line
has a name in the legend and every station a label.

| Line | Colour | Terms |
|---|---|---|
| Core concepts | `#F5B82E` | 11 |
| Claude Code mechanics | `#FF6A45` | 18 |
| Engineering ground floor | `#35D6CE` | 24 |
| Discipline and judgement | `#F473B4` | 12 |

Strategy is **Committed**: the map surface is carried by one saturated ground with
four saturated lines on it. The rest of the page is Restrained — tinted neutrals
and a single accent.

## Typography

| Role | Family | Use |
|---|---|---|
| Display | Big Shoulders Display, 700–800, uppercase | h1, station names, HUD figures |
| Body | Archivo, 400–600 | everything else, and station labels on canvas |

Paired on a **width** contrast axis — condensed wayfinding display against a
normal-width grotesque — rather than the serif/sans reflex. Big Shoulders is a
signage face, which is the register the map is speaking in.

Both were chosen against `impeccable`'s reflex-reject list, which bans Inter, IBM
Plex, Fraunces, Space Grotesk and the rest of the training-data defaults. An
earlier surface in this repo used IBM Plex and Fraunces; that was the reflex.

Display letter-spacing floor is `-0.02em`. Nothing tighter — letters touch and it
reads cramped rather than designed.

## Spacing

One eight-step scale. Nothing outside it.

```
--space-1  .25rem    --space-5  1.5rem
--space-2  .5rem     --space-6  2rem
--space-3  .75rem    --space-7  3rem
--space-4  1rem      --space-8  4rem
```

This replaced **27 distinct hand-picked values**. Every spacing declaration now
references a token; there are zero raw `rem` literals left in a padding, margin or
gap.

## Radius

```
--r-xs    2px     line dots, tiny markers
--r-sm    6px     chips, inputs, small controls
--r-md   10px     cards, panels, the map stage
--r-pill 999px    tabs, chips that read as pills
```

Four values, down from seven. `50%` still appears for actual circles, which is a
shape, not a scale step. Cards stop at 10px — over-rounding at 24px+ is a tell.

## Motion

Reveal-on-load for the map only: track draws in over roughly half a second, once.
Everything else is state feedback — a chip lifting 1px on hover, a progress bar
easing to its new width.

`prefers-reduced-motion: reduce` sets the map to its settled state immediately and
removes every transition. The reveal is guarded by a flag so a hover during the
intro cannot start a second loop advancing the same counter.

## Layout

- Reading column caps at 68ch.
- Side gutter never below 16px, set once on the wrapper.
- The map is a two-column grid above 760px and stacks below it; the stage goes
  from 10:7 to square so a phone gets a usable drawing area.
- Flex for one dimension, grid for two.

---

## What the extraction actually told us

`npx extract-design-system <url>` was run against the live site twice — once on the
map tab, once on the glossary tab. Recorded honestly, because the null result was
more interesting than a clean one.

**Its normalized output was unusable.** `tokens.json` came back with
`colors.palette: []`, `cssVariables: {}`, both `headingFont` and `bodyFont` set to
`Big Shoulders Display`, and a twenty-step "spacing scale" containing `3.2px`,
`4.48px` and `10.624px`. The generated `design-system/tokens.css` was deleted
rather than imported; importing it would have flattened the type pairing and
enshrined the exact mess it was supposed to find.

**Its raw capture was good.** `.extract-design-system/raw.json` had the palette
correctly — `#7a4f28`, `#5f5952`, `#1c1a17`, `#e4dfd8` with counts and OKLCH — and
the type correctly: Big Shoulders Display 800 uppercase for display, Archivo for
body. The extraction works; the normalization step throws it away.

Worth the caution generally: the tool briefly made it look as though the body font
had collapsed to the display face. It had not. Checking the raw capture before
"fixing" it avoided breaking working CSS to satisfy a bad report.

**The one real finding, and it was worth the whole exercise:** the spacing and
radius scales. 27 spacing values and 7 radii is not a system. Both are now scales,
and that section above is the result.
