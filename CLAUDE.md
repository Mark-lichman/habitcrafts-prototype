# Conventions

Rules that already hold in this repository, collected so they are enforceable rather than
scattered. Most are restated from `prototype/README-buildnotes.md` and `docs/production-path.md`,
which remain the authority where there is more detail.

## Before you change anything

- **Read `prototype/README-buildnotes.md`.** It is the build contract. §12–13 cover the app
  architecture, the store API, and how to add a route or a view.
- **Do not commit to `main` directly.** Pushing `main` triggers the GitHub Pages deploy and
  publishes to the public site. Work on a branch; merging is a publishing decision.
- **Run `node scripts/smoke.mjs`** after touching anything in the data layer. It needs no browser
  and no dependencies. If it stops being runnable, a production seam has been breached — see
  below.

## The data layer

- **Mutate through a store mutation, never by hand.** `store.state.habits.push()` updates no
  screen and is lost on reload. Every mutation ends in `commit()`.
- **Derive, never store a second fact.** There is no `streak` field on a habit and no `ptr` field
  on a practice, and there must never be one: a stored number is a second fact that can disagree
  with the first. History is the only fact; selectors compute the rest.
- **One definition per metric.** Practice Take Rate is defined once in `store.js`. A second
  definition anywhere makes the segments incomparable, which is the only reason the metric exists.
- **Selectors are memoised per commit.** If you read one between a hand mutation and its commit,
  call `memo.clear()` first.

## The view layer

- **A view imports from `store.js`, `router.js`, `ui.js` and `config.js` — and nothing else.**
  Never `data.js`, never `data-practices.js`, never `persistence.js`. The moment a view reaches
  past the store, swapping the backend stops being a one-file change.
- **`render()` is a pure synchronous function of the store.** It reads, it returns a string, it
  writes nothing, and it must not depend on anything it left in the DOM last time. Making it
  async would ripple into every view and is the change that would cost the most.
- **A view asks `flag('thing')`, never which experiment is running.** `config.js` exists to delete
  that conditional; reading `experimentId()` from a view puts it back.
- **Escape everything.** The `html` tagged template escapes every interpolation. `raw()` is for
  nested `html` results and authored strings only, never for anything that reached the app from
  the store.
- **Animate imperatively, do not re-render.** `router.refresh()` tears a view down and rebuilds
  it, so anything mid-animation gets replaced. See `meta.ownsCheckIn` and the Bindery's binding
  stage for the two worked examples.

## CSS

- **Append-only.** New sections go at the end and modify nothing above them. No rule may depend on
  its position relative to another.
- **Semantic tokens only — no new literal hex.** The palette is closed. If a colour is missing,
  the token set is wrong, not the rule.
- **Load order is tokens → base → components**, and the three link blocks are byte-identical on
  every page.
- **13px is the minimum text size. No exceptions.**
- **Both themes, every time.** Light and dark, at the established contrast floor.

## Copy

- **No em or en dashes in product copy** — any string a user reads. 58 were removed deliberately.
  Two are kept as glyphs rather than punctuation: the empty-value placeholder in habit-detail, and
  the devbar hour readout before a value exists.
- **Scope is product copy only.** Code comments, `docs/`, both READMEs and the design-system
  gallery are explicitly out of scope and hold roughly 1,500 more. That is a separate decision and
  has not been taken.

## What does not belong in this repository

**It is public.** Design, research and architecture are fine and already here. Named-prospect
judgements are not: "too slow", "will build rather than buy" and do-not-pitch lists about real
companies live in Google Drive instead. `docs/icp-catalog.md` holds the reasoning; the outreach
sheet holds the names.

## Where things are

- `docs/README.md` — the docs index, grouped by design / architecture / go to market
- `prototype/README.md` — what is live versus reference, and the code map
- `prototype/README-buildnotes.md` — the build contract
- On GitHub, **press `t`** and type part of a filename rather than remembering paths.
