/* ============================================================================
   HabitCrafts — scripts/verify.mjs
   EVERY SUITE, ONE COMMAND.        node scripts/verify.mjs [--no-browser]

   There are eight of these now and remembering the list is not a job for a
   person. This runs them, keeps going after a failure so one red does not hide
   four others, and prints what actually happened at the end.

   IT STARTS AND STOPS ITS OWN SERVER when one is not already running, because
   five of the suites need HTTP and "did you start serve.js" is the most common
   reason a green branch looks broken.

   ---------------------------------------------------------------------------
   WHAT --no-browser IS FOR, AND WHY IT IS NOT THE DEFAULT
   ---------------------------------------------------------------------------
   The node-only suites run anywhere. The browser suites need Chrome and a
   server. Keeping them in one command with a flag to drop them means the
   default is the honest one: running `verify` gives you everything, and
   skipping half of it is a thing you have to ASK for and can see in the output.

   ---------------------------------------------------------------------------
   THE DECKS ARE NOT IN THE REPOSITORY, SO CI SEES A DIFFERENT APP
   ---------------------------------------------------------------------------
   `prototype/js/corpus/` is gitignored. A clone has the pilot fixture and
   nothing else, and every suite is written to RUN in that state.

   It does NOT assert the same things there, and an earlier version of this
   comment claimed it did. Measured: `evals-all` is RED locally, 3 of its 4
   corpora carrying findings, and GREEN in CI, because the three that fail are
   the machine-generated ones and those are exactly the files git ignores. CI
   only ever grades the hand-written pilot, which has always passed.

   Two checks go further and become vacuous rather than merely weaker: the
   cross-corpus key-collision checks in `evals-all` compare a set of one corpus
   to itself, and `evals.mjs` §2b is skipped silently because the pilot has no
   `source.affords`. Both print a pass.

   So CI is a guard on the APP and not on extraction quality. Extraction is
   graded on the machine that has the decks. Saying that plainly is the point:
   the previous wording would have let a green CI stand in for a red local run.
   ========================================================================= */

import { spawn, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const noBrowser = process.argv.includes('--no-browser');
const PORT = 5173;
const URL = `http://localhost:${PORT}`;

/* --------------------------------------------------------------------------
   THE LIST
   `browser: true` means it needs Chrome and the server.
-------------------------------------------------------------------------- */

const SUITES = [
  { name: 'srs',       args: ['scripts/srs.mjs'],              what: 'the scheduler spaces things out' },
  { name: 'smoke',     args: ['scripts/smoke.mjs'],            what: 'the data layer obeys its own rules' },
  { name: 'evals',     args: ['scripts/evals-all.mjs'],        what: 'every corpus holds up, and the checks between them' },
  { name: 'drive',     args: ['scripts/drive.mjs'],            what: 'the flow does what it claims', browser: true },
  { name: 'nav',       args: ['scripts/nav.mjs'],              what: 'you can get around, forwards and back', browser: true },
  { name: 'corpora',   args: ['scripts/corpora.mjs'],          what: 'every deck, every interaction', browser: true },
  { name: 'a11y',      args: ['scripts/a11y.mjs'],             what: 'every width, every target, Nightfall', browser: true },
  { name: 'persist',   args: ['scripts/persist.mjs'],          what: 'it survives a reload', browser: true },
  { name: 'pwa',       args: ['scripts/pwa.mjs'],              what: 'it is installable', browser: true },
  { name: 'offline',   args: ['scripts/pwa.mjs', '--installed'], what: 'it opens with the network off', browser: true },
];

/* --------------------------------------------------------------------------
   THE SERVER
-------------------------------------------------------------------------- */

async function serverUp() {
  try { return (await fetch(`${URL}/app.html`)).ok; } catch (e) { return false; }
}

let server = null;
async function ensureServer() {
  if (await serverUp()) { console.log(`server already running at ${URL}\n`); return; }
  server = spawn(process.execPath, ['scripts/serve.js'], { cwd: root, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    if (await serverUp()) { console.log(`started a server at ${URL}\n`); return; }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`could not start a server at ${URL}`);
}

/* --------------------------------------------------------------------------
   THE RUN
-------------------------------------------------------------------------- */

/* The precache list names files on disk, and the decks are not in the
   repository. Regenerating first means CI checks the list it would actually
   ship rather than one that references decks it does not have. */
console.log('— regenerating the precache list —');
const pre = spawnSync(process.execPath, ['tools/precache.mjs'], { cwd: root, encoding: 'utf8' });
console.log(pre.stdout.trim() || pre.stderr.trim());
/* Its exit status was ignored. If generation fails, `pwa` then validates
   whatever stale sw-manifest.js is on disk and reports it as good. */
if (pre.status !== 0) {
  console.log('\nprecache generation FAILED; the manifest below would be stale.');
  process.exit(1);
}
console.log();

/* EVERY SUITE ON DISK IS EITHER LISTED OR DELIBERATELY EXCLUDED.
   `android.mjs` existed for a day and ran nowhere: it is not in this list and
   not in CI, so it was a file that looked like coverage and was not. The list
   is now checked against the directory, and a new suite that nobody wires up
   says so instead of sitting there. */
const EXCLUDED = new Set([
  'verify.mjs',        /* this file */
  'evals.mjs',         /* run per-corpus by evals-all */
  'serve.js',
  'shot.mjs',          /* takes pictures, asserts nothing */
  'android.mjs',       /* needs a device on adb; run by hand */
  'installable.mjs',   /* subsumed by pwa.mjs */
]);
const onDisk = readdirSync(resolve(root, 'scripts'))
  .filter((f) => f.endsWith('.mjs') && !EXCLUDED.has(f));
const listed = new Set(SUITES.map((s) => s.args[0].replace('scripts/', '')));
const unlisted = onDisk.filter((f) => !listed.has(f));
if (unlisted.length) {
  console.log(`WARNING: ${unlisted.join(', ')} ${unlisted.length === 1 ? 'is a suite' : 'are suites'} `
    + 'nobody runs. Add to SUITES or to EXCLUDED with a reason.\n');
}

const wanted = SUITES.filter((s) => !(noBrowser && s.browser));
if (noBrowser) console.log(`SKIPPING ${SUITES.length - wanted.length} browser suites (--no-browser)\n`);
if (wanted.some((s) => s.browser)) await ensureServer();

const results = [];
for (const suite of wanted) {
  process.stdout.write(`— ${suite.name}: ${suite.what} —\n`);
  const r = spawnSync(process.execPath, suite.args, { cwd: root, encoding: 'utf8' });
  const out = `${r.stdout || ''}${r.stderr || ''}`;

  /* THE LAST LINE IS THE VERDICT ONLY WHEN THE SUITE FINISHED.
     When it CRASHES the last line is whatever Node printed last, and the first
     version of this reported a bare "^" from a stack trace for all seven
     browser suites at once. Seven identical carets say nothing about a Chrome
     that never started, which is what had happened.

     So: prefer a real verdict, fall back to the first actual error, and only
     then to the last line. */
  const lines = out.trim().split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
  const ok = r.status === 0;
  const verdictLine = [...lines].reverse().find((l) => /checks? (passed|FAILED)|suites? (passed|FAILED)|all checks passed/.test(l));
  const errorLine = lines.find((l) => /^\s*(\w*Error|Assertion failed)/.test(l));
  const verdict = verdictLine || errorLine || lines[lines.length - 1] || '(no output)';

  if (!ok) {
    /* FAIL LINES PLUS THE DETAIL THAT EXPLAINS THEM.
       Every suite here prints its evidence as a deeply indented line - the
       overflowing element, the untaught word, the offending page - and the
       first version of this filter kept only the `FAIL` lines and threw all of
       it away. CI reported "no sideways scroll (got true)" ten times and
       dropped the one line that said WHICH element and by how many pixels,
       which is the entire content of the failure. Two round trips to the raw
       log later, this now keeps both.

       Section headers are NOT kept: printing every one of them buried nine
       failures under forty headings on the first attempt. The detail lines
       already name the screen and the corpus. */
    const keep = lines.filter((l) => /^\s*FAIL /.test(l) || /^\s{6,}\S/.test(l));
    for (const l of (keep.length ? keep : lines.slice(-6))) console.log(`  ${l}`);
  }
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${verdict}\n`);
  results.push({ ...suite, ok, verdict });
}

if (server) server.kill();

/* -------------------------------------------------------------------------- */

const failed = results.filter((r) => !r.ok);
console.log('='.repeat(64));
for (const r of results) {
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(10)} ${r.verdict}`);
}
console.log('='.repeat(64));

/* The eval suites are EXPECTED to carry reds: they grade model output, and a
   red there is a finding about a corpus rather than a broken build. Named
   explicitly so the distinction is in the output and not in somebody's head. */
if (failed.length) {
  console.log(`\n${failed.length} of ${results.length} suites FAILED: ${failed.map((f) => f.name).join(', ')}`);
  if (failed.every((f) => f.name === 'evals')) {
    console.log('Only `evals` failed. That grades extraction output, so a red there is a\n'
      + 'finding about a corpus, not a broken app. Read it; do not relax it.');
  }
} else {
  console.log(`\nall ${results.length} suites passed`);
}
process.exit(failed.length ? 1 : 0);
