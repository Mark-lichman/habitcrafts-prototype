/* ============================================================================
   HabitCrafts — views/onboarding.js
   THE WELCOME TOUR. Three paged slides, then into the app.

   `meta.chrome = false` is what removes the nav: app.js reads it, sets
   `data-chrome="none"` on the shell and hides the nav root, so the bottom bar,
   the rail and the shell's insets go together. Nothing to navigate to yet, so
   there is no navigation. [B §6.3]

   ------------------------------------------------------------------------
   WHO OWNS WHAT
   ------------------------------------------------------------------------
   The paging is prototype.js's, keyed off attributes this view authors:

     [data-ob-stage]              the stage
     [data-ob-slide="1|2|3"]      the slides — the inactive ones carry `hidden`,
                                  so they leave the tab order and the a11y tree
     [data-ob-go="n"]             the dots, which are jump buttons
     [data-ob-prev] [data-ob-next]
     [data-ob-done]               shown on the last slide only

   It moves `hidden` and `aria-current`, runs the 8px rise (dropping it under
   reduced motion — the branch is in its `go()`, not left to CSS), announces
   each change, and binds the arrow keys. This view writes no second handler
   for any of that. It only supplies markup and the two destinations, both of
   which are plain `<a href="#/home">` — keyboard- and middle-click-friendly
   for free, and `[data-ob-done]` is an anchor precisely because prototype.js
   only ever toggles its `hidden`, never its click.

   ------------------------------------------------------------------------
   FOUR SHIPPED DEFECTS THIS SCREEN FIXES                      [README §10]
   ------------------------------------------------------------------------
   1. The page indicator sets dotColor == activeDotColor (#D9D9D9), so "you are
      here" is invisible. Here the active dot is brand-600 and 24px, inactive
      --c-border and 8px — a COLOUR step and a WIDTH step, so it survives
      grayscale — plus aria-current on the control itself.
   2. Slides 1 and 2 are a swipe-only PageView: no Next, no Back, no Skip, no
      way to jump, and nothing on screen saying to swipe. Every step here has a
      visible, keyboard-operable control.
   3. Slide 3 drops its illustration and falls to bodyMedium, so it stops
      reading as a headline. All three slides share one rhythm here.
   4. The background is the theme's mid-blue `primary`. Gone: this is the same
      parchment canvas as every other screen. [D §5.1]

   The slide COPY is not written here — it is fixture data in `data.js`, which
   is where the rewrite of slide 2's body lives (the shipping copy says
   partnerships foster "emotional detachment", which is the opposite of the
   screen's point). [README §7, rewrite 1]
   ========================================================================= */

import * as store from '../store.js';
import { html, icon } from '../ui.js';

export const meta = {
  title: 'Welcome',
  nav: null,      /* nothing to light up — there is no nav */
  level: 0,       /* a destination, not a push → fade-through */
  chrome: false,  /* logged out: no nav, no shell insets */
};

/* --------------------------------------------------------------------------
   THE SLIDE ART
   The system's illustration classes, not a second illustration approach:
   `.illus__ground` `.illus__shape` `.illus__line` `.illus__accent`. The rule
   lives in CSS — brand-300 shapes, brand-700 linework, ONE sage or gold accent
   — so every drawing re-tones itself in Nightfall for free and no colour is
   retyped here. [D §6 / components.css §P1]

   Drawn on a 300 × 240 grid rather than the 120 the empty states use, because
   this art is 300px wide at 840+, not 132. The stroke weights are scaled with
   the grid in the appended CSS block so the optical weight matches.

   One accent per drawing, maximum — that is the rule, and gold is spent only
   on the slide that is actually about the reward.
-------------------------------------------------------------------------- */

const ART = [
  /* 1. Craft one small habit — a stone, a stem, one leaf just opening. */
  html`
    <svg viewBox="0 0 300 240" role="img"
         aria-label="A small stone with a single leaf growing from it">
      <ellipse class="illus__ground" cx="150" cy="206" rx="96" ry="16"/>
      <path class="illus__shape" d="M104 206c0-26 21-46 46-46s46 20 46 46z"/>
      <path class="illus__line" d="M150 160V96"/>
      <path class="illus__shape" d="M150 132c-28 0-45-16-47-40 26-4 47 11 47 40z"/>
      <path class="illus__accent" d="M150 112c25-2 40-16 42-38-25-2-42 10-42 38z"/>
    </svg>`,

  /* 2. Do it with other people — two stones, one thread between them. */
  html`
    <svg viewBox="0 0 300 240" role="img"
         aria-label="Two stones side by side, joined by a woven thread with a leaf on it">
      <ellipse class="illus__ground" cx="150" cy="206" rx="108" ry="16"/>
      <path class="illus__shape" d="M52 206c0-23 19-42 42-42s42 19 42 42z"/>
      <path class="illus__shape" d="M160 206c0-25 21-46 46-46s46 21 46 46z"/>
      <path class="illus__line" d="M94 162C114 130 186 128 206 158"/>
      <path class="illus__accent" d="M150 138c16-3 26-15 26-32-16 1-27 13-26 32z"/>
    </svg>`,

  /* 3. Watch it turn gold — a habit card wearing its seal. The one gold
        accent in the tour, on the one slide that is about the reward. */
  html`
    <svg viewBox="0 0 300 240" role="img"
         aria-label="A habit card with a gold seal pressed into its corner">
      <ellipse class="illus__ground" cx="150" cy="206" rx="96" ry="16"/>
      <rect class="illus__shape" x="72" y="62" width="156" height="116" rx="14"/>
      <path class="illus__line" d="M96 96h80M96 120h52"/>
      <!-- The seal is the sprite's #i-rosette geometry, scaled off its 24-grid
           rather than redrawn: the mark a habit earns at day 100 is a specific
           shape in this system and the tour should show that shape, not a
           yellow disc. Gold is a FILL here, never a hairline — gold-500 is
           1.52:1 on canvas. [D §2.4 / §6] -->
      <g transform="translate(168 118) scale(2.1)">
        <path class="illus__accent illus__accent--gold"
              d="M12 2l2.2 3.1 3.7-.9.4 3.8 3.4 1.7-2.3 3 2.3 3-3.4 1.7-.4 3.8-3.7-.9L12 24l-2.2-3.1-3.7.9-.4-3.8L2.3 16l2.3-3-2.3-3 3.4-1.7.4-3.8 3.7.9L12 2zm0 5.5A4.5 4.5 0 1 0 12 16.5 4.5 4.5 0 0 0 12 7.5z"/>
      </g>
    </svg>`,
];

/* --------------------------------------------------------------------------
   RENDER
   Data in, markup out. The slides are `store.data.onboarding`, so the copy has
   one home and the art is matched to it by position.
-------------------------------------------------------------------------- */

function slide(item, i, total) {
  const n = i + 1;
  return html`
    <section class="ob-slide" data-ob-slide="${n}" aria-labelledby="${item.id}-h" ${n > 1 ? 'hidden' : ''}>
      <div class="ob-slide__art">${ART[i % ART.length]}</div>
      <div class="ob-slide__text">
        <h1 id="${item.id}-h" class="ob-slide__title">${item.title}</h1>
        <p class="ob-slide__body t-body-lg">${item.body}</p>
        <p class="visually-hidden">Slide ${n} of ${total}</p>
      </div>
    </section>`;
}

export function render() {
  const slides = store.data.onboarding;
  const total = slides.length;

  return String(html`
    <div class="ob-page">

      <div class="ob-top">
        <span class="ob-brand">
          <img src="assets/images/Habit_Craft_Logo_File-09.png" alt="">
          <span>HabitCrafts</span>
        </span>
        <!-- The skip the shipping flow does not offer. It lands exactly where
             finishing lands: nothing is withheld for sitting through it. -->
        <a class="text-link" href="#/home">Skip</a>
      </div>

      <div class="ob-card">
        <div class="ob-stage" data-ob-stage>
          ${slides.map((item, i) => slide(item, i, total))}
        </div>

        <!-- Three grid tracks, not a flex row, so the dots stay optically
             centred whether or not Back is in the DOM — and on slide 1 it is
             not. Next is replaced by the real CTA on the last slide. -->
        <div class="ob-foot">
          <button class="btn btn--ghost" type="button" data-ob-prev hidden>
            ${icon('arrow-back', 'icon--sm')} Back
          </button>

          <ul class="ob-dots" data-ob-dots aria-label="Slide">
            ${slides.map((item, i) => html`
              <li><button class="ob-dot" type="button" data-ob-go="${i + 1}"
                          aria-current="${i === 0 ? 'true' : 'false'}">
                <span class="visually-hidden">Slide ${i + 1} of ${total}: ${item.title}</span>
              </button></li>`)}
          </ul>

          <button class="btn btn--primary" type="button" data-ob-next>
            Next ${icon('arrow', 'icon--sm')}
          </button>

          <a class="btn btn--primary" href="#/home" data-ob-done hidden>Get Started</a>
        </div>
      </div>
    </div>`);
}

/* No mount(). Everything interactive on this screen is either an anchor or a
   prototype.js hook, and this view subscribes to nothing — app.js re-renders
   it on any store change, which is the contract for every view. */
