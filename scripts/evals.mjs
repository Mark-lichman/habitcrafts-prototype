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

   TIER 2 — JUDGE (not implemented; see the stub at the bottom)
     "Is this correct Japanese?" "Does this option set cover the real answers?"
     A model call with a rubric. It is NOT written yet, and the stub SAYS SO
     rather than passing, because a green check that asserted nothing would be
     worse than no check. Same principle as ci.yml's empty-test guard.

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

const JA = (await load('prototype/js/data-japanese.js')).default;
const KINDS = await load('prototype/js/knowledge-kinds.js');

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

check(
  allExercises.every((e) => Number.isInteger(e.page)),
  'every exercise carries a page',
  allExercises.filter((e) => !Number.isInteger(e.page)).map((e) => e.prompt).join('; '),
);

const maxPage = JA.source.pages;
const strays = [...JA.rules, ...JA.items, ...JA.irregulars, ...allExercises]
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

check(kind.extracts.every((b) => Array.isArray(JA[bucketFor(b)]) && JA[bucketFor(b)].length > 0),
  `every bucket the kind declares is populated (${kind.extracts.join(', ')})`,
  'An empty bucket is the cheapest signal that detection was wrong.');

function bucketFor(name) {
  return { patterns: 'rules', vocabulary: 'items', exceptions: 'irregulars' }[name] || name;
}

/* The emphasis rule. `emphasises: 'exceptions'` is a promise that the hard
   forms get disproportionate contact; without a check it is a comment. */
if (kind.emphasises === 'exceptions') {
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
   TIER 2 — THE JUDGE. Declared, not implemented, and it says so.
   ====================================================================== */
section('tier 2 — model-graded (NOT IMPLEMENTED)');
console.log(`  SKIP domain truth needs a judge, not an assertion. Unchecked today:
         · Is every answer correct in the target language?
         · Does each option set cover the answers a real learner would give?
           (this is the "2x a week" gap — coverage, not correctness)
         · Does the quote actually appear on the page it cites?
         · Is the terminology right? (script names, part-of-speech labels)
       See the header for the intended shape. This SKIP is deliberate: a
       vacuous pass here would be worse than no check at all.`);

/* ========================================================================== */
console.log(`\n${failures ? `${failures} of ${checks} checks FAILED` : `all ${checks} checks passed`}`);
process.exit(failures ? 1 : 0);
