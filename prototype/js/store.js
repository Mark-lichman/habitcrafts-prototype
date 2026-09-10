/* ============================================================================
   HabitCrafts — store.js
   IN-MEMORY STATE + DERIVED SELECTORS.

   Small on purpose. This is a prototype, not an app framework: one object, one
   subscriber list, a handful of mutations, and pure selectors that compute
   everything else. There is no reducer, no immutability discipline and no
   middleware, because none of those would pay for themselves at this size.

   THE ONE RULE: mutate through a mutation, never by hand. Every mutation ends
   with `commit()`, which persists to sessionStorage and notifies subscribers.
   If you write `store.state.habits.push(...)` from a view, no screen updates
   and the reload loses it.

   ------------------------------------------------------------------------
   PERSISTENCE
   ------------------------------------------------------------------------
   sessionStorage, key `hc:proto:v1`, whole-state JSON. sessionStorage rather
   than localStorage on purpose: a prototype that remembers yesterday's demo
   is a prototype nobody can hand to the next reviewer. Close the tab and it is
   the seed data again. Theme and motion are the exception — HC owns those and
   keeps them in localStorage, because a reviewer sets dark mode once.

   Bump STORAGE_KEY's version if you change the state shape; a stale blob from
   an older shape is dropped rather than migrated.

   ------------------------------------------------------------------------
   NOTIFY PAYLOAD — read this before writing a view
   ------------------------------------------------------------------------
   Subscribers are called `fn(state, event)` where event is
   `{ type, id, origin }`.

   `origin` is the important one. When the check-in comes from the DOM — the
   user pressing and holding a ring — prototype.js has ALREADY animated the
   card, drawn the checkmark, run the flecks, unfurled the echo and reordered
   the list. If the Home view then re-rendered, it would throw all of that away
   mid-flight and the signature moment would become a flicker. So DOM-originated
   events carry `origin: 'dom'`, and the view that owns that DOM skips its
   re-render. Every OTHER view re-renders normally, which is exactly right:
   Progress genuinely does need to redraw when a habit is checked in on Home.

   See views/home.js for the canonical handling of this.
   ========================================================================= */

import * as data from './data.js';
import { iso, today, daysAgo } from './data.js';
import { fixtureAdapter } from './persistence.js';
import { convert } from './data-practices.js';

/* --------------------------------------------------------------------------
   1. SEED + HYDRATE

   WHERE THE DATA COMES FROM IS NOT THIS FILE'S BUSINESS. It asks an adapter
   (see persistence.js) for a seed and for whatever was saved, and hands it
   back on every commit. Swapping fixtures for a real backend is
   `store.configure(myAdapter)` at boot and nothing else — which is the single
   change that lets this prototype become the production front end rather than
   a thing production is written from.
-------------------------------------------------------------------------- */

let adapter = fixtureAdapter;

function hydrate() {
  const fresh = adapter.seed();
  const saved = adapter.load();
  /* Shallow merge: saved keys win, missing keys fall back to the seed, so a
     state shape gaining a key does not need a migration. */
  return saved ? Object.assign(fresh, saved) : fresh;
}

export const state = hydrate();

/**
 * Install a different persistence adapter and re-hydrate from it.
 * Call this BEFORE `router.start()` — a view that has already rendered is
 * holding references into the old state object.
 *
 *     store.configure(firestoreAdapter({ uid }))   // js/adapters/firestore.js
 */
export function configure(next) {
  adapter = next || fixtureAdapter;
  const fresh = hydrate();
  Object.keys(state).forEach((k) => { delete state[k]; });
  Object.assign(state, fresh);
  memo.clear();
  /* A backend that pushes changes feeds them in here. Fixtures never do. */
  if (adapter.watch) {
    adapter.watch((patch) => {
      Object.assign(state, patch);
      commit({ type: 'remote', origin: 'remote' });
    });
  }
  commit({ type: 'configure' });
}

/* --------------------------------------------------------------------------
   2. SUBSCRIBE / NOTIFY / PERSIST
-------------------------------------------------------------------------- */

const subscribers = new Set();

/** subscribe(fn) → unsubscribe(). Views MUST call the returned function in
    their `destroy()` or they leak and re-render after being unmounted. */
export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function persist() {
  adapter.save(state);
}

function commit(event) {
  memo.clear();
  persist();
  subscribers.forEach((fn) => fn(state, event || { type: 'change' }));
}

/* --------------------------------------------------------------------------
   3. MUTATIONS
   Every one is small, obvious, and does no validation — that is deliberate
   prototype scope. [README §11]
-------------------------------------------------------------------------- */

export function habitById(id) {
  return state.habits.find((h) => h.id === id) || null;
}

/**
 * Complete a habit for a date (default today).
 * Returns the milestone the streak just crossed (7 / 30 / 100 / 365) or null,
 * so the caller can decide whether to fire the moment. The store does NOT fire
 * it itself — firing is a view concern and depends on once-per-session rules.
 */
export function checkIn(id, opts = {}) {
  const h = habitById(id);
  if (!h) return null;
  const key = iso(opts.date || today());
  if (!h.history.includes(key)) h.history.push(key);

  /* Invalidate BEFORE reading the streak back. The selectors are memoised per
     commit, and commit() has not run yet — without this, streakOf() returns the
     value it cached before today was added and the milestone fires one day
     early (or not at all). Any code that reads a selector between a mutation
     and its commit must do the same. */
  memo.clear();

  const days = streakOf(h);
  commit({ type: 'checkin', id, origin: opts.origin || 'app' });
  return data.MILESTONES.includes(days) ? days : null;
}

export function undoCheckIn(id, opts = {}) {
  const h = habitById(id);
  if (!h) return;
  const key = iso(opts.date || today());
  h.history = h.history.filter((d) => d !== key);
  memo.clear();
  commit({ type: 'undo', id, origin: opts.origin || 'app' });
}

/**
 * fields: { behavior, prompt, celebration, why, days, time, category }
 * Only `behavior` is really required; the rest fall back to sane blanks,
 * because the prototype does no validation.
 */
export function createHabit(fields = {}) {
  const h = {
    id: 'h-' + Math.random().toString(36).slice(2, 9),
    behavior: fields.behavior || 'New habit',
    prompt: fields.prompt || '',
    celebration: fields.celebration || 'Nice.',
    why: fields.why || '',
    days: fields.days && fields.days.length ? fields.days : [0, 1, 2, 3, 4, 5, 6],
    time: fields.time || '',
    category: fields.category || 'c-health',
    archived: false,
    history: [],
    /* A habit made from a source carries what it covers, so the reminder can
       offer a lesson instead of only a sentence, and the Library can show what
       a source actually produced. Empty for a hand-made habit. */
    lessons: fields.lessons || [],
    sourceId: fields.sourceId || null,
  };
  state.habits.push(h);
  commit({ type: 'create', id: h.id, origin: fields.origin || 'app' });
  return h;
}

export function archiveHabit(id) {
  const h = habitById(id);
  if (!h) return;
  h.archived = true;
  commit({ type: 'archive', id });
}

export function restoreHabit(id) {
  const h = habitById(id);
  if (!h) return;
  h.archived = false;
  commit({ type: 'restore', id });
}

export function sendMessage(groupId, text) {
  const g = state.groups.find((x) => x.id === groupId);
  if (!g || !text.trim()) return;
  g.messages.push({
    id: 'm-' + Math.random().toString(36).slice(2, 8),
    who: state.user.id,
    text: text.trim(),
    at: new Date().toISOString(),
  });
  commit({ type: 'message', id: groupId });
}

export function dismissLesson(id) {
  if (!state.dismissedLessons.includes(id)) state.dismissedLessons.push(id);
  commit({ type: 'lesson-dismiss', id });
}

export function markLessonRead(id) {
  const l = state.lessons.find((x) => x.id === id);
  if (!l || l.read) return;
  l.read = true;
  commit({ type: 'lesson-read', id });
}

export function acceptInvitation(id) {
  state.invitations = state.invitations.filter((i) => i.id !== id);
  commit({ type: 'invitation', id });
}

/* --------------------------------------------------------------------------
   STUDY LOG — how many times a lesson has been practised, and when last.

   Kept in the store rather than in the view because three screens need it and
   none of them owns it: the reminder decides what to offer next, the Library
   shows what a source has actually produced, and the lesson itself shows
   whether you have been here before.

   REPETITION IS THE POINT. A lesson opened once is a lesson read; a lesson
   opened eleven times over three weeks is a lesson learned, and the difference
   is invisible without a count. `lastAt` is what makes "you have not touched
   this in nine days" possible, which is the only honest thing a reminder can
   say.

   Lazily created so an existing saved state gains the key without a migration,
   the same reason hydrate() shallow-merges.
-------------------------------------------------------------------------- */

function studyLog() {
  if (!state.study) state.study = {};
  return state.study;
}

/** Every recorded run of one lesson: { count, lastAt, history[] }. */
export function lessonStat(key) {
  return studyLog()[key] || { count: 0, lastAt: null, history: [] };
}

/** Record a completed run. Called when a lesson's exercises are all marked. */
export function completeLesson(key) {
  const log = studyLog();
  const cur = log[key] || { count: 0, lastAt: null, history: [] };
  const when = iso(today());
  cur.count += 1;
  cur.lastAt = when;
  cur.history = (cur.history || []).concat(when);
  log[key] = cur;
  commit({ type: 'lesson-complete', id: key });
  return cur;
}

/* --------------------------------------------------------------------------
   FINISHING A PRACTICE

   A practice has to be able to END. Without this the Library only ever grows,
   every reminder ever set keeps firing, and the shelf becomes a graveyard you
   have to read past to reach the thing you are studying now.

   WHAT FINISHING DOES, AND WHAT IT DELIBERATELY DOES NOT:
   it archives the HABITS built from the source, so the reminders stop. It does
   NOT delete the lessons or the study log. "I ran lesson 5 eleven times over
   three weeks" is the most valuable thing this app knows about you, and losing
   it because you tidied up would be the worst possible trade. The source moves
   to a finished shelf with its record intact, and can be reopened.
-------------------------------------------------------------------------- */

function finishedMap() {
  if (!state.finishedSources) state.finishedSources = {};
  return state.finishedSources;
}

export function isSourceFinished(sourceId) {
  return !!finishedMap()[sourceId];
}

export function finishedAt(sourceId) {
  return finishedMap()[sourceId] || null;
}

/** Archive every habit built from this source and shelve it. Returns how many
    reminders were stopped, so the UI can say it rather than guess. */
export function finishSource(sourceId) {
  const hit = state.habits.filter((h) => h.sourceId === sourceId && !h.archived);
  hit.forEach((h) => { h.archived = true; });
  finishedMap()[sourceId] = iso(today());
  commit({ type: 'source-finish', id: sourceId });
  return hit.length;
}

/** Put it back on the active shelf. The habits stay archived: restarting a
    practice should be a deliberate act, not a side effect of un-tidying. */
export function reopenSource(sourceId) {
  delete finishedMap()[sourceId];
  commit({ type: 'source-reopen', id: sourceId });
}

/** Whole-corpus view, for the Library card and the reminder's summary. */
export function studySummary(keys) {
  const stats = keys.map((k) => lessonStat(k));
  const runs = stats.reduce((n, s) => n + s.count, 0);
  const started = stats.filter((s) => s.count > 0).length;
  const last = stats.map((s) => s.lastAt).filter(Boolean).sort().pop() || null;
  return { runs, started, of: keys.length, lastAt: last };
}

/* Theme and motion live in HC (it owns the <html> attributes and the
   localStorage the reviewer expects to persist). The store mirrors them so the
   harness and any view can read the current value from one place. */
export function setTheme(mode) {
  state.theme = mode;
  if (window.HC) window.HC.setTheme(mode);
  commit({ type: 'theme', id: mode });
}

export function setMotion(mode) {
  state.motion = mode;
  if (window.HC) window.HC.setMotion(mode);
  commit({ type: 'motion', id: mode });
}

export function setQuickCheckIn(on) {
  state.user.quickCheckIn = !!on;
  document.documentElement.setAttribute('data-quick-checkin', String(!!on));
  commit({ type: 'quick-checkin' });
}

/** Back to the seed. The harness's "Reset data" button. */
export function resetAll() {
  if (adapter.clear) adapter.clear();
  const fresh = adapter.seed();
  Object.keys(state).forEach((k) => { delete state[k]; });
  Object.assign(state, fresh);
  commit({ type: 'reset' });
}

/* --------------------------------------------------------------------------
   4. DERIVED SELECTORS — pure functions over state. Nothing here writes.

   Memoised per commit: `memo` is cleared by commit(), so a selector can be
   called freely inside a render loop without recomputing a 520-day scan for
   every card.
-------------------------------------------------------------------------- */

const memo = new Map();
function cached(key, fn) {
  if (memo.has(key)) return memo.get(key);
  const v = fn();
  memo.set(key, v);
  return v;
}

export function isScheduled(habit, d) {
  return habit.days.includes((d || today()).getDay());
}

export function isDoneOn(habit, d) {
  return habit.history.includes(iso(d || today()));
}

/** Active habits scheduled for today, incomplete first, completed sunk to the
    bottom — the same order the CSS `order` property produces, so the initial
    render and the post-check-in reorder agree. */
export function todayHabits() {
  const d = today();
  return state.habits
    .filter((h) => !h.archived && isScheduled(h, d))
    .sort((a, b) => {
      const da = isDoneOn(a, d) ? 1 : 0;
      const db = isDoneOn(b, d) ? 1 : 0;
      if (da !== db) return da - db;
      return (a.time || '').localeCompare(b.time || '');
    });
}

export function activeHabits() {
  return state.habits.filter((h) => !h.archived);
}

export function archivedHabits() {
  return state.habits.filter((h) => h.archived);
}

/**
 * Current streak, counted in SCHEDULED days, not calendar days.
 * An open day (scheduled, today, not yet done) is not a break — the streak is
 * measured to yesterday until you check in. That is why opening the app in the
 * morning never shows your streak dropping to zero.
 */
export function streakOf(habit) {
  return cached('streak:' + habit.id, () => {
    const set = new Set(habit.history);
    let d = today();
    if (isScheduled(habit, d) && !set.has(iso(d))) d = daysAgo(1, d);
    let n = 0;
    for (let guard = 0; guard < 3000; guard++) {
      if (habit.days.includes(d.getDay())) {
        if (!set.has(iso(d))) break;
        n++;
      }
      d = daysAgo(1, d);
    }
    return n;
  });
}

/** The longest run ever. The GILD reads this, not the current streak — a mark
    records what you did, and survives a break. [D §2.4] */
export function bestStreakOf(habit) {
  return cached('best:' + habit.id, () => {
    if (!habit.history.length) return 0;
    const set = new Set(habit.history);
    const sorted = habit.history.slice().sort();
    const d = new Date(sorted[0] + 'T00:00:00');
    const end = today();
    let best = 0, run = 0;
    while (d <= end) {
      if (habit.days.includes(d.getDay())) {
        if (set.has(iso(d))) { run++; if (run > best) best = run; }
        else run = 0;
      }
      d.setDate(d.getDate() + 1);
    }
    return best;
  });
}

/** 0 | 7 | 30 | 100 | 365 → the `.habit-card--gild-N` modifier. */
export function gildOf(habit) {
  const best = bestStreakOf(habit);
  let tier = 0;
  data.MILESTONES.forEach((m) => { if (best >= m) tier = m; });
  return tier;
}

/** The day arc: { done, total, complete }. Total is today's scheduled habits. */
export function dayProgress() {
  const list = todayHabits();
  const done = list.filter((h) => isDoneOn(h)).length;
  return { done, total: list.length, complete: list.length > 0 && done === list.length };
}

/** Any habit checked in on this date? Drives the calendar's day cells. */
export function dayState(d) {
  const due = state.habits.filter((h) => !h.archived && isScheduled(h, d));
  if (!due.length) return { state: 'none', done: 0, total: 0 };
  const done = due.filter((h) => isDoneOn(h, d)).length;
  return {
    state: done === 0 ? 'none' : done === due.length ? 'done' : 'partial',
    done, total: due.length,
  };
}

/** The last `n` days, newest last — the week strip and the calendar grid. */
export function recentDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = daysAgo(i);
    out.push(Object.assign({ date: d, iso: iso(d) }, dayState(d)));
  }
  return out;
}

/** Days in the last `n` with at least one check-in. "4 of 5 days". */
export function daysWithCheckIn(n) {
  return recentDays(n).filter((d) => d.state !== 'none').length;
}

/** The account-wide streak: consecutive days with at least one check-in. */
export function overallStreak() {
  return cached('overall', () => {
    let d = today();
    if (dayState(d).state === 'none') d = daysAgo(1, d);
    let n = 0;
    for (let guard = 0; guard < 3000; guard++) {
      if (dayState(d).state === 'none') break;
      n++;
      d = daysAgo(1, d);
    }
    return n;
  });
}

/* --------------------------------------------------------------------------
   5. MILESTONES
   The store reports a crossing; it does not decide whether to celebrate.
   "The moment fires once per session; the mark is permanent" [D §2.4] is
   enforced inside HC.fireMilestone, which already owns that latch — one hook,
   one owner. checkIn() returns the crossed tier and app.js hands it to HC.
-------------------------------------------------------------------------- */

/** Would checking this habit in today cross a milestone? Used by views that
    want to foreshadow one; the actual firing goes through checkIn's return. */
export function milestoneAhead(habit) {
  if (isDoneOn(habit)) return null;
  const next = streakOf(habit) + 1;
  return data.MILESTONES.includes(next) ? next : null;
}

/* --------------------------------------------------------------------------
   6. THE KNOWLEDGE LAYER — sources, Practices, enrolments, Spaces   [#5 #6 #9]

   A Practice is a source turned into weeks of lessons, recall checks and
   candidate habits. It is what all three business-model experiments sell; only
   the payer changes. See docs on issue #1.

   The rules from the habit layer carry over unchanged, and they are the reason
   this section is short:

     · Derive, never store a second fact. There is no `ptr` field for the same
       reason there is no `streak` field — a stored number is a second fact that
       can disagree with the first. [#9]
     · Mutate through a mutation. Every one ends in commit().
     · The converter is not the store's business. `convert()` produces weeks;
       this file wraps them in identity, ownership and status.
-------------------------------------------------------------------------- */

export function sourceById(id) {
  return state.sources.find((s) => s.id === id) || null;
}

export function practiceById(id) {
  return state.practices.find((p) => p.id === id) || null;
}

export function publishedPractices() {
  return state.practices.filter((p) => p.status === 'published');
}

export function draftPractices() {
  return state.practices.filter((p) => p.status === 'draft');
}

/** Every lesson in a Practice, flattened, in reading order. */
export function practiceLessons(practice) {
  if (!practice) return [];
  return practice.weeks.reduce((all, w) => all.concat(w.lessons), []);
}

export function practiceLessonById(practice, lessonId) {
  return practiceLessons(practice).find((l) => l.id === lessonId) || null;
}

/**
 * Record a source. `rightsConfirmed` is required rather than defaulted:
 * an affirmative rights confirmation at upload is the whole copyright position
 * for E1, and a field that defaults to true is not a confirmation. [#2 §copyright]
 */
export function addSource(fields = {}) {
  const s = {
    id: 'src-' + Math.random().toString(36).slice(2, 9),
    title: fields.title || 'Untitled source',
    author: fields.author || '',
    kind: fields.kind || 'pdf',
    pages: fields.pages || 0,
    blurb: fields.blurb || '',
    corpus: fields.corpus || 'longgame',
    addedAt: iso(today()),
    rightsConfirmed: !!fields.rightsConfirmed,
  };
  state.sources.push(s);
  commit({ type: 'source-add', id: s.id });
  return s;
}

/**
 * Bind a source into a DRAFT Practice.
 *
 * Draft is not a default that a caller may override, and there is no
 * `publish: true` shortcut. Nothing publishes unreviewed — the author must
 * open each week and then call publishPractice() themselves. That is the
 * design constraint the whole creator experiment rests on, and the safest
 * place to enforce it is here, where every path has to come through. [#2 §3.4]
 */
export function bindSource(sourceId, opts = {}) {
  const source = sourceById(sourceId);
  if (!source) return null;
  const outputs = {
    lessons: opts.lessons !== false,
    checks: !!opts.checks,
    habits: opts.habits !== false,
  };
  const p = {
    id: 'prc-' + Math.random().toString(36).slice(2, 9),
    sourceId,
    title: source.title + ': the practice',
    author: source.author,
    code: null,
    status: 'draft',
    publishedAt: null,
    outputs,
    prompt: opts.prompt || '',
    plan: null,
    mine: true,          /* made in this session — what the E3 wall counts */
    reviewedWeeks: [],
    weeks: convert(source, outputs, opts.prompt || ''),
  };
  state.practices.push(p);
  commit({ type: 'practice-bind', id: p.id });
  return p;
}

/** Mark a week as opened in review. Publishing needs all of them. [#5] */
export function reviewWeek(practiceId, weekN) {
  const p = practiceById(practiceId);
  if (!p) return;
  if (!p.reviewedWeeks) p.reviewedWeeks = [];
  if (!p.reviewedWeeks.includes(weekN)) p.reviewedWeeks.push(weekN);
  commit({ type: 'practice-review', id: practiceId });
}

/** Can this draft be published yet? The review gate, in one place. */
export function readyToPublish(practice) {
  if (!practice || practice.status !== 'draft') return false;
  const seen = practice.reviewedWeeks || [];
  return practice.weeks.every((w) => seen.includes(w.n));
}

export function editLesson(practiceId, lessonId, fields = {}) {
  const p = practiceById(practiceId);
  const l = practiceLessonById(p, lessonId);
  if (!l) return;
  if (typeof fields.title === 'string') l.title = fields.title;
  if (typeof fields.standfirst === 'string') l.standfirst = fields.standfirst;
  l.edited = true;
  commit({ type: 'lesson-edit', id: lessonId });
}

export function removeLesson(practiceId, lessonId) {
  const p = practiceById(practiceId);
  if (!p) return;
  p.weeks.forEach((w) => { w.lessons = w.lessons.filter((l) => l.id !== lessonId); });
  p.weeks = p.weeks.filter((w) => w.lessons.length);
  commit({ type: 'lesson-remove', id: lessonId });
}

/**
 * Re-run one card with its own prompt. The simulation reaches back into the
 * converter for a fresh copy and re-applies the angle, so the guiding prompt
 * demonstrably changes the output at card level too — an acceptance criterion
 * on #5, not a flourish.
 */
export function regenerateLesson(practiceId, lessonId, prompt) {
  const p = practiceById(practiceId);
  const source = p && sourceById(p.sourceId);
  if (!p || !source) return;
  const fresh = convert(source, p.outputs, prompt || p.prompt);
  const replacement = fresh
    .reduce((all, w) => all.concat(w.lessons), [])
    .find((l) => l.id === lessonId);
  if (!replacement) return;
  p.weeks.forEach((w) => {
    const i = w.lessons.findIndex((l) => l.id === lessonId);
    if (i >= 0) w.lessons[i] = Object.assign(replacement, { edited: true });
  });
  commit({ type: 'lesson-regenerate', id: lessonId });
}

/**
 * A join code a person can read off the back of a book and type without
 * checking twice. Letters only, no articles, no filler, capped at ten.
 *
 * Naive slicing produced "THELONGG" for "The Long Game — the practice", which
 * is the kind of detail that makes a product feel machine-made in exactly the
 * screen where it must not.
 *
 * It must also be UNIQUE. Two practices derived from the same source generate
 * the same letters, and a duplicate code silently sends a reader to somebody
 * else's programme — `practiceByCode` can only ever return the first match. So
 * a taken code gets a numeric suffix rather than being handed out twice.
 */
function codeFor(title) {
  const skip = new Set(['the', 'a', 'an', 'of', 'and', 'practice', 'daily']);
  const base = String(title)
    .split(/[^a-z]+/i)
    .filter((w) => w && !skip.has(w.toLowerCase()))
    .join('')
    .slice(0, 10)
    .toUpperCase() || 'PRACTICE';

  const taken = new Set(state.practices.map((p) => p.code).filter(Boolean));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 100; n++) {
    const candidate = base.slice(0, 9) + n;
    if (!taken.has(candidate)) return candidate;
  }
  return base + Math.random().toString(36).slice(2, 5).toUpperCase();
}

/** Publish a reviewed draft to an audience. Refuses an unreviewed one. */
export function publishPractice(practiceId, opts = {}) {
  const p = practiceById(practiceId);
  if (!p || !readyToPublish(p)) return null;
  p.status = 'published';
  p.publishedAt = iso(today());
  p.plan = opts.plan || 'companion';
  p.code = codeFor(p.title);
  commit({ type: 'practice-publish', id: p.id });
  return p;
}

/* --- the reader's side ---------------------------------------------------- */

export function hasJoined(practiceId) {
  return state.membership.joined.includes(practiceId);
}

export function joinPractice(practiceId) {
  const p = practiceById(practiceId);
  if (!p || hasJoined(practiceId)) return null;
  state.membership.joined.push(practiceId);
  state.enrolments.push({
    id: 'me-' + practiceId,
    practiceId,
    mine: true,
    joinedAt: iso(today()),
    week1Complete: false,
    habitCreated: false,
    lastCheckIn: null,
  });
  commit({ type: 'practice-join', id: practiceId });
  return p;
}

/** Find a published Practice by its join code. The `#/join` flow. */
export function practiceByCode(code) {
  const want = String(code || '').trim().toUpperCase();
  if (!want) return null;
  return publishedPractices().find((p) => p.code === want) || null;
}

/**
 * The bridge, instrumented. [#9]
 *
 * Creating a habit from a Practice lesson is the moment PTR measures, so it
 * goes through one function rather than each view remembering to record it.
 * The habit itself is created by the existing mutation — a Practice habit is
 * not a different kind of habit, and the day it becomes one is the day the
 * check-in gesture stops working on it.
 */
export function createHabitFromLesson(practiceId, lessonId, fields = {}) {
  const habit = createHabit(Object.assign({}, fields, { origin: 'practice' }));
  habit.fromPractice = practiceId;
  habit.fromLesson = lessonId;
  const mine = state.enrolments.find((e) => e.mine && e.practiceId === practiceId);
  if (mine) {
    mine.habitCreated = true;
    mine.lastCheckIn = iso(today());
  }
  commit({ type: 'practice-bridge', id: habit.id });
  return habit;
}

/* --- PTR and the Studio's four numbers ------------------------------------ */

const DAY_MS = 86400000;

function daysBetween(aIso, bIso) {
  return Math.round((new Date(bIso + 'T00:00:00') - new Date(aIso + 'T00:00:00')) / DAY_MS);
}

export function enrolmentsFor(practiceId) {
  return state.enrolments.filter((e) => e.practiceId === practiceId);
}

/**
 * PRACTICE TAKE RATE — the one number. [#9]
 *
 * Of the people who enrolled, the percentage who created at least one habit
 * from the Practice AND were still checking it in on day 14.
 *
 * Derived here and nowhere else. The Studio, the operator report and the
 * consumer funnel all call this, so there is exactly one definition in the
 * codebase and E1's number is comparable to E2's. Not opens, not lessons
 * read, not sign-ups: this is the only number that says the bridge was
 * crossed and held.
 *
 * `cohortOnly` restricts to enrolments old enough to have HAD a day 14 —
 * without it a Practice published last week reports a PTR near zero because
 * most of its readers have not reached the measurement point yet, which would
 * make a good Practice look like a failing one on launch day.
 */
export function ptrOf(practiceId) {
  return cached('ptr:' + practiceId, () => {
    const now = iso(today());
    const mature = enrolmentsFor(practiceId).filter((e) => daysBetween(e.joinedAt, now) >= 14);
    if (!mature.length) return { pct: null, kept: 0, of: 0 };
    const kept = mature.filter((e) => {
      if (!e.habitCreated || !e.lastCheckIn) return false;
      return daysBetween(e.joinedAt, e.lastCheckIn) >= 14;
    }).length;
    return { pct: Math.round((kept / mature.length) * 100), kept, of: mature.length };
  });
}

/** The Studio's four numbers, and nothing else. Adding a fifth is a design
    decision, not a data one — see #6. */
export function studioStats(practiceId) {
  const all = enrolmentsFor(practiceId);
  return {
    enrolled: all.length,
    week1: all.filter((e) => e.week1Complete).length,
    habits: all.filter((e) => e.habitCreated).length,
    ptr: ptrOf(practiceId),
  };
}

/**
 * PTR by joining week, oldest first — the Studio's one chart.
 * Weeks with nobody mature enough to measure are returned with `pct: null` so
 * the chart can leave a gap rather than draw a zero it does not mean.
 */
export function ptrSeries(practiceId, weeks = 6) {
  const now = iso(today());
  const rows = enrolmentsFor(practiceId);
  const out = [];
  for (let w = weeks; w >= 1; w--) {
    const hi = w * 7, lo = (w - 1) * 7;
    const bucket = rows.filter((e) => {
      const age = daysBetween(e.joinedAt, now);
      return age >= lo && age < hi && age >= 14;
    });
    const kept = bucket.filter((e) => e.habitCreated && e.lastCheckIn &&
      daysBetween(e.joinedAt, e.lastCheckIn) >= 14).length;
    out.push({
      week: w,
      pct: bucket.length ? Math.round((kept / bucket.length) * 100) : null,
      of: bucket.length,
    });
  }
  return out;
}

/* --- Spaces (E2) ---------------------------------------------------------- */

export function spaceById(id) {
  return state.spaces.find((s) => s.id === id) || null;
}

export function joinedSpaces() {
  return state.spaces.filter((s) => s.joined);
}

export function joinSpace(id) {
  const s = spaceById(id);
  if (!s || s.joined) return;
  s.joined = true;
  if (s.practiceId) joinPractice(s.practiceId);
  commit({ type: 'space-join', id });
}

/* --- the consumer paywall (E3) -------------------------------------------- */

/**
 * The wall sits on CONVERSION, never on the check-in. [#4 §5.4]
 *
 * One free Practice; a second source needs Plus. This function is the only
 * place that rule is written down, so moving the wall is a one-line change and
 * moving it onto the core loop would have to be done here, deliberately, in
 * front of the comment saying not to.
 */
export function needsPlusToBind() {
  return !state.membership.plus && state.practices.some((p) => p.mine);
}

export function startPlus() {
  state.membership.plus = true;
  commit({ type: 'plus' });
}

/* Re-export the fixture bits views need read-only access to, so a view imports
   from one place rather than reaching into data.js for some things and the
   store for others. */
export { data };
