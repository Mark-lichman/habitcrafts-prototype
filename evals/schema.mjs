/* ============================================================================
   HabitCrafts — evals/schema.mjs
   THE SHAPE OF AN EXTRACTION, AS THE MODEL MUST RETURN IT.

   This mirrors the export shape of `prototype/js/data-japanese.js`, because the
   hand-made pilot corpus IS the specification of what an extraction looks like
   and a second shape would be a second definition.

   TWO FIELDS EXIST ONLY FOR THE EVALS, AND BOTH EARN IT:

   `ingest` is the PARSE verdict, and it is kept apart from everything else on
   purpose. Upload-and-extract products fail at reading the file more often than
   at reasoning about it, and an eval that scores only the final output blames
   the model for a scanner. `pageText` is what makes the grounding test in
   evals.mjs §13 runnable at all: without the text of the page, "does the quote
   appear on the page it cites" is an intention rather than an assertion.

   `romajiIsSourceSpelling` is the declared exemption for a name that romanises
   to its source spelling rather than to its reading. Declared, never inferred:
   inferring it from "the strings did not match" would let a genuinely wrong
   reading hide in the same hole.
   ========================================================================= */

import { z } from 'zod';

const Page = z.number().int().describe('1-based page of the source this came from');

const PageRead = z.object({
  page: Page,
  readable: z.boolean().describe('false if the page could not be read at all'),
  isImage: z.boolean().describe('true if the content is a picture rather than selectable text'),
  text: z.string().describe('Everything readable on this page, verbatim, including typos. '
    + 'This is what the grounding test matches quotes against, so a tidied version is worse '
    + 'than a messy one.'),
  note: z.string().describe('What was hard about this page. Empty string if nothing was.'),
});

const Example = z.object({
  ja: z.string(),
  romaji: z.string(),
  en: z.string(),
});

const Rule = z.object({
  key: z.string().describe('stable slug, e.g. r-negative'),
  name: z.string(),
  frame: z.string().describe('the pattern with slots, e.g. N1 は N2 じゃ ありません'),
  romaji: z.string(),
  gloss: z.string(),
  example: Example,
  page: Page,
  quote: z.string(),
  trap: z.string().describe('The error a learner actually makes, quoted with a ✗ if the deck '
    + 'shows it. Empty string if the deck records none. Distractors trace to this.'),
});

const Term = z.object({
  key: z.string(),
  ja: z.string(),
  romaji: z.string(),
  en: z.string(),
  script: z.enum(['hiragana', 'katakana', 'mixed']),
  page: Page,
  quote: z.string(),
  trap: z.string().describe('A misuse trap for this term, or empty string.'),
  romajiIsSourceSpelling: z.boolean().describe('true only for a name romanised to its source '
    + 'spelling rather than its kana reading, e.g. キム -> Kim'),
});

const Irregular = z.object({
  key: z.string(),
  n: z.number().int().describe('the number or index this form belongs to, 0 if not numeric'),
  ja: z.string(),
  romaji: z.string(),
  expected: z.string().describe('the plausible WRONG form a learner produces'),
  note: z.string(),
  script: z.enum(['hiragana', 'katakana', 'mixed']),
  page: Page,
});

const Exercise = z.object({
  type: z.enum(['produce', 'transform', 'discern', 'describe', 'recall'])
    .describe('only what the language kind affords in knowledge-kinds.js'),
  prompt: z.string(),
  answer: z.string().describe('For discern this is the 0-based INDEX of the correct option, '
    + 'as a string. For everything else it is the answer itself.'),
  romaji: z.string(),
  options: z.array(z.string()).describe('discern only; empty otherwise'),
  because: z.string().describe('discern only: why the wrong one is wrong'),
  page: Page,
});

const HabitSuggestion = z.object({
  behavior: z.string().describe('one observable behaviour, per taxonomy §B1'),
  prompt: z.string().describe('the cue. If you cannot state it, it is not a habit.'),
  celebration: z.string(),
  why: z.string(),
});

const Lesson = z.object({
  key: z.string(),
  n: z.number().int(),
  title: z.string(),
  minutes: z.number().int(),
  rules: z.array(z.string()).describe('rule keys'),
  items: z.array(z.string()).describe('item keys'),
  irregulars: z.array(z.string()).describe('irregular keys'),
  standfirst: z.string(),
  body: z.array(z.string()),
  exercises: z.array(Exercise),
  habitSuggestion: HabitSuggestion,
});

const Option = z.object({
  id: z.string(),
  label: z.string(),
  consequence: z.string().describe('what this answer changes. Empty only for multi questions.'),
  default: z.boolean(),
});

const Question = z.object({
  id: z.string(),
  ask: z.string(),
  why: z.string(),
  affects: z.string().describe('which part of the corpus this rewrites'),
  kind: z.enum(['single', 'multi']),
  options: z.array(Option),
});

export const ExtractionSchema = z.object({
  source: z.object({
    title: z.string().describe('the deck\'s own title, in its own script'),
    subtitle: z.string(),
    subject: z.string(),
    unit: z.string(),
    topics: z.array(z.string()),
    blurb: z.string(),
    spacing: z.enum(['learner-spaced', 'natural'])
      .describe('learner-spaced puts spaces between grammatical units. Read it off the deck.'),
  }),
  ingest: z.object({
    pagesAreImages: z.boolean(),
    textLayerIs: z.string().describe('what the selectable text layer actually is, if any'),
    note: z.string(),
    pages: z.array(PageRead),
  }),
  detected: z.object({
    id: z.literal('language'),
    confidence: z.enum(['low', 'high']),
    evidence: z.array(z.string()),
  }),
  rules: z.array(Rule),
  items: z.array(Term),
  properNouns: z.array(Term),
  irregulars: z.array(Irregular),
  regularAges: z.array(z.object({ n: z.number().int(), ja: z.string() }))
    .describe('the well-behaved members of a counter series, if the deck has one. Empty otherwise.'),
  lessons: z.array(Lesson),
  questions: z.array(Question),
  proposedHabit: HabitSuggestion.extend({
    minutes: z.number().int(),
    days: z.array(z.number().int()),
  }),
});
