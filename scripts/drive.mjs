/* ============================================================================
   HabitCrafts — scripts/drive.mjs
   DOES THE FLOW ACTUALLY WORK?        node scripts/drive.mjs

   Walks upload → extract → clarify → lessons → when with real material, and
   asserts what each screen produces rather than that it rendered. Where nav.mjs
   asks "can you get around", this asks "does the thing do what it claims".

   It has earned its place twice over. On its first run it found a doubled count
   in a label and a pedagogical flaw nobody had noticed: lesson 5 taught the
   three irregular age forms in its body and then asked for one of them on the
   same screen, which is copying rather than retrieval. That is why the lesson
   now has a reading phase and a practice phase.
   ========================================================================= */

import { withBrowser } from './lib/browser.mjs';

await withBrowser(async (b) => {
  const sheet = 'document.querySelector(".rem-sheet").innerText';

  b.section('step 1: upload');
  await b.goto('#/learn');
  await b.check('the deck is offered', `${b.T}.includes("_みん日_第1課.pdf")`, true);
  await b.check('writing your own is a peer option', `${b.T}.includes("Write your own lessons")`, true);

  b.section('step 2: what we found');
  await b.click('[data-next]');
  await b.check('classified as language practice',
    `${b.T}.toLowerCase().includes("language practice")`, true);
  await b.check('shows the scan caveat', `${b.T}.includes("read them as images")`, true);
  await b.check('7 patterns found', `${b.T}.includes("7 found")`, true);
  await b.check('3 exceptions kept apart', `${b.T}.includes("3 found")`, true);

  b.section('step 3: questions');
  await b.click('[data-next]');
  await b.check('the romaji question names both scripts',
    `${b.T}.includes("hiragana") && ${b.T}.includes("katakana")`, true);
  await b.check('no bare "kana" as a standalone term', `/\\bkana\\b/i.test(${b.T})`, false);
  await b.check('multi-select renders as checkboxes', b.count('[role="checkbox"]'), (n) => n >= 5);
  await b.check('class cadence offers twice a week', `${b.T}.includes("Twice a week")`, true);

  b.section('multi-select accumulates rather than replacing');
  await b.click('[data-answer="q-known"][data-value="i-san"]');
  await b.check('ticking one reports it', `${b.T}.includes("1 of 5 dropped")`, true);
  await b.click('[data-answer="q-known"][data-value="i-sensei"]');
  await b.check('ticking a second accumulates (not a radio)', `${b.T}.includes("2 of 5 dropped")`, true);
  await b.click('[data-answer="q-known"][data-value="i-san"]');
  await b.check('clicking again unticks', `${b.T}.includes("1 of 5 dropped")`, true);

  b.section('step 4: lessons');
  await b.click('[data-next]');
  await b.check('five lessons listed', b.count('[data-open-lesson]'), 5);
  await b.check('the drill is listed too', `${b.T}.includes("The three that break")`, true);

  b.section('a lesson reads, then practises');
  await b.click('[data-open-lesson="jl-5"]');
  await b.check('the reading is shown first', `${b.T}.includes("The cost is in three sounds")`, true);
  await b.click('[data-practise]');
  await b.check('practice hides the reading', `${b.T}.includes("The cost is in three sounds")`, false);
  await b.check('exercises render', b.count('[data-reveal]'), (n) => n >= 3);
  /* The reading taught はっさい. If it were still on screen this would be
     copying, which is the flaw this suite found. */
  await b.check('the answer is not on screen before asking', `${b.T}.includes("はっさい")`, false);

  await b.click('[data-reveal]');
  await b.check('revealing shows the answer', `${b.T}.includes("Answer")`, true);
  await b.check('and offers a self-mark', b.count('[data-mark]'), (n) => n >= 2);

  b.section('completing a lesson records a run');
  for (let i = 0; i < 5; i++) {
    await b.evaluate('document.querySelectorAll("[data-reveal]").forEach(x => x.click())');
    await b.wait(350);
    /* :not(.btn--primary) picks the first UNMARKED exercise. Without it the
       same one is clicked five times and the lesson never completes - which
       was a bug in this suite, not in the app. */
    const more = await b.evaluate(
      '(() => { const x = document.querySelector(\'[data-mark][data-result="got"]:not(.btn--primary)\');'
      + ' if (!x) return false; x.click(); return true; })()');
    if (!more) break;
    await b.wait(350);
  }
  await b.check('the run was logged', 'window.HCApp.store.lessonStat("jl-5").count', 1);
  await b.click('[data-close-lesson]');
  await b.check('progress shows on the card', `${b.T}.includes("Done")`, true);

  b.section('step 5: ONE reminder, many lessons');
  await b.click('[data-next]');
  await b.check('asks how long', `${b.T}.includes("How long do you want to practise")`, true);
  await b.check('one reminder covers all five', b.count('[data-cover]'), 5);
  await b.check('all covered by default', b.count('[data-cover][aria-checked="true"]'), 5);
  await b.click('[data-cover="jl-3"]');
  await b.check('a lesson can be dropped', b.count('[data-cover][aria-checked="true"]'), 4);
  await b.click('[data-cover="jl-3"]');

  const before = await b.evaluate('window.HCApp.store.activeHabits().length');
  await b.click('[data-create-habits]');
  await b.check('the bridge fired', `${b.T}.includes("reminder set")`, true);
  const after = await b.evaluate('window.HCApp.store.activeHabits().length');
  await b.check('exactly ONE habit, not one per lesson', 'true', () => after - before === 1);
  await b.check('it carries its five lessons',
    'window.HCApp.store.activeHabits().filter(h => h.lessons && h.lessons.length === 5).length', 1);

  b.section('the reminder, fired from Home');
  await b.evaluate("location.hash = '#/home'");
  await b.wait(1400);
  await b.click('[data-fire-reminder]');
  await b.check('the reminder opens', b.count('.rem-sheet'), 1);
  await b.check('it lists every covered lesson', b.count('.rem-sheet [href^="#/learn/"]'), 5);
  await b.check('the practised one reports its count', `${sheet}.includes("Practised 1 time")`, true);
  await b.check('the unpractised ones say so', `${sheet}.includes("Never practised")`, true);
  await b.check('neglected lessons sort first',
    'document.querySelector(".rem-sheet li").innerText.includes("Never practised")', true);
  await b.check('the practised one sorts last',
    'Array.from(document.querySelectorAll(".rem-sheet li")).pop().innerText.includes("Practised 1 time")', true);

  b.section('opening a lesson from the reminder');
  await b.evaluate('document.querySelector(\'.rem-sheet [href^="#/learn/"]\').click()');
  await b.wait(1600);
  await b.check('a lesson opened directly', `${b.T}.includes("All lessons")`, true);

  b.section('the Library shelf');
  await b.evaluate("location.hash = '#/library'");
  await b.wait(1600);
  await b.check('the upload is shelved', `${b.T}.includes("Japanese")`, true);
  await b.check('labelled by date', `${b.T}.includes("2026-09-08")`, true);
  await b.check('labelled by topic', `${b.T}.includes("Age counter")`, true);
  await b.check('every lesson reachable from the shelf', b.count('[href^="#/learn/"]'), (n) => n >= 5);
  await b.check('the shelf shows what has been practised', `${b.T}.includes("Practised 1 time")`, true);
});
