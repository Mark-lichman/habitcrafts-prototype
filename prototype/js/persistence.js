/* ============================================================================
   HabitCrafts — persistence.js
   THE SEAM BETWEEN THE APP AND WHERE ITS DATA ACTUALLY LIVES.

   This file exists for one reason: so that turning this prototype into the real
   front end is a one-file change rather than a rewrite.

   Today the store is seeded from fixtures and written to sessionStorage. In
   production it is seeded from the backend and written back to it. Everything
   between those two — every view, every selector, every mutation, the whole
   render loop — is identical in both cases, because none of it knows which
   adapter is installed.

   ------------------------------------------------------------------------
   THE CONTRACT
   ------------------------------------------------------------------------
   An adapter is a plain object with four methods:

     seed()            → the initial state object. Synchronous.
     load()            → a saved state object, or null. Synchronous.
     save(state)       → persist. Synchronous, must not throw.
     watch(onRemote)   → optional. Call `onRemote(patch)` when the backend
                         pushes a change. Returns an unsubscribe function.

   SYNCHRONOUS IS DELIBERATE AND IT SURVIVES THE MIGRATION. `render()` is a
   pure synchronous function of the store — that is what makes the whole view
   layer trivial, and making it async would ripple into every view. Real
   backends do not force async reads either: Firestore, PouchDB, WatermelonDB
   and every offline-first store expose a local cache that answers immediately
   and reconciles in the background. A production adapter hydrates once at boot
   (before `boot()` runs), answers `load()` from its cache, and pushes server
   changes in through `watch`.

   The rule that makes that safe is already enforced everywhere in this
   codebase: derive, never store a second copy of a fact. There is no `streak`
   field; there is no `ptr` field. A late-arriving remote patch can therefore
   never contradict a computed value — it can only change the history the value
   is computed from.

   ------------------------------------------------------------------------
   WRITING THE PRODUCTION ADAPTER
   ------------------------------------------------------------------------
   Implement the same four methods against your backend in a new module under
   `js/adapters/`, then in app.js, before `router.start()`:

       store.configure(firestoreAdapter({ uid }))

   Nothing else in the app changes. That claim is worth protecting: if a view
   ever imports from this file, or from `data.js`, the claim is no longer true.
   Views import from `store.js` and nowhere else.
   ========================================================================= */

import * as data from './data.js';
import { sources, practices, enrolments, spaces } from './data-practices.js';

/* --------------------------------------------------------------------------
   THE SEED
   One function, so both adapters agree on the shape and a new collection is
   added in one place. Deep-cloned so a mutation can never reach back into the
   fixtures and quietly rewrite the seed for the next reset.
-------------------------------------------------------------------------- */

export function seedState() {
  return {
    /* --- the habit layer, unchanged ---------------------------------- */
    user: structuredClone(data.user),
    habits: structuredClone(data.habits),
    groups: structuredClone(data.groups),
    invitations: structuredClone(data.invitations),
    lessons: structuredClone(data.lessons),
    dismissedLessons: [],
    theme: 'system',
    motion: 'auto',

    /* --- the knowledge layer the experiments add [#5] ----------------- */
    sources: structuredClone(sources),
    practices: structuredClone(practices),
    enrolments: structuredClone(enrolments),
    spaces: structuredClone(spaces),

    /* Which Practices this user has personally joined, and whether they have
       paid. Separate from `enrolments`, which is the whole cohort — this is
       the one row that belongs to the person holding the phone. */
    membership: { joined: [], plus: false },

    /* --- the review log -----------------------------------------------
       Append-only: { card, at, grade }. Every schedule the app shows is
       COMPUTED from this and nothing is written back. A stored interval or a
       stored due-date would be a second fact that can disagree with the
       history it came from, which is the one thing this codebase refuses to
       do anywhere else and will not start doing here. See js/srs.js. */
    reviews: [],
  };
}

/* --------------------------------------------------------------------------
   THE FIXTURE ADAPTER — what the prototype runs on

   sessionStorage rather than localStorage on purpose: a prototype that
   remembers yesterday's demo is a prototype nobody can hand to the next
   reviewer. Close the tab and it is the seed data again. Theme and motion are
   the exception — HC keeps those in localStorage, because a reviewer sets dark
   mode once.

   Bump the version in the key if the state shape changes. A stale blob from an
   older shape is dropped, not migrated: migration logic in a prototype is
   cost with no reader.
-------------------------------------------------------------------------- */

const STORAGE_KEY = 'hc:proto:v2';

/**
 * Both web-storage adapters differ in exactly two things: which Storage object
 * and which key. Written once so they cannot drift, because the day one of them
 * grows a try/catch the other does not is the day a quota error in one context
 * loses data in the other.
 *
 * `storage` is read lazily, per call, rather than captured: a browser with site
 * data blocked throws on the PROPERTY ACCESS, not on the method, so touching
 * `window.localStorage` at module scope would take the whole app down at import
 * time instead of degrading to in-memory.
 */
function webStorage(name, pick, key) {
  return {
    name,
    seed: seedState,

    load() {
      try {
        const raw = pick().getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    save(state) {
      try {
        pick().setItem(key, JSON.stringify(state));
      } catch (e) {
        /* private mode, quota. The app keeps working in memory, which is the
           right failure: losing persistence must never lose the session. */
      }
    },

    clear() {
      try { pick().removeItem(key); } catch (e) {}
    },

    watch() {
      return () => {};    /* nothing changes underneath us */
    },
  };
}

export const fixtureAdapter = webStorage(
  'fixtures', () => window.sessionStorage, STORAGE_KEY);

/* --------------------------------------------------------------------------
   THE LOCAL ADAPTER — what the installed app runs on

   The same contract, one word different, and the difference is the whole
   product. sessionStorage is right for a prototype being handed to a reviewer
   and wrong for an app somebody practises with: on Android, dismissing an
   installed PWA from the recents tray ends the session, so every check-in,
   every lesson run and the entire review log would be gone by the next
   morning. store.js already argues that the study log is "the most valuable
   thing this app knows about you" and refuses to let `finishSource()` delete
   it. sessionStorage was quietly doing what that code refuses to do.

   Its own key, not a bump of the prototype's: the two are different products
   with different lifetimes and there is no reason a reviewer's throwaway
   session and a year of real practice should ever be able to overwrite one
   another.

   STILL SYNCHRONOUS, which is why localStorage and not IndexedDB. The contract
   at the top of this file is synchronous because `render()` is, and IndexedDB
   would ripple into every view for a quota this app is nowhere near: a year of
   daily practice is on the order of a megabyte of JSON against a 5MB ceiling.
-------------------------------------------------------------------------- */

export const localAdapter = webStorage(
  'local', () => window.localStorage, 'hc:ja:v1');

/* --------------------------------------------------------------------------
   THE MEMORY ADAPTER — for tests and for screenshots

   No persistence at all: every reload is the seed. Install it when you want a
   deterministic starting state, which is exactly what a screenshot run and a
   test suite both want.
-------------------------------------------------------------------------- */

export const memoryAdapter = {
  name: 'memory',
  seed: seedState,
  load() { return null; },
  save() {},
  clear() {},
  watch() { return () => {}; },
};
