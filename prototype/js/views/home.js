/* ============================================================================
   HabitCrafts — views/home.js
   THE REFERENCE VIEW. Read this before building any other one.

   Home is the richest screen and the only one that owns a signature moment, so
   it exercises every part of the architecture: derived state, the HC behaviour
   hooks, an owned gesture, delegated events, and three distinct empty states.
   The other views are simpler than this — if something here looks like more
   machinery than your view needs, it is.

   ------------------------------------------------------------------------
   THE VIEW CONTRACT — three exports, two of them optional
   ------------------------------------------------------------------------
     export const meta   { title, nav, level, chrome?, ownsCheckIn? }
     export function render(params) → HTML string
     export function mount(root, params) → optional destroy()

   `render` is a PURE function of the store. It reads, it returns markup, it
   writes nothing. It is called again from scratch on every state change, so it
   must not depend on anything it left in the DOM last time.

   `mount` runs after the markup is in the document and after HC.init has wired
   it. Use it for delegated listeners and for anything that has to touch real
   nodes. Return a function to tear down anything that would outlive the view —
   timers, listeners on `document` or `window`. Listeners bound to `root` itself
   do not need cleaning up: the router removes the whole element.

   You never subscribe to the store. app.js re-renders the mounted view on every
   change for you.

   ------------------------------------------------------------------------
   meta.ownsCheckIn — why Home sets it and your view probably should not
   ------------------------------------------------------------------------
   The press-and-hold is ~700ms of choreography that prototype.js runs directly
   on the card: ring fill, checkmark draw, flecks, the celebration echo, the
   FLIP reorder, the arc closing. If Home re-rendered when the store recorded
   that check-in, every one of those animating nodes would be replaced mid-
   flight. `ownsCheckIn: true` tells app.js to skip the re-render for DOM-
   originated check-ins on this view only. Home's DOM is already correct at that
   point; the store just agrees with it.

   Set it only if your view renders `[data-checkin]` rings AND would be damaged
   by a re-render. A view that merely displays streaks should NOT set it — it
   wants the re-render.
   ========================================================================= */

import * as store from '../store.js';
import { longDate, today, WEEKDAY, MONTH, todaysLessonId } from '../data.js';
import { html, icon, cls, plural, on, restoreRings } from '../ui.js';

export const meta = {
  title: 'Today',
  nav: 'habits',
  level: 0,            /* a top-level destination → fade-through */
  ownsCheckIn: true,   /* see the note above */
};

/* --------------------------------------------------------------------------
   PIECES
-------------------------------------------------------------------------- */

/**
 * A habit card, in whichever state the data says it is in.
 *
 * THE RING MARKUP IS A CONTRACT — copy it exactly. `pathLength="100"` on all
 * three shapes is load-bearing: it normalises every stroke so progress is
 * literally a percentage and JS can write `stroke-dashoffset = 100 − percent`.
 * [README §4]
 *
 * `data-habit` carries the habit id. That single attribute is the entire join
 * between the animation layer and the data layer — prototype.js fires
 * `hc:checkin` with the card element, and app.js reads the id straight off it.
 */
function habitCard(h) {
  const done = store.isDoneOn(h);
  const streak = store.streakOf(h);
  const gild = store.gildOf(h);
  const name = h.behavior;

  /* The 13px prompt line. The 10px text is abolished. [D §3.1] */
  const metaLine = [h.prompt, streak > 0 && plural(streak, 'day') + ' streak']
    .filter(Boolean).join(' · ');

  /* The seal is a real element (not a pseudo-element) from day 100 up, so it
     composes with .is-complete instead of being clobbered by it. [D §2.4] */
  const seal = gild >= 100
    ? html`<span class="${cls('seal', gild >= 365 && 'seal--solid')}" role="img"
                 aria-label="${gild}-day seal${gild >= 365 ? ', solid gold' : ''}">
             <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-rosette"></use></svg>
           </span>`
    : '';

  const title = seal
    ? html`<div class="u-flow-tight"><h3 class="habit-card__title">${name}</h3>${seal}</div>`
    : html`<h3 class="habit-card__title">${name}</h3>`;

  return html`
    <li>
      <article class="${cls('card', 'habit-card', gild && 'habit-card--gild-' + gild, done && 'is-complete')}"
               data-habit="${h.id}" data-celebration="${h.celebration}">
        <div class="habit-card__body">
          ${title}
          <p class="habit-card__meta">${metaLine}</p>
          <p class="habit-card__echo" data-echo hidden></p>
        </div>
        <button class="btn btn--ghost btn--sm habit-card__undo" type="button" data-undo hidden>Undo</button>
        <button class="ring" type="button" data-checkin aria-pressed="${done ? 'true' : 'false'}"
                aria-label="${done
                  ? 'Checked in: ' + name + '. Activate to undo.'
                  : 'Check in: ' + name + '. Press and hold to complete.'}">
          <svg class="ring__svg" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
            <circle class="ring__track" cx="22" cy="22" r="16" pathLength="100"/>
            <circle class="ring__fill"  cx="22" cy="22" r="16" pathLength="100"/>
            <path class="ring__check" d="M14.6 22.4l5.1 5.1 9.7-10.6" pathLength="100"/>
          </svg>
          <span class="ring__hint" data-ring-hint hidden>Hold to check in</span>
        </button>
      </article>
    </li>`;
}

/* The 270° day arc. HC.refreshDay() fills it from the habit count — the
   numbers written here are only what shows before the first paint. */
function dayArc(done, total) {
  return html`
    <div class="day-arc" data-day-arc>
      <svg class="day-arc__svg" viewBox="0 0 72 72" aria-hidden="true" focusable="false">
        <path class="day-arc__track" d="M16.2 55.8A28 28 0 1 1 55.8 55.8" pathLength="100"/>
        <path class="day-arc__fill"  d="M16.2 55.8A28 28 0 1 1 55.8 55.8" pathLength="100"/>
        <path class="day-arc__glint" d="M16.2 55.8A28 28 0 1 1 55.8 55.8" pathLength="100"/>
      </svg>
      <span class="day-arc__count" aria-hidden="true">
        <strong data-arc-done>${done}</strong><span>of <span data-arc-total>${total}</span></span>
      </span>
    </div>`;
}

/* Seven cells, three redundant states, a per-cell label. Never colour alone —
   done carries a white dot, partial a sage dot and an outline, empty nothing.
   [D §3.2] */
function weekCalendar() {
  return html`
    <div class="cal-grid">
      ${store.recentDays(7).map((d) => {
        const label = WEEKDAY[d.date.getDay()] + ' ' + d.date.getDate() + ' ' + MONTH[d.date.getMonth()];
        const word = d.state === 'done' ? 'completed'
          : d.state === 'partial' ? d.done + ' of ' + d.total + ' done'
          : 'no check-ins';
        return html`<div class="${cls('cal-cell', d.state === 'done' && 'cal-cell--done', d.state === 'partial' && 'cal-cell--partial')}"
                         role="img" aria-label="${label + ', ' + word}">
                      ${d.state !== 'none' ? html`<span class="cal-cell__glyph"></span>` : ''}
                    </div>`;
      })}
    </div>`;
}

/* --------------------------------------------------------------------------
   EMPTY STATES — there are three, and they are not the same thing
     · no habits at all           → the M6 empty state, one CTA
     · habits exist, none due     → nothing scheduled today
     · all of today's are done    → the done state (HC toggles it)
-------------------------------------------------------------------------- */

function noHabitsState() {
  return html`
    <div class="empty-state">
      <svg class="illus" viewBox="0 0 120 120" role="img"
           aria-label="A bare stem in a stone pot, with one sage leaf just starting">
        <ellipse class="illus__ground" cx="60" cy="103" rx="30" ry="8"/>
        <path class="illus__shape" d="M40 74h40l-5 26H45l-5-26z"/>
        <path class="illus__line" d="M36 74h48"/>
        <path class="illus__line" d="M60 74V38"/>
        <g class="illus__drift">
          <path class="illus__accent" d="M60 50c12-1 20-8 21-19-12-1-21 5-21 19z"/>
        </g>
      </svg>
      <p class="empty-state__title">No active habits</p>
      <p class="empty-state__body t-body">Keep it small — you can always do more.</p>
      <a class="btn btn--primary" href="#/create">Craft your first habit</a>
    </div>`;
}

function nothingDueState() {
  return html`
    <div class="empty-state empty-state--compact">
      <svg class="illus" viewBox="0 0 120 120" role="img" aria-label="A stone resting on its own">
        <ellipse class="illus__ground" cx="60" cy="86" rx="32" ry="9"/>
        <path class="illus__shape" d="M38 82c0-14 10-24 22-24s22 10 22 24z"/>
        <path class="illus__line" d="M34 82h52"/>
      </svg>
      <p class="empty-state__title">Nothing scheduled today</p>
      <p class="empty-state__body t-body">Your habits are set for other days. Enjoy the gap.</p>
    </div>`;
}

/* The done state. `data-when-complete` is HC's hook: refreshDay() shows it the
   moment the last habit of the day lands, alongside the arc's gold flush and
   the greeting crossfade. Then the app goes quiet — no modal, no confetti, no
   share prompt. [D §2.3] */
function doneState(total) {
  return html`
    <div class="empty-state" data-when-complete hidden>
      <svg class="illus" viewBox="0 0 120 120" role="img"
           aria-label="A stem with two leaves and a bud, resting on a stone">
        <ellipse class="illus__ground" cx="60" cy="99" rx="34" ry="9"/>
        <path class="illus__line" d="M60 97V42"/>
        <path class="illus__shape" d="M60 70c-16 0-26-9-27-23 15-2 27 6 27 23z"/>
        <g class="illus__drift">
          <path class="illus__shape" d="M60 57c14-1 23-9 24-22-14-1-24 6-24 22z"/>
          <circle class="illus__accent illus__accent--gold" cx="60" cy="38" r="5.5"/>
        </g>
      </svg>
      <p class="empty-state__title">That's everything.</p>
      <p class="empty-state__body t-body">
        ${total} for ${total}. Nothing else is waiting for you here — the app will
        still be here tomorrow.
      </p>
    </div>`;
}

/* --------------------------------------------------------------------------
   RENDER
-------------------------------------------------------------------------- */

export function render() {
  const due = store.todayHabits();
  const anyHabits = store.activeHabits().length > 0;
  const progress = store.dayProgress();
  const streak = store.overallStreak();
  const week = store.daysWithCheckIn(7);

  const lesson = store.state.lessons.find((l) => l.id === todaysLessonId);
  const lessonDismissed = store.state.dismissedLessons.includes(todaysLessonId);

  /* Next reminder: the earliest still-incomplete habit that has a time. */
  const next = due.find((h) => !store.isDoneOn(h) && h.time);

  const activity = store.state.groups[0];

  return String(html`
    <!-- THE GREETING BLOCK — the hero on mobile. [D §3.1]
         data-greeting + data-name hand the copy to HC: it picks morning /
         afternoon / evening from the simulated hour, and crossfades to the
         done-for-the-day line when the last habit lands. Never write the
         greeting text from here.
         (No backticks in a comment inside a template literal — they close it.) -->
    <header class="greeting">
      <div class="greeting__text">
        <h1 class="greeting__title" data-greeting data-name="${store.state.user.name}">Good morning, ${store.state.user.name}</h1>
        <p class="greeting__date t-body-sm">
          ${longDate(today())}
          ${streak > 0 ? html`<span class="chip chip--streak" style="margin-inline-start:8px">
            ${icon('flame')}<span>${plural(streak, 'day')}</span>
          </span>` : ''}
        </p>
      </div>
      ${dayArc(progress.done, progress.total)}
    </header>

    <div class="home-grid">

      <!-- MAIN COLUMN — today's habits. Cards are 72px min height, title in h3,
           the prompt line at 13px, ring at the right edge with a 48px hit area.
           The "Active Habit / Explore" tab bar is cut; Explore is a quiet text
           link below the list. [D §3.1] -->
      <section class="home-grid__main" aria-labelledby="today-h">
        <div class="section-head">
          <h2 id="today-h" class="t-h2">Today</h2>
          ${due.length ? html`<p class="t-body-sm t-muted" data-when-incomplete>Press and hold a ring to check in</p>` : ''}
        </div>

        ${!anyHabits ? noHabitsState()
          : !due.length ? nothingDueState()
          : html`
            <ul class="habit-list">${due.map(habitCard)}</ul>
            ${doneState(due.length)}

            <p style="margin-block-start:var(--space-16)">
              <a class="text-link" href="#/explore">
                Find a new habit ${icon('arrow', 'icon--sm')}
              </a>
            </p>

            <!-- ONE single-row lesson tile, surface-tinted and dismissible. The
                 "Daily Lesson / Lessons Week N / View All Lessons" stack is cut
                 from the primary scroll — the Library owns the rest. [D §3.1] -->
            ${lesson && !lessonDismissed ? html`
              <article class="card lesson-tile" style="margin-block-start:var(--space-24)">
                <div class="lesson-tile__body">
                  <p class="lesson-tile__kicker">Today's lesson</p>
                  <p class="t-body">${lesson.title}</p>
                </div>
                <a class="btn btn--ghost btn--sm" href="#/library/${lesson.id}">Read</a>
                <button class="icon-btn" type="button" aria-label="Dismiss today's lesson"
                        data-dismiss-lesson="${lesson.id}">
                  ${icon('close', 'icon--sm')}
                </button>
              </article>` : ''}
          `}
      </section>

      <!-- ASIDE — from md up. Carries the screen's ONE brand-700 hero surface:
           streak numeral in Fraunces, gold flame chip, the day arc. After 20:00
           it takes the brand-700 → brand-800 gradient under its grain, driven
           by [data-hour-late] on <html>. Nothing else changes. [D §2.5] -->
      <aside class="home-grid__aside" aria-label="Today at a glance">
        <section class="hero hero--streak">
          <div>
            <p class="hero__numeral">${streak}</p>
            <p class="hero__label t-label">day streak</p>
            <p class="hero__body t-body-sm" style="margin-block-start:var(--space-8)">
              You showed up ${week} of the last 7 days.
            </p>
            ${week >= 6 ? html`<span class="chip chip--streak" style="margin-block-start:var(--space-12)">
              ${icon('flame')}<span>Best yet</span>
            </span>` : ''}
          </div>
          ${dayArc(progress.done, progress.total)}
        </section>

        <section class="card" aria-labelledby="week-h">
          <h2 id="week-h" class="t-label t-muted">This week</h2>
          <div class="stat-tile" style="margin-block-start:var(--space-8)">
            <span class="stat-tile__value">${week} of 7</span>
            <span class="stat-tile__label">days with at least one check-in</span>
          </div>
          <div style="margin-block-start:var(--space-16)">${weekCalendar()}</div>
        </section>

        ${next ? html`
          <section class="card" aria-labelledby="next-h">
            <h2 id="next-h" class="t-label t-muted">Next reminder</h2>
            <p class="t-body" style="margin-block-start:var(--space-4)">${next.behavior}</p>
            <p class="t-body-sm t-muted">${next.prompt} · around ${next.time}</p>
          </section>` : ''}
      </aside>

      <!-- THIRD COLUMN — xl (≥1200) only. Habit energy imported from Community:
           the screen is about momentum, not messaging. [D §3.1 / §3.3] -->
      <aside class="home-grid__activity" aria-label="Recent group check-ins">
        <section class="card">
          <h2 class="t-label t-muted">${activity.name}</h2>
          <p class="t-body-sm t-sage" style="margin-block-start:var(--space-4)">
            +${activity.checkedInToday.length} checked in today
          </p>
          <div style="margin-block-start:var(--space-12)">
            ${activity.activity.map((row) => html`
              <div class="activity-row">
                <span class="avatar" aria-hidden="true">${store.data.people[row.who].initial}</span>
                <span class="activity-row__text"><strong>${store.data.people[row.who].name}</strong> ${row.what}</span>
              </div>`)}
          </div>
          <a class="text-link" href="#/community">Open Community ${icon('arrow', 'icon--sm')}</a>
        </section>
      </aside>
    </div>`);
}

/* --------------------------------------------------------------------------
   MOUNT
   Runs after the markup is in the document AND after HC.init has wired the
   rings. Two jobs only.
-------------------------------------------------------------------------- */

export function mount(root) {
  /* 1. Re-paint any card that rendered already-complete. See ui.js for why
        this has to happen after HC.init rather than in the markup. This is what
        makes a check-in survive a trip to Progress and back. */
  restoreRings(root);

  /* 2. Delegated events. Delegation rather than per-node listeners because the
        view re-renders its own innerHTML — direct listeners would be lost. */
  on(root, 'click', '[data-dismiss-lesson]', (e, el) => {
    store.dismissLesson(el.getAttribute('data-dismiss-lesson'));
  });

  /* Nothing here outlives the view, so there is no destroy() to return. If you
     add a window/document listener or a timer, return a function that removes
     it — the router calls it before the view is torn down. */
}
