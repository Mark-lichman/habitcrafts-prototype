/* ============================================================================
   HabitCrafts — data.js
   THE FIXTURE DATA MODEL. One source, every screen.

   This file replaces the inline fixture markup the ten static screens used to
   carry. It is plain data plus the two pure helpers that generate history, and
   it has NO dependencies — not on the store, not on the DOM, not on HC.

   [README §11] Prototype scope: fixture data, in-session state, no backend, no
   validation, no error handling. Category / lesson / idea / group strings are
   INVENTED, exactly as they were in the static screens — the app has no seed
   file and every one of those is Firestore content. The *shape* is real: each
   habit carries the four fields the `habits` collection actually stores
   (behavior · prompt · celebration · why).

   ------------------------------------------------------------------------
   WHY STREAKS ARE NOT STORED
   ------------------------------------------------------------------------
   `streak` is DERIVED from `history`, never written down. If it were a stored
   number, checking a habit in would have to update two things that could then
   disagree — which is exactly how the static screens drifted. History is the
   only fact; store.js §selectors computes streak, best streak and gild tier
   from it. That also means a check-in raises the streak for free, and an undo
   lowers it again, with nothing to keep in sync.

   Histories are GENERATED at module load from a small seed (`seed.streak`,
   `seed.density`, `seed.span`) by a deterministic LCG — the same arrays every
   reload, no 400 hand-typed date strings, and enough depth for Progress to
   draw a real calendar and a real chart.
   ========================================================================= */

/* --------------------------------------------------------------------------
   1. DATES — the whole app agrees on "today" through these three helpers.
   Local midnight, ISO 'YYYY-MM-DD' keys. Never `new Date().toISOString()`:
   that is UTC and puts the evening of the 13th on the 14th.
-------------------------------------------------------------------------- */

export function iso(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

/** Local midnight today. */
export function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** `n` days before `from` (negative n goes forward). */
export function daysAgo(n, from) {
  const d = new Date(from || today());
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTH = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** "Thursday, 13 August" — the greeting date line. */
export function longDate(d) {
  return WEEKDAY[d.getDay()] + ', ' + d.getDate() + ' ' + MONTH[d.getMonth()];
}

/* --------------------------------------------------------------------------
   2. HISTORY GENERATION
   A 32-bit LCG seeded off the habit id, so the fixture is byte-identical on
   every reload and every machine. `Math.random()` here would mean the calendar
   redrew itself each refresh and no two screenshots would ever match.
-------------------------------------------------------------------------- */

function lcg(seedStr) {
  let s = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    s ^= seedStr.charCodeAt(i);
    s = Math.imul(s, 16777619);
  }
  return function next() {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Build a habit's completion history.
 *
 *   seed.streak   how many consecutive SCHEDULED days, ending YESTERDAY, are
 *                 complete. Today is deliberately left open — the reviewer's
 *                 first check-in is the demo.
 *   seed.density  0..1 chance a scheduled day before the streak was completed.
 *   seed.span     total days of history to generate.
 *   days          the schedule, as weekday numbers (0 = Sunday).
 *
 * The day immediately before the streak begins is always left EMPTY, so the
 * streak has a real boundary rather than melting into the noise behind it.
 * Missed days are simply absent — there is no "missed" record anywhere in this
 * data model, because the product never draws one. [D §7]
 */
function buildHistory(id, seed, days) {
  const rand = lcg(id);
  const out = [];
  const start = daysAgo(1);              /* yesterday — today stays open */
  let streakLeft = seed.streak;
  let boundaryDone = false;

  for (let i = 0; i < seed.span; i++) {
    const d = daysAgo(i, start);
    if (!days.includes(d.getDay())) continue;   /* not scheduled — not a gap */

    if (streakLeft > 0) {
      out.push(iso(d));
      streakLeft--;
      continue;
    }
    if (!boundaryDone) { boundaryDone = true; continue; }  /* the clean break */
    if (rand() < seed.density) out.push(iso(d));
  }
  return out;
}

/* --------------------------------------------------------------------------
   3. THE USER
-------------------------------------------------------------------------- */

export const user = {
  id: 'u-mark',
  name: 'Mark',
  initial: 'M',
  email: 'mark@example.com',
  memberSince: 2024,
  quickCheckIn: false,   /* the "Quick check-in (single tap)" a11y setting [D §2.1] */
};

/* --------------------------------------------------------------------------
   4. HABITS
   EVERY DAY = the whole week. A habit is only "due today" if today's weekday
   is in `days`, which is what makes todayHabits() a real filter rather than
   decoration — "Ten push-ups" is weekend-only and genuinely disappears from
   Home on a Tuesday.

   The five daily habits reproduce home.html's gild ladder exactly (365 · 100 ·
   30 · 7 · none), because that ladder is the point of the screen.
-------------------------------------------------------------------------- */

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKEND = [0, 6];

const HABIT_SEEDS = [
  {
    id: 'h-water',
    behavior: 'A glass of water when I wake up',
    prompt: 'After my alarm goes off',
    celebration: 'Say thank you to yourself.',
    why: 'I want to start the day already having kept a promise to myself.',
    days: EVERY_DAY, time: '06:30', category: 'health',
    seed: { streak: 402, density: 0.9, span: 520 },
  },
  {
    id: 'h-meditate',
    behavior: 'Meditate for two minutes',
    prompt: 'After I pour my morning coffee',
    celebration: 'Fist pump!',
    why: 'Two minutes of quiet before anyone needs anything from me.',
    days: EVERY_DAY, time: '07:15', category: 'mind',
    seed: { streak: 112, density: 0.78, span: 300 },
  },
  {
    id: 'h-read',
    behavior: 'Read one page',
    prompt: 'After I get into bed',
    celebration: "Say out loud: that's who I am now.",
    why: 'I miss reading, and one page is a page more than none.',
    days: EVERY_DAY, time: '22:00', category: 'mind',
    seed: { streak: 34, density: 0.62, span: 200 },
  },
  {
    id: 'h-walk',
    behavior: 'Walk around the block',
    prompt: 'After I close my laptop',
    celebration: 'Stretch and smile.',
    why: 'A hard stop between work and the evening.',
    days: EVERY_DAY, time: '17:30', category: 'movement',
    seed: { streak: 9, density: 0.55, span: 160 },
  },
  {
    id: 'h-floss',
    behavior: 'Floss one tooth',
    prompt: 'After I brush my teeth',
    celebration: 'Nice.',
    why: 'One tooth is impossible to talk myself out of.',
    days: EVERY_DAY, time: '22:30', category: 'health',
    seed: { streak: 3, density: 0.3, span: 90 },
  },
  {
    /* Weekend-only. Proves the schedule filter is real: on a weekday this habit
       is not on Home at all, and its streak counts SCHEDULED days, not calendar
       days — 20 Saturdays and Sundays, not 20 days. */
    id: 'h-pushups',
    behavior: 'Ten push-ups',
    prompt: 'After I put the kettle on',
    celebration: 'Say: still got it.',
    why: 'Something for the body on the days there is time for it.',
    days: WEEKEND, time: '09:00', category: 'movement',
    seed: { streak: 20, density: 0.7, span: 260 },
  },
];

export const habits = HABIT_SEEDS.map((h) => ({
  id: h.id,
  behavior: h.behavior,
  prompt: h.prompt,
  celebration: h.celebration,
  why: h.why,
  days: h.days,
  time: h.time,
  category: h.category,
  archived: false,
  history: buildHistory(h.id, h.seed, h.days),
}));

/* --------------------------------------------------------------------------
   5. COMMUNITY
   Members are people, not rows: `checkedInToday` is what makes the group list
   about momentum rather than messaging. [D §3.3]
-------------------------------------------------------------------------- */

export const people = {
  'u-mark': { id: 'u-mark', name: 'Mark', initial: 'M' },
  'p-aisha': { id: 'p-aisha', name: 'Aisha', initial: 'A' },
  'p-jonah': { id: 'p-jonah', name: 'Jonah', initial: 'J' },
  'p-priya': { id: 'p-priya', name: 'Priya', initial: 'P' },
  'p-dan': { id: 'p-dan', name: 'Dan', initial: 'D' },
  'p-rae': { id: 'p-rae', name: 'Rae', initial: 'R' },
  'p-sam': { id: 'p-sam', name: 'Sam', initial: 'S' },
  'p-noor': { id: 'p-noor', name: 'Noor', initial: 'N' },
};

/** Minutes ago → an ISO datetime, so message times stay relative to the visit. */
function minsAgo(m) {
  return new Date(Date.now() - m * 60000).toISOString();
}

export const groups = [
  {
    id: 'g-movers',
    name: 'Morning Movers',
    blurb: 'Anything that gets you moving before the day starts.',
    members: ['u-mark', 'p-aisha', 'p-jonah', 'p-priya', 'p-dan', 'p-rae'],
    checkedInToday: ['p-aisha', 'p-jonah', 'p-priya', 'p-dan', 'p-rae'],
    activity: [
      { who: 'p-aisha', what: 'walked before work' },
      { who: 'p-jonah', what: 'read one page' },
      { who: 'p-priya', what: 'hit 30 days' },
      { who: 'p-dan', what: 'meditated' },
      { who: 'p-rae', what: 'flossed one tooth' },
    ],
    messages: [
      { id: 'm1', who: 'p-priya', text: 'Thirty days this morning. It genuinely did not feel like a decision today.', at: minsAgo(184) },
      { id: 'm2', who: 'p-dan', text: 'That is the bit nobody tells you about. Congratulations.', at: minsAgo(151) },
      { id: 'm3', who: 'p-aisha', text: 'Raining here so the walk became laps of the hallway. Still counts.', at: minsAgo(46) },
      { id: 'm4', who: 'u-mark', text: 'It absolutely counts.', at: minsAgo(41) },
    ],
  },
  {
    id: 'g-pages',
    name: 'Quiet Pages',
    blurb: 'One page a night. That is the entire rule.',
    members: ['u-mark', 'p-jonah', 'p-noor', 'p-sam'],
    checkedInToday: ['p-jonah', 'p-noor'],
    activity: [
      { who: 'p-noor', what: 'read one page' },
      { who: 'p-jonah', what: 'read one page' },
    ],
    messages: [
      { id: 'm5', who: 'p-noor', text: 'Finished the book I started in March. One page at a time actually works.', at: minsAgo(1400) },
      { id: 'm6', who: 'p-sam', text: 'What is next on the pile?', at: minsAgo(1290) },
    ],
  },
  {
    id: 'g-two-minute',
    name: 'The Two-Minute Club',
    blurb: 'If it takes longer than two minutes, make it smaller.',
    members: ['u-mark', 'p-rae', 'p-sam', 'p-priya', 'p-dan'],
    checkedInToday: ['p-rae', 'p-sam', 'p-priya'],
    activity: [
      { who: 'p-rae', what: 'meditated for two minutes' },
      { who: 'p-sam', what: 'tidied one surface' },
      { who: 'p-priya', what: 'stretched' },
    ],
    messages: [
      { id: 'm7', who: 'p-sam', text: 'Made mine smaller again this week. One surface, not one room.', at: minsAgo(620) },
    ],
  },
];

/** Pending invitations — a queue pinned above the list, not a tab. [D §3.3] */
export const invitations = [
  { id: 'inv-1', group: 'Evening Wind-Down', from: 'p-noor', members: 12 },
  { id: 'inv-2', group: 'Couch to 5k, slowly', from: 'p-sam', members: 34 },
];

/* --------------------------------------------------------------------------
   6. LIBRARY
   Ordered lessons grouped into weeks. `todaysLessonId` is the one Home's
   dismissible tile and the Library hero both point at — one lesson, two
   surfaces, no chance of them disagreeing.
-------------------------------------------------------------------------- */

export const todaysLessonId = 'l-4';

export const lessons = [
  {
    id: 'l-1', week: 1, n: 1, title: 'Start absurdly small',
    minutes: 3, read: true, type: 'doc',
    standfirst: 'The size of the habit is the whole game. Everything else is detail.',
    body: [
      'The habit you can do on your worst day is the only habit you actually have. Everything above that line is a habit you have on good days, which is another way of saying you do not have it yet.',
      'So pick the version that survives the flu, the deadline and the argument. One page. One tooth. Two minutes. It should feel almost silly — that feeling is the signal you have got it right, not a sign you should aim higher.',
      'You are not training the behaviour. You are training the showing up.',
    ],
  },
  {
    id: 'l-2', week: 1, n: 2, title: 'Anchor it to something you already do',
    minutes: 4, read: true, type: 'doc',
    standfirst: 'A prompt you have to remember is a prompt that will fail.',
    body: [
      'Every habit needs a moment that starts it. If that moment is "sometime today", the habit is competing with your entire day for attention, and it will lose.',
      'The reliable prompts are the things you already do without deciding to: pouring the coffee, closing the laptop, getting into bed. Put the new habit immediately after one of them and the old behaviour does the remembering for you.',
      'This is why the app asks "When will you do the behavior?" before it asks anything about goals.',
    ],
  },
  {
    id: 'l-3', week: 1, n: 3, title: 'Celebrate immediately',
    minutes: 3, read: true, type: 'doc',
    standfirst: 'The reward has to land while the behaviour is still warm.',
    body: [
      'A reward you collect at the end of the month teaches you nothing. The wiring happens in the seconds after the behaviour, which is why the celebration has to be something you can do on the spot.',
      'It can be tiny and it can be daft. A fist pump. Saying "nice" out loud. That is the entire mechanism.',
      'The app asks you for yours when you create the habit, and hands it back to you every time you check in.',
    ],
  },
  {
    id: 'l-4', week: 2, n: 4, title: 'Make it so small it feels almost silly',
    minutes: 4, read: false, type: 'doc',
    standfirst: "If you are negotiating with yourself about whether to do it, it is still too big.",
    body: [
      'A week or two in, there is a temptation to raise the bar. You have done two minutes every day, so why not ten? Because the two minutes were never the point.',
      'Raising the bar reintroduces the negotiation. Once a habit is something you decide about, it is back in the queue with everything else you are deciding about, and the queue is where habits go to die.',
      'Keep the floor exactly where it is and let the ceiling look after itself. Some days you will do ten minutes. The habit is still two.',
      'Keep it small, you can always do more.',
    ],
  },
  {
    id: 'l-5', week: 2, n: 5, title: 'Missing a day is data, not failure',
    minutes: 4, read: false, type: 'doc',
    standfirst: 'The question is never why you failed. It is what the prompt was missing.',
    body: [
      'You showed up for however many days you showed up for. That happened, and a gap does not un-happen it.',
      'When a day goes missing, look at the prompt rather than at yourself. Was the anchor there? Did the day route around it? Habits break at the prompt far more often than they break at the will.',
      'Then do the small version tomorrow. That is the whole repair.',
    ],
  },
  {
    id: 'l-6', week: 2, n: 6, title: 'Let the habit change shape',
    minutes: 5, read: false, type: 'doc',
    standfirst: 'The behaviour that fits your life in March may not fit it in October.',
    body: [
      'A habit that cannot be edited is a habit that will eventually be abandoned instead. If the anchor moves, move the habit with it.',
      'Editing is not restarting. The streak is a record of what you did, not a contract you are in breach of.',
    ],
  },
];

export const resources = [
  { id: 'r-1', title: 'The one-page habit plan', type: 'worksheet', meta: 'PDF · 1 page' },
  { id: 'r-2', title: 'Anchors that actually hold', type: 'doc', meta: 'Article · 6 min' },
  { id: 'r-3', title: 'Designing a two-minute version', type: 'play', meta: 'Video · 9 min' },
];

/* --------------------------------------------------------------------------
   7. EXPLORE
   Every idea carries the four fields the habits collection stores, so
   "use this idea" is a straight copy into createHabit(). [README §7]
-------------------------------------------------------------------------- */

export const categories = [
  { id: 'c-health', name: 'Health', subs: ['Hydration', 'Sleep', 'Teeth'] },
  { id: 'c-movement', name: 'Movement', subs: ['Walking', 'Strength', 'Stretching'] },
  { id: 'c-mind', name: 'Mind', subs: ['Stillness', 'Reading', 'Writing'] },
  { id: 'c-home', name: 'Home & work', subs: ['Tidying', 'Focus', 'Money'] },
];

export const ideas = [
  { id: 'i-1', cat: 'c-health', sub: 'Hydration', behavior: 'A glass of water when I wake up', prompt: 'After my alarm goes off', celebration: 'Say thank you to yourself.', why: 'Start the day already having kept a promise.', taken: true },
  { id: 'i-2', cat: 'c-health', sub: 'Teeth', behavior: 'Floss one tooth', prompt: 'After I brush my teeth', celebration: 'Nice.', why: 'One tooth is impossible to argue with.', taken: true },
  { id: 'i-3', cat: 'c-health', sub: 'Sleep', behavior: 'Put my phone on the shelf', prompt: 'After I turn off the kitchen light', celebration: 'Take one slow breath.', why: 'The phone is the reason I am still awake.' },
  { id: 'i-4', cat: 'c-movement', sub: 'Walking', behavior: 'Walk around the block', prompt: 'After I close my laptop', celebration: 'Stretch and smile.', why: 'A hard stop between work and the evening.', taken: true },
  { id: 'i-5', cat: 'c-movement', sub: 'Strength', behavior: 'Ten push-ups', prompt: 'After I put the kettle on', celebration: 'Say: still got it.', why: 'Something for the body while the water boils.', taken: true },
  { id: 'i-6', cat: 'c-movement', sub: 'Stretching', behavior: 'Touch my toes once', prompt: 'After I get out of the shower', celebration: 'Roll my shoulders back.', why: 'I sit down for a living.' },
  { id: 'i-7', cat: 'c-mind', sub: 'Stillness', behavior: 'Meditate for two minutes', prompt: 'After I pour my morning coffee', celebration: 'Fist pump!', why: 'Two minutes before anyone needs anything.', taken: true },
  { id: 'i-8', cat: 'c-mind', sub: 'Reading', behavior: 'Read one page', prompt: 'After I get into bed', celebration: "Say out loud: that's who I am now.", why: 'One page is a page more than none.', taken: true },
  { id: 'i-9', cat: 'c-mind', sub: 'Writing', behavior: 'Write one sentence', prompt: 'After I sit down at my desk', celebration: 'Read it back once.', why: 'The blank page is the only hard part.' },
  { id: 'i-10', cat: 'c-home', sub: 'Tidying', behavior: 'Clear one surface', prompt: 'After I finish dinner', celebration: 'Stand back and look at it.', why: 'One clear surface changes a whole room.' },
  { id: 'i-11', cat: 'c-home', sub: 'Focus', behavior: 'Write down the one thing', prompt: 'After I open my laptop', celebration: 'Underline it.', why: 'Otherwise the day picks for me.' },
  { id: 'i-12', cat: 'c-home', sub: 'Money', behavior: 'Check one balance', prompt: 'After I make my coffee on Sunday', celebration: 'Close the app straight away.', why: 'Not looking is what makes it frightening.' },
];

/* --------------------------------------------------------------------------
   8. ONBOARDING — three slides. [D §7, rewrite note 1]
-------------------------------------------------------------------------- */

export const onboarding = [
  {
    id: 'ob-1', title: 'Craft one small habit',
    body: 'Pick something so small it feels almost silly. That is the version that survives a bad week — and a bad week is the only real test.',
  },
  {
    id: 'ob-2', title: 'Do it with other people',
    body: 'Join a group and you will see who else showed up today. Not a leaderboard — just the quiet proof that you are not doing this on your own.',
  },
  {
    id: 'ob-3', title: 'Watch it turn gold',
    body: 'Keep a habit for seven days and it earns a mark. Keep it for a year and it earns a seal. The marks are yours to keep, whatever happens next.',
  },
];

/** Milestone ladder. Day 50 is deliberately cut. [D §4.5] */
export const MILESTONES = [7, 30, 100, 365];
