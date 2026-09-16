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
import * as srs from './srs.js';
import JA from './data-japanese.js';
import JA3 from './corpus/ja3.js';
import JA6 from './corpus/ja6.js';
import VERBS from './corpus/verbs.js';

/* Every corpus the app knows about, keyed by its source id.
 *
 * `data-japanese.js` is the hand-made pilot. Everything under `corpus/` was
 * produced by `evals/extract.mjs` from a real upload and must not be hand
 * edited: a correction made here is a number the evals would go on reporting as
 * the model's. Re-extract instead.
 *
 * THE KEYS MUST NOT COLLIDE. `store.lessonStat(key)` is keyed by lesson key
 * alone, with no source in it, so two corpora that both call a lesson `l-1`
 * would share one study log and practising one would mark the other done.
 * Extraction prefixes every key with the corpus id, and evals.mjs checks it.
 */
export const SOURCES = {
  [JA.source.id]: JA,
  [JA3.source.id]: JA3,
  [JA6.source.id]: JA6,
  [VERBS.source.id]: VERBS,
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

/* --------------------------------------------------------------------------
   THE DUE QUEUE

   Every card that wants looking at today, from EVERY deck, in one list. This is
   the screen the app exists for and the reason it lives here rather than in a
   view: it is the join between three things that have no business knowing about
   each other, which is what this module is for. The corpora say which cards
   exist, `store.reviewsByCard()` says what has happened to them, and `srs.js`
   says what that means.

   ACROSS decks, not within one. A learner does not have a 第3課 morning and a
   word-list afternoon; they have ten minutes on a train. Sorting each deck
   separately would mean the deck you started most recently always wins, which
   is the same failure `dueLessons()` was written to avoid one level up.
-------------------------------------------------------------------------- */

/** Every card in every registered corpus, with its schedule. */
export function allCards() {
  const by = store.reviewsByCard();
  const out = [];
  for (const src of allSources()) {
    const c = corpusFor(src.id);
    if (!c) continue;
    for (const lesson of c.lessons) {
      lesson.exercises.forEach((exercise, i) => {
        const card = srs.cardId(src.id, exercise);
        out.push({
          card,
          sourceId: src.id,
          sourceName: `${src.subject} · ${src.unit}`,
          lessonKey: lesson.key,
          lessonTitle: lesson.title,
          index: i,
          exercise,
          schedule: srs.scheduleFor(by.get(card) || []),
        });
      });
    }
  }
  return out;
}

/**
 * What to practise now, hardest-hit first.
 *
 * `limit` exists because a queue that says "148 due" on a Monday morning is a
 * queue nobody starts. A session is as long as the person has, and the ordering
 * already guarantees the top of it is the part that matters.
 */
export function dueCards({ onDay = srs.isoDay(Date.now()), limit = 0 } = {}) {
  const due = allCards()
    .filter((c) => srs.isDue(c.schedule, onDay))
    .sort(srs.queueOrder);
  return limit > 0 ? due.slice(0, limit) : due;
}

/** Counts for the Today screen, which needs to say why there is nothing to do. */
export function dueSummary(onDay = srs.isoDay(Date.now())) {
  const all = allCards();
  const due = all.filter((c) => srs.isDue(c.schedule, onDay));
  return {
    due: due.length,
    total: all.length,
    fresh: due.filter((c) => !c.schedule.seen).length,
    lapsed: due.filter((c) => c.schedule.lapses > 0).length,
    sources: allSources().length,
  };
}

/** How much of a source has been touched at all, for the Library card. */
export function sourceProgress(sourceId) {
  const c = corpusFor(sourceId);
  if (!c) return null;
  return store.studySummary(c.lessons.map((l) => l.key));
}
