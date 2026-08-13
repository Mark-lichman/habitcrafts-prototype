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
- `prototype/` — the working prototype: ten screens plus a design-system gallery.
- `prototype/README-buildnotes.md` — the build contract: CSS architecture, token naming,
  component classes, JS hooks.
- `assets/images/` — brand assets copied from the production app.

## Scope

Prototype means **minimal data model, scripted interactions, and UI/UX only.** Fixture data
is hardcoded. There is no data layer, no persistence, and no validation. Interactions are
scripted to demonstrate the design, not to be generally correct.

## How to view

Start at the **design-system gallery** — `prototype/index.html`. It documents the whole
system (colour with live-measured contrast ratios, type, components in every state, the
icon sprite, motion moments each with a reduced-motion variant) and links every screen.

No build step, no dependencies. Double-click `prototype/index.html`, or serve it locally:

```sh
node scripts/serve.js          # http://localhost:5173
node scripts/serve.js 8080     # pick a different port
```

The server uses only Node built-ins — no `npm install`.

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
