# From prototype to front end

**Version:** 1.0 · **Date:** 2026-08-20
**Reads:** `design-direction.md`, `prototype/README-buildnotes.md` §12–§13
**Answers:** "can this prototype become the real front end rather than a thing the
real front end is written from?"

Short answer: yes, and the work to make it so is already done. This document
says what was changed, what the one remaining decision is, and what would break
the claim.

---

## 1. The decision this forces

The repo's original premise was *"design validated here gets re-implemented in
Flutter."* Reusing this code as the front end replaces that premise. There is no
way to have both — a Flutter app and a web app are two front ends, and two front
ends is two of everything: two component libraries, two bug queues, two places
the design system drifts apart.

**So this is a real fork and it should be taken deliberately:**

- **Option A — this becomes the front end.** The app ships as a web app (installable
  PWA), Flutter is retired, and the Flutter repo becomes history rather than a
  target. Everything below is already set up for it.
- **Option B — Flutter stays the app.** Then this prototype stays a prototype, and
  the value of the work below is that the *contracts* port cleanly — the data
  shapes, the selector list, the flag names, the store API — rather than the code.

The code is written so **Option B costs nothing extra** and **Option A is available
without a rewrite.** Nothing here has to be undone to go either way. But the two
should not be run in parallel for long: the moment a feature ships in one and not
the other, the design system has forked and the reason this prototype exists is
gone.

My recommendation, stated so it can be argued with: **take Option A** unless
there is a native capability the app genuinely needs that the web cannot give it.
For this product the honest list of those is short — the check-in haptic is the
only real one, and the Vibration API covers Android while iOS Safari does not.
Set against that, a single codebase, an instant deploy, no app-store review on
the critical path, and a URL you can put on the last page of a book — which is
precisely the E1 distribution mechanism — are worth more than a haptic on one
platform.

---

## 2. What was already true, and why it matters

Most of the credit belongs to how the prototype was written before any of this.
Three properties made the production path a seam rather than a rebuild:

**`render()` is a pure synchronous function of the store.** It reads, it returns
a string, it writes nothing. No view holds state, no view subscribes, no view
knows what happened before it. That is the property that makes the view layer
portable — and it is the property most easily lost, so it is the one to defend in
review.

**Derive, never store a second fact.** There is no `streak` field on a habit and
no `ptr` field on a Practice; both are computed from history. That is a
correctness rule locally, but it is what makes a *network* store safe: a late
remote patch can only change the facts a value is computed from, never contradict
a stored copy of the value. Half the hard bugs in offline-first apps are stored
derivations disagreeing with their source.

**Escaping at the templating layer.** `html\`\`` escapes every interpolation.
That was described in the code as being a good example for the Flutter build to
copy; if this becomes the front end, it stops being an example and becomes the
actual XSS boundary — and it is already in the right place.

---

## 3. What changed

### 3.1 The persistence seam — `js/persistence.js`

`store.js` no longer knows where data comes from. It asks an **adapter**:

```
seed()            → the initial state object          (synchronous)
load()            → a saved state object, or null     (synchronous)
save(state)       → persist                           (synchronous, must not throw)
watch(onRemote)   → optional; push server changes in  (returns unsubscribe)
```

Two adapters ship: `fixtureAdapter` (fixtures + sessionStorage — what the
prototype runs on) and `memoryAdapter` (no persistence at all, for tests and
deterministic screenshots). A third one against a real backend is the entire
production change:

```js
store.configure(firestoreAdapter({ uid }));   // before router.start()
```

**Synchronous is deliberate and it survives the migration.** Making the store
async would ripple into every view and destroy the property in §2. It also is not
necessary: Firestore, PouchDB, WatermelonDB and every offline-first store expose a
local cache that answers immediately and reconciles in the background. A
production adapter hydrates once before boot, answers `load()` from cache, and
feeds server changes in through `watch`.

### 3.2 The configuration seam — `js/config.js`

One module knows which product is running. In the prototype it is which
business-model experiment is being simulated; in production it is feature flags.
They are the same thing, which is the point.

A view asks `flag('bindery')`. **No view asks which experiment is running** — the
only legitimate readers of the experiment id are the nav painter and the switcher
itself. That rule is what keeps this from becoming the `if (isE1)` sprawl the
module exists to prevent.

Navigation is data now: `app.html` holds an empty `<ul data-nav-list>` and
`app.js` fills it from config. An experiment can add a destination, and a shipping
configuration can remove one, without touching markup.

When an experiment wins: delete the losing entries, delete the switcher element
and `paintSwitcher()`, and the winner's flags are the shipping configuration.
Nothing else changes.

### 3.3 A test that runs without a browser — `scripts/smoke.mjs`

`node scripts/smoke.mjs`. Zero dependencies, four browser shims, and it asserts
the rules the business actually depends on: PTR is derived and reports `null`
rather than `0` for an immature cohort, the guiding prompt demonstrably changes
the output, every generated card is traceable, nothing publishes unreviewed, join
codes are unique, and the paywall never touches the check-in.

Its real job is as a canary. **If this file ever becomes impossible to run, the
seam in §3.1 has been breached** — something in the data layer has started
reaching into the DOM, and the production path has quietly closed.

---

## 4. What is still missing for production

Honest list, in the order it would have to be done. None of it is architectural;
all of it is work.

1. **An auth adapter.** The auth screen exists and is a façade. Same shape as the
   persistence adapter: one module, four methods.
2. **A real conversion service.** `convert()` in `data-practices.js` is two canned
   corpora. Production replaces the body of that one function with an API call.
   Its signature — `(source, outputs, prompt) → weeks` — is the thing that was
   designed to survive, and it does.
3. **File ingestion.** The Bindery's drop target does not read files, deliberately.
4. **Validation.** The prototype does none, by documented decision. Every mutation
   in `store.js` currently trusts its caller.
5. **A build step, but only if measurement asks for it.** There is none today, and
   that is a feature: no toolchain to rot, no lockfile, no `npm install`. Hand-written
   ES modules over HTTP/2 are a legitimate production choice at this size. Add
   bundling when a real number says to, not on principle.
6. **Offline and installability.** A service worker and a manifest. Straightforward,
   and only worth doing under Option A.
7. **Error reporting.** There is no telemetry of any kind.

---

## 5. What would break the claim

These are the review rules. Each one, if broken, converts "this can ship" back
into "this is a prototype."

- **A view importing anything other than `store.js`, `router.js`, `ui.js`,
  `config.js` or another view.** Especially `data.js`, `data-practices.js` or
  `persistence.js`. The moment a view reaches past the store, swapping the backend
  stops being one file.
- **An async `render()`.** See §2.
- **A stored derivation.** A `streak`, a `ptr`, a `completedCount`. If you find
  yourself caching one for performance, memoise it in the selector layer where
  `commit()` already invalidates it.
- **A view reading `experimentId()`** instead of `flag()`.
- **A second definition of PTR.** There is one, in `store.js`. The Studio, an
  operator report and a consumer funnel must all call it, or E1's number stops
  being comparable to E2's, which is the whole reason it exists.
- **`window.HC` growing new responsibilities.** The behaviour layer
  (`prototype.js`) is the largest file here and the least portable. It should
  shrink over time, not grow.
