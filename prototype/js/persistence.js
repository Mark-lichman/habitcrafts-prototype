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

export const fixtureAdapter = {
  name: 'fixtures',

  seed: seedState,

  load() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  save(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* private mode, quota. The app keeps working in memory, which is the
         right failure: losing persistence must never lose the session. */
    }
  },

  clear() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
  },

  watch() {
    return () => {};    /* fixtures never change underneath us */
  },
};

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
