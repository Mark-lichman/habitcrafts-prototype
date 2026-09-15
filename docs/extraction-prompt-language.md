# The extraction prompt: language practice

**Version:** 0.1 · **Date:** 2026-09-14
**Reads:** `authorization-and-taxonomy.md` §B, `../prototype/js/knowledge-kinds.js`, `../prototype/js/data-japanese.js`
**Answers:** "what exactly do we ask a model to do with an uploaded class deck?"

This is the prompt that goes behind `convert(source, outputs, prompt) -> weeks` when the
canned corpora are replaced. It lives here rather than inside a script because it is a
product decision, it has to be diffable, and every revision of it moves the eval numbers.

**It defines nothing.** Habit, Learning, Check and Restatement are defined once, in
`authorization-and-taxonomy.md` §B1, and the taxonomy's own review rules say a second
definition is what starts the eval target moving underneath the numbers. Where this file
needs one of those words it cites §B1. Where it needs an exercise type it cites the closed
vocabulary in `knowledge-kinds.js`, which is the machine-readable half of the same thing.

---

## The prompt

> You are decomposing an uploaded language-study source into a practice.
>
> **Read the pages as images.** Many class decks are scans whose text layer is the
> teacher's annotation track over slide images, not the content. If you extract from the
> text layer alone you will produce a confident, wrong practice. Report what you could and
> could not read, per page, in `ingest`. That verdict is recorded separately from the
> quality of the extraction, and saying "page 6 was unreadable" is a correct answer.
>
> **Extract only what is on these pages.** You have read a great deal of Japanese teaching
> material. That knowledge is not the source. If a rule is true of Japanese but is not on
> these pages, it does not go in. If you are unsure whether something came from the deck or
> from what you already knew, leave it out and say so. A practice published under someone's
> name containing advice they never gave is the worst thing this product can do.
>
> **Every extracted thing carries its page and a verbatim quote** from that page. Quote the
> source exactly, including its typos and its inconsistent spelling. A cleaned-up quote
> cannot be matched against the page, and matching is the only thing that makes the
> extraction checkable.
>
> ### What to produce
>
> - `rules` - patterns that transform. Each has a frame, a worked example from the deck, and
>   the error a learner actually makes (`trap`) where the deck shows one.
> - `items` - vocabulary to hold. No transformation, just the pair.
> - `properNouns` - names and places the deck uses. Each declares its `script`.
> - `irregulars` - forms that break the pattern, with `expected` set to the plausible wrong
>   form a learner will produce. These get their own bucket because a generator that mixes
>   them in under-drills them by construction.
> - `lessons` - ordered by dependency, not by deck order. A lesson may not use a pattern
>   introduced by a later lesson.
> - `questions` - clarifying questions asked after extraction. A question that does not
>   change the output is a survey question and costs the person the thing they have least of.
>
> Exercises may only use the types the `language` kind affords in `knowledge-kinds.js`.
> A `habitSuggestion` on a lesson is a Habit as §B1 defines one: one behaviour, one cue,
> small enough to do on the worst day.
>
> ### Rules about the Japanese itself
>
> 1. **Ask only for what you taught.** Every word in an exercise answer must appear in
>    `items`, `properNouns`, `irregulars`, or a rule's frame. If an answer needs a word, add
>    the word. Do not quietly rely on the learner knowing it.
> 2. **One romanisation scheme: modified Hepburn with macrons.** `ginkōin`, not `ginkouin`.
>    `sensei`, not `sensē`. A name that romanises to its source spelling rather than its kana
>    reading (キム is Kim, not kimu) must set `romajiIsSourceSpelling: true`.
> 3. **Kana in Japanese fields.** No romaji in a field the learner reads as Japanese. Latin
>    text that is genuinely on the slide, like a company name, is fine and stays as it is.
> 4. **Declare the script of every term**, and declare the deck's spacing convention on the
>    source. Both are read by machine.
> 5. **A wrong answer must be wrong for a reason written down.** Every distractor traces to a
>    `trap` on a rule or an item, or to an `expected` on an irregular. A distractor that
>    exploits an error nobody recorded teaches nothing and makes the exercise easier.
> 6. **Name the script, never "kana".** Say hiragana or katakana. "Kana" names a category
>    rather than the thing on the card and cannot be acted on by someone who does not already
>    know which script is which.

---

## Why these six and not more

Each one is a check in `scripts/evals.mjs` §9 to §12, and each was added because something
failed rather than because it seemed wise. Rules 1, 4 and 5 came from the first run of the
closed-world and distractor checks against the hand-made pilot corpus, which found that
`やまだ` and `わたし` were demanded in eight places and taught in none, and that one
distractor exploited an error recorded only inside a prose gloss.

The prompt states them because a prompt that omits a rule the eval enforces produces a red
build and no information: you learn that the model did not guess your convention, which you
already knew.

## What this prompt does not do

It does not ask for a confidence score, a self-assessment, or a quality rating. The model's
own view of its output is not evidence, and `research-plan.md` §8's Decision 5 records the
same finding on the interview side: the founder reads transcripts, not AI summaries of
transcripts. The checks are the evidence.
