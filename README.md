# Vibe Coding with Claude Code

A live-streamed series on building real software by describing what you want —
and on knowing enough to check whether you got it.

- **[The schedule](https://xn-dreams.github.io/vibe-coding/#schedule)** — when each episode airs, in your timezone
- **[The roadmap](docs/roadmap.md)** — what the five episodes cover
- **[Programming decisions](docs/programming.md)** — why it is scheduled this way, with sources
- **[The glossary](docs/glossary.md)** — every term the series uses, in plain language
- **[The site](site/)** — the glossary, searchable

Everything here is built on stream, from an empty folder, with nothing hidden.

## Running it locally

No installation, no dependencies. You need Node 24+.

```bash
npm test          # run the tests
npm run build     # regenerate the glossary from data/glossary.json
npm run serve     # preview the site at http://localhost:8080
```

Opening `site/index.html` directly will show an empty page — browsers block `fetch` and
ES modules on the `file://` protocol. Use `npm run serve`.
