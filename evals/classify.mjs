/* ============================================================================
   HabitCrafts — evals/classify.mjs
   WHAT DID SOMEBODY JUST UPLOAD?     node classify.mjs <file.pdf> [...]

   Detection comes FIRST, and it is a separate call from extraction on purpose.
   `knowledge-kinds.js` already decides WHAT PRACTICE to build (`language`,
   `skill`, `ideas`, `own`) and says, in as many words, that splitting
   `language` further was the first thing that file got wrong. This is a
   different axis and it does not touch that decision: the kind says what
   practice to build, the document type says WHAT THE UPLOAD PHYSICALLY IS and
   therefore what may honestly be taken out of it.

   THE TAXONOMY IS NOT INVENTED. みんなの日本語 has a published unit structure
   that every 課 follows, and Mark's decks are derived from it:

     文型   bunkei    sentence patterns        -> our `rules`
     語彙   goi       vocabulary               -> our `items`
     例文   reibun    example sentences        -> a rule's `example`
     会話   kaiwa     model conversation       -> (no bucket yet)
     練習A  renshū A  substitution tables      -> `transform`
     練習B  renshū B  production drills        -> `produce`
     練習C  renshū C  conversation drills      -> (no bucket yet)
     問題   mondai    problems                 -> `discern` / `recall`

   WHY THIS EARNS ITS PLACE AS AN EVAL, NOT JUST AS METADATA.
   evals.mjs §2 already says an EMPTY bucket is the cheapest signal detection
   was wrong. The inverse is stronger and is what this enables: a bucket that is
   FULL when the document contains no section that could fill it means the model
   invented its contents. A vocabulary sheet with no 文型 section cannot yield
   grammar rules. If rules come back anyway, they came from the model's memory
   of みんなの日本語 rather than from Mark's upload, and that is the taxonomy's
   check 2, made mechanical.

   This run is deliberately EXPLORATORY. It reports the sections it finds rather
   than forcing each document into a type, because the type list should come out
   of the corpus rather than out of the filenames.
   ========================================================================= */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
/* `betaZodOutputFormat`, not `zodOutputFormat`, and `client.beta.messages.parse`,
   not `client.messages.parse`. Structured outputs live on the beta path in
   @anthropic-ai/sdk 0.70.1; the non-beta `messages` resource has no `parse` at
   all. Checked against the installed package rather than recalled. */
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

/* --------------------------------------------------------------------------
   THE KEY NEVER TOUCHES THE REPOSITORY OR A SHELL HISTORY.
   Environment first. A file path is accepted because that is how the key
   actually exists on this machine, but the path is read here, at the last
   moment, and never echoed.
-------------------------------------------------------------------------- */
function apiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const file = process.env.ANTHROPIC_API_KEY_FILE;
  if (file) return readFileSync(file, 'utf8').trim();
  console.error(`No credentials.
  Either:  export ANTHROPIC_API_KEY=...
  Or:      export ANTHROPIC_API_KEY_FILE="/path/to/key.txt"
The second is safer here: the key stays in one file outside the repository and
never appears in a shell history.`);
  process.exit(2);
}

const SECTIONS = ['文型', '語彙', '例文', '会話', '練習A', '練習B', '練習C', '問題'];

const Schema = z.object({
  sectionsPresent: z.array(z.enum(SECTIONS))
    .describe('Which canonical みんなの日本語 sections this document actually contains. '
      + 'Judge by what is on the pages, not by what a lesson of this number usually has.'),
  sectionEvidence: z.array(z.object({
    section: z.enum(SECTIONS),
    page: z.number().int(),
    quote: z.string().describe('verbatim from the page, including typos'),
  })).describe('One piece of located evidence per section you claim is present.'),
  proposedType: z.string()
    .describe('A short slug for what this document IS, e.g. class-slide-deck, '
      + 'vocabulary-list, conjugation-reference, counter-table, review-summary, phrasebook. '
      + 'Invent one if none fits; the list is being built from the corpus.'),
  typeEvidence: z.array(z.string()),
  rejectedTypes: z.array(z.object({ type: z.string(), because: z.string() })),
  scripts: z.object({
    hasKanji: z.boolean(),
    hasKana: z.boolean(),
    isRomajiOnly: z.boolean()
      .describe('true if the Japanese is written ONLY in Latin letters. This matters: a '
        + 'romaji-only source cannot be reading-checked by kana transliteration at all.'),
  }),
  ingest: z.object({
    pageCount: z.number().int(),
    pagesAreImages: z.boolean(),
    textLayerIs: z.string().describe('what the selectable text layer is, if there is one: '
      + 'the content itself, a teacher annotation track over slide images, OCR, or nothing'),
    unreadablePages: z.array(z.number().int()),
  }).describe('The PARSE verdict, recorded apart from everything else. An extraction that '
    + 'scores only its final output blames the model for a scanner.'),
  wouldAfford: z.object({
    rules: z.boolean(),
    items: z.boolean(),
    exercises: z.boolean(),
  }).describe('Given ONLY what is on these pages, could each bucket be filled honestly? '
    + 'Say false where filling it would require knowledge you brought rather than read.'),
  oneLine: z.string().describe('What this document is, in one sentence, for a human.'),
});

const PROMPT = `Classify this uploaded Japanese study document.

Report what is ON THESE PAGES. You have read a great deal of Japanese teaching material,
including みんなの日本語 itself. That knowledge is not this document. If a section is absent,
say it is absent, even if a lesson of this number normally has one.

The section names are the published みんなの日本語 unit structure: 文型 (sentence patterns),
語彙 (vocabulary), 例文 (example sentences), 会話 (model conversation), 練習A (substitution
tables), 練習B (production drills), 練習C (conversation drills), 問題 (problems). A document
may contain none of them; say so rather than forcing a fit.

Read the pages as images where they are images. Many class decks are scans whose selectable
text is the teacher's annotation over slide pictures, not the content. Report that in ingest.`;

const client = new Anthropic({ apiKey: apiKey() });

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node classify.mjs <file.pdf> [...]'); process.exit(2); }

for (const path of files) {
  const name = basename(path);
  process.stderr.write(`\n--- ${name} ---\n`);
  try {
    const response = await client.beta.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: readFileSync(path).toString('base64'),
            },
          },
          { type: 'text', text: PROMPT },
        ],
      }],
      /* `output_format`, NOT `output_config.format`. Both are accepted by the
         API and both return clean JSON, but @anthropic-ai/sdk 0.70.1's
         auto-parser reads `params.output_format` (lib/beta-parser.mjs:3), so
         the `output_config` spelling silently returns `parsed_output: null`
         with a perfectly valid body sitting in the text block. A wrong-looking
         model failure that is really a client-side plumbing mismatch. */
      output_format: betaZodOutputFormat(Schema),
    });

    const r = response.parsed_output;
    if (!r) {
      /* The SDK returns null rather than raising, so the reason has to be dug
         out by hand. Doing it here means a schema mismatch names the field
         instead of looking like a model failure, which are different verdicts. */
      console.error('  parsed_output is null. stop_reason:', response.stop_reason);
      const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      let json;
      try { json = JSON.parse(text); } catch (e) {
        console.error('  not JSON at all:', text.slice(0, 300)); continue;
      }
      const v = Schema.safeParse(json);
      if (v.success) console.error('  schema is fine; the SDK auto-parse did not run.');
      else for (const issue of v.error.issues.slice(0, 10)) {
        console.error(`  ${issue.path.join('.') || '(root)'}: ${issue.message}`);
      }
      continue;
    }

    console.log(JSON.stringify({ file: name, ...r, usage: {
      input: response.usage.input_tokens, output: response.usage.output_tokens,
    } }));

    process.stderr.write(`  ${r.proposedType}  ·  ${r.ingest.pageCount}pp`
      + `${r.ingest.pagesAreImages ? ' images' : ' text'}`
      + `${r.scripts.isRomajiOnly ? ' ROMAJI-ONLY' : ''}\n`
      + `  sections: ${r.sectionsPresent.join(' ') || '(none)'}\n`
      + `  affords:  rules=${r.wouldAfford.rules} items=${r.wouldAfford.items}`
      + ` exercises=${r.wouldAfford.exercises}\n`
      + `  ${r.oneLine}\n`);
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error(`  API error ${err.status}: ${err.message}`);
    else console.error('  ', err.message);
  }
}
