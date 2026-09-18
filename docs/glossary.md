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

Large language model — the thing doing the writing. It predicts what text should come next, very well, over and over.

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

**See also.** [Prompt](#prompt) · [Agent](#agent) · [LLM](#llm)
