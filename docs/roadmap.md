# Series Roadmap

Five episodes, Mondays, 8+ hours each. Built live, from an empty folder.

**This is a plan, not a contract.** It gets revised at the end of every episode, in
public, and the revisions are themselves part of the material — changing your mind
with a reason is the job.

---

## Episode 1 — Zero to deployed

**Objective:** Prove the whole loop in one sitting: an idea becomes a plan, becomes
files, becomes a thing on the internet other people can open.

**Ships:** this roadmap · the glossary (v1, ~50 terms) · the glossary site, live.

**Terms:** the *core concepts* and *Claude Code mechanics* blocks of the glossary.

**Take-home:** you do not need to know how to write code to ship something real. You
need to know what to ask for, and how to check whether you got it. The second half
is the part nobody teaches.

---

## Episode 2 — The site grows up, and the first real fork

**Objective:** Outgrow the starting stack on purpose, and decide what to do about it
with the requirement actually in hand.

**Ships:** search, filtering, per-term permalinks, and a path for viewers to submit a
term.

**The fork, decided on air:** a submit form needs somewhere to write. Either we stay
static and submissions arrive as pull requests, or we move to a framework with a
server. We will have the real requirement in front of us, so we decide then — this is
what "when does a framework earn its place?" looks like in practice.

**Also on the agenda — pick the Episode 3–5 product.** Criteria, stated now so the
choice is not vibes: (1) somebody other than us would actually use it; (2) it is
buildable in roughly 24 stream hours; (3) it needs no client, tenant, or private data
of any kind.

**Terms:** git, GitHub, pull request, deploy, preview URL, static vs dynamic,
database, API.

**Take-home:** the right time to add a tool is when you can name the thing it fixes.

---

## Episode 3 — Idea to spec to scaffold

**Objective:** Start the second product from nothing and resist the urge to type. The
episode where planning earns its keep.

**Ships:** a written spec, an implementation plan, and a running scaffold.

**Terms:** spec, plan mode, scope creep, YAGNI, ADR, MVP.

**Take-home:** the expensive mistakes are made before the first line of code, and they
are cheap to fix while they are still sentences.

---

## Episode 4 — Core features and real data

**Objective:** Make it hold state. Where the product stops being a demo.

**Ships:** a schema, persistence, seeded data, the core features working end to end.

**Terms:** schema, migration, idempotency, environment variable, secret, API key,
seed data.

**Take-home:** running twice should not produce two of everything. Most data disasters
are that sentence, ignored.

---

## Episode 5 — Auth, deploy, harden

**Objective:** Let other people in without letting them break it, then ship it.

**Ships:** accounts, protected write paths, CI, and a production deploy.

**Terms:** auth, session, row-level security, CI, test, regression, rollback, blast
radius.

**Take-home:** "it ran" and "it worked" are different claims. Only one of them is
worth making, and it costs more.

---

## Open decisions

| # | Decision | Owner | Resolve by |
|---|----------|-------|------------|
| 1 | What the Episode 3–5 product is | stream + operator | Episode 2 |
| 2 | Stay static or adopt a framework for submissions | decided on air | Episode 2 |
