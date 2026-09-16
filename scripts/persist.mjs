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

   IT RELOADS FOR REAL. `Page.reload` is a new document and a fresh module
   graph: every module-scope `let` in the app is gone, the store re-hydrates
   from the adapter, and anything that comes back came back from storage rather
   than from a variable that happened to still be in memory. Checking the store
   without reloading would pass even with persistence completely broken.
   ========================================================================= */

import { withBrowser } from './lib/browser.mjs';

/* No `demo=1`: this suite wants the adapter the phone will run on. */
await withBrowser(async (b) => {
  const app = 'window.HCApp.store';

  /* Start from a known floor rather than from whatever the last run left.
     Clearing through the app's own resetAll() rather than by wiping storage
     directly, so the adapter's clear() is on the tested path too. */
  await b.goto('#/home');
  await b.evaluate(`${app}.resetAll()`);
  await b.send('Page.reload', {});
  await b.wait(1800);
  await b.ready();

  b.section('the adapter that is actually installed');
  await b.check('the app is on localStorage, not sessionStorage',
    `${app}.adapterName ? ${app}.adapterName() : "unknown"`, 'local');
  await b.check('and localStorage has a key for it',
    'Object.keys(window.localStorage).some((k) => k.startsWith("hc:ja:"))', true);

  b.section('a review survives a reload');

  /* Answer one card, through the real UI rather than by calling the store, so
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

  const before = await b.evaluate(`${app}.reviewsByCard().size`);
  await b.check('the answer reached the store', `${before} > 0`, true);

  /* THE RELOAD. New document, new module graph, nothing in memory. */
  await b.send('Page.reload', {});
  await b.wait(1800);
  await b.ready();

  await b.check('the review is still there after a reload',
    `${app}.reviewsByCard().size`, before);
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

  b.section('a habit check-in survives too');
  const habit = await b.evaluate(`${app}.activeHabits()[0].id`);
  const doneBefore = await b.evaluate(`${app}.habitById(${JSON.stringify(habit)}).history.length`);
  await b.evaluate(`${app}.checkIn(${JSON.stringify(habit)})`);
  await b.send('Page.reload', {});
  await b.wait(1800);
  await b.ready();
  await b.check('the check-in is still there',
    `${app}.habitById(${JSON.stringify(habit)}).history.length`, doneBefore + 1);

  /* Leave nothing behind. A suite that fills a developer's localStorage with
     test practice is a suite people stop running. */
  await b.evaluate(`${app}.resetAll()`);
}, { query: 'solo=1', bootMs: 1800 });
