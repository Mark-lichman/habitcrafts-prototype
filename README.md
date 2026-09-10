# HabitCrafts Prototype

The HabitCrafts prototype: research, design direction, a working preview of every
screen, and simulations of the three business-model experiments tracked in
[issue #1](https://github.com/Mark-lichman/habitcrafts-prototype/issues/1).

**This is now written to be reusable as the real front end**, not only as a thing the
real front end is written from — the data layer sits behind a swappable adapter and the
view layer has no idea where its data comes from. That forces a decision about the
Flutter app at [`Mark-lichman/HabitCrafts`](https://github.com/Mark-lichman/HabitCrafts),
which is laid out in [`docs/production-path.md`](docs/production-path.md) §1. Until that
decision is taken, nothing here ships to users.

## The idea — paper and springs

**Everything you look at is paper. Everything you touch is a spring.**

Calm and fun usually pull against each other. Here they are separated into different
channels, so neither has to be diluted:

- **Calm is a material quality** — warm parchment canvas, matte white cards with hairline
  borders, blue as ink rather than as a field, grain instead of gloss, one deep-blue hero
  surface per screen, stillness at rest.
- **Fun is a behavioural quality** — objects compress under your finger, resist, snap back
  with overshoot. Rewards accrue to the things you made.

That gives a veto rule running in both directions: anything decorating the *environment*
fails "paper stays quiet," and anything leaving an *interaction* inert fails "objects must
spring."

## Where things are

Three indexes, each rendered automatically when you open its folder. On GitHub you can also
**press `t`** anywhere in the repo and type part of a filename rather than remembering a path.

- **[`docs/`](docs/)** — design, architecture, and go-to-market. Grouped index with a
  "looking for something specific?" list at the bottom.
- **[`prototype/`](prototype/)** — what is live versus what is kept as reference, plus the code map.
- **[`prototype/README-buildnotes.md`](prototype/README-buildnotes.md)** — the build contract. Read
  before changing code.
- **[`CLAUDE.md`](CLAUDE.md)** — the conventions that already hold here, collected in one place.

## What lives here

- `docs/design-research-brief.md` — the evidence base: audit of the existing design system,
  exact palette values with computed contrast ratios for light and dark, motion tokens,
  breakpoints, and a Flutter-web checklist.
- `docs/design-direction.md` — the point of view. Overrules the brief in five places, each
  marked and reasoned.
- `docs/production-path.md` — what was changed so this can become the front end, what is
  still missing, and the review rules that keep the claim true.
- `prototype/` — the working prototype: a single-page app preview, the ten original static
  screens it was built from, and a design-system gallery.
- `prototype/README-buildnotes.md` — the build contract: CSS architecture, token naming,
  component classes, JS hooks, and (§12) the app architecture — data model, store API, how
  to add a route, how a view is structured.
- `prototype/assets/images/` — brand assets copied from the production app. They live inside
  `prototype/` so that directory is self-contained and can be deployed as-is.

## Scope

A preview of the working app, without the data flows. Creating a habit adds it to Home;
checking one in advances the day arc, raises the streak, reorders the list and can fire a
milestone. Binding a source produces a real draft Practice you have to read before you can
publish it, and a habit crafted from one of its lessons is attributed back to it.

Still **fixture data, in-session state, no backend, no network, no validation and no auth**
— but the seams for all of those now exist rather than being assumed. The conversion in
the Bindery is two hand-written corpora, not a model call.

## How to run

**It needs the local server. Double-clicking will not work** — the app is hand-written ES
modules, and ES modules do not load over `file://`.

```sh
node scripts/serve.js          # http://localhost:5173
node scripts/serve.js 8080     # pick a different port
```

Still no build step and no dependencies; the server uses only Node built-ins, no
`npm install`. GitHub Pages serves it over `http://` too, so the served path is the real
one.

The data layer runs without a browser at all:

```sh
node scripts/smoke.mjs         # asserts the rules the business depends on
```

That it *can* run is the point — it only works because the store talks to an adapter and
`render()` is pure. If it ever stops being runnable, the production seam has closed.

Then open **`http://localhost:5173/`** — the prototype harness. The app runs in a device
frame with a control bar around it: viewport (Mobile 390 · Tablet 768 · Desktop 1280 · Full
width), light/dark/auto, motion auto/reduce, an hour simulator for the after-20:00 state,
and Reset data. The bar is scaffolding and is styled plainly so it is never mistaken for
product.

| Path | What |
|---|---|
| `/` | the harness — the app in a resizable frame, with the review controls |
| `/app.html` | the app on its own, no scaffolding. What to screenshot. |
| `/system.html` | the design-system gallery — colour with live contrast ratios, type, every component state, the icon sprite, the motion moments |

The ten original static screens (`home.html`, `progress.html`, …) are still in the
directory. They are no longer reachable product — they are the reviewed markup reference the
app's views are built from.

### Screens

Home · Progress · Community · Create Habit · Profile · Explore · Library · Library Detail ·
Onboarding · Auth

And the knowledge layer the experiments add — the Bindery (bring a source · choose what to
make · bind · review and publish) · Practice reader · Studio · Spaces · Join.

### Switching experiments

The top bar inside the app switches between **Base**, **E1 Creators**, **E2 Communities**
and **E3 Consumers**. Switching does not reload: the nav, the surfaces and the money moment
change underneath you while you stand on the same screen. The harness bar carries the same
control.

Each configuration **opens on the decision its experiment is asking about**, not on Home:
creators land on "bring a source", community members on "join your community", consumers on
"what are you reading right now". These are discovery instruments — a participant who has to
be navigated to the thing under test has been shown it rather than finding it.

- `app.html?x=creator#/studio` — a shareable link to a screen in the state it should be
  reviewed in.
- `app.html?chrome=clean` — no switcher. **This is the URL to screenshot.**

Each configuration is a set of feature flags in `prototype/js/config.js`. A view asks
`flag('bindery')`; no view asks which experiment is running. When one of them wins, its
flags become the shipping configuration and the other three are deleted.

Every screen is responsive across 390 / 768 / 1280 in both light and dark. The navigation
renders as a bottom bar, a rail, an extended rail, or a drawer from identical markup.

## Deployment

Pushing to `main` publishes `prototype/` to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The workflow uploads the
directory as-is — there is no build — after checking that every screen the gallery links to
actually exists on disk.

To deploy manually, run the **Deploy prototype to GitHub Pages** workflow from the Actions
tab.

## A note on this repo being public

This repo is public so GitHub Pages can serve it for free. It contains design research and
static mockups only — no credentials, no production code, and no user data. Implementation
detail about the production app is tracked privately in the app repo.
