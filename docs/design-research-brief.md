# HabitCrafts — Design Research Brief

**Version:** 1.0 · **Date:** 2026-08-12
**Audience:** the design agent, then the HTML prototype build
**Source of truth for the audit:** the Flutter repo at `C:\Users\markl\HabitCrafts` (read directly, commit state of 2026-07-28)

This brief is self-contained. Every number in Sections 4–6 is buildable without opening the Flutter
repo. Section 1 is the ground truth of what exists today; Sections 2–7 are the recommendation.

---

## A note on research provenance (read this first)

Both research sub-agents returned full, densely-cited reports, and Section 3 is built from them.
Claims carry source URLs. Where a source is a trend blog rather than primary research, I say so.
Anything that is my own professional judgement is marked *(judgement)*.

**One methodological note that matters:** `m3.material.io` and `m2.material.io` are fully
client-rendered and return no body text to fetchers. **Every Material 3 token value in this brief
was therefore read out of AndroidX and Flutter source code, not off the docs site** — specifically
`MotionTokens.kt`, `ExpressiveMotionTokens.kt`, `StandardMotionTokens.kt`, and Flutter's
`Durations`/`Easing` classes. Those are the actual implementations, so they are *more* reliable than
the docs page, but the provenance is worth knowing.

**Corrections applied after research returned.** My first draft of this brief contained four errors
that the research caught. They are fixed below, and flagged here so nobody builds from a stale copy:
1. The spring values I originally labelled "M3 Expressive" are in fact the **Standard** scheme.
   Expressive springs are looser (damping 0.6–0.8, stiffness 200–800). Both tables are now in 3.1.
2. `MediaQuery.disableAnimations` **does not reflect iOS Reduce Motion at all.** A reduced-motion
   implementation built only on it would miss every iPhone user. See 3.6.
3. Flutter web **only started honouring `prefers-reduced-motion` in stable 3.44.0**, and Flutter web
   **semantics is off by default** and needs an explicit `ensureSemantics()` call. See 3.8.
4. Material's actual stagger guidance is **20ms per item**, not the 50ms I assumed. See 3.2.

Highest-confidence primary sources: AndroidX/Flutter source, W3C WCAG 2.2 Understanding docs, Apple
HIG, `developer.android.com`, `docs.flutter.dev`, NN/g, the Calm Tech Institute, UX Magazine on
streak psychology, Deconstructor of Fun on Finch, and Google Fonts specimen pages.

Section 1 (the audit) has **no** such caveat — it was read from the actual source files and every
number is verified. Section 4's contrast ratios were computed locally with the WCAG 2.x relative
luminance formula, not estimated.

---

# 1. Existing design system — audit

## 1.1 The one-sentence problem

Every screen in the app is white text on a single mid-blue field (`#507598`), with cards made of
10% white laid over that same blue — so the entire product is one hue at three lightnesses, and the
card text fails WCAG AA. That is the whole of "feels old and boring": it is not a taste problem,
it is a contrast and hierarchy problem.

## 1.2 Colour tokens (`lib/flutter_flow/flutter_flow_theme.dart`, `LightModeTheme`)

Exact values as declared, with their real semantic role in the app:

| Token | Hex | What it actually does |
|---|---|---|
| `primary` | `#507598` | The **page background of every screen**. Also the "primary" action colour. Doing both jobs is the core sin. |
| `secondary` | `#325171` | Deep navy. Bottom-nav icon colour, logo disc, a few fills. |
| `tertiary` | `#E6EEF8` | Pale ice blue. Login/Sign-up button fill, brand wordmark colour, chat bubble. |
| `alternate` | `#FFFFFF` | White. Used as a *text* colour on cards — the naming is meaningless. |
| `primaryText` | `#325171` | Default text colour of nearly every `TextStyle` in the type ramp. |
| `secondaryText` | `#F7F5F5` | Off-white. Default colour of `displayMedium` and `bodySmall`. |
| `primaryBackground` | `#507598` | Same as `primary`. `Scaffold.backgroundColor` on 12 of 14 pages. |
| `secondaryBackground` | `#FFFFFF` | White. Card fill on group cards, check-in sheet. |
| `accent1` | `#EFC530` | **Gold.** Tab indicator. The only warm colour in the system. Barely used. |
| `accent2` | `#80BBC8` | Teal. The centre "+" FAB fill, habit-row icon disc. |
| `accent3` | `#E0E0E0` | Grey. Near-unused. |
| `accent4` | `#EEEEEE` | Grey. Loading-indicator track. |
| `success` | `#4DC360` | Green. |
| `warning` | `#FCDC0C` | Pure yellow — unusable as text on white (1.37:1). |
| `error` | `#F06962` | Salmon red. Notification badge, Undo button, destructive actions. |
| `info` | `#1C4494` | Deep blue. Effectively unused. |
| `background` | `#1A1F24` | **A dark value living inside the light theme.** Used as the fill of the habit-completed snackbar. |
| `darkBackground` | `#111417` | Darker still. Same problem. |
| `textColor` | `#FFFFFF` | White. |
| `grayDark` | `#57636C` | Neutral grey, no blue in it — clashes with the blue field. |
| `grayLight` | `#3FAAA4A4` | 25% warm grey. Slider track. |
| `whiteOverlay` | `#1AFFFFFF` | **10% white.** The habit-card fill. See 1.3. |
| `messageTextBG` | `#ECEBEB` | Chat bubble grey. |
| `whiteTransparent10` | `#19FFFFFF` | 10% white again — a duplicate of `whiteOverlay` off by 1/255. |
| `neutral` | `#CED2D9` | Cool grey. |

## 1.3 Measured contrast failures (computed, WCAG 2.x relative luminance)

These are the numbers that matter. `whiteOverlay` (`#1AFFFFFF`) composited over `primary`
(`#507598`) resolves to an effective card colour of **`#6283A2`**.

| Pair | Ratio | Verdict |
|---|---|---|
| **White habit-card text on the card (`#FFFFFF` on `#6283A2`)** | **3.97:1** | **FAILS** AA 1.4.3 (needs 4.5:1). This is the app's most-read text. |
| **Theme default text on theme default background (`#325171` on `#507598`)** | **1.70:1** | **FAILS** catastrophically. The type ramp's own default colour is invisible on the app's own default background. Every screen has to override it. |
| White body text on the page field (`#FFFFFF` on `#507598`) | 4.84:1 | Passes AA by 0.34. No margin. |
| `tertiary` `#E6EEF8` on `#507598` | 4.14:1 | Fails AA for body; passes only as large text (the 36px wordmark). |
| Gold `#EFC530` on `#507598` (tab indicator) | 2.93:1 | Fails 1.4.11 non-text (needs 3:1). |
| Teal `#80BBC8` on `#507598` (the centre FAB) | 2.27:1 | Fails 1.4.11. The primary create-action is nearly invisible against its own background. |
| Success `#4DC360` on `#507598` | 2.14:1 | Fails. |
| Error `#F06962` on `#507598` (notification badge) | 1.59:1 | Fails badly. |
| Info `#1C4494` on `#507598` | 1.88:1 | Fails. |
| Warning `#FCDC0C` on white | 1.37:1 | Unusable as text or icon. |
| `secondaryText` `#F7F5F5` on white | 1.09:1 | Effectively invisible; it is the default colour of `bodySmall`. |

Compounding this: the habit card's secondary lines (`prompt`, `celebration`) are set at
**`fontSize: 10.0`** in `active_habit_list_item_widget.dart`. 10px white on `#6283A2` is not
readable on any device.

## 1.4 Type ramp (Poppins, via `google_fonts`)

| Style | Size | Weight | Default colour |
|---|---|---|---|
| displayLarge | 57 | 400 | `primaryText` |
| displayMedium | 36 | 600 | `secondaryText` |
| displaySmall | 32 | 500 | `primaryText` |
| headlineLarge | 32 | 400 | `primaryText` |
| headlineMedium | 25 | 500 | hard-coded `Colors.white` |
| headlineSmall | 20 | 500 | `primaryText` |
| titleLarge | 22 | 500 | `primaryText` |
| titleMedium | 18 | 600 | `secondaryText` |
| titleSmall | 18 | 400 | `alternate` |
| labelLarge | 14 | 500 | `primaryText` |
| labelMedium | 12 | 500 | `primaryText` |
| labelSmall | 11 | 500 | `primaryText` |
| bodyLarge | 16 | 400 | `primaryText` |
| bodyMedium | 14 | 400 | `primaryText` |
| bodySmall | 14 | 400 | `secondaryText` |

Problems with the ramp itself:
- **No line heights and no letter-spacing are set anywhere in the ramp.** Every call site passes
  `letterSpacing: 0.0` explicitly, which is Flutter's default anyway — so 57px display type and
  11px labels get identical (zero) tracking. Large display type needs negative tracking; small
  labels need positive.
- **`titleMedium` (18/600) and `titleSmall` (18/400) are the same size** — two tokens, one step.
- **`displaySmall` (32/500) and `headlineLarge` (32/400) are the same size.** The ramp has 15
  tokens covering 9 distinct sizes.
- **`bodySmall` is 14px — the same as `bodyMedium`.** There is no small body size, which is why
  call sites hard-code `fontSize: 10.0`.
- The gap from 20 → 25 → 32 → 36 → 57 is not a consistent ratio.
- **Poppins is loaded twice.** `assets/fonts/` contains `Poppins-Regular/Medium/SemiBold.ttf` and
  they are declared in the `assets:` block, but every call site uses `GoogleFonts.poppins(...)`,
  which fetches from `fonts.googleapis.com` at runtime. The app ships the font *and* downloads it.
  On web this is a FOUT, a third-party network dependency, and a GDPR question.

## 1.5 Spacing / radius / shadow tokens — dead code

`FFDesignTokens` is defined in the theme file:

- `FFSpacing`: xs 4 · sm 8 · md 16 · lg 24 · xl 32
- `FFRadius`: sm 8 · md 16 · lg 24 · full 9999
- `FFShadows`: sm `0 1 3 #1A000000` · md `0 3 6 #1A000000` · lg `0 8 15 #1A000000` · xl `0 16 25 #1A000000`

**`designToken` is referenced zero times outside the file that defines it.** The entire token layer
is unused. What is used instead:

- **Radii:** 9 distinct hard-coded values — `8.0` ×173, `20.0` ×26, `12.0` ×22, `0.0` ×11, `5.0` ×9,
  `10.0` ×8, `15.0` ×6, `24.0` ×5, `16.0` ×4. (`FFAppConstants.borderRadius = 8.0` is the nearest
  thing to a real token and it's a separate constant in a separate file.)
- **Colours:** **43 files contain hard-coded `Color(0x…)` literals** — including `#2A405D` (a navy
  that is *not in the theme at all*, used 7× across the calendar, slider and swipe row), `#FFCE51`
  (a gold that is not `accent1`), `#57D76C` and `#7cCf7b` (two greens that are not `success`),
  `#CAD0E1`, `#A4ADC5`, `#1D1B20`.
- **Shadows:** the `FFShadows` scale is never used. Elevation is expressed as Material 2
  `elevation:` on buttons — `0.0` ×62, `3.0` ×23, `4.0` ×5, `2.0` ×5, `1.0` ×1. `BoxShadow`
  appears in only 5 files.

## 1.6 Screen inventory and navigation

**Router:** GoRouter, `lib/flutter_flow/nav/nav.dart`, 19 routes, completely flat — no nested
navigators, no shared shell. Every page builds its own `Scaffold` and its own copy of the bottom
nav. `usePathUrlStrategy()` is enabled, so web routes are clean paths.

**Bottom nav** (`lib/components/bottom_nav_bar_component_widget.dart`), present on 4 pages only —
Home, Progress, Groups, Library:

| Slot | Label | Icon | Route |
|---|---|---|---|
| 1 | Habits | `Icons.calendar_today` | `/homePage` |
| 2 | Progress | `Icons.graphic_eq` | `/progressPage` |
| — | *(empty spacer)* | — | — |
| 3 | Community | raster people icon + count badge | `/groupsPage` |
| 4 | Library | `Icons.menu_book` | `/libraryPage` |

Centre: a 60×60 circular FAB (`accent2` `#80BBC8`, radius 30, elevation 3, FontAwesome plus at
15px) floating 50px above the bar.

**Pages** (all 14 in `lib/components/pages/`, plus 4 chat pages in `lib/chat_groupwbubbles/`):

- `initial_page` (234 lines) — 178px navy disc holding the raster logo, "Habit Craft" at 36px in
  `tertiary`, two 280×40 pill buttons (radius 20) in `tertiary`.
- `login_page` (560), `signup_page` (798), `forgot_password` (278) — standard FlutterFlow
  `OutlineInputBorder` fields at radius 8; buttons 40px tall at radius 20. `forgot_password` is the
  **only** screen that uses `page_bg_transparent@2x.png`.
- `onboarding` (445) — 3-slide `PageView` with `onboarding_1.png` / `onboarding_2.png` (320×300
  rasters), 28px bold headings, `SmoothPageIndicator` with `ExpandingDotsEffect`.
- `home_page` (1202) — the main screen. Profile button top-right, "Habits" title,
  `TabBar` (Active Habit / Explore) with a gold indicator, then a `SingleChildScrollView` of
  `ActiveHabitListItem` rows. Tooltip components for 0-habit and 1-habit states.
- `progress_page` (976) — tabs, a `table_calendar` streak heatmap
  (`custom_code/widgets/progress_calendar_widget.dart`) and an `fl_chart` line chart
  (`progress_line_chart_widget.dart`).
- `groups_page` (1465) — the heaviest screen. Tabs: Chats · Invitations · Events · Monthly
  Challenges · Webinars, plus search. Five top-level tabs on a phone.
- `library_page` (1042) — tabs: Lessons · Resources, plus search.
- `library_detail_page` (233) — the **only** page with a white (`alternate`) background.
- `explore_habits_page` (234) — "Habit Ideas".
- `create_habit_page` (1254) — the Fogg tiny-habits model: Goal · Prompt · Behavior · Celebration
  ("How will you celebrate?").
- `profile_page` (1168) — Overview · Membership · Notifications · Privacy · Blocked Users ·
  Contact Us · Log Out · Delete Account.
- `free_trial_screen` (675) — **unreachable dead code**; nothing navigates to it, and there is no
  billing integration in the project.
- Chat: `chat_2_main`, `chat_2_details`, `chat_2_invite_users`, `image_details`, plus 14 chat
  components.

## 1.7 Motion capability that exists today

- `flutter_animate: 4.5.0` is a dependency. It is imported in **5 files out of ~150** — the loading
  spinner (a 600ms `RotateEffect`), the profile image, two chat dialogs, and the dead free-trial
  screen (two 300ms `ScaleEffect`s).
- `page_transition: 2.2.2` is present. **Every navigation call in the app passes
  `PageTransitionType.fade` with `duration: Duration(milliseconds: 0)`** — i.e. transitions are
  configured and then explicitly zeroed out. Screens hard-cut.
- **Every `InkWell` in the app sets `splashColor`, `focusColor`, `hoverColor` and
  `highlightColor` to `Colors.transparent`.** There is no touch feedback and no hover state
  anywhere, on any platform.
- `assets/rive_animations/` and `assets/jsons/` exist but contain **only a stray `favicon.png`**.
  Neither `rive` nor `lottie` is in `pubspec.yaml`. There is no Lottie/Rive capability.
- `smooth_page_indicator`, `percent_indicator`, `carousel_slider`, `fl_chart`, `table_calendar`,
  `flutter_slidable` are available and lightly used.

## 1.8 The completion moment (the app's most important interaction)

Marking a habit done today produces:

1. The row's `Slidable` (`ScrollMotion`) reveals a flat `#57D76C` green action.
2. `HabitCompletedSnackBarWidget` appears: a **70px-tall flat bar filled with `background`
   `#1A1F24`** (the stray dark token), containing the title, an "Add Notes" text button in
   `primary`, and an "Undo" text button in `error`. It auto-dismisses after **4000ms**.
3. The completed row becomes `Opacity(0.4)`.

No animation, no haptic, no colour change, no streak feedback, no sound. The word "streak" appears
in the codebase exactly twice, both inside the calendar widget.

## 1.9 Light/dark story — the phantom dark mode

- `FlutterFlowTheme.of(context)` is hard-coded to `return LightModeTheme();`. There is no
  `DarkModeTheme` class. It is impossible for any widget to receive a dark palette.
- `main.dart` nonetheless sets **`themeMode: ThemeMode.system`** and exposes a `setThemeMode()`
  API — but supplies **only `theme:`, no `darkTheme:`**. The theme-mode plumbing is inert.
- `main.dart` sets **`useMaterial3: false`**. The app is on Material 2 in 2026.
- The "light" theme contains `background: #1A1F24` and `darkBackground: #111417`. Dark values are
  smuggled into the light theme and used for real surfaces (the completion snackbar).

## 1.10 Web / responsive story

- **`FFAppConstants.maxWidthForWeb = 767`.** Content is clamped to a 767px column and centred. On a
  1920px display the user sees a phone in the middle of an empty blue field. This is the literal
  "stretched phone layout" the brief warns against — except narrower.
- Breakpoints in `flutter_flow_util.dart` are `kBreakpointSmall 479` / `kBreakpointMedium 767` /
  `kBreakpointLarge 991`. These are Webflow-era values and do not match any current guidance.
- `responsiveVisibility()` is called **once in the entire application** (`progress_page:623`).
- There is no `NavigationRail`, no drawer, no multi-column layout, no hover affordance.
- Swipe-left-to-complete is the primary completion gesture and has **no keyboard or pointer
  equivalent** — it is unreachable on desktop web and by assistive technology.

## 1.11 Iconography and imagery

- Three icon systems mixed: Material (51 unique glyphs, with `_outlined`, `_rounded` and `_sharp`
  variants used interchangeably — `add_circle_sharp` next to `keyboard_arrow_down_rounded` next to
  `visibility_outlined`), FontAwesome (2 glyphs, in 11 files), and **raster PNGs used as icons**:
  `goal_icon.png`, `star_icon.png`, `bell_icon.png`, `habit_icon.png`, `money_icon.png`,
  `resource_eye.png`, `white_clipboard.png`, `yellowTimer.png`.
- **`bottomNavBackground.png` is a raster image stretched with `BoxFit.fill`** as the bottom nav
  chrome. It cannot adapt to width, safe areas, or dark mode, and it blurs on high-DPI web.
- The logo is a raster PNG (`Habit_Craft_Logo_File-09.png`) scaled to a 178px disc.
- One habit-list tooltip still loads its icon from a **FlutterFlow CDN URL**
  (`storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/tiny-habits-jf61nl/...`) rather
  than from local assets.

## 1.12 Four concrete defects found during the audit

These are bugs, not taste. All are ~5-minute fixes.

1. **Onboarding page indicator has no active state.**
   `onboarding_widget.dart`: `dotColor: Color(0xFFD9D9D9)` and
   `activeDotColor: Color(0xFFD9D9D9)` — identical. The user cannot tell which of the 3 slides
   they are on.
2. **Check-in slider has no active state.**
   `custom_code/widgets/checkin_slider_widget.dart`: `activeTrackColor` and `inactiveTrackColor`
   are both `Color(0xff2A405D)`; `activeTickMarkColor` and `inactiveTickMarkColor` are also both
   `Color(0xff2A405D)`. The slider gives no visual feedback of its value.
3. **Malformed colour literal — missing alpha (1).**
   `custom_code/widgets/progress_calendar_widget.dart:416`: `color: Color(0xE6EEF8)`. The author
   meant `0xFFE6EEF8`. As written, Dart reads `0x00E6EEF8` → alpha 0 → fully transparent.
4. **Malformed colour literal — missing alpha (2).**
   `progress_calendar_widget.dart:424`: `color: Color(0x2A405D)`. The author meant `0xFF2A405D`.
   As written it is `0x002A405D` → alpha 0 → invisible.

## 1.13 What specifically reads as dated — ranked

1. **Single-hue, mid-tone page field.** One saturated blue behind everything. Circa-2017 mobile
   design. It also causes the contrast failures.
2. **Translucent-white-on-colour cards.** `whiteOverlay` cards are the 2016 "frosted card on a
   coloured hero" pattern, and here they produce 3.97:1 text.
3. **Raster PNG chrome.** A stretched `bottomNavBackground.png` is the single most obviously dated
   artefact in the app.
4. **Zero motion and zero touch feedback.** Every tap target is inert. In 2026 an app with no
   press state reads as broken, not minimal.
5. **Material 2 defaults.** `useMaterial3: false`, `TabBar` with a plain underline indicator,
   `elevation: 3.0` drop shadows, stock `CircularProgressIndicator` as the only loading state.
6. **Poppins at default tracking.** Geometric sans at 0 letter-spacing across 57px display and 11px
   labels. Poppins peaked around 2018–2021 and now reads as a template default *(judgement)*.
7. **Dense, undifferentiated list rows** with 10px secondary text and a 40px coloured circle
   holding a raster icon.
8. **Mixed icon metaphors** — sharp, rounded, outlined and PNG in the same view.
9. **Five top-level tabs on a phone** (Groups) plus a second tab layer inside pages.
10. **The 767px web clamp.**

---

# 2. Target aesthetic definition

"Calm but fun" is not a contradiction if you separate the two into different layers. The rule for
HabitCrafts:

> **The environment is calm. The events are fun.**

Concretely, that means:

**The environment — 95% of pixels, 100% of the time**
- Warm, near-neutral canvas (not white, not blue). Low chroma. Nothing on the canvas competes.
- Generous whitespace: 24px screen gutters on mobile, 32–48px on desktop, 16px minimum between
  card groups. The current app uses 10–20px everywhere.
- One accent per view, maximum. Colour is a **signal**, not decoration.
- Type does the hierarchy work, not colour or borders. Weight and size, not boxes.
- Surfaces separate by *tone and hairline*, not by drop shadow. Elevation is felt, not seen.
- Corners are large and consistent (16px cards, 24px sheets, 999px pills) — soft, not sharp.
- Motion in the environment is slow, small, and rare.

**The events — 5% of pixels, only when the user does something meaningful**
- Check-in is physical: it presses, it springs back, it makes a sound in your hand (haptic).
- Progress is a *shape you fill*, not a number you read — rings and arcs, because a partially
  filled ring is legible at a glance and creates the "close the loop" pull that Apple Fitness
  proved works *(judgement)*.
- Gold `#EFC530` is the reward colour and **nothing else**. It appears only on streaks,
  milestones and celebration. Because it is rationed, it means something.
- Milestones get a real, brief, generous moment — confetti, a count-up, a card. Once. Then gone.
- Failure is never punished visually. No red streak-broken state. "Repair your streak" not
  "streak lost."

**The personality — how it stays warm rather than clinical**
- Warm neutrals (sand, parchment) against cool brand blue. That temperature tension is what stops
  a desaturated palette reading as hospital-grade *(judgement)*.
- Sage green for success rather than a bright signal-green — growth, not validation.
- Terracotta/clay for errors rather than alarm-red — softer failure.
- Illustration used sparingly and only in empty states and onboarding, in flat two-colour brand
  forms — not stock 3D.
- Copy is second-person and short. Existing copy like "Give yourself credit for all the efforts
  you've been putting in" is exactly the right voice; keep it.

**What we are explicitly *not* doing**
- Not a mascot/pet economy (Finch's model). It is a large product commitment and it would fight
  the calm brief.
- Not streak-anxiety mechanics (Duolingo's aggressive loss-aversion notifications). Criticised
  widely and wrong for a wellness product *(judgement)*.
- Not gamified points/levels/XP.
- Not full-screen glass, not 3D, not gradients-as-brand.

---

# 3. Modern standards findings

> **Provenance:** see the note at the top. Items marked *(spec)* are from primary specification
> documents or the AndroidX/Flutter source that implements them. Items marked *(judgement)* are my
> recommendation, not a sourced finding. Everything else carries an inline source URL.
>
> **Three claims elsewhere in circulation that could NOT be verified**, flagged so nobody repeats
> them: that iOS Low Power Mode suppresses haptics (Apple documents no such thing); that backgrounded
> apps are blocked from haptics (appears only in a staff forum reply); and the exact minimum Android
> API level for `VibrationEffect.Composition` (Google's own guide and reference disagree — 30 vs 31).

## 3.1 Motion — durations and easing *(spec)*

Material 3 publishes duration and easing tokens. Use these as the canonical vocabulary; the
HabitCrafts set in Section 5 is derived from them.

**Duration tokens (ms):**
`short1 50` · `short2 100` · `short3 150` · `short4 200` · `medium1 250` · `medium2 300` ·
`medium3 350` · `medium4 400` · `long1 450` · `long2 500` · `long3 550` · `long4 600` ·
`extraLong1 700` · `extraLong2 800` · `extraLong3 900` · `extraLong4 1000`

**Easing tokens (cubic-bezier):**
- `standard` — `cubic-bezier(0.2, 0, 0, 1)`
- `standard-decelerate` — `cubic-bezier(0, 0, 0, 1)`
- `standard-accelerate` — `cubic-bezier(0.3, 0, 1, 1)`
- `emphasized-decelerate` — `cubic-bezier(0.05, 0.7, 0.1, 1)`
- `emphasized-accelerate` — `cubic-bezier(0.3, 0, 0.8, 0.15)`
- `legacy` (M2) — `cubic-bezier(0.4, 0, 0.2, 1)`

The `emphasized` curve proper is a two-segment curve that cannot be expressed as a single
cubic-bezier; `cubic-bezier(0.2, 0, 0, 1)` is the standard approximation used for CSS.

Source: https://m3.material.io/styles/motion/easing-and-duration/tokens-specs

⚠️ **Flutter does not ship `Easing.emphasized`.** The real M3 emphasized curve is a two-part
(three-point) cubic that a single cubic-bezier cannot express; the value above is the flattened
approximation. In Flutter, use **`Curves.easeInOutCubicEmphasized`** — a `ThreePointCubic` with
control points `Offset(0.05, 0)`, `Offset(0.133333, 0.06)`, midpoint `Offset(0.166666, 0.4)`,
`Offset(0.208333, 0.82)`, `Offset(0.25, 1)`. Flutter's `Easing` class only exposes
`emphasizedAccelerate` and `emphasizedDecelerate`.
Source: https://api.flutter.dev/flutter/animation/Curves/easeInOutCubicEmphasized-constant.html

**Which easing for what** (M3's own rules): `emphasizedDecelerate` for elements entering from
off-screen and coming to rest; `emphasizedAccelerate` for elements leaving without stopping;
`emphasized` for changes that begin *and* end on-screen; the `standard` set when speed matters more
than expressiveness. Shorter durations for smaller changes and for exits; longer for entries.

**Material 3 Expressive spring tokens (announced May 2025).** M3 Expressive replaces duration+easing
with spring physics as the primary model, in two families — *spatial* (position, rotation, size,
corner radius; these overshoot) and *effects* (colour, opacity; never overshoot) — each in
fast/default/slow. **There are two schemes, and they are commonly confused:**

| Token | Expressive: damping / stiffness | Standard: damping / stiffness |
|---|---|---|
| spatial-fast | **0.6 / 800** | 0.9 / 1400 |
| spatial-default | **0.8 / 380** | 0.9 / 700 |
| spatial-slow | **0.8 / 200** | 0.9 / 300 |
| effects-fast | 1.0 / 3800 | 1.0 / 3800 |
| effects-default | 1.0 / 1600 | 1.0 / 1600 |
| effects-slow | 1.0 / 800 | 1.0 / 800 |

Sources: https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ExpressiveMotionTokens.kt ·
https://android.googlesource.com/platform/frameworks/support/+/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/StandardMotionTokens.kt

Note the structure: effects springs are **critically damped (1.0) in both schemes** and differ only
in stiffness. The entire Expressive-vs-Standard difference lives in the *spatial* damping ratio.

Google's published CSS-bezier approximations of the Expressive spatial springs, for web fallback:
fast `cubic-bezier(0.42, 1.67, 0.21, 0.90)` @ 350ms · default `cubic-bezier(0.38, 1.21, 0.22, 1.00)`
@ 500ms · slow `cubic-bezier(0.39, 1.29, 0.35, 0.98)` @ 650ms.

The research behind M3 Expressive: 46 studies, 18,000+ participants over three years. Users spotted
key UI elements up to **four times faster**, preference reached **87% among 18–24s**, and there was
*"a dramatic erasure of age effects in fixation times."*
Source: https://design.google/library/expressive-material-design-google-research

🚩 **Critical planning fact: Material 3 Expressive is NOT coming to Flutter.** The umbrella issue
states *"we are not actively developing Material 3 Expressive, and we will not be accepting
contributions for Expressive features or updates at this time."* Material and Cupertino are being
decoupled into standalone packages. **If HabitCrafts wants M3E springs, we implement them ourselves
from the token values above** — via `SpringDescription.withDampingRatio(mass, stiffness, ratio)` —
or use a community package such as https://pub.dev/packages/motor.
Source: https://github.com/flutter/flutter/issues/168813

**IBM Carbon**, as a useful cross-check and a better mental model for a habit app:
durations fast-01 70ms · fast-02 110ms · moderate-01 150ms · moderate-02 240ms · slow-01 400ms ·
slow-02 700ms. Curves: productive-standard `cubic-bezier(0.2, 0, 0.38, 0.9)`, expressive-standard
`cubic-bezier(0.4, 0.14, 0.3, 1)`. **Carbon's productive/expressive split maps perfectly onto our
problem: productive curves for the checkbox users hit dozens of times a day, expressive curves for
the once-a-month milestone.**
Source: https://github.com/carbon-design-system/carbon/blob/main/packages/motion/src/tokens.ts

**Apple HIG** publishes no numeric duration tokens; the guidance is qualitative but pointed:
*"Don't add motion for the sake of adding motion,"* generally avoid motion on frequent interactions,
and — directly relevant to M1 — *"don't make people wait for an animation to complete before they
can act,"* so animations must be cancellable. Apple's one hard number is about comfort: avoid
sustained oscillations around **0.2 Hz** (one per five seconds), the frequency most associated with
motion discomfort. Since iOS 17, SwiftUI's default animation is a **spring**, with `smooth`,
`snappy` and `bouncy` presets all defaulting to **0.5s** and parameterised by `duration` + `bounce`
rather than mass/stiffness/damping — the same two-parameter model Flutter exposes as
`SpringDescription.withDurationAndBounce()`.
Sources: https://developer.apple.com/design/human-interface-guidelines/motion ·
https://api.flutter.dev/flutter/physics/SpringDescription-class.html

### Springs vs easing — the decision rule

Springs win where motion is **continuous with user input** (dragging, flicking, swipe-to-complete),
because they accept an initial velocity and are interruptible; easing curves have a fixed duration
and fall apart under interruption. Easing wins where **the system is announcing something** — a
state transition completing, a modal arriving. Neither belongs on very high-frequency interactions
where animation only adds latency. Source: https://www.userinterface.wiki/to-spring-or-not-to-spring

Additional rule *(judgement)*: never apply a spring to a colour or opacity transition — the
overshoot produces a visible tint wobble. This is exactly why M3's *effects* springs are critically
damped.

### Recommended durations by interaction type — the convergent numbers

- **Micro-interaction** (checkbox, toggle, ripple): **~100ms.** NN/g: simple feedback animations
  should be *"roughly 100 ms in total duration"*; 0.1s is the threshold for feeling instantaneous.
  Sources: https://www.nngroup.com/articles/animation-duration/ ·
  https://www.nngroup.com/articles/response-times-3-important-limits/
- **Component / modal transition:** 200–300ms.
- **Page transition:** **300ms** standard on mobile, 375ms full-screen, **400ms hard ceiling**.
  Desktop is **150–200ms**. Tablet +30%, wearables −30%.
  Source: https://m1.material.io/motion/duration-easing.html
- **Enter/exit asymmetry: entering 225ms, leaving 195ms** — entering elements need longer so the eye
  can settle; exits are lower priority and should be quicker.
- **The 500ms wall:** *"At 500 ms, animations start to feel like a real drag for users — they become
  cumbersome and annoying."* It is far more common for animations to be too long than too short, and
  **the more frequently an animation is encountered, the shorter and subtler it must be.**
  Source: https://www.nngroup.com/articles/animation-duration/
- **Easing pairing:** ease-out for entrances, ease-in for exits, avoid linear (*"unnatural or
  awkward"*) **except for progress bars**, where linear correctly maps time to progress.

## 3.2 Motion — staggered lists (corrected: 20ms, not 50ms)

**Material's choreography spec is the tightest constraint anyone publishes: "Begin each item's
staggered entrance no more than 20 ms apart,"** with grid items populating left-to-right then
top-to-bottom, never in a confusing order and never all at once.
Source: https://m1.material.io/motion/choreography.html

**IBM independently landed on the same number, plus a total-time budget:** *"staggering the entrance
of table content by 20 ms significantly reduces the cognitive load,"* adjusted per item count so the
**total stays within 500ms.** IBM also gives a screen-level choreography order worth stealing:
static shell/nav → static body content → dynamic content → primary actions → animated content.
Source: https://design-language-website.netlify.app/design/language/motion-ui/choreography/

Web animation libraries run looser — Motion recommends 50–100ms per item
(https://motion.dev/docs/stagger) — and general practice puts the delay at roughly 30–70% of each
item's own animation duration, with **the first item at zero delay** so nothing feels broken.
Source: https://blog.logrocket.com/css-staggered-animations/

**Reconciliation for HabitCrafts: 20–40ms per item, whole cascade under 500ms, first item at 0ms.**
20ms if following Material literally; up to ~40ms because our habit rows are large cards. Anything
over ~60ms makes a 10-item list feel like a slideshow. The binding rule is the **500ms total
budget**, not an item count — at 40ms that is 12 items.

**Flutter implementation note.** The idiomatic pattern is to stagger only what is visible in the
first frame. `flutter_staggered_animations` does this via `AnimationLimiter`, which *"prevents the
children widgets to be animated if they don't appear in the first frame,"* with a default child
duration of **225ms** (matching Material's entering-element number). **But the package is
effectively abandoned** — v1.1.1, last published ~3 years ago, minimum Dart SDK 2.17 (pre-Dart 3).
**Copy the `AnimationLimiter` pattern** — an `Interval`-per-index inside one `AnimationController`,
gated to first-frame-visible children — rather than taking the dependency.
Source: https://pub.dev/packages/flutter_staggered_animations

Remaining *(judgement)*: entrance = opacity 0→1 plus translateY. Never scale a list item in; it
reads as a notification, not content. **First mount only** — never re-stagger on refresh, and never
trigger on scroll-into-view (a 2019 marketing-site idiom, actively dated in product UI).

## 3.3 Celebratory moments — sound, haptics, particle discipline

Google's own design guidance on sound and haptics gives the pairing rule directly: *"A sharp, quick
visual animation pairs well with a crisp Light haptic tap and a short, high-pitched sound, while a
slow, heavy visual interaction might warrant a stronger Medium or Heavy haptic with a slightly
longer duration and a lower-pitched, resonant sound."* It also argues the channel is underused —
*"attaching thoughtful, nuanced sounds and haptics to even the most micro interactions can make
something mundane feel genuinely satisfying."*
Source: https://design.google/library/ux-sound-haptic-material-design

The guardrail: *"Delight must serve a purpose — speeding up understanding, signaling state changes,
or easing frustration."*
Source: https://medium.muz.li/designing-for-delight-crafting-micro-interactions-that-matter-61dc45239d69

Be aware there is now an academic literature on **"dark haptics"** — manipulative haptic design in
mobile UIs. Source: https://arxiv.org/pdf/2504.08471

### What makes celebration feel cheap vs delightful — it's magnitude mismatch, not craft

There are **1,600+ confetti designs circulating on design platforms**, so a confetti burst *"is
neither surprising nor delightful anymore."* The proposed test is frequency-first: reserve animation
for infrequent milestones, since *depositing a cheque should not get the same treatment as buying a
house.* Source: https://uxdesign.cc/the-over-confetti-ing-of-digital-experiences-af523745db19

The second failure mode is **timing** — celebrating too early *"distorts the user's ability to
predict what comes next"* because the user believed the flow was over.
Source: https://uxplanet.org/why-confetti-celebrations-backfire-and-how-to-make-them-work-be838a6e7b8b

NN/g's position: animation belongs *"primarily as a tool for providing users with easily noticeable,
smooth feedback,"* and animation used for *"surface-level delight"* frustrates users in usability
testing. Celebratory feedback specifically **polarises** — Asana's unicorn delights some users and
reads as unnecessary fanfare to others.
Source: https://www.nngroup.com/articles/animation-purpose-ux/

### Escalation, and the fact that novelty decay is non-monotonic

Smashing Magazine's February 2026 streak-system article is the most on-point source for a habit app.
It recommends marking **Day 7, 30, 50, 100 and 365** with animated graphics and bonus rewards
specifically to create anticipation *"rather than endless sameness."*
Source: https://www.smashingmagazine.com/2026/02/designing-streak-system-ux-psychology/

**Celebration fatigue is empirically real but recovers.** The gamification novelty effect begins
decreasing around **four weeks**, declines for **two to six weeks**, then **trends back up between
six and ten weeks** via a familiarisation effect. Two implications: do not judge a celebration
design on week-1 metrics, and **vary the payload across the first ~10 weeks.**
Source: https://eric.ed.gov/?id=EJ1325797

### The dark-pattern line — the test to apply

Smashing's ethical test is the sharpest available: **"Does your product make money by selling
solutions to anxiety that your product created?"** The article documents that losing a streak is
felt roughly **twice as intensely** as gaining one, and prescribes grace mechanics — **streak
freezes, a 2–3 hour grace window past deadline, or decay that deducts ~10 days rather than hard
resetting to zero.** Its copy contrast is worth copying verbatim:

> Manipulative: *"You lost your 42-day streak. Start over."*
> Supportive: *"You showed up for 42 days straight. That's incredible progress! Wanna give it
> another try?"*

Source: https://www.smashingmagazine.com/2026/02/designing-streak-system-ux-psychology/

### Haptics — platform reality, including a gap that affects our design

**Flutter's built-in `HapticFeedback` mappings:** `lightImpact()` → iOS Impact light / Android
`VIRTUAL_KEY`; `mediumImpact()` → iOS Impact medium / Android `KEYBOARD_TAP`; `heavyImpact()` → iOS
Impact heavy / Android `CONTEXT_CLICK`; `selectionClick()` → iOS `UISelectionFeedbackGenerator` /
Android `CLOCK_TICK`. Source: https://api.flutter.dev/flutter/services/HapticFeedback-class.html

🚩 **Flutter core exposes NO notification/success haptic.** There is no binding to
`UINotificationFeedbackGenerator(.success)` or Android's `CONFIRM` constant. **A genuine "milestone
achieved" haptic requires a plugin** — `haptic_kit`, `haptic_feedback`, or `gaimon` — or our own
platform channel. This directly constrains M3 in Section 5.

**Google's Android haptics principles are unusually prescriptive:** *"less is more"* (over-vibration
is *"annoying and even numbing to the hands"* and pushes users to disable all haptics); *"given the
choice of buzzy haptics or no haptics for touch feedback, choose no haptics"*; co-design visual,
audio and haptic together because out-of-sync haptics are *"unsettling."* Optimal keyclick duration
is **10–20ms**, plus **20–50ms of actuator ring-off you must budget for.**
Source: https://developer.android.com/develop/ui/views/haptics/haptics-principles

**Apple:** match the haptic's intensity and sharpness to the accompanying animation; call
`prepare()` ahead of the event to reduce latency; *"the best haptic experience often goes unnoticed
but is missed when turned off."* **Treat all haptics as "may silently no-op"** — iPad, iPod touch
and Vision Pro have no haptics at all, and the engine stops on audio-session interrupts.

**Web: assume zero haptics.** The Vibration API sits at ~78% global support and **Safari does not
support it on macOS or iOS, across all versions.** For HabitCrafts web — likely a large share of
which is iOS Safari — **there is no tactile channel at all.** https://caniuse.com/vibration

**Sync tolerance, measured:** the mean delay at which visual-haptic stimuli are judged asynchronous
is **~45ms**, with **27–71ms perceptually insignificant.** Useful asymmetry: visual events are
perceived as *later* than physically synchronous haptic events, **so firing the haptic marginally
after the visual peak is safer than before.** Target ≤30ms offset.

### Sound

**iOS audio category matters.** In silent mode iOS *"plays only audio that people explicitly
initiate,"* and users specifically want to silence sound effects. **"Ambient"** (non-essential,
mixes with other audio, respects the silence switch) is the correct category for a reward chime;
"Playback" would violate expectation.
Source: https://developer.apple.com/design/human-interface-guidelines/playing-audio
**Android:** do not request audio focus for a reward chime; use
`AudioAttributes.CONTENT_TYPE_SONIFICATION`.

**Length and character:** a micro-interaction sound should not last more than ~**0.3s** longer than
its animation; frequent actions get *"subtle, shorter, and warmer"* sounds. **Direction encodes
valence** — rising pitch for success, falling for loss (Discord's join/leave pair is canonical).
Differentiate success from error via direction, rhythm and timbre, **not volume.**
Source: https://www.toptal.com/designers/ux/ux-sounds-guide

**Accessibility:** WCAG **1.4.2 Audio Control (A)** requires pause/stop for audio playing
automatically for **more than 3 seconds** — and muting system volume does *not* satisfy it. Keep
reward sounds well under 3s and this is moot. **1.3.3 Sensory Characteristics (A)** forbids relying
solely on sound.

### Implementation note

Painting hundreds of particles per frame is the expensive path; **playing a pre-authored Lottie or
Rive animation is materially lighter on CPU/GPU.** On web, `canvas-confetti` ships a
`disableForReducedMotion` option — the reference pattern for gating a celebration on the motion
preference. Source: https://github.com/catdad/canvas-confetti
Note the audit finding: HabitCrafts has an empty `assets/rive_animations/` folder and **neither rive
nor lottie in `pubspec.yaml`** — adding one is a real (small) dependency decision.

### My synthesised rules for HabitCrafts *(judgement, grounded in the above)*

- **Three tiers, asymmetric reward.** Tier 1 (habit checked, many times daily): ~100ms, haptic, no
  sound, no particles. Tier 2 (streak extended): 250–400ms, optional chime defaulting off.
  Tier 3 (day 7/30/50/100/365): confetti earns its keep because it is rare.
- **Cap the particle count** — ≤ 8 for a micro-reward, ≤ 40 for a milestone.
- **Everything ends** and nothing blocks the next action. One full celebration per session.
- **Pair haptic and visual within 30ms**, firing the haptic marginally *after* the visual peak.
- **Sound off by default**, Ambient category, under 3s.
- **Vary the milestone payload across the first ~10 weeks** to counter documented novelty decay.
- **Apply the Smashing ethical test to every piece of streak-loss copy.**

## 3.4 What makes habit/wellness apps fun while staying calm — real product evidence

This is the most useful research that came back. All of it is directly transferable.

### Finch — the benchmark, with retention numbers to justify copying it

Finch posts **54% D1 / 37% D7 retention, ahead of Duolingo (51%/35%) and Royal Match (40%/25%)**,
and reached **$30M ARR without VC funding**.
Sources: https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl ·
https://blog.sparrowapps.io/p/finch-how-a-self-care-app-hit-30m-arr-without-vc-money

The transferable mechanics:

- **Displaced reward — the single most important idea in this brief.** You do not earn points; *the
  bird* earns energy. Complete a habit → your finch gets energy to go exploring; do a breathing
  exercise → your finch sends you an encouraging note. The reward is relational, not a scoreboard.
  Source: https://www.yogajournal.com/lifestyle/finch-self-care-app/
- **Cosmetic-only currency.** Progression buys clothing and furniture — decorative, so there is no
  power-creep anxiety. Same source.
- **Appointment mechanics instead of notifications.** Timer-gated "adventuring" *"creates organic
  return windows without constant nagging."*
  Source: https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl
- **No punishment.** *"The app never pressures you or punishes you for missing a day."*
- **Immediate legible feedback:** completing a task triggers *"immediate visible responses: the
  Finch gains energy, performs joyful animations, or displays messages such as 'Your Finch feels
  calmer'."* Source: https://ixd.prattsi.org/2025/09/design-critique-finch-ios-app-2/

**Finch's documented failures — these are HabitCrafts' traps too, and two of them are already
present in the current app:**

- **Onboarding overload:** it *"violates progressive disclosure by presenting customization
  options, colors, traits, and mental health self-assessments simultaneously."*
- **Home-screen clutter:** *"the homepage clutters core tasks with shops, journeys, and premium
  prompts. Users intending to 'log my mood' face competing visual elements."* — Compare the
  HabitCrafts Groups page with five top-level tabs.
- **Inconsistent feedback:** *"journaling entries… sometimes fail to trigger animations, leaving
  users unsure whether their input was recorded."* — Compare HabitCrafts' entirely absent tap
  feedback (audit 1.7).
- **Paywalling the therapeutic core.** The recommended fix is explicit: keep core wellness tasks
  free, **monetize cosmetics**.
- **Latent guilt:** *"the gamified structure that helps some people can feel like pressure if
  reminders, goals, or streak-like routines start creating guilt"* — note the **2.4-star Trustpilot
  rating against a 4.9 App Store rating**.
  Sources: https://ixd.prattsi.org/2025/09/design-critique-finch-ios-app-2/ ·
  https://habitbox.app/blog/finch-app-review · https://www.aidorable.ai/blog/finch-app-reviews

### Duolingo — streak design, with hard numbers

- **Streak Freeze:** users offered it were **4% more likely to return a week later and 5% less
  likely to lose their streak.**
- **Decoupling streak from goal was the breakthrough:** tying streak maintenance to daily *goal*
  completion created anxiety. Separating them — streak extends with one lesson, goals tracked
  separately — **increased 7+ day streaks by over 40%.**
- **"Earn Back" beats pay-to-protect:** recovery through *effort* rather than *payment* preserves
  streak value without monetising anxiety.
- Mechanisms named: loss aversion, variable reinforcement (*"the same psychological mechanism as
  slot machines"*), and the Zeigarnik effect.
  Source: https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame
- Streak value: users hitting a 7-day streak are **3.6× more likely to complete their course**;
  learners with 7+ day streaks are **2.4× more likely to return the next day.** This is why
  Section 5's M3 fires at day 7.
  Source: https://medium.com/@productbrief/duolingo-s-gamified-growth-how-a-green-owl-turned-language-learning-into-a-14-billion-habit-d47d9fa30a77
- **The criticism:** Duo *"became a symbol of streak anxiety, with playful yet persistent
  notifications often featuring guilt-inducing messages and sad animations."* Pushy streak
  reminders generated ~5% user complaints before Duolingo capped them and added opt-outs.
  Sources: https://opinionsandconditions.substack.com/p/duolingo-owl-dark-patterns-digital-guilt ·
  https://webdesignerdepot.com/the-art-of-duolingo-notifications-the-subtle-manipulation-of-language-learners/

### Apple Fitness rings

Exploits the **Gestalt principle of closure** — *"when a user sees a 90% finished circle, it creates
an 'open loop' in their subconscious — a psychological itch that can only be scratched by finishing
the activity."* Source: https://trophy.so/blog/the-psychology-of-apple-watchs-close-your-rings

Praised because it *"celebrates achievement without punishment for missing days; emphasizes
long-term trends over daily perfection."* Criticised for guilt — shifting emphasis from daily
streaks to **weekly consistency** is *"often more realistic and less guilt-inducing."*
Sources: https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame ·
https://www.michigandaily.com/opinion/you-dont-have-to-close-your-rings/

**This validates the ring-based progress encoding in Section 2 and M1.**

### Streaks (the app), Fabulous, Headspace, Reflectly

- **Streaks** (Apple Design Award 2016): habits are a *big tap-and-hold button*, bold shapes, hard
  cap of **24 tasks**, and auto-completion from Apple Health without opening the app — a strong
  calm-tech move. Caveat: its coloured-circle interface *"has become the visual shorthand for what a
  streak tracker looks like"* — i.e. a cliché to differentiate from.
  Sources: https://www.fastcompany.com/4010412/apple-app-design-awards-winner-streaks · https://streaksapp.com/
- **Fabulous — the cautionary example.** High production value (countdown timers, dedicated imagery,
  soundtracks, a voice that calls you by name) but *"the interface can feel noisy for some,
  especially those with ADHD."* This is the exact failure mode: production value read as noise.
  Source: https://www.mindfulsuite.com/reviews/best-habit-tracker-apps
- **Headspace — the key counterintuitive lesson.** The most famous calm-app brand is **not
  desaturated**. It leads with a signature orange plus a palette chosen *"to better represent the
  range of human emotions"* — *"bright, uplifting, bold and lively"* — with a custom cut of Aperçu
  *"full of little quirks and joyful surprises."* Calm comes from **generous space, soft shapes and
  gentle motion**, not from low chroma.
  Source: https://www.itsnicethat.com/articles/italic-studio-headspace-graphic-design-project-250424
- **Reflectly:** prompts and structured mood check-ins over free writing — *"the whole point for
  people who stall at the empty entry."* Transferable idea: **eliminate the blank page.**
  Source: https://www.mindfulsuite.com/reviews/best-habit-tracker-apps

### Ranked: mechanics that create delight without noise

**Safe** — cosmetic-only unlockables > companion growth where reward accrues to a character >
ring/loop closure > timer-gated return windows > live widget presence > completion sound+haptic >
seasonal cosmetic themes. Ship **streak freezes, grace periods, effort-based earn-back,
weekly-consistency framing, non-binary tracking ("3× per week"), and pause-for-planned-break**.

**Hard nos** — confirmshaming copy ("Are you really going to give up now?"), pay-to-protect streaks,
all-or-nothing resets (*"perfectionism traps… driving abandonment rather than recovery"*),
paywalling the therapeutic core, and a home screen with competing CTAs.

## 3.5 "Calm design" — the terminology is real, and it is certifiable

The oldest and most legitimate lineage is **Calm Technology**, from Xerox PARC in 1995 and codified
in Amber Case's 2015 O'Reilly book. It is now institutionalised: the **Calm Tech Institute launched
"Calm Tech Certified™" in 2024**, measuring four axes — **periphery engagement, tactility, material
harmony, durability.** The eight principles include *"Require the smallest possible amount of
attention," "Inform and create calm," "Make use of the periphery,"* and *"Communicate without
speaking."* Principles 2 and 3 are load-bearing for a habit app: it should live in the periphery
(widget, complication) and *inform* rather than demand.
Source: https://www.calmtech.institute/calm-tech-principles

The 2026 trade vocabulary: **"Calm Interfaces"** is named a top-six trend, with the striking claim
that *"gamification will be replaced with calmer micro-interactions, and more extravagant motion
controls will be surpassed by strategic ones"* — a shift from *"sensory richness"* to *"cognitive
clarity."* Source: https://elements.envato.com/learn/ux-ui-design-trends

**"Warm minimalism" / "soft minimalism"** are real terms but originate in interiors and are bleeding
into digital — *"clarity without harshness — a minimalism that offers a sense of comfort,
groundedness, and authenticity."* The digital-native equivalent is **"neo-minimalism"**:
*"neo-minimal interfaces avoid harsh contrasts and rigid grids in favor of softer color transitions,
rounded elements, and more organic spacing."*
Sources: https://www.interluxinteriors.com/the-rise-of-warm-minimalism-a-new-year-a-new-sensory-language-of-luxury-for-early-2026 ·
https://www.lummi.ai/blog/ui-trends-2026

⚠️ **"Digital wellbeing aesthetic" is NOT established design terminology.** Use *calm design*,
*calm tech*, or *warm minimalism* instead.

**Restrained contrast that still passes AA — practical tactics:**
- Darken the muted grey rather than abandoning it: `#9CA3AF` on white fails; `#6B7280` or `#4B5563`
  passes *"while maintaining the muted aesthetic."*
- Tint the *background* instead of the text to buy ratio without disturbing the design.
- Buy headroom with type size/weight — the threshold drops to 3:1 at ≥18pt regular / ≥14pt bold.
- **Palettes are not compliant — pairings are.**
  Sources: https://testparty.ai/blog/color-contrast-requirements · https://www.studiolimb.com/guides/wcag-color-contrast-guide.html

A useful saturation heuristic for calm palettes: **background saturation below 30%, accent
saturation capped around 55–60% in HSL.** Source: https://muffingroup.com/blog/calm-color-palette/

## 3.6 Reduced motion and animation accessibility *(spec)*

### "Reduced" means reduced, not none — and opacity is the sanctioned substitute

The media query detects a preference to minimise **non-essential** motion, conveying that the user
*"prefers an interface that removes, reduces, or replaces motion-based animations."*
Source: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

**What actually triggers vestibular symptoms** (WebKit's canonical article): scaling/zooming, which
*"give the illusion that the viewer is moving forward or backward in physical space"*;
spinning/spiralling; multi-speed movement (parallax); 2.5D plane shifting; and **peripheral motion**,
since *"horizontal movement in the peripheral field of vision can cause disorientation or
queasiness."* The remedy is *"an alternate, simpler animation, or another visual indicator to convey
the intended meaning."* Source: https://webkit.org/blog/7551/responsive-design-for-motion/

**The substitution is opacity for movement, and this is not arbitrary — WCAG endorses it.** SC
2.3.3's definition of motion animation explicitly states that **changes in colour, blurring, or
opacity that do not change perceived size, shape, or position are NOT motion animation.**
Source: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html

**Apple now publishes hard, testable criteria** for declaring Reduced Motion support in the App
Store Accessibility Nutrition Label: disable or change depth simulation (parallax, animated blur,
depth-of-field), multi-axis/multi-speed/spinning/vortex motion, and auto-advancing carousels.
Crucially — *"decorative animations may be stopped outright, but meaningful animations should not be
removed"*; replace them with *"dissolve transitions, highlight fade, color shift, or static visual
changes."*
Source: https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria/

iOS has a second, finer switch — **"Prefer Cross-Fade Transitions"**, exposed as
`UIAccessibility.prefersCrossFadeTransitions`, which turns lateral slides into dissolves.

**The common mistake** is the "nuclear option" global `animation-duration: 0.01ms !important` block.
As a *design* answer it is wrong: it kills harmless opacity fades that are safe for everyone, can
make JS-driven animation *"super fast and dizzying"* rather than absent, and discards animation that
aids cognition. Eric Bailey's framing: it is `prefers-reduced-motion`, not `prefers-no-motion`.
As many as **35% of U.S. adults over 40 experience vestibular dysfunction.**
Sources: https://css-tricks.com/revisiting-prefers-reduced-motion/ ·
https://www.a11yproject.com/posts/understanding-vestibular-disorders/

**Concrete pattern for our celebration moments:** under reduced motion, replace the confetti burst
with a static badge or a pure opacity fade-in plus the same text, **and keep the haptic** — the
reward still lands, the vestibular trigger does not.

### WCAG 2.2 criteria — exact numbers

- **SC 2.3.3 Animation from Interactions (AAA):** motion animation triggered by interaction can be
  disabled unless essential. Sufficient techniques include a user-facing toggle *and* honouring
  `prefers-reduced-motion`.
- **SC 2.2.2 Pause, Stop, Hide (A)** — two independent bullets, and the asymmetry matters:
  *moving/blinking/scrolling* needs a pause/stop/hide mechanism if it (1) starts automatically,
  (2) **lasts more than five seconds**, and (3) runs in parallel with other content. But
  *auto-updating information* needs pause/stop/hide **or frequency control** with **no five-second
  allowance at all.** Source: https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- **SC 2.3.1 Three Flashes (A):** nothing flashes more than three times per second. Relevant to
  particle bursts — keep confetti pieces from strobing.

### 🚩 Three Flutter findings that change what we build

**1. iOS Reduce Motion is invisible to `MediaQuery.disableAnimationsOf`.** Flutter's own docs:
*"This corresponds to Android's 'Remove animations' accessibility setting. **On iOS, reduced motion
is exposed separately via `dart:ui.AccessibilityFeatures.reduceMotion` and does not set this
flag.**"* Confirmed in engine source — the Android bridge annotates `REDUCE_MOTION(1 << 4), // NOT
SUPPORTED` and drives `disableAnimations` off `Settings.Global.TRANSITION_ANIMATION_SCALE == 0.0f`.
**A reduced-motion implementation built only on `disableAnimations` gives every iPhone user the full
motion UI.** We need a helper that ORs `reduceMotion` and `disableAnimations` off
`WidgetsBinding.instance.platformDispatcher.accessibilityFeatures`, listening to
`onAccessibilityFeaturesChanged`.
Source: https://api.flutter.dev/flutter/widgets/MediaQueryData/disableAnimations.html

**2. When `disableAnimations` is true, Flutter does not remove motion — it runs it at 5% duration.**
From `animation_controller.dart`: `final scale = animationBehavior._enableAnimations ? 1.0 : 0.05;`
(zero would risk an endless loop for repeating animations). **Movement at 20× speed is still a
vestibular trigger.** Worse, `AnimationBehavior.preserve` — the default for repeating animations —
ignores the flag entirely. **Branching to an opacity-only path is our job, not the framework's.**

**3. Flutter web only started honouring `prefers-reduced-motion` in stable 3.44.0.** Before that it
was a no-op (issue #167566, P1, filed 2025-04-22; fixed by PR #180041). The web engine sets
`reduceMotion` and `disableAnimations` together. **If the HabitCrafts web build is pinned below
3.44.0, the media query does nothing.**

Also: **`TickerMode` is not a reduced-motion mechanism** — it mutes frame callbacks for off-screen
routes, but *"time will still elapse"* and the controller value still changes.

And **`accessibleNavigation`** (true when TalkBack/VoiceOver/Switch Control is active) carries a
concrete design consequence the docs spell out: disable timeouts or increase minimum durations.
**For HabitCrafts that means no auto-dismissing celebration card and no timed undo window when a
screen reader is on.** This directly modifies M1 and M3 in Section 5.
Source: https://api.flutter.dev/flutter/widgets/MediaQueryData/accessibleNavigation.html

## 3.7 Accessibility targets *(spec)*

- **SC 1.4.3 Contrast (Minimum), AA:** 4.5:1 for text; **3:1 for large-scale text.**
  "Large scale" is defined as *"at least 18 point or 14 point bold"*; W3C's own conversion is
  *"1pt = 1.333px, therefore 14pt and 18pt are equivalent to approximately **18.5px and 24px**."*
  (The commonly quoted "18.66px" is the unrounded arithmetic; W3C's text rounds to 18.5px.)
  No requirement for incidental, inactive or decorative text, or logotypes.
  https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- **SC 1.4.11 Non-text Contrast, AA:** 3:1 for *"visual information required to identify user
  interface components and states"* and for *"parts of graphics required to understand the
  content."* **This is the criterion governing our progress rings, checkbox borders, streak-dot
  filled-vs-empty states and chart bars** — 3:1 against the background *and* against each other
  where the difference carries meaning.
  https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- **SC 1.4.6 Contrast (Enhanced), AAA:** 7:1 text, 4.5:1 large.
- **SC 1.4.1 Use of Color, A:** colour cannot be the only visual means of conveying information.
  https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- **SC 2.5.8 Target Size (Minimum), AA:** **24 × 24 CSS px.** Note the **spacing exception** most
  people miss: an undersized target passes if a 24px-diameter circle centred on its bounding box
  does not intersect another target's circle — i.e. a 20×20 icon button conforms at a 24px pitch.
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- **SC 2.5.5 Target Size (Enhanced), AAA:** 44 × 44 CSS px.
- **Apple HIG:** *"Create controls that measure at least 44 points x 44 points."*
- **Material / Android:** 48 × 48 dp, *"larger is even better."*
- **Flutter's own checklist:** *"All tappable targets should be at least 48x48 pixels."* Encoded as
  `kMinInteractiveDimension = 48.0` and `kMinInteractiveDimensionCupertino = 44.0`.
  https://docs.flutter.dev/ui/accessibility-and-internationalization/accessibility
- **SC 2.5.1 Pointer Gestures, A:** any path-based gesture must have a single-pointer alternative —
  this directly condemns swipe-to-complete as HabitCrafts' sole completion mechanism.
  https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html

**Ruling for HabitCrafts: design to 48dp/48pt.** That simultaneously satisfies WCAG 2.5.8 AA (24px),
2.5.5 AAA (44px), Apple's 44pt and Material's 48dp. **There is no reason to target the 24px floor.**
The current 40px buttons fail even the AAA/Apple bar.

### APCA status in 2026: promising, normative nowhere

- **APCA is not in WCAG 3.** It was removed from the WCAG 3 Working Draft in July 2023. As of the
  **April 8, 2026 editor's draft the text reads: "The contrast algorithm used in WCAG 3 is yet to be
  determined."** Source: https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html
- The WCAG 3.0 Working Draft (2026-03-03) still carries *"it is inappropriate to cite this document
  as other than a work in progress."* https://www.w3.org/TR/wcag-3.0/
- APCA's Lc thresholds, for reference: **Lc 90** preferred body text ≥14px/400 · **Lc 75** minimum
  for body columns ≥18px/400 · **Lc 60** other content text · **Lc 45** larger/heavier text ·
  **Lc 30** absolute minimum incl. placeholder/disabled · **Lc 15** non-text minimum.
  https://git.apcacontrast.com/documentation/APCAeasyIntro.html
- APCA's case is that 4.5:1 *"can be functionally unreadable when a color is near black"* and
  ignores spatial frequency, making WCAG 2 especially poor for dark mode.

**Position for HabitCrafts: ship to WCAG 2.2 AA numerically** (as Section 4 does). Optionally run
APCA as a secondary sanity check on **dark-mode** text, where WCAG 2 is known to be over-permissive.
**Do not claim APCA conformance — there is nothing to conform to.**

### Never encode streaks or progress by colour alone

SC 1.4.1's sufficient techniques double as the implementation checklist: **G14** information also
available in text · **G182** additional visual cues where colour differences convey information ·
**G111** colour *and* pattern · **G205** a text cue for colour-coded labels.

**A green-vs-grey cell in a streak calendar is a 1.4.1 failure on its own.** Encode redundantly
with: a glyph (check / dash / dot), a fill difference (filled vs outlined vs hatched), a lightness
step large enough to survive grayscale, a per-cell semantics label ("Mon Aug 10, completed"), and a
visible numeric streak count rather than colour intensity. The cell fills must *additionally* hit
3:1 under 1.4.11.

**Okabe & Ito Color Universal Design** — the source of the Okabe-Ito scheme in matplotlib/ggplot —
prescribes using *"not only different colors but also a combination of different shapes, positions,
line types and coloring patterns,"* varying **brightness and saturation rather than hue alone**,
labelling directly inside the graphic rather than in a distant legend, **avoiding red/green pairs
(substitute magenta/green)**, and ensuring the information survives grayscale conversion.
The eight values: `#E69F00` orange · `#56B4E9` sky blue · `#009E73` bluish green · `#F0E442` yellow ·
`#0072B2` blue · `#D55E00` vermilion · `#CC79A7` reddish purple · `#000000` black. Recommended order
starts with blue and orange. Source: https://jfly.uni-koeln.de/color/

Prevalence: *"about 1 in 12 men have color vision deficiency,"* ~1 in 200 women, roughly 300 million
people worldwide. Source: https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/color-blindness

**Applied to HabitCrafts:** the current progress calendar uses `#7cCf7b` green borders and `#FFCE51`
gold fills as the sole differentiator — a straight 1.4.1 failure. **Flutter implementation:** wrap
progress indicators in `Semantics(label: 'Streak: 12 days', liveRegion: true, child: ...)`; a live
region generates an automatic announcement on both platforms even without accessibility focus.

## 3.8 Responsive and adaptive *(spec)*

**Material 3 window size classes** (width, dp):

| Class | Range | Typical device |
|---|---|---|
| Compact | < 600 | Phone portrait |
| Medium | 600–839 | Tablet portrait, large foldable, phone landscape |
| Expanded | 840–1199 | Tablet landscape, small laptop |
| Large | 1200–1599 | Desktop |
| Extra-large | ≥ 1600 | Large desktop / ultrawide |

Source: https://m3.material.io/foundations/layout/applying-layout/window-size-classes

Verified against the real API constants — Large and Extra-large were added in WindowManager 1.5.0 /
Compose Material3 Adaptive 1.2. Coverage data: Compact covers **99.96% of phones in portrait**,
Medium **93.73% of tablets in portrait**, Expanded **97.22% of tablets in landscape**.
Source: https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes

Height classes also exist and are worth knowing for browser windows: Compact < 480dp (99.78% of
phones in landscape) · Medium 480–899 · Expanded ≥ 900.

**Navigation switching — exact breakpoints:**
- **Bottom bar → rail at 600.** Flutter's own number: *"bottom nav bar for windows **less than 600
  logical pixels wide**, and a nav rail for those that are **600 pixels wide or greater**."*
  Source: https://docs.flutter.dev/ui/adaptive-responsive/general
  `NavigationRail` holds *"typically between three and five"* destinations.
- **Rail → permanent drawer: no single official number exists.** Google's documented override
  pattern uses `WIDTH_DP_EXPANDED_LOWER_BOUND` = **840dp**; Flutter community packages standardise
  on **1200dp**. **Recommendation: bar <600, rail 600–1199, permanent drawer ≥1200**, which aligns
  the drawer switch with the new Large boundary.
- Flutter defaults: `NavigationRail.minWidth` = 72, `NavigationBar.height` = 80, `Drawer` = 304.0
  (the M3 spec says 360dp — a known discrepancy, flutter#123380).

🚩 **`flutter_adaptive_scaffold` is DISCONTINUED** — *"this project has been discontinued, and will
not receive further updates"* (announced 2025-02-10, flutter#162965). There is no first-party
Flutter equivalent of Android's `NavigationSuiteScaffold`. Given the fork churn among community
replacements, **hand-rolling is lower risk** — roughly 40 lines: `MediaQuery.sizeOf` plus a switch
returning `NavigationBar` / `NavigationRail` / `NavigationDrawer` inside a shared `Scaffold`.
Source: https://pub.dev/packages/flutter_adaptive_scaffold

**Max content width for readability:**
- Butterick: *"the average line length should be **45–90 characters** (including spaces)."*
  https://practicaltypography.com/line-length.html
- Google's Material adaptive codelab sets a tighter working rule: **60-character max line length**
  on large screens. https://developer.android.com/codelabs/adaptive-material-guidance
- Flutter's explicit rule: **"DON'T gobble up horizontal space"** — do not stretch boxes and text
  fields to full window width; use grid layouts instead.
  https://docs.flutter.dev/ui/adaptive-responsive/best-practices
- Implementation: `ConstrainedBox(maxWidth: 600–840)`, centred. **600 ≈ 60ch at a 16sp body font**;
  840dp is a sane hard ceiling for a single text column.

**Multi-column canonical layouts** (https://developer.android.com/develop/adaptive-apps/guides/canonical-layouts):
- **List-detail** — one pane compact/medium, both side-by-side expanded. **List pane fixed width,
  detail pane flexible.** In Google's 12-column reference the detail pane is 5 columns with 16dp
  internal padding.
- **Supporting pane** — **50/50 at medium, 70/30 main/supporting at expanded**; on compact the
  supporting content moves to a bottom sheet or below the main content.
- **Feed** — single column compact, multi-column grid wider, via `GridCells.Adaptive(minSize)` —
  which maps directly to Flutter's `SliverGridDelegateWithMaxCrossAxisExtent`.

**Grid numbers:** compact = **4 columns / 16dp margins**; medium and expanded = **12 columns / 24dp
margins**; gutters 16dp at 360dp, 24dp at 600dp. Everything on M3's 8dp baseline grid; margins and
gutters are legally 8, 16, 24 or 40dp. Codelab spacing: pane padding 16dp, spacer between panes
24dp, card spacing 24dp.

**Touch vs pointer — two corrections worth flagging:**
- **`MediaQuery.navigationMode` does NOT distinguish touch from mouse.** Its enum is
  `traditional` (arrow keys move a cursor — desktop) vs `directional` (D-pad moves focus — TV). It
  is a leanback signal. Likewise `defaultTargetPlatform` returns `android` both on a phone browser
  and on Chrome/Android — it tells you the OS, not the input device. **There is no reliable static
  input-type flag in Flutter.**
- **The correct pattern is progressive: assume touch (48dp targets), then *reveal* pointer
  affordances reactively when a hover event actually arrives via `MouseRegion`.** `VisualDensity` is
  the sanctioned lever for touch-vs-pointer sizing (~4 logical px per density unit, so `-1.0`
  removes ~8px from a control's box).
  Source: https://docs.flutter.dev/ui/adaptive-responsive/input
- **WCAG 1.4.13** requires hover/focus-revealed content to be dismissible, hoverable and persistent.
  Flutter's rule is blunt: **"Solve touch first"** — build the touch UI, then add mouse and keyboard
  as accelerators, never as the only path. Same page: don't lock orientation, don't branch on device
  type, use `PageStorageKey` to restore scroll position across resize.

### 🚩 Flutter web pitfalls, verified for 2025–26

**The HTML renderer was REMOVED.** *"Flutter 3.29 is the first release where the HTML renderer has
been removed from Flutter web,"* and the `--web-renderer` CLI flag was deleted. A default build
picks **canvaskit** at runtime; a `--wasm` build picks **skwasm and falls back to canvaskit** if the
browser lacks WasmGC, so a wasm build still runs everywhere. `--wasm` is **still opt-in as of
August 2026.** Hard prerequisite: `dart:html` is unsupported — you must be on `package:web` and
`dart:js_interop`.
Sources: https://docs.flutter.dev/release/release-notes/release-notes-3.29.0 ·
https://docs.flutter.dev/platform-integration/web/renderers · https://docs.flutter.dev/platform-integration/web/wasm

**Bundle size:** CanvasKit is *"around 1.5 MB"* on top of the app bundle, and **nothing paints until
both `canvaskit.wasm` and `main.dart.js` have loaded.** Mitigations Flutter itself recommends:
deferred imports, `unawaited()` so init doesn't block first frame, service workers, and — the
biggest win — **building the landing page in plain HTML/CSS** and letting `flutter.js` preload the
app in the background. Image data from the same post: 319 KB PNG → **38 KB WebP (−88%)** → **10 KB
AVIF (−97%)**. Ship `--tree-shake-icons` and brotli.
Source: https://flutter.dev/blog/best-practices-for-optimizing-flutter-web-loading-speed

**`google_fonts` runtime fetching — three distinct problems on web.** The package README calls
runtime HTTP fetching *"ideal for **development**"* and notes it *"will automatically use matching
font files in your `pubspec.yaml`'s `assets` (rather than fetching them at runtime via HTTP)."*
On web specifically: (1) FOUT and CLS as the first frame renders in a fallback then reflows; (2) an
extra round trip stacked on an already-heavy critical path; (3) a **GDPR exposure** — runtime
fetching hits `fonts.gstatic.com` from the user's browser, exposing their IP to Google, which German
courts have ruled a violation. **Bundle the font files as assets, keep the `GoogleFonts.*` call
sites (they auto-resolve to the bundled asset), and ship zero runtime font requests.**
Source: https://pub.dev/packages/google_fonts

**Find-in-page is fundamentally broken** under CanvasKit — text is painted into a `<canvas>`, so
browser Ctrl+F has nothing to match, and **with the HTML renderer gone the old workaround no longer
exists.** Selection works only inside `SelectableText` or a `SelectionArea` subtree.
**SEO is still not viable:** the Flutter Web FAQ (updated 2026-08-04) states application output
*"doesn't align with what search engines need to properly index,"* and explicitly positions Flutter
web *away* from *"text-rich, flow-based, static content (like blog articles)."*
Source: https://docs.flutter.dev/platform-integration/web/faq

**Accessibility is OFF by default on Flutter web.** *"For performance reasons, Flutter's web
accessibility is not on by default. To turn on accessibility, the user needs to press an invisible
button with `aria-label="Enable accessibility"`."* **Fix it in one line, unconditionally, in any
production web build:**

```dart
void main() {
  runApp(const MyApp());
  if (kIsWeb) SemanticsBinding.instance.ensureSemantics();
}
```
Source: https://docs.flutter.dev/ui/accessibility/web-accessibility

**Highest-risk open issue for an image-heavy habit app: a CanvasKit memory leak with network images
that crashes iOS Safari** — progressive leak across navigations, crashing after 5–10 screen
transitions, present since the HTML renderer was removed. Mitigate with `cacheWidth`/`cacheHeight`
caps, evicting from `PaintingBinding.instance.imageCache` on route pop, and a **real-device iOS
Safari load test before launch.** Source: https://github.com/flutter/flutter/issues/178524

**Other:** a near-horizontal drag can trigger the browser's back-navigation gesture (relevant to
swipeable habit cards, flutter#152588); `usePathUrlStrategy()` **requires the server to rewrite all
routes to `index.html`** (Firebase Hosting: "Configure as a single-page app") — getting this wrong
is the top cause of "refresh gives me a 404"; Flutter **no longer generates a service worker by
default**, so PWA offline caching is ours to own; stale deploys need a build ID on
`flutter_bootstrap.js?v=…`. **Impeller does not support web** — web is still Skia.

## 3.9 Colour systems — "elevated neutrals" and OKLCH

**The 2026 direction is: abandon pure `#FFFFFF`.** Palettes are built around *"soft greys, warm
sand, stone finishes, muted clay, oatmeal beige, and gentle taupe"* — tones that *"reduce eye strain
and work seamlessly across light and dark modes."* Pure `#000000` dark mode is equally out; use
*"rich, layered blacks, deep charcoals."*
Source: https://updivision.com/blog/post/ui-color-trends-to-watch-in-2026

**Pantone's 2026 Colour of the Year is "Cloud Dancer" (13-0002) — "a warm, creamy off-white"** —
institutional validation of the warm-off-white direction.
Source: https://www.toolsjam.co/blog/color-trends-2026

Real hex references (from a calm-palette guide that explicitly flags `#FFFFFF` as too harsh):
`#F5F5F0`, `#FAFAF8` (soft off-whites); `#1A1A1A`, `#2D2D2D` ("soft black" for text instead of pure
black); dark bases `#121212`, `#16161A`, `#1C1C1E` (Apple's), `#0F172A` (slate-tinted).
Source: https://muffingroup.com/blog/calm-color-palette/
Further warm neutrals: `#F8F6F1`, `#FAFAF7`, `#F5EFE0` (warm cream), `#F8F4EC` (ivory).
Source: https://hueblender.com/blog/sage-green-color-palette

**HabitCrafts' proposed `canvas #F7F5F1` sits squarely in this range.**

**Sage green is the cornerstone colour of the moment** — *"in 2026, Sage Green has become the
cornerstone of Biophilic Design… in web design sage green reduces visual fatigue, making it a good
choice for wellness brands."* Source: https://coloruxlab.com/colors/sage-green

The named sage ramp, with the one that matters for us flagged:
Classic Sage `#87A96B` · Light Sage `#C7D2B6` · Dusty Sage `#9CAF88` · Warm Sage `#A3B18A` ·
**Cool Sage `#8FA98E` — explicitly described as blue-leaning and navy-pairing** · Sage Gray
`#B2AC88` · Dark Sage `#4F664A` · Stone Sage `#6B7A5C`.
Sources: https://hueblender.com/blog/sage-green-color-palette · https://coloruxlab.com/colors/sage-green

**Cool Sage is the recommended bridge colour between a blue primary and warm neutral surfaces** —
which is exactly the role the `sage-*` ramp plays in Section 4.

**The accent strategy is the "fun" lever.** 2026 pairs elevated neutrals with *"hyper-saturated
accents… electric blue, neon green, punchy coral, or radiant violet"* used strategically in minimal
layouts to guide attention; also in play are *"muted neons"* desaturated to roughly **70%
saturation.** Source: https://updivision.com/blog/post/ui-color-trends-to-watch-in-2026

**This is the calm-but-fun formula: ~90% quiet neutrals, ~10% one loud accent reserved for
completion and celebration.** In HabitCrafts that accent is the existing gold `#EFC530` — which is
why Section 4 rations it to streaks and milestones and nothing else.

### Warming a cool blue brand without losing recognition

- **Do not change the hue of the primary blue — change its neighbours.** *"Consistent signature
  colors can lift brand recognition by up to 80%."* Source: https://biznamelab.com/tech-brand-color-palette/
- **Warm neutrals are the low-risk move:** *"warm neutrals (amber, ivory, off-white with a honey
  undertone) feel approachable, human, and analog — suited for consumer apps, wellness…"*
  Swapping cool-grey surfaces for warm off-whites changes the emotional read while the brand blue
  is untouched. Source: https://colorarchive.org/guides/neutral-color-palettes/
- **The wellness category convention already blends these:** *"the best therapist websites almost
  universally use muted blues, soft greens, and warm neutrals."* Same source. So muted blue + sage +
  warm off-white is category-legible, not a compromise.
- Ratio discipline: roughly **60% base / 30% secondary / 10% neutral-or-accent.**
  Source: https://biznamelab.com/tech-brand-color-palette/

**This is precisely the Section 4 strategy, independently arrived at and now externally validated.**

### OKLCH — build the ramps perceptually

OKLCH is a cylindrical model of OKLab (Björn Ottosson, 2020) where *"equal numerical distances
correspond to equal perceived color differences."* Source: https://colorarchive.org/guides/oklch-color-space-guide/

The HSL problem, stated precisely: *"the lightness value in HSL is not perceptual. It's geometric.
Teal at `hsl(180, 60%, 40%)` looks considerably lighter than a red-violet at `hsl(300, 60%, 40%)`."*
Generating a lightness ramp in HSL *"produces ramps where yellows blow out and blues stay too dark.
This is why HSL-based design tokens always need manual tuning."*
Source: https://www.carmenansio.com/articles/oklch-and-the-modern-color-stack/

**Chroma safety ranges — the most directly useful table for a calm palette:**
`0–0.10` neutrals / low saturation · `0.10–0.20` mid-saturation, safe across displays ·
`0.20–0.32` high saturation, stays in sRGB · `0.32–0.40` wide-gamut P3, clips on sRGB.
**For a calm system live at C ≈ 0.02–0.08 for surfaces and C ≈ 0.10–0.16 for accents, reserving
C ≥ 0.20 for the single celebration accent.** Same source.

Gotcha for tint ramps: *"mixing toward pure white desaturates because white has zero chroma in
oklch"* — mix toward a light tinted anchor instead. Same source.

Support: Chrome 111+, Firefox 113+, Safari 15.4+. The **Design Tokens Color Module (2025.10 draft)**
now supports OKLCH components plus hex fallbacks, so this is standards-track.
Source: https://www.designtokens.org/tr/drafts/color/

**Flutter caveat:** Flutter's `Color` is sRGB and there is no native `oklch()`. Use OKLCH as the
*authoring* space — generate the ramp in OKLCH, export sRGB hex into the Dart tokens. The Section 4
palette was hand-tuned and then **numerically verified**, so it stands on measured ratios; if it is
ever extended, extend it in OKLCH.

## 3.10 Typography — Poppins is confirmed overused; variable is baseline

*"Variable fonts are no longer a 'nice to have.' They are the baseline expectation for any serious
web typography project in 2026."* Source: https://www.theinkorporated.com/insights/future-of-typography/

**Optical sizing** — the `opsz` axis *"automatically optimizes letter spacing and stroke contrast
for the current font size,"* so *"small text remains legible and large text retains the intended
elegance."* Source: https://designflea.com/typography-trends-2026/

**On Poppins: "Poppins fatigue is explicitly mentioned as real among designers."** It is *"everywhere
in landing pages, mobile apps, and startup branding, and designers recognize it as overused."*
Sources: https://madegooddesigns.com/font-trends-2026/ · https://www.fontfabric.com/font-collection/poppins-font-alternatives/

**But heed the second warning:** *"the pure neo-grotesk (Inter / SF Pro look-alikes) — still a
workhorse but increasingly perceived as default-y rather than designed."* Swapping Poppins for Inter
trades "overused friendly" for "overused neutral."
Source: https://madegooddesigns.com/font-trends-2026/

**Recommended, all available on Google Fonts** (so the `google_fonts` package can serve them, though
Section 4.4 says bundle them anyway):
- **Figtree** — *"a clean yet friendly geometric sans serif font for usage in web and mobile apps"*
  (https://fonts.google.com/specimen/Figtree); elsewhere *"a friendly, humanist sans-serif that
  brings warmth and approachability."*
- **Hanken Grotesk** — named under the 2026 **"Bouba Grotesks (Soft, Rounded, Friendly)"** trend.
  The source's explicit recommendation for our exact brief: *"For approachable brands wanting
  rounded warmth without loudness, General Sans (free via Fontshare) or Hanken Grotesk (Google
  Fonts) paired with Lora (Google Fonts) for editorial moments balances personality with restraint."*
- **Instrument Sans** — *"a clean, geometric variable font with a friendly character."*
- **Plus Jakarta Sans**, **Outfit**, **Albert Sans**, **Urbanist**, **DM Sans**, **Onest** — other
  recurring Poppins replacements.
- **Fraunces** — *"a variable serif typeface with a huge range of styles, from weight and softness to
  Wonk (a measure of its eccentricity)… able to convey anything from a classic, formal tone to a
  quirky, playful one."* Cited under both "Expressive Variable Serifs" and "Hyper-Personal Variable
  Display Experiments" for its **SOFT and WONK axes**. **This is the best "calm but fun" display
  recommendation available, and it is on Google Fonts.**
  https://fonts.google.com/specimen/Fraunces
- **Recursive** has a **CASUAL axis** — the same softness dial, for sans.

**Not on Google Fonts** (would need bundling as local assets): General Sans, Satoshi, Switzer,
Cabinet Grotesk (all Fontshare), Mona Sans (GitHub). **Geist** *is* now on Google Fonts but is
*"modern, geometric, and based on the principles of classic Swiss typography"* — cooler and more
technical than this brief calls for; better as a numerals/data face than a brand voice.

The biggest 2026 type headline is **the return of expressive display serifs** — *"loud, expressive,
often slightly absurd display serifs that lean into personality."* A serif display over a soft sans
body is the fastest way to look 2026 rather than 2021.
Source: https://madegooddesigns.com/font-trends-2026/

**This independently confirms the Section 4.4 recommendation (Fraunces display + Figtree UI).**
Hanken Grotesk is an equally valid substitute for Figtree.

## 3.11 Surfaces — glassmorphism, shadows, texture, and what reads as dated

### Glassmorphism: evolved, narrow, and Apple partially reversed

**Apple's Liquid Glass (iOS 26) is the defining event, and NN/g's verdict is damning:**
*"Anything placed on top of something else becomes harder to see."* The Mail treatment is *"an
illegible mess."* And the line to quote in any design review:
**"Motion for motion's sake is not usability. It's distraction with a side of nausea."**
Tap targets shrank below the 1cm × 1cm guideline.
Source: https://www.nngroup.com/articles/liquid-glass/

Reaction: *"designers and accessibility advocates said the surface introduced visual noise,
undermined outdoor readability and increased cognitive drag during prolonged reading,"* with the
harshest criticism *"from high-brightness markets where reflective UI layers become liabilities
under full sun."* Source: https://www.gadgetreview.com/apples-ios-26-backlash-why-liquid-glass-is-driving-users-away

**Apple's climbdown:** iOS 26.1 beta 4 added a **"Tinted"** control that *"tones down the gloss and
restores a flatter, calmer reading surface,"* plus a **"Reduce Bright Effects"** accessibility
toggle. Source: https://gulfnews.com/technology/companies/apple-yields-tinted-control-in-ios-261-beta-4-tones-down-liquid-glass-after-backlash-1.500315176

The 2026 consensus is **"responsible glassmorphism"** — translucent surfaces establishing hierarchy
*"while maintaining text readability and accessibility standards."* *"Depth always comes back, but
only the honest versions stay."*
Sources: https://www.index.dev/blog/ui-ux-design-trends · https://www.setproduct.com/blog/liquid-glass-vs-glassmorphism

Practical rules if used: *"blur is not enough — add tint"*; never put body text on unmodified glass;
**cap overlapping blur layers at 2**; one blur value per surface type; add subtle borders so
boundaries are perceivable; **support reduced-transparency with a solid fallback**; test against
bright photos, dark photos, textured, saturated gradients and plain white. Works on navigation bars,
floating toolbars, 1–2 line stat summaries and hero reveals; does **not** work on long-form content,
dense tables or form-heavy flows.
Source: https://www.orizon.co/blog/glassmorphism-in-2026-how-to-use-frosted-glass-without-killing-ux

**Ruling for HabitCrafts:** at most one glass surface — the floating mobile bottom nav — tinted,
single layer, solid fallback. Do not build the system on it. Flutter note: `BackdropFilter` is
expensive and is a real frame-budget cost on mid/low-end Android.

### Shadows: tinted, or gone

- *"Avoid using pure black shadows, which can feel harsh and artificial."* The method: *"pick a light
  source, scale your numbers, layer your blur, and tint the color."*
  Source: https://theosoti.com/blog/designing-shadows/
- *"Neutral black shadows can look muddy on colorful surfaces."*
  Source: https://cieden.com/book/sub-atomic/shadows/colored-shadows-use-cases
- **Material itself moved away from shadows for elevation** — M3 uses **tone and tint** as the
  primary means of illustrating elevation. Source: https://en.wikipedia.org/wiki/Material_Design
- The anti-shadow position is live: *"decorative drop shadows that are sprinkled everywhere to make
  flat composition feel more expensive are now considered weak design."* **"Maximalist drop shadows
  peaked in 2023."** Sources: https://almessadi.com/blog/2026-03-19-why-i-banned-drop-shadows-the-engineering-behind-minimal-brutalism ·
  https://madegooddesigns.com/font-trends-2026/

**This validates Section 4's tinted `rgba(22,35,47,α)` shadow scale**, and it means the light theme
could go further still — tonal elevation (warm card on a slightly deeper warm canvas) with shadows
reserved for genuinely floating elements only.

### Gradients, grain, radii, bento

- **Soft Gradients 2.0:** *"subtle, airy blends that feel more like light passing through glass"*
  rather than bold rainbow mesh. Loud multi-stop mesh is past peak; two-stop, low-chroma, close-hue
  is current. Source: https://updivision.com/blog/post/ui-color-trends-to-watch-in-2026
- **Grain is in and cheap:** *"grainy backgrounds, noisy gradients, paper texture restore organic
  feel and make the site look human-made for humans, simply implemented as a low-opacity SVG noise
  overlay."* Source: https://spoko.space/blog/modern-website-design-trends/
  **Grain over a soft gradient is the single highest-ratio "warmth" move** — it kills banding and
  adds tactility. Recommended for the `brand-700` hero card at 2–4% opacity.
- **Bento grids** are *"one of the most widely adopted layout patterns in 2026, used by Apple,
  Notion, and hundreds of smaller sites."* Radius guidance **12–24px**, but *"the rigid 24px corner
  radius is being replaced by 'Squircle' shapes… that make the grid feel less robotic and more
  human."* Flutter has `ContinuousRectangleBorder` / `RoundedSuperellipseBorder` for squircles.
  Sources: https://senorit.de/en/blog/bento-grid-design-trend-2025 · https://lucky.graphics/learn/ui-design-trends-2026/
  **Bento is a strong fit for the habit dashboard** — heterogeneous tiles let you put the *fun* in
  one tile without contaminating the screen. This is the Section 6 `lg` Home layout.

### Confirmed dated in 2026 — and how much of it HabitCrafts has

| Dated pattern | Source | Present in HabitCrafts? |
|---|---|---|
| Hard / maximalist drop shadows ("peaked 2023") | madegooddesigns.com | **Yes** — `elevation: 3.0` on 23 buttons |
| Pure `#FFFFFF` / pure `#000000` surfaces | lucky.graphics, muffingroup.com | Partly — white cards, and `#111417` near-black |
| Generic stock / raster hero imagery | remwebsolutions.com | **Yes** — 8 PNG icons + `bottomNavBackground.png` |
| Generic Material 2 look (shadow elevation, defaults) | Wikipedia: Material Design | **Yes** — `useMaterial3: false` |
| Flat design with no depth at all | lucky.graphics | **Yes** — flat blue field, no elevation system |
| Over-animated interfaces (*"oddly aggressive"*) | lummi.ai | No — the opposite problem |
| Poppins as the brand face | madegooddesigns.com | **Yes** |
| Classic neumorphism | index.dev | No |
| Aggressive parallax / scroll-jacking | theedigital.com | No |

Six of nine. The good news is that the two HabitCrafts does *not* have (over-animation, parallax)
are the expensive ones to undo.

---

# 4. Palette evolution recommendation

**Principle: keep the anchors, move the ground.** `#507598`, `#325171`, `#E6EEF8` and `#EFC530` are
retained *exactly*, at their exact hex values, as named steps in the new ramps. What changes is
what they sit on. The brand blue stops being the floor and becomes the ink and the accent.

All ratios below were computed locally with the WCAG 2.x relative-luminance formula. Every value
marked with a target passes it.

## 4.1 Light mode — "Daylight"

### Neutrals (the new ground — warm, this is where the humanity comes from)

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `canvas` | `#F7F5F1` | Page background. Warm parchment. | — |
| `canvas-sunken` | `#EFEBE4` | Grouped/recessed sections, table stripes. | 1.09:1 vs canvas |
| `surface` | `#FFFFFF` | Cards, sheets, inputs. | — |
| `surface-tinted` | `#EDF3FA` | Brand-tinted surface: info panels, selected rows. | 1.03:1 vs canvas |
| `border` | `#E3DED5` | Hairline dividers, card outline (decorative). | 1.23:1 vs canvas |
| `border-control` | `#8A8377` | Form-control boundary where the border is the only affordance. | **3.45:1** vs canvas (needs 3:1) ✅ |
| `border-focus` | `#41607F` | 2px focus ring, 2px offset. | **6.02:1** vs canvas ✅ |

### Ink

| Token | Hex | Role | Contrast vs canvas |
|---|---|---|---|
| `ink-strong` | `#16232F` | Display and headlines. | **14.66:1** ✅ |
| `ink` | `#24384B` | Body text. | **11.07:1** ✅ (12.05:1 on white) |
| `ink-muted` | `#566878` | Secondary text, captions, metadata. | **5.29:1** ✅ (5.76:1 on white) |
| `ink-subtle` | `#7C8B99` | Placeholder, disabled, decorative icons only. | **3.21:1** ✅ (3:1 target — not for body text) |

### Brand blue — the anchor ramp (three existing brand colours preserved exactly)

| Step | Hex | Contrast vs canvas | Role |
|---|---|---|---|
| `brand-50` | `#F1F6FB` | 1.00:1 | Faintest wash |
| **`brand-100`** | **`#E6EEF8`** | 1.07:1 | **EXISTING `tertiary` — unchanged.** Chip fills, selected wash |
| `brand-200` | `#C9DBEC` | 1.30:1 | Borders on tinted surfaces, chart gridlines |
| `brand-300` | `#A3C0D9` | 1.74:1 | Illustration mid-tone, disabled brand fill |
| `brand-400` | `#7A9DBE` | 2.61:1 | Decorative only |
| **`brand-500`** | **`#507598`** | 4.44:1 | **EXISTING `primary` — unchanged.** Filled buttons (white label = 4.84:1 ✅), large text, illustration |
| `brand-600` | `#41607F` | **6.02:1** ✅ | Interactive text, links, icons, focus ring. White label = 6.55:1 ✅ |
| **`brand-700`** | **`#325171`** | **7.56:1** ✅ | **EXISTING `secondary` — unchanged.** Hero surface fill, strong headings |
| `brand-800` | `#27405A` | 9.80:1 ✅ | Pressed states on brand-700 |
| `brand-900` | `#16232F` | 14.66:1 ✅ | = `ink-strong` |

**The hero surface pattern.** One card per screen may be filled `brand-700 #325171` — the streak
card on Home, the summary card on Progress. White on it is **8.23:1**, `brand-100 #E6EEF8` body on
it is **7.04:1**, and gold `#EFC530` on it is **4.98:1**. This is where the brand blue survives as
a large field, and it now reads as an intentional accent rather than as wallpaper.

### Gold — the reward colour (existing accent preserved)

| Token | Hex | Contrast | Role |
|---|---|---|---|
| `gold-300` | `#F7DE85` | — | Confetti, glow, chart fill |
| `gold-400` | `#F2D059` | 5.47:1 on brand-700 ✅ | Dark-mode gold; secondary reward |
| **`gold-500`** | **`#EFC530`** | 4.98:1 on brand-700 ✅ · `ink #24384B` label on it = **7.29:1** ✅ | **EXISTING `accent1` — unchanged.** Streak flame, milestone fill, filled gold button |
| `gold-surface` | `#FBF1D9` | — | Streak chip background |
| `gold-700` | `#8A6510` | **4.88:1** vs canvas ✅ · **4.73:1** on gold-surface ✅ | Gold **text and icons**. Never use `gold-500` for text on light. |

⚠️ `gold-500 #EFC530` is only 1.52:1 against the canvas. It must never be used as a hairline, an
outline, or the sole boundary of a control on a light background. Filled shapes only, and pair it
with a `gold-700` border where a boundary is needed.

### Sage — success and growth (new; replaces `#4DC360`)

| Token | Hex | Contrast vs canvas | Role |
|---|---|---|---|
| `sage-100` | `#E7EFE7` | — | `sage-surface` — completed habit card fill |
| `sage-300` | `#A9C4A8` | — | Ring track, chart fill |
| `sage-500` | `#6E9A70` | 2.96:1 | Decorative fill only — **not** a boundary |
| `sage-600` | `#4F7A53` | **4.55:1** ✅ (passes both 3:1 and 4.5:1) | **Progress rings, checkmarks, success text.** White on it = 4.95:1 ✅ |
| `sage-700` | `#446B48` | **5.20:1** on `sage-100` ✅ | Text on the sage surface |

### Clay — errors and warnings (new; replaces `#F06962` / `#FCDC0C`)

| Token | Hex | Contrast | Role |
|---|---|---|---|
| `clay-surface` | `#F8E7E4` | — | Error panel background |
| `clay-600` | `#A9483E` | **5.24:1** vs canvas ✅ · **4.76:1** on clay-surface ✅ · white on it = 5.70:1 ✅ | Error text, destructive button |
| `amber-surface` | `#FAF0DA` | — | Warning panel background |
| `amber-700` | `#96650A` | **4.63:1** vs canvas ✅ | Warning text/icon |
| `amber-750` | `#8A5D09` | **5.08:1** on amber-surface ✅ | Text on the warning panel |

### Teal — secondary accent (existing `accent2` retained as a fill)

| Token | Hex | Contrast vs canvas | Role |
|---|---|---|---|
| `teal-400` | `#80BBC8` | 1.85:1 | **EXISTING `accent2`** — decorative fill, illustration, chart series only |
| `teal-650` | `#37707E` | **5.10:1** ✅ | Teal text and icons |

### Elevation — tinted, not black

Replace the `#1A000000` neutral-black shadows. Shadow colour is `rgba(22, 35, 47, α)` — the ink
hue, so shadows sit in the palette rather than greying it.

```
--shadow-xs: 0 1px 2px  rgba(22,35,47,0.05);
--shadow-sm: 0 2px 6px -1px  rgba(22,35,47,0.07);
--shadow-md: 0 6px 16px -4px rgba(22,35,47,0.09);
--shadow-lg: 0 14px 34px -10px rgba(22,35,47,0.13);
--shadow-hero: 0 20px 48px -16px rgba(50,81,113,0.22);  /* brand-tinted, hero card only */
```

## 4.2 Dark mode — "Nightfall"

This must actually be built. Today `themeMode: ThemeMode.system` is set with no `darkTheme`.
Dark surfaces are **tinted with the brand hue** rather than being neutral greys — that is the
difference between a dark mode that feels like the same product and one that feels like a
different app. (The current stray `#1A1F24` / `#111417` are neutral and would not.)

| Token | Hex | Contrast | Role |
|---|---|---|---|
| `canvas` | `#0F151B` | — | Page background (blue-black) |
| `surface` | `#182029` | 1.12:1 vs canvas | Cards |
| `surface-raised` | `#1E2833` | — | Sheets, menus, hover |
| `surface-tinted` | `#233240` | — | Selected rows, info panels |
| `border` | `#2C3945` | 1.39:1 vs surface | Hairlines (elevation is carried by tone + border, **no shadows in dark**) |
| `ink-strong` | `#EDF2F7` | **16.31:1** vs canvas ✅ | Headlines |
| `ink` | `#D8E2EC` | **14.00:1** vs canvas · **12.53:1** vs surface ✅ | Body |
| `ink-muted` | `#9FB0C0` | **7.39:1** vs surface ✅ | Secondary |
| `ink-subtle` | `#74869A` | **4.40:1** vs surface ✅ (3:1 target) | Placeholder, disabled |
| `brand` | `#8FB4D4` | **8.44:1** vs canvas · **7.55:1** vs surface ✅ | Interactive text/icons. `canvas` label on it = 8.44:1 ✅ |
| `brand-surface` | `#233240` | — | Tinted brand fill |
| `gold` | `#F2D059` | **10.91:1** vs surface ✅ · `canvas` label on it = 12.19:1 ✅ | Streak, reward |
| `sage` | `#8FB891` | **7.38:1** vs surface ✅ | Success, rings, checkmarks |
| `clay` | `#E08C7F` | **6.44:1** vs surface ✅ | Error |
| `amber` | `#E5B85C` | **8.88:1** vs surface ✅ | Warning |
| `teal` | `#7FB9C7` | **7.57:1** vs surface ✅ | Secondary accent |

## 4.3 Token naming (for both the HTML prototype and the Flutter theme)

CSS custom properties, defined on `:root` and overridden under
`[data-theme="dark"]` / `@media (prefers-color-scheme: dark)`:

```css
--c-canvas, --c-canvas-sunken, --c-surface, --c-surface-tinted,
--c-border, --c-border-control, --c-border-focus,
--c-ink-strong, --c-ink, --c-ink-muted, --c-ink-subtle,
--c-brand-50 … --c-brand-900,
--c-gold-300/400/500/700, --c-gold-surface,
--c-sage-100/300/500/600/700,
--c-clay-600, --c-clay-surface, --c-amber-700/750, --c-amber-surface,
--c-teal-400, --c-teal-650
```

In Flutter this maps to a real `DarkModeTheme extends FlutterFlowTheme`, with
`FlutterFlowTheme.of(context)` switching on `Theme.of(context).brightness` instead of hard-returning
`LightModeTheme()`.

### Spacing, radius, stroke (make the dead tokens real)

```
space:  4 · 8 · 12 · 16 · 24 · 32 · 48 · 64
radius: xs 8 · sm 12 · md 16 · lg 24 · xl 32 · full 999
stroke: hairline 1 · control 1.5 · ring 3 (progress arcs) · focus 2
```
The habit card is `radius-md 16`. Sheets and modals are `radius-lg 24` (top corners only on
mobile sheets). Pills and chips are `radius-full`. This retires all nine drifting values.

## 4.4 Typography recommendation

**Primary recommendation — replace Poppins for UI, keep the friendly geometric character.**

- **UI / body: Figtree Variable** (Google Fonts, wght 300–900 variable axis). Geometric-humanist —
  the same friendly register as Poppins, but a larger x-height, tighter sidebearings and a single
  variable file. Ships one font file instead of nine.
- **Display / numerals: Fraunces Variable** (Google Fonts; `opsz`, `wght`, `SOFT` and `WONK` axes)
  for streak numbers, milestone headlines and the empty-state headings only. A soft variable serif
  against a geometric sans is where the "calm but with personality" lives; a single-family
  all-sans system is what reads as generic. Use `opsz` so the 48px streak numeral gets display
  optical sizing and does not look like inflated body type.
- **Lower-risk alternative** if replacing the UI face is too large a change for this phase: keep
  **Poppins for display only** and adopt Figtree for everything ≤ 20px. This fixes the small-size
  legibility problem, which is where the current damage is, and leaves the headline voice intact.

**Bundle the fonts as assets.** Register them in `pubspec.yaml` under `fonts:` and stop calling
`GoogleFonts.*()` — this removes the runtime network fetch, the FOUT on web, and the
third-party request. The repo already ships font files it does not use.

### The new ramp — 9 sizes, real tracking, real line heights

| Token | Size / line-height | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | 48 / 52 | 600 | −0.02em | Streak numerals, milestone (Fraunces) |
| `h1` | 32 / 38 | 600 | −0.015em | Page titles |
| `h2` | 24 / 30 | 600 | −0.01em | Section headers |
| `h3` | 20 / 26 | 600 | −0.005em | Card titles |
| `body-lg` | 17 / 26 | 400 | 0 | Reading content (Library) |
| `body` | 15 / 22 | 400 | 0 | Default UI body |
| `body-sm` | 13 / 19 | 400 | +0.005em | Card secondary lines — **this replaces the 10px text** |
| `label` | 13 / 16 | 600 | +0.01em | Buttons, tabs, nav |
| `caption` | 11 / 15 | 500 | +0.02em | Timestamps, badges only |

**Minimum text size in the product is 13px.** Nothing renders at 10px.

## 4.5 Migration mapping (old token → new)

| Old | New |
|---|---|
| `primary` (as page background) | `canvas #F7F5F1` |
| `primary` (as action colour) | `brand-500 #507598` fill / `brand-600 #41607F` text |
| `primaryBackground` | `canvas #F7F5F1` |
| `secondaryBackground` | `surface #FFFFFF` |
| `whiteOverlay` (card fill) | `surface #FFFFFF` + `border #E3DED5` + `shadow-sm` |
| `primaryText` | `ink #24384B` |
| `secondaryText` | `ink-muted #566878` |
| `alternate` (as text on cards) | `ink #24384B` |
| `tertiary` | `brand-100` — unchanged hex, new name |
| `accent1` | `gold-500` — unchanged hex; **text uses `gold-700`** |
| `accent2` | `teal-400` fill only; **text uses `teal-650`** |
| `success #4DC360` | `sage-600 #4F7A53` |
| `error #F06962` | `clay-600 #A9483E` |
| `warning #FCDC0C` | `amber-700 #96650A` |
| `background #1A1F24` / `darkBackground #111417` | **delete** — superseded by the real dark theme |
| `grayDark`, `grayLight`, `neutral`, `accent3`, `accent4`, `messageTextBG`, `whiteTransparent10` | **delete** — replaced by the ink/border scale |
| stray `#2A405D` (7 uses) | `brand-800 #27405A` |
| stray `#FFCE51` | `gold-500 #EFC530` |
| stray `#57D76C` / `#7cCf7b` | `sage-600 #4F7A53` |

---

# 5. Motion system recommendation

## 5.1 Tokens

**Durations**

| Token | ms | Use |
|---|---|---|
| `dur-micro` | 120 | Colour/opacity state change, hover, focus fill |
| `dur-quick` | 180 | Button press-release, toggle thumb, chip select |
| `dur-base` | 260 | Card expand, tab indicator, list-item entrance, ring fill |
| `dur-moderate` | 340 | Page transition total |
| `dur-slow` | 420 | Bottom sheet / modal enter |
| `dur-celebrate` | 900 | Habit-complete micro-celebration |
| `dur-milestone` | 1600 | Streak-milestone full sequence |

**Curves — CSS (prototype) and Flutter**

| Token | CSS `cubic-bezier` | Flutter | Use |
|---|---|---|---|
| `ease-standard` | `(0.2, 0, 0, 1)` | `Cubic(0.2, 0, 0, 1)` | Default; anything staying on screen |
| `ease-enter` | `(0.05, 0.7, 0.1, 1)` | `Curves.easeOutCubic` ≈ or `Cubic(0.05,0.7,0.1,1)` | Elements arriving |
| `ease-exit` | `(0.3, 0, 0.8, 0.15)` | `Cubic(0.3, 0, 0.8, 0.15)` | Elements leaving |
| `ease-emphasized` | `(0.2, 0, 0, 1)` | `Curves.easeInOutCubicEmphasized` | Hero moments, tab indicator |
**Springs — ported verbatim from the M3 Expressive token values** (see 3.1). Flutter cannot give us
these for free (M3E is not coming to Flutter), so use
`SpringDescription.withDampingRatio(mass: 1, stiffness: S, ratio: D)`:

| Token | Damping / stiffness | CSS approximation (Google's published bezier) | Use |
|---|---|---|---|
| `spring-gentle` | **0.8 / 200** (M3E spatial-slow) | `cubic-bezier(0.39, 1.29, 0.35, 0.98)` @ 650ms | Sheets, milestone card settling |
| `spring-snap` | **0.8 / 380** (M3E spatial-default) | `cubic-bezier(0.38, 1.21, 0.22, 1.00)` @ 500ms | Toggle thumb, button release |
| `spring-bounce` | **0.6 / 800** (M3E spatial-fast) | `cubic-bezier(0.42, 1.67, 0.21, 0.90)` @ 350ms | Reward pop only — the visible overshoot |
| `spring-effects` | **1.0 / 1600** (M3E effects-default) | *n/a — use `ease-standard`* | Colour/opacity; critically damped, never overshoots |

CSS has no true spring; the beziers above are Google's own published approximations and are the
buildable path for the HTML prototype. **Never apply a spatial spring to a colour or opacity
transition** — that is exactly why M3's effects springs are critically damped at 1.0.

**Haptics.** Flutter's built-ins cover most of this, but note the gap:

| Moment | Call | Note |
|---|---|---|
| Press-down on a habit row | `HapticFeedback.selectionClick()` | iOS selection / Android `CLOCK_TICK` |
| Check-in confirmed | `HapticFeedback.lightImpact()` | |
| Streak increment | `HapticFeedback.lightImpact()` | |
| **Milestone reached** | 🚩 **needs a plugin** | Flutter core has **no** success/notification haptic. Use `haptic_kit` / `gaimon` for `UINotificationFeedbackGenerator(.success)` and Android `CONFIRM`. `mediumImpact()` is the fallback. |
| Destructive confirm | `HapticFeedback.heavyImpact()` | No effect below Android API 23 |
| Error | **none** | Never haptically punish |

**Fire the haptic ≤30ms from the visual, and marginally *after* the visual peak** — visual events
are perceived as later than physically synchronous haptic ones. Call `prepare()` in advance on iOS.
**On web, assume no haptics at all** — Safari supports none of this on macOS or iOS.

## 5.2 The six named moments

### M1 — Check-in tap (mark a habit done)
*The core interaction. Happens up to 10×/day. Must be instant, physical, never blocking.*

| t (ms) | What |
|---|---|
| 0 | `selectionClick()` haptic on **pointer-down**, not on release |
| 0–120 | Card `scale 1.0 → 0.97`, `ease-standard`, 120ms |
| 0 (release) → 260 | Checkbox ring stroke sweeps `0 → 100%` (stroke-dashoffset), `ease-enter`, 260ms |
| 0–180 | Ring colour crossfades `brand-500 #507598 → sage-600 #4F7A53`, `ease-standard`, 180ms |
| 80–280 | Checkmark path draws (stroke-dashoffset), `ease-enter`, 200ms, 80ms delay |
| 120–420 | Card `scale 0.97 → 1.0` with `spring-bounce` (~8% overshoot), 300ms |
| 140 | `lightImpact()` haptic |
| 200–600 | **6–8** particles (3px dots, `sage-500` + `gold-500`) fly radially 24px and fade, `ease-exit`, 400ms |
| 260–500 | Card fill `surface #FFFFFF → sage-100 #E7EFE7`, title colour `ink → ink-muted`, 240ms `ease-standard` |

**Total ≤ 700ms.** Non-blocking — the user can tap the next habit immediately. Undo affordance
persists **5000ms** (up from today's 4000ms; 4s is too short to read a toast and act on it).

**Reduced motion:** haptic fires; ring and card colour crossfade over 120ms; checkmark appears
without drawing; **no scale, no spring, no particles**.

### M2 — Streak increment
*The number going up. Small, frequent, must not interrupt.*

| t (ms) | What |
|---|---|
| 0–320 | Digit rolls: outgoing `translateY 0 → −100%` + fade; incoming `translateY 100% → 0` + fade. `ease-enter`, 320ms. Multi-digit: **40ms stagger, right to left** |
| 120–540 | Flame/leaf glyph `scale 1 → 1.18 → 1`, `spring-bounce`, 420ms |
| 120 | `lightImpact()` haptic |
| 160–760 | Gold halo behind the numeral: `scale 0.9 → 1.25`, `opacity 0.35 → 0`, `ease-exit`, 600ms |

**Total ≤ 760ms.** **Reduced motion:** digit crossfades over 160ms; no roll, no scale, no halo.

### M3 — Habit complete / milestone
*The big one. Fires only on: habit marked finished, or streak hits **7 / 30 / 50 / 100 / 365***
*(Smashing's recommended milestone ladder — see 3.3).*
*Hard cap: at most one full celebration per session — subsequent milestones fall back to M2.*
*Vary the payload (colour, copy, badge art) across the first ~10 weeks to counter novelty decay.*

| t (ms) | What |
|---|---|
| 0–300 | Scrim fades to 40% `ink-strong`, `ease-standard` |
| 120–520 | Milestone card `scale 0.92 → 1.0` + `translateY 16px → 0`, `spring-gentle`, 400ms |
| 200 | `mediumImpact()` haptic |
| 260–1100 | Confetti: **max 40 pieces**, `gold-500` / `sage-500` / `brand-300` / `clay-600`, emitted from the card's top edge in a 60° cone with gravity, 840ms. **No loop.** All cleared by 1100ms |
| 400–900 | Numeral counts up, `ease-enter`, 500ms |
| 4000 | Auto-dismiss (or tap anywhere) |
| exit | `scale 1 → 0.96` + fade, `ease-exit`, 200ms |

**Total 1600ms** of motion, 4000ms on screen. Sound: **off by default**; opt-in, one soft marimba
note at ≤ −18 LUFS, at t=200.

**Reduced motion:** card crossfades in over 200ms; **no confetti** — a static gold starburst SVG
replaces it; no scrim animation, no count-up (final number renders directly).

### M4 — Page transition

- **Stack push/pop (mobile, < 600px):** shared-axis X. Outgoing `translateX 0 → −12%` + fade out,
  200ms `ease-exit`. Incoming `translateX 12% → 0` + fade in, 300ms `ease-enter`, starting at 60ms.
  **Total 360ms.**
- **Bottom-nav tab switch:** these are peers, not a stack — use **fade-through, no X translation**.
  Outgoing fade to 0, 100ms `ease-exit`. Incoming fade `0 → 1` + `scale 0.97 → 1`, 220ms
  `ease-enter`, starting at 100ms. **Total 320ms.**
- **Desktop / web ≥ 840px:** the nav rail never animates. Content pane fade-through only, 180ms.
- **Modal / bottom sheet:** enter `translateY 100% → 0`, 420ms `ease-enter`; scrim to 40% over
  300ms linear. Exit 250ms `ease-exit`.

**Reduced motion:** every page transition becomes a 120ms opacity crossfade.

*(This replaces the current `PageTransitionType.fade` at `duration: 0ms` on every route.)*

### M5 — List load (habit list, group list, library grid)

- If the fetch resolves in < 400ms, show **nothing** first — no skeleton flash. Beyond 400ms, show
  skeleton rows with a 1400ms shimmer sweep, `ease-standard`, `canvas-sunken → border → canvas-sunken`.
- Entrance per item: `opacity 0 → 1` + `translateY 12px → 0`, **225ms**, `ease-enter`
  (225ms is Material's entering-element duration and `AnimationLimiter`'s default).
- **Stagger 40ms per item, first item at 0ms delay, hard cap at 12 items** — because the binding
  rule is Material/IBM's **500ms total cascade budget** (12 × 40 = 480ms), not an item count.
  Items 13+ enter with item 12. Use 20ms if the list is dense rows rather than large cards.
- **Only stagger children visible in the first frame** — copy the `AnimationLimiter` pattern rather
  than depending on the abandoned `flutter_staggered_animations` package.
- **First mount / route entry only.** Never on refresh, never on scroll-into-view.

**Reduced motion:** all items fade in together over 160ms; no translate, no stagger.

### M6 — Empty state

- Illustration: a single flat two-colour SVG with **one** slow ambient loop — e.g. a leaf drifting
  `translateY ±4px` over 4000ms, `ease-in-out`, alternate, infinite. This is the only looping
  animation permitted in the product; at 4s it stays under the WCAG 2.2.2 five-second threshold.
- Headline, body and CTA fade + rise (`translateY 8px → 0`), 240ms `ease-enter`, **60ms stagger**.
- The CTA does **not** pulse or breathe. Hover/press states only.

**Reduced motion:** static illustration, loop disabled; content fades in over 160ms.

## 5.3 Global micro-interactions

| Element | Spec |
|---|---|
| Button press | `scale 0.98`, 100ms `ease-standard`; release `spring-snap` 180ms |
| Hover (pointer only, `@media (hover: hover) and (pointer: fine)`) | Background tint shift 120ms `ease-standard`, `translateY −1px`, `shadow-sm → shadow-md` |
| Focus ring | **0ms — instant.** 2px `border-focus #41607F`, 2px offset. Never animate focus |
| Toggle / switch | Thumb travels 180ms `spring-snap`; track colour 140ms `ease-standard` |
| Tab indicator | 260ms `ease-emphasized`; width and position animate together |
| Snackbar / toast | Enter 300ms `ease-enter` (`translateY` + fade); dwell 5000ms; exit 200ms `ease-exit` |
| Ripple / splash | **Re-enable it.** Remove the ~150 `splashColor: Colors.transparent` overrides |

## 5.4 Implementing reduced motion correctly (do not skip this)

`MediaQuery.disableAnimationsOf(context)` alone is **not sufficient** — it misses every iOS user
(see 3.6). Write one helper and use it everywhere:

```dart
bool reducedMotion(BuildContext context) {
  final f = WidgetsBinding.instance.platformDispatcher.accessibilityFeatures;
  return f.reduceMotion || f.disableAnimations;
}
// rebuild on change via WidgetsBindingObserver.didChangeAccessibilityFeatures
```

Three further rules:
1. **Do not merely shorten durations.** Flutter's own fallback runs animations at 5% duration —
   movement at 20× speed is still a vestibular trigger. Branch to an **opacity-only** path.
2. **Keep the haptic and the text** in every reduced-motion variant. The reward still lands.
3. **Pin Flutter web to ≥ 3.44.0**, or `prefers-reduced-motion` is a no-op on the web build.

**And when `MediaQuery.accessibleNavigation` is true** (screen reader active), override two things
in the specs above: **M1's 5000ms undo window becomes untimed** (persist until dismissed), and
**M3's 4000ms auto-dismiss is disabled** — the card waits for an explicit action. Flutter's docs
advise exactly this: disable timeouts or increase minimum durations.

---

# 6. Responsive strategy

## 6.1 Breakpoints

Aligned to Material 3 window size classes, expressed in CSS px for the prototype. This **replaces**
the current `479 / 767 / 991`.

Margins, gutters and column counts are M3's verified values, not invented ones. Everything sits on
the **8dp baseline grid**; margins and gutters are legally 8, 16, 24 or 40 only.

| Name | Range | M3 class | Margin | Gutter | Columns |
|---|---|---|---|---|---|
| `xs` | 0–479 | Compact | 16px | 16px | 4 |
| `sm` | 480–599 | Compact | 16px | 16px | 4 |
| `md` | 600–839 | Medium | 24px | 24px | 12 |
| `lg` | 840–1199 | Expanded | 24px | 24px | 12 |
| `xl` | 1200–1599 | Large | 40px | 24px | 12 |
| `2xl` | ≥ 1600 | Extra-large | 40px | 24px | 12 |

Card spacing 24px; pane padding 16px; spacer between panes 24px. Prefer
`SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 400, crossAxisSpacing: 24,
mainAxisSpacing: 24)` so column count falls out of available width rather than being hard-branched.

```css
--bp-sm: 480px; --bp-md: 600px; --bp-lg: 840px; --bp-xl: 1200px; --bp-2xl: 1600px;
```

**Max widths:** app shell 1440px, centred. Dashboard content area 1184px. **Reading column 600px**
for Library articles and habit detail — this is ~60 characters at a 16px body font, matching
Google's Material adaptive guidance, and sits inside Butterick's 45–90 character range. 840px is the
absolute ceiling for a single text column. **Delete `FFAppConstants.maxWidthForWeb = 767`.**

## 6.2 Navigation transformation

| Width | Navigation |
|---|---|
| **< 600px** | Floating bottom bar. 4 tabs + centre FAB. **Rebuilt as a real widget — delete `bottomNavBackground.png`.** Height 64px + safe area, 16px side inset, `radius-lg 24`, `surface` fill, `shadow-lg`, 1px `border`. Selected tab = `brand-600` icon + label + a 3px `gold-500` pill indicator above the icon. **Not** opacity 0.5. |
| **600–839px** | `NavigationRail`, collapsed — 80px, icon over label, left edge. FAB moves to the rail top. Bottom bar disappears. |
| **840–1199px** | `NavigationRail`, extended — 200px, icon beside label. FAB becomes an extended FAB ("New habit"). |
| **≥ 1200px** | Permanent drawer — 256px, grouped (Habits · Progress · Community · Library), user block pinned at the bottom, extended FAB at the top. |

The router must gain a **shell route** so the rail/drawer persists across navigation. Today all 19
routes are flat and each page rebuilds its own nav — that is a blocker for this section and must be
fixed first.

🚩 **Do not reach for `flutter_adaptive_scaffold` — it is discontinued** (announced 2025-02-10) and
there is no first-party replacement. Hand-roll it: ~40 lines of `MediaQuery.sizeOf(context).width`
plus a switch returning `NavigationBar` / `NavigationRail` / `NavigationDrawer` inside one shared
`Scaffold`. Branch on **window width, never on device type or orientation.**

## 6.3 Per-screen layout transformation

**Home / Habits (today)**
- `xs–sm`: greeting + date + streak chip → segmented control (Active / Explore) → single-column
  habit list (each row 72px min) → FAB.
- `md`: 2-column habit grid. Header becomes a 2-up bento: `brand-700` streak hero card + today's
  completion ring.
- `lg`: 3-column bento dashboard — left (span 8): today's habit list; right (span 4): streak hero,
  weekly ring, next reminder. **"Explore" leaves the tab bar and becomes a rail destination.**
- `xl+`: adds a third column — recent group check-ins (5 items) — inside the 1184px content area.

**Progress**
- `xs`: stat tiles (3, horizontally scrollable) → calendar heatmap → line chart → per-habit list.
- `md`: calendar and chart side by side (4 + 4).
- `lg+`: 12-col — three stat tiles span 4 each on row 1; calendar spans 5 and chart spans 7 on
  row 2; a per-habit table spans 12 on row 3.

**Community / Groups** — *the biggest desktop win*
- `xs`: **collapse today's five tabs (Chats · Invitations · Events · Monthly Challenges · Webinars)
  to three primary + overflow.** Five top-level tabs on a phone is the worst IA in the app.
- `md`: 2-pane — group list left (280px), selected group preview right.
- `lg+`: **3-pane master–detail** — group list (280px) | thread (flex) | members & details (300px).
  This alone fixes chat on web, which is currently a 767px column.

**Library**
- `xs`: 1-column cards. `md`: 2-column. `lg`: 3-column grid + a left category filter rail (240px),
  replacing the search-only affordance.
- Detail: single reading column, **max 680px**, centred, with a sticky table of contents at `lg+`.

**Create habit**
- `xs`: full-screen stepper, one field per step (Goal → Prompt → Behavior → Celebration).
- `md+`: a 560px modal dialog with all four fields visible at once and the Fogg-model helper text
  inline.
- `lg+`: 720px modal with a live habit-card preview on the right.

**Profile / Settings**
- `xs`: list of rows, push to detail. `md+`: 2-pane (category list 240px | detail), no push nav.

**Onboarding**
- `xs`: full-bleed slides. `md+`: centred 560px card on the `canvas`; illustration and copy side by
  side at `lg+`. **Fix the identical dot colours** (defect 1) — inactive `border #E3DED5`, active
  `brand-600 #41607F`, active dot 24px wide.

## 6.4 Touch vs pointer

- **Minimum interactive target 48×48dp at every breakpoint.** This one number satisfies WCAG 2.5.8
  AA (24px), 2.5.5 AAA (44px), Apple's 44pt and Material's 48dp simultaneously. Today's 40px buttons
  fail all but the AA floor.
- **Assume touch, then reveal pointer affordances reactively.** There is no reliable static
  input-type flag in Flutter — `navigationMode` is a TV/leanback signal and `defaultTargetPlatform`
  returns the OS, not the input device. Use `MouseRegion` and let hover events tell you.
- Hover states only under `@media (hover: hover) and (pointer: fine)`. Hover-revealed content must
  be dismissible, hoverable and persistent (WCAG 1.4.13), and **must never be the only path** to an
  action — Flutter's rule is "solve touch first."
- **Every swipe action needs a visible non-gesture equivalent at every width.** Swipe-left-to-
  complete is currently the only completion path — unusable on desktop, unreachable by keyboard,
  and a WCAG 2.5.1 / 2.1.1 failure. Add a persistent checkbox/ring on the row (which M1 already
  assumes) and keep swipe as an accelerator.
- Keyboard: full tab order, visible 2px focus ring, `Space`/`Enter` to check in, `Esc` to close
  sheets.

## 6.5 Flutter-web specifics

A non-negotiable checklist. Several of these were wrong in my first draft and are corrected here.

- **Bundle the fonts as assets.** Register the variable font in `pubspec.yaml` under `fonts:`. You
  can keep the `GoogleFonts.*` call sites — the package auto-resolves to a bundled asset when the
  family matches. This removes the FOUT/CLS, an extra round trip on an already-heavy critical path,
  and a **GDPR exposure** (runtime fetching sends the user's IP to `fonts.gstatic.com`; German
  courts have ruled this a violation). The repo already ships unused Poppins TTFs.
- **Add `SemanticsBinding.instance.ensureSemantics()` on web.** Flutter web accessibility is **off
  by default** — without this, screen-reader users get nothing until they find an invisible
  "Enable accessibility" button. One line, unconditional, in `main()`.
- **The HTML renderer no longer exists** (removed in Flutter 3.29; the `--web-renderer` flag was
  deleted). A default build is CanvasKit; `--wasm` selects skwasm **and falls back to CanvasKit**
  where WasmGC is unavailable, so a wasm build is safe everywhere. `--wasm` requires `package:web`
  and `dart:js_interop` — `dart:html` is unsupported.
- **CanvasKit is ~1.5MB and nothing paints until it and `main.dart.js` both load.** Ship
  `--tree-shake-icons`, brotli, deferred imports, AVIF/WebP images (319KB PNG → 10KB AVIF in
  Flutter's own measurement), and **build the marketing/landing page in plain HTML** with
  `flutter.js` preloading the app behind it.
- **Wrap every text-bearing screen in `SelectionArea`.** Browser find-in-page cannot work under
  CanvasKit — text is painted into a canvas — and the old "use the HTML renderer" workaround is
  gone. If find-in-page is a real requirement for Library articles, that content belongs on an HTML
  page. **SEO is not viable** in Flutter web per Flutter's own FAQ.
- **Test image-heavy screens on a real iPhone before launch.** There is an open CanvasKit memory
  leak with network images that crashes iOS Safari after 5–10 navigations (flutter#178524). Cap
  `cacheWidth`/`cacheHeight` and evict from `imageCache` on route pop.
- **Pin Flutter ≥ 3.44.0** or `prefers-reduced-motion` does nothing on web.
- `usePathUrlStrategy()` is already enabled — keep it, but **confirm the host rewrites all routes to
  `index.html`** (Firebase Hosting: "Configure as a single-page app"), or refresh returns 404.
- **Flutter no longer generates a service worker by default** — PWA offline caching is ours to own.
  Add a build ID to `flutter_bootstrap.js?v=…` to defeat stale deploys.
- **Beware the browser back-navigation gesture** on near-horizontal drags (flutter#152588) — this
  directly threatens swipe-to-complete on habit cards.
- Add `requireAuth: true` to the 14 signed-in routes. On web every route is a public URL today.

---

# 7. Priority list — the 10 highest-leverage changes

Ordered by visual impact ÷ effort. Effort is a rough engineering estimate for the Flutter app; the
HTML prototype should demonstrate 1–5 and 9 first.

| # | Change | Impact | Effort | Why it's here |
|---|---|---|---|---|
| **1** | **Invert the ground.** `canvas #F7F5F1` + white cards + `ink #24384B`; brand blue becomes ink and accent; one `brand-700` hero card per screen. | Transforms the entire product | M — theme file + `Scaffold.backgroundColor` on 14 pages + card fills | Fixes the 3.97:1 and 1.70:1 failures **and** the "old and boring" complaint in a single move. Nothing else matters as much. |
| **2** | **Rebuild the bottom nav as a real widget.** Delete `bottomNavBackground.png`. Selected state = `brand-600` + a `gold-500` pill indicator, not `Opacity(0.5)`. | Very high | S — one component | The single most visibly dated artefact; it's on 4 of the main screens; it's one file. |
| **3** | **Restore touch feedback.** Strip the ~150 `splashColor: Colors.transparent` overrides; add M1's press-scale to habit rows and buttons. | High | S — mechanical find/replace | An app with no press state reads as broken. Nearly free. |
| **4** | **Redesign the check-in moment (M1).** Ring fill + checkmark draw + haptic + ≤8 particles + sage card state. Extend Undo to 5s. | Very high | M — one component + `flutter_animate` (already a dependency) | This is the interaction the product exists for, and today it is a grey bar. Biggest "fun" win available. |
| **5** | **Turn page transitions back on (M4).** Replace `duration: 0ms` with fade-through for tabs and shared-axis X for pushes. | High | S — the transition config is already there, just zeroed | Screens currently hard-cut. Changing a constant restores spatial continuity. |
| **6** | **Ship a real dark theme.** Add `DarkModeTheme`, make `FlutterFlowTheme.of()` brightness-aware, wire `darkTheme:` in `MaterialApp`, set `useMaterial3: true`. | High | M–L — touches every token consumer | `themeMode: ThemeMode.system` is already declared and does nothing. A wellness app used at night without dark mode is a real gap. |
| **7** | **Enforce the token layer.** One radius scale (8/12/16/24/full), one tinted shadow scale, one spacing scale; migrate the 43 files of hard-coded hex; make `designToken` actually used. | Medium (compounding) | L — broad but mechanical | Prevents the redesign from drifting back within two sprints. Also where the stray `#2A405D` / `#FFCE51` / two-greens problem gets solved. |
| **8** | **Typography.** Bundle a variable face (Figtree, or Figtree ≤20px + Poppins display), add real tracking and line heights, and **raise every 10px string to 13px**. | High | M — theme file + call-site cleanup | The 10px card text is unreadable today. Bundling also removes the runtime font fetch. |
| **9** | **Responsive shell.** Add a GoRouter shell route; `NavigationRail` at ≥600, drawer at ≥1200; delete the 767px clamp; 3-pane Community at ≥840. | High (unlocks web) | L — router restructure is the real cost | Web is currently a phone in the middle of an empty screen. The shell route is a prerequisite for everything adaptive. |
| **10** | **Milestone celebration (M3) + streak repair.** Confetti card at 7/30/50/100/365; streak freezes, a 2–3h grace window, and decay-by-10-days instead of reset-to-zero. Copy is *"You showed up for 42 days straight,"* never *"You lost your 42-day streak."* | High (retention) | M — one component + a plugin for the success haptic | The reward layer the product has never had, and the payoff for rationing gold. Duolingo's data: decoupling streak from goal raised 7+ day streaks **over 40%**; users at a 7-day streak are **2.4× more likely to return tomorrow**. |

**Free wins — do these in the first hour** (all four are bugs, ~30 minutes total):
- Onboarding indicator: `activeDotColor` → `brand-600 #41607F`, inactive → `border #E3DED5`.
- Check-in slider: `activeTrackColor` → `sage-600 #4F7A53`, inactive → `#E3DED5`; same for tick marks.
- `progress_calendar_widget.dart:416` — `Color(0xE6EEF8)` → `Color(0xFFE6EEF8)`.
- `progress_calendar_widget.dart:424` — `Color(0x2A405D)` → `Color(0xFF27405A)`.

**Near-free, high-consequence engineering items** (not visual, but they gate the redesign):
- **`SemanticsBinding.instance.ensureSemantics()` on web** — one line; without it Flutter web is
  inaccessible to screen readers by default.
- **The reduced-motion helper** that ORs `reduceMotion` with `disableAnimations` — without it every
  iOS user gets full motion regardless of their setting. Add it *before* building the motion system,
  not after.
- **Pin Flutter ≥ 3.44.0** so `prefers-reduced-motion` works on web at all.
- **Bundle the fonts as assets** — kills the FOUT, a round trip, and the GDPR exposure at once.

**Also worth scheduling:** delete the unreachable 675-line `free_trial_screen`; replace the eight
raster PNG icons with vectors; unify on one Material icon style (rounded); move the FlutterFlow-CDN
image reference to local assets; add `requireAuth: true` to the 14 signed-in routes; wrap
text-bearing screens in `SelectionArea`; real-device iOS Safari load test for flutter#178524.
