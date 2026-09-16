/* ============================================================================
   HabitCrafts — srs.js
   WHEN SHOULD THIS CARD COME BACK?

   Pure functions over a review log. No state, no storage, no DOM. The store
   owns the log; this file owns what the log MEANS, and owning it in one place
   is what stops two screens disagreeing about whether something is due.

   ---------------------------------------------------------------------------
   WHY LEITNER AND NOT SM-2
   ---------------------------------------------------------------------------
   SM-2 is the algorithm everyone reaches for, and it wants a grade from 0 to 5.
   This app collects a binary one: the practice screen offers "Got it" and "Not
   yet" and that is the honest resolution of the signal. Feeding a binary answer
   into a five-point algorithm means inventing the three values in between, and
   inventing resolution the learner never gave is the same mistake as scoring a
   rubric 1 to 5 when the annotator only ever meant pass or fail. The taxonomy
   rejected that for evals; it is rejected here for the same reason.

   So: boxes. `got` moves a card up one, `again` sends it back to the start, and
   the box says how long until it is due. Six doublings covers a month, which is
   as far ahead as anyone practising daily needs to see.

   ---------------------------------------------------------------------------
   DERIVE, NEVER STORE A SECOND FACT
   ---------------------------------------------------------------------------
   Nothing here is written down. Box, interval and due date are all computed
   from the log every time they are asked for. A stored `box` or a stored
   `dueAt` is exactly the second fact this codebase refuses to keep anywhere
   else: the moment one exists it can disagree with the reviews it came from,
   and then there are two answers to "is this due" and no way to tell which is
   wrong. There is no `streak` field on a habit and no `ptr` on a practice for
   the same reason.

   Cheap enough that the rule costs nothing: the log is one array, and
   `scheduleFor` is a single pass over the reviews of one card.

   ---------------------------------------------------------------------------
   CARD IDENTITY HAS TO SURVIVE RE-EXTRACTION
   ---------------------------------------------------------------------------
   The obvious id is `lessonKey:index`, which is what the practice screen used
   while its results were throwaway. Both halves of it move: re-extracting a
   corpus rewrites lesson keys AND reorders exercises, and ja3's keys already
   changed between two runs on the day this was written. An id built from them
   would silently orphan every review each time a deck was re-extracted, and the
   damage would look like "the schedule reset itself" rather than like a bug.

   So the id is built from what the exercise IS: its prompt and its answer,
   hashed. Re-indexing preserves history. Re-wording an exercise loses it, which
   is correct — a changed question is a different question.
   ========================================================================= */

/* --------------------------------------------------------------------------
   THE BOXES

   Index is the box. Value is days until due. Box 0 is same-day: a card you just
   missed should come back before you close the app, not tomorrow.
-------------------------------------------------------------------------- */

export const INTERVALS = [0, 1, 2, 4, 8, 16, 32];
export const TOP_BOX = INTERVALS.length - 1;

/* --------------------------------------------------------------------------
   IDENTITY

   FNV-1a, 32-bit, as an unsigned hex string. Chosen because it is eight lines,
   has no dependencies and is stable across engines and across time - which is
   the only property that matters here. It is not a security hash and nothing
   about it needs to be.
-------------------------------------------------------------------------- */

function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * The stable id of one exercise. Scoped by source so two decks that happen to
 * drill an identical sentence keep separate histories: they were learned in
 * different contexts and merging them would silently mark one deck practised
 * because the other was.
 */
export function cardId(sourceId, exercise) {
  const answer = Array.isArray(exercise.options) && exercise.options.length
    ? exercise.options[exercise.answer]
    : exercise.answer;
  return `${sourceId}:${hash(`${exercise.prompt}\n${answer}`)}`;
}

/* --------------------------------------------------------------------------
   DATES

   Day granularity, matching `store.js`'s existing `iso(today())` convention, so
   the two never disagree about what day it is. Reviews carry a full timestamp
   because box 0 needs to know a card came back within the same session; due
   dates only ever need the day.
-------------------------------------------------------------------------- */

const DAY = 86400000;

export const isoDay = (d) => new Date(d).toISOString().slice(0, 10);

function addDays(isoDate, days) {
  return isoDay(new Date(isoDate + 'T00:00:00Z').getTime() + days * DAY);
}

/* --------------------------------------------------------------------------
   THE SCHEDULE
-------------------------------------------------------------------------- */

/**
 * Replay one card's reviews and say where it stands.
 *
 * Returns `{ box, reps, lapses, lastAt, dueOn, seen }`. `seen: false` means the
 * card has never been reviewed, and a card that has never been reviewed is due
 * now - which is what makes a fresh deck practisable without seeding anything.
 */
export function scheduleFor(reviews) {
  let box = 0;
  let reps = 0;
  let lapses = 0;
  let lastAt = null;

  for (const r of reviews) {
    if (r.grade === 'got') box = Math.min(box + 1, TOP_BOX);
    else { box = 0; lapses += 1; }
    reps += 1;
    lastAt = r.at;
  }

  if (!reps) return { box: 0, reps: 0, lapses: 0, lastAt: null, dueOn: null, seen: false };
  return {
    box, reps, lapses, lastAt, seen: true,
    dueOn: addDays(isoDay(lastAt), INTERVALS[box]),
  };
}

/**
 * Is this card due on `onDay`?
 *
 * Never seen counts as due: the queue is "what should I look at", not "what
 * have I earned the right to look at again".
 *
 * Box 0 counts as due on the same day, on purpose. Missing a card and then not
 * seeing it again until tomorrow is the one thing a box system exists to
 * prevent, and it is the difference between a drill and a quiz.
 */
export function isDue(schedule, onDay) {
  if (!schedule.seen) return true;
  return schedule.dueOn <= onDay;
}

/**
 * Order for a review queue: the most lapsed first, then the longest unseen,
 * then never-seen.
 *
 * This is `study.js dueLessons()`'s instinct at card granularity, and the
 * argument there holds here: left in author order, the first card gets eleven
 * repetitions and the last gets none. Sorting by neglect is what makes the far
 * end of a deck reachable at all. What is added is lapses, because a card you
 * keep missing is the one the session is for.
 */
export function queueOrder(a, b) {
  if (a.schedule.lapses !== b.schedule.lapses) return b.schedule.lapses - a.schedule.lapses;
  if (a.schedule.seen !== b.schedule.seen) return a.schedule.seen ? 1 : -1;
  if (!a.schedule.seen) return 0;
  return String(a.schedule.lastAt).localeCompare(String(b.schedule.lastAt));
}

/** How the box reads to a person. Six doublings is not a number anyone wants. */
export function boxLabel(schedule) {
  if (!schedule.seen) return 'new';
  if (schedule.box === 0) return 'again today';
  if (schedule.box >= TOP_BOX) return 'monthly';
  const d = INTERVALS[schedule.box];
  return d === 1 ? 'daily' : `every ${d} days`;
}
