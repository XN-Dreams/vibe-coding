# Glossary

> Generated from `data/glossary.json` by `npm run build`. Do not hand-edit.

## Core concepts

<a id="agent"></a>

### Agent

A model that can take actions — read files, run commands, search — not just produce text.

**Why it matters.** The moment it can act, mistakes stop being wrong paragraphs and start being deleted files. This is where permissions begin to matter.

**You'll hear it.** "Let the agent handle it."

**See also.** [Agentic loop](#agentic-loop) · [Vibe coding](#vibe-coding)

<a id="agentic-loop"></a>

### Agentic loop

Act, look at the result, decide what to do next, repeat — until the job is done or it gives up.

**Why it matters.** It explains why an agent can fix its own mistakes, and why it can also spend twenty minutes confidently going in a circle.

**You'll hear it.** "It's stuck in a loop."

**See also.** [Agent](#agent)

<a id="context-window"></a>

### Context window

Everything the model can see at once — your prompt, the files it read, the whole conversation so far.

**Why it matters.** When it fills up, earlier things fall out of view. Most "it forgot what I said" moments are this, not the model being stupid.

**You'll hear it.** "We're running low on context."

**See also.** [Token](#token) · [Prompt](#prompt)

<a id="hallucination"></a>

### Hallucination

A confident, fluent, completely made-up answer — a function that doesn't exist, a citation nobody wrote.

**Why it matters.** It arrives in exactly the same tone as a correct answer. There is no tell, which is the entire reason you verify instead of trusting.

**You'll hear it.** "It hallucinated the whole API."

**See also.** [LLM](#llm) · [Non-determinism](#non-determinism)

<a id="llm"></a>

### LLM

Large language model — the thing doing the writing, predicting what text should come next, very well, over and over.

**Why it matters.** Knowing it predicts rather than looks up explains almost every surprising thing it does, including the confident wrong answers.

**You'll hear it.** "That's just how LLMs work."

**See also.** [Model](#model) · [Token](#token) · [Hallucination](#hallucination)

<a id="model"></a>

### Model

A specific trained version you can talk to, with a name and a price — Opus, Sonnet, Haiku.

**Why it matters.** They differ in cost, speed and how much reasoning they'll do. Reaching for the biggest one every time is a way to spend money on nothing.

**You'll hear it.** "Switch to a smaller model for this one."

**See also.** [LLM](#llm) · [Token](#token)

<a id="non-determinism"></a>

### Non-determinism

The same question can get a different answer twice.

**Why it matters.** It means "it worked when I tried it" is weak evidence, and a bug that vanishes on retry has not been fixed.

**You'll hear it.** "It worked the first time, I swear."

**See also.** [LLM](#llm) · [Hallucination](#hallucination)

<a id="prompt"></a>

### Prompt

What you actually asked for — the text you send.

**Why it matters.** Almost every bad result is a prompt that left something unsaid. Vague in, vague out, and the model will not tell you what it guessed.

**You'll hear it.** "Tighten the prompt and try again."

**See also.** [Context window](#context-window) · [System prompt](#system-prompt) · [Vibe coding](#vibe-coding)

<a id="system-prompt"></a>

### System prompt

Standing instructions the model carries into every message, set before you start typing.

**Why it matters.** It is why the same question gets different answers in two different tools. When behaviour seems inexplicable, this is usually where the explanation lives.

**You'll hear it.** "That must be coming from the system prompt."

**See also.** [Prompt](#prompt) · [Context window](#context-window)

<a id="token"></a>

### Token

The unit a model reads and writes in — roughly three quarters of a word.

**Why it matters.** Everything you pay for and every limit you hit is counted in these, not in words or lines. It's the meter on the taxi.

**You'll hear it.** "That blew the token budget."

**See also.** [Context window](#context-window) · [Model](#model)

<a id="vibe-coding"></a>

### Vibe coding

Building software by describing what you want in plain language and letting a model write the code.

**Why it matters.** It moves the hard part from typing to specifying and checking. If you can't tell whether what came back is right, speed just gets you to the wrong place sooner.

**You'll hear it.** "I vibe-coded the whole thing in an afternoon."

**See also.** [Prompt](#prompt) · [Agent](#agent) · [Verification](#verification)

## Claude Code mechanics

<a id="allowlist"></a>

### Allowlist

The list of specific commands and tools you've pre-approved, so Claude Code runs them without stopping to ask.

**Why it matters.** The point is to stop the harmless stuff interrupting you so the one prompt that actually matters still gets read. Put something broad on it and you have quietly approved every future use of it too.

**You'll hear it.** "Just allowlist the test command, it's asking me every thirty seconds."

**See also.** [Permission mode](#permission-mode) · [settings.json](#settings-json) · [Tool](#tool)

<a id="artifact"></a>

### Artifact

A web page Claude publishes for you at its own link, instead of leaving the result buried in the terminal.

**Why it matters.** It's private until you hand out the link, and it's a live page rather than a file on your laptop — so it's for things other people need to open, and the sharing decision is yours to make deliberately.

**You'll hear it.** "Publish that as an artifact and send me the link."

**See also.** [Tool](#tool) · [Session](#session)

<a id="background-task"></a>

### Background task

A command Claude Code starts and leaves running while you carry on with something else.

**Why it matters.** Nobody watches it, so a server that died on line three keeps looking fine until you check the output. "I started it" is not "it's working".

**You'll hear it.** "Run the server in the background so we're not stuck waiting on it."

**See also.** [Tool](#tool) · [Session](#session) · [Subagent](#subagent)

<a id="checkpoint"></a>

### Checkpoint

A saved snapshot of your files from earlier in the session, so you can rewind to how things were before a change.

**Why it matters.** It's an undo for the session, not a backup of your project — it doesn't survive the session and it isn't a substitute for saving your work properly. People discover the difference at the worst moment.

**You'll hear it.** "Rewind to the checkpoint before it touched the config."

**See also.** [Session](#session) · [Worktree](#worktree)

<a id="claude-md"></a>

### CLAUDE.md

A file in your project that Claude Code reads at the start of every session, holding the standing instructions you don't want to retype.

**Why it matters.** Without it you re-explain your project's rules every single session, and half the time you forget one — so it picks the wrong framework, or writes files where you told it never to write files.

**You'll hear it.** "If you keep telling it that, just put it in the CLAUDE.md."

**See also.** [Memory](#memory) · [System prompt](#system-prompt) · [Context window](#context-window)

<a id="compaction"></a>

### Compaction

When the conversation gets too long, Claude Code summarises the older part of it to make room and carries on from the summary.

**Why it matters.** A summary keeps the gist and drops the detail, so specific things you agreed early — an exact filename, a decision you overruled — can quietly stop being true. Quality dipping right after a long stretch usually means this.

**You'll hear it.** "It just compacted — re-tell it the important bit."

**See also.** [Context window](#context-window) · [Session](#session) · [Memory](#memory)

<a id="hook"></a>

### Hook

A command your computer runs automatically at a fixed moment — before a tool runs, after an edit, when a session ends.

**Why it matters.** Hooks fire whether or not Claude agrees with them, which is the point: asking nicely in a CLAUDE.md is a preference, a hook is a rule. A broken one blocks work every time and the reason is easy to miss.

**You'll hear it.** "That's a hook blocking it, not the model refusing."

**See also.** [settings.json](#settings-json) · [Permission mode](#permission-mode) · [Tool](#tool)

<a id="mcp-server"></a>

### MCP server

A connector that plugs an outside service — a database, your files, a website — into Claude Code as extra tools.

**Why it matters.** Once connected it's connected from everywhere, not just the project you set it up in, and it's usually logged in as you. A request meant for a test database can reach the real one with nothing in the wording to warn you.

**You'll hear it.** "That's coming from an MCP server, not from Claude itself."

**See also.** [Tool](#tool) · [Allowlist](#allowlist) · [Permission mode](#permission-mode)

<a id="memory"></a>

### Memory

Notes Claude Code writes down for itself so something learned today is still there next week.

**Why it matters.** A session forgets everything when it ends. If a hard-won fix never gets written down, you will debug the same thing again in a month and not recognise it.

**You'll hear it.** "Save that to memory, I never want to figure that out twice."

**See also.** [CLAUDE.md](#claude-md) · [Session](#session) · [Context window](#context-window)

<a id="permission-mode"></a>

### Permission mode

The setting that decides how much Claude Code asks you before it does something — ask every time, ask for the risky things, or stop asking.

**Why it matters.** Set too loose and it deletes or overwrites while you're looking away. Set too tight and you click approve so many times you stop reading the prompts, which is the same thing with extra steps.

**You'll hear it.** "Don't run it in the no-questions mode on a folder you care about."

**See also.** [Allowlist](#allowlist) · [Plan mode](#plan-mode) · [settings.json](#settings-json)

<a id="plan-mode"></a>

### Plan mode

A mode where Claude Code can read and investigate but not change anything, so it comes back with a proposal first.

**Why it matters.** Skip it on anything non-trivial and you get twenty files edited from a misunderstanding of what you asked for. Reading the plan takes a minute; unpicking the edits takes an evening.

**You'll hear it.** "Put it in plan mode first, I want to see what it thinks it's doing."

**See also.** [Permission mode](#permission-mode) · [Tool](#tool) · [Agent](#agent)

<a id="session"></a>

### Session

One continuous conversation with Claude Code in one terminal window, from the moment you start it to the moment you close it.

**Why it matters.** Everything it knows about what you're doing lives in the session. Open a second window and that one starts from nothing — it has not seen the last two hours of work, and will happily contradict it.

**You'll hear it.** "Hang on, that was a different session — it doesn't know about any of that."

**See also.** [Context window](#context-window) · [Compaction](#compaction) · [Memory](#memory)

<a id="settings-json"></a>

### settings.json

The configuration file where Claude Code keeps your permissions, hooks and preferences.

**Why it matters.** There's more than one of these — one for your whole account, one per project — and the specific one wins. Editing the wrong file and seeing nothing change is the standard afternoon.

**You'll hear it.** "Which settings.json did you put that in, the project one or the global one?"

**See also.** [Allowlist](#allowlist) · [Hook](#hook) · [Permission mode](#permission-mode)

<a id="skill"></a>

### Skill

A saved set of instructions for one kind of job that Claude Code pulls in when the job comes up.

**Why it matters.** It loads when the task looks like a match, which means it might not load when you expected it to. If the result ignores the process you carefully wrote down, check the skill was actually used before blaming the instructions.

**You'll hear it.** "There's a skill for that — you don't have to explain the whole process again."

**See also.** [Slash command](#slash-command) · [CLAUDE.md](#claude-md) · [Tool](#tool)

<a id="slash-command"></a>

### Slash command

A shortcut you type starting with a slash to trigger something already set up, like /review or /clear.

**Why it matters.** Some of them do far more than they look like they do — /clear throws away the entire conversation. Worth knowing what one does before you type it mid-flow.

**You'll hear it.** "Just hit slash and see what's in the list."

**See also.** [Skill](#skill) · [Session](#session) · [settings.json](#settings-json)

<a id="subagent"></a>

### Subagent

A second Claude that your Claude sends off to do one chunk of work and report back.

**Why it matters.** The subagent starts fresh — it did not hear your last hour of conversation, so anything you assumed is obvious has to be written into the instructions it gets, or it will confidently do the wrong thing.

**You'll hear it.** "Send a subagent to go read all that so it doesn't eat our context."

**See also.** [Agent](#agent) · [Context window](#context-window) · [Background task](#background-task)

<a id="tool"></a>

### Tool

Anything Claude Code can do besides produce text — read a file, edit a file, run a command, search the web.

**Why it matters.** This is the whole difference between a chatbot and something that changes your computer. A tool call is a real action on your real machine, and "it only suggested it" stops being true.

**You'll hear it.** "It's not just talking, it's got tools — that command actually ran."

**See also.** [Agent](#agent) · [Agentic loop](#agentic-loop) · [Permission mode](#permission-mode)

<a id="worktree"></a>

### Worktree

A second copy of your project in its own folder, so work can happen there without disturbing the copy you're using.

**Why it matters.** Two copies means two of everything — settings, installed packages, saved logins. A fix that works in one and not the other usually isn't a mystery, it's that you were standing in the wrong folder.

**You'll hear it.** "Let it do that in a worktree, I don't want it touching my files while I'm in them."

**See also.** [Checkpoint](#checkpoint) · [Subagent](#subagent) · [Background task](#background-task)

## Engineering ground floor

<a id="api"></a>

### API

A published way for one program to ask another program for something.

**Why it matters.** It's a contract, and the other side owns it. When they change it, your app breaks without you touching a single line of your own code.

**You'll hear it.** "Their API changed and nobody told us."

**See also.** [Endpoint](#endpoint) · [JSON](#json) · [Secret](#secret)

<a id="branch"></a>

### Branch

A separate line of work in the same project, so you can try something without disturbing the version that works.

**Why it matters.** Without one, every experiment happens on top of the thing people are actually using. A half-finished idea and a working app end up in the same place.

**You'll hear it.** "Do that on a branch, not on main."

**See also.** [Commit](#commit) · [Merge](#merge) · [Pull request](#pull-request)

<a id="build"></a>

### Build

The step that turns the code you wrote into the files a browser or server can actually run.

**Why it matters.** Code that looks fine in the editor can fail here, and this is the version that ships. "It works when I'm editing" and "it builds" are two different claims.

**You'll hear it.** "Don't push it, the build is red."

**See also.** [Deploy](#deploy) · [Dependency](#dependency) · [Test](#test)

<a id="cli"></a>

### CLI

A program you drive by typing commands instead of clicking buttons.

**Why it matters.** Most instructions you'll find online are written as commands, not as "click here". If you can't run one, half the internet's help is unusable to you.

**You'll hear it.** "There's no UI for that, it's CLI only."

**See also.** [Terminal](#terminal) · [Package manager](#package-manager) · [Build](#build)

<a id="commit"></a>

### Commit

A saved checkpoint of your project, with a note saying what you changed.

**Why it matters.** If you go hours without one, there's no point to return to when the AI rewrites six files and breaks the app. You either keep the mess or lose everything.

**You'll hear it.** "Commit before you let it touch that file."

**See also.** [Repo](#repo) · [Branch](#branch) · [Merge](#merge)

<a id="database"></a>

### Database

The place your app keeps information that has to survive being closed and reopened.

**Why it matters.** Anything not stored here vanishes when the app restarts. People demo a working sign-up form, redeploy, and discover every account is gone.

**You'll hear it.** "Is that actually saved, or just on screen?"

**See also.** [Schema](#schema) · [Static vs dynamic](#static-vs-dynamic) · [Environment variable](#environment-variable)

<a id="dependency"></a>

### Dependency

Somebody else's code that your project needs in order to run.

**Why it matters.** You inherit their bugs, their security holes, and their decision to change how things work. An app that ran fine in March can break in April because a dependency updated.

**You'll hear it.** "That's not our bug, it's coming from a dependency."

**See also.** [Package manager](#package-manager) · [Build](#build) · [Repo](#repo)

<a id="deploy"></a>

### Deploy

Putting your app somewhere on the internet so other people can open it.

**Why it matters.** Until you do this, nothing you built exists for anyone but you. And the first one usually surfaces every setting that only existed on your laptop.

**You'll hear it.** "It's deployed, here's the real link."

**See also.** [Build](#build) · [Localhost](#localhost) · [Environment variable](#environment-variable)

<a id="endpoint"></a>

### Endpoint

One specific address within an API that does one specific thing.

**Why it matters.** Typo the address and you don't get an error explaining yourself — you get a 404, which looks exactly like the service being down. People spend afternoons on a missing letter.

**You'll hear it.** "Which endpoint are you hitting?"

**See also.** [API](#api) · [JSON](#json) · [Stack trace](#stack-trace)

<a id="environment-variable"></a>

### Environment variable

A setting handed to your app from outside it, so the same code can behave differently on your laptop and in production.

**Why it matters.** They don't travel with your code. The classic first deploy fails because the app is looking for a value that only ever existed on your machine.

**You'll hear it.** "Works locally — you probably didn't set the env vars on the server."

**See also.** [Secret](#secret) · [Deploy](#deploy) · [Build](#build)

<a id="json"></a>

### JSON

The standard text format programs use to pass structured data around — labels and values, in brackets.

**Why it matters.** It is strictly picky: one trailing comma or one missing quote and the whole thing is rejected, usually with a message pointing at the wrong line.

**You'll hear it.** "It's returning JSON, just look at the raw response."

**See also.** [API](#api) · [Endpoint](#endpoint) · [Schema](#schema)

<a id="lint"></a>

### Lint

A tool that reads your code and complains about problems and sloppiness before you ever run it.

**Why it matters.** It catches the unused variable, the typo'd name, the thing you forgot to await. Turn it off because it's noisy and you hand those back to yourself as bugs at 2am.

**You'll hear it.** "Lint's screaming, but it still runs."

**See also.** [Build](#build) · [Test](#test) · [Stack trace](#stack-trace)

<a id="localhost"></a>

### Localhost

Your own computer, as seen by your own computer — the app running there is visible only to you.

**Why it matters.** Sending someone a localhost link sends them to their own machine, where nothing is running. To them the site is simply broken, and they'll say so.

**You'll hear it.** "That link only works on your machine."

**See also.** [Port](#port) · [Deploy](#deploy) · [Terminal](#terminal)

<a id="merge"></a>

### Merge

Combining the changes from one branch into another.

**Why it matters.** When two branches changed the same lines, this stops and asks you to pick — a conflict. Guess wrong and you silently delete someone's work, including your own from last week.

**You'll hear it.** "It merged clean, no conflicts."

**See also.** [Branch](#branch) · [Pull request](#pull-request) · [Commit](#commit)

<a id="package-manager"></a>

### Package manager

The tool that downloads and installs the other people's code your project needs.

**Why it matters.** Its list of what to install is part of your project. Install something by hand outside it and your app works on your machine and nowhere else.

**You'll hear it.** "Just npm install, it'll sort itself out."

**See also.** [Dependency](#dependency) · [CLI](#cli) · [Build](#build)

<a id="port"></a>

### Port

The numbered door on a machine that a running program listens at — the 3000 in localhost:3000.

**Why it matters.** Two programs can't use the same one, so the second refuses to start with a message about the address being in use. And like localhost, the number means nothing to anyone else's computer.

**You'll hear it.** "Something's already on 3000."

**See also.** [Localhost](#localhost) · [Deploy](#deploy) · [Terminal](#terminal)

<a id="pull-request"></a>

### Pull request

A proposal to fold one branch's changes into another, with a page where people can read and comment on them first.

**Why it matters.** Skipping it means changes land with nobody having read them. The review is where somebody notices the AI quietly deleted a feature to make a test pass.

**You'll hear it.** "I opened a PR, can you look at it?"

**See also.** [Branch](#branch) · [Merge](#merge) · [Repo](#repo)

<a id="repo"></a>

### Repo

The folder that holds your project plus the full history of every change ever made to it.

**Why it matters.** Work that isn't in a repo has no history — when something breaks you can't see what changed or go back to the version that worked.

**You'll hear it.** "Is that in the repo, or just on your laptop?"

**See also.** [Commit](#commit) · [Branch](#branch) · [Deploy](#deploy)

<a id="schema"></a>

### Schema

The agreed shape of your data — which fields exist, what type each one is, which are required.

**Why it matters.** Changing it after you have real data is the hard part: rename a field and every row still using the old name is suddenly invisible to your app.

**You'll hear it.** "That needs a schema change, it's not a quick one."

**See also.** [Database](#database) · [JSON](#json) · [API](#api)

<a id="secret"></a>

### Secret

A password, key or token that proves your app is allowed to use something — and that anyone holding it can use too.

**Why it matters.** Paste one into your code and commit it to a public repo and it is scraped within minutes, by bots that watch for exactly that. Deleting it later doesn't help; the history still has it, and the bill is yours.

**You'll hear it.** "That key is in the repo. Rotate it now."

**See also.** [Environment variable](#environment-variable) · [Repo](#repo) · [API](#api)

<a id="stack-trace"></a>

### Stack trace

The wall of text an app prints when it crashes, listing what it was doing at each step leading up to the failure.

**Why it matters.** The useful line is usually the first one and the first file that's actually yours — everything else is library noise. Pasting only "it crashed" to an AI throws away the one piece of evidence that identifies the bug.

**You'll hear it.** "Paste the whole trace, not just the last line."

**See also.** [Terminal](#terminal) · [Test](#test) · [Build](#build)

<a id="static-vs-dynamic"></a>

### Static vs dynamic

Whether the page was written out once in advance, or whether a server runs code to build it fresh each time someone asks.

**Why it matters.** Static is cheap, fast and can't do anything personal; dynamic can show your name and your data but needs a server running and costs money per visit. Picking the wrong one means either a site that can't log anyone in, or a bill for a brochure.

**You'll hear it.** "Does that page need a server, or can it be static?"

**See also.** [Deploy](#deploy) · [API](#api) · [Database](#database)

<a id="terminal"></a>

### Terminal

The black window where you type commands and read what the computer says back.

**Why it matters.** The answer to most "why isn't this working" is already printed in there. People close it, then report that nothing happened.

**You'll hear it.** "What does the terminal say?"

**See also.** [CLI](#cli) · [Stack trace](#stack-trace) · [Localhost](#localhost)

<a id="test"></a>

### Test

Code whose only job is to run your other code and check it did the right thing.

**Why it matters.** Without them, the only way to know a change broke something is a user telling you. With AI writing large chunks fast, this is the difference between shipping and guessing.

**You'll hear it.** "Tests pass — but did you check what they actually assert?"

**See also.** [Build](#build) · [Lint](#lint) · [Commit](#commit)

## Discipline and judgement

<a id="adr"></a>

### ADR

Architecture Decision Record — a short note saying what you decided, and why, dated.

**Why it matters.** In six months nobody remembers why the database was chosen, and without the why, someone reverses it for a reason you already rejected.

**You'll hear it.** "Is there an ADR for that?"

**See also.** [Spec](#spec) · [Technical debt](#technical-debt)

<a id="blast-radius"></a>

### Blast radius

How much is affected if this goes wrong — one file, one user, or everybody.

**Why it matters.** It's what tells you how carefully to move. Deleting a local file and deleting a production table deserve very different amounts of thought.

**You'll hear it.** "What's the blast radius if this is wrong?"

**See also.** [Rollback](#rollback) · [Permission mode](#permission-mode) · [Secret](#secret)

<a id="idempotency"></a>

### Idempotency

Running the same thing twice leaves you where running it once did.

**Why it matters.** Without it, a retry after a timeout charges the card twice or imports every row again. Most data disasters are this sentence, ignored.

**You'll hear it.** "Is that import idempotent?"

**See also.** [Verification](#verification) · [Database](#database)

<a id="mvp"></a>

### MVP

Minimum viable product — the smallest version that a real person can actually use.

**Why it matters.** Viable is the word people skip. A version so minimal nobody can use it teaches you nothing, which was the entire point of shipping early.

**You'll hear it.** "Let's get an MVP out and see."

**See also.** [YAGNI](#yagni) · [Scope creep](#scope-creep) · [Deploy](#deploy)

<a id="refactor"></a>

### Refactor

Changing how code is written without changing what it does.

**Why it matters.** If behaviour changes too, it isn't a refactor — it's a rewrite wearing a safer-sounding word, and it needs the testing a rewrite needs.

**You'll hear it.** "That's a refactor, not a fix."

**See also.** [Regression](#regression) · [Test](#test) · [Technical debt](#technical-debt)

<a id="regression"></a>

### Regression

Something that used to work and now doesn't, because of a change somewhere else.

**Why it matters.** It's the cost of moving fast without tests: you fix one thing and break two, and you find out from a user rather than from your own machine.

**You'll hear it.** "That's a regression — it worked last week."

**See also.** [Test](#test) · [Refactor](#refactor) · [Rollback](#rollback)

<a id="rollback"></a>

### Rollback

Putting the previous working version back after a bad change.

**Why it matters.** Knowing you can undo something is what makes shipping fast reasonable. Not knowing whether you can is what makes 5pm deploys frightening.

**You'll hear it.** "Roll it back, we'll debug after."

**See also.** [Deploy](#deploy) · [Commit](#commit) · [Regression](#regression)

<a id="scope-creep"></a>

### Scope creep

The job quietly growing while you work on it — one reasonable addition at a time.

**Why it matters.** Every individual addition is defensible, which is exactly why it wins. You notice at the end, when nothing is finished.

**You'll hear it.** "While we're in there, could we also..."

**See also.** [Spec](#spec) · [YAGNI](#yagni) · [MVP](#mvp)

<a id="spec"></a>

### Spec

A written description of what you're building, agreed before anyone builds it.

**Why it matters.** The expensive mistakes are made before the first line of code, and they cost nothing to fix while they are still sentences.

**You'll hear it.** "That was never in the spec."

**See also.** [Scope creep](#scope-creep) · [MVP](#mvp) · [Plan mode](#plan-mode)

<a id="technical-debt"></a>

### Technical debt

A shortcut you took on purpose, which will cost more the longer you leave it.

**Why it matters.** Debt taken knowingly is a decision; debt taken accidentally is just mess. The word only helps if you write down which one it was.

**You'll hear it.** "That's debt, we'll pay it in Q3."

**See also.** [Refactor](#refactor) · [ADR](#adr) · [YAGNI](#yagni)

<a id="verification"></a>

### Verification

Actually checking that the thing works, rather than checking that it finished.

**Why it matters.** "It ran" and "it worked" are different claims. A green build is not a shipped page, and an agent saying "done" is not evidence of anything.

**You'll hear it.** "Did you open it, or did you just see the checkmark?"

**See also.** [Test](#test) · [Hallucination](#hallucination) · [Deploy](#deploy)

<a id="yagni"></a>

### YAGNI

You Aren't Gonna Need It — don't build for a future you're guessing at.

**Why it matters.** Speculative features are maintained forever and used never, and they make the code harder to change in the direction you actually end up needing.

**You'll hear it.** "YAGNI. Cut it."

**See also.** [Scope creep](#scope-creep) · [MVP](#mvp) · [Technical debt](#technical-debt)
