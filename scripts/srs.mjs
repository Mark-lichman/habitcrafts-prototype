/* ============================================================================
   HabitCrafts — scripts/srs.mjs
   THE SCHEDULER, ON ITS OWN.              node scripts/srs.mjs

   This file exists because an independent audit pointed out that `srs.js` was
   imported by no test in the repository, and that every assertion touching it
   had the form "at least one card is due". That is precisely the property a
   BROKEN scheduler satisfies, because a broken one shows you everything.

   It was checked rather than argued about: `isDue` was replaced with
   `return true` — spacing completely inert, every card due every morning
   forever — and every suite stayed green. Nine suites, roughly four hundred
   checks, and the product's central algorithm could be deleted without one of
   them noticing.

   ---------------------------------------------------------------------------
   THE ASSERTION THAT WAS MISSING IS THE NEGATIVE ONE
   ---------------------------------------------------------------------------
   Almost everything here checks that a card is NOT due. "Something is due" is
   cheap and survives any breakage; "this card is not due for four days" is the
   claim the product actually makes. Any suite for a scheduler that cannot fail
   when spacing stops happening is decoration.

   No browser and no dependencies: srs.js is pure functions over an array, so
   this is the cheapest suite in the repo and the one covering the most risk.
   ========================================================================= */

import * as srs from '../prototype/js/srs.js';

let pass = 0;
let fail = 0;
function check(label, got, want) {
  const ok = typeof want === 'function' ? want(got) : Object.is(got, want);
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `  (got ${JSON.stringify(got)}, wanted ${typeof want === 'function' ? '(predicate)' : JSON.stringify(want)})`}`);
  ok ? pass++ : fail++;
}
const section = (t) => console.log(`\n— ${t} —`);

/* A review `n` days before `day`. Fixed dates, never `Date.now()`: a suite that
   depends on what time it is runs differently at midnight. */
const DAY = 86400000;
const TODAY = '2026-06-15';
const at = (n) => new Date(Date.parse(TODAY + 'T09:00:00Z') - n * DAY).toISOString();
const log = (...pairs) => pairs.map(([grade, daysAgo]) => ({ grade, at: at(daysAgo) }));

/* -------------------------------------------------------------------------- */

section('a card nobody has seen');
const fresh = srs.scheduleFor([]);
check('is not marked seen', fresh.seen, false);
check('has no due date', fresh.dueOn, null);
check('and IS due, or a new deck could never be started', srs.isDue(fresh, TODAY), true);

section('one right answer buys a day off');
const one = srs.scheduleFor(log(['got', 0]));
check('box 1', one.box, 1);
check('due tomorrow', one.dueOn, '2026-06-16');
check('NOT due today', srs.isDue(one, TODAY), false);
check('due tomorrow', srs.isDue(one, '2026-06-16'), true);

section('the intervals actually double');
/* The ladder is [0,1,2,4,8,16,32]. Flatten it to zeroes and the product becomes
   a flashcard app with no spacing, so each rung is asserted by the date it
   produces rather than by reading the constant back. */
const ladder = [
  [1, '2026-06-16'], [2, '2026-06-17'], [3, '2026-06-19'],
  [4, '2026-06-23'], [5, '2026-07-01'], [6, '2026-07-17'],
];
for (const [gots, due] of ladder) {
  const s = srs.scheduleFor(log(...Array.from({ length: gots }, () => ['got', 0])));
  check(`${gots} right in a row -> box ${gots}, due ${due}`, s.dueOn, due);
  check(`  and not due today`, srs.isDue(s, TODAY), false);
}

section('the top box caps');
const many = srs.scheduleFor(log(...Array.from({ length: 12 }, () => ['got', 0])));
check('box stops at TOP_BOX', many.box, srs.TOP_BOX);
check('twelve right answers is still a month, not a year', many.dueOn, '2026-07-17');

section('one miss sends it back to the start');
const lapsed = srs.scheduleFor(log(['got', 10], ['got', 8], ['got', 6], ['again', 0]));
check('box resets to 0', lapsed.box, 0);
check('the reps are not forgotten', lapsed.reps, 4);
check('and the lapse is counted', lapsed.lapses, 1);
check('due the SAME day, not tomorrow', lapsed.dueOn, TODAY);
check('so it comes back before you close the app', srs.isDue(lapsed, TODAY), true);

section('a card mid-ladder is not due early');
const midway = srs.scheduleFor(log(['got', 3], ['got', 3], ['got', 3]));
check('box 3 from three days ago is due in one more day', midway.dueOn, '2026-06-16');
check('not due today', srs.isDue(midway, TODAY), false);
check('due once the day arrives', srs.isDue(midway, '2026-06-16'), true);
check('and still due after it passes, never skipped', srs.isDue(midway, '2026-06-30'), true);

section('dates survive a month boundary');
/* addDays does UTC string arithmetic, which is where off-by-one bugs live. */
const endOfMonth = srs.scheduleFor([{ grade: 'got', at: '2026-06-29T22:00:00Z' }]);
check('29 June + 1 day', endOfMonth.dueOn, '2026-06-30');
const endOfYear = srs.scheduleFor([
  { grade: 'got', at: '2026-12-28T10:00:00Z' },
  { grade: 'got', at: '2026-12-28T10:00:00Z' },
  { grade: 'got', at: '2026-12-28T10:00:00Z' },
]);
check('28 December + 4 days crosses the year', endOfYear.dueOn, '2027-01-01');

section('identity survives re-extraction');
/* The whole argument for hashing content instead of using lessonKey:index is
   that re-extracting a deck reorders exercises. If that is not true, the
   history orphans itself every time a corpus is rebuilt. */
const ex = { prompt: 'Say: I eat', answer: 'たべます', options: [] };
const same = { ...ex };
check('the same exercise gives the same id',
  srs.cardId('src-a', ex), srs.cardId('src-a', same));
check('position is not part of it',
  srs.cardId('src-a', { ...ex, index: 7 }), srs.cardId('src-a', { ...ex, index: 0 }));
check('a different deck gives a different id',
  srs.cardId('src-b', ex) !== srs.cardId('src-a', ex), true);
check('a reworded prompt gives a different id, which is correct',
  srs.cardId('src-a', { ...ex, prompt: 'Say: I will eat' }) !== srs.cardId('src-a', ex), true);
check('a discern card hashes the option it selects, not the index',
  srs.cardId('src-a', { prompt: 'which?', answer: 1, options: ['X', 'Y'] }),
  srs.cardId('src-a', { prompt: 'which?', answer: 0, options: ['Y', 'X'] }));
check('ids are not all the same string',
  new Set(['a', 'b', 'c'].map((p) => srs.cardId('s', { prompt: p, answer: 'x', options: [] }))).size, 3);

section('the queue puts the painful cards first');
const card = (name, reviews) => ({ name, schedule: srs.scheduleFor(reviews) });
const queue = [
  card('never seen', []),
  card('missed twice', log(['again', 5], ['again', 1])),
  card('missed once', log(['again', 2])),
  card('seen long ago', log(['got', 40])),
].sort(srs.queueOrder);
check('most lapsed first', queue[0].name, 'missed twice');
check('then the other lapse', queue[1].name, 'missed once');
check('then never seen, ahead of anything passing', queue[2].name, 'never seen');
check('and the healthy card last', queue[3].name, 'seen long ago');

section('the labels a person reads');
check('never seen', srs.boxLabel(fresh), 'new');
check('just missed', srs.boxLabel(lapsed), 'again today');
check('one right answer', srs.boxLabel(one), 'daily');
check('top box', srs.boxLabel(many), 'monthly');

/* -------------------------------------------------------------------------- */

console.log(`\n${fail ? `${fail} of ${pass + fail} FAILED` : `all ${pass} checks passed`}`);
process.exit(fail ? 1 : 0);
