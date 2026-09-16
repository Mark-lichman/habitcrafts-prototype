/* ============================================================================
   HabitCrafts — scripts/shot.mjs
   PICTURES OF THE APP.    node scripts/shot.mjs [--width 420] [--dark]

   The three browser suites prove the app WORKS. None of them lets anybody LOOK
   at it, and "42 checks passed" is not a screen. This drives the same CDP
   session they do and writes PNGs instead of assertions.

   It shares `lib/browser.mjs` rather than opening its own Chrome, so a screen
   that is broken in the suites is broken in the shots the same way. A separate
   driver here would be a second definition of what "the app" is, and the first
   time the two disagreed the shots would be of something nobody ships.

   Output goes to shots/, which is gitignored: these are for looking at, not for
   keeping. A screenshot committed to a repo is stale the next afternoon.
   ========================================================================= */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowser } from './lib/browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'shots');
mkdirSync(outDir, { recursive: true });

const argv = process.argv.slice(2);
const at = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : fallback;
};
const width = Number(at('--width', 1100));
const dark = argv.includes('--dark');

/* Each entry is a screen worth looking at, not every screen there is. `after`
   runs before the shot, for the ones that need a click to become interesting. */
const SCREENS = [
  { name: 'library', hash: '#/library', note: 'the shelf: every upload that produced a practice' },
  /* Deep links, which is how the Library and the reminder both open a lesson.
     Stepping through the flow instead would only ever reach the pilot's
     lessons: step 4 lists the corpus the flow is pointed at, and it starts
     pointed at the pilot. The deep link is what switches it. */
  { name: 'lesson-ja3', hash: '#/learn/ja3-lesson-1-koko-soko-asoko',
    note: 'a lesson from the 第3課 deck' },
  { name: 'lesson-verbs', hash: '#/learn/verbs-group1-basics',
    note: 'a lesson from the verb-group deck' },
  { name: 'lesson-ja6', hash: '#/learn/ja6-verbs-daily',
    note: 'a lesson from the word list, which affords no grammar at all' },
  { name: 'lessons-ja6', hash: '#/learn/ja6-verbs-daily', click: '[data-close-lesson]',
    note: 'the list you reach with All lessons, which used to throw on a corpus with no drill' },
  { name: 'practice-ja3', hash: '#/learn/ja3-lesson-1-koko-soko-asoko', click: '[data-practise]',
    note: 'the drills, with the reading hidden so it is retrieval and not copying' },
  { name: 'home', hash: '#/home', note: 'habits, including the ones a practice created' },
];

await withBrowser(async (b) => {
  await b.width(width, 1400);
  if (dark) {
    await b.evaluate("document.documentElement.setAttribute('data-theme','dark')");
  }

  for (const s of SCREENS) {
    await b.goto(s.hash, s.steps || 0);
    for (const sel of s.clicks || (s.click ? [s.click] : [])) await b.click(sel);
    if (dark) await b.evaluate("document.documentElement.setAttribute('data-theme','dark')");
    await b.wait(400);

    /* Full page, not just the viewport: a shelf of four sources is taller than
       a laptop and the interesting part is the bottom of it. */
    const shot = await b.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    });
    const file = resolve(outDir, `${s.name}${dark ? '-dark' : ''}-${width}.png`);
    writeFileSync(file, Buffer.from(shot.result.data, 'base64'));

    const heading = await b.evaluate(
      'document.querySelector("#main h1, #main h2")?.innerText || "(no heading)"');
    console.log(`  ${file.replace(root + '\\', '')}  —  ${heading}`);
    await b.check(`${s.name} rendered something`, `${b.T}.length > 40`, true);
  }
}, { bootMs: 2000 });
