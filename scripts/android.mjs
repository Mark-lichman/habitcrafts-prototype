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
import { existsSync } from 'node:fs';

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

section('it is an installed app, not a bookmark');
check('it opens in a standalone window', /WebappActivity/.test(focus()), true);
check('with no browser tab behind it', /ChromeTabbedActivity/.test(focus()), false);
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

section('it survives the phone killing it');
/* Background FIRST, which is what a person does and what makes Chrome flush
   the page's storage. A kill within a second or two of the write, with the app
   still in the foreground, genuinely loses it: that is localStorage's async
   disk write, not something this app controls. */
const kept = await evaluate('window.HCApp.store.reviewsByCard().size');
adb('shell', 'input', 'keyevent', 'KEYCODE_HOME');
await wait(2500);
await launchInstalled();
check('the review log came back',
  await evaluate('window.HCApp.store.reviewsByCard().size'), kept);
check('and it still opens as an app', /WebappActivity/.test(focus()), true);
check('the schedule is intact', await evaluate(`(async () => {
  const s = await import('/js/study.js');
  return s.dueSummary().due;
})()`), (n) => n > 0);

section('with both radios off');
adb('shell', 'svc', 'wifi', 'disable');
adb('shell', 'svc', 'data', 'disable');
await wait(2500);
await launchInstalled();
check('it still opens', await evaluate('!!window.HCApp'), true);
check('Today still has a card',
  await evaluate('document.querySelectorAll("[data-show]").length'), 1);
check('the review log is still there',
  await evaluate('window.HCApp.store.reviewsByCard().size'), kept);
check('and a deck still opens offline', await evaluate(`(async () => {
  location.hash = '#/learn/${lessons[0].key}';
  await new Promise((r) => setTimeout(r, 900));
  return document.querySelector('#main').innerText.length > 40;
})()`), true);

adb('shell', 'svc', 'wifi', 'enable');
adb('shell', 'svc', 'data', 'enable');
await evaluate('window.HCApp.store.resetAll()');

console.log(`\n${fail ? `${fail} of ${pass + fail} FAILED` : `all ${pass} checks passed`}`);
process.exit(fail ? 1 : 0);
