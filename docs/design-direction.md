# HabitCrafts — Design Direction

**Version:** 1.0 · **Date:** 2026-08-12
**Author:** Design direction (this document is the point of view; the research brief at
`design-research-brief.md` is the evidence base)
**Feeds:** the HTML/CSS prototype, then the Flutter migration

This document decides things. Where the brief says "consider," this says "do this." Where the
brief's recommendation survives review, it is restated here in build terms so the prototype
builder knows it is intentional, not inherited. Where I overrule the brief, the section is
marked **[OVERRULES BRIEF]** with reasoning.

---

## 1. The central design idea

**Paper and springs.** Everything you *look at* is paper: a warm parchment canvas, matte white
cards with hairline borders, soft ink-blue text, one deep-blue hero surface per screen, grain
instead of gloss. Everything you *touch* is a spring: it compresses under your finger, resists
slightly, snaps back with a little overshoot, and answers in your hand with a haptic. Calm and
fun stop fighting because they live in different channels — **calm is a material quality
(color, texture, spacing, stillness at rest), fun is a behavioral quality (physics, sound-in-hand,
reward events)**. The environment never entertains; the objects never sit dead. This resolves
arguments mechanically: any proposal that decorates the environment (a gradient background, an
ambient animation, a second accent in the chrome) is vetoed by "paper stays quiet." Any proposal
that leaves an interaction inert (a tap with no press state, a completion with no spring) is
vetoed by "objects must spring." The name earns its keep too: HabitCrafts is about *making*
things — a habit is a small object you craft (the app's own creation flow literally asks "What
will you do? When? How will you celebrate?"), and the reward system is watching the things you
made accumulate wear and gilding over time. Gold is not a paint color; it is what long-kept
things earn.

One sentence for the wall: **a quiet paper studio where everything you touch springs back, and
the things you keep turn gold.**

---

## 2. Signature moments

These five are the interactions a user describes to a friend. Build them exactly; everything
else in the app can be ordinary.

### 2.1 The press — checking in **[OVERRULES BRIEF M1: hold, not tap]**

The core gesture is **press-and-hold, ~450ms**, on the ring at the right edge of the habit card.

- **t=0 (pointer down):** `selectionClick()` haptic. Card scales 1.0 → 0.97 over 120ms
  `ease-standard`. The ring's stroke begins to fill clockwise, **linearly**, mapped 1:1 to hold
  time (linear is correct here — the fill *is* a progress bar for the hold).
- **t=0–450 (holding):** ring stroke sweeps 0 → 100%, color `brand-500 → sage-600` crossfading
  over the sweep. At 50% a second `selectionClick()`.
- **Release early:** the fill runs backward at 2× speed, card springs back to 1.0 with
  `spring-snap`. No penalty, no message. The gesture is fully interruptible — this is what makes
  it feel like a real object and not a loading bar.
- **t=450 (commit):** `lightImpact()` haptic. Checkmark path draws over 200ms `ease-enter`. Card
  releases 0.97 → 1.0 with `spring-bounce` (~8% overshoot, ~300ms). 6–8 particles (3px,
  `sage-500` + `gold-500`) fly radially 24px and fade over 400ms `ease-exit`. Card fill
  crossfades `surface → sage-100`, title `ink → ink-muted`, 240ms.
- **Tap without hold:** the ring does a 2px wobble (`spring-snap`, one cycle) and a one-time
  tooltip says "Hold to check in." Never an error state.
- **Total ≤ 700ms after release. Never blocks the next press.**

Why hold instead of the brief's tap: it makes accidental completion nearly impossible (which
lets us kill the interruptive undo snackbar — see 2.2), it converts the most frequent action
from a checkbox into a small deliberate ritual, and it is the pattern the only Apple Design
Award-winning habit tracker (Streaks) is built on. The brief's own research says the cliché to
avoid there is the *look* of colored circles, not the hold gesture. Accessibility: the hold is a
single-pointer path so WCAG 2.5.1 is satisfied; add a Settings toggle "Quick check-in (single
tap)" for motor accessibility; screen readers and keyboard (`Space` held / `Enter` with the
quick setting) activate directly. Reduced motion: haptics + 120ms color crossfade + checkmark
appears; no scale, no spring, no particles.

### 2.2 Your own words back — the celebration echo

Create Habit already asks every user **"How will you celebrate?"** — and then buries their
answer in 10px text. Instead: at the commit moment (2.1), a line unfurls inside the card under
the title — **the user's own celebration text, verbatim** — e.g. *"Fist pump!"* — in Fraunces
italic, `sage-700`, fading + rising 8px over 240ms, holding 5s, then settling into the card's
completed state. An **Undo** ghost button sits inline at the card's right edge for those 5s
(untimed when a screen reader is active). **No snackbar. Delete the dark toast entirely.** The
app handing you your own promise back is the cheapest genuinely personal moment in the product —
it costs one text field we already collect.

### 2.3 Closing the day — the arc

The Home header carries a thin **day arc** (a 270° arc, 3px stroke, `canvas-sunken` track,
`sage-600` fill) showing today's completions out of today's habits. It fills with each check-in
(260ms `ease-enter` per increment). When the **last** habit of the day lands: the arc's final
segment closes, a single soft glint (a 40% white highlight, 12px long) travels the full arc once
over 600ms `ease-emphasized`, the arc flushes `sage-600 → gold-500` over 300ms, one
`mediumImpact()`, and the greeting line crossfades to done-for-the-day copy: **"That's
everything. Go enjoy your day."** Then the app goes quiet. No modal, no confetti, no share
prompt. A habit app that tells you to leave is the calm-tech move users actually talk about.
Reduced motion: arc segments and the gold flush crossfade; no traveling glint.

### 2.4 Gilding — milestones that leave a mark

At streak days **7 / 30 / 100 / 365** (see 5.6 — I'm cutting 50 from the brief's ladder), two
things happen:

1. **The moment (once):** the brief's M3 milestone card, built to its exact spec — scrim to 40%,
   card enters with `spring-gentle`, `mediumImpact()`, ≤40 confetti pieces from the top edge in
   a 60° cone, all cleared by 1100ms, numeral counts up in Fraunces, auto-dismiss 4000ms (or
   tap; untimed under screen readers). One full celebration per session, max; further milestones
   fall back to the M2 streak-increment treatment.
2. **The mark (forever):** the habit's card is permanently, subtly gilded — day 7: a 16px gold
   corner tick on the card's top-right radius; day 30: a full 1px `gold-500` inner hairline;
   day 100: the hairline plus a small embossed seal (an SVG rosette, `gold-700` on
   `gold-surface`) beside the title; day 365: the seal fills solid gold. Cosmetic only,
   never lost, survives streak breaks (the gild records what you *did*, not what you're
   maintaining). This is Finch's displaced-reward insight aimed at the habit object itself
   instead of a pet: the reward accrues to the thing you crafted.

Users describe this one as: *"my meditation habit has a gold seal because I've done it 100
times."*

### 2.5 The room dims — 6am vs 10pm

Theme follows system light/dark (Daylight / Nightfall palettes from brief §4 — build both), but
the app also acknowledges the hour in two quiet, non-structural ways: the greeting ("Good
morning" / "Good evening," with the done-state copy from 2.3 adapting — evening version: "That's
everything. Sleep well."), and the Home hero card's background: `brand-700` flat by day; after
20:00 local it carries a barely-there two-stop gradient `brand-700 → brand-800` (top to bottom)
under the grain. Nothing moves, nothing else changes, layout is identical. At 10pm the app
feels like someone dimmed the lights, not like a different app.

---

## 3. Screen-by-screen direction

Global rules first: canvas `#F7F5F1`, white cards with 1px `#E3DED5` borders and **no resting
shadow** (see 4.3), one `brand-700` hero surface per screen maximum, 24px screen gutters on
mobile, nav per brief §6.2 (floating bar < 600px, rail 600–1199, drawer ≥ 1200 — build the shell
route first). Breakpoints, grids, and max-widths are brief §6.1 verbatim.

### 3.1 Home / Today

- **Emotionally for:** the daily ritual. Opening it should feel like sitting down at a tidy
  desk where today's work is laid out and nothing else is.
- **Eye hits first:** the greeting block — "Good morning, Mark" (h1, Fraunces), the date, and
  the day arc (2.3) with the streak flame chip (`gold-surface` fill, `gold-700` flame + count)
  beside it. This is the hero. The `brand-700` hero card variant appears only in the md+ bento
  (streak/summary card); on mobile the header block carries the weight without a filled card.
- **The list:** habit cards, 72px min height, ring at right (the press target, 48px hit area),
  title in `h3`, the schedule/prompt line in `body-sm 13px` `ink-muted` — **the 10px text is
  abolished**. Completed cards: `sage-100` fill, checkmark in ring, celebration echo text,
  sink to the bottom of the list with a 260ms `ease-standard` reorder.
- **Cut:** the "Active Habit / Explore" tab bar. Explore becomes a quiet "Find a new habit"
  text link under the list (and a rail destination at ≥600px). Cut the "Daily Lesson" +
  "Lessons Week N" + "View All Lessons" stack from the primary scroll — it currently competes
  with the habits (the exact Finch home-clutter failure). One single-row "Today's lesson" tile
  below the habit list, `surface-tinted`, dismissible; the Library owns the rest.
- **Add:** the day arc; the empty state per brief M6 (one flat two-color illustration, one slow
  4s leaf drift, copy "No active habits" → "Craft your first habit" CTA).
- **Mobile → desktop:** brief §6.3 stands — at `md` a 2-up bento header (brand-700 streak hero +
  today's ring); at `lg` the 8/4 split: habit list left, right column stacks streak hero card,
  weekly ring, next reminder. At `xl` add recent group check-ins. Habit cards in a
  `max-cross-extent 400px` grid, hover lift enabled.

### 3.2 Progress

- **Emotionally for:** proof. This is where "I'm trying" becomes "look what I've done." It
  should feel like opening a well-kept ledger, not a analytics dashboard.
- **Eye hits first:** the `brand-700` hero card: current streak as a 48px Fraunces numeral
  (white), "day streak" label, and this week's consistency ("4 of 5 days") in `brand-100`.
  Gold flame chip on the card (`gold-500` on `brand-700` = 4.98:1, passes).
- **The calendar** is the signature artifact: rounded 6px day cells on the paper canvas,
  **three redundant states** — done: `sage-600` fill + white dot glyph; partial: `sage-300`
  outline + dot; empty: `canvas-sunken`, no glyph. Never color-alone (brief §3.7 — the current
  green-vs-gold-borders calendar is a 1.4.1 failure; this replaces it). Milestone days carry a
  tiny gold corner tick. Per-cell labels ("Mon Aug 10, completed").
- **Weekly framing over daily perfection:** the summary line above the calendar reads weeks
  ("3 weeks at 4+ days"), per the Apple-rings criticism in the brief. Missed days are simply
  empty — no red, no broken-chain iconography anywhere on this screen.
- **Cut:** the "Removed Habits" section from the main scroll (moves to Profile → archive). The
  Summary / Lifestyle tab split stays but as a segmented control, not a full TabBar.
- **Add:** per-habit rows with 7-day dot micro-strips, and the line chart restyled to the
  palette (brand-500 line, sage fill at 12%, `brand-200` gridlines, no legend-only encoding).
- **Mobile → desktop:** brief §6.3 verbatim — stat tiles ×3 (span 4 each), calendar span 5 +
  chart span 7, per-habit table span 12.

### 3.3 Community / Groups

- **Emotionally for:** not being alone in it. Warmth from people, not from features.
- **Eye hits first:** your groups, each row carrying an **avatar stack of members who checked
  in today** with a "+n today" count in `sage-600` — habit energy imported into the social
  surface. That stack is the hero; it makes the screen about momentum, not messaging.
- **Cut:** the five-tab bar (Chats · Invitations · Events · Monthly Challenges · Webinars) —
  the worst IA in the app, per the audit. New structure: **three segments — Groups · Challenges
  · Events.** Invitations become a single inbox row pinned above the group list with a count
  badge (it's a queue, not a place you live). Webinars fold into Events as a type tag.
- **Add:** search stays (it works — Algolia is wired); empty states with the two-color
  illustration style; challenge cards show a group ring (percent of members on track) instead
  of raw numbers.
- **Mobile → desktop:** the biggest web win, per brief — `md`: 2-pane (group list 280px |
  preview); `lg+`: 3-pane master–detail (list 280px | thread flex | members & details 300px).
  Chat bubbles restyle to `surface` + border for others, `brand-100` for self — never filled
  `brand-500` bubbles (too loud for the paper room).

### 3.4 Create Habit

- **Emotionally for:** crafting a small, well-formed thing. This is the workbench — the one
  screen where the "Crafts" in the name is literal.
- **Eye hits first (mobile):** the step title, one Fogg question per screen, in Fraunces:
  "What will you do?" → "When will you do it?" → "How will you celebrate?" → "What will success
  look like?" (Behavior → Prompt → Celebration → Goal — lead with the doable thing, end with
  the meaning; the current form leads with Goal, which is the intimidating part). Keep the
  existing helper line "Keep it small, you can always do more." — that voice is right.
- **The hero:** a **live habit-card preview** that assembles as you type — the exact card that
  will appear on Home, building up field by field (title appears, then the schedule line, then
  the celebration echo previews once). Crafting made visible. On mobile it sits pinned above
  the input, small; on desktop it is the right pane.
- **Cut:** the undifferentiated wall of fields; the "More than 7 habits?" scold-dialog becomes
  supportive inline copy at 5+ habits ("That's a lot to keep. Consider finishing one first.")
  shown before the button, not as a blocking alert after.
- **Add:** "Need inspiration?" stays as the link into Explore templates; choosing a template
  pre-fills the preview card with a satisfying single `spring-snap` settle.
- **Mobile → desktop:** `xs` full-screen stepper; `md+` a 560px modal with all four fields
  visible; `lg+` 720px modal, fields left / live preview card right (brief §6.3 agrees; the
  preview is the part to get right).

### 3.5 Profile

- **Emotionally for:** your record and your keeping — identity first, plumbing last.
- **Eye hits first:** avatar, name, and a **shelf of earned marks** — the gild seals from 2.4
  across all habits, plus "member since." The shelf is the hero; it is the trophy case that the
  gilding system pays into, and it is the only place gold appears in quantity.
- **Cut:** the Overview / Membership / Settings tab bar on mobile (rows + push instead); the
  lorem-ipsum Privacy/Profile placeholder text ships real copy or ships nothing; "Delete
  Account" moves behind Settings → Account with the confirm flow intact (`clay-600`, never
  red-alarm styling; the "WARNING" all-caps dialog gets rewritten in the product voice).
- **Add:** "My Goals & Habits" stays, gains the archive (absorbing Progress's "Removed Habits");
  theme control (System / Light / Dark); "Quick check-in" accessibility toggle (2.1); sound
  opt-in for the milestone chime (off by default).
- **Mobile → desktop:** `md+` 2-pane — category list 240px | detail, no push navigation.

---

## 4. Where I overrule the brief

The brief is the strongest research document this project will ever have, and Sections 4–6 of
it are adopted wholesale except where stated. Five overrules, in order of consequence:

### 4.1 The check-in is a hold, not a tap **[changes M1]**
Covered in 2.1. Tap-with-instant-commit optimizes for speed on an action whose entire product
value is *deliberateness*, then has to paper over accidental completions with a 5-second undo
toast. Hold makes the commitment the gesture itself, kills the toast (2.2), and gives the
product its single most tellable interaction. The brief's M1 choreography (ring sweep, color
crossfade, checkmark draw, spring release, particle counts, reduced-motion path) survives
intact — it just fires across the hold instead of after a tap.

### 4.2 Fraunces is a daily voice, not an event voice **[widens §4.4]**
The brief scopes Fraunces to streak numerals, milestone headlines, and empty states. That means
95% of sessions render 100% Figtree — which the brief's own research flags as "overused
neutral." Spend the personality budget where it is seen daily: **Fraunces also takes `h1` page
titles and the Create Habit step questions** (opsz auto, SOFT ~50, WONK 0 — wonk stays at 0
everywhere except milestone cards, where it may go to 1). Body, labels, buttons, nav remain
strictly Figtree. The serif display over soft sans is the fastest "2026 not 2021" signal the
brief itself identified; using it five times a year wastes it.

### 4.3 Resting cards get no shadow — tone and hairline only **[tightens §4.1's shadow scale]**
The brief defines a five-step shadow scale and hedges that "the light theme could go further
still." Go further: **cards at rest carry `surface` fill + 1px `border` and zero shadow.**
Shadows exist only on the floating layer — bottom nav and FAB (`shadow-lg`), modals/sheets
(`shadow-lg`), the brand-700 hero card (`shadow-hero`), and desktop hover-lift (`shadow-md`
with `translateY(-1px)`). `shadow-xs`/`shadow-sm` are deleted from the system. Reasoning: the
audit's own dated-pattern table says shadow-elevation reads as Material 2 / 2023; M3 itself
moved to tonal elevation; and on a warm paper canvas, hairlines-plus-tone *is* the material
story. Fewer decisions for the builder, flatter and calmer at rest, and hover-lift gains
meaning because lift is otherwise rare. Dark mode: tone + border only, no shadows (brief
already says this — restated as law).

### 4.4 Retire teal **[deletes §4.1's teal ramp from the UI]**
The brief keeps `teal-400 #80BBC8` for "decorative fill, illustration, chart series" plus a
`teal-650` text step. A retained-but-roleless color is exactly how the 43-files-of-stray-hex
drift restarted last time. The system needs four chromatic voices: **brand blue (structure and
action), sage (growth and success), gold (reward), clay (care/error)**. Teal survives only
inside illustration compositions, never as a UI fill, never as text, never in charts (chart
series: brand-500, sage-600, gold-700, clay-600 — four series max, direct-labeled). The FAB —
currently teal and failing contrast at 2.27:1 — becomes `brand-600` with a white glyph.

### 4.5 No shimmer; and drop day-50 from the milestone ladder **[amends M5, M3]**
- Skeleton shimmer sweeps are a 2019–2021 idiom and the only "animation as decoration" moment
  in the brief's motion system. Keep the 400ms no-flash rule; beyond 400ms show static skeleton
  blocks (`canvas-sunken`, correct radii) with a single gentle opacity pulse 0.7 → 1.0, 1200ms,
  ease-in-out, alternating. Under reduced motion: fully static.
- Milestone ladder becomes **7 / 30 / 100 / 365**. Day-50 (from the brief's Smashing source) is
  a fifth ceremony crowded between two meaningful ones; four tiers also map cleanly to the four
  gilding marks (2.4). Between milestones, M2 carries the streak feeling daily.

Everything else — palette values and every contrast pairing, the motion tokens and springs, M2,
M3's choreography, M4's transitions, M6, the reduced-motion architecture (including the iOS
`reduceMotion` OR-helper and the ≥3.44.0 web pin), breakpoints, nav transformation, the 48dp
target rule, swipe-never-the-only-path — **adopted as written.** The brief's §7 priority order
also stands, with item 4 amended to the hold gesture.

---

## 5. The three things that will make or break it

### 5.1 The ground inversion must be total
Warm canvas, white hairline cards, blue-as-ink. If even one screen keeps the mid-blue field —
or the raster `bottomNavBackground.png` survives anywhere — the redesign reads as a reskin
that missed a spot, and the old app's smell comes back. "Right" looks like: every screen on
`#F7F5F1`, exactly one `brand-700` filled surface per screen at most, the nav rebuilt as a real
floating widget, and zero raster chrome. This is brief §7 item 1 and it outranks everything
else; the prototype must not show a single legacy-blue background.

### 5.2 The press has to feel like a thing, not a video of a thing
The entire "fun" claim rests on ~700ms of physics. If the hold-fill stutters, if the haptic
lands more than 30ms off the visual, if the spring release is replaced with a linear ease, or
if it blocks the next press, the app is "clean" instead of "loved" and no amount of palette
saves it. "Right" looks like: 60fps on a mid-range Android phone, interruptible at any
millisecond, haptic just after the visual peak, and a tester involuntarily checking a habit
twice just to feel it again. Prototype it first, on a real phone, before any other screen work.

### 5.3 Desktop web must be a different layout, not a bigger phone
The 767px clamp is the current web experience and it is fatal to "looks genuinely good on
web." "Right" looks like: at 1280px the Home is a real 8/4 bento, Community is three panes,
Create Habit is a modal with a live preview, hover states exist, keyboard completes a habit —
and none of it is a centered phone column with dead margins. The shell-route/nav-rail work is
the engineering prerequisite; the prototype must demo 390px, 768px, and 1280px explicitly so
nobody can sign off on mobile alone.

(Typography is the tiebreaker behind all three: if Fraunces/Figtree with real tracking gets
value-engineered back to a single default-tracked sans, the product looks 2021 regardless of
the above. Treat 4.2 as non-negotiable.)

---

## 6. Build notes for the HTML/CSS prototype

The prototype demonstrates the point of view. Get these treatments exactly right; stub
everything else.

**Tokens.** Use brief §4.1/§4.2 palettes, §4.3 naming, §4.4 type ramp, §5.1 motion tokens
verbatim as CSS custom properties. Both themes (`[data-theme]` + `prefers-color-scheme`).
Fonts: Figtree Variable + Fraunces Variable, woff2, self-hosted in the prototype (mirrors the
bundle-as-assets decision). 13px minimum text, no exceptions.

**Card treatment.** `--c-surface` fill · `border: 1px solid var(--c-border)` · `radius 16px` ·
**no resting shadow** (4.3) · padding 16px · desktop hover: `translateY(-1px)` + `shadow-md`,
120ms, only under `@media (hover:hover) and (pointer:fine)` · press: scale 0.98. Completed
habit card: `sage-100` fill, `sage-300`-leaning border, `sage-700` title, ring checked.
Gilded variants per 2.4 (corner tick / inner gold hairline / seal). Hero card: `brand-700`
fill, `radius 16`, `shadow-hero`, white + `brand-100` text, gold chip, **2–3% SVG grain
overlay** (the only texture in the system; after 20:00 add the `brand-700 → brand-800`
vertical gradient under it).

**Elevation model.** Two layers only: paper (canvas, cards — tone + hairline) and floating
(nav, FAB, modals, hero, hover — the surviving shadows from 4.3). Nothing else casts.

**The progress/streak visualization.** Rings are stroke-drawn SVG, 3px, round caps, track
`canvas-sunken` (light) / `surface-raised` (dark), fill `sage-600`, animated via
stroke-dashoffset 260ms `ease-enter`. The day arc per 2.3, including the completion glint and
gold flush. Streak numerals in Fraunces with `font-variation-settings` opsz. Calendar cells per
3.2 with the three redundant states — build one week fully to prove the encoding. The heatmap
must survive grayscale; check it.

**The check-in, fully.** 2.1 is the prototype's centerpiece: implement the hold with pointer
events (down/up/cancel), the linear fill, the backward-run on early release, the
`spring-bounce` bezier `cubic-bezier(0.42,1.67,0.21,0.90)` on release, the particles, the
celebration echo (2.2), and the reduced-motion branch via `prefers-reduced-motion`. No haptics
on web — the visual physics carry it alone, which is exactly why they must be excellent.

**Iconography.** One family, one style: **Material Symbols Rounded, outlined fill-0, weight
400, 24px grid** (or Lucide if bundling is easier for the prototype — but pick one and use it
exclusively). Icons are `ink-muted` at rest, `brand-600` selected. Zero raster icons, zero
emoji-as-UI, zero mixed sharp/rounded/outlined variants.

**Illustration.** Yes — but only empty states, onboarding, and milestone badge art. Style: flat
two-color SVG, `brand-300` shapes with `brand-700` linework on the light canvas, one `gold` or
`sage` accent element max, abstract-botanical/geometric (leaves, threads, stones — craft
objects). Explicitly not: 3D renders, gradient blobs, stock characters, Corporate-Memphis
people. If an illustration can't be drawn in two colors, it doesn't belong.

**Gold: highlight, not hero — 364 days a year.** Gold appears only as: the streak flame chip,
milestone moments, gild marks, the calendar's milestone ticks, and the nav's 3px selected-tab
pill. Never as chrome fill, never as a button (except the milestone card's single CTA), never
as text on light except `gold-700`, never as a hairline boundary (`gold-500` is 1.52:1 on
canvas — filled shapes only). On the one day a milestone fires, gold owns the screen for 1.6
seconds. That ratio is the entire reward economy.

**Motion discipline.** Brief §5 timings verbatim. Nothing loops except the single empty-state
drift (4s, one axis, ±4px). Stagger 40ms/item, 500ms total cap, first item at 0ms, first mount
only. Focus rings are instant. Every animated demo in the prototype needs its
`prefers-reduced-motion` branch built, not promised.

**Veto list — if any of these appear, remove them:**
- Glassmorphism anywhere except (optionally) the floating mobile nav — tinted, single layer,
  solid fallback. No frosted cards, no glass modals.
- Purple/violet anything; mesh or rainbow gradients; animated gradient backgrounds.
- Neumorphism; inner-shadow "pressed plastic" controls.
- Drop shadows on resting content (4.3).
- Confetti on ordinary completions; any celebration that loops or repeats per session.
- Scroll-triggered reveals, parallax, scroll-jacking.
- Streak-guilt UI: broken-chain icons, red missed days, "Don't lose your streak!" copy. Streak
  language follows the brief's Smashing rule — repair, grace, and "you showed up for 42 days,"
  never "you lost."
- "AI sparkle" iconography, glow effects on light surfaces, emoji as interface elements.
- Any new hex value not in §4. The palette is closed. Extensions happen in OKLCH, in the token
  file, or not at all.

**Prototype deliverable shape.** Five screens (Home, Progress, Community, Create Habit,
Profile) at three widths (390 / 768 / 1280), light + dark, with the check-in interaction, the
day arc, one milestone firing, and one gilded card visible on Home. The signature moments are
the demo; the layouts are the proof it scales.
