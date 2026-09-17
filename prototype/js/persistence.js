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

const LOCAL_KEY = 'hc:ja:v1';

/* --------------------------------------------------------------------------
   DURABILITY, WHICH LOCALSTORAGE ALONE DOES NOT GIVE

   MEASURED, NOT ASSUMED. `scripts/persist.mjs` practises one card, kills the
   browser PROCESS, and starts a new one on the same profile. Everything written
   in the last moment before the kill was gone: the review log came back empty
   and the check-in count came back one short. An independent audit had already
   reproduced this on the device four times and measured a 3-5 second window;
   on desktop Chrome the same rig measures it at under one second:

       pause    0ms  ->  wanted 508, got 507  LOST
       pause 1000ms  ->  wanted 508, got 508  SURVIVED

   The cause is not the app. `setItem` returns immediately and Chrome commits
   its localStorage area to disk on a timer, so a process that dies inside that
   window loses whatever had not been flushed. An earlier note in this codebase
   called that "not something this app controls", which the audit correctly
   called a choice being described as a law. It IS controllable, and for this
   product it has to be: answering a card and pocketing the phone is not an edge
   case, it is the main way anyone uses this app.

   THE FIX KEEPS THE SYNCHRONOUS CONTRACT. localStorage stays the read path and
   still answers `load()` instantly, so `render()` is untouched and no view
   learns a new word. Every save ALSO goes to IndexedDB, which commits a real
   transaction, and with `durability: 'strict'` asks for a flush rather than a
   lazy one. IndexedDB is not used for reads at runtime; it is used once, at
   boot, to answer one question: is there something on disk newer than what
   localStorage handed back?

   WHICH COPY IS NEWER IS A STORED FACT, AND IT IS THE ONLY ONE.
   Both writes are stamped with the same millisecond, and the stamp lives beside
   the blob rather than inside the state, so no selector can see it and no view
   can come to depend on it. This does not breach "derive, never store a second
   fact": the stamp is not a fact ABOUT the domain that could contradict the
   history, it is a fact about the write itself, which is the one thing that
   genuinely cannot be derived from the data.
-------------------------------------------------------------------------- */

const DB_NAME = 'hc-ja';
const DB_STORE = 'state';
const AT_KEY = LOCAL_KEY + ':at';

let dbPromise = null;

/** The database, opened once. Resolves to null if IndexedDB is unavailable. */
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (!window.indexedDB) return resolve(null);
      const req = window.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      /* Private mode, a blocked origin, a corrupt profile. Falling back to
         localStorage-only is exactly the old behaviour, which worked. */
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
  return dbPromise;
}

/**
 * Put the blob, asking for a real flush.
 *
 * `durability: 'strict'` is the whole point of choosing IndexedDB here: Chrome's
 * default is 'relaxed', which reports success before the data is necessarily on
 * disk and would reproduce the bug this function exists to fix. Older engines do
 * not know the option; they ignore the third argument rather than throwing, and
 * the catch covers the ones that do not.
 */
async function idbPut(raw, savedAt) {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(DB_STORE, 'readwrite', { durability: 'strict' });
    tx.objectStore(DB_STORE).put({ raw, savedAt }, 'current');
  } catch (e) {
    try {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put({ raw, savedAt }, 'current');
    } catch (e2) { /* in-memory for this session, same as a blocked origin */ }
  }
}

async function idbGet() {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get('current');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}

async function idbClear() {
  const db = await openDb();
  if (!db) return;
  try { db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).delete('current'); }
  catch (e) { /* nothing to clear */ }
}

const base = webStorage('local', () => window.localStorage, LOCAL_KEY);

export const localAdapter = {
  ...base,

  save(state) {
    const at = Date.now();
    const raw = JSON.stringify(state);
    try {
      const ls = window.localStorage;
      ls.setItem(LOCAL_KEY, raw);
      ls.setItem(AT_KEY, String(at));
    } catch (e) { /* quota or private mode; IndexedDB may still take it */ }
    /* Deliberately not awaited. `save()` is synchronous by contract and is
       called from the middle of a render cycle; the transaction commits on its
       own and a failure has already been swallowed inside. */
    idbPut(raw, at);
  },

  clear() {
    base.clear();
    try { window.localStorage.removeItem(AT_KEY); } catch (e) {}
    idbClear();
  },

  /**
   * Reconcile the two copies, before the first render.
   *
   * Called from `boot()` alongside `loadCorpora()`, which is the same
   * hydrate-before-boot point the contract at the top of this file describes for
   * a network adapter, and for the same reason: `load()` is synchronous, so
   * anything it should return has to be in place before it is first called.
   *
   * Normally both copies carry the same stamp and this does nothing. It earns
   * its place in the one case that matters: localStorage lost its last flush,
   * IndexedDB did not, and the newer blob is copied back so the synchronous
   * read path returns it.
   */
  async hydrate() {
    try {
      const stored = await idbGet();
      if (!stored || !stored.raw) return false;
      const lsAt = Number(window.localStorage.getItem(AT_KEY) || 0);
      if (!(stored.savedAt > lsAt)) return false;
      window.localStorage.setItem(LOCAL_KEY, stored.raw);
      window.localStorage.setItem(AT_KEY, String(stored.savedAt));
      return true;
    } catch (e) {
      return false;
    }
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
