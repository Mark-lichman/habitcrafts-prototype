# prototype/

GitHub renders this when you open the folder. It exists because the most important file in here
does not render automatically and was easy to miss.

## The build contract

**[`README-buildnotes.md`](README-buildnotes.md)** — 73KB, and the file to read before changing
anything. CSS architecture, token naming, component class names, JS hooks, the signature moments
as built, the accessibility floor, and §12–13 on the app architecture: data shape, store API, how
to add a route, how a view is structured, and the two production seams.

## What is live, and what is reference

Everything in this folder is deployed to GitHub Pages, so the distinction is not obvious from the
file list. It matters:

**Live — this is the product.**

| File | What |
|---|---|
| `index.html` | The harness. Open this first. The app in a resizable device frame with the review controls around it. |
| `app.html` | The app on its own, no scaffolding. **What to screenshot.** |
| `system.html` | The design-system gallery: colour with live contrast ratios, type, every component state, the icon sprite, the motion moments. |

**Reference — not reachable product.**

`auth.html` · `community.html` · `create-habit.html` · `explore.html` · `home.html` ·
`library.html` · `library-detail.html` · `onboarding.html` · `profile.html` · `progress.html`

Ten static screens, about 450KB. They were the reviewed markup the SPA views were built from and
they are kept as that reference. **They are not wired to the router and changing them changes
nothing in the app.** If you are editing a screen, you want `js/views/`.

## The code

```
js/
  app.js              bootstrap: shell, the prototype.js bridge, state to view
  router.js           hash routing and the page transitions; the route table
  store.js            state, mutations, derived selectors
  config.js           which product is running: experiments as feature flags
  persistence.js      the swappable storage adapter
  ui.js               the small shared helpers every view uses
  data.js             habit-layer fixtures
  data-practices.js   knowledge-layer fixtures and the conversion simulation
  prototype.js        the behaviour layer: the press, the arc, the milestones
  views/              one file per route
css/
  tokens.css          then base.css, then components.css. Order matters.
```

## Running it

```sh
node ../scripts/serve.js        # http://localhost:5173
node ../scripts/smoke.mjs       # the data layer, no browser, no dependencies
```

**It needs the local server.** Double-clicking will not work: the app is hand-written ES modules
and those do not load over `file://`.
