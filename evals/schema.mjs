/* ============================================================================
   HabitCrafts — evals/schema.mjs
   TWO SCHEMAS, BECAUSE EXTRACTION AND GENERATION ARE TWO DIFFERENT JOBS.

   This started as one schema covering the whole corpus, and the API refused it:
   "the compiled grammar is too large". The split that fixed it is the split the
   standard already called for, which is the useful kind of constraint.

     EXTRACTED   rules, items, properNouns, irregulars.
                 On the page. Carries `page` and a verbatim `quote`.
                 Grounding is DIRECT and testable by string search.

     GENERATED   lessons, exercises, questions, the proposed habit.
                 Not on any page. Carries `derivedFrom`, never a page.
                 Grounding is TRANSITIVE, through the card it drills.

   Eight of the nine documents in this corpus contain no drills at all, so
   nearly every exercise a learner sees is written rather than found. Giving one
   a `page` would make authored content look sourced, which is the single thing
   the grounding rule exists to prevent. See docs/lesson-standards.md §3.

   THE GENERATION CALL NEVER SEES THE PDF. It is handed the extracted cards and
   nothing else, which makes "generated content may only use extracted material"
   physically true instead of a sentence in a prompt that the model may ignore.

   Descriptions are terse on purpose: they are part of the compiled grammar, and
   that grammar has a size limit. The reasoning lives here in comments instead.
   ========================================================================= */

import { z } from 'zod';

/* `latin` is not a mistake: a Japanese deck contains SEIKO, TOYOTA, SAMSUNG,
   Oxford. Without it the model has to call those "mixed", and the script check
   then reports a defect whose real content is that the schema had no word for
   what was on the slide. */
const Script = z.enum(['hiragana', 'katakana', 'mixed', 'latin']);

/* -------------------------------------------------------------------------
   EXTRACTED
------------------------------------------------------------------------- */

const Term = z.object({
  key: z.string(),
  ja: z.string(),
  romaji: z.string(),
  en: z.string(),
  script: Script,
  page: z.number().int(),
  quote: z.string().describe('verbatim from that page, typos included'),
  trap: z.string().describe('a misuse error, or empty'),
  romajiIsSourceSpelling: z.boolean().describe('true only for a name spelled as in its source language, e.g. キム -> Kim'),
});

export const ExtractedSchema = z.object({
  source: z.object({
    title: z.string(),
    subtitle: z.string(),
    subject: z.string(),
    unit: z.string(),
    topics: z.array(z.string()),
    blurb: z.string(),
    spacing: z.enum(['learner-spaced', 'natural']),
  }),
  rules: z.array(z.object({
    key: z.string(),
    name: z.string(),
    frame: z.string().describe('the pattern with slots, e.g. N1 は N2 です'),
    romaji: z.string(),
    gloss: z.string(),
    example: z.object({ ja: z.string(), romaji: z.string(), en: z.string() }),
    page: z.number().int(),
    quote: z.string().describe('verbatim from that page, typos included'),
    trap: z.string().describe('the error a learner makes, or empty'),
  })).describe('grammar patterns. EMPTY if the document has no grammar section.'),
  items: z.array(Term).describe('vocabulary'),
  properNouns: z.array(Term).describe('names and places'),
  irregulars: z.array(z.object({
    key: z.string(),
    n: z.number().int().describe('the number it belongs to, or 0'),
    ja: z.string(),
    romaji: z.string(),
    expected: z.string().describe('the plausible WRONG form'),
    note: z.string(),
    script: Script,
    page: z.number().int(),
    quote: z.string(),
  })).describe('forms that break their pattern'),
});

/* -------------------------------------------------------------------------
   GENERATED
------------------------------------------------------------------------- */

export const GeneratedSchema = z.object({
  lessons: z.array(z.object({
    key: z.string(),
    n: z.number().int(),
    title: z.string(),
    minutes: z.number().int(),
    rules: z.array(z.string()).describe('extracted rule keys'),
    items: z.array(z.string()).describe('extracted item keys'),
    irregulars: z.array(z.string()),
    standfirst: z.string(),
    body: z.array(z.string()),
    exercises: z.array(z.object({
      type: z.enum(['produce', 'transform', 'discern', 'describe', 'recall']),
      prompt: z.string(),
      answer: z.string().describe('for discern, the 0-based index as a string'),
      romaji: z.string(),
      options: z.array(z.string()).describe('discern only, else empty'),
      because: z.string().describe('discern only: why the wrong one is wrong'),
      derivedFrom: z.string().describe('the extracted key this drills. Its only provenance.'),
    })),
    habitSuggestion: z.object({
      behavior: z.string(), prompt: z.string(), celebration: z.string(), why: z.string(),
    }),
  })),
  questions: z.array(z.object({
    id: z.string(),
    ask: z.string(),
    why: z.string(),
    affects: z.string(),
    kind: z.enum(['single', 'multi']),
    options: z.array(z.object({
      id: z.string(), label: z.string(), consequence: z.string(), default: z.boolean(),
    })),
  })),
  proposedHabit: z.object({
    behavior: z.string(), prompt: z.string(), celebration: z.string(), why: z.string(),
    minutes: z.number().int(), days: z.array(z.number().int()),
  }),
});
