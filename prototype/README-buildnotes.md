# HabitCrafts prototype — build notes

**Read this plus `css/tokens.css` before writing a screen.** Together they are
sufficient; you should not need to re-read the design docs to stay consistent.
If this file and the docs disagree, `docs/design-direction.md` wins and this
file is wrong — say so.

The one-sentence idea: **a quiet paper studio where everything you touch springs
back, and the things you keep turn gold.** Everything you *look at* is paper
(warm parchment canvas, matte white cards, hairline borders, blue-as-ink, one
deep-blue hero surface per screen, grain not gloss). Everything you *touch* is a
spring (compresses, resists, snaps back with overshoot).

This is one document, not a base plus appendices. Every screen described here is
built; where a rule changed during the build the current rule is the one written
down, and the superseded one is gone rather than left below a divider.

---

## 1. Files and load order

```
prototype/
  index.html              gallery / landing (has its own <style> block — do not copy it)
  home.html               the reference screen. COPY ITS SHELL AND NAV VERBATIM.
  progress.html           the ledger
  community.html          groups, threads, the check-in feed
  create-habit.html       the workbench
  profile.html            the record
  explore.html            habit ideas
  library.html            the knowledge layer
  library-detail.html     the reading view
  onboarding.html         the welcome tour (logged out)
  auth.html               login / sign up / forgot password (logged out)
  css/tokens.css          every design token. No component styles.
  css/base.css            reset, paper canvas + grain, type ramp, focus, reduced motion.
  css/components.css      the component kit + layout patterns.
  js/prototype.js         all behaviour. No per-page scripts.
```

Eleven of the shipping app's fourteen screens have a design reference here.
`free_trial_screen` is deliberately **not** built — it is unreachable dead code
and ticket #60 deletes it.

Every page links exactly this, in this order — tokens, then base, then
components — and one script tag at the end of `<body>`:

```html
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/components.css">
...
<script src="js/prototype.js"></script>
```

**Do not add a fourth CSS file, and do not add per-page `<style>` blocks for
anything reusable.** If your screen needs a new component, add it to
`components.css` with a comment saying what it is and where it is used, in the
same house style as the sections already there. Screen-specific *layout* (a grid
of named areas that only Community has) may live in a small commented `<style>`
block in that screen, but prefer `.grid12` / `.panes--2` / `.panes--3` first.

### Three blocks are byte-identical on every page

The icon sprite (§8), the `<nav class="app-nav">` block (§3) and the first four
groups of the devbar (§3) are copy-paste identical across every file that
carries them — the only permitted variation is which nav item holds
`aria-current="page"`, and any extra devbar group a screen appends after the
fourth. A diff of any two screens should show only their content.

This is a rule with history: two parallel builds each grew their own copy of the
sprite, one of them redrawn in a solid family, and the drift was invisible until
the files were compared side by side. If you add an icon, add it to the block
and paste the whole block to every page. Never fork one page's copy.

### Hard constraints
- **Zero external dependencies.** No CDN, no webfont file, no remote image, no
  build step. Every file must open correctly by double-click from `file://`.
- Brand images are at `assets/images/` — 22 PNGs, inside `prototype/` so the directory is
  self-contained and deployable as-is. Use them only for the logo
  and photographic content — **never as icons or chrome.** `bottomNavBackground.png`
  and the eight raster icon PNGs are dead; do not resurrect them.
- Icons are inline SVG `<symbol>` sprites on a 24px grid using `currentColor`.
  One family, one style. No emoji as interface elements. See §8.
- **The palette is closed.** No new hex value anywhere. If you need a colour,
  it exists in `tokens.css` or it does not exist.

---

## 2. Token naming convention

| Prefix | What | Example |
|---|---|---|
| `--l-*` / `--d-*` | Raw palette, Daylight / Nightfall. **Never consume directly.** | `--l-brand-700` |
| `--c-*` | Semantic colour. **The only colours components use.** | `--c-ink-muted` |
| `--fs-` `--lh-` `--fw-` `--ls-` | Type: size, line-height, weight, tracking | `--fs-body-sm` |
| `--font-*`, `--fvs-*` | Font stacks, Fraunces variation settings | `--font-display` |
| `--space-N` | Spacing, value-named on the 8px grid: 4 8 12 16 24 32 48 64 | `--space-24` |
| `--radius-*` | xs 8 · sm 12 · md 16 · lg 24 · xl 32 · full 999 | `--radius-md` |
| `--stroke-*` | hairline 1 · control 1.5 · ring 3 · focus 2 | `--stroke-ring` |
| `--dur-*` | Durations | `--dur-base` (260ms) |
| `--ease-*` | Easing curves, incl. `--ease-spring-*` bezier approximations | `--ease-enter` |
| `--shadow-*` | md · lg · hero **only** | `--shadow-lg` |
| `--bp-*` | Breakpoints (documentation — media queries repeat the literals) | `--bp-md` |
| `--layout-*` | Shell metrics, gutters, max-widths | `--layout-content-max` |
| `--target-min` | 48px minimum interactive target, at every breakpoint | |

**Theme:** `tokens.css` maps `--c-*` in three places — `:root` (light),
`@media (prefers-color-scheme: dark) :root:not([data-theme="light"])`, and
`:root[data-theme="dark"]`. The last two are identical; **keep them in sync.**
A `[data-theme]` toggle therefore beats the OS preference in both directions.
Never write a `@media (prefers-color-scheme: dark)` block in a component file —
put the dark answer in the semantic mapping instead.

Two role tokens exist because a signal colour lands somewhere the raw palette
value fails:

- **`--c-arc-on-hero`** — the day arc's fill when it sits on the deep-blue hero.
  `sage-600` on `brand-700` is 1.74:1 and fails 1.4.11. Light 4.10:1, dark 5.0:1.
  It stays *sage* on purpose, so the gold flush at completion is still a change
  rather than something already spent.
- **`--c-illus-line`** — illustration linework. Light = `brand-700`, as the
  direction specifies. Dark = the brand tint: the direction's pairing names *the
  light canvas*, and in Nightfall `brand-700` becomes the hero blue, so a stem
  drawn in it would disappear into the canvas.

### Laws that are easy to break by accident
- **No resting shadow on content.** Two elevation layers only: *paper* (canvas,
  cards — fill + hairline) and *floating* (nav, FAB, modals, hero, desktop
  hover-lift). `--shadow-xs` and `--shadow-sm` do not exist. In dark, all three
  shadow tokens resolve to `none`.
- **One `--c-hero-fill` surface per screen, maximum.** Home spends it on the
  streak card, Progress on the summary card, Library on today's lesson,
  Library detail on the "Make it a habit" bridge. If your screen has two, one
  is wrong.
- **Gold is rationed.** Legal uses: the streak flame chip, milestone moments,
  gild marks, calendar milestone ticks, the nav's 3px selected pill, and the
  milestone card's single CTA. Never chrome fill, never a hairline (`gold-500`
  is 1.52:1 on canvas — filled shapes only), never text on light (use
  `--c-gold-700`).
- **Teal is retired.** Illustration compositions only. Never a UI fill, never
  text, never a chart series. Chart series are brand-500, sage-600, gold-700,
  clay-600 — four max, direct-labelled.
- **13px minimum text.** No exceptions. The `caption` token is 13px, not the
  11px the brief's table shows; it differs from `body-sm` by weight and tracking.
- **Fraunces (`--font-display`) is a daily voice**, not an event voice: h1 page
  titles, streak numerals, milestone headlines, empty-state headings, article
  titles, and the Create Habit step questions. Everything else — body, labels,
  buttons, nav — is `--font-ui`. `WONK` stays 0 everywhere except milestone cards.
- **Never put a spatial spring on a colour or opacity transition.** Use
  `--ease-standard` for colour. The overshoot produces a visible tint wobble.
- **Linear easing is banned except on progress bars.** The check-in hold fill is
  the sanctioned exception.
- **Nothing loops** except the single empty-state drift (`--dur-drift`, 4s).
- **Do not recolour the day arc when it sits on the hero.** Use
  `--c-arc-on-hero`. Same principle anywhere a signal colour lands on the hero.
- **A paper button on the hero needs `.hero .btn--secondary` / `.hero .btn--ghost`.**
  `.hero a` beats `.btn--*` on specificity, so an unqualified secondary button on
  the deep-blue surface renders white-on-white.

---

## 3. Component class names

BEM-ish: block `.card`, element `.card__title`, modifier `.card--hero`, state
`.is-complete`. States are always `.is-*`.

### Shell and navigation
| Class | What / where |
|---|---|
| `.app-shell` | Wraps nav + page. Handles the bottom-bar padding and the rail/drawer inset. |
| `.page` | Content column, max 1184px, centred, with the gutter. |
| `.page--wide` (1440) · `.page--read` (600) | Shell-width and reading-measure variants. |
| `.app-nav` | **One component, three shapes.** Bottom bar <600 → collapsed rail 600 → extended rail 840 → permanent drawer 1200. |
| `.app-nav__list` · `.nav-item` · `.nav-item__pill` · `.nav-item__label` | Destinations. Selected = `aria-current="page"` → brand-600 + the 3px gold pill. Never `opacity: 0.5`. |
| `.nav-li--rail` | On an `<li>`: hidden below 600, shown from 600 up. Explore and Library only. |
| `.nav-fab` · `.nav-fab__label` | The create action. brand-600 with a white glyph. Floats above the bar centre; moves to the rail/drawer top and becomes extended at 840. |
| `.app-nav__brand` (≥840) · `.app-nav__user` (≥1200) | Logo block and the pinned user block. |
| `.section-head` · `.page-head` `__text` `__sub` · `.page-back` (`--compact`) | Section title + trailing action; screen header; back / breadcrumb line. |
| `.skip-link` | Skip link to `#main`. |

**Copy the whole `<nav class="app-nav">` block from `home.html` unchanged** and
move `aria-current="page"` to your screen's item.

**Six destinations, four of them in the bottom bar.** Habits · Progress ·
Community · Explore · Library · Profile, plus the FAB → `create-habit.html`.
Explore and Library carry `.nav-li--rail` and are inserted after Community:
below 600 the bar has room for four destinations plus the FAB and no more, so
they are hidden there and reached in-page (Home's "Find a new habit", the
Library lesson tile, Create Habit's "Need inspiration?"). From 600 up the rail
has vertical room and they become real destinations. `components.css §E1`.

Below 600, Explore and Library carry a `.page-back--compact` link to Home, since
nothing in the bottom bar reads as current on those two screens. That is the
exact dead end `explore_habits_page` ships as today.

`create-habit.html` carries the nav with **nothing** marked current: it is a
task flow entered from the FAB, not a destination. `auth.html` and
`onboarding.html` are logged out and carry **no nav chrome at all** —
`.app-shell` is not used there. `index.html` is the gallery and has none either.

The back glyph is `#i-arrow-back`, a real left-pointing arrow in the sprite. Do
not rotate `#i-arrow` 180° to fake one.

### Surfaces
| Class | What |
|---|---|
| `.card` | The paper primitive. Fill + hairline + radius 16 + padding 16, no resting shadow. |
| `.card--interactive` | Adds the pointer-only hover lift (`translateY -1px` + `--shadow-md`, 120ms). |
| `.card--sunken` · `.card--tinted` · `.card--flush` · `.card--roomy` | Tone / no-padding / 24px-padding variants. |
| `.hero` | **The one deep-blue surface per screen.** Grain overlay built in; takes the after-20:00 gradient automatically. |
| `.hero--streak` · `.hero__numeral` · `.hero__label` · `.hero__body` | Bento layout + the Fraunces numeral and its supporting text. |
| `.scrim` · `.modal` · `.modal--wide` · `.modal--milestone` | Floating layer. `--shadow-lg`, spring-gentle entry. |

### Controls
`.btn` + `.btn--primary` `--secondary` `--ghost` `--danger` `--gold`, sizes
`.btn--sm` `.btn--block`; `.icon-btn`; `.chip` + `.chip--streak` `--sage`
`--brand`; `.segmented` + `.seg-btn`; `.field` `.field__label` `.field__help`
`.input` `.textarea` `.select`; `.field--reveal` + `.pw-toggle`; `.check`;
`.text-link`; `.icon` (+`--sm` `--lg`); `.switch`; the day/time picker.

### Habits and progress
| Class | What |
|---|---|
| `.habit-list` | The list. Single column at xs; a max-400px grid at md+. Completed items sink to the bottom via `order`. |
| `.habit-card` | 72px min height, ring at the right edge. States: `.is-pressed`, `.is-abandoning`, `.is-complete`. |
| `.habit-card__title` (h3) · `__meta` (13px) · `__echo` · `__undo` | The 10px text is abolished; `__meta` is the 13px prompt line. |
| `.habit-card--gild-7 / -30 / -100 / -365` | The permanent gild marks: corner tick → inner hairline → seal → solid seal. |
| `.seal` · `.seal--solid` · `.seal--lg` | The embossed rosette. |
| `.ring` · `.ring__svg` `__track` `__fill` `__check` `__hint` | The check-in ring. See §4 for the exact markup — JS depends on it. |
| `.day-arc` · `__svg` `__track` `__fill` `__glint` `__count` | The 270° day arc. States `.is-complete`, `.is-glinting`. |
| `.spark-field` · `.spark` · `.spark--b` | Check-in flecks. Created by JS; you never write these. |
| `.stat-tile` · `__value` · `__label` | Progress stat tiles. |
| `.cal-grid` · `.cal-cell` + `--done` `--partial` `--milestone` · `.cal-cell__glyph` | Calendar with three redundant states. **Every cell needs `role="img"` and a per-cell `aria-label` ("Mon Aug 10, completed").** Never colour alone. |
| `.avatar` · `--lg` · `.avatar-stack` | Community member stacks. |
| `.empty-state` · `__title` · `__body` · `--compact` · `--inline` | Empty and done states. The artwork is `.illus` (§9) — there is no `__art` class. `--compact` is 96px art for panes; `--inline` is 84px for a pane's own inbox. |
| `.lesson-tile` · `__body` · `__kicker` · `.activity-row` · `.skeleton` | Home lesson tile, activity rows, no-shimmer skeleton. |
| `.repair` + `--freeze` `--grace` `--decay` · `__now` · `__readout` | Streak repair. |
| `.devbar` · `.devbar__btn` · `.devbar__group` · `.devbar__reading` | Prototype control bar. See below. |

### Explore · Library · Reading · Onboarding · Auth
| Class | What |
|---|---|
| `.browse-layout` · `.browse-rail` `__title` | Filter rail 240px at 840+ / content |
| `.cat-list` · `.cat-btn` `__count` · `.subcat-row` · `.subcat-btn` | One `<ul>`: pill scroller <840, vertical rail 840+ |
| `.idea-grid` · `.idea-card` `__title` `__prompt` `__foot` `__cue` · `.is-taken` | Explore habit ideas |
| `.idea-preview__lead` `__section` `__label` `__actions` · `.modal--wide` | The idea dialog |
| `.lib-hero` `__body` `__side` `__kicker` `__title` `__actions` · `.week-meter` `__bar` `__fill` `__label` | Library hero (today's lesson) |
| `.lesson-list` · `.lesson-row` `__num` `__body` `__title` `__meta` `__chev` + `.is-read` `.is-current` | Ordered lessons |
| `.week-fold` (`<details>`) `__meta` `__chev` `__body` | Earlier weeks, zero JS |
| `.res-grid` · `.res-card` `__type` `__foot` | Resources |
| `.read-layout` · `.read-toc` `__title` `__list` `__link` · `.article` `__meta` `__title` `__standfirst` `__body` `__quote` · `.read-bridge` · `.read-nav` | Reading view |
| `.ob-page` `.ob-top` `.ob-brand` `.ob-card` `.ob-stage` `.ob-slide` `__art` `__text` `__title` `__body` · `.ob-foot` · `.ob-dots` `.ob-dot` | Onboarding |
| `.auth` `__poster` `__brand` `__line` `__sub` `__art` `__panel` `__form` `__title` `__intro` `__fields` `__row` `__actions` `__switch` `__legal` | Auth |

`.article` is capped at `--layout-read-max` (600px) at **every** width — 390,
768, 1280 and 1920 all measure 600. A wide window adds the sticky contents list
beside the column, never a wider column. The third grid track is `1fr` exactly
so the reading column never loses when space is tight.

### The devbar
Scaffolding, not product; it deletes with the Flutter migration. **The first
four groups — Theme, hour slider, Motion, Reset day — are byte-identical on
every page that has one.** A screen may append its own demo groups after them,
and only ones its own markup supports, so a control is never present with
nothing to control: Home and Progress add Moments + Loading + Empty, Community
adds its Empty toggle, Create Habit adds "5+ habits". Below 600 the bar stays a
**single horizontally scrolling row** — it must not wrap; a screen carrying all
the demo controls wrapped to five rows at 390 and covered the very thing the bar
exists to inspect. `?frame=1` on any URL strips it entirely.

*Known gap:* `index.html` still carries the pre-reconciliation three-group bar
(no Reset day). The gallery is owned by a separate pass; fold it in there.

### Typography and utilities (base.css)
`.t-display .t-h1 .t-h2 .t-h3 .t-body-lg .t-body .t-body-sm .t-label .t-caption`
· colours `.t-ink-strong .t-ink .t-muted .t-subtle .t-brand .t-sage .t-gold .t-clay`
· `.t-measure` · `.visually-hidden` · `.u-stack .u-stack-8 .u-stack-24`
· `.u-flow .u-flow-tight .u-between .u-wrap .u-grow .u-hide`

### Layout patterns
`.grid12` — 4 columns at xs/sm, 12 at md+; children span full width by default,
take `.span-3 … .span-12` from md up. `.panes .panes--2` (280px | flex at md+),
`.panes .panes--3` (280px | flex | 300px at lg+). `.home-grid` +
`__main` `__aside` `__activity` is Home-specific; use it as the model.

### Breakpoints — use exactly these, nothing else
`600` bottom bar → rail · `840` collapsed rail → extended rail, and the 3-pane
switch · `1200` rail → permanent drawer, and the third column · `480` and `1600`
exist in the tokens but nothing currently branches on them.

**Desktop must be a different layout, not a bigger phone.** The current app's
767px clamp is the specific failure this redesign exists to kill. No centred
phone column with dead margins at 1280px.

---

## 4. JS hooks

`js/prototype.js` keys off **data attributes only**, never class names, so you
can restyle freely. It self-boots on `DOMContentLoaded` and wires the whole
document; call `HC.init(el)` after injecting markup.

The file is one core module plus four appended modules (Progress, Community,
Create Habit + Profile, primitives, remaining screens). Each chains onto
`HC.init` behind its own guard flag rather than editing the core, so a module
can be deleted and the prototype falls back gracefully. **One hook is owned by
exactly one module** — if you find yourself writing a second handler for an
attribute that already has one, you are creating the drift this file exists to
prevent.

### The check-in ring — copy this markup exactly

```html
<article class="card habit-card" data-habit data-celebration="Fist pump!">
  <div class="habit-card__body">
    <h3 class="habit-card__title">Meditate for two minutes</h3>
    <p class="habit-card__meta">After I pour my morning coffee · 112 day streak</p>
    <p class="habit-card__echo" data-echo hidden></p>
  </div>
  <button class="btn btn--ghost btn--sm habit-card__undo" type="button" data-undo hidden>Undo</button>
  <button class="ring" type="button" data-checkin aria-pressed="false"
          aria-label="Check in: Meditate for two minutes. Press and hold to complete.">
    <svg class="ring__svg" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
      <circle class="ring__track" cx="22" cy="22" r="16" pathLength="100"/>
      <circle class="ring__fill"  cx="22" cy="22" r="16" pathLength="100"/>
      <path   class="ring__check" d="M14.6 22.4l5.1 5.1 9.7-10.6" pathLength="100"/>
    </svg>
    <span class="ring__hint" data-ring-hint hidden>Hold to check in</span>
  </button>
</article>
```

`pathLength="100"` is load-bearing: it normalises every stroke so progress is
literally a percentage (`stroke-dashoffset = 100 − percent`). Keep it on all
three shapes and on every day-arc path.

### Attribute reference — the day
| Attribute | On | Effect |
|---|---|---|
| `data-habit` | habit card | Registers the card. Counted by the day arc. Use `data-habit="preview"` for a non-counting demo/preview card (Create Habit's live preview should use this). |
| `data-celebration="…"` | habit card | The user's own "How will you celebrate?" answer. Unfurls verbatim at commit. |
| `data-checkin` | the ring `<button>` | Wires press-and-hold. Mouse, touch and keyboard (hold Space/Enter). |
| `data-echo` | `<p>` in the card | Where the celebration text is written. |
| `data-undo` | `<button>` in the card | Inline Undo. Shown for 5s after commit; stays while focused. |
| `data-ring-hint` | `<span>` in the ring | The one-per-session "Hold to check in." tooltip. |
| `data-day-arc` | `.day-arc` | Auto-filled from the habit count. Any number of arcs per page stay in sync. |
| `data-arc-done` / `data-arc-total` | inside the arc | Text nodes updated with the counts. |
| `data-greeting` `data-name="Mark"` | the greeting element | Hour-aware greeting; crossfades to the done-for-the-day copy when the last habit lands. |
| `data-when-complete` / `data-when-incomplete` / `data-when-empty` | any element | Auto-shown/hidden as the day state changes. |
| `data-quick-checkin="true"` | `<html>` | The "Quick check-in (single tap)" accessibility setting — commits immediately on press. |

### Attribute reference — screens
| Attribute | Owner | Effect |
|---|---|---|
| `data-tabs` / `data-tab="x"` / `data-tabpanel="x"` | Progress module | The segmented control as a real ARIA tablist: click, arrows, Home, End, roving tabindex, panel fade. Container-scoped, so several tablists can coexist on a page. Used by Progress, Community and Library. |
| `data-cal` `data-cal-step` `data-cal-month` `data-cal-name` `data-cal-label` | Progress module | Calendar month stepper. |
| `data-workspace` + `data-view="list\|thread\|detail"` · `data-view-set` | Community | Which pane is on screen <840. |
| `data-group-select="id"` + `data-group-panel="id"` | Community | List selection → panes. |
| `data-filter-input` + `data-filter-scope` / `data-filter-list` / `data-filter-name` | Community | In-pane search. |
| `data-disclosure="x"` · `data-invite-*` · `data-composer*` · `data-reply-*` | Community | Invitations inbox, composer, reply chip. |
| `data-craft` · `data-pane-tab` / `data-pane-back` | Create Habit / Profile | The workbench; the Profile 2-pane category tabs (a separate contract from `data-tab` on purpose — the panes behave differently below 600). |
| `data-modal-open="id"` / `data-modal="id"` / `data-modal-close` | Create Habit / Profile | The modal opener, Escape and focus restore. |
| `data-cat-list` + `data-cat` · `data-idea-grid` + `data-cats` / `data-sub` · `data-sub` · `data-idea-heading` `data-idea-count` `data-idea-empty` `data-idea-search` | Remaining screens | Explore's category rail (an ARIA tablist with arrows, Home, End), the idea grid and its filtering. |
| `data-modal-open="idea"` + `data-behavior` `data-prompt` `data-celebration` `data-why` `data-taken` | Remaining screens | Fills the `[data-idea-field]` slots in the **capture** phase, then the kit's existing `[data-modal-open]` opener does the opening. |
| `data-ob-stage` `data-ob-slide` `data-ob-go` `data-ob-prev` `data-ob-next` `data-ob-done` | Remaining screens | Onboarding paging. |
| `data-auth-view` `data-auth-go` `data-auth-form` `data-auth-sent` `data-pw-toggle` | Remaining screens | The three auth views, reveal toggle, reset confirmation. |

### Attribute reference — prototype controls
| Attribute | On | Effect |
|---|---|---|
| `data-theme-btn="system\|light\|dark"` | button | Theme control. |
| `data-motion-btn="auto\|reduce"` | button | Forces the reduced-motion path for review. |
| `data-hour-input` / `data-hour-readout` | `<input type=range>` / `<output>` | Hour simulation, 0–23. |
| `data-demo="reset"` | button | Un-checks every habit so the moment can be replayed. |
| `data-demo="milestone"` `data-days="100"` | button | **First press per session = the full celebration; every press after it = the quiet streak-increment treatment.** The control demonstrates the rule rather than dodging it. |
| `data-demo="milestone-replay"` | button | Clears the once-per-session latch so a reviewer can watch the full thing again. |
| `data-demo="load"` / `"load-fast"` | button | Simulates a 1400ms load (skeleton appears at 400ms) / a 250ms load — **nothing is shown at all.** That is the rule, made visible. |
| `data-demo="empty"` | button (`aria-pressed`) | Swaps the screen for its empty state. |
| `data-demo="crowded"` | button (`aria-pressed`) | Create Habit's 5+ habits state. |
| `data-skeleton="list\|panel"` | the content container | Marks what the skeleton stands in for and which template to paint. |
| `data-empty-demo` / `data-empty-demo-hide` | the empty state / the populated content | Shown / hidden while the Empty toggle is on. |
| `data-repair` `data-repair-run` `data-repair-now` `data-repair-readout` | the repair card | Scopes and runs the decay demonstration. |

Attributes JS writes on `<html>`: `data-theme`, `data-motion`, `data-hour`, and
`data-hour-late="true\|false"` (the after-20:00 hero gradient hook). Written by
JS, not authored: `[data-milestone]` on the milestone scrim, `[data-ms-count]`,
`[data-ms-dismiss]`, `[data-skeleton-paint]`, `.confetti-piece`,
`.is-streak-flush`.

### Public API

```js
HC.reducedMotion()            // boolean — OS preference OR the [data-motion] hook
HC.init(rootEl)               // wire newly-injected markup
HC.refreshDay()               // recount habits; repaint arcs, greeting, state panels
HC.setTheme('system'|'light'|'dark')
HC.setMotion('auto'|'reduce')
HC.setHour(0..23)
HC.fireMilestone({ days, replay })
HC.announce('…')              // polite live region
HC.on('checkin'|'undo'|'daycomplete', fn)
```

Also dispatched on `document`, bubbling: `hc:checkin`, `hc:undo`, `hc:daycomplete`.

`HC.fireMilestone` is **reassigned** by the primitives module rather than edited
in place, and the `[data-demo^="milestone"]` buttons are intercepted in the
**capture phase** so the core's stub never runs. Delete that module and the
prototype falls back to the original with nothing broken.

---

## 5. The signature moments, as built

**The press (≈450ms hold).** Pointer-down: card 1.0 → 0.97 over 120ms; ring
fills clockwise, *linearly*, 1:1 with hold time, crossfading brand-500 → sage-600.
Release early: the fill runs backward at 2× and the card springs back on
spring-snap — no penalty, no message, interruptible at any millisecond. Commit:
the checkmark draws over 200ms, the card releases 0.97 → 1.0 on the spring-bounce
bezier, 6–8 sage/gold flecks fly 24px and fade over 400ms, and the card
crossfades to sage-100 over 240ms. A tap gets a 2px wobble and a one-time
tooltip — never an error state.

*Two documented judgement calls.* (a) The spring-bounce bezier's overshoot is
~9% **of the travel**, and the travel is only 0.03 of scale, so on its own it is
nearly invisible. The card keeps the literal spec; the **ring** additionally gets
a real ~8% reward pop (`--overshoot`), which is where the visible spring lives.
(b) Under reduced motion the ring fill is **kept** — it is the only feedback that
a hold is in progress, and a stroke-length change is not a vestibular trigger.
What goes is the scale, the spring and the flecks, exactly as specified.

**Your own words back.** The celebration text unfurls under the title, fading
and rising 8px over 240ms, holds 5s beside an inline Undo, then settles.
**There is no snackbar in this system.** Do not add one.

**Closing the day.** Each check-in fills the arc over 260ms. On the last one the
arc closes, a 40%-white glint travels it once over 600ms, it flushes
sage-600 → gold-500 over 300ms, and the greeting crossfades to *"That's
everything. Go enjoy your day."* (after 20:00: *"…Sleep well."*). Then the app
goes quiet — no modal, no confetti, no share prompt.

**Milestone.** Days 7 / 30 / 100 / 365 (day 50 is cut). Scrim 40% (the
`--c-scrim` token *is* 40%) · card enters on `--ease-spring-gentle` at its paired
650ms · **34 confetti pieces** (cap 40) released along the card's *top edge* in a
60° cone, and a single sweep timer guarantees the DOM is clean at **1100ms**
rather than trusting the animations · numeral counts up in the display serif with
`WONK 1` · auto-dismiss at **4000ms**, or tap, or Escape · focus lands on the CTA
and returns to the opener. **Reduced motion: no confetti is created at all, the
card crossfades (`hc-fade-in`), the numeral renders at its final value.** That
CSS override is load-bearing, not belt-and-braces: the entry animation moves with
the independent `scale`/`translate` properties, which the global `transform: none`
block does not touch. Anything in this system animating with `scale` or
`translate` needs the same treatment. The card's entry lives in `components.css`
§P3 and **only** there — §17 defines its box, nothing more.

The *moment* fires once per session; the *mark* is permanent.

**Gilding.** All four tiers sit side by side on Home (365 · 100 · 30 · 7 ·
none), each labelled with a `.gild-note` — prototype scaffolding, delete for
Flutter. The marks compose with every other card state by construction: the
tick is `::after`, the hairline is an *inset* `box-shadow`, and the seal is a
real element — while `.is-complete` only sets `background` and `border-color`,
so it cannot clobber any of them. Verified: a day-100 habit completed today
shows the sage tone, the gold hairline, the seal and the ring check at once.
The mark is cosmetic and survives streak breaks.

**Skeleton.** Under 400ms **nothing** — not a skeleton, not the content.
Beyond 400ms, static blocks in `canvas-sunken` at the container's own radii
(`.skeleton-card` is 72px pitch / 16px padding / radius-16, identical to the
real card) with one 0.7 → 1.0 pulse, 1200ms `ease-in-out alternate`, in phase.
No shimmer. Reduced motion: `animation: none`, `opacity: 1`.

**Streak repair.** `.repair` with three rows — `--freeze` (sage, shield),
`--grace` (amber; amber is care, not alarm — no clay, no red anywhere on this
component) and `--decay` (the bar goes *down a little* and never to zero).
Copy is "You showed up for 42 days straight." Zero broken-chain icons, zero red
missed days.

**The room dims.** After 20:00 the greeting changes and the hero takes a
two-stop gradient under its grain. Nothing else. Layout identical.

---

## 6. Accessibility floor

- Semantic landmarks on every screen: `<nav aria-label="Primary">`,
  `<main id="main">`, a `.skip-link`, and `aria-labelledby` on major sections.
- 48px minimum interactive target at every breakpoint.
- Focus is `:focus-visible`, 2px `--c-border-focus` at 2px offset, and
  **instant** — never animate a focus ring.
- Everything is keyboard-operable. Every swipe needs a visible non-gesture
  equivalent; the ring is that equivalent for completion.
- Never encode state by colour alone — add a glyph, a fill difference, a
  lightness step that survives grayscale, and a per-item label.
- Every animated thing needs its `prefers-reduced-motion` branch **built, not
  promised**. In CSS the global block in `base.css` kills transforms and keeps
  opacity/colour; in JS branch on `HC.reducedMotion()`.
- No timed content under 5s that carries meaning; the Undo persists while focused.

## 7. Copy voice

Second person, short, supportive. Real strings from the product: *"Keep it
small, you can always do more."* · *"What will you do?"* · *"When will you do
the behavior?"* · *"How will you celebrate?"* · *"What will success look
like?"* · *"Need inspiration? Click here for ideas."* · *"Give yourself credit
for all the efforts you've been putting in."* · *"Habit Ideas"* · *"Get inspired
to cultivate positive habits."* · *"Make it a habit"* · *"Let's start by creating
your first habit."* · *"Get Started"* · *"Login"* · *"Sign Up"* · *"Sign up
with"* · *"Forgot Password"* · *"Send Reset Link"*.

Streak language is repair and grace: *"You showed up for 42 days"* — **never**
*"You lost your 42-day streak."* No broken chains, no red missed days, no
confirmshaming. Missed days are simply empty.

**Rewritten because the original is broken, not because it was disliked:**
1. **Onboarding slide 2 body.** The shipping copy says partnerships foster
   *"emotional detachment"* — the opposite of the screen's point — in 30 words
   of jargon. Rewritten in product voice.
2. **Forgot-password body.** It promises *"a verification code"* while its own
   button says *"Send Reset Link"* and the backend sends a link. The button was
   right, so the body now matches it.
3. **The Explore category expander's lorem ipsum** is not reproduced.
4. **"Habit Craft"** (spaced) and the `'Login\n'` / `'Sign Up\n'` trailing
   newlines from `initial_page` are not reproduced; the wordmark is HabitCrafts.
5. **No `$99.00/year` and no `0.00 / month`** anywhere — that copy lives only in
   the dead free-trial screen, which is not built.

Category, subcategory, lesson and resource names are **invented fixtures**: the
app has no seed file and every one of those strings is Firestore content. The
*shape* is real — each habit idea carries the four fields the `habits`
collection actually stores (`behavior` · `prompt` · `celebration` · `why`).

---

## 8. Iconography — the sprite

One family, one style: **hand-authored, outlined, fill-0, rounded terminals,
1.7px stroke, 24 × 24 grid, `currentColor`.** No Material Symbols file, no
Lucide, no raster, no emoji-as-UI — the direction says "or Lucide if bundling is
easier, but pick one and use it exclusively", and with zero dependencies allowed
the only way to have one family is to draw it. Icons inherit `--c-ink-muted`
from `.icon` at rest and `brand-600` from their selected parent.

**41 symbols. The block is canonical and byte-identical on all eleven files.**

`i-habits` `i-progress` `i-community` `i-explore` `i-library` `i-person` ·
`i-plus` `i-close` `i-check` `i-tick` `i-search` `i-send` `i-invite` ·
`i-arrow` `i-chevron` `i-chev-right` `i-chev-left` `i-back` `i-arrow-back` ·
`i-flame` `i-calendar` `i-clock` `i-bell` `i-bulb` `i-goal` `i-target`
`i-info` `i-lock` `i-key` `i-eye` `i-archive` `i-shield` `i-leaf`
`i-accessibility` `i-contrast` · `i-doc` `i-play` `i-worksheet` ·
`i-rosette` `i-google` `i-apple`

Notes: `i-tick`/`i-check`, `i-back`/`i-arrow` and `i-chevron`/`i-chev-right`
are deliberate aliases carrying identical geometry, so two screens naming the
same glyph differently can never diverge. `i-arrow-back` is a genuine left arrow
and is **not** an alias — `.page-back` used to rotate `i-arrow` 180°, which meant
`auth.html`'s own back button carried an inline `rotate:none` to undo it.

**Three deliberately solid symbols, each with a reason.** `i-rosette` is the
gild seal's emboss, not an icon, and `.seal` / `.seal--solid` colour it [D §2.4].
`i-google` and `i-apple` are third-party wordmarks — not ours to redraw as
outlines, and unrecognisable if we do. Nothing else may be added solid.
`i-contrast` carries one filled half-disc inside an outlined disc because the
fill *is* the meaning; it stays in the family.

**The stroke attributes live on an inner `<g>`, never on the `<symbol>`.**
`base.css` has a global `svg { fill: currentColor }`, and a document CSS rule
beats a presentation attribute on the cloned symbol element itself — put
`fill="none"` on the `<symbol>` and every icon fills solid.

---

## 9. Illustration system

| Class | What |
|---|---|
| `.illus` | The artwork root. 132px, `viewBox="0 0 120 120"`, `role="img"` + `aria-label`. |
| `.illus__shape` | brand-300 fill + linework stroke. The object. |
| `.illus__line` | Linework only, no fill. Stems, threads, rules. |
| `.illus__ground` | The stone/shadow it rests on — flat brand-300 at 55%, no stroke. |
| `.illus__accent` | **One per illustration, maximum.** Sage by default. |
| `.illus__accent--gold` | The accent in gold, for reward states. Filled, never a hairline. |
| `.illus__drift` | Wrap the leaf in this `<g>`. 4s, one axis, ±4px, `alternate`, infinite. |

The two-colour rule is enforced in CSS rather than retyped as inline fills, so
every illustration re-tones itself in Nightfall with no second artwork. See
`--c-illus-line` in §2.

**`.illus` is the only way to draw one.** There used to be a second way —
`.empty-state__art` sized the svg, `.empty-state__art--drift` looped it, and
each path carried `fill="var(--c-brand-300)"` / `stroke="var(--c-brand-700)"`
inline. That version could not re-tone: `brand-700` linework *is* the hero blue
in Nightfall, so those illustrations lost their outlines against the dark
canvas. All of them (Community ×2, Profile, Library, Explore, and the gallery's
demo tile) now carry the classes, `.empty-state__art*` is gone, and so is the
duplicate `hc-drift` keyframe it owned.

`.illus__drift` is **the only looping animation in the product.** It has
explicit `animation: none` kills in both reduced-motion branches, and they live
in `components.css` §P1 beside the animation — the global `base.css` block would
otherwise leave the leaf parked 4px off its drawn position, because it caps
duration and iteration rather than stopping it. Wrap only the growing thing in
the `<g>`, never the whole drawing: the stone stays planted.

Empty states built: Home *(no habits)*, Home *(day complete)*, Progress *(no
history yet)*, Community *(no groups)*, Community *(inbox empty)*, Community
*(no messages)*, Profile *(no blocked users)*, Explore *(no results)*, Library
*(empty collection)*. Each is illustration + heading + at most **one** CTA.

**Auth's poster and the onboarding slide art are deliberately not `.illus`.**
They sit on the deep-blue surface and on the onboarding card, so they are drawn
in `--c-hero-ink` / `--c-hero-ink-muted` — `.illus__shape`'s brand-300 on
brand-700 would be near-invisible. They still consume semantic tokens and still
re-tone; do not "fix" them onto the illustration classes.

---

## 10. Defects the redesign fixes

- Onboarding's page indicator (`dotColor == activeDotColor == #D9D9D9`): the
  active dot is now `brand-600` and 24px, inactive `--c-border` and 8px — a
  colour step **and** a width step, plus `aria-current`.
- Onboarding slides 1 and 2 are swipe-only with no affordance: every step now
  has visible Back / Next / Skip controls, jumpable dots, and arrow keys.
- Login has no "Forgot password?" and no "Sign up"; signup has no "Log in" and
  no terms gate despite `eulaAccepted` existing in app state. All present here.
- `forgot_password` is orphaned — nothing links to it — and uses a completely
  different visual language. It is now one of three views in one shell.
- Signup's social buttons ship with `text: ''`, so they have no accessible
  name. Labelled here.
- `library_detail_page` is the only white-background page in the app and has no
  bridge into habit creation; it keeps the parchment canvas here and ends on
  the "Make it a habit" hero.
- `explore_habits_page` has no bottom nav — a dead end. It is a real
  destination with a rail slot and a compact back link.
- The 767px desktop clamp. See §3, breakpoints.

---

## 11. Prototype scope, stated

Fixture data is inline in the HTML. There is **no data layer, no fake API, no
persistence, no form validation and no auth.** The loading state is a timer on a
button, the empty state is a toggle, and "one celebration per session" is a
single boolean. A real build owns all three properly, plus the parts
deliberately not built here: load failure and retry, a genuine focus trap for a
multi-control modal, freeze-day accrual, and the actual decay curve.

*(Pre-existing: the core does persist theme/motion in `localStorage`. It will
carry across pages during review.)*

Known gaps a later pass should close, listed rather than papered over:
- `index.html` is owned by the gallery pass. Its devbar is still the old
  three-group one, and it does not link to `auth.html` or `onboarding.html`, so
  those two screens are currently reachable only by typing the filename.
- Several `href="#"` placeholders remain where the destination screen is
  genuinely out of scope: Community's "Create" group and "Want to start a
  group?", Profile's "Open device settings".
