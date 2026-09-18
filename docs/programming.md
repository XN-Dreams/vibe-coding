# Programming decisions

Why the series is scheduled and formatted the way it is. Every claim below was
researched across 12 dimensions, then independently fact-checked by fetching the
cited source and checking it actually says what was claimed.

**Of 95 findings, 23 did not survive that check** — 5 cited URLs that did not
resolve at all, 18 were unsupported by the page they pointed to. Those are not
listed here. Nothing below rests on a source nobody opened.

Confidence is marked: **[confirmed]** means the fact-checker fetched the source
and it supports the claim. **[contested]** means the source is real but says
something narrower than the original claim; the narrower version is used.

---

## 1. The eight-hour block stays — but it is now programmed

**The finding that nearly changed the format.** Average live-stream session length
is 25–26 minutes, not eight hours; viewers treat long streams as relay viewing,
dropping in and out rather than watching through. **[confirmed]**
<https://gyre.pro/blog/live-streaming-statistics-insights-from-platforms-to-profit>

And the sharper one, from the completeness critic: *no documented AI-coding
education series in 2025–2026 uses single 8-hour live streams as its primary
format.* The named successful educators in this niche publish 2–4 short videos a
week instead.

**Decision: keep the 8-hour broadcast, stop treating it as one undifferentiated
block.** Each episode is now published as five named blocks with start times, so
a viewer can see that "The framework question" starts at 18:50 in their own
timezone and show up for exactly that. This is what relay viewing needs — it does
not need a shorter stream, it needs a *legible* one.

Three things fall out of the same change for free:

- The blocks are the VOD chapter markers. Videos with chapters achieve 2.18–2.8×
  higher like-to-view ratio. **[confirmed]**
- Two 20-minute breaks are now published rather than improvised, which is the
  operational half of an 8-hour solo stream.
- Each block is a natural clip boundary for short-form.

**What would change this decision:** if episode 2's block-level analytics show
viewers are not arriving for specific blocks, the format is wrong and the honest
move is shorter sessions. That is a measurement, not an argument, and it happens
in episode 3.

## 2. The hour is right. The day is the open question.

The current slot is **16:00 UTC**, which is 11:00 US Eastern — inside the one
window the research confirms for educational coding content, Monday 09:00–12:00
EST. **[confirmed]** <https://gtrsocials.com/blog/best-time-to-stream-on-twitch>

So the hour is not the problem. The day might be:

- Saturday is the strongest overall streaming day, with consistent viewership
  across a much longer window. **[confirmed]**
- Monday's advantage for educational content specifically is **[contested]** and
  quantified nowhere.
- Schedule *consistency* outweighs optimal timing in every source that addressed
  it. **[confirmed]**

16:00 UTC is also 10:00 in Mexico City, which misses the LatAm evening peak of
19:00–01:00 local entirely. **[confirmed]** There is no single slot that serves
LatAm evening, US working hours and European evening at once — 16:00 UTC picks
Europe-evening and US-morning over LatAm-evening, and that is a real trade-off,
not an oversight.

**Open decision, to resolve by episode 3:** pilot one Saturday episode and compare.
Consistency matters more than either choice, so this gets decided once and then
left alone.

## 3. Twitch is the destination, not the front door

> **Corrected 2026-09-18.** The first version of this section recommended moving
> to Science & Technology, on the strength of the decline figure below. That was
> a bad inference and it is withdrawn — see the decision at the end.
>
> It also assumed the series was already in a development category. It was not:
> episode 1 streamed under **IRL**, which is the one category the same source
> says explicitly to avoid.

The "Software and Game Development" category is down **31.4% year-on-year** in both
average viewers and hours watched, with active streamers down 15.2%. It now ranks
150th by average viewers. **[confirmed]**
<https://sullygnome.com/game/software_and_game_development/365>

80% of desktop viewers never scroll past the first three rows of a category, and
position is driven purely by concurrent viewers — so a channel starting from zero
is not findable there. **[contested]** — the source supports the 80% figure but
not the precise positional maths originally claimed.

Current category sizes, same source for both, so they are comparable:

| Category | Viewers | Channels |
|---|---|---|
| Software and Game Development | 1,000–3,000 | 100–200 |
| Science & Technology | 500–2,000 | 50–150 |
| Just Chatting / IRL | the largest on Twitch | the most saturated on Twitch |

<https://streamlint.com/blog/pick-right-twitch-category-discoverability>

On Just Chatting / IRL that source is unambiguous: *"Avoid 'Just Chatting' unless
you have 20+ average viewers already. It's the most saturated category on Twitch."*
At 10 average viewers you are on page 12.

**Why the original recommendation was wrong.** "This category is shrinking"
became "therefore leave it", and that does not follow. Software and Game
Development still carries more viewers than Science & Technology at a comparable
viewer-to-channel ratio, and it matches what the stream actually is. Decline
matters for long-run planning; intent-match decides which category you belong in
today.

**Decisions:**
- Primary category is **Software and Game Development**. Not IRL, which has
  maximum competition and zero intent-match — a viewer browsing IRL is not
  looking for someone building software.
- **Not** Science & Technology. It is smaller on both counts and no better matched.
- Do not expect Twitch to *find* an audience in any category. It is where an
  audience acquired elsewhere comes to watch. This fix stops the category
  actively working against the stream; it is not a growth strategy.

## 4. Multistream to YouTube and Twitch

Twitch has permitted simultaneous multistreaming since dropping exclusivity in
October 2023, subject to quality parity and a prohibition on directing viewers to
other platforms mid-stream. Combined-chat restrictions stopped being enforced in
February 2026, though the ToS clause remains. **[confirmed]**

Tooling (Restream, Castr) is under $150/year for 30+ destinations. **[confirmed]**

**Decisions:**
- Multistream YouTube + Twitch from episode 3. YouTube is where the 8-hour VOD
  lives and stays searchable; Twitch is where live interaction happens.
- No clickable cross-platform links in Twitch chat. Verbal mentions only.
- **X is excluded** as a live platform — not viable for long-form dev streaming
  in 2026. **[confirmed]** It stays a clip-distribution channel.

## 5. LinkedIn over X for announcements

LinkedIn sustains audience growth at 3–5 posts per week where X needs 3–10 per
*day* for comparable visibility — a 5–10× difference in volume for a solo
operator already committed to 8-hour streams. **[confirmed]**
LinkedIn Live carries a 24× engagement multiplier over native LinkedIn posts for
technical subject-matter video. **[confirmed]**

**Decision:** LinkedIn carries episode announcements and between-episode updates
(1–2 posts/week). X is for real-time engagement during streams and clip
distribution, not a daily content obligation.

## 6. The first sixty seconds

Stream openings without immediate context cause disproportionate early
abandonment, particularly for dev content. **[confirmed]**

**Decision — a fixed opening ritual, in the first five minutes of every episode:**
what we are building today, the problem it solves, the one thing you will learn,
and a question to chat. The running order on the schedule page does the same job
for anyone arriving mid-stream.

## 7. Deferred deliberately

**Discord.** The evidence is good — 6 channels maximum for a small server, three
weekly touchpoints, 70% of 100+ member servers go inactive within six months,
onboarding in the first five minutes decides retention. **[confirmed]**

It is deferred anyway, and the reason is the completeness critic's finding: *nobody
researched creator workload sustainability for this exact format.* The plan already
carries an 8-hour live stream, clip editing, LinkedIn posting and a public repo,
solo, from a zero base. Adding three weekly community touchpoints on top is the
most likely cause of the series collapsing in week 3 — and a dead Discord is worse
than no Discord.

**GitHub Discussions** on the existing public repo is the interim community layer.
It costs nothing to run and the repo is already there.

**A Spanish-language channel.** Separate channels outperform mixed-language ones
because YouTube categorises by language. **[confirmed]** But the "less competition"
premise is false: Spanish is at 193 viewers per creator versus English at 119 —
*more* saturated, not less. **[confirmed]**
<https://air.io/en/audience-growth/what-are-the-most-popular-languages-on-youtube>

**Decision:** English-only through episode 5. Revisit as a separate channel after,
never as mixed-language uploads on this one.

---

## What nobody researched

Named honestly, because a gap you know about beats a confident guess:

1. **Creator workload sustainability for this format.** The single most
   decision-relevant unknown. Every finding above concerns the viewer; none
   measures whether one person can sustain this for five weeks.
2. **Whether the audience follows the product.** Episodes 3–5 build a second
   product. If the draw is "teaching with Claude Code" rather than "building this
   specific thing", the series fractures at episode 3 regardless of scheduling.

## Open decisions

| # | Decision | Resolve by |
|---|----------|------------|
| 1 | What the episode 3–5 product is | Episode 2 |
| 2 | Stay static or adopt a framework for submissions | Episode 2 |
| 3 | Saturday pilot vs staying on Monday | Episode 3 |
| 4 | Whether block-level arrivals justify the 8-hour format | Episode 3 |
