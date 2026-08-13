/* ============================================================================
   HabitCrafts — views/habit-detail.js
   ONE HABIT, IN FULL.                                            route #/habit/:id

   There is no static reference screen for this one; it is assembled from the
   system — Home's habit card and gild ladder, Progress's calendar encoding,
   Create's four questions read back.

   What it is emotionally for: the record of a promise you have been keeping.
   So the numbers on it are the derived ones (nothing here stores a streak), the
   history is drawn with the same three-redundant-signal cells the rest of the
   app uses, and the four fields are shown as the questions that produced them —
   the celebration in the face it unfurls in, because that is the part the app
   hands back to you. [D §2.2]

   ------------------------------------------------------------------------
   TWO DECISIONS WORTH STATING
   ------------------------------------------------------------------------
   1. NO CHECK-IN RING HERE, on purpose. A ring would force the choice between
      `meta.ownsCheckIn` — which suppresses the re-render and would leave this
      screen's streak, calendar and best-ever showing yesterday's numbers right
      after you changed them — and a re-render that would replace the animating
      card mid-flight. Home owns the gesture; this screen owns the record, and
      links to Home when today is still open.

   2. EDITING COMMITS THROUGH `store.restoreHabit()`. The store exposes no
      `updateHabit`, and adding one is out of scope for this file. `restoreHabit`
      on a habit that is not archived writes `archived = false` over `false` and
      then commits — so it persists, notifies, and (this is the part that
      matters) clears the selector memo, which a bare `router.refresh()` would
      not. Change the schedule and the streak has to be recomputed; a stale
      memoised streak is exactly the drift the data model exists to prevent.
   ========================================================================= */

import * as store from '../store.js';
import * as router from '../router.js';
import { longDate, today, daysAgo, WEEKDAY, MONTH } from '../data.js';
import { html, icon, cls, plural, on } from '../ui.js';

export const meta = {
  title: 'Habit',
  nav: 'habits',   /* pushed from Today; the destination stays lit underneath */
  level: 1,        /* a push into detail → shared-axis X, and back again */
  /* No ownsCheckIn — this view renders no rings. See the note above. */
};

const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HISTORY_DAYS = 28;

/* Which habit, if any, is open for editing. Module state rather than DOM state
   because `render` is pure and is called again from scratch on every commit. */
let editingId = null;

/* --------------------------------------------------------------------------
   SMALL DERIVATIONS
-------------------------------------------------------------------------- */

function scheduleText(h) {
  if (h.days.length === 7) return 'Every day';
  if (!h.days.length) return 'No days set';
  return h.days.slice().sort().map((n) => SHORT[n]).join(', ');
}

function gildText(tier) {
  if (!tier) return 'No mark yet';
  if (tier >= 365) return '365-day seal · solid gold';
  if (tier >= 100) return '100-day seal';
  return tier + '-day mark';
}

/* --------------------------------------------------------------------------
   PIECES
-------------------------------------------------------------------------- */

/**
 * Four weeks of this habit's own history.
 *
 * Three states, three redundant signals, never colour alone [D §3.2]:
 *   kept        sage fill + a dot glyph
 *   scheduled   sunken fill, no glyph
 *   not due     dashed hairline, no fill
 * Every cell carries `role="img"` and its own label, because a grid of coloured
 * squares is not information to a screen reader.
 */
function historyGrid(h) {
  const cells = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const due = store.isScheduled(h, d);
    const done = store.isDoneOn(h, d);
    const label = WEEKDAY[d.getDay()] + ' ' + d.getDate() + ' ' + MONTH[d.getMonth()];
    const word = done ? 'kept' : due ? 'not kept' : 'not scheduled';
    cells.push(html`
      <div class="${cls('cal-cell', done && 'cal-cell--done', !due && 'hd-cell--off')}"
           role="img" aria-label="${label + ', ' + word}">
        ${done ? html`<span class="cal-cell__glyph"></span>` : ''}
      </div>`);
  }
  return html`<div class="cal-grid">${cells}</div>`;
}

function legend() {
  return html`
    <div class="hd-legend">
      <span class="hd-legend__item">
        <span class="hd-legend__swatch hd-legend__swatch--done" aria-hidden="true"></span>Kept
      </span>
      <span class="hd-legend__item">
        <span class="hd-legend__swatch" aria-hidden="true"></span>Scheduled
      </span>
      <span class="hd-legend__item">
        <span class="hd-legend__swatch hd-legend__swatch--off" aria-hidden="true"></span>Not due
      </span>
    </div>`;
}

/** The four questions, read back. */
function fields(h) {
  const row = (q, a, extra) => html`
    <div class="hd-field">
      <span class="hd-field__q t-label">${q}</span>
      <p class="${cls('hd-field__a', 't-body', extra)}">${a || '—'}</p>
    </div>`;

  return html`
    ${row('What will you do?', h.behavior)}
    ${row('When will you do it?', h.prompt)}
    ${row('How will you celebrate?', h.celebration, 'hd-field__a--celebration')}
    ${row('What will success look like?', h.why)}`;
}

/** The same four questions, editable. Own hooks — nothing here belongs to the
    Create Habit module, which is rooted on [data-craft] and is inert here. */
function editForm(h) {
  const field = (id, label, value, help) => html`
    <div class="field" style="margin-block-start:var(--space-16)">
      <label class="field__label" for="hd-${id}">${label}</label>
      ${help ? html`<p class="field__help">${help}</p>` : ''}
      <input class="input" id="hd-${id}" type="text" data-hd-field="${id}"
             style="inline-size:100%" autocomplete="off" value="${value}">
    </div>`;

  return html`
    <form data-hd-form>
      ${field('behavior', 'What will you do?', h.behavior)}
      ${field('prompt', 'When will you do it?', h.prompt)}
      ${field('celebration', 'How will you celebrate?', h.celebration,
              'This is what unfurls inside the card every time you check in.')}
      ${field('why', 'What will success look like?', h.why)}

      <p class="field__label" id="hd-daypick-label"
         style="margin-block:var(--space-24) var(--space-8)">Which days?</p>
      <div class="daypick" role="group" aria-labelledby="hd-daypick-label">
        ${[1, 2, 3, 4, 5, 6, 0].map((n) => html`
          <button class="daypick__day" type="button" data-hd-day="${n}"
                  aria-pressed="${h.days.includes(n) ? 'true' : 'false'}">
            <span>${SHORT[n]}</span><span class="daypick__dot" aria-hidden="true"></span>
          </button>`)}
      </div>

      <div class="field" style="margin-block-start:var(--space-16);max-inline-size:200px">
        <label class="field__label" for="hd-time">At what time?</label>
        <input class="input" id="hd-time" type="time" value="${h.time}" data-hd-time>
      </div>

      <!-- "Editing is not restarting. The streak is a record of what you did,
           not a contract you are in breach of." — lesson l-6. -->
      <p class="t-body-sm t-muted" style="margin-block-start:var(--space-16)">
        Changing a habit keeps its history. Nothing you have already done is undone.
      </p>

      <div class="hd-actions" style="margin-block-start:var(--space-16)">
        <button class="btn btn--primary" type="submit">Save changes</button>
        <button class="btn btn--ghost" type="button" data-hd-cancel>Cancel</button>
      </div>
    </form>`;
}

function notFound() {
  return String(html`
    <div class="page">
      <a class="page-back" href="#/home">${icon('arrow-back', 'icon--sm')} Today</a>
      <div class="empty-state">
        <svg class="illus" viewBox="0 0 120 120" role="img" aria-label="A stone resting on its own">
          <ellipse class="illus__ground" cx="60" cy="86" rx="32" ry="9"/>
          <path class="illus__shape" d="M38 82c0-14 10-24 22-24s22 10 22 24z"/>
          <path class="illus__line" d="M34 82h52"/>
        </svg>
        <p class="empty-state__title">That habit isn't here</p>
        <p class="empty-state__body t-body">It may have been reset. Everything else is still on Today.</p>
        <a class="btn btn--primary" href="#/home">Back to Today</a>
      </div>
    </div>`);
}

/* --------------------------------------------------------------------------
   RENDER
-------------------------------------------------------------------------- */

export function render(params) {
  const h = store.habitById(params.id);
  if (!h) return notFound();

  const editing = editingId === h.id;
  const streak = store.streakOf(h);
  const best = store.bestStreakOf(h);
  const gild = store.gildOf(h);          /* reads BEST, not current [D §2.4] */
  const doneToday = store.isDoneOn(h);
  const dueToday = store.isScheduled(h, today());
  const ahead = store.milestoneAhead(h);
  const sorted = h.history.slice().sort();
  const recent = sorted.slice().reverse().slice(0, 6);
  const since = sorted.length ? new Date(sorted[0] + 'T00:00:00') : null;

  const seal = gild >= 100
    ? html`<span class="${cls('seal', gild >= 365 && 'seal--solid')}" role="img"
                 aria-label="${gild}-day seal${gild >= 365 ? ', solid gold' : ''}">
             <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-rosette"></use></svg>
           </span>`
    : '';

  /* Today's line. No ring on this screen — the gesture belongs to Today. */
  const todayLine = h.archived ? ''
    : doneToday ? html`<span class="chip chip--sage">${icon('check')}Kept today</span>`
    : dueToday ? html`<a class="text-link" href="#/home">Check in on Today ${icon('arrow', 'icon--sm')}</a>`
    : html`<span class="t-body-sm t-muted">Not scheduled today</span>`;

  return String(html`
    <div class="page">
      <a class="page-back" href="#/home">${icon('arrow-back', 'icon--sm')} Today</a>

      <header class="page-head">
        <div class="page-head__text">
          <div class="u-flow-tight">
            <h1 class="t-h1">${h.behavior}</h1>
            ${seal}
          </div>
          <p class="page-head__sub t-body">${h.prompt || 'No prompt set'}</p>
        </div>
        ${!editing && !h.archived ? html`
          <div class="hd-actions">
            <button class="btn btn--secondary btn--sm" type="button" data-hd-edit>Edit</button>
            <button class="btn btn--danger btn--sm" type="button" data-hd-archive>
              ${icon('archive', 'icon--sm')} Archive
            </button>
          </div>` : ''}
      </header>

      ${h.archived ? html`
        <section class="card card--tinted" style="margin-block-start:var(--space-16)"
                 aria-labelledby="archived-h">
          <div class="u-between u-wrap">
            <div>
              <h2 id="archived-h" class="t-label">Archived</h2>
              <p class="t-body t-muted" style="margin-block-start:var(--space-4)">
                It is off Today, and everything you did is still here. Nothing was deleted.
              </p>
            </div>
            <button class="btn btn--secondary btn--sm" type="button" data-hd-restore>Restore it</button>
          </div>
        </section>` : ''}

      <div class="hd-layout" style="margin-block-start:var(--space-24)">

        <div class="hd-col">
          <!-- The one deep-blue surface on this screen. The numeral is the
               CURRENT streak; the mark below it is the best one, because a mark
               records what you did and survives a break. [D §2.4] -->
          <section class="hero hero--streak" aria-label="Streak">
            <div>
              <p class="hero__numeral">${streak}</p>
              <p class="hero__label t-label">day streak</p>
              <p class="hero__body t-body-sm" style="margin-block-start:var(--space-8)">
                ${best > 0
                  ? 'Best run so far: ' + plural(best, 'day') + '.'
                  : 'No run yet. The first day is the whole thing.'}
              </p>
              ${gild ? html`<span class="chip chip--streak" style="margin-block-start:var(--space-12)">
                ${icon('flame')}<span>${gildText(gild)}</span>
              </span>` : ''}
            </div>
          </section>

          <section class="card" aria-labelledby="hist-h">
            <div class="section-head">
              <h2 id="hist-h" class="t-h3">The last four weeks</h2>
              ${todayLine}
            </div>
            <div class="hd-cal" style="margin-block-start:var(--space-16)">
              ${historyGrid(h)}
              ${legend()}
            </div>
            ${ahead ? html`
              <p class="t-body-sm t-gold" style="margin-block-start:var(--space-16)">
                One more and this one reaches ${ahead} days.
              </p>` : ''}
          </section>

          <section class="card card--roomy" aria-labelledby="made-h">
            <h2 id="made-h" class="t-h3" style="margin-block-end:var(--space-16)">
              ${editing ? 'Edit this habit' : 'How it is made'}
            </h2>
            ${editing ? editForm(h) : fields(h)}
          </section>
        </div>

        <aside class="hd-col" aria-label="The record">
          <section class="card" aria-labelledby="rec-h">
            <h2 id="rec-h" class="t-label t-muted">The record</h2>
            <div style="margin-block-start:var(--space-12)">
              <div class="stat-tile">
                <span class="stat-tile__value">${best}</span>
                <span class="stat-tile__label">best run, in ${h.days.length === 7 ? 'days' : 'scheduled days'}</span>
              </div>
              <div class="stat-tile" style="margin-block-start:var(--space-16)">
                <span class="stat-tile__value">${h.history.length}</span>
                <span class="stat-tile__label">times kept, all told</span>
              </div>
              ${since ? html`
                <div class="stat-tile" style="margin-block-start:var(--space-16)">
                  <span class="stat-tile__value">${since.getDate()} ${MONTH[since.getMonth()].slice(0, 3)}</span>
                  <span class="stat-tile__label">first kept, ${since.getFullYear()}</span>
                </div>` : ''}
            </div>
          </section>

          <section class="card" aria-labelledby="sched-h">
            <h2 id="sched-h" class="t-label t-muted">Schedule</h2>
            <p class="t-body" style="margin-block-start:var(--space-4)">${scheduleText(h)}</p>
            <p class="t-body-sm t-muted">
              ${h.time ? 'Around ' + h.time : 'No reminder set'}
            </p>
          </section>

          <section class="card" aria-labelledby="recent-h">
            <h2 id="recent-h" class="t-label t-muted">Recent check-ins</h2>
            ${recent.length ? html`
              <ul class="hd-recent">
                ${recent.map((d) => html`
                  <li class="hd-recent__row">
                    ${icon('check', 'icon--sm')}
                    <span>${longDate(new Date(d + 'T00:00:00'))}</span>
                  </li>`)}
              </ul>` : html`
              <p class="t-body-sm t-muted" style="margin-block-start:var(--space-8)">
                Nothing yet. The first one is the only hard one.
              </p>`}
          </section>
        </aside>
      </div>
    </div>`);
}

/* --------------------------------------------------------------------------
   MOUNT
-------------------------------------------------------------------------- */

export function mount(root, params) {
  const id = params.id;

  /* Bound ONCE per root element. `router.refresh()` — which Edit and Cancel
     both trigger — calls mount() again on the same element, so an unguarded
     `on(root, …)` would stack a second copy of every handler. That is not
     theoretical: it made the day buttons toggle twice per click and therefore
     never change at all. Guarded the way prototype.js guards its own bindings,
     so the fix survives however many times the view re-renders. */
  if (!root.__hcDetailBound) {
    root.__hcDetailBound = true;

    on(root, 'click', '[data-hd-edit]', () => {
      editingId = id;
      router.refresh();
    });

    on(root, 'click', '[data-hd-cancel]', () => {
      editingId = null;
      router.refresh();
    });

    /* Day buttons are plain aria-pressed buttons, so keyboard support is free. */
    on(root, 'click', '[data-hd-day]', (e, btn) => {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true'));
    });

    /* Archiving takes it off Today. Nothing is deleted — the record is still
       reachable at this route, and Restore puts it back. [D §7: no streak-guilt] */
    on(root, 'click', '[data-hd-archive]', () => {
      const h = store.habitById(id);
      store.archiveHabit(id);
      if (window.HC && h) window.HC.announce(h.behavior + ' archived. It is off Today.');
      router.go('/home');
    });

    on(root, 'click', '[data-hd-restore]', () => {
      store.restoreHabit(id);
    });
  }

  /* The edit form is replaced by innerHTML on every render, so its submit is
     re-attached each mount rather than guarded. */
  const form = root.querySelector('[data-hd-form]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const h = store.habitById(id);
      if (!h) return;

      const val = (name) => {
        const el = form.querySelector('[data-hd-field="' + name + '"]');
        return el ? el.value.trim() : '';
      };
      h.behavior = val('behavior') || h.behavior;   /* prototype scope: no validation */
      h.prompt = val('prompt');
      h.celebration = val('celebration') || 'Nice.';
      h.why = val('why');
      h.days = Array.from(form.querySelectorAll('[data-hd-day]'))
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => Number(b.getAttribute('data-hd-day')));
      if (!h.days.length) h.days = [0, 1, 2, 3, 4, 5, 6];
      const t = form.querySelector('[data-hd-time]');
      h.time = t ? t.value : h.time;

      editingId = null;
      /* The commit. See the header note on why this call and not a refresh:
         changing the schedule changes the streak, and only commit() clears the
         selector memo. */
      store.restoreHabit(id);
      if (window.HC) window.HC.announce('Saved. ' + h.behavior + '.');
    });
  }

  /* Leave the edit state behind on a real exit. By the time destroy() runs on a
     navigation the hash has already moved on; on a re-render it has not. */
  return function destroy() {
    if (!String(window.location.hash).startsWith('#/habit/')) editingId = null;
  };
}
