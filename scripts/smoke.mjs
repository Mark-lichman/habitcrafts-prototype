/* ============================================================================
   HabitCrafts prototype — scripts/smoke.mjs
   RUN THE DATA LAYER UNDER NODE.        node scripts/smoke.mjs

   Not a test suite. A smoke test, with one job: the rules that the business
   experiments actually depend on are asserted by something other than a
   comment. Every check here maps to a line in a GitHub issue.

     · PTR is DERIVED and never stored                                    [#9]
     · a practice with no mature cohort reports null, not zero             [#9]
     · the guiding prompt demonstrably changes the output                  [#5]
     · each output toggle really removes its output                        [#5]
     · every generated card is traceable to a page and a passage       [#8][#5]
     · nothing publishes unreviewed                                    [#2][#5]
     · a join code is unique                                               [#5]
     · the bridge records its practice and lesson                          [#9]
     · the paywall is on conversion and never on the check-in              [#4]

   WHY IT CAN RUN AT ALL. store.js talks to a persistence ADAPTER rather than
   to sessionStorage, and `render()` is a pure function of the store, so the
   whole data layer is reachable from Node behind four small browser shims. If
   a future change makes this file impossible to run, that is the signal that
   the seam this prototype's production path depends on has been breached.

   It has no dependencies and no framework, same as everything else here.
   ========================================================================= */

import path from 'node:path';
import { pathToFileURL } from 'node:url';

/* --------------------------------------------------------------------------
   THE SHIMS — deliberately the smallest set that works. Four. If this list
   starts growing, the data layer is reaching into the DOM and should not be.
-------------------------------------------------------------------------- */

const mem = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, v),
  removeItem: (k) => mem.delete(k),
};
globalThis.window = { HC: null, location: { hash: '', search: '' } };
globalThis.document = {
  documentElement: { setAttribute() {}, getAttribute: () => null },
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
};

const JS = pathToFileURL(path.resolve('prototype/js') + path.sep).href;
const store = await import(JS + 'store.js');
const { convert, SAMPLE_UPLOADS } = await import(JS + 'data-practices.js');

let fails = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + msg);
  if (!cond) fails++;
};
const group = (name) => console.log('\n' + name);

/* ------------------------------------------------------------------------ */

group('— the seed —');
ok(store.state.practices.length === 2, `two seeded practices (${store.state.practices.length})`);
ok(store.state.sources.length === 2, `two seeded sources (${store.state.sources.length})`);
ok(store.state.enrolments.length > 200, `a cohort worth charting (${store.state.enrolments.length})`);

group('— PTR is derived, and never stored [#9] —');
for (const p of store.publishedPractices()) {
  const s = store.studioStats(p.id);
  ok(s.ptr.pct !== null && s.ptr.pct >= 0 && s.ptr.pct <= 100,
     `${p.code}: ptr ${s.ptr.pct}% (${s.ptr.kept}/${s.ptr.of} mature of ${s.enrolled} enrolled)`);
  ok(s.ptr.kept <= s.habits, `${p.code}: kept ≤ habits created`);
  ok(s.ptr.of <= s.enrolled, `${p.code}: mature ≤ enrolled`);
  const series = store.ptrSeries(p.id);
  ok(series.length === 6, `${p.code}: six chart buckets`);
  ok(series.some((r) => r.pct === null), `${p.code}: recent weeks are a gap, not a zero`);
  console.log('        ' + series.map((r) => (r.pct == null ? '–' : r.pct + '%')).join('  '));
}
ok(!('ptr' in store.state.practices[0]), 'no stored ptr field — history is the only fact');

group('— the guiding prompt changes the output [#5] —');
const src = store.state.sources[0];
const all3 = { lessons: true, checks: true, habits: true };
const plain = convert(src, all3, '');
const angled = convert(src, all3, 'for a team lead, mornings');
const short = convert(src, all3, 'keep it short, one week');
ok(plain[0].lessons[0].angle === null, 'no prompt → no angle');
ok(!!angled[0].lessons[0].angle, `prompt → angle: "${angled[0].lessons[0].angle}"`);
ok(angled[0].lessons[0].habitSuggestion.prompt !== plain[0].lessons[0].habitSuggestion.prompt,
   'a morning prompt rewrites the suggested cue');
ok(short.length === 1 && plain.length === 2, `"one week" trims ${plain.length} weeks to ${short.length}`);

group('— each toggle really removes its output [#5] —');
ok(convert(src, { lessons: false, checks: true, habits: true }, '')[0].lessons[0].body.length === 0,
   'Lessons off → no body');
ok(convert(src, { lessons: true, checks: false, habits: true }, '')[0].lessons[0].checks.length === 0,
   'Recall checks off → no checks');
ok(convert(src, { lessons: true, checks: true, habits: false }, '')[0].lessons[0].habitSuggestion === null,
   'Habits off → no suggestion');

group('— every generated card is traceable [#8] —');
const cards = plain.flatMap((w) => w.lessons);
ok(cards.every((l) => l.sourceRef && l.sourceRef.page && l.sourceRef.quote),
   `all ${cards.length} lessons carry a chapter, a page and a passage`);
ok(cards.every((l) => l.checks.every((c) => c.sourceRef && c.sourceRef.page)),
   'every recall check carries its own source ref');

group('— nothing publishes unreviewed [#2] [#5] —');
const s2 = store.addSource(Object.assign({}, SAMPLE_UPLOADS[0], { rightsConfirmed: true }));
const draft = store.bindSource(s2.id, Object.assign({ prompt: '' }, all3));
ok(draft.status === 'draft', 'a freshly bound practice is a draft');
ok(store.publishPractice(draft.id) === null, 'publish is refused while any week is unread');
store.reviewWeek(draft.id, 1);
ok(!store.readyToPublish(draft), 'still refused with one of two weeks read');
store.reviewWeek(draft.id, 2);
const pub = store.publishPractice(draft.id, { plan: 'companion' });
ok(pub && pub.status === 'published', 'published once every week has been opened');

group('— a join code is unique [#5] —');
ok(pub.code && pub.code !== store.state.practices[0].code,
   `collision avoided: ${store.state.practices[0].code} vs ${pub.code}`);
ok(store.practiceByCode(pub.code) === pub, 'the new practice is the one its code resolves to');

group('— the bridge records where it came from [#9] —');
store.joinPractice(pub.id);
ok(store.ptrOf(pub.id).pct === null, 'published today → no mature cohort → null, not 0%');
const lesson = store.practiceLessons(pub)[0];
const h = store.createHabitFromLesson(pub.id, lesson.id, { behavior: 'Test behaviour' });
ok(h.fromPractice === pub.id && h.fromLesson === lesson.id, 'the habit records practice and lesson');
ok(store.state.enrolments.some((e) => e.mine && e.practiceId === pub.id && e.habitCreated),
   'my enrolment records the crossing');

group('— the wall is on conversion, never on the ring [#4] —');
ok(store.needsPlusToBind() === true, 'a second source needs Plus');
const before = store.streakOf(store.state.habits[0]);
store.checkIn(store.state.habits[0].id);
ok(store.streakOf(store.state.habits[0]) >= before, 'check-in works with Plus off — it never consults the wall');
store.startPlus();
ok(store.needsPlusToBind() === false, 'Plus clears the conversion wall');

group('— regenerating one card [#5] —');
const wasAngle = store.practiceLessons(pub)[0].angle;
store.regenerateLesson(pub.id, lesson.id, 'for a team lead');
const now = store.practiceLessons(pub)[0];
ok(now.angle && now.angle !== wasAngle, `a card-level prompt changes that card (${wasAngle} → ${now.angle})`);
ok(now.edited === true, 'and marks it edited, so the author can see what moved');

console.log('\n' + (fails ? `${fails} FAILURE(S)` : 'all checks passed') + '\n');
process.exit(fails ? 1 : 0);
