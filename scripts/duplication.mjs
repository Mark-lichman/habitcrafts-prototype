/* ============================================================================
   HabitCrafts — scripts/duplication.mjs
   THE DON'T-SOLVE-IT-TWICE EVAL.        node scripts/duplication.mjs

   Zero dependencies, Node built-ins only, same as scripts/smoke.mjs. It turns
   one principle into something that fails a build instead of relying on someone
   remembering it:

     **Do not solve the same problem twice where a parameter will do.**

   ------------------------------------------------------------------------
   IT IS A RATCHET, NOT AN ABSOLUTE
   ------------------------------------------------------------------------
   Some duplication here is accepted and documented — the icon sprite is
   repeated in twelve HTML files because the buildnotes require three
   byte-identical blocks per page, and that is a real constraint rather than an
   oversight. An eval that failed on it would be switched off within a week,
   which is the only way an eval truly fails.

   So every check carries a BUDGET. The eval passes at or under budget and fails
   when duplication GROWS. Lowering a budget after a cleanup is the intended
   move; raising one requires writing down why, in this file, where the next
   person will read it.

   ------------------------------------------------------------------------
   WHAT IT DOES NOT TOUCH
   ------------------------------------------------------------------------
   **Comments and documentation are deliverables here, not overhead.** Every
   file opens with a long header explaining why it is the way it is, and
   README-buildnotes.md is 1,260 lines on purpose. Normalisation strips comments
   before comparing precisely so that two functions with different explanations
   and identical bodies are still caught, and so that nothing in this eval ever
   creates pressure to delete an explanation. Prose is never measured.
   ========================================================================= */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('prototype');
const VIEWS = path.join(ROOT, 'js', 'views');
const JSDIR = path.join(ROOT, 'js');

/* --------------------------------------------------------------------------
   BUDGETS — the accepted state. Lower these after a cleanup.
-------------------------------------------------------------------------- */

const BUDGET = {
  /* Identical normalised function bodies across different files. Every one is a
     parameter waiting to be written.

     KNOWN DEBT, budget 1:
       segment() in community.js and library.js — the segmented tab button, six
       identical lines. Trivially extractable to components.js; left alone only
       because it is pre-existing code on a branch another machine is editing.
       Fix it and drop this to 0. */
  duplicateFunctions: 1,

  /* Repeated verbatim blocks of >= BLOCK_MIN lines within js/.

     KNOWN DEBT, budget 6. Three of these are documented-intentional and three
     are genuine debt:

       INTENTIONAL
       · the check-in ring SVG in create.js, explore.js, home.js —
         README-buildnotes.md §4 says "copy this markup exactly", because
         prototype.js binds to its exact structure. Extracting it means moving
         the contract into components.js first.
       · the rosette seal SVG in profile.js, progress.js — the milestone mark,
         same reasoning.

       GENUINE DEBT — fix these and lower the budget
       · the gild/seal expression in habit-detail.js, home.js, progress.js —
         three copies of the same derivation. Belongs in ui.js or components.js.
       · the roving-tabindex keyboard handler in profile.js and prototype.js —
         two implementations of one ARIA pattern, and the one in prototype.js
         is the canonical owner.
       · the bind-sheet / onboarding SVG overlap — probably incidental similarity
         between two unrelated illustrations; verify before acting. */
  duplicateBlocks: 6,

  /* Views importing from another view. Three are the documented `prefillFrom`
     handoff into the Create workbench, which is a deliberate single door into
     the habit layer rather than a copy. A fourth needs justifying. */
  viewToViewImports: 3,

  /* The icon sprite, repeated per HTML file. ACCEPTED AND DOCUMENTED: the
     buildnotes require three byte-identical blocks on every page, so the sprite
     is inlined rather than referenced. 12 copies of a 59-line block.
     To lower this, move to an external sprite.svg and revisit that constraint. */
  spriteCopies: 12,
};

const BLOCK_MIN = 6;      /* lines before a repeated block counts */

/* --------------------------------------------------------------------------
   HELPERS
-------------------------------------------------------------------------- */

const read = (f) => fs.readFileSync(f, 'utf8');
const jsFiles = (dir) => fs.readdirSync(dir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => path.join(dir, f));

/** Strip comments and collapse whitespace, so two implementations that differ
    only in their explanation still register as the same code. */
function normalise(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

/** Every top-level function in a file, with its normalised body. */
function functionsIn(file) {
  const lines = read(file).split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(?:export\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/.exec(lines[i]);
    if (!m) continue;
    let depth = 0, started = false, j = i;
    for (; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '{') { depth++; started = true; }
        else if (ch === '}') depth--;
      }
      if (started && depth === 0) break;
    }
    const body = lines.slice(i, j + 1).join('\n');
    out.push({ name: m[1], file: path.basename(file), lines: j - i + 1, body: normalise(body) });
    i = j;
  }
  return out;
}

/* --------------------------------------------------------------------------
   CHECKS
-------------------------------------------------------------------------- */

const findings = [];
const report = [];

function check(label, actual, budget, detail) {
  const pass = actual <= budget;
  report.push({ label, actual, budget, pass });
  if (!pass && detail) findings.push(...detail);
  return pass;
}

/* 1. Identical function bodies across files ------------------------------- */
const allFns = [...jsFiles(VIEWS), ...jsFiles(JSDIR)].flatMap(functionsIn);
const byBody = new Map();
for (const fn of allFns) {
  if (fn.lines < 4) continue;                       /* one-liners are not duplication */
  if (!byBody.has(fn.body)) byBody.set(fn.body, []);
  byBody.get(fn.body).push(fn);
}
const dupFns = [...byBody.values()].filter((g) => g.length > 1);
check('identical function bodies across files', dupFns.length, BUDGET.duplicateFunctions,
  dupFns.map((g) => `  ${g[0].name}() is identical in: ${g.map((x) => x.file).join(', ')}  (${g[0].lines} lines each)`
    + `\n    → extract to components.js, or parameterise the difference away`));

/* 2. Repeated verbatim blocks inside js/ ---------------------------------- */
const blocks = new Map();
for (const file of [...jsFiles(VIEWS), ...jsFiles(JSDIR)]) {
  const lines = normalise(read(file)).split('\n');
  for (let i = 0; i + BLOCK_MIN <= lines.length; i++) {
    const window = lines.slice(i, i + BLOCK_MIN);
    const key = window.join('\n');
    if (key.length < 120) continue;                 /* too short to be meaningful */
    /* Require real substance. Without this, six consecutive closing braces match
       across any two files and the eval reports noise — which is how an eval
       gets ignored rather than fixed. */
    if (window.filter((l) => l.length > 20).length < 4) continue;
    if (!blocks.has(key)) blocks.set(key, new Set());
    blocks.get(key).add(path.basename(file));
  }
}
const dupBlocks = [...blocks.entries()].filter(([, files]) => files.size > 1);
/* collapse overlapping windows to one finding per file-pair */
const seenPairs = new Set();
const blockFindings = [];
for (const [key, files] of dupBlocks) {
  const sig = [...files].sort().join('|');
  if (seenPairs.has(sig)) continue;
  seenPairs.add(sig);
  blockFindings.push(`  a ${BLOCK_MIN}+ line block is repeated in: ${[...files].join(', ')}`
    + `\n    first line: ${key.split('\n')[0].slice(0, 72)}`);
}
check(`verbatim blocks of ${BLOCK_MIN}+ lines repeated across files`, seenPairs.size, BUDGET.duplicateBlocks, blockFindings);

/* 3. Views importing from other views ------------------------------------- */
const crossImports = [];
for (const file of jsFiles(VIEWS)) {
  for (const line of read(file).split(/\r?\n/)) {
    const m = /^import\s+.*from\s+'\.\/([A-Za-z0-9_-]+\.js)'/.exec(line.trim());
    if (m) crossImports.push(`  ${path.basename(file)} imports from ./${m[1]}`);
  }
}
check('views importing from another view', crossImports.length, BUDGET.viewToViewImports,
  crossImports.concat(['    → shared code belongs in components.js; only the prefillFrom handoff is exempt']));

/* 4. The icon sprite, per HTML file ---------------------------------------- */
const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
let spriteCopies = 0;
for (const f of htmlFiles) {
  if (read(path.join(ROOT, f)).includes('<symbol id="i-habits"')) spriteCopies++;
}
check('HTML files carrying an inlined copy of the icon sprite', spriteCopies, BUDGET.spriteCopies,
  [`  ${spriteCopies} copies (budget ${BUDGET.spriteCopies})`,
   '    → an external sprite.svg would remove ~59 lines per extra copy,',
   '      but the buildnotes require byte-identical head blocks. Revisit that first.']);

/* --------------------------------------------------------------------------
   OUTPUT
-------------------------------------------------------------------------- */

console.log('\nDuplication eval — do not solve the same problem twice\n');
const pad = Math.max(...report.map((r) => r.label.length));
for (const r of report) {
  console.log(`  ${r.pass ? 'ok  ' : 'FAIL'}  ${r.label.padEnd(pad)}   ${String(r.actual).padStart(3)} / ${r.budget}`);
}
if (findings.length) {
  console.log('\nFindings:\n');
  console.log(findings.join('\n'));
  console.log('\nEach of these is a parameter waiting to be written, or a budget that needs');
  console.log('a written reason in scripts/duplication.mjs. Do not raise a budget silently.\n');
  process.exit(1);
}
console.log('\nAt or under budget on every check.\n');
