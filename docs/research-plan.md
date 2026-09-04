# HabitCrafts — AI-Guided User Research Plan

**Version:** 1.0 · **Date:** 2026-08-20
**Reads:** research digest (methodology, AI tooling, recruiting ops, deeper evidence), issues #2/#3/#4
**Answers:** "how do I run 40-odd 15-minute interviews next month, with AI where AI works, and come out with a decision about E1/E2/E3?"

This document decides things. Where the evidence conflicts, it picks a side and says why.
Where a choice would need legal input, it takes the conservative option and moves on — there
is no legal section in this plan and nothing in it requires one.

---

## 1. The five decisions

### Decision 1 — The prototype does not appear in the discovery call. At all.

The no-pitch rule wins, completely: **the product is not named before 13:30 of any interview,
and the prototype is never shown inside the 15 minutes.** Naming it earlier contaminates
everything after — the listener immediately understands what you want them to say — and a
15-minute call has no room for a task anyway. A prototype walkthrough is a task, not a
stimulus, and NN/g explicitly lists task demonstration as an AI-moderation do-not-use case.

But the prototype is not wasted — it is **repositioned as the commitment currency**. The
front doors serve the follow-up, not the opening:

- **E3 / E2-members:** the closing ask is *"if I set this up for the thing you just told me
  about, should I send it?"* A yes gets a personalised prototype link within 24 hours. The
  link is instrumented (§7). A yes + real engagement is the only E3 COM 3. The prototype is
  the measurement instrument for commitment, not a stimulus for opinions.
- **E1 / E2-operators:** the COM-1/COM-3 rung is a 30-minute second session. **That second
  session is the prototype session** — live call, screen share, human watching them find (or
  fail to find) their front door. Agreeing to it is the commitment data; what they do in it is
  the usability data. Two birds, one scheduled call.

So there is a second session — but only for people who paid for it in commitment currency.
That is the correct filter: you never show the prototype to anyone whose interest you haven't
already measured without it.

### Decision 2 — E1 is human-moderated. Say it plainly: AI moderation is wrong for E1.

The user asked for AI-guided interviews across all three segments. For E1 the evidence says
no, and this plan says no:

- E1 is generative discovery about a status-laden, ego-invested topic (does *your* book
  change behaviour?) with domain experts. That is three of NN/g's four do-not-use cases at
  once.
- The disclosure advantage of AI runs through reduced fear of judgement — it helps
  shame-laden topics (E3's "I buy books and never read them") and **reverses** for status
  maintenance. There is literally no study of AI interviewers with experts about their own
  work; the closest analogues (Liu 2023, Kim 2022) predict worse candour, not better.
- Documented AI sycophancy is uniquely corrosive here: an interviewer that tells an author
  their work sounds insightful will never obtain a candid self-assessment, and an author has
  the fluency to accept the flattery and move on.
- The required skill for E1 is contradiction-chasing — noticing the gap between claim and
  evidence — which is precisely the skill the literature says AI lacks ("88% of failures to
  follow up on a surprising answer were the AI's").

**"AI-guided" still means something real for E1**, and it is most of the work: AI writes the
per-creator prep brief (their book, their audience, a specific passage to reference), Fathom
records and transcribes the call, AI produces the interview snapshot within 20 minutes,
codes against the rubric, and red-teams the founder in pilot runs. The AI does everything
except sit in the chair. The chair is the one place it demonstrably underperforms for this
segment. Same verdict for E2-operators, same reasons — they are payer-side, budget-holding,
professional respondents.

**E3 and E2-members get genuine AI moderation** (UserCall, async), and there the evidence is
genuinely favourable: bounded, known-topic, first-person, shame-laden — the exact profile
where AI is at or near parity and disclosure improves.

### Decision 3 — Objective 2 gets the depth. Everything else is fast capture or off-call.

Talk budget is ~1,400–1,700 participant words: three or four substantive topics, fewer for an
AI moderator. Five equal-weight objectives would produce five shallow non-answers. So:

- **Depth (4 minutes, 27% of the call): Objective 2** — the behavioural anchor. One
  well-told story about the last time they tried to turn learning into practice incidentally
  supplies evidence for Objectives 1, 3 and 5 (what mattered, what would have helped, what it
  cost). This is the keystone and it is scored as one (BE 0–3).
- **Fast structured capture on-call:** Objective 1 (laddering-lite, two rungs, hard stop),
  Objective 4's behavioural half (substitution labour + past spend), Objective 5 (two fixed
  importance questions — the compared number).
- **Off the call entirely:** everything enumerable goes to the async screener (segment, most
  recent material, tools, anything currently paid, audience/community size, one behavioural
  verification item — this alone buys back ~4 minutes). All pricing goes to the post-call
  Van Westendorp micro-survey, sent within 60 seconds of ending, labelled DIRECTIONAL n<20,
  reported in a separate section from everything else. The improvement question ("if you
  could change one thing…") lives on-call for human interviews but is the pre-decided first
  sacrifice on overrun, and it is duplicated as the micro-survey's open question so a cut
  costs a probe, not the data point. The AI version pre-cuts it (an AI's 15 minutes is
  smaller than a human's) and relies on the micro-survey.

No prices are ever spoken by the interviewer, human or AI.

### Decision 4 — E2 splits into two strata, and they get different moderation.

Members and operators are different economic actors with different budgets and different
jobs; mixing them in one 15-person cell makes E2 look incoherent for reasons unrelated to the
market. And E2's riskiest assumption — *who pays, operator or member* — cannot be answered by
a cell that blurs them. So:

- **E2-O, operators, n=5, human-moderated** — run with the E1 method (they are payer-side,
  status-laden, and get the budget/authority block). Five is too few for saturation claims
  and this plan does not make any; E2-O exists to answer one narrow question: does an
  operator budget line exist at all?
- **E2-M, members, n=10, AI-moderated async** — run with the E3 method (first-person,
  shame-laden, bounded), on the same UserCall subscription at near-zero marginal cost. Async
  also spends the partner's endorsement once at maximum yield instead of burning it on a
  scheduling grind.

Reported separately, never pooled. The convenient side effect: every payer-side actor
(E1, E2-O) is human-moderated and every user-side actor (E3, E2-M) is AI-moderated, so
within-side comparisons are mode-clean. The cross-side mode confound is logged as a
limitation (§10) — it is the price of Decision 2 and it is worth paying.

### Decision 5 — The AI is a depth recorder, not a depth generator. Brief it as one.

The best evidence (Barari 2025, N=1,800) is blunt: AI probing adds volume — more words, more
entropy — but the evidence that it adds genuinely *new* content is null. Kuric 2024: GPT-4
follow-ups elaborated existing findings but surfaced *fewer* new issues than a static
pre-written list. So the AI moderator is not asked to discover anything. It is asked to:

- deliver the fixed stems verbatim, in order, time-boxed;
- drive every story to **dateability and specificity** (the BE=2/3 thresholds) with
  pre-written probes — this is recording depth the participant brought, which is what AI
  demonstrably does well;
- **record failure as data**: three specificity attempts, then move on and let BE=0 stand —
  a vague answer must never masquerade as behavioural evidence;
- capture verbatim quotes and confirm its summary ("did I get that right?");
- never evaluate, never pitch, never ask a would-you question (the full guardrail set is in
  the system prompt, §6).

What only a human still does: chase contradictions, take the unplanned detour (usually where
the value is), observe the prototype live, interview anyone with status in the topic, and
**read every AI transcript within 24 hours** — the AI's own quality assessment cannot be
trusted (low LLM–human inter-rater reliability), so the founder reads transcripts, not
AI summaries of transcripts, before coding is accepted.

---

## 2. Per-segment plan

### E1 — Creators (issue #2). Human-moderated. n=12.

- **Moderator:** founder, on Google Meet + Fathom (free tier; states it does not train on
  customer data; diarisation and any sentiment features off).
- **Recruiting:** no panel reaches this segment — verified. Cold outreach + warm network.
  Target **mid-list creators (1k–10k list/audience)** deliberately: the podcast-pitch data
  says sub-1K-audience targets book at 10× the rate of 50K+, and mid-tier is HabitCrafts'
  market anyway — free alignment. Plan **~40 warm-network asks first** (warm intros collapse
  the funnel to ~35–45 asks total), then **up to 250 individually researched contacts**
  (campaigns under 50 contacts reply at 5.8% vs 2.1% for 1,000+; heavy personalisation
  roughly doubles reply). LinkedIn in parallel — it out-replies cold email ~3× for this
  segment. Expect ~4–5% completes per cold contact; the funnel maths says 250–300 contacts
  covers 12 completes with the warm layer on top.
- **The pitch:** the podcast-guest frame — "15 minutes, recorded, about how your readers
  actually use your book; I'll send you the recording and the aggregated findings." Buy the
  book first and reference a specific passage — demonstrated familiarity is *the*
  discriminator between a yes and a delete in both podcast datasets.
- **Incentive: none.** This segment pays agencies $1,500–4,000/month to be interviewed; a
  $50 gift card reframes an expert as a survey respondent. Offer instead: the aggregated
  benchmark findings (highest-perceived-value B2B incentive, and it costs nothing — you are
  producing it anyway), citation by name if they want it, early access, charity donation in
  lieu. **Flagged bias, carried through analysis:** no-pay selects for the
  already-interested and inflates E1's EOS and COM. Interpret E1's scores against that.
- **No-shows:** B2B remote is the worst cell (10.4%). Book 14 to complete 12. Cal.com free
  tier (email + SMS reminders — the only free scheduler that has both): confirm at booking,
  day before, few hours before. Recruit no more than two weeks out.
- **Timeline:** outreach starts week 0; interviews weeks 1–4.

### E2-O — Community operators (issue #3, payer half). Human-moderated. n=5.

- Same stack and method as E1 (Meet + Fathom, founder moderates, budget/authority block in).
- **Recruiting:** Skool and Circle community owners (no platform-wide rules — the owner is
  the unlock; one yes from an owner of a 2,000-person community beats 500 cold emails),
  ALLi's partner path, plus the E2 partner's own operator network. ~60 personalised asks.
- **Incentive:** $50 framed as compensation for time, with a donate-to-their-community
  toggle. Operators are professionals but not celebrities; the E1 no-pay logic only half
  applies, and $50 keeps the funnel honest.

### E2-M — Community members (issue #3, user half). AI-moderated async. n=10.

- **Tool:** UserCall Core ($199/mo, 25-minute cap — needed because an AI "15-minute"
  interview actually runs 10–22 minutes; the Lite tier's 12-minute cap is disqualifying).
  Voice. The text-vs-voice evidence cuts against voice on depth, but UserCall's exact-phrase
  controls, probe-count controls and PostHog integration are worth more at this length than
  the text elaboration advantage; the interview is short enough that voice fatigue does not
  bind.
- **Recruiting:** one partner community. **The partner sends; you never touch the list.**
  Members opt in by clicking the screener link; your privacy notice appears at that point.
  Funnel maths: to get 10 completes you need roughly 1,200–2,500 members reached at
  association-email benchmarks (33.5% open, 2.7% click), halved with a personally-signed
  operator endorsement. **Explicitly ask the partner to include a lapsed/low-engagement
  slice and screen out board members and committee chairs** — an endorsed email otherwise
  reaches the most engaged 5%, who select almost perfectly *against* a study about people
  who don't apply what they learn. Agree in writing up front: partner may factually review
  and embargo timing; may not edit conclusions; never receives identified respondent-level
  data; gets 2 aggregate-only questions at the end of the screener as the costless
  concession. No exclusivity beyond a short window.
- **Incentive:** $30 guaranteed voucher with a one-click "donate mine to the community"
  toggle. Not a raffle — the partner will suggest one because it is cheap and feels
  community-appropriate; the meta-analytic evidence (46 RCTs) says lotteries convert worst
  of the three incentive types. Pay everyone.
- **AI disclosure in the invitation and again at the start** — people abandon AI interviews
  on late discovery (30% abandon-on-sight in the one dataset that measured it); a late
  reveal converts a completed interview into a wasted incentive.

### E3 — Consumers (issue #4). AI-moderated async. n=13.

- **Tool:** same UserCall subscription and guide (frame substitutions only).
- **Recruiting:** Prolific, ~$21.50/complete ≈ $280, with a **behavioural-verification
  screener item** ("name the last book or course you paid for, and when") to counter
  screener fraud. **Channel effects will exceed segment effects unless deliberately
  diversified** — so 10 from Prolific plus a genuine attempt at 3 from one non-panel
  channel (a mod-approved subreddit post or a newsletter swap; message mods first, every
  time). **Log channel per participant**; if the non-panel channel yields nothing, that is
  itself E3 reachability data — record it, don't hide it.
- **Incentive:** panel rate on Prolific; $25 voucher off-panel.
- Over-recruit by 2 — async has no no-shows but has quality failures; UserCall's per-
  interview cost makes the float cheap.

### Pilots — non-negotiable, all segments

Two pilots per segment, flagged and excluded from analysis. For the AI guide: run it on
yourself twice, then one friendly participant, before a single credit is spent on strangers.
For E1: recruit one outside person (a PM or researcher friend) to run 4 of the 12 with the
identical script — E1 is the founder's strongest-conviction segment and the confirmation trap
is the top-ranked bias risk; if founder-run interviews score systematically higher, that
difference is the bias, measured. If no outside moderator can be found, fall back to blind
scoring of anonymised transcripts and say so in the write-up.

---

## 3. The 15-minute structure

### Human calls (E1, E2-O)

```
0:00–0:45   Frame + consent — scripted verbatim (§4), on the recording
0:45–1:30   Segment anchor / warm-up — the only genuinely segment-specific block
1:30–5:30   THE BEHAVIOURAL ANCHOR — 4:00 on one question; for E1/E2-O this is their
            OWN last attempt to get someone to apply the material (dated, specific),
            never speculation about the audience in general
5:30–7:30   Struggle probe INSIDE the story, then the went-well question (CIT needs both)
7:30–9:00   Laddering-lite — 2 rungs, hard stop
9:00–10:30  Substitution labour + past spend; E1/E2-O add budget/authority probes
10:30–12:00 Improvement probe (subtraction framing) + the "who should be doing that"
            probe — the single most diagnostic E1 payer-direction question
12:00–13:30 Importance pair — fixed wording; this is the compared number
13:30–14:30 Commitment ask — THE ONLY PLACE THE PRODUCT IS NAMED. Escalate, stop at
            first refusal. The 30-minute second session offered here IS the prototype
            session.
14:30–15:00 Close: referral + follow-up permission + micro-survey heads-up
```

### AI async sessions (E3, E2-M) — written for 3 substantive topics, not 5

An AI cannot compress its own overhead and cannot detour, so its 15 minutes buys less. The
guide is 3 topics plus scripted bookends, with the most important block **third** — early
enough that drop-outs and overruns don't eat it:

```
Block 0   Scripted: intro + AI disclosure + consent + "I'm not going to show you a
          product" (~1:00)
Block 1   Warm-up anchor (~1:30)
Block 2   Laddering-lite, 2 rungs, hard stop (~2:00)
Block 3   THE BEHAVIOURAL ANCHOR + struggle + went-well (~5:00) — the deep block
Block 4   Substitution + past spend + importance pair (~3:00, light probing)
Block 5   Scripted close: one context sentence + the send-offer + micro-survey
          heads-up (~1:00)
```

The improvement probe is pre-cut from the AI guide (it is the designated sacrifice anyway)
and captured by the micro-survey's open question instead.

### Overrun sacrifice order — pre-decided, identical across all ~40, logged every time

1. Cut the improvement probe (micro-survey backstops it).
2. Cut laddering rung 2.
3. Cut the warm-up.
4. **Never cut the commitment ask or the consent.**

Overruns handled ad hoc become a hidden, non-random source of missing data. Log every cut
against the participant ID.

---

## 4. The question bank

Frame substitutions, applied mechanically:

- `{audience}` = your audience (E1) · the community (E2-O/E2-M) · you (E3)
- `{material}` = your course or book (E1) · the community's method (E2-O/E2-M) · what you
  read (E3)
- `{window}` = the last three months (E1, E2-O, E2-M) · the last month (E3). The window
  difference is a logged between-segment methodological choice: applying what you read is
  routine and low-salience and decays fast (30 days for E3); launches and cohorts are rarer
  and more salient (90 days for the rest).

**Consent [CORE, verbatim — start recording first, wait for an audible yes]:**

> "Before we start — I'd like to record this call. The recording and transcript go through
> AI tools for transcription and summarising; they're not used to train any AI model. I
> store them privately, delete them within 90 days, and only ever quote you anonymously.
> You can ask me to pause, skip a question, or delete the recording at any point. Is that
> okay with you?"

**Frame [CORE, verbatim — immediately after the yes]:**

> "I'm researching how people turn things they learn into actual day-to-day practice —
> including the times it didn't work, which is honestly most of the time for most people I
> talk to. I'm not going to show you a product or pitch you anything."

The "including the times it didn't work" clause is social-desirability inoculation — do not
trim it. The "not going to show you a product" clause is the anti-pitch commitment made out
loud — do not trim it either.

**Warm-up anchor [CORE]:**
- E1: "In your own words, what's the thing you teach, and who's trying to learn it?"
- E2-O: "In your own words, what's the method the community is built around, and who's
  trying to learn it?"
- E2-M: "In your own words, what's the method the community is built around, and what drew
  you to it?"
- E3: "In your own words, what are you trying to get better at right now?"

**Behavioural anchor [CORE — 4 minutes on this one question]:**
- E3: "Tell me about the last time you finished {material} that you actually cared about,
  and then tried to do something with it. Walk me through what happened."
- E1: "Tell me about the last time you tried to get someone in {audience} to actually put
  {material} into practice — a specific person or cohort, in {window}. Walk me through what
  happened."
- E2-O: as E1, with the community frame.
- E2-M: "Tell me about the last time you tried to actually apply {material} to something
  real, in {window}. Walk me through what happened."

Permitted probes, in rough order of value:
- "When was that, roughly?" — always ask; dateability is the BE=2 threshold.
- "Then what did you do?" — the workhorse; three words, buys 30 seconds of story.
- "Do you have that open? What's actually in there?" — artifact elicitation, the
  highest-value probe in the bank; replaces recall with reading at a cost of ~40 seconds.
- "What happened right before that?"
- "How did you know whether it worked?" — codes Loop Closure.
- **Never ask "why did you do that?" here** — invites post-hoc rationalisation and can feel
  accusatory.

Escalating specificity ladder when they generalise: "Can you think of a specific time?" →
"When was that?" → "Where were you?" Maximum 3 attempts / 45 seconds, then move on and record
BE=0. The failure is the data.

**Struggle [CORE ×2, in order]:**
- "Thinking about that same time — what got in the way?"
- "And was there a part of that which actually went well?" (CIT requires positive and
  negative separately; also stops the call becoming a complaint session, which inflates
  severity scores.)

**Laddering-lite [CORE ×3, hard stop at two rungs]:**
- "When you're learning something new, what matters most to you about it?"
- "Why is that one important to you?"
- "And what does that give you?"
- Never a third "why" — forced abstraction manufactures invented values.

**Spend [CORE ×2]:**
- "Have you ever put together something of your own to help with this?"
- "And in the last year, have you spent money on anything to help with this?"
- Probes: what did it cost · still paying? · what made you stop? · (E1/E2-O only) does that
  come out of a budget or your own pocket, and is there a sign-off threshold? E3/E2-M get a
  personal-discretionary-spend probe of equal length so the minute budget stays constant.

**Improvement [CORE — human calls only; first overrun sacrifice]:**
- "If you could change one thing about how that whole experience went, what would it be?"
- E1/E2-O follow-up, always asked if the block survives: "Who do you think should be doing
  that — you, the person who taught it, or something else?" This is the payer-direction
  probe; the answer distribution feeds the E1 kill criterion directly.

**Importance [CORE ×2, verbatim, in order — this is the compared number]:**
- "How often does that come up for you — the gap between learning something and actually
  doing it? Every day, most weeks, now and then, or rarely?"
- "And when it does — what does it actually cost you?"

**Commitment [CORE — the only place the product is named; one sentence of context, then
escalate, stopping at the first refusal]:**

> "For context on why I'm asking: I'm building something that takes a book, a course, or a
> method and turns it into a short daily practice — lessons, quick recall checks, and habits
> that fit into a normal day."

1. "Would it be useful?" — worthless, never coded; asked only to open the ladder.
2. 30-minute session in the next fortnight → COM 1; with a date agreed on the call → COM 3.
   (For E1/E2-O this session is the prototype walkthrough.)
3. Named intro to someone with the same problem → COM 2.
4. E1/E2-O: pilot with one cohort/audience segment → COM 3–4.
5. E3/E2-M: "If I set this up for the thing you told me about, should I send it to the email
   you signed up with? Completely fine to say no." — then **actually build and send it**
   within 24 hours. A yes + subsequent engagement (§7) is the only COM 3 for these segments.

**Never ask (the ones that matter most):** "Would you use an app that turns books into daily
habits?" · "Would you pay $9/month?" · "Do you struggle to apply what you learn?" · "How do
you normally…" (typical-behaviour framing invites an idealised self — always "the last
time") · "Was that because you didn't have time?" (your interpretation smuggled into a
clarifier) · "If we built X, would your audience use it?" (speculation squared — replace
with: "How do you know today whether {audience} actually applies {material}? Tell me about
the last time you checked.") · "What features would you want?" · "Does that resonate?" ·
"Would you be interested in beta access?" (free to say yes to, discriminates nothing).

---

## 5. Off-call instruments

**Async screener (~6 items, in the booking/invite flow):** segment qualifier · what they
consumed most recently and when · tools currently used · anything currently paid for ·
audience/community size (E1/E2) · one behavioural verification item ("name the last course
or book you paid for, and roughly when"). Consent checkbox separate from incentive terms,
unticked by default. Partner's 2 aggregate-only questions at the end (E2-M only).

**Post-call micro-survey (sent within 60 seconds of ending, ~90 seconds to complete):** the
four Van Westendorp questions about the product as described in the commitment sentence,
plus one open question — "If you could change one thing about how that experience went, what
would it be?" All VW output labelled **DIRECTIONAL n<20**, reported in its own section,
never beside the behavioural scores, and **never compared across segments** (units of value
differ — that difference is itself a finding). Keep the same VW instrument running on the
waitlist afterwards so it may legitimately cross n=100/segment later.

---

## 6. The AI moderator system prompt

Paste into UserCall as the study guide/system prompt. The `SEGMENT CONFIG` block at the top
is the only part that changes between E3 and E2-M. Set platform controls to match: probe
count 2, exact-phrasing on for stems marked VERBATIM, session cap 20 minutes, emotion/
sentiment features off.

```
=== SEGMENT CONFIG (E3) ===
MATERIAL   = "what you read"           | E2-M: "the community's method"
WINDOW     = "the last month"          | E2-M: "the last three months"
WARMUP     = "In your own words, what are you trying to get better at right now?"
           | E2-M: "In your own words, what's the method your community is built
             around, and what drew you to it?"
=== END CONFIG ===

ROLE

You are a neutral, independent researcher conducting a short voice interview about how
people turn things they learn into day-to-day practice. You are not affiliated with any
product or company. Never describe, explain, recommend, or defend any product or feature.
If asked what this is for, say: "I'm just gathering experiences — I'll pass your feedback
on." Never speculate about what is being built. There is no product knowledge in this
prompt because you do not need any.

TONE AND CONDUCT

- Do not evaluate, praise, or affirm answers. Never say "great", "interesting",
  "insightful", "that's helpful", or any equivalent. Acknowledge with neutral continuers
  only: "okay", "I see", "mm-hm", "thank you".
- Never take a position on whether an answer is right, wrong, common, or unusual.
- Do not rush. Leave a beat after the participant stops speaking; "still thinking" and
  "finished" sound the same to you, so wait rather than interrupt.
- Never re-ask a question the participant has already substantively answered, even
  partially or out of order. If the answer arrived early, acknowledge it and skip ahead.
- If the participant gives a one-word answer or says "I don't know", ask once for a
  concrete instance. If they still don't engage, move on. Do not ask a third time.
- Ask one question at a time. Never stack questions.
- Phrase questions as "how" or "what". Never open a question with "did", "was", "is",
  "would", or "do you".

THE BEHAVIOUR RULE (most important rule in this prompt)

Never ask whether the participant would like, want, use, need, or pay for anything —
hypothetically or otherwise. Ask only about what they have already done. The single
scripted exception is the CLOSE block, delivered verbatim, and nothing else.

If the participant volunteers enthusiasm, approval, or a compliment about the topic or
about any product they imagine exists, do not accept it or thank them for it. Ask what
they currently do instead, and what they did the last time this came up. Compliments are
not data; do not pursue them.

PROBING RULES

- Maximum TWO follow-up probes per question, then move on. Never a third.
- Probe only to make a story more specific: when it happened, what they did next, what
  the artifact was, how they knew it worked. Do not probe to explore new topics the
  participant has not raised.
- Never ask "why did you do that?" during a story.
- If the participant speaks in generalities ("I usually…", "I tend to…"), say: "Can you
  think of one specific time?" If still general: "When was that, roughly?" If still
  general after a third attempt, move on. Do not press further — the absence of a
  specific instance is a valid answer.

TRANSITION RULE (applies to every block)

Move to the next block when the participant has described at least one specific example
from their own experience, or when they indicate they have nothing more to add, or when
the block's time budget is spent — whichever comes first. Do not linger.

TIME

Target 13–15 minutes total. If the session is running long, compress Block 2 to one rung
and shorten Block 4 probes. Never skip Block 0 or Block 5.

BLOCK 0 — OPENING (VERBATIM, ~1 minute)

"Hi — thanks for making time. Quick disclosure before anything else: I'm an AI
interviewer, and this conversation is recorded and transcribed. It isn't used to train
any AI model; it's stored privately, deleted within 90 days, and only ever quoted
anonymously. You can skip any question or stop at any point. Is that okay with you?"

[Wait for a clear yes. If no, thank them and end the session.]

"I'm researching how people turn things they learn into actual day-to-day practice —
including the times it didn't work, which is honestly most of the time for most people I
talk to. I'm not going to show you a product or pitch you anything. There are no right
answers, and your information stays confidential."

BLOCK 1 — WARM-UP (~1.5 minutes)

Ask WARMUP (verbatim). At most one probe. Move on.

BLOCK 2 — WHAT MATTERS (~2 minutes, hard stop at two follow-ups)

Ask, verbatim: "When you're learning something new, what matters most to you about it?"
Then, verbatim: "Why is that one important to you?"
Then, verbatim: "And what does that give you?"
Then stop this block. Never ask a further "why" here even if the answer is vague.

BLOCK 3 — THE STORY (~5 minutes; the most important block — protect it)

Ask, verbatim: "Tell me about the last time you finished {MATERIAL} that you actually
cared about, and then tried to do something with it — sometime in {WINDOW}. Walk me
through what happened."

Drive this story to a specific, dated instance. Preferred probes (max two, choose the
most relevant): "When was that, roughly?" · "Then what did you do?" · "Do you have that
in front of you — what's actually in there?" · "How did you know whether it worked?"

Then ask, verbatim: "Thinking about that same time — what got in the way?"
Then ask, verbatim: "And was there a part of that which actually went well?"

Before leaving this block, summarise the story in one sentence and ask: "Did I get that
right?" Wait for the response and accept corrections without comment.

BLOCK 4 — WHAT THEY'VE TRIED (~3 minutes, light probing)

Ask, verbatim: "Have you ever put together something of your own to help with this?"
[Up to one probe: what it was, whether they still use it.]

Ask, verbatim: "And in the last year, have you spent money on anything to help with
this?" [Up to two probes: roughly what it cost; whether they're still paying, and if
not, what made them stop.]

Ask, verbatim: "How often does that come up for you — the gap between learning something
and actually doing it? Every day, most weeks, now and then, or rarely?"

Ask, verbatim: "And when it does — what does it actually cost you?"

BLOCK 5 — CLOSE (VERBATIM — the only scripted exception to the behaviour rule)

"Last thing, and for context on why I'm asking: the person running this study is
building something that takes a book, a course, or a method and turns it into a short
daily practice — lessons, quick recall checks, and habits that fit into a normal day.
If they set one up for the thing you told me about today, should they send it to the
email you signed up with? It's completely fine to say no."

[Record the answer. Do not persuade, elaborate, or answer questions about the product —
if asked, say: "I don't have details — I'll pass your question along."]

"Thank you. You'll get a very short two-minute follow-up form by email — it's the last
step and it's how your thank-you payment is confirmed. That's everything from me."

END RULES

- If the participant asks to stop, stop immediately and thank them.
- If the participant is distressed or the topic drifts somewhere sensitive, do not
  probe; return to the guide or end politely.
- If audio fails or answers become unintelligible, apologise once, try once more, then
  end the session gracefully rather than looping.
```

---

## 7. Where the prototype appears, and how it is captured

**Never in the discovery interview.** Two exposure paths, both post-commitment:

**Path A — E3 and E2-M (async, instrumented).** Every send-offer yes gets a personalised
prototype link within 24 hours — for E3, seeded with the actual material they named in Block
3; for E2-M, the community front door with a join code. The link carries a participant ID
parameter. Instrument the prototype with PostHog (free tier): session replay on, plus named
events — `source_uploaded`, `code_joined`, `first_lesson_viewed`, `recall_check_completed`,
`bridge_habit_created`, `abandoned_at_upload`. Behavioural truth comes from the analytics,
joined to the interview on participant ID; UserCall's PostHog integration is a main reason
it was chosen. **COM 3 requires `first_lesson_viewed` within 7 days of the send** — a yes
that never opens the link is coded COM 1 and that decay is itself a finding. One follow-up
question by email at day 7 ("you tried it — walk me through what you expected to happen"):
retrospection is the mode AI and email handle fine; live observation is the mode they
handle badly.

**Path B — E1 and E2-O (live, human-observed).** The 30-minute second session from the
commitment ladder. Screen share on a Meet call, Fathom recording. Task, not tour: "here's
the link — take it from wherever feels natural." Watch them find (or fail to find) the
creator front door, bring a real source of theirs, reach the bridge. A human watching
someone fail to find the upload button learns more in 20 seconds than any instrumentation
will. First 20 seconds of confusion get written down verbatim. No pitching even here —
answer questions asked, volunteer nothing.

Prototype sessions are analysed separately from discovery interviews and never feed the
rubric scores in §8 (except COM, which they operationalise).

---

## 8. The scoring rubric

Scored per participant, identical scales across segments, within 20 minutes of each session
ending (the interview snapshot: quick facts, one verbatim quote, scores, surprises).
Synthesis is a Framework matrix — rows = participants, columns = the fields below — with
rapid templated summaries; this trades some depth for speed, which is the correct trade for
a go/no-go comparison on a one-month clock. Codebook freezes after interview #9 across all
segments; later changes are back-applied and logged. At the end, blind re-code 6 early
transcripts and report the agreement rate — it catches drift, the real enemy across 40
interviews.

| Field | Scale | Notes |
|---|---|---|
| Behavioural Evidence (BE) | 0–3 | **Keystone.** 0 = no specific instance after 3 attempts · 1 = vague routine · 2 = one dateable instance with sequence · 3 = dateable + named artifact + checkable trace |
| Primary Value Tag | closed taxonomy, 1 + ≤2 secondary | retention · application · speed · credential · identity · belonging · accountability · enjoyment · status · income |
| Ladder Depth | 0–2 | 0 attribute · 1 consequence · 2 value |
| Verbatim quote | free text | exact words, no paraphrase — the copywriting asset |
| Practice Stack Tags | closed set | highlights · notes app · spaced repetition · summaries · teaching · checklist · calendar block · partner · cohort · coach · nothing |
| Loop Closure | 0–2 | 0 nothing checks application · 1 ad-hoc self-check · 2 systematic/external — **the recall-checks demand proxy** |
| Decay Point | ≤10 words | never started · stopped day N · finished-not-applied · applied once · sustained |
| Help Tags | closed set | reminders · spaced recall · sequencing · social accountability · paid accountability · progress measurement · content→actions · cohort · integrations · nothing/self-discipline |
| Source of ask | 0–1 | 1 = volunteered unprompted — worth several times a prompted ask; must be distinguishable at analysis time |
| Self-built Substitute | 0–1 | |
| Evidence of Spend (EOS) | 0–4 | 0 never · 1 free tools · 2 paid adjacent in 12mo, lapsed · 3 currently paying, amount known · 4 currently paying AND budget authority / has paid a human |
| Commitment (COM) | 0–4 | 0 compliments · 1 time · 2 reputation (intro/quote) · 3 dated next step or verified prototype engagement · 4 money / pilot / LOI. **Never averaged with EOS.** |
| Stated Price Band | VW micro-survey only | DIRECTIONAL n<20; separate section; never cross-segment |
| Unit of Value | free text | per-seat · per-audience-member · per-book · flat · rev-share — differs across segments by design |
| Pain Severity | 0–3, computed | frequency × named concrete cost, from the importance pair — never asked directly |
| Obstacle Tags | closed set | time · forgetting · no trigger · unclear next action · no accountability · motivation decay · content not actionable · competing priorities · environment mismatch · no feedback |
| Prior Failed Attempts | 0–2 | **2 is the strongest single indicator in the rubric** — pain + budget + a real job, simultaneously |
| Channel | logged | recruiting source per participant — channel effects can exceed segment effects |
| Cuts | logged | which overrun sacrifices were taken |

**Cross-segment:** Segment Opportunity Signal = median(Pain Severity) × median(EOS), always
shown beside the raw distributions, with the falsifier — commitment rate as a raw fraction —
at equal prominence. Compare only unit-free fields: BE, Loop Closure, Pain Severity, EOS,
COM, obstacle and help tag distributions. **Data-quality guard: if a segment's mean BE is
below ~1.5, its other scores are not trustworthy** — a segment that couldn't give you
stories didn't give you data; fix the instrument or the recruit and re-field before
concluding anything. A cross-segment difference justifies a follow-up quantitative test only
at roughly ≥2:1 and ≥6 raw counts apart (e.g. 10/15 vs 3/15).

---

## 9. Kill / scale criteria — written now, before interview #1, and not moved

These are the falsifying conditions the confirmation-trap remedy requires. They are frozen
as of this document's date.

**E1 — Creators. Riskiest assumption: payer direction.**
- **Kill** if all three hold: ≤2/12 score EOS ≥2 (nobody pays for anything adjacent);
  ≤2/12 reach COM ≥2; and on "who should be doing that?", ≤3/12 point at the
  creator/teacher. That is a segment telling you, three ways, that creators don't pay here.
- **Scale-candidate** if ≥6/12 reach COM ≥2 AND ≥5/12 score EOS ≥3 AND ≥3 take the pilot
  rung (COM 3–4). Remember E1 runs unpaid recruiting — its EOS/COM are inflated by
  selection, so these bars are deliberately higher than E3's.
- Guard: mean BE < 1.5 → E1's data is not usable either way; re-field before deciding.

**E2 — Communities. Riskiest assumption: who pays. The split answers it directly.**
- **Operator-pay path dead** if 0/5 E2-O can name an existing budget line or approval path
  AND 0/5 take the pilot rung. (n=5 cannot prove the path works; it can prove a budget
  exists somewhere, which is the only claim being made.)
- **Member-pay path dead** if ≤2/10 E2-M score EOS ≥2 AND ≤2/10 reach COM ≥2.
- Both paths dead → **kill E2**. One path alive → E2 survives as that path only, and
  issue #3 is rewritten around it.

**E3 — Consumers. Riskiest assumption: reachability / acquisition cost.**
- **Kill** if ≤3/13 convert the send-offer into verified engagement (`first_lesson_viewed`
  within 7 days) OR mean BE < 1.5 with median Pain Severity ≤1 — either the pain isn't
  real or the pull isn't.
- **Scale-candidate** if ≥6/13 reach COM ≥3 (verified engagement) AND median Pain
  Severity ≥2.
- Reachability is also measured operationally: log screener→complete conversion and cost
  per engaged user by channel. Prolific yield is not evidence of open-market
  reachability — the non-panel channel's yield (even if zero) is the honest CAC signal,
  reported alongside, not as a kill trigger.

**All segments:** the decision memo reports each criterion as pass/fail against these
frozen thresholds first, and interpretation second.

---

## 10. Cost and timeline

| Item | Cost |
|---|---|
| UserCall Core, 1 month (E3 + E2-M moderation) | $199 |
| Prolific recruiting, E3: 10 completes + screener + 2 pilots | $340 |
| E2-M incentives: 10 × $30 + 2 pilots | $360 |
| E2-O incentives: 5 × $50 (donation toggle offered) | $250 |
| E1 incentives | $0 (flagged selection bias) |
| E1 book purchases, ~12 × $15 | $180 |
| Fathom, Cal.com, PostHog, Meet, Claude analysis | $0 (free tiers) |
| Contingency (extra credits, off-panel E3 vouchers, overage) | $120 |
| **Total** | **~$1,449** |

The unpriced line is founder time: E1's ~250 personalised contacts plus 17 moderated calls
plus 40 snapshots is 40–60 hours across the month. That is the real cost of Decision 2, and
it is worth it. (If E1 recruiting stalls badly by week 2, the fallback is an event
play — Author Nation, Las Vegas, 10–13 Nov, ~$650 ticket, 12–15 in-person interviews in four
days at near-zero no-show — but it blows the budget to ~$2,500 and the timeline to
November, so it is a fallback, not the plan.)

**Timeline — 5 weeks from Monday:**

- **Week 0:** instrument the prototype (PostHog events, participant-ID links); build
  screener + micro-survey; set up Cal.com, Fathom, UserCall; write the E1 contact list
  (warm 40 first); send the partner the one-page memo (partner sends, opt-in only,
  factual-review-not-edit, 2 screener questions, lapsed-segment slice) and agree it in
  writing. Start E1 outreach.
- **Week 1:** 2 pilots per segment (self ×2 then a friendly on the AI guide; 2 human
  pilots). Fix the guide. Partner send goes out. Prolific screener fields. First E1 calls.
- **Weeks 2–3:** core fieldwork. Snapshot within 20 minutes of every session; micro-survey
  within 60 seconds; send-offer links within 24 hours. Read every AI transcript within 24
  hours. Codebook freezes after interview #9.
- **Week 4:** finish fieldwork; run Path-B prototype sessions with committed E1/E2-O
  participants; day-7 engagement checks on Path-A links.
- **Week 5:** blind re-code 6 early transcripts, report agreement; Framework matrix;
  decision memo scored against §9. Update issues #2/#3/#4 with verdicts.

---

## 11. What this study cannot tell you

- **This is three underpowered studies, not one adequate one.** ~40 interviews can kill a
  segment convincingly (nobody pays, nobody commits). It cannot choose between two
  survivors. If two segments pass §9, the next step is a larger quantitative round — the
  waitlist VW instrument is already running for exactly that reason — not a re-read of
  these transcripts.
- **No prices come out of this.** VW at n<20 is directional; units of value differ across
  segments by design; nothing here supports a pricing decision.
- **The mode confound is real.** Payer-side segments were human-moderated, user-side
  segments AI-moderated. Within-side comparisons are clean; any cross-side comparison of
  richness or depth partially measures the moderator, not the market. Flag it in the memo.
- **E1's scores are selection-inflated** by unpaid recruiting; E2-M's are shaped by one
  partner's list even with the lapsed-segment slice; E3's Prolific yield says nothing
  about open-market acquisition cost. Channel is logged per participant so these caveats
  are checkable, not vibes.
- **E2-O at n=5 answers one existence question** (is there an operator budget line
  anywhere?) and nothing else.
- **No one has run a controlled study of 15-minute discovery interviews.** The minute
  allocations here are reasoning, not findings — the pilots exist to catch where the
  reasoning is wrong.
- **Saturation is not reached for meaning.** Code saturation (~9) is plausible per
  segment; meaning saturation (~16–24) is not, especially for E3, which is not a
  homogeneous population. Expect to know *what* the obstacles are, not fully *why*.
- **AI sessions record depth; they do not create it.** Where an E3 transcript is thin, the
  correct read is "this participant brought little", not "there is nothing there" — a
  human follow-up call with 2–3 of the richest E3 participants is the cheap corrective if
  E3 survives.
