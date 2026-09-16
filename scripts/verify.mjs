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
   nothing else, which is a legitimate state the app is written to handle, and
   every suite is written to pass in it: `corpora.mjs` reads the registry rather
   than a hardcoded list, `persist` and `pwa --installed` use whatever card is
   due first, and the pilot always has some. The suites therefore assert the
   same things against one deck in CI and four on Mark's machine, which is the
   property that makes CI worth having at all.
   ========================================================================= */

import { spawn, spawnSync } from 'node:child_process';
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
console.log();

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
    /* Named failures if the suite ran; the crash if it did not. */
    const detail = lines.filter((l) => /^\s*FAIL /.test(l));
    for (const l of (detail.length ? detail : lines.slice(-6))) console.log(`  ${l}`);
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
