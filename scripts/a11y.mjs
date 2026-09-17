/* ============================================================================
   HabitCrafts — scripts/a11y.mjs
   DOES IT HOLD UP AT EVERY WIDTH, AND CAN EVERYONE USE IT?
                                                 node scripts/a11y.mjs

   Every screen at 390, 768 and 1280, then once more in Nightfall. Four
   invariants that nothing else in the repo asserts:

     1. The page never scrolls sideways.
     2. No interactive target is under 24px (WCAG 2.5.8).
     3. Every control has an accessible name.
     4. Nothing is rendered invisible by the dark palette.

   It is a floor, not an audit. It will not catch a clumsy layout or a bad
   contrast ratio that is still technically passing - it catches the things
   that are unambiguously broken and easy to ship by accident. The first run
   found breadcrumb buttons at 42x19, which is under the WCAG floor and far
   under this system's own --target-min of 48.

   ONLY VISIBLE ELEMENTS COUNT, and that is load-bearing rather than an
   optimisation. An earlier version did not filter for visibility when checking
   names and reported every row in the hidden Library tab as unnamed, because
   innerText is empty for anything not rendered. It was a false alarm that cost
   real time, and the fix is one getClientRects() call.
   ========================================================================= */

import { withBrowser } from './lib/browser.mjs';

/* Visible = actually laid out. Everything below shares this definition. */
const VISIBLE = 'el.getClientRects().length > 0';

const OVERFLOW = `(() => {
  const de = document.documentElement;
  const over = de.scrollWidth - de.clientWidth;
  const guilty = [];
  if (over > 1) {
    document.querySelectorAll('#main *').forEach((el) => {
      if (el.getBoundingClientRect().right > de.clientWidth + 1) {
        guilty.push(String(el.className || el.tagName).slice(0, 40));
      }
    });
  }
  return { over, guilty: guilty.slice(0, 3) };
})()`;

const SMALL_TARGETS = `(() => {
  const bad = [];
  document.querySelectorAll('#main button, #main a[href], #main input, #main [role="checkbox"], #main [role="switch"]')
    .forEach((el) => {
      if (!(${VISIBLE})) return;
      const r = el.getBoundingClientRect();
      if (r.height < 24 || r.width < 24) {
        const name = String(el.innerText || el.getAttribute('aria-label') || el.className).trim();
        bad.push(name.slice(0, 30) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      }
    });
  return bad.slice(0, 6);
})()`;

/* textContent, NOT innerText. An accessible name is computed from content;
   innerText is a rendering-dependent approximation and comes back empty
   headless for elements that are visibly fine - it reported every read row in
   the Library as unnamed while the rows measured 380x72 and carried their
   titles. The check was wrong, not the markup. */
const UNNAMED = `(() => {
  const bad = [];
  document.querySelectorAll('#main button, #main a[href]').forEach((el) => {
    if (!(${VISIBLE})) return;
    const name = (el.textContent || '').trim()
      || el.getAttribute('aria-label')
      || el.getAttribute('title');
    if (!name) bad.push(String(el.className || el.tagName).slice(0, 40));
  });
  return bad.slice(0, 6);
})()`;

/* A crude but decisive contrast check: text whose colour equals the surface it
   sits on is invisible, whatever the ratio says. Catches a token that did not
   get a Nightfall mapping, which is the realistic dark-mode failure here. */
const INVISIBLE = `(() => {
  const bad = [];
  document.querySelectorAll('#main *').forEach((el) => {
    if (!(${VISIBLE})) return;
    if (!el.innerText || !el.innerText.trim()) return;
    const cs = getComputedStyle(el);
    if (cs.color === cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      bad.push(String(el.className || el.tagName).slice(0, 40));
    }
  });
  return bad.slice(0, 4);
})()`;

/* Every screen worth checking, and how to reach it. */
const SCREENS = [
  ['upload',        '#/learn',       0],
  ['what we found', '#/learn',       1],
  ['questions',     '#/learn',       2],
  ['lessons',       '#/learn',       3],
  ['when',          '#/learn',       4],
  ['lesson',        '#/learn/jl-5',  0],
  /* The review queue. The one screen that gets opened every day, so the one
     that can least afford to overflow on a phone. */
  ['today',         '#/today',       0],
  ['home',          '#/home',        0],
  ['library',       '#/library',     0],
  ['progress',      '#/progress',    0],
];

await withBrowser(async (b) => {
  for (const w of [390, 768, 1280]) {
    b.section(`${w}px`);
    await b.width(w);
    for (const [name, hash, steps] of SCREENS) {
      await b.goto(hash, steps);

      /* THE POSITIVE CONTROL, AND THE REASON THIS FILE NEEDED ONE.
         Every other check here is an ABSENCE: no overflowing element, no small
         target, no unnamed control. An empty page satisfies all of them, and an
         independent audit proved it by pointing this suite at a server that
         returned a bare `<main></main>`: 110 of 110 green, exit 0.

         That is not a hypothetical. The header above records that a route once
         rendered an empty <main> because a backtick closed a template literal,
         and this is the suite that visits all ten routes. It was the one suite
         guaranteed not to notice.

         So each screen must first PROVE IT RENDERED. `assertAppReachable` in
         the Evercred suites is the same idea, and docs/testing in the Flutter
         repo calls it the false-green floor. */
      const alive = await b.evaluate(`(() => {
        const m = document.querySelector('#main');
        if (!m) return { text: 0, controls: 0, heading: null };
        return {
          text: m.innerText.trim().length,
          controls: m.querySelectorAll('button, a[href], input, [role="checkbox"]').length,
          heading: (m.querySelector('h1, h2') || {}).innerText || null,
        };
      })()`);
      await b.check(`${name}: rendered something to check`, 'true',
        () => {
          const ok = alive.text > 80 && alive.controls > 0;
          if (!ok) console.log(`        ${alive.text} chars, ${alive.controls} controls — `
            + 'the screen is empty, so every check below would pass vacuously');
          return ok;
        });

      const o = await b.evaluate(OVERFLOW);
      await b.check(`${name}: no sideways scroll`, 'true',
        () => { if (o.over > 1) console.log(`        ${o.over}px — ${o.guilty.join(', ')}`); return o.over <= 1; });

      const t = await b.evaluate(SMALL_TARGETS);
      await b.check(`${name}: every target ≥ 24px`, 'true',
        () => { if (t.length) console.log(`        ${t.join(' | ')}`); return t.length === 0; });

      const u = await b.evaluate(UNNAMED);
      await b.check(`${name}: every control is named`, 'true',
        () => { if (u.length) console.log(`        ${u.join(', ')}`); return u.length === 0; });
    }
  }

  /* NIGHTFALL AT 390 AS WELL AS 1280.
     The desktop pass was the only one, and the phone is the only place this
     will ever be read in the dark: on a train, in bed, at the end of the day.
     Checking dark mode exclusively at a width nobody reads it at is checking
     the wrong thing carefully. */
  for (const w of [390, 1280]) {
  b.section(`Nightfall ${w}px`);
  await b.width(w);
  for (const [name, hash, steps] of SCREENS) {
    await b.goto(hash, steps);
    await b.evaluate("document.documentElement.setAttribute('data-theme','dark')");
    await b.wait(400);
    const inv = await b.evaluate(INVISIBLE);
    await b.check(`${name}: nothing invisible in dark`, 'true',
      () => { if (inv.length) console.log(`        ${inv.join(', ')}`); return inv.length === 0; });
  }
  }
});
