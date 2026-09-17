/* ============================================================================
   HabitCrafts — scripts/persist.mjs
   DOES ANY OF IT SURVIVE?              node scripts/persist.mjs

   The one thing no other suite could test, because until now there was nothing
   to survive. Every other suite runs with `demo=1` and therefore on
   sessionStorage, and `goto()` clears that on purpose to get a clean slate.
   This one runs on the real adapter and deliberately does NOT clear.

   WHY IT IS WORTH ITS OWN FILE.
   The failure it guards against is silent and total. If `store.configure()` is
   ever dropped from boot, or the adapter's `save()` starts throwing, or a key
   changes without a version bump, the app keeps working perfectly for the whole
   session and then loses a week of practice the first time the phone is
   rebooted. There is no error, no console warning and no visible symptom until
   the data is already gone. Nothing else here would notice.

   ---------------------------------------------------------------------------
   THIS FILE USED TO BE UNABLE TO DETECT THE FAILURE ITS OWN HEADER DESCRIBES
   ---------------------------------------------------------------------------
   An independent audit made the point and it was right. The header above talks
   about losing a week of practice "the first time the phone is rebooted", and
   the suite tested `Page.reload`. Those are not the same event and the gap
   between them is the entire risk.

   A reload is a new document and a new module graph, which is worth checking
   and is still checked below — it catches a store that answers out of a
   module-scope variable. But it never leaves the browser PROCESS, and inside
   one process Chrome serves localStorage from the copy it already holds in
   memory. Nothing has to reach disk for a reload to pass. A build where every
   write was dropped on its way to storage would have gone green here.

   So there are now two sessions. The first practises and reloads. Then the
   browser is KILLED and a second one is started on the same profile directory,
   which is the closest thing to a reboot that a test can stage: new process,
   cold cache, everything read back off the disk. The claim in the header is
   finally the claim being tested.

   IT ALSO RUNS THE CONFIGURATION THAT SHIPS. It used to pass `solo=1`, which
   is not what the manifest launches. The query below is copied from
   `manifest.webmanifest`'s `start_url`, so persistence is proven on the build
   that is actually installed rather than on a neighbouring one.
   ========================================================================= */

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { withBrowser } from './lib/browser.mjs';

/* Exactly what manifest.webmanifest opens. If that line changes, this one has
   to change with it, and a mismatch means this suite is grading a build nobody
   installs. */
const SHIPPING = 'x=japanese&solo=1';

/**
 * Delete the profile, patiently, and never fail the suite over it.
 *
 * CI failed on `ENOTEMPTY: rmdir '/tmp/hc-persist-profile/Default'`, which was
 * this file's own doing: it deleted the directory the instant `withBrowser`
 * returned, while Chrome was still letting go of it. browser.mjs already
 * retries its own cleanup for exactly this reason and this did not.
 *
 * Swallowed at the end rather than thrown: a leftover temp directory is
 * untidy, and reporting a persistence regression because a folder was busy is
 * worse than untidy. The next run clears it before it does anything.
 */
function rmProfile(dir) {
  for (let i = 0; i < 5; i++) {
    try { rmSync(dir, { recursive: true, force: true }); return true; }
    catch (e) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200); }
  }
  return false;
}

/* One profile, two browsers. Cleared first so a previous run cannot supply the
   data this one is about to claim it saved. */
const PROFILE = resolve(tmpdir(), 'hc-persist-profile');
rmProfile(PROFILE);

const opts = { query: SHIPPING, bootMs: 1800, profile: PROFILE, carry: true };
const app = 'window.HCApp.store';

/**
 * WAIT FOR THE APP, DO NOT ASSUME IT, AND SAY SO WHEN IT NEVER ARRIVES.
 *
 * Every other suite opens with a `goto`, which waits as a side effect. This one
 * cannot: `goto` clears sessionStorage and reloads, and session two must touch
 * nothing at all before it reads what is on the disk.
 *
 * The timeout is generous because of where this suite runs. Standalone it boots
 * in well under a second; under `scripts/verify.mjs` it is the ninth browser
 * suite in a row on a loaded machine, and the default eight seconds was not
 * always enough. When it was not, `ready()` returned false and the NEXT line
 * threw `Uncaught`, so a slow boot reported as "the app is not on localStorage"
 * - a wrong answer to a question that had not been asked yet. A suite may fail
 * on a slow machine; it may not fail with a misleading reason.
 */
async function bootedOrFail(b) {
  /* RETRIED, BECAUSE `ready()` CAN ANSWER `undefined` WITHOUT ANYTHING BEING
     WRONG. It runs a polling loop inside the page, so when the execution
     context is torn down underneath it - which is exactly what the reloads in
     this suite do, and what a loaded machine makes more likely - the protocol
     returns no value rather than an error. The first version failed on that and
     reported "app never booted" while the app was booting perfectly: the suite
     passed alone and failed under verify.mjs, which is the worst kind of red
     because it teaches people to re-run rather than to read.

     A fresh call gets a fresh context, so retrying is the whole fix. Three
     attempts at 25 seconds is far past any real boot; if all three come back
     empty the app genuinely is not there. */
  let ok;
  for (let i = 0; i < 3 && !ok; i++) {
    if (i) await b.wait(1000);
    ok = await b.ready(25000);
  }
  await b.check('the app booted', String(!!ok), true);
  if (!ok) throw new Error('app never booted; every check below would be noise');
}

/* What session one recorded, for session two to look for. Held here in node,
   not in the browser, which is the point: a value that crossed the process
   boundary in this file cannot have been smuggled across in Chrome's memory. */
const recorded = {};

/* -------------------------------------------------------------------------- */

console.log('\n=== SESSION ONE: practise, then reload in the same process ===');

const one = await withBrowser(async (b) => {
  /* WAIT FOR THE APP, DO NOT ASSUME IT. Every other suite opens with a `goto`,
     which waits as a side effect; this one cannot, because `goto` clears
     sessionStorage and reloads, and session two must touch nothing before it
     reads. On an owned profile the first launch is a cold start with no warm
     caches, and the first check ran roughly a second before `window.HCApp`
     existed - which reported as "the app is not on localStorage" rather than as
     "the app has not booted yet". */
  await bootedOrFail(b);

  b.section('the adapter that is actually installed');
  await b.check('the app is on localStorage, not sessionStorage',
    `${app}.adapterName ? ${app}.adapterName() : "unknown"`, 'local');
  await b.check('and localStorage has a key for it',
    'Object.keys(window.localStorage).some((k) => k.startsWith("hc:ja:"))', true);

  /* Start from a known floor. Through the app's own resetAll() rather than by
     wiping storage directly, so the adapter's clear() is on the tested path. */
  await b.evaluate(`${app}.resetAll()`);
  await b.send('Page.reload', {});
  await b.wait(1800);
  await bootedOrFail(b);

  b.section('a review survives a reload');

  /* Answer one card through the real UI rather than by calling the store, so
     the handler wiring is on the tested path. */
  const first = await b.evaluate(`(async () => {
    const s = await import('/js/study.js');
    const q = s.dueCards({ limit: 1 });
    return q.length ? { card: q[0].card, lesson: q[0].lessonKey } : null;
  })()`);
  /* Parenthesised: an object literal at the start of an expression statement is
     parsed as a block, so the bare form threw rather than comparing anything. */
  await b.check('there is something due to practise',
    `(${JSON.stringify(first)}) !== null`, true);

  await b.goto(`#/learn/${first.lesson}`);
  await b.click('[data-practise]');
  await b.click('[data-reveal]');
  await b.click('[data-mark][data-result="again"]');

  recorded.reviews = await b.evaluate(`${app}.reviewsByCard().size`);
  await b.check('the answer reached the store', `${recorded.reviews} > 0`, true);

  /* A reload. New document, new module graph, nothing in module scope. Still
     the same process, so this proves less than it looks - see the header. */
  await b.send('Page.reload', {});
  await b.wait(1800);
  await bootedOrFail(b);

  await b.check('the review is still there after a reload',
    `${app}.reviewsByCard().size`, recorded.reviews);
  await b.check('and it is still recorded as a miss',
    `[...${app}.reviewsByCard().values()].flat().some((r) => r.grade === "again")`, true);

  b.section('the schedule that comes out of it');
  await b.check('a missed card is due again today', `(async () => {
    const s = await import('/js/study.js');
    return s.dueCards({ limit: 1 }).length > 0;
  })()`, true);
  await b.check('and it is the lapsed one', `(async () => {
    const s = await import('/js/study.js');
    const top = s.dueCards({ limit: 1 })[0];
    return top && top.schedule.lapses > 0;
  })()`, true);

  b.section('a habit check-in, recorded for the next process to find');
  const habit = await b.evaluate(`${app}.activeHabits()[0].id`);
  recorded.habit = habit;
  const before = await b.evaluate(`${app}.habitById(${JSON.stringify(habit)}).history.length`);
  await b.evaluate(`${app}.checkIn(${JSON.stringify(habit)})`);
  recorded.history = before + 1;
  await b.check('the check-in is in memory before the browser dies',
    `${app}.habitById(${JSON.stringify(habit)}).history.length`, recorded.history);

  /* Deliberately NOT cleared. The whole of session two is about what is left
     on that disk after this process is killed. */
}, opts);

/* -------------------------------------------------------------------------- */

console.log('\n=== SESSION TWO: a NEW browser process, same profile on disk ===');
console.log(`    carried over: ${recorded.reviews} review(s), `
  + `habit ${recorded.habit} at ${recorded.history} check-in(s)`);

const two = await withBrowser(async (b) => {
  await bootedOrFail(b);

  b.section('what came back off the disk');

  /* No reset, no seeding, no navigation first: whatever is here was written by
     a process that no longer exists. */
  await b.check('the review log survived the browser being killed',
    `${app}.reviewsByCard().size`, recorded.reviews);
  await b.check('and the grade came back as a miss, not a default',
    `[...${app}.reviewsByCard().values()].flat().some((r) => r.grade === "again")`, true);
  await b.check('the check-in survived too',
    `${app}.habitById(${JSON.stringify(recorded.habit)}).history.length`, recorded.history);

  b.section('and the schedule still means the same thing');
  await b.check('the lapsed card is still at the top of the queue', `(async () => {
    const s = await import('/js/study.js');
    const top = s.dueCards({ limit: 1 })[0];
    return top && top.schedule.lapses > 0;
  })()`, true);

  /* Leave nothing behind. A suite that fills a developer's storage with test
     practice is a suite people stop running. */
  await b.evaluate(`${app}.resetAll()`);
}, opts);

/* -------------------------------------------------------------------------- */

if (!rmProfile(PROFILE)) {
  console.log(`  note  could not remove ${PROFILE}; the next run will clear it`);
}

const pass = one.pass + two.pass;
const fail = one.fail + two.fail;
const errors = [...one.errors, ...two.errors];
errors.slice(0, 5).forEach((e) => console.log('   ' + e));

const bad = fail || errors.length;
console.log(bad
  ? `\n${fail} of ${pass + fail} FAILED${errors.length ? ` (+${errors.length} console errors)` : ''}`
  : `\nall ${pass} checks passed`);
process.exit(bad ? 1 : 0);
