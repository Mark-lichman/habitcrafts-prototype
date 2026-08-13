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

---

## 1. Files and load order

```
prototype/
  index.html              gallery / landing (has its own <style> block — do not copy it)
  home.html               the reference screen. COPY ITS SHELL AND NAV VERBATIM.
  progress.html           ← to build
  community.html          ← to build
  create-habit.html       ← to build
  profile.html            ← to build
  css/tokens.css          every design token. No component styles.
  css/base.css            reset, paper canvas + grain, type ramp, focus, reduced motion.
  css/components.css      the component kit + layout patterns.
  js/prototype.js         all behaviour. No per-page scripts.
```

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

### Hard constraints
- **Zero external dependencies.** No CDN, no webfont file, no remote image, no
  build step. Every file must open correctly by double-click from `file://`.
- Brand images are at `../assets/images/` (22 PNGs). Use them only for the logo
  and photographic content — **never as icons or chrome.** `bottomNavBackground.png`
  and the eight raster icon PNGs are dead; do not resurrect them.
- Icons are inline SVG `<symbol>` sprites on a 24px grid using `currentColor`.
  Copy the sprite block from the top of `home.html` and extend it. One family,
  one style. No emoji as interface elements.
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

### Laws that are easy to break by accident
- **No resting shadow on content.** Two elevation layers only: *paper* (canvas,
  cards — fill + hairline) and *floating* (nav, FAB, modals, hero, desktop
  hover-lift). `--shadow-xs` and `--shadow-sm` do not exist. In dark, all three
  shadow tokens resolve to `none`.
- **One `--c-hero-fill` surface per screen, maximum.** Home spends it on the
  streak card, Progress on the summary card. If your screen has two, one is wrong.
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
  titles, streak numerals, milestone headlines, empty-state headings, and the
  Create Habit step questions. Everything else — body, labels, buttons, nav — is
  `--font-ui`. `WONK` stays 0 everywhere except milestone cards.
- **Never put a spatial spring on a colour or opacity transition.** Use
  `--ease-standard` for colour. The overshoot produces a visible tint wobble.
- **Linear easing is banned except on progress bars.** The check-in hold fill is
  the sanctioned exception.
- **Nothing loops** except the single empty-state drift (`--dur-drift`, 4s).
- **Do not recolour the day arc when it sits on the hero.** `sage-600` on
  `brand-700` is 1.74:1 and fails 1.4.11, so the hero uses the role token
  `--c-arc-on-hero` (4.10:1 light / 5.0:1 dark). It stays *sage* on purpose, so
  the gold flush at completion is still a change rather than something already
  spent. Same principle anywhere a signal colour lands on the hero.

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
| `.nav-fab` · `.nav-fab__label` | The create action. brand-600 with a white glyph. Floats above the bar centre; moves to the rail/drawer top and becomes extended at 840. |
| `.app-nav__brand` (≥840) · `.app-nav__user` (≥1200) | Logo block and the pinned user block. |
| `.section-head` · `.skip-link` | Section title + trailing action; skip link to `#main`. |

**Copy the whole `<nav class="app-nav">` block from `home.html` unchanged** and
move `aria-current="page"` to your screen's item. Destinations are
Habits · Progress · Community · Profile, plus the FAB → `create-habit.html`.

*Documented deviation:* the shipping app's fourth tab is **Library**, not
Profile (Profile is a top-right button there). The prototype swaps it so all
five prototype screens are reachable without a dead link, since Library is out
of scope for this build. Do not "fix" this back — and if Library is ever added,
it takes the fourth slot and Profile returns to the header / drawer user block,
both of which already exist in `home.html`.

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
`.input` `.textarea` `.select`; `.text-link`; `.icon` (+`--sm` `--lg`).

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
| `.empty-state` · `__art` · `__art--drift` · `__title` · `__body` | Empty and done states. Flat two-colour SVG: brand-300 shapes, brand-700 linework, one sage or gold accent. |
| `.lesson-tile` · `__body` · `__kicker` · `.activity-row` · `.skeleton` | Home lesson tile, activity rows, no-shimmer skeleton. |
| `.devbar` · `.devbar__btn` · `.devbar__group` · `.devbar__reading` | Prototype control bar. **Copy it onto every screen** — copy the block from `home.html` verbatim. |

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

### Attribute reference

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
| `data-theme-btn="system\|light\|dark"` | button | Theme control. |
| `data-motion-btn="auto\|reduce"` | button | Forces the reduced-motion path for review. |
| `data-hour-input` / `data-hour-readout` | `<input type=range>` / `<output>` | Hour simulation, 0–23. |
| `data-demo="milestone"` `data-days="30"` | button | Fires the milestone moment. |
| `data-demo="reset"` | button | Un-checks every habit so the moment can be replayed. |
| `data-quick-checkin="true"` | `<html>` | The "Quick check-in (single tap)" accessibility setting — commits immediately on press. |

Attributes JS writes on `<html>`: `data-theme`, `data-motion`, `data-hour`, and
`data-hour-late="true\|false"` (the after-20:00 hero gradient hook). Add
`?frame=1` to a URL to strip the devbar for embedding.

### Public API

```js
HC.reducedMotion()            // boolean — OS preference OR the [data-motion] hook
HC.init(rootEl)               // wire newly-injected markup
HC.refreshDay()               // recount habits; repaint arcs, greeting, state panels
HC.setTheme('system'|'light'|'dark')
HC.setMotion('auto'|'reduce')
HC.setHour(0..23)
HC.fireMilestone({ days: 30 })
HC.announce('…')              // polite live region
HC.on('checkin'|'undo'|'daycomplete', fn)
```

Also dispatched on `document`, bubbling: `hc:checkin`, `hc:undo`, `hc:daycomplete`.

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

**Gilding.** Days 7 / 30 / 100 / 365 (day 50 is cut). The *moment* fires once
per session; the *mark* is permanent, cosmetic, and survives streak breaks.

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
for all the efforts you've been putting in."*

Streak language is repair and grace: *"You showed up for 42 days"* — **never**
*"You lost your 42-day streak."* No broken chains, no red missed days, no
confirmshaming. Missed days are simply empty.
