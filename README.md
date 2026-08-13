# HabitCrafts Prototype

The **design-exploration prototype** for the HabitCrafts redesign — research, design
direction, and clickable static mockups of every screen. Nothing in this repo ships
directly to users.

The **production app** is the Flutter repo at
[`Mark-lichman/HabitCrafts`](https://github.com/Mark-lichman/HabitCrafts) (private). Design
validated here gets re-implemented there in Flutter, tracked under the design-system epic.

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

## What lives here

- `docs/design-research-brief.md` — the evidence base: audit of the existing design system,
  exact palette values with computed contrast ratios for light and dark, motion tokens,
  breakpoints, and a Flutter-web checklist.
- `docs/design-direction.md` — the point of view. Overrules the brief in five places, each
  marked and reasoned.
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
milestone. But it is still **UI/UX only**: fixture data, in-session state, **no backend, no
network, no validation and no auth.**

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
