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

const STORAGE_KEY = 'hc:proto:v1';

/* --------------------------------------------------------------------------
   1. SEED + HYDRATE
-------------------------------------------------------------------------- */

/** A fresh copy of the fixture data. Deep-cloned so a mutation can never
    reach back into data.js and quietly rewrite the seed. */
function seedState() {
  return {
    user: structuredClone(data.user),
    habits: structuredClone(data.habits),
    groups: structuredClone(data.groups),
    invitations: structuredClone(data.invitations),
    lessons: structuredClone(data.lessons),
    dismissedLessons: [],
    theme: 'system',
    motion: 'auto',
  };
}

function hydrate() {
  const fresh = seedState();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw);
    /* Shallow merge: saved keys win, missing keys fall back to the seed, so a
       state shape gaining a key does not need a migration. */
    return Object.assign(fresh, saved);
  } catch (e) {
    return fresh;
  }
}

export const state = hydrate();

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
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* private mode, quota — the prototype still works in memory */ }
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

/** Back to the fixture data. The harness's "Reset data" button. */
export function resetAll() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
  const fresh = seedState();
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

/* Re-export the fixture bits views need read-only access to, so a view imports
   from one place rather than reaching into data.js for some things and the
   store for others. */
export { data };
