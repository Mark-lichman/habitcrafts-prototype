/* ============================================================================
   HabitCrafts — scripts/evals.mjs
   DOES A GENERATED PRACTICE HOLD UP?        node scripts/evals.mjs

   Companion to smoke.mjs. Smoke asks whether the DATA LAYER obeys its rules;
   this asks whether a PRACTICE built from an upload is fit to hand to someone.

   ---------------------------------------------------------------------------
   WHY THIS EXISTS
   ---------------------------------------------------------------------------
   Three defects in the Japanese pilot were found by a human reading screens:

     1. A question declared `kind: 'multi'` and the view rendered radio buttons.
     2. "Do you have a class?" offered weekly or nothing — no 2x/week.
     3. A term was described with the wrong script name.

   Only the first is a contract violation a machine can settle alone, and it is
   checked below. The second is coverage and the third is domain truth; both go
   to the judge tier. That split is the whole design: as soon as generation is
   real, nobody can eyeball every practice, and the ones that are wrong will be
   wrong quietly.

   ---------------------------------------------------------------------------
   TWO TIERS, AND THE HONEST LINE BETWEEN THEM
   ---------------------------------------------------------------------------
   TIER 1 — CONTRACT (here, free, deterministic, no network)
     Structural truths that hold regardless of subject matter. Provenance,
     dangling references, exercise types the kind does not afford, dependency
     order, the emphasis rule. These fail loudly and cost nothing, so they run
     on every change.

   TIER 1.5 — DOMAIN, BUT STILL DETERMINISTIC (sections 9 to 12)
     The line between tier 1 and tier 2 was drawn once and drawn too high.
     "Is this reading correct?" looks like a judge question and is not: a kana
     string determines its own reading, so `lib/kana.mjs` settles it for free.
     So does "did we teach this word before asking for it", which is a set
     difference. Every check that can be moved down from tier 2 should be,
     because tier 2 costs money, needs a network, and has to be validated
     against hand labels before anyone may believe it.

   TIER 2 — JUDGE (not implemented; see the stub at the bottom)
     What is genuinely left after 1.5: grammaticality of a sentence nobody
     wrote down, whether an option set covers the answers a real learner would
     give, and whether a claim came from this deck or from the model's memory
     of みんなの日本語. A model call with a rubric. It is NOT written yet, and
     the stub SAYS SO rather than passing, because a green check that asserted
     nothing would be worse than no check.

   No dependencies, same as everything else here.
   ========================================================================= */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = (p) => import(pathToFileURL(resolve(root, p)).href);

let failures = 0;
let checks = 0;

function section(title) { console.log(`\n— ${title} —`); }
function ok(msg) { checks++; console.log(`  ok   ${msg}`); }
function bad(msg, detail) {
  checks++; failures++;
  console.log(`  FAIL ${msg}`);
  if (detail) console.log(`       ${detail}`);
}
function check(cond, msg, detail) { cond ? ok(msg) : bad(msg, detail); }

/* One corpus per run, named on the command line. `evals-all.mjs` is the loop.
   Kept as one-corpus-per-process on purpose: a failure names the corpus it came
   from, and a corpus that cannot even be imported takes down its own run rather
   than the whole suite. */
const corpusPath = process.argv[2] || 'prototype/js/data-japanese.js';
const JA = (await load(corpusPath)).default;
const KINDS = await load('prototype/js/knowledge-kinds.js');
const KANA = await load('scripts/lib/kana.mjs');

console.log(`\n=== ${corpusPath.split('/').pop()} — ${JA.source.title} ===`);

const kind = KINDS.kind(JA.detected.id);

/* ==========================================================================
   1. PROVENANCE — every generated thing points at a page          [#5] [#8]
   The rule the whole product's trust rests on: a card whose answer cannot be
   located in the source must not exist.
   ====================================================================== */
section('provenance [#8]');

const allExercises = JA.lessons.flatMap((l) => l.exercises.map((e) => ({ ...e, lesson: l.key })));

check(
  JA.rules.every((r) => Number.isInteger(r.page)) &&
  JA.items.every((i) => Number.isInteger(i.page)) &&
  JA.irregulars.every((x) => Number.isInteger(x.page)),
  'every extracted rule, item and exception carries a page',
);

/* AN EXERCISE CARRIES NO PAGE, AND USED TO BE ASSERTED TO CARRY ONE.
   Classification showed that eight of nine documents in this corpus contain no
   drills at all, so nearly every exercise a learner sees was written rather
   than found. A page on written content is a costume: it makes authored
   material look sourced, which is the one thing the grounding rule exists to
   prevent. Its provenance is TRANSITIVE instead, through the card it drills,
   and that card carries the page and the quote. docs/lesson-standards.md §3. */
const extractedKeys = new Set([
  ...JA.rules.map((r) => r.key),
  ...JA.items.map((i) => i.key),
  ...(JA.properNouns || []).map((n) => n.key),
  ...JA.irregulars.map((x) => x.key),
]);

const unsourced = allExercises.filter((e) => !extractedKeys.has(e.derivedFrom));
check(unsourced.length === 0,
  `every exercise names the extracted card it drills (${extractedKeys.size} cards available)`,
  unsourced.map((e) => `${e.lesson}: derivedFrom=${JSON.stringify(e.derivedFrom)} — ${e.prompt}`)
    .join('\n       '));

check(allExercises.every((e) => e.page === undefined),
  'no exercise claims a page of its own',
  allExercises.filter((e) => e.page !== undefined).map((e) => `${e.lesson} p${e.page}`).join(', ')
  + '\n       A generated exercise is not on any page. See docs/lesson-standards.md §3.');

const maxPage = JA.source.pages;
const strays = [...JA.rules, ...JA.items, ...JA.irregulars]
  .filter((x) => x.page < 1 || x.page > maxPage);
check(strays.length === 0, `no page reference falls outside the source (1-${maxPage})`,
  strays.map((s) => `p${s.page}`).join(', '));

check(JA.rules.every((r) => typeof r.quote === 'string' && r.quote.length > 0),
  'every rule quotes the source verbatim');

/* ==========================================================================
   2. THE KIND CONTRACT — a practice may only use what its kind affords
   This is what stops a language practice quietly becoming a quiz about a
   language: `recall` is cheap to generate and `produce` is the skill.
   ====================================================================== */
section('kind contract');

const illegal = allExercises.filter((e) => !KINDS.affords(JA.detected.id, e.type));
check(illegal.length === 0,
  `every exercise type is afforded by "${kind.label}"`,
  illegal.map((e) => `${e.lesson}: ${e.type}`).join(', '));

/* THE KIND SAYS WHAT A PRACTICE MAY CONTAIN. THE DOCUMENT SAYS WHAT IT CAN.
   This used to require every bucket the `language` kind declares, which is
   right for a class deck and wrong for a word list: classification found that a
   vocabulary sheet affords no grammar at all, so demanding a populated
   `patterns` bucket from one demands invention. The affordance is the bound;
   the kind is only the ceiling. Corpora extracted before affordance was
   recorded fall back to the kind, which is what the old check did. */
const affords = (JA.source.affords) || { rules: true, items: true };
const required = kind.extracts.filter((b) => {
  if (!JA.source.affords) return true;
  if (b === 'patterns') return affords.rules;
  if (b === 'vocabulary') return affords.items;
  return false;              /* exceptions are never REQUIRED; most decks have none */
});
check(required.every((b) => Array.isArray(JA[bucketFor(b)]) && JA[bucketFor(b)].length > 0),
  `every bucket this DOCUMENT affords is populated (${required.join(', ') || 'none required'})`,
  'An empty bucket the document affords is the cheapest signal that detection was wrong. '
  + 'A full bucket it does NOT afford is the model inventing, which §2b checks.');

/* The inverse, and the sharper of the two: content in a bucket the document
   cannot fill. A word list has no grammar section, so a rule extracted from one
   came from the model's knowledge of Japanese rather than from the upload. That
   is the taxonomy's check 2, mechanised. */
if (JA.source.affords) {
  const invented = [];
  if (!affords.rules && JA.rules.length) invented.push(`${JA.rules.length} rules`);
  check(invented.length === 0,
    'nothing is extracted from a section the document does not have',
    `${invented.join(', ')} from a ${JA.source.documentType}, which affords none. `
    + 'This is the worst failure mode this product has: content published under '
    + 'someone\'s name that they never wrote.');
}

function bucketFor(name) {
  return { patterns: 'rules', vocabulary: 'items', exceptions: 'irregulars' }[name] || name;
}

/* The emphasis rule. `emphasises: 'exceptions'` is a promise that the hard
   forms get disproportionate contact; without a check it is a comment. */
/* Only where there ARE exceptions. A vocabulary sheet has no pattern for a form
   to break, so it has none, and demanding a recurring drill of nothing is the
   check insisting on a bucket the document cannot fill. The emphasis rule is
   about giving hard forms disproportionate contact, not about manufacturing
   hard forms. */
if (kind.emphasises === 'exceptions' && JA.irregulars.length) {
  const drilled = new Set();
  JA.irregulars.forEach((x) => {
    /* `answer` is a string for produce/transform/recall and an INDEX for
       discern, so it is coerced before matching. */
    const hits = allExercises.filter((e) =>
      String(e.answer ?? '').includes(x.ja) ||
      (e.prompt && e.prompt.includes(String(x.n))) ||
      (Array.isArray(e.options) && e.options.some((o) => o.includes(x.ja))));
    if (hits.length) drilled.add(x.key);
  });
  check(drilled.size === JA.irregulars.length,
    'every exception appears in at least one exercise',
    `missing: ${JA.irregulars.filter((x) => !drilled.has(x.key)).map((x) => x.ja).join(', ')}`);

  check(JA.irregularDrill && JA.irregularDrill.cards.length === JA.irregulars.length,
    'the exceptions have a recurring drill of their own');
}

/* ==========================================================================
   3. REFERENTIAL INTEGRITY — no lesson points at something that is not there
   ====================================================================== */
section('referential integrity');

const ruleKeys = new Set(JA.rules.map((r) => r.key));
const itemKeys = new Set(JA.items.map((i) => i.key));
const irregKeys = new Set(JA.irregulars.map((x) => x.key));

const dangling = [];
JA.lessons.forEach((l) => {
  (l.rules || []).forEach((k) => { if (!ruleKeys.has(k)) dangling.push(`${l.key} -> rule ${k}`); });
  (l.items || []).forEach((k) => { if (!itemKeys.has(k)) dangling.push(`${l.key} -> item ${k}`); });
  (l.irregulars || []).forEach((k) => { if (!irregKeys.has(k)) dangling.push(`${l.key} -> exception ${k}`); });
});
check(dangling.length === 0, 'no lesson references a rule, item or exception that does not exist',
  dangling.join('; '));

const usedRules = new Set(JA.lessons.flatMap((l) => l.rules || []));
check([...ruleKeys].every((k) => usedRules.has(k)),
  'every extracted rule is taught by some lesson',
  `orphaned: ${[...ruleKeys].filter((k) => !usedRules.has(k)).join(', ')}`);

/* ==========================================================================
   4. DEPENDENCY ORDER — a lesson may not lean on a rule taught later
   Extraction reorders (the deck introduces nationality before the sentence
   that uses it); reordering is only safe if it is checked.
   ====================================================================== */
section('dependency order');

const introducedAt = new Map();
JA.lessons.forEach((l, idx) => (l.rules || []).forEach((k) => {
  if (!introducedAt.has(k)) introducedAt.set(k, idx);
}));

const backRefs = [];
JA.lessons.forEach((l, idx) => {
  l.exercises.forEach((e) => {
    JA.rules.forEach((r) => {
      const usesIt = r.frame && frameEcho(r) && String(e.answer ?? "").includes(frameEcho(r));
      if (usesIt && introducedAt.get(r.key) > idx) {
        backRefs.push(`${l.key} uses ${r.key} before lesson ${introducedAt.get(r.key) + 1}`);
      }
    });
  });
});
/* The distinctive literal each rule contributes, used to spot it in an answer. */
function frameEcho(r) {
  return { 'r-negative': 'じゃ ありません', 'r-question': 'ですか',
    'r-affiliation': 'の', 'r-also': 'も', 'r-age': 'さい' }[r.key] || null;
}
check(backRefs.length === 0, 'no exercise uses a pattern introduced by a later lesson', backRefs.join('; '));

/* ==========================================================================
   5. EXERCISE WELL-FORMEDNESS
   ====================================================================== */
section('exercise well-formedness');

check(allExercises.every((e) => e.prompt && e.prompt.trim()), 'every exercise has a prompt');
check(allExercises.every((e) => e.answer !== undefined && String(e.answer).trim()),
  'every exercise has a non-empty answer');

const discern = allExercises.filter((e) => e.type === 'discern');
check(discern.every((e) => Array.isArray(e.options) && e.options.length >= 2),
  'every discern exercise offers at least two options');
check(discern.every((e) => Number.isInteger(e.answer) && e.answer >= 0 && e.answer < e.options.length),
  'every discern answer indexes a real option');
check(discern.every((e) => e.because && e.because.trim()),
  'every discern exercise explains why the wrong one is wrong');

/* ==========================================================================
   6. THE QUESTION CONTRACT
   The rule the flow is built on: a clarifying question must change the
   output. And the one that shipped broken — a question's declared input kind
   has to be the one the person is actually given.
   ====================================================================== */
section('clarifying questions');

check(JA.questions.every((q) => q.options.length >= 2),
  'every question offers a real choice');
check(JA.questions.every((q) => q.why && q.affects),
  'every question states why it is asked and what it changes');

const noConsequence = JA.questions.filter((q) =>
  q.kind !== 'multi' && q.options.some((o) => !o.consequence));
check(noConsequence.length === 0,
  'every single-choice option declares its consequence',
  noConsequence.map((q) => q.id).join(', '));

check(JA.questions.filter((q) => q.kind !== 'multi').every((q) =>
  q.options.filter((o) => o.default).length === 1),
  'every single-choice question has exactly one default');

/* THE ONE THAT WOULD HAVE CAUGHT THE MULTI-SELECT BUG.
   The data said `kind: 'multi'`; the view rendered a radio group. A contract
   between data and view is only a contract if something checks it, so the
   view's rendered markup is read here rather than trusted. */
const viewSrc = readFileSync(resolve(root, 'prototype/js/views/learn.js'), 'utf8');
const multiQs = JA.questions.filter((q) => q.kind === 'multi');
check(multiQs.length === 0 || /data-multi=/.test(viewSrc),
  'the view honours `kind: "multi"` (renders a multi-select, not a radio group)',
  'data-japanese.js declares a multi question; learn.js must render it as one.');
check(multiQs.length === 0 || /role="\$\{q\.kind === 'multi' \? 'checkbox' : 'radio'\}"/.test(viewSrc),
  'multi questions expose checkbox semantics to assistive tech');

/* ==========================================================================
   6b. TERMINOLOGY A LEARNER CAN ACT ON

   "Kana" is the correct umbrella term for the two syllabaries and the wrong
   word to put in front of a learner: it names a category rather than the thing
   on the card, and it cannot be acted on without already knowing which script
   is which. Say hiragana or katakana.

   Mark caught this by reading a screen. It is a terminology rule, so it is
   checkable without a judge — the judge tier is only needed for terms this
   list does not know about yet.
   ====================================================================== */
section('terminology');

const BANNED = [
  { term: /\bkana\b/i, instead: 'name the script: hiragana or katakana' },
];

/* Everything a learner actually reads. The first version stopped at lessons and
   rules, and so had nothing to say about the Library shelf, where the source
   title and blurb are the only words on the card. */
const facing = [
  JA.source.title, JA.source.subtitle, JA.source.blurb, ...(JA.source.topics || []),
  ...JA.questions.flatMap((q) => [q.ask, q.why, q.affects,
    ...q.options.flatMap((o) => [o.label, o.consequence])]),
  ...JA.lessons.flatMap((l) => [l.title, l.standfirst, ...(l.body || []),
    ...l.exercises.flatMap((e) => [e.prompt, e.because]),
    ...(l.habitSuggestion ? [l.habitSuggestion.behavior, l.habitSuggestion.prompt,
      l.habitSuggestion.celebration, l.habitSuggestion.why] : [])]),
  ...JA.rules.map((r) => r.gloss),
  ...(JA.proposedHabit ? [JA.proposedHabit.behavior, JA.proposedHabit.prompt,
    JA.proposedHabit.celebration, JA.proposedHabit.why] : []),
].filter(Boolean);

/* NO EM OR EN DASHES IN PRODUCT COPY. 58 were removed from this repository by
   hand, deliberately, and CLAUDE.md records the decision. A rule enforced by
   memory survives exactly as long as the memory does: the first generated
   corpus came back titled "koko / soko / asoko — kochira series, floors …",
   putting one straight back on the Library shelf. Comments, docs and READMEs
   are explicitly out of scope; this checks only what a learner reads. */
const dashed = facing.filter((s) => /[—–]/.test(s));
check(dashed.length === 0,
  'no em or en dash in any string a learner reads',
  dashed.slice(0, 5).map((s) => `"${s.slice(0, 70)}…"`).join('\n       ')
  + '\n       Recast the sentence rather than swapping the character.');

for (const { term, instead } of BANNED) {
  const hits = facing.filter((s) => term.test(s));
  check(hits.length === 0,
    `no user-facing string uses a term the learner cannot act on (${term.source})`,
    hits.length ? `${hits.length} hit(s) — ${instead}. First: "${hits[0].slice(0, 70)}…"` : '');
}

/* The romaji question offers a per-script answer, so every term it could apply
   to has to declare which script it is written in. Without that the option is
   unimplementable and the question becomes a survey question. */
const scriptQ = JA.questions.find((q) => q.id === 'q-script');
const perScript = scriptQ && scriptQ.options.some((o) => /katakana|hiragana/i.test(o.label));
if (perScript) {
  const termsNeedingScript = [...JA.items, ...(JA.properNouns || []), ...JA.irregulars];
  /* `latin` counts. The romaji question offers "on katakana only", and to
     honour it every term has to say which script it is in - including the ones
     that are in neither syllabary. SAMSUNG is on the slide, and "hiragana or
     katakana" as the only legal answers forced a term to lie about itself. */
  const SCRIPTS = new Set(['hiragana', 'katakana', 'mixed', 'latin']);
  check(termsNeedingScript.every((t) => SCRIPTS.has(t.script)),
    'every term declares its script, so a per-script answer is implementable',
    termsNeedingScript.filter((t) => !t.script).map((t) => t.ja).join(', '));
}

/* ==========================================================================
   7. THE DURATION BUDGET
   Duration is a budget, not a target. A session that cannot fit the smallest
   offered budget is a practice that gets abandoned in week two.
   ====================================================================== */
section('duration budget');

const durationQ = JA.questions.find((q) => q.id === 'q-duration');
check(!!durationQ, 'the flow asks how long a session should be');

if (durationQ) {
  const budgets = durationQ.options.map((o) => Number(o.label.match(/\d+/)[0]));
  const smallest = Math.min(...budgets);
  const largest = Math.max(...budgets);
  const shortestLesson = Math.min(...JA.lessons.map((l) => l.minutes));
  const longestLesson = Math.max(...JA.lessons.map((l) => l.minutes));

  /* The smallest budget need not fit a whole LESSON — the first run of this
     eval failed here, and the right answer was to define the smaller unit
     rather than delete the 2-minute option. What it must fit is some real
     unit of work, and the recurring drill is the smallest one that exists. */
  const smallestUnit = JA.irregularDrill ? JA.irregularDrill.minutes : shortestLesson;
  check(smallestUnit <= smallest,
    `the smallest budget (${smallest} min) fits at least one unit of work (${smallestUnit} min)`,
    'A budget nothing fits into is a budget that produces an empty session.');

  check(longestLesson <= largest,
    `the longest lesson (${longestLesson} min) fits the largest budget (${largest} min)`,
    'A lesson no budget can deliver can never be reached.');

  /* Every budget below the shortest lesson has to say what it delivers
     instead, or the person is promised a lesson and given fragments. */
  const subLesson = durationQ.options.filter((o) => Number(o.label.match(/\d+/)[0]) < shortestLesson);
  check(subLesson.every((o) => /drill|exercise/i.test(o.consequence)),
    'budgets below the shortest lesson say what they deliver instead of a lesson',
    subLesson.map((o) => o.label).join(', '));
}

/* ==========================================================================
   8. THE VIEWS PARSE — as MODULES, which is the only parse that counts.

   `node --check foo.js` parses as a SCRIPT and accepts things the browser
   rejects. It passed a view twice while the browser threw SyntaxError and the
   route rendered an empty <main> — a silently dead screen both times. Copying
   to .mjs forces the module parse the browser actually performs.

   The specific trap, hit twice: a BACKTICK inside an html`` template literal.
   HTML comments are where it happens, because prose wants to quote an
   identifier. It is legal-looking, it is invisible in review, and it closes
   the template.
   ====================================================================== */
section('views parse as modules');

const { execFileSync } = await import('node:child_process');
const { readdirSync, mkdtempSync, writeFileSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
const tmp = mkdtempSync(resolve(tmpdir(), 'hc-eval-'));

const viewDir = resolve(root, 'prototype/js/views');
const jsDir = resolve(root, 'prototype/js');
const files = [
  ...readdirSync(viewDir).filter((f) => f.endsWith('.js')).map((f) => resolve(viewDir, f)),
  ...readdirSync(jsDir).filter((f) => f.endsWith('.js')).map((f) => resolve(jsDir, f)),
];

const broken = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const mirror = resolve(tmp, f.split(/[\\/]/).pop().replace(/\.js$/, '.mjs'));
  writeFileSync(mirror, src);
  try {
    execFileSync(process.execPath, ['--check', mirror], { stdio: 'pipe' });
  } catch (err) {
    broken.push(`${f.split(/[\\/]/).pop()}: ${String(err.stderr).split('\n').find((l) => /Error/.test(l)) || 'parse error'}`);
  }
}
check(broken.length === 0, `all ${files.length} modules parse as ES modules`, broken.join('\n       '));

/* Backticks inside an html`` template literal, found by scanning the template
   bodies rather than by waiting for a parse failure - so the message names the
   cause instead of a line 40 rows further down. */
const tickOffenders = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const re = /<!--[\s\S]*?-->/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[0].includes('`')) {
      const line = src.slice(0, m.index).split('\n').length;
      tickOffenders.push(`${f.split(/[\\/]/).pop()}:${line}`);
    }
  }
}
check(tickOffenders.length === 0,
  'no HTML comment contains a backtick (it would close the template literal)',
  tickOffenders.join(', '));

/* ==========================================================================
   9. THE READING IS THE ONE THE KANA SAYS

   The highest-value check in a Japanese practice, and it needs no judge and no
   dictionary: kana determines its own reading. `lib/kana.mjs` declares the
   scheme (modified Hepburn with macrons) once, so `ginkouin` and `ginkōin`
   cannot both be on screen. A learner types what they read.

   Kanji is skipped rather than guessed, and the skip is COUNTED, so the day
   this corpus stops being pre-kanji the coverage drop is visible instead of
   being a quietly shrinking check.
   ====================================================================== */
section('reading and script');

/* Proper nouns from other languages romanise to their SOURCE spelling, not to
   their kana reading: キム is Kim, not kimu. That is correct and it is also
   exactly the hole a genuinely wrong reading would hide in, so it has to be
   declared per term rather than inferred from "it did not match". */
const sourceSpelled = new Map(
  [...JA.items, ...(JA.properNouns || []), ...JA.irregulars]
    .filter((t) => t.romajiIsSourceSpelling)
    .map((t) => [t.ja, t.romaji]));

const readingPairs = [
  ...JA.items.map((t) => ({ where: `item ${t.key}`, key: t.key, ja: t.ja, romaji: t.romaji })),
  ...(JA.properNouns || []).map((t) => ({ where: `name ${t.key}`, key: t.key, ja: t.ja, romaji: t.romaji })),
  ...JA.irregulars.map((t) => ({ where: `exception ${t.key}`, key: t.key, ja: t.ja, romaji: t.romaji })),
  ...JA.rules.map((r) => ({ where: `rule ${r.key} example`, key: r.key, ja: r.example.ja, romaji: r.example.romaji })),
  /* For a discern the `answer` is an INDEX, so the Japanese being romanised is
     the option it selects. Reading the index as a word produced "0 reads 0",
     which is the check misunderstanding the exercise rather than a defect. */
  ...JA.lessons.flatMap((l) => l.exercises
    .filter((e) => e.romaji)
    .map((e) => ({
      where: `${l.key} ${e.type}`,
      key: l.key,
      ja: e.type === 'discern' ? (e.options || [])[e.answer] : e.answer,
      romaji: e.romaji,
    }))
    .filter((p) => typeof p.ja === 'string')),
].filter((p) => p.ja && p.romaji);

const misread = [];
let unreadable = 0;
for (const p of readingPairs) {
  const v = KANA.romajiAgrees(p.ja, p.romaji, sourceSpelled);
  if (!v.applicable) { unreadable++; continue; }
  if (!v.ok) misread.push(`${p.where}: "${p.romaji}" but ${p.ja} reads "${v.expected}"`);
}
check(misread.length === 0,
  `every romaji matches the reading of its kana (${readingPairs.length - unreadable} pairs checked)`,
  misread.join('\n       '));

check(unreadable === 0,
  'no pair is unreadable without a dictionary',
  `${unreadable} pair(s) contain kanji. Kanji has no reading without a dictionary, `
  + 'so these are UNCHECKED, not passing. See evals/ for the dictionary-backed tier.');

/* A `script` field that says hiragana about a katakana string is worse than no
   field: the romaji question offers a per-script answer and would apply it to
   the wrong terms. §6b already asserts the field is PRESENT. */
/* The honorific is stripped before judging the script, because ミラーさん is a
   katakana NAME with a hiragana suffix and calling it "mixed" would be true and
   useless. Stripping must not empty the string, or the item さん judges itself
   as nothing — which is what the first run of this check said, in as many
   words: "さん declared hiragana, is hiragana". */
/* Strip the honorific before judging script, but only if something Japanese
   survives. さん alone becomes "", and 〜さん becomes "〜": both then judge as
   no-script-at-all, and the check reports "さん declared hiragana, is hiragana",
   which is a sentence that tells you nothing. */
const stem = (s) => {
  const cut = s.replace(/さん$/, '');
  return KANA.scriptOf(cut) === 'none' ? s : cut;
};
const misdeclared = [...JA.items, ...(JA.properNouns || []), ...JA.irregulars]
  .filter((t) => t.script && KANA.scriptOf(stem(t.ja)) !== t.script);
check(misdeclared.length === 0,
  'every declared script is the script the term is actually written in',
  misdeclared.map((t) => `${t.ja} declared ${t.script}, is ${KANA.scriptOf(t.ja)}`).join(', '));

/* Latin letters inside a field the learner reads as Japanese. This is the
   commonest structured-output failure for Japanese — the model answers in
   romaji when the slot wanted kana — and it is one regex. Real Latin does
   occur (a company name on a slide), so it is declared, not guessed. */
/* THE ALLOWLIST COMES FROM THE CORPUS, NOT FROM THIS FILE. A deck really does
   contain Latin: SEIKO, TOYOTA, SAMSUNG are on the slides. Those are extracted
   as proper nouns, so the corpus already says which Latin is legitimate, and
   hardcoding a second list here would be a list that goes stale the first time
   a new deck arrives. */
const latinIn = (s) => [...String(s).matchAll(/[A-Za-z]+/g)].map((m) => m[0].toLowerCase());
const LATIN_OK = new Set([
  ...[...JA.items, ...(JA.properNouns || [])].flatMap((t) => latinIn(t.ja)),
  /* And any Latin that is ON THE PAGES. SAMSUNG is on slide 11 of the pilot but
     is not an extracted term, so a corpus-terms-only list called it a leak. The
     honest rule is the grounding rule wearing a different hat: Latin a learner
     reads is fine if the source contains it and is invention otherwise. */
  ...Object.values(JA.source.pageText || {}).flatMap(latinIn),
]);

const latinLeaks = [];
for (const l of JA.lessons) {
  for (const e of l.exercises) {
    if (typeof e.answer !== 'string') continue;
    /* An English answer to an English question is not a Japanese field. "Which
       three of 1 to 10 are irregular?" answers "1, 8 and 10", and reading that
       as romaji leaking into kana is the check misunderstanding the exercise. */
    if (!/[ぁ-ゖァ-ヺ]/.test(e.answer)) continue;
    const bad = [...new Set((e.answer.match(/[A-Za-z]+/g) || [])
      .filter((run) => !LATIN_OK.has(run.toLowerCase())))];
    /* One line per EXERCISE, not per word. The first version printed every
       English word of a sentence separately and buried the other four failures
       under forty lines of "the", "is", "of". */
    if (bad.length) latinLeaks.push(`${l.key} ${e.type}: ${bad.join(' ')} — "${e.answer.slice(0, 60)}…"`);
  }
}
check(latinLeaks.length === 0,
  `no undeclared Latin text sits in an answer the learner reads as Japanese`
  + ` (${LATIN_OK.size} Latin forms declared by the corpus)`,
  latinLeaks.join('\n       '));

/* ==========================================================================
   10. NOTHING IS ASKED FOR THAT WAS NEVER TAUGHT

   A closed deck is a closed world: every word in an answer should be one the
   practice put there. This is the check that needed no tokeniser — longest
   match over the taught set is enough when the set is closed, and JMdict only
   becomes necessary once the app generates sentences rather than extracting
   them.

   THE SCOPE IS DELIBERATE AND IT IS THE WHOLE SPECIFICATION. It applies to
   what a learner must PRODUCE, not to what they are SHOWN. A rule's example
   may introduce a word with a gloss beside it; an exercise may not demand one.
   The first draft of this check ignored that and fired 14 times, of which half
   were the exposition doing its job.
   ====================================================================== */
section('closed-world vocabulary');

/* ONE reduction, applied to BOTH sides. A taught term written とります［しゃしんを］
   and an answer written the same way have to reduce identically, or the check
   reports a word the corpus teaches as one it never taught. Stripping only the
   answer is exactly what made that happen.
   ー is NOT stripped: it is a letter, not punctuation. ミラー without it is ミラ,
   which matches no taught form. */
const PUNCT = /[A-Za-z0-9\s、。・「」『』（）()［］\[\]〜~,.:;!?！？…—+=→＝-]/g;
const bare = (s) => KANA.normaliseJa(s).replace(PUNCT, '');

const taught = new Set();
for (const b of [JA.items, JA.properNouns || [], JA.irregulars, JA.regularAges]) {
  b.forEach((t) => {
    taught.add(bare(t.ja));
    /* A name taught as ミラーさん licenses ミラー, because さん is itself a
       taught item and the deck drills dropping it. */
    if (/さん$/.test(t.ja)) taught.add(bare(t.ja.replace(/さん$/, '')));
  });
}
/* Grammar comes from the rules, read off their frames rather than hardcoded.
   A hardcoded list is a second definition of what the deck teaches. */
JA.rules.forEach((r) => (r.frame.match(/[ぁ-ゖァ-ヺー]+/g) || [])
  .forEach((run) => taught.add(bare(run))));

const taughtByLength = [...taught].filter(Boolean).sort((a, b) => b.length - a.length);

function untaught(s) {
  let rest = bare(s);
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of taughtByLength) {
      if (rest.includes(t)) { rest = rest.replace(t, ''); changed = true; }
    }
  }
  return rest;
}

const demanded = [];
JA.lessons.forEach((l) => l.exercises.forEach((e) => {
  /* For a discern the answer is an index, and the WRONG options are wrong on
     purpose — §11 checks those. Only the correct option is demanded. */
  const produced = e.type === 'discern' ? e.options[e.answer] : e.answer;
  if (typeof produced !== 'string') return;
  if (!/[ぁ-ゖァ-ヺ]/.test(produced)) return;      /* an English answer to an English question */
  const left = untaught(produced);
  if (left) demanded.push(`${l.key} ${e.type}: "${left}" in ${produced}`);
}));
check(demanded.length === 0,
  `every word a learner must produce was taught first (${taughtByLength.length} forms taught)`,
  demanded.join('\n       '));

/* ==========================================================================
   11. A WRONG OPTION IS WRONG FOR A REASON SOMEBODY WROTE DOWN

   §5 already asserts a discern explains why the wrong one is wrong. That
   catches an empty `because`; it does not catch a distractor invented on the
   spot. A distractor that corresponds to no real learner error is noise: it
   teaches nothing and it makes the exercise easier, which is worse.

   The declared errors live in `rule.trap` and `irregular.expected`. If a
   distractor traces to neither, either the distractor is arbitrary or the
   trap it exploits was never written down. Both are defects, and the second
   one is the more common.
   ====================================================================== */
section('distractor provenance');

/* Items carry traps too, and for the same reason rules do. さん is never used
   about yourself, and that is a misuse of an ITEM rather than of a pattern, so
   `item.trap` is read here alongside `rule.trap`. */
const declaredWrong = [
  ...JA.rules.filter((r) => r.trap).map((r) => ({ from: `${r.key}.trap`, text: r.trap })),
  ...JA.items.filter((i) => i.trap).map((i) => ({ from: `${i.key}.trap`, text: i.trap })),
  ...JA.irregulars.map((x) => ({ from: `${x.key}.expected`, text: x.expected })),
];

const arbitrary = [];
JA.lessons.forEach((l) => l.exercises.filter((e) => e.type === 'discern').forEach((e) => {
  e.options.forEach((opt, i) => {
    if (i === e.answer) return;
    const norm = KANA.normaliseJa(opt);
    const traced = declaredWrong.some(({ text }) => KANA.normaliseJa(text).includes(norm));
    if (!traced) arbitrary.push(`${l.key}: "${opt}" traces to no declared trap`);
  });
}));
check(arbitrary.length === 0,
  'every distractor traces to a trap or an expected-but-wrong form in the data',
  `${arbitrary.join('; ')}\n       A distractor with no declared trap means the error it `
  + 'exploits was never written down, so nothing else can drill it.');

/* ==========================================================================
   12. ONE SPELLING OF THE SAME SENTENCE

   This corpus writes learner-spaced Japanese (やまださん は にほんじん です).
   Real Japanese is unspaced, so the convention is a teaching decision with a
   cost attached: it has to be unlearned later. That makes it exactly the kind
   of decision that must be DECLARED rather than emergent, and consistent, or
   the learner is unlearning two things.

   It is also load-bearing for `lib/kana.mjs`: a standalone は is read `wa`,
   and nothing but the spacing says so.
   ====================================================================== */
section('spacing convention');

check(typeof JA.source.spacing === 'string',
  'the source declares its spacing convention',
  'lib/kana.mjs reads a standalone は as the particle `wa`. That is only sound '
  + 'while the convention holds, so the convention has to be stated.');

const spacingOffenders = [];
JA.lessons.forEach((l) => l.exercises.forEach((e) => {
  const s = typeof e.answer === 'string' ? e.answer : null;
  if (!s) return;
  if (/\s{2,}/.test(s)) spacingOffenders.push(`${l.key} ${e.type}: double space`);
  if (s !== s.trim()) spacingOffenders.push(`${l.key} ${e.type}: leading or trailing space`);
  if (/[　]/.test(s)) spacingOffenders.push(`${l.key} ${e.type}: full-width space`);
}));
check(spacingOffenders.length === 0, 'answers use single half-width spaces only',
  spacingOffenders.join('; '));

/* ==========================================================================
   13. GROUNDING — DECLARED, BLOCKED ON DATA, AND SAYING SO

   §1 asserts every card carries a page. It does NOT assert the quote is on
   that page, which is the assertion that actually makes a card verifiable.
   B4 of docs/authorization-and-taxonomy.md calls this a TEST — a deterministic
   string search, no judge needed — and it is right. It cannot run yet because
   the source text is not in the repo: the deck is 14 page IMAGES with a
   519-character text layer that is the teacher's annotation rather than the
   content (data-japanese.js:50).

   When it does run it must match EXACTLY, after NFKC and nothing else. The
   quote on r-affiliation is "Kimsan wa SUMSUNG no shain desu", carrying the
   deck's own typo. That is grounding working. A fuzzy match would forgive the
   typo and, in forgiving it, would stop being able to detect invention at all.
   ====================================================================== */
section('grounding');

const pagesWithText = (JA.source.pageText && Object.keys(JA.source.pageText).length) || 0;
if (pagesWithText) {
  const ungrounded = [...JA.rules, ...JA.items].filter((c) => {
    const page = JA.source.pageText[c.page];
    return c.quote && page && !KANA.normaliseJa(page).includes(KANA.normaliseJa(c.quote));
  });
  check(ungrounded.length === 0, 'every quote appears verbatim on the page it cites',
    ungrounded.map((c) => `${c.key} p${c.page}: "${c.quote}"`).join('; '));
} else {
  console.log(`  SKIP not here, but it DOES run. \`node evals/ground.mjs\` reads the PDF and
       checks every quote against the page it cites. Last run: 14 of 14 on the
       cited page, over ${JA.source.pages} pages and ${JA.source.ingest.textLayerChars} characters of text layer.
       It lives in evals/ because reading a PDF needs a dependency and this file
       takes none. It moves here the moment source.pageText is stored in the
       corpus, which is the cheapest remaining win in this suite.`);
}

/* ==========================================================================
   TIER 2 — THE JUDGE. Declared, not implemented, and it says so.
   ====================================================================== */
section('tier 2 — model-graded (NOT IMPLEMENTED)');
console.log(`  SKIP domain truth needs a judge, not an assertion. Still unchecked:
         · Is a sentence nobody wrote down grammatical? (§9 settles the READING
           of every kana string, which is a different question)
         · Does each option set cover the answers a real learner would give?
           (the "2x a week" gap: coverage, not correctness)
         · Did this rule come from THIS deck, or from the model's memory of
           みんなの日本語? The taxonomy's check 2, and the worst failure here.
         · Is the terminology right beyond the banned list in §6b?
       What this list NO LONGER claims, because tier 1.5 took it:
         readings (§9), taught-before-asked (§10), distractor provenance (§11).
       And "does the quote appear on the page" is a TEST, not a judge call.
       It is blocked on source.pageText, and §13 says so rather than skipping
       it silently. This SKIP is deliberate: a vacuous pass here would be
       worse than no check at all.`);

/* ========================================================================== */
console.log(`\n${failures ? `${failures} of ${checks} checks FAILED` : `all ${checks} checks passed`}`);
process.exit(failures ? 1 : 0);
