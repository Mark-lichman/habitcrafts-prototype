/* ============================================================================
   HabitCrafts — evals/extract.mjs
   A DECK IN, A CORPUS OUT.      node extract.mjs <file.pdf> --id ja3 [--force]

   This is the thing `convert(source, outputs, prompt) -> weeks` becomes. The
   prompt is NOT in this file: it is `docs/extraction-prompt-language.md`, so
   refining it is editing a document rather than editing a script, and every
   revision is diffable next to the eval numbers it moved.

   THREE THINGS IT DOES THAT A NAIVE EXTRACTOR WOULD NOT.

   1. CLASSIFY FIRST, THEN CONSTRAIN. `classify.mjs` returns what the document
      affords, and that is fed into the extraction as a hard limit. A vocabulary
      sheet affords no grammar, so the extractor is told it may not return
      rules. Without this the model returns rules for a word list every time,
      because it knows Japanese and the sheet is about Japanese. That is the
      taxonomy's check 2 and this is the cheapest place to stop it.

   2. STORE THE PAGE TEXT. `source.pageText` goes into the corpus, which is what
      lets evals.mjs §13 run the grounding test in the repository with no
      dependencies. The text comes from the PDF, never from the model, so it is
      evidence rather than more output to be checked.

   3. SOURCE-SCOPE THE KEYS. `store.lessonStat(key)` is keyed by lesson key
      alone, so two corpora that both call a lesson `jl-1` would silently SHARE
      a study log: practising lesson 1 of the counter sheet would mark lesson 1
      of 第1課 as done. Every key is prefixed with the corpus id here, and
      evals.mjs asserts it.
   ========================================================================= */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { ExtractedSchema, GeneratedSchema } from './schema.mjs';
import { classify } from './classify.mjs';
import { pagesOf } from './ground.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function apiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const f = process.env.ANTHROPIC_API_KEY_FILE;
  if (f) return readFileSync(f, 'utf8').trim();
  console.error('Set ANTHROPIC_API_KEY or ANTHROPIC_API_KEY_FILE.');
  process.exit(2);
}

/* -------------------------------------------------------------------------- */

const argv = process.argv.slice(2);
const pdfPath = argv.find((a) => !a.startsWith('--'));
const idAt = argv.indexOf('--id');
const id = idAt >= 0 ? argv[idAt + 1] : null;
const force = argv.includes('--force');

if (!pdfPath || !id) {
  console.error('usage: node extract.mjs <file.pdf> --id <shortid> [--force]');
  process.exit(2);
}
if (!/^[a-z][a-z0-9]{1,7}$/.test(id)) {
  console.error(`--id must be a short lowercase slug (it prefixes every key). Got: ${id}`);
  process.exit(2);
}

const outPath = resolve(root, 'prototype/js/corpus', `${id}.js`);
if (existsSync(outPath) && !force) {
  console.error(`${outPath} exists. Pass --force to overwrite.`);
  process.exit(2);
}

const client = new Anthropic({ apiKey: apiKey() });
const pdfBytes = readFileSync(pdfPath);
const pdfBlock = {
  type: 'document',
  source: { type: 'base64', media_type: 'application/pdf', data: pdfBytes.toString('base64') },
};

/* --- step 1: what is it, and what may be taken out of it ----------------- */

process.stderr.write(`\n— ${basename(pdfPath)} —\n  classifying…\n`);
const c = await classify(client, pdfBlock);
process.stderr.write(`  ${c.proposedType} · ${c.ingest.pageCount}pp`
  + ` · affords rules=${c.wouldAfford.rules} items=${c.wouldAfford.items}`
  + ` exercises=${c.wouldAfford.exercises}\n`);

/* --- step 2: the page text, from the PDF and not from the model ---------- */

const { pages } = await pagesOf(pdfPath);

/* --- step 3: extract, bounded by the affordance -------------------------- */

const promptDoc = readFileSync(resolve(root, 'docs/extraction-prompt-language.md'), 'utf8');
const prompt = promptDoc.split('## The prompt')[1].split('\n---')[0]
  .split('\n').map((l) => l.replace(/^> ?/, '')).join('\n').trim();

const bound = `
THIS DOCUMENT HAS ALREADY BEEN CLASSIFIED. Honour it.

  type:     ${c.proposedType}
  one line: ${c.oneLine}
  affords:  rules=${c.wouldAfford.rules}  items=${c.wouldAfford.items}  exercises=${c.wouldAfford.exercises}

${c.wouldAfford.rules ? '' : 'RETURN AN EMPTY `rules` ARRAY. This document contains no grammar section. '
  + 'Any rule you could state about it would come from your knowledge of Japanese rather than '
  + 'from these pages, and that is the single worst failure this product can make.\n'}
Use the key prefix "${id}-" on EVERY key you return: rules, items, properNouns, irregulars and
lessons. Two corpora that share a lesson key share a study log, so an unprefixed key is a bug
that shows up months later as a lesson marked practised that nobody practised.

Every exercise carries \`derivedFrom\`, naming a key you actually extracted. It carries no page:
it is not on any page, because you are writing it.`;

/* TWO SPELLINGS DISAGREE, AND WHICH IS RIGHT DEPENDS ON THE PATH.
   `beta.messages.parse()` wants `output_format` (its auto-parser reads exactly
   that field) and rewrites it internally before sending. `stream()` does not
   rewrite, and the API REJECTS `output_format` as deprecated in favour of
   `output_config.format`. So the streaming path sends the current spelling and
   validates here. Explicit parsing is no loss: it is what names the offending
   field on a mismatch instead of returning a silent null.

   STREAMING, and not to watch it arrive: the SDK refuses a non-streaming
   request whose max_tokens implies it could run past ten minutes. Ducking that
   by lowering max_tokens would trade a loud error for a silently truncated
   corpus, much the worse of the two. */
async function ask(schema, content, label) {
  const stream = client.beta.messages.stream({
    model: 'claude-opus-5',
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content }],
    output_config: { format: betaZodOutputFormat(schema) },
  });
  const res = await stream.finalMessage();
  if (res.stop_reason === 'max_tokens') {
    console.error(`  ${label}: TRUNCATED at max_tokens. Refusing to write a partial corpus.`);
    process.exit(1);
  }
  const body = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  let out = res.parsed ?? res.parsed_output ?? null;
  if (!out) {
    try {
      const v = schema.safeParse(JSON.parse(body));
      if (v.success) out = v.data;
      else v.error.issues.slice(0, 12).forEach((i) =>
        console.error(`  ${label} schema: ${i.path.join('.') || '(root)'}: ${i.message}`));
    } catch { console.error(`  ${label}: not JSON:`, body.slice(0, 300)); }
  }
  if (!out) { console.error(`  ${label}: did not parse (${res.stop_reason})`); process.exit(1); }
  return { out, usage: res.usage };
}

process.stderr.write('  extracting…\n');
const ex = await ask(ExtractedSchema,
  [pdfBlock, { type: 'text', text: `${prompt}\n${bound}\n
THE TITLE IS A NAME, NOT A SUMMARY. Use what the deck calls itself (第3課, 動詞のグループ分け),
or a short noun phrase if it names nothing. A list of the topics inside it is what \`topics\` is
for, and it reads terribly on a shelf. No em or en dashes in it.

THIS CALL EXTRACTS ONLY. Return what is ON THE PAGES: rules, vocabulary, names, irregulars.
Do not write lessons or exercises. A second call builds those from what you return here.

AN IRREGULAR IS A FORM THAT BREAKS A PATTERN, so it only exists where there is a pattern for
it to break. If you are returning no rules, return no irregulars either: an ordinary word is
not irregular just because it is worth learning. Put it in \`items\`.

RECORD THE TRAP. If the pages show an error a learner makes, put it in \`trap\` on the card it
belongs to, verbatim where the deck writes it. That field is the only thing a later call can
build a wrong answer from, so a trap you leave out is a drill that cannot be written. Leave it
empty rather than inventing one from what you know about Japanese.` }],
  'extract');

/* Generation is a SECOND call that never sees the document. It is handed the
   cards that came out of it and nothing else, which makes "generated content
   may only use extracted material" a fact about what the model can see rather
   than a request in a prompt that it is free to ignore. */
process.stderr.write(`  extracted ${ex.out.rules.length} rules · ${ex.out.items.length} items`
  + ` · ${ex.out.properNouns.length} names · ${ex.out.irregulars.length} irregulars\n  generating…\n`);

const gen = await ask(GeneratedSchema, [{ type: 'text', text:
`Build a practice from EXACTLY these extracted cards. You cannot see the source document, and
that is deliberate: everything you write has to be buildable from what is below.

${JSON.stringify({ rules: ex.out.rules, items: ex.out.items, properNouns: ex.out.properNouns,
    irregulars: ex.out.irregulars, spacing: ex.out.source.spacing }, null, 1)}

Every one of these is checked by scripts/evals.mjs, so a violation is a red build, not a note:

1. Every word in an exercise answer must be built from the cards above. If a sentence needs a
   word that is not there, write a different sentence. Do not reach into your own Japanese.
2. Exercise types: produce, transform, discern, describe, recall. Nothing else. EVERY ONE OF
   THEM ANSWERS IN JAPANESE. \`describe\` means "say a Japanese sentence about this picture or
   situation"; it does not mean "explain the grammar in English". An English answer is an
   English exercise, and the learner is not here to practise English. The \`prompt\` may be in
   English. The \`answer\` may not.
3. Every exercise sets derivedFrom to a key above. It gets no page; it is not on one.
4. Every discern distractor must be an error one of the cards records, in \`trap\` or
   \`expected\`. If no card records an error you can build a distractor from, DO NOT WRITE A
   DISCERN EXERCISE AT ALL. Zero discern exercises is a correct answer and a common one.
   A particle contrast you happen to know about Japanese is not a recorded trap: inventing
   one is the same failure as inventing a grammar rule, wearing a different hat.
11. Include a question with id "q-duration" asking how long a daily session should be, with
   options in minutes. It is the budget everything else is cut to fit, so it is not optional.
   CHECK YOUR OWN NUMBERS BEFORE YOU ANSWER: the SMALLEST option you offer must be at least as
   long as your SHORTEST lesson, or the person who picks it is promised a lesson and handed
   nothing. If your shortest lesson is 7 minutes, do not offer 5. Either raise the smallest
   option or write a shorter lesson; both are fine, offering a budget nothing fits is not.
5. Order lessons by dependency. Never use a pattern a later lesson introduces.
6. Prefix every lesson key with "${id}-".
7. Modified Hepburn with macrons. Spacing is "${ex.out.source.spacing}".
8. Name the script. Say hiragana or katakana, never "kana".
12. NO EM OR EN DASHES (— –) in anything a learner reads: titles, blurbs, prompts, lesson
   bodies, option labels. 58 were removed from this product by hand. Recast the sentence or
   use a colon; do not swap in a hyphen and call it done.
9. A clarifying question must change the output. If the practice is identical either way it is
   a survey question and does not belong.
${ex.out.rules.length ? '' : '10. There are NO rules above, so there is no grammar to drill. Build vocabulary lessons.\n'}` }],
  'generate');

/* A discern's `answer` is an INDEX; every other type's is the answer text. The
   schema has to call it a string either way (one field, one type), so the
   coercion happens here, once, on the way to disk. Leaving it a string made
   `evals.mjs` report "every discern answer indexes a real option" as a failure
   against data that was correct. */
for (const l of gen.out.lessons) {
  for (const e of l.exercises) {
    if (e.type === 'discern') e.answer = Number(e.answer);
    if (e.type !== 'discern') { delete e.options; delete e.because; }
  }
}

/* THE DASH REPAIR PASS.
   Rule 12 tells the model not to use em or en dashes in anything a learner
   reads, and it obeys most of the time, which is the worst of the three
   possible outcomes: a rule that mostly works produces a red build on a
   different corpus each run.

   The fix is NOT a find-and-replace. CLAUDE.md is explicit that the sentence
   gets recast, and swapping — for a hyphen leaves a sentence that was built
   around a dash and now reads as though a character went missing. So the
   offending strings go back to the model to be rewritten, and only those: a
   whole-corpus regeneration would reroll forty exercises to fix four sentences.

   One pass, not a loop. If it comes back still dashed, the eval says so and a
   person decides, which is better than a script that retries until it gets an
   answer it likes. */
const DASH = /[—–]/;
const facing = (g) => [
  ...g.lessons.flatMap((l) => [l.title, l.standfirst, ...l.body,
    ...l.exercises.flatMap((e) => [e.prompt, e.because]),
    ...Object.values(l.habitSuggestion)]),
  ...g.questions.flatMap((q) => [q.ask, q.why, q.affects,
    ...q.options.flatMap((o) => [o.label, o.consequence])]),
  ...Object.values(gen.out.proposedHabit).filter((v) => typeof v === 'string'),
].filter((s) => typeof s === 'string');

const dashed = [...new Set(facing(gen.out).filter((s) => DASH.test(s)))];
if (dashed.length) {
  process.stderr.write(`  ${dashed.length} string(s) use an em or en dash; asking for recasts…\n`);
  const Recast = z.object({
    recasts: z.array(z.object({ before: z.string(), after: z.string() })),
  });
  const fix = await ask(Recast, [{ type: 'text', text:
`Rewrite each of these so it contains no em dash and no en dash. RECAST THE SENTENCE. Do not
swap the dash for a hyphen, a comma or a semicolon and hand back the same clause structure: a
sentence built around a dash reads as though a character fell out when you do that. Use a
colon, a full stop, or a different construction. Keep the meaning, the Japanese, and roughly
the length. Return every one, with \`before\` copied EXACTLY so it can be matched.

${JSON.stringify(dashed, null, 1)}` }], 'recast');

  let applied = 0;
  const swap = (s) => {
    if (typeof s !== 'string') return s;
    const hit = fix.out.recasts.find((r) => r.before === s);
    if (hit && !DASH.test(hit.after)) { applied++; return hit.after; }
    return s;
  };
  for (const l of gen.out.lessons) {
    l.title = swap(l.title); l.standfirst = swap(l.standfirst);
    l.body = l.body.map(swap);
    for (const e of l.exercises) { e.prompt = swap(e.prompt); e.because = swap(e.because); }
    for (const k of Object.keys(l.habitSuggestion)) l.habitSuggestion[k] = swap(l.habitSuggestion[k]);
  }
  for (const q of gen.out.questions) {
    q.ask = swap(q.ask); q.why = swap(q.why); q.affects = swap(q.affects);
    for (const o of q.options) { o.label = swap(o.label); o.consequence = swap(o.consequence); }
  }
  for (const k of Object.keys(gen.out.proposedHabit)) {
    gen.out.proposedHabit[k] = swap(gen.out.proposedHabit[k]);
  }
  const left = facing(gen.out).filter((s) => DASH.test(s)).length;
  process.stderr.write(`  recast ${applied}, ${left} still dashed\n`);
}

const x = { ...ex.out, ...gen.out, regularAges: [] };
const usage = {
  input: ex.usage.input_tokens + gen.usage.input_tokens,
  output: ex.usage.output_tokens + gen.usage.output_tokens,
};

/* --- step 4: write a corpus the prototype can load ----------------------- */

const j = (v) => JSON.stringify(v, null, 2).replace(/\n/g, '\n');

/* The irregular drill is DERIVED, not asked for: it is exactly the irregulars,
   and asking the model for it again would be a second definition that can
   disagree with the first. */
const drill = x.irregulars.length ? {
  key: `${id}-drill`,
  title: 'The ones that break',
  minutes: 1,
  recurs: 'every session, until missed twice in a row stops happening',
  why: `${x.irregulars.length} irregular forms against the regular ones means a fraction of the `
    + 'exposure, for the forms that are hardest. Drilling them apart is the point of the bucket.',
  cards: x.irregulars.map((i) => ({ front: String(i.n || i.en || ''), back: i.ja, romaji: i.romaji, trap: i.expected })),
} : null;

const file = `/* ============================================================================
   HabitCrafts — corpus/${id}.js   GENERATED, DO NOT HAND-EDIT.

   ${x.source.title}${x.source.subtitle ? ` (${x.source.subtitle})` : ''}
   From ${basename(pdfPath)}, ${c.ingest.pageCount} pages.
   Extracted ${new Date().toISOString().slice(0, 10)} by evals/extract.mjs, prompt in
   docs/extraction-prompt-language.md.

   Classified as ${c.proposedType}, affording rules=${c.wouldAfford.rules}
   items=${c.wouldAfford.items} exercises=${c.wouldAfford.exercises}, and the extraction was
   bounded by that. Re-extract rather than editing: a hand-edit here is a number
   the evals will report as the model's.
   ========================================================================= */

export const source = ${j({
    id: `src-${id}`,
    ...x.source,
    author: 'Class deck',
    kind: 'pdf',
    filename: basename(pdfPath),
    pages: c.ingest.pageCount,
    addedAt: new Date().toISOString().slice(0, 10),
    rightsConfirmed: true,
    documentType: c.proposedType,
    affords: c.wouldAfford,
    ingest: {
      textLayerChars: pages.join('').replace(/\\s/g, '').length,
      textLayerIs: c.ingest.textLayerIs,
      pagesAreImages: c.ingest.pagesAreImages,
      note: c.oneLine,
    },
    /* From the PDF, never from the model. This is what makes the grounding
       test in scripts/evals.mjs §13 evidence rather than more model output. */
    pageText: Object.fromEntries(pages.map((t, i) => [i + 1, t])),
  })};

export const detected = ${j({ ...c, id: 'language' })};

export const rules = ${j(x.rules)};

export const items = ${j(x.items)};

export const properNouns = ${j(x.properNouns)};

export const irregulars = ${j(x.irregulars)};

export const regularAges = ${j(x.regularAges)};

export const lessons = ${j(x.lessons)};

export const questions = ${j(x.questions)};

export const irregularDrill = ${j(drill)};

export const proposedHabit = ${j(x.proposedHabit)};

export default {
  source, detected, questions, rules, items, properNouns, irregulars, regularAges,
  lessons, irregularDrill, proposedHabit,
};
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, file, 'utf8');

const n = (a) => (a || []).length;
process.stderr.write(`  wrote prototype/js/corpus/${id}.js\n`
  + `  ${n(x.rules)} rules · ${n(x.items)} items · ${n(x.properNouns)} names`
  + ` · ${n(x.irregulars)} irregulars · ${n(x.lessons)} lessons`
  + ` · ${x.lessons.reduce((a, l) => a + n(l.exercises), 0)} exercises\n`
  + `  tokens in=${usage.input} out=${usage.output}`
  + `  ≈ $${(usage.input * 5e-6 + usage.output * 25e-6).toFixed(2)}\n`);
