/* ============================================================================
   HabitCrafts — scripts/corpora.mjs
   EVERY CORPUS, EVERY INTERACTION.        node scripts/corpora.mjs

   drive.mjs walks the flow once, against the pilot. That was the whole app when
   it was written. It is not now, and the gap had a cost: opening a lesson from
   the word list and pressing "All lessons" did nothing, because `stepLessons`
   read `.minutes` off an `irregularDrill` that is null whenever a deck has no
   irregular forms. The exception was thrown inside render(), which leaves the
   previous DOM standing, so a crash looked exactly like a dead button.

   WHAT THIS ASSERTS THAT drive.mjs CANNOT: the same interactions against EVERY
   registered corpus, including the ones with no grammar, no irregulars and no
   drill. A corpus is not a variation on the pilot. It is a different shape, and
   the shapes that are missing something are the ones that break views.

   It reads the registry rather than a hardcoded list, so a fifth upload is
   covered the moment it is registered and nobody has to remember to add it.
   ========================================================================= */

import { withBrowser } from './lib/browser.mjs';

await withBrowser(async (b) => {
  /* The registry, straight from the app. A list in this file would be a second
     definition of which corpora exist, and it would go stale silently. */
  const corpora = await b.evaluate(`(async () => {
    const s = await import('/js/study.js');
    return s.allSources().map((src) => {
      const c = s.corpusFor(src.id);
      return {
        id: src.id,
        title: src.title,
        /* The shelf names a source "subject · unit", not by its title: a
           filename tells you nothing months later and the title is the deck's
           own, which may be anything. Assert what is actually on screen. */
        shelfName: src.subject + ' · ' + src.unit,
        lessons: c.lessons.map((l) => ({ key: l.key, n: l.n, title: l.title,
          exercises: l.exercises.length })),
        hasDrill: !!c.irregularDrill,
        rules: c.rules.length,
      };
    });
  })()`);

  console.log(`  ${corpora.length} corpora registered\n`);

  for (const c of corpora) {
    b.section(`${c.title}  (${c.lessons.length} lessons, ${c.rules} rules,`
      + ` ${c.hasDrill ? 'a drill' : 'NO drill'})`);

    const first = c.lessons[0];
    const last = c.lessons[c.lessons.length - 1];

    /* 1. A lesson opens from a cold deep link. This is how the Library and the
          reminder both reach one, so it is the path that matters most. */
    await b.goto(`#/learn/${first.key}`);
    await b.check('deep link opens the lesson',
      `${b.T}.includes(${JSON.stringify(first.title)})`, true);
    await b.check('and offers a way back', b.count('[data-close-lesson]'), (n) => n >= 1);

    /* 2. Back to the list. The bug that started this suite: a throw inside
          render() leaves the old DOM up, so the only honest assertion is that
          the LIST is now showing, not merely that nothing errored. */
    await b.click('[data-close-lesson]');
    await b.check('All lessons returns to the list', `${b.T}.includes("Your lessons")`, true);
    await b.check('the list names every lesson',
      `${JSON.stringify(c.lessons.map((l) => l.title))}.every((t) => ${b.T}.includes(t))`, true);
    await b.check('it leaves the keyed route', 'location.hash', '#/learn');

    /* 3. The drill card appears only where there is a drill to show. */
    await b.check(`drill card ${c.hasDrill ? 'is shown' : 'is absent'}`,
      `${b.T}.includes("recurring")`, c.hasDrill);

    /* 4. The last lesson too, not just the first. Ordering bugs hide at the end. */
    await b.goto(`#/learn/${last.key}`);
    await b.check('the last lesson opens as well',
      `${b.T}.includes(${JSON.stringify(last.title)})`, true);

    /* 5. Practice: the reading goes away, the answers are not pre-revealed. */
    await b.click('[data-practise]');
    await b.check('practice shows the exercises',
      b.count('[data-reveal]'), (n) => n === last.exercises);
    await b.check('no answer is revealed before asking', b.count('[data-mark]'), 0);

    await b.click('[data-reveal]');
    await b.check('revealing offers a mark', b.count('[data-mark]'), (n) => n >= 1);

    /* 6. Reading it again puts the lesson back, which is a separate control
          from closing and was never driven outside the pilot. */
    await b.click('[data-unpractise]');
    await b.check('Read it again returns to the reading',
      `${b.T}.includes(${JSON.stringify(last.title)})`, true);

    /* 7. And out again, from the practice screen's own button. */
    await b.click('[data-practise]');
    await b.click('[data-close-lesson]');
    await b.check('closing from practice reaches the list',
      `${b.T}.includes("Your lessons")`, true);
  }

  /* 8. The Library lists every corpus and links every lesson, which is the
        surface that sends people into the routes above. */
  b.section('the shelf');
  await b.goto('#/library');
  await b.check('every source is on the shelf',
    `${JSON.stringify(corpora.map((c) => c.shelfName))}.every((t) => ${b.T}.includes(t))`, true);

  const links = await b.evaluate(
    '[...document.querySelectorAll(\'a[href^="#/learn/"]\')].map((a) => a.getAttribute("href").slice(8))');
  const keys = corpora.flatMap((c) => c.lessons.map((l) => l.key));
  await b.check(`every lesson link resolves to a real lesson (${links.length} links)`,
    `${JSON.stringify(links)}.every((k) => ${JSON.stringify(keys)}.includes(k))`, true);
  await b.check('every corpus contributes at least one link',
    `${JSON.stringify(corpora.map((c) => c.lessons[0].key))}.every((k) => ${JSON.stringify(links)}.includes(k))`,
    true);
});
