# vibe-coding — repo rules

Public repo for a live-streamed series on vibe coding with Claude Code.

## Clean room

This repo is public and lives on a machine that also holds client work. It is
sealed from it:

- No client names, tenant identifiers, project refs, or vault references — ever.
- No imports from, or paths into, any other repo on this machine.
- If a future episode needs a secret, it gets its own vault. It does not borrow one.
- Every example, name, and dataset in this repo is synthetic.

## Stack

Plain HTML/CSS/JS with zero dependencies. Tests run on the Node built-in runner
(`npm test`). Do not add a framework, bundler, or dependency without it being the
subject of an episode — the constraint is the lesson.

## Generated files

`docs/glossary.md` and `site/glossary.json` are generated from `data/glossary.json`
by `npm run build`. Never hand-edit them; edit the JSON and rebuild.
