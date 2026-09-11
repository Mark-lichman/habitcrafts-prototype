/* ============================================================================
   HabitCrafts — scripts/nav.mjs
   CAN YOU ACTUALLY GET AROUND?        node scripts/nav.mjs

   Walks the pilot flow forwards and backwards and asserts what each control
   DOES, not merely that something moved. Every step is named, so a failure
   says which control and which direction.

   THIS IS THE SUITE THAT CATCHES A DEAD BACK BUTTON. That bug rendered fine,
   had a handler, ran the handler, and changed nothing: render() re-applied the
   route param on every render, so closing a lesson reopened it instantly. No
   amount of reading the code found it; one click did.

   It replaced a generic auditor that clicked every control on every screen.
   That sounded better and was worse: it identified controls by position, so a
   re-render made it click something else and report a button as dead on a
   screen that had no such button, and its reset used a hash change, which does
   not reload a module holding step state. It produced three different wrong
   answers before being abandoned. A test that is confidently wrong costs more
   than no test.
   ========================================================================= */

import { withBrowser } from './lib/browser.mjs';

await withBrowser(async (b) => {
  /* The stepper is the app's own claim about where you are, so asserting
     against it catches a control that changes content without moving the
     flow - which is exactly what a broken crumb would do. */
  const STEP = `(() => {
    const el = document.querySelector('[aria-current="step"]');
    if (!el) return null;
    return Array.from(document.querySelectorAll('.bind-steps__step')).indexOf(el) + 1;
  })()`;

  b.section('forwards through the flow');
  await b.goto('#/learn');
  await b.check('starts on step 1', STEP, 1);
  for (const n of [2, 3, 4, 5]) {
    await b.click('[data-next]');
    await b.check(`to step ${n}`, STEP, n);
  }

  b.section('and backwards, which is where dead controls hide');
  for (const n of [4, 3, 2, 1]) {
    await b.click('[data-back]');
    await b.check(`Back returns to ${n}`, STEP, n);
  }
  await b.check('step 1 has no Back', b.count('[data-back]'), 0);

  b.section('the crumbs');
  await b.goto('#/learn');
  await b.check('nothing clickable on step 1', b.count('[data-goto-step]'), 0);
  await b.check('and no Start over yet', b.count('[data-restart]'), 0);
  for (let i = 0; i < 4; i++) await b.click('[data-next]');
  await b.check('four crumbs are clickable', b.count('[data-goto-step]'), 4);
  await b.check('the current step is NOT a button',
    'document.querySelector(\'[aria-current="step"] button\') === null', true);
  await b.click('[data-goto-step="2"]');
  await b.check('a crumb jumps back', STEP, 2);
  await b.check('crumbs survive going back (high-water mark)', b.count('[data-goto-step]'), 4);
  await b.click('[data-goto-step="5"]');
  await b.check('and forward to a step already reached', STEP, 5);

  b.section('start over');
  await b.click('[data-restart]');
  await b.check('returns to the upload', STEP, 1);
  await b.check('crumbs reset with it', b.count('[data-goto-step]'), 0);
  await b.check('and Start over is gone', b.count('[data-restart]'), 0);

  b.section('a crumb closes an open lesson');
  await b.goto('#/learn', 3);
  await b.click('[data-open-lesson="jl-2"]');
  await b.check('a lesson is open', `${b.T}.includes("Saying no")`, true);
  await b.click('[data-goto-step="2"]');
  await b.check('the crumb left the lesson', `${b.T}.includes("Saying no")`, false);
  await b.check('and landed on step 2', STEP, 2);

  b.section('in and out of a lesson');
  await b.goto('#/learn', 3);
  await b.check('on the lesson list', STEP, 4);
  await b.click('[data-open-lesson="jl-2"]');
  await b.check('lesson 2 opened', `${b.T}.includes("Saying no")`, true);
  await b.click('[data-close-lesson]');
  await b.check('All lessons returns to the list', b.count('[data-open-lesson]'), 5);

  b.section('reading and practice phases');
  await b.click('[data-open-lesson="jl-2"]');
  await b.click('[data-practise]');
  await b.check('practice phase', b.count('[data-reveal]'), (n) => n >= 2);
  await b.click('[data-unpractise]');
  await b.check('Read it again returns to the reading',
    `${b.T}.includes("The negative swaps the ending")`, true);
  await b.click('[data-practise]');
  await b.click('[data-close-lesson]');
  await b.check('Back to lessons works from practice too', b.count('[data-open-lesson]'), 5);

  b.section('the deep link, and its back button');
  await b.goto('#/learn/jl-3');
  await b.check('deep link opens lesson 3', `${b.T}.includes("Asking")`, true);
  await b.check('and the URL names it', 'location.hash', '#/learn/jl-3');
  await b.check('crumbs mark step 4 reached', b.count('[data-goto-step]'), (n) => n >= 3);
  await b.click('[data-close-lesson]');
  await b.check('All lessons leaves the lesson', b.count('[data-open-lesson]'), 5);
  await b.check('and leaves the keyed route', 'location.hash', '#/learn');
  await b.check('it does NOT bounce back open', `${b.T}.includes("Your lessons")`, true);

  b.section('after the bridge fires');
  await b.goto('#/learn', 4);
  await b.click('[data-create-habits]');
  await b.check('the receipt appears', `${b.T}.includes("reminder set")`, true);
  await b.click('a[href="#/home"]', 1000);
  await b.check('Open Home navigates', 'location.hash', '#/home');

  b.section('closing out a practice');
  await b.goto('#/learn', 4);
  await b.click('[data-create-habits]');
  await b.check('a study habit is live',
    'window.HCApp.store.activeHabits().filter(h => h.sourceId).length', 1);

  await b.evaluate("location.hash = '#/library'");
  await b.wait(1400);
  await b.check('the shelf offers a way to finish', b.count('[data-finish]'), 1);
  await b.check('and a way to upload something new', b.count('a[href="#/learn"]'), (n) => n >= 1);

  await b.click('[data-finish]');
  await b.check('finishing archives the habit',
    'window.HCApp.store.activeHabits().filter(h => h.sourceId).length', 0);
  await b.check('the shelf says it is finished', `${b.T}.includes("Finished")`, true);
  await b.check('the lessons are still listed', b.count('[href^="#/learn/"]'), (n) => n >= 5);
  await b.check('it now offers a way back', b.count('[data-reopen]'), 1);

  await b.evaluate("location.hash = '#/home'");
  await b.wait(1200);
  await b.check('the reminder trigger is gone from Home', b.count('[data-fire-reminder]'), 0);

  await b.evaluate("location.hash = '#/library'");
  await b.wait(1200);
  await b.click('[data-reopen]');
  await b.check('reopening puts it back', b.count('[data-finish]'), 1);
});
