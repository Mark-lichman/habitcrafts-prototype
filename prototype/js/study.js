/* ============================================================================
   HabitCrafts — study.js
   WHAT A REMINDER SHOULD OFFER, AND WHAT A SOURCE HAS PRODUCED.

   One place that joins three things which otherwise have no business knowing
   about each other: the corpus (what lessons exist), the study log (how often
   each has been run), and the habit (which lessons it covers).

   Home, Library and the lesson screen all need that join. Without this module
   each of them would import the pilot corpus directly and grow its own idea of
   what "due" means, and the three would drift.

   REGISTRY, not a hard-coded import list. A second source drops in here and
   every screen picks it up. Today there is exactly one, which is honest about
   where the pilot is rather than pretending at generality it has not earned.
   ========================================================================= */

import * as store from './store.js';
import JA from './data-japanese.js';

/* Every corpus the app knows about, keyed by its source id. */
export const SOURCES = {
  [JA.source.id]: JA,
};

export function corpusFor(sourceId) {
  return SOURCES[sourceId] || null;
}

/** Every source, newest upload first — the Library's ordering. */
export function allSources() {
  return Object.values(SOURCES)
    .map((c) => c.source)
    .sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt)));
}

/** A lesson plus its study record, resolved from a bare key. */
export function lessonWithStat(sourceId, key) {
  const c = corpusFor(sourceId);
  if (!c) return null;
  const l = c.lessons.find((x) => x.key === key);
  if (!l) return null;
  return { ...l, stat: store.lessonStat(key) };
}

/**
 * What a reminder should put in front of someone, in order.
 *
 * NEVER PRACTISED FIRST, then longest-since. That ordering is the whole reason
 * a reminder is better than a list: a list is in the author's order and stays
 * there, so lesson 1 gets run eleven times and lesson 5 never. Sorting by
 * neglect is what makes the fifth lesson reachable.
 *
 * Ties break on lesson order, so a fresh practice still starts at the top and
 * reads in the sequence extraction worked out.
 */
export function dueLessons(habit) {
  const c = corpusFor(habit && habit.sourceId);
  if (!c || !habit.lessons || !habit.lessons.length) return [];
  return habit.lessons
    .map((k) => lessonWithStat(habit.sourceId, k))
    .filter(Boolean)
    .sort((a, b) => {
      if (!a.stat.lastAt && !b.stat.lastAt) return a.n - b.n;
      if (!a.stat.lastAt) return -1;
      if (!b.stat.lastAt) return 1;
      return a.stat.lastAt.localeCompare(b.stat.lastAt) || a.n - b.n;
    });
}

/** Habits that were built from a source, so a reminder can be fired for them. */
export function studyHabits() {
  return store.activeHabits().filter((h) => h.sourceId && h.lessons && h.lessons.length);
}

/** "today" / "yesterday" / "6 days ago" / "not yet". Reminder-sized. */
export function sinceLabel(isoDate) {
  if (!isoDate) return 'not yet';
  const d = new Date(isoDate + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.round((now - d) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return days + ' days ago';
  if (days < 14) return 'a week ago';
  return Math.floor(days / 7) + ' weeks ago';
}

/** How much of a source has been touched at all, for the Library card. */
export function sourceProgress(sourceId) {
  const c = corpusFor(sourceId);
  if (!c) return null;
  return store.studySummary(c.lessons.map((l) => l.key));
}
