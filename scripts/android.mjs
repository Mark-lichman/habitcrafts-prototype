/* ============================================================================
   HabitCrafts — scripts/android.mjs
   THE WHOLE APP, ON A REAL ANDROID.        node scripts/android.mjs

   The desktop suites drive headless Chrome on Windows. This drives the INSTALLED
   app on a device or emulator, over the same DevTools protocol, and asks the
   questions no desktop run can answer: does it launch as an app rather than a
   tab, does it lay out on a real screen with a real system font, does a week of
   practice survive the phone killing it, and does it open with the radios off.

   ---------------------------------------------------------------------------
   IT READS THE STORE; IT DOES NOT TAP AT COORDINATES
   ---------------------------------------------------------------------------
   `adb shell input tap` is pixel-hunting and it lies quietly. A discern card is
   taller than a produce card, so a tap aimed at "Got it" on one lands on empty
   space on the other: the count does not move and the run looks like a
   persistence bug that is really a missed tap. That happened, twice, and cost
   more time than writing this did. Taps are used for ONE thing here, launching
   from the home screen, because that is the only way to open the installed
   shell rather than a browser tab.

   ---------------------------------------------------------------------------
   WHAT IT KNOWS THAT THE DESKTOP SUITES CANNOT
   ---------------------------------------------------------------------------
   `localStorage` is synchronous to JavaScript and asynchronous to disk. Chrome
   batches the write to its backing store, so an answer given and then killed
   within a couple of seconds is genuinely lost, even though the JS call
   returned. A desktop reload never shows this because the process never dies.
   The realistic path is tested here: background first, which is what a person
   does and what makes Chrome flush, THEN kill.

   And real fonts. CI found ten overflow failures on Linux that cannot reproduce
   on Windows, so the same measurement is taken here on an actual Android build
   at an actual device width.

   SETUP
       an emulator or device on adb, the app installed to the home screen,
       `node scripts/serve.js` running, and
       adb reverse tcp:5173 tcp:5173
       adb forward tcp:9333 localabstract:chrome_devtools_remote
   ========================================================================= */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

const SDK = process.env.ANDROID_HOME
  || `${process.env.LOCALAPPDATA || ''}/Android/Sdk`.replace(/\\/g, '/');
const ADB = [`${SDK}/platform-tools/adb.exe`, `${SDK}/platform-tools/adb`]
  .find((p) => existsSync(p));
if (!ADB) { console.error(`adb not found under ${SDK}`); process.exit(2); }

const adb = (...a) => execFileSync(ADB, a, { encoding: 'utf8' }).trim();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0;
let fail = 0;
function check(label, got, want) {
  const ok = typeof want === 'function' ? want(got) : got === want;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `  (got ${JSON.stringify(got)})`}`);
  ok ? pass++ : fail++;
  return ok;
}
const section = (t) => console.log(`\n— ${t} —`);

/* --------------------------------------------------------------------------
   TALKING TO THE APP
-------------------------------------------------------------------------- */

/* THE FORWARD DIES WITH THE PROCESS.
   `adb forward tcp:9333 localabstract:chrome_devtools_remote` points at a unix
   socket that Chrome owns, so force-stopping Chrome kills the endpoint and the
   next fetch fails with "other side closed" rather than anything about Chrome.
   Re-establishing it is cheap and idempotent, so it happens on every lookup
   rather than being something to remember after each kill. */
function forward() {
  try { adb('forward', 'tcp:9333', 'localabstract:chrome_devtools_remote'); }
  catch (e) { /* already forwarded, or the device is not ready yet */ }
}

async function target({ tries = 20 } = {}) {
  for (let i = 0; i < tries; i++) {
    forward();
    try {
      const list = await (await fetch('http://localhost:9333/json/list')).json();
      const p = list.find((t) => t.type === 'page' && t.url.includes('app.html'));
      if (p) return p;
    } catch (e) { /* Chrome is still coming up */ }
    await wait(1000);
  }
  throw new Error('the app never appeared on the device');
}

/* One socket per call. The app is killed and reopened repeatedly here, and a
   held socket would outlive the target it points at. */
async function evaluate(expression) {
  const t = await target();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('evaluate timed out')), 20000);
      ws.addEventListener('message', (e) => {
        const m = JSON.parse(e.data);
        if (m.id !== 1) return;
        clearTimeout(timer);
        if (m.result?.exceptionDetails) reject(new Error(m.result.exceptionDetails.text));
        else resolve(m.result?.result?.value);
      });
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true, awaitPromise: true },
      }));
    });
  } finally { ws.close(); }
}

const ready = () => evaluate(`(async () => {
  const until = Date.now() + 20000;
  while (!window.HCApp && Date.now() < until) await new Promise((r) => setTimeout(r, 50));
  if (window.HCApp) await window.HCApp.ready;
  return !!window.HCApp;
})()`);

/**
 * Open the INSTALLED app from its home-screen icon.
 *
 * `am start -d <url>` opens a browser TAB, which shares the origin and so would
 * pass every storage assertion below while proving nothing about the installed
 * shell. The icon is the only route to WebappActivity, so this is the one place
 * coordinates are used, and it is checked immediately afterwards.
 */
async function launchInstalled() {
  adb('shell', 'am', 'force-stop', 'com.android.chrome');
  await wait(1200);
  adb('shell', 'input', 'keyevent', 'KEYCODE_HOME');
  await wait(1200);
  adb('shell', 'input', 'swipe', '900', '1200', '200', '1200', '250');
  await wait(1200);
  adb('shell', 'input', 'tap', '168', '336');
  await wait(4000);
  await target();          /* waits for Chrome to expose the page again */
  await ready();
}

const focus = () => (adb('shell', 'dumpsys', 'window').match(/mCurrentFocus=.*/) || [''])[0];
const goto = async (hash) => {
  await evaluate(`location.hash = ${JSON.stringify(hash)}`);
  await wait(900);
};

/* -------------------------------------------------------------------------- */

section('the device');
console.log(`  ${adb('shell', 'getprop', 'ro.product.model')}, `
  + `Android ${adb('shell', 'getprop', 'ro.build.version.release')}, `
  + `${adb('shell', 'wm', 'size').replace('Physical size: ', '')} @ `
  + `${adb('shell', 'wm', 'density').replace('Physical density: ', '')}dpi`);

await launchInstalled();

/* --------------------------------------------------------------------------
   TAKE THE CACHED BUILD OUT OF THE WAY FIRST.

   The installed app is served cache-first by a service worker, so without this
   the suite grades whatever was precached the last time the cache key changed.
   That key is `VERSION` in sw-manifest.js, a hash of the precache file list and
   sizes which only changes when `tools/precache.mjs` is re-run - so editing a
   module changes nothing the device can see, and the stale copy is served
   indefinitely.

   Regenerating the manifest is therefore step one, and it is done here rather
   than left to a person remembering: a stale manifest is not only a testing
   problem, it is what a deployed reader would get too.

   Then the device is put back to a cold start: registrations gone, caches
   dropped, reloaded. The service worker re-registers and precaches from the
   network, which now has the current files. `skipWaiting` and `clients.claim`
   in sw.js make that take effect on this load rather than the next one.
-------------------------------------------------------------------------- */

execFileSync(process.execPath, ['tools/precache.mjs'], { stdio: 'ignore' });

await evaluate(`(async () => {
  const rs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(rs.map((r) => r.unregister()));
  await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  return true;
})()`);

/* The page goes away underneath the socket, so this is expected to throw. */
try { await evaluate('location.reload()'); } catch (e) { /* it reloaded */ }
await wait(5000);
await ready();
await evaluate('navigator.serviceWorker.ready.then(() => true)');
await wait(2500);
try { await evaluate('location.reload()'); } catch (e) { /* now SW-controlled */ }
await wait(4000);
await ready();

section('it is an installed app, not a bookmark');
check('it opens in a standalone window', /WebappActivity/.test(focus()), true);
check('with no browser tab behind it', /ChromeTabbedActivity/.test(focus()), false);
check('and the page agrees it is standalone',
  await evaluate("matchMedia('(display-mode: standalone)').matches"), true);

/* WEBAPK OR LEGACY SHORTCUT, STATED RATHER THAN GLOSSED.
   `WebappActivity` is satisfied by BOTH, so this section's heading used to be
   true of a Chrome-badged bookmark that is absent from the app drawer and
   cannot be uninstalled like an app. An audit caught the overclaim.

   A real WebAPK needs Google to verify the origin, which it cannot do for
   `localhost` over `adb reverse`. So on this setup the honest answer is "legacy
   shortcut, and a WebAPK is untestable here" — reported, not asserted, because
   failing on it would be failing on the test rig rather than on the app. */
const webapk = adb('shell', 'pm', 'list', 'packages').includes('org.chromium.webapk');
const intent = (adb('shell', 'dumpsys', 'activity', 'activities').match(/dat=webapp:\/\/\S+/) || [])[0];
console.log(`  note  ${webapk ? 'a WebAPK is installed' : 'legacy shortcut, NOT a WebAPK'}`
  + `${intent ? ` (${intent})` : ''}`);
console.log('        A WebAPK cannot be minted for localhost: Google has to reach the origin.');
console.log('        Only an HTTPS deploy can settle that half of the claim.');
check('on the shipping configuration',
  await evaluate('window.HCApp.config.experimentId()'), 'japanese');
check('with the experiment switcher gone',
  await evaluate('!!document.querySelector("[data-xbar]:not([hidden])")'), false);
check('and no new-habit button',
  await evaluate('const f = document.querySelector(".nav-fab"); !f || f.hidden'), true);
check('storing to localStorage, not the session',
  await evaluate('window.HCApp.store.adapterName()'), 'local');
check('with every deck loaded', await evaluate(`(async () => {
  const s = await import('/js/study.js');
  return s.allSources().length;
})()`), (n) => n >= 1);

/* --------------------------------------------------------------------------
   IS THE DEVICE EVEN RUNNING THE CODE I JUST EDITED?

   This section exists because the answer was no, and nothing here could tell.

   The installed app is served by a cache-first service worker whose cache key
   is `VERSION` in sw-manifest.js - a hash of the precache FILE LIST AND SIZES,
   regenerated only when `tools/precache.mjs` is run. Editing a module does not
   change it. So the service worker went on serving the copy it had precached,
   and every assertion this suite makes about JavaScript behaviour was made
   about whatever build happened to be in the device's cache.

   It was caught by a mutation test that should have gone red and did not: the
   durable-write layer in persistence.js was disabled on disk, and the device
   reported all forty checks passing, because the device never saw the mutant.
   A suite that grades a stale build is worse than no suite, since it reports
   confidently on code that is not running.

   The check below compares the bytes the DEVICE is served against the bytes on
   disk, for the modules whose behaviour this suite actually asserts. It is the
   one check here that protects every other one.
-------------------------------------------------------------------------- */

section('the device is running the working tree, not a cached build');
for (const rel of ['js/persistence.js', 'js/srs.js', 'js/study.js', 'js/app.js']) {
  const onDisk = statSync(`prototype/${rel}`).size;
  /* BYTES BOTH SIDES. The first version of this compared `statSync().size`
     against the string's `.length`, which disagree for every file in this repo
     that contains Japanese - a character costs three bytes on disk and one unit
     in a JS string. All four files "failed" on a device that was serving them
     perfectly, and the wrong conclusion was one step away. `byteLength` of the
     encoded text is the same quantity the filesystem reports. */
  const served = await evaluate(
    `fetch('/${rel}', { cache: 'no-store' })
       .then((r) => r.text())
       .then((t) => new TextEncoder().encode(t).length)`);
  check(`${rel} matches the file on disk`, served, onDisk);
}

section('every screen renders on a real phone');
const NAV = [
  ['Today', '#/today'],
  ['Decks', '#/library'],
  ['Add', '#/learn'],
  ['You', '#/profile'],
];
for (const [name, hash] of NAV) {
  await goto(hash);
  check(`${name} renders`,
    await evaluate('document.querySelector("#main").innerText.length'), (n) => n > 40);
}

section('nothing scrolls sideways, measured on the device');
/* THE QUESTION CI RAISED. Ten overflow failures on Linux that will not
   reproduce on Windows, which I attributed to scrollbars without evidence.
   Android has overlay scrollbars and a real system font, so this is the
   measurement that actually decides whether a phone is affected. */
for (const [name, hash] of NAV) {
  await goto(hash);
  const o = await evaluate(`(() => {
    const d = document.documentElement;
    const over = d.scrollWidth - d.clientWidth;
    const guilty = [...document.querySelectorAll('#main *')]
      .filter((el) => el.getBoundingClientRect().right > d.clientWidth + 1)
      .slice(0, 3).map((el) => el.className || el.tagName);
    return { over, guilty, width: d.clientWidth };
  })()`);
  check(`${name}: no sideways scroll at ${o.width}px`, o.over <= 1, true)
    || console.log(`        ${o.over}px — ${o.guilty.join(', ')}`);
}

section('every target is thumb-sized');
/* 24px is the WCAG floor the desktop suite uses. On a phone it is the number
   that actually matters, because there is no cursor to aim with. */
for (const [name, hash] of NAV) {
  await goto(hash);
  const small = await evaluate(`(() => {
    const sel = '#main button, #main a[href], #main input, #main [role="checkbox"]';
    return [...document.querySelectorAll(sel)]
      .filter((el) => el.getClientRects().length)
      .map((el) => ({ t: el.innerText.slice(0, 18), r: el.getBoundingClientRect() }))
      .filter((x) => x.r.height < 24 || x.r.width < 24)
      .map((x) => x.t + ' ' + Math.round(x.r.width) + 'x' + Math.round(x.r.height));
  })()`);
  check(`${name}: every target >= 24px`, small.length, 0)
    || console.log(`        ${small.join(' | ')}`);
}

section('a lesson from every deck opens');
const lessons = await evaluate(`(async () => {
  const s = await import('/js/study.js');
  return s.allSources().map((src) => {
    const c = s.corpusFor(src.id);
    return { name: src.subject + ' · ' + src.unit, key: c.lessons[0].key, title: c.lessons[0].title };
  });
})()`);
for (const l of lessons) {
  await goto(`#/learn/${l.key}`);
  check(`${l.name}`, await evaluate(
    `document.querySelector("#main").innerText.includes(${JSON.stringify(l.title)})`), true);
}

section('practising, through the real UI');
await goto('#/today');
await evaluate('window.HCApp.store.resetAll()');
await wait(600);
await goto('#/today');
check('a card is offered', await evaluate('document.querySelectorAll("[data-show]").length'), 1);
check('with its answer hidden', await evaluate('document.querySelectorAll("[data-grade]").length'), 0);

await evaluate('document.querySelector("[data-show]").click()');
await wait(700);
check('revealing offers two grades',
  await evaluate('document.querySelectorAll("[data-grade]").length'), 2);

const beforeAnswer = await evaluate('window.HCApp.store.reviewsByCard().size');
await evaluate('document.querySelector(\'[data-grade="got"]\').click()');
await wait(900);
check('answering records a review',
  await evaluate('window.HCApp.store.reviewsByCard().size'), beforeAnswer + 1);
check('and moves to the next card',
  await evaluate('document.querySelectorAll("[data-show]").length'), 1);

section('it survives the phone killing it, with no grace period');
/* THIS SECTION USED TO BE WRITTEN SO THAT IT COULD NOT FAIL.
   It pressed HOME, waited 2500ms and only then killed the app, above a comment
   explaining that a kill "within a second or two of the write" genuinely loses
   the data and that this was "not something this app controls". An independent
   audit reproduced that loss four times, measured the window at 3-5 seconds,
   and pointed out that the test was arranged around the bug rather than aimed
   at it - a choice being described as a law.

   It was controllable. The local adapter now mirrors every write into
   IndexedDB with `durability: 'strict'` and reconciles at boot, so the write is
   on disk before the transaction reports back. See js/persistence.js.

   So the grace period is gone. The card is answered and the process is killed
   immediately, with the app still in the foreground - which is what happens
   when someone answers one last card and swipes the app away on a train. */
/* THE GAP BETWEEN THE WRITE AND THE KILL IS THE ONLY VARIABLE THAT MATTERS.
   The first attempt at this still could not fail: it read the review count,
   then called `launchInstalled`, which reads a target and force-stops - two
   seconds of round trips, by which time the flush had already happened. With
   the durable mirror deliberately disabled the section stayed green, which is
   the same false green as before wearing a better comment.

   So nothing at all happens between the answer and the kill. The expected value
   is computed from a count taken BEFORE the answer, so no round trip is needed
   after it, and `am force-stop` is the very next statement. */
const kept = (await evaluate('window.HCApp.store.reviewsByCard().size')) + 1;

await evaluate('document.querySelector("[data-show]").click()');
await wait(500);
await evaluate(`document.querySelector('[data-grade="got"]').click()`);
adb('shell', 'am', 'force-stop', 'com.android.chrome');   /* NO WAIT. */

await launchInstalled();
check('the answer given a moment before the kill came back',
  await evaluate('window.HCApp.store.reviewsByCard().size'), kept);
check('and it still opens as an app', /WebappActivity/.test(focus()), true);
check('the schedule is intact', await evaluate(`(async () => {
  const s = await import('/js/study.js');
  return s.dueSummary().due;
})()`), (n) => n > 0);

section('genuinely offline');
/* THIS SECTION USED TO BE A FALSE GREEN, and an independent audit proved it.
   It disabled wifi and data and declared victory. But `adb reverse` tunnels
   over the ADB transport, which the radios have nothing to do with, so the
   device could still reach the dev server the whole time. The section would
   have passed with the service worker deleted.

   Cutting the tunnel is what actually takes the origin away. The radios go off
   too, so `navigator.onLine` is false and nothing can quietly fall back to a
   real network. */
/* RESTORE ON THE WAY OUT, NOT ONLY ON THE HAPPY PATH.
   Taking the radios and the tunnel away is the one thing this suite does that
   OUTLIVES it. When a mutation test broke the service worker on purpose, the
   suite died mid-probe with the device still offline, and the next run failed
   at its first step for a reason that had nothing to do with the code under
   test - a poisoned device looks exactly like a broken app.

   `exit` fires on a clean finish, an uncaught throw and a signal alike, and
   execFileSync is safe there because it is synchronous. Registered BEFORE the
   teardown it undoes, so there is no window where the device is offline and
   nothing is going to put it back. */
process.on('exit', () => {
  try { adb('reverse', 'tcp:5173', 'tcp:5173'); } catch (e) { /* nothing to do */ }
  try { adb('shell', 'svc', 'wifi', 'enable'); } catch (e) { /* nothing to do */ }
  try { adb('shell', 'svc', 'data', 'enable'); } catch (e) { /* nothing to do */ }
});

adb('shell', 'svc', 'wifi', 'disable');
adb('shell', 'svc', 'data', 'disable');
try { adb('reverse', '--remove', 'tcp:5173'); } catch (e) { /* already gone */ }
await wait(2500);

/* The launch itself has to tolerate failure here, for the same reason the
   checks below do: `launchInstalled` waits for the app to announce itself, and
   an app with no working cache never will. Letting that throw turns "offline is
   broken" into a stack trace and skips every remaining check. Catch it, and let
   the assertions say what happened. */
let launched = true;
try { await launchInstalled(); } catch (e) { launched = false; }
check('the app comes up with no network at all', launched, true);

/* A DEAD APP MUST REPORT AS A FAILURE, NOT AS A STACK TRACE.
   With the service worker sabotaged, `evaluate` below simply never answers:
   the page has no document to run script in. The suite used to die on the
   timeout, which exits non-zero and so does technically fail, but it prints a
   node stack where a verdict belongs and verify.mjs has nothing to summarise.
   `probe` turns an unanswerable question into the answer "the app is not
   there", which is both true and checkable. */
const probe = async (expr, dead = 'APP DID NOT LOAD') => {
  try { return await evaluate(expr); } catch (e) { return dead; }
};

/* PROVE THE SERVER IS GONE WITHOUT ASKING THE PAGE.
   The obvious version of this check runs a `fetch` in the page and expects it
   to throw. But if the service worker is broken there IS no page to ask, and
   the check that establishes the premise then hangs on the very failure the
   section exists to catch. The premise has to hold from the host, where it is
   answerable either way. */
check('the tunnel to the dev server is gone',
  adb('reverse', '--list').includes('tcp:5173'), false);
check('and the device knows it is offline', await probe('navigator.onLine', 'APP DID NOT LOAD'), false);

/* Belt and braces, from inside the page, once we know it loaded at all. */
check('a network request from the page fails', await probe(`(async () => {
  try { const r = await fetch('/__no_such_file__', { cache: 'no-store' }); return 'REACHED ' + r.status; }
  catch (e) { return 'unreachable'; }
})()`), 'unreachable');
check('it still opens', await probe('!!window.HCApp', false), true);
check('Today still has a card',
  await probe('document.querySelectorAll("[data-show]").length'), 1);
check('the review log is still there',
  await probe('window.HCApp.store.reviewsByCard().size'), kept);
check('and a deck still opens offline', await probe(`(async () => {
  location.hash = '#/learn/${lessons[0].key}';
  await new Promise((r) => setTimeout(r, 900));
  return document.querySelector('#main').innerText.length > 40;
})()`), true);

/* Put it back now rather than waiting for the exit handler, because the reset
   below needs the app reachable. The handler stays registered and is idempotent. */
adb('reverse', 'tcp:5173', 'tcp:5173');
adb('shell', 'svc', 'wifi', 'enable');
adb('shell', 'svc', 'data', 'enable');
await wait(1500);
try { await evaluate('window.HCApp.store.resetAll()'); }
catch (e) { console.log('  note  could not clear state; run again on a clean device'); }

console.log(`\n${fail ? `${fail} of ${pass + fail} FAILED` : `all ${pass} checks passed`}`);
process.exit(fail ? 1 : 0);
