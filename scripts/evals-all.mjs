/* ============================================================================
   HabitCrafts — scripts/evals-all.mjs
   EVERY CORPUS, PLUS THE CHECKS THAT ONLY EXIST BETWEEN THEM.
                                              node scripts/evals-all.mjs

   `evals.mjs` runs one corpus. This runs them all, in their own processes, and
   then adds the checks that no single corpus can make about itself.

   ONE PROCESS PER CORPUS, deliberately. A corpus that cannot even be imported
   takes down its own run and names itself, rather than throwing before the
   first check of the suite and reporting nothing about any of them.

   THE CROSS-CORPUS CHECK IS THE POINT OF THIS FILE.
   `store.lessonStat(key)` is keyed by lesson key ALONE. There is no source id
   in it. So two corpora that both call a lesson `l-1` do not merely look alike:
   they SHARE one study record, and practising Lesson 1 of a word list marks
   Lesson 1 of the class deck as done. Nothing in either corpus can see that.
   It only exists in the space between them, which is why the check lives here
   and why it is worth a file of its own.

   No dependencies, same as everything else in scripts/.
   ========================================================================= */

import { readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const corpusDir = resolve(root, 'prototype/js/corpus');

const paths = [
  'prototype/js/data-japanese.js',
  /* `index.js` is the registry the app loads, not a corpus: it has no default
     export and reading `.default.source` off it threw. Every corpus is written
     by evals/extract.mjs and every one of those exports a default; anything
     else in this directory is plumbing. */
  ...(existsSync(corpusDir)
    ? readdirSync(corpusDir)
      .filter((f) => f.endsWith('.js') && f !== 'index.js').sort()
      .map((f) => `prototype/js/corpus/${f}`)
    : []),
];

let failedRuns = 0;
for (const p of paths) {
  try {
    execFileSync(process.execPath, ['scripts/evals.mjs', p], { cwd: root, stdio: 'inherit' });
  } catch {
    failedRuns++;
  }
}

/* -------------------------------------------------------------------------
   BETWEEN THE CORPORA
------------------------------------------------------------------------- */

console.log('\n=== across all corpora ===');

let checks = 0;
let failures = 0;
const check = (cond, msg, detail) => {
  checks++;
  if (cond) { console.log(`  ok   ${msg}`); return; }
  failures++;
  console.log(`  FAIL ${msg}`);
  if (detail) console.log(`       ${detail}`);
};

const loaded = [];
for (const p of paths) {
  const mod = await import(pathToFileURL(resolve(root, p)).href);
  /* Loudly, not silently. A file in corpus/ with no default export is either a
     new piece of plumbing that belongs on the filter above, or a corpus that
     failed to write properly - and both want saying out loud rather than
     throwing a TypeError forty lines later about `undefined.source`. */
  if (!mod.default || !mod.default.source) {
    console.log(`  SKIP ${p} exports no corpus (no default with a \`source\`).`);
    continue;
  }
  loaded.push({ path: p, c: mod.default });
}

/* Source ids key the registry in study.js. A duplicate does not collide
   loudly; it silently drops a corpus from the object literal. */
const seenSource = new Map();
const dupSources = [];
for (const { path, c } of loaded) {
  if (seenSource.has(c.source.id)) dupSources.push(`${c.source.id}: ${seenSource.get(c.source.id)} and ${path}`);
  seenSource.set(c.source.id, path);
}
check(dupSources.length === 0, `every source id is unique (${loaded.length} corpora)`,
  `${dupSources.join('; ')}\n       study.js keys SOURCES by source id, so a duplicate `
  + 'silently drops one corpus from the registry.');

/* The one that matters. */
const seenLesson = new Map();
const collisions = [];
for (const { path, c } of loaded) {
  for (const l of c.lessons) {
    if (seenLesson.has(l.key)) collisions.push(`${l.key}: ${seenLesson.get(l.key)} and ${path}`);
    seenLesson.set(l.key, path);
  }
}
check(collisions.length === 0,
  `no two corpora share a lesson key (${seenLesson.size} lessons across ${loaded.length} corpora)`,
  `${collisions.join('\n       ')}\n       store.lessonStat() is keyed by lesson key alone, `
  + 'so these SHARE a study log: practising one marks the other done.');

/* Same trap, one level down: a habit records `lessons` by bare key. */
const seenCard = new Map();
const cardClashes = [];
for (const { path, c } of loaded) {
  for (const k of [...c.rules, ...c.items, ...(c.properNouns || []), ...c.irregulars].map((x) => x.key)) {
    if (seenCard.has(k) && seenCard.get(k) !== path) cardClashes.push(`${k}: ${seenCard.get(k)} and ${path}`);
    seenCard.set(k, path);
  }
}
check(cardClashes.length === 0, 'no two corpora share an extracted card key',
  cardClashes.slice(0, 8).join('\n       '));

console.log(`\n${failures || failedRuns
  ? `${failures} cross-corpus check(s) FAILED, ${failedRuns} corpus run(s) FAILED`
  : `all ${checks} cross-corpus checks passed, all ${paths.length} corpora clean`}`);
process.exit(failures || failedRuns ? 1 : 0);
