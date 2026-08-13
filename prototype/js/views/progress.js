/* ============================================================================
   HabitCrafts — views/progress.js
   THE LEDGER. This is the screen that proves the state is real.

   Every number, every cell, every dot on this page is DERIVED from the habits'
   `history` arrays at render time. Nothing here is written down twice: check a
   habit in on Home, come back, and the hero numeral, the calendar, the ledger
   tiles and the per-habit strips have all moved, because they are all reading
   the same array that check-in appended to.

   That is also why this view does NOT set `meta.ownsCheckIn`. It renders no
   check-in rings, it would not be damaged by a re-render, and it genuinely
   wants one the moment anything is checked in anywhere. [README §12.4]

   ------------------------------------------------------------------------
   THE RULES THIS SCREEN IS BUILT AROUND
   ------------------------------------------------------------------------
   · Three redundant states on every calendar cell — fill, glyph and a per-cell
     label. Never colour alone; the encoding survives greyscale. [D §3.2]
   · Missed days are simply EMPTY. No red, no broken chain, no "don't lose your
     streak" copy, anywhere on this screen. [D §6 veto list]
   · Weekly framing over daily perfection: the summaries count weeks, not
     percentages of days.
   · The chart's two series are separated by line style and marker shape as well
     as by colour, and are direct-labelled rather than needing a legend.
   · Streak repair speaks in the past tense — "you showed up for N days
     straight", never "you lost".
   ========================================================================= */

import * as store from '../store.js';
import { iso, today, daysAgo, WEEKDAY, MONTH, MILESTONES } from '../data.js';
import { html, icon, cls, plural, on } from '../ui.js';

export const meta = {
  title: 'Progress',
  nav: 'progress',
  level: 0,
  /* ownsCheckIn stays false on purpose — see the header note. */
};

/* Which segment is showing. View-local UI state, not store state: the store has
   no opinion about tab selection, and a mutation made from this screen (marking
   yesterday done) re-renders it, which would otherwise throw the reader back to
   Summary mid-task. Read by render(), written by mount(). */
let panel = 'summary';

/* --------------------------------------------------------------------------
   DERIVATIONS
   All pure functions of the store. Each one is called at most once per render.
-------------------------------------------------------------------------- */

/** Monday-start week containing `d`. The calendar and the chart both use it. */
function weekStart(d) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** "13 August" — used in labels and axis ticks. */
function dayMonth(d) { return d.getDate() + ' ' + MONTH[d.getMonth()]; }
function shortDayMonth(d) { return d.getDate() + ' ' + MONTH[d.getMonth()].slice(0, 3); }

/**
 * Every day on which some habit's run reached 7, 30, 100 or 365 — the gold
 * corner ticks in the calendar. [D §3.2]
 *
 * Derived by replaying each habit's own schedule forwards over its history and
 * watching the run counter cross a milestone. It is the same walk bestStreakOf
 * does, so a tick can never disagree with the mark on the card.
 */
function milestoneDays() {
  const map = new Map();
  store.state.habits.forEach((h) => {
    if (!h.history.length) return;
    const set = new Set(h.history);
    const first = h.history.slice().sort()[0];
    const end = today();
    let d = new Date(first + 'T00:00:00');
    let run = 0;
    while (d <= end) {
      if (h.days.includes(d.getDay())) {
        if (set.has(iso(d))) {
          run++;
          if (MILESTONES.includes(run)) {
            const k = iso(d);
            if (!map.has(k)) map.set(k, []);
            map.get(k).push({ name: h.behavior, tier: run });
          }
        } else {
          run = 0;
        }
      }
      d = addDays(d, 1);
    }
  });
  return map;
}

/** Consecutive whole weeks, most recent first, with `min` or more days on which
    you showed up at all. The weekly framing the direction asks for. [D §3.2] */
function weeksInARow(min) {
  let mon = addDays(weekStart(today()), -7); /* start at the last WHOLE week */
  let n = 0;
  for (let guard = 0; guard < 260; guard++) {
    let showed = 0;
    for (let k = 0; k < 7; k++) {
      if (store.dayState(addDays(mon, k)).state !== 'none') showed++;
    }
    if (showed < min) break;
    n++;
    mon = addDays(mon, -7);
  }
  return n;
}

/** Kept / scheduled over the last `n` days, as a percentage. */
function keptRate(n) {
  let due = 0, done = 0;
  for (let i = n; i >= 1; i--) {
    const d = daysAgo(i);
    store.activeHabits().forEach((h) => {
      if (!store.isScheduled(h, d)) return;
      due++;
      if (store.isDoneOn(h, d)) done++;
    });
  }
  return due ? Math.round((done / due) * 100) : 0;
}

/** Every check-in ever recorded, and the month it started in. */
function ledgerTotals() {
  let count = 0;
  let first = null;
  store.state.habits.forEach((h) => {
    count += h.history.length;
    h.history.forEach((k) => { if (!first || k < first) first = k; });
  });
  const since = first ? new Date(first + 'T00:00:00') : null;
  return { count, since: since ? MONTH[since.getMonth()] + ' ' + since.getFullYear() : null };
}

/** Eight WHOLE weeks, oldest first — the chart's series. The current week is
    left out on purpose: a week that is two days old always plots as a cliff,
    and a chart that dips every Monday is lying about the trend. */
function chartWeeks(n) {
  const thisMon = weekStart(today());
  const out = [];
  for (let i = n; i >= 1; i--) {
    const mon = addDays(thisMon, -i * 7);
    let showed = 0, kept = 0;
    for (let k = 0; k < 7; k++) {
      const s = store.dayState(addDays(mon, k));
      if (s.state !== 'none') showed++;
      if (s.state === 'done') kept++;
    }
    out.push({ mon, showed, kept });
  }
  return out;
}

/* --------------------------------------------------------------------------
   PIECES
-------------------------------------------------------------------------- */

/**
 * One dot in a micro-strip. Five states, each with a shape difference as well
 * as a fill difference, and the whole strip carries one written-out label — the
 * dots are never the only copy of the information. [D §3.2]
 */
function dotFor(state) {
  return state === 'done' ? 'prog-dot--kept'
    : state === 'partial' ? 'prog-dot--partial'
    : state === 'open' ? 'prog-dot--open'
    : state === 'future' ? 'prog-dot--upcoming'
    : state === 'off' ? 'prog-dot--upcoming'
    : 'prog-dot--missed';
}

const DOT_WORD = {
  done: 'kept in full', partial: 'kept in part', open: 'still open today',
  future: 'still to come', off: 'not scheduled', missed: 'nothing recorded',
};

function dotStrip(cells, extraClass) {
  const label = cells.map((c) => WEEKDAY[c.date.getDay()] + ' ' + DOT_WORD[c.state]).join(', ') + '.';
  return html`
    <span class="${cls('prog-dots', extraClass)}" role="img" aria-label="${label}">
      ${cells.map((c) => html`<span class="${cls('prog-dot', dotFor(c.state))}"></span>`)}
    </span>`;
}

/** This week, Monday to Sunday, on the hero. */
function heroWeek() {
  const t = today();
  const mon = weekStart(t);
  return [0, 1, 2, 3, 4, 5, 6].map((k) => {
    const d = addDays(mon, k);
    if (d > t) return { date: d, state: 'future' };
    const s = store.dayState(d);
    if (s.total === 0) return { date: d, state: 'off' };
    if (s.state === 'done') return { date: d, state: 'done' };
    if (s.state === 'partial') return { date: d, state: 'partial' };
    return { date: d, state: iso(d) === iso(t) ? 'open' : 'missed' };
  });
}

/** The last seven days for ONE habit, against that habit's own schedule — so a
    weekend-only habit shows five "not scheduled" dots rather than five misses. */
function habitWeek(h) {
  const t = today();
  return store.recentDays(7).map((d) => {
    if (!store.isScheduled(h, d.date)) return { date: d.date, state: 'off' };
    if (store.isDoneOn(h, d.date)) return { date: d.date, state: 'done' };
    return { date: d.date, state: iso(d.date) === iso(t) ? 'open' : 'missed' };
  });
}

/* --- The calendar ---------------------------------------------------------
   The signature artifact. Three redundant states per cell, a per-cell label,
   the gold corner tick on milestone days, and days you missed simply left
   empty. The month stepper is prototype.js's [data-cal] contract: months are
   newest FIRST in the DOM so step -1 walks backwards in time. [README §4]
------------------------------------------------------------------------- */

function monthGrid(year, month, marks) {
  const t = today();
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;              /* Monday-start */
  const days = new Date(year, month + 1, 0).getDate();
  const trail = (7 - ((lead + days) % 7)) % 7;

  let doneDays = 0, anyDays = 0, elapsed = 0;
  const cells = [];

  for (let i = 0; i < lead; i++) {
    cells.push(html`<div class="prog-cal__blank" aria-hidden="true"></div>`);
  }

  for (let n = 1; n <= days; n++) {
    const d = new Date(year, month, n);
    d.setHours(0, 0, 0, 0);
    const label = WEEKDAY[d.getDay()] + ' ' + dayMonth(d);

    if (d > t) {
      cells.push(html`<div class="cal-cell prog-cal__cell--future" role="img"
                           aria-label="${label + ', not here yet'}"></div>`);
      continue;
    }

    elapsed++;
    const s = store.dayState(d);
    if (s.state === 'done') { doneDays++; anyDays++; }
    else if (s.state === 'partial') anyDays++;

    const mile = marks.get(iso(d));
    const isToday = iso(d) === iso(t);

    /* Three states, and the glyph is the part that survives greyscale. */
    const word = s.state === 'done' ? 'every habit kept'
      : s.state === 'partial' ? s.done + ' of ' + s.total + ' habits kept'
      : isToday ? 'today, nothing yet'
      : 'nothing recorded';

    const mileWord = mile
      ? ', milestone: ' + mile.map((m) => m.name + ' reached ' + m.tier + ' days').join(' and ')
      : '';

    cells.push(html`
      <div class="${cls('cal-cell',
                        s.state === 'done' && 'cal-cell--done',
                        s.state === 'partial' && 'cal-cell--partial',
                        mile && 'cal-cell--milestone',
                        isToday && 'prog-cal__cell--today')}"
           role="img" aria-label="${label + ', ' + word + mileWord}">
        ${s.state !== 'none' ? html`<span class="cal-cell__glyph"></span>` : ''}
      </div>`);
  }

  for (let i = 0; i < trail; i++) {
    cells.push(html`<div class="prog-cal__blank" aria-hidden="true"></div>`);
  }

  const name = MONTH[month] + ' ' + year;
  const summary = elapsed === 0
    ? 'Nothing here yet.'
    : plural(elapsed, 'day') + ' so far, ' + anyDays + ' with a check-in — ' +
      doneDays + ' of them you kept everything.' +
      (year === t.getFullYear() && month === t.getMonth() ? ' Today is still open.' : '');

  return { name, key: year + '-' + String(month + 1).padStart(2, '0'), cells, summary };
}

function calendar(marks) {
  const t = today();
  /* Newest first — the stepper contract. Two months is enough depth to prove
     the encoding without turning the card into a year planner. */
  const months = [
    monthGrid(t.getFullYear(), t.getMonth(), marks),
    monthGrid(new Date(t.getFullYear(), t.getMonth() - 1, 1).getFullYear(),
              new Date(t.getFullYear(), t.getMonth() - 1, 1).getMonth(), marks),
  ];

  return html`
    <section class="card card--roomy prog-item--cal" aria-labelledby="cal-h" data-cal>
      <h2 id="cal-h" class="t-label t-muted">Your days</h2>

      <div class="prog-cal__head" style="margin-block-start:var(--space-8)">
        <button class="icon-btn" type="button" data-cal-step="-1" aria-label="Show the previous month">
          ${icon('chev-left')}
        </button>
        <p class="t-h3 prog-cal__month-name" data-cal-label>${months[0].name}</p>
        <button class="icon-btn" type="button" data-cal-step="1" aria-label="Show the next month">
          ${icon('chev-right')}
        </button>
      </div>

      <div class="prog-cal__dow" aria-hidden="true">
        <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
      </div>

      ${months.map((m, i) => html`
        <div class="prog-cal__month" data-cal-month="${m.key}" data-cal-name="${m.name}" ${i ? 'hidden' : ''}>
          <div class="cal-grid">${m.cells}</div>
          <p class="prog-cal__summary t-body-sm">${m.summary}</p>
        </div>`)}

      <ul class="prog-key">
        <li><span class="prog-key__swatch cal-cell cal-cell--done" aria-hidden="true"><span class="cal-cell__glyph"></span></span> Kept everything</li>
        <li><span class="prog-key__swatch cal-cell cal-cell--partial" aria-hidden="true"><span class="cal-cell__glyph"></span></span> Kept some of it</li>
        <li><span class="prog-key__swatch cal-cell" aria-hidden="true"></span> Nothing yet — days you miss are simply empty</li>
        <li><span class="prog-key__swatch cal-cell prog-cal__cell--future" aria-hidden="true"></span> Still to come</li>
        <li><span class="prog-key__swatch cal-cell cal-cell--done cal-cell--milestone" aria-hidden="true"><span class="cal-cell__glyph"></span></span> A day something was gilded</li>
      </ul>
    </section>`;
}

/* --- The consistency plot -------------------------------------------------
   Hand-built SVG: no chart library, no canvas, nothing remote. The plot box is
   a 0–100 viewBox stretched to the card; everything that must not distort —
   markers, axis text, the two series labels — is real HTML positioned by
   percentage over the same box.
------------------------------------------------------------------------- */

const Y_TOP = 4, Y_BASE = 96;
const yFor = (v) => Y_TOP + ((7 - v) * (Y_BASE - Y_TOP)) / 7;

function chart() {
  const weeks = chartWeeks(8);
  const xFor = (i) => (i * 100) / (weeks.length - 1);

  const ptsA = weeks.map((w, i) => ({ x: xFor(i), y: yFor(w.showed) }));
  const ptsB = weeks.map((w, i) => ({ x: xFor(i), y: yFor(w.kept) }));
  const line = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(3) + ' ' + p.y.toFixed(3)).join('');
  const area = line(ptsB) + 'L100 ' + Y_BASE + 'L0 ' + Y_BASE + 'Z';

  /* Direct labels sit at the end of their own line from 840 up. Nudge them
     apart if the two series finish on top of each other. */
  let labelA = ptsA[ptsA.length - 1].y;
  let labelB = ptsB[ptsB.length - 1].y;
  if (Math.abs(labelA - labelB) < 14) {
    if (labelA <= labelB) { labelA = Math.max(2, labelA - 7); labelB = Math.min(97, labelB + 7); }
    else { labelB = Math.max(2, labelB - 7); labelA = Math.min(97, labelA + 7); }
  }

  const last = weeks[weeks.length - 1];
  const ticks = [0, 2, 5, 7];

  return html`
    <section class="card card--roomy prog-item--chart" aria-labelledby="chart-h">
      <h2 id="chart-h" class="t-label t-muted">Consistency, the last eight weeks</h2>

      <figure class="prog-chart" role="group" aria-labelledby="chart-h" aria-describedby="chart-desc">

        <!-- Direct labels, not a legend: each series names itself at its own
             end. Shape and dash carry the difference too. [D §3.2] -->
        <ul class="prog-chart__key">
          <li style="--y:${labelA.toFixed(3)}%">
            <span class="prog-chart__swatch" aria-hidden="true"></span>
            <span><b>Showed up</b><small>${last.showed} of 7 last week</small></span>
          </li>
          <li style="--y:${labelB.toFixed(3)}%">
            <span class="prog-chart__swatch prog-chart__swatch--b" aria-hidden="true"></span>
            <span><b>Kept everything</b><small>${last.kept} of 7 last week</small></span>
          </li>
        </ul>

        <div class="prog-chart__yaxis" aria-hidden="true">
          ${[7, 6, 4, 2, 0].map((v) => html`<span style="--y:${yFor(v).toFixed(3)}%">${v}</span>`)}
        </div>

        <div class="prog-chart__plot">
          <svg class="prog-chart__svg" viewBox="0 0 100 100" preserveAspectRatio="none"
               aria-hidden="true" focusable="false">
            <g class="prog-chart__rule" vector-effect="non-scaling-stroke">
              ${[7, 6, 5, 4, 3, 2, 1].map((v) => html`<path d="M0 ${yFor(v).toFixed(3)}H100" vector-effect="non-scaling-stroke"/>`)}
            </g>
            <path class="prog-chart__base" d="M0 ${Y_BASE}H100" vector-effect="non-scaling-stroke"/>
            <path class="prog-chart__area" d="${area}"/>
            <path class="prog-chart__line--a" d="${line(ptsA)}" vector-effect="non-scaling-stroke"/>
            <path class="prog-chart__line--b" d="${line(ptsB)}" vector-effect="non-scaling-stroke"/>
          </svg>

          ${ptsA.map((p) => html`<span class="prog-chart__mark" style="--x:${p.x.toFixed(3)}%;--y:${p.y.toFixed(3)}%" aria-hidden="true"></span>`)}
          ${ptsB.map((p) => html`<span class="prog-chart__mark prog-chart__mark--b" style="--x:${p.x.toFixed(3)}%;--y:${p.y.toFixed(3)}%" aria-hidden="true"></span>`)}
        </div>

        <!-- Four ticks, not eight: eight collide at every width, and the answer
             to a crowded axis here is never smaller type. Each carries its
             month so no label is an orphan number. -->
        <div class="prog-chart__xaxis" aria-hidden="true">
          ${ticks.map((i) => html`<span style="--x:${xFor(i).toFixed(3)}%">${shortDayMonth(weeks[i].mon)}</span>`)}
        </div>
      </figure>

      <!-- The same numbers, in text. A chart is never the only copy of its own
           data on this screen. -->
      <ul class="visually-hidden" id="chart-desc">
        ${weeks.map((w) => html`<li>Week of ${dayMonth(w.mon)}: showed up ${w.showed} days of 7, kept everything on ${w.kept}.</li>`)}
      </ul>

      <p class="prog-chart__caption t-body-sm">
        Days per week, out of seven. Whole weeks only — this week is still being written.
      </p>
    </section>`;
}

/* --- Streak repair --------------------------------------------------------
   The veto list bans broken-chain icons, red missed days and "don't lose your
   streak" copy, so this is what stands in their place: three real mechanics,
   stated in the past tense, in the product's own voice. [D §6]

   The grace row is genuinely live — if a habit was scheduled yesterday and is
   still unmarked, the button marks it, the history gains a day, and every
   number on this screen moves. Freeze and decay are mechanic demonstrations:
   the data model stores no freeze ledger, and it says so rather than inventing
   one.
------------------------------------------------------------------------- */

function repair(streak) {
  const y = daysAgo(1);
  const open = store.activeHabits().filter((h) => store.isScheduled(h, y) && !store.isDoneOn(h, y));
  const yName = WEEKDAY[y.getDay()];
  const decayed = Math.max(1, streak - 7);
  const pct = streak ? Math.round((decayed / streak) * 100) : 100;

  return html`
    <section class="card card--roomy prog-item--repair" aria-labelledby="repair-h" data-repair>
      <div class="section-head">
        <h2 id="repair-h" class="t-label t-muted">When you miss a day</h2>
        <p class="t-body-sm t-muted">
          You showed up for ${plural(streak, 'day')} straight. That is the part that counts.
        </p>
      </div>

      <div class="repair" style="margin-block-start:var(--space-16)">

        <!-- FREEZE — a day you had banked and spent. Past tense, sage. -->
        <div class="repair__row repair__row--freeze">
          <span class="repair__mark" aria-hidden="true">${icon('shield')}</span>
          <div class="repair__body">
            <p class="repair__title">A freeze covers a day you were away</p>
            <p class="repair__text">
              You bank one every fortnight. Spending one holds the run where it
              is; the days you did are yours either way.
            </p>
            <p class="repair__tokens" role="img" aria-label="One freeze day left of two">
              <span class="repair__token"></span>
              <span class="repair__token repair__token--spent"></span>
            </p>
          </div>
        </div>

        <!-- GRACE — yesterday can still be filled in. Amber is care, not alarm.
             No countdown, no timer, no red. This one is wired to the store. -->
        <div class="repair__row repair__row--grace">
          <span class="repair__mark" aria-hidden="true">${icon('clock')}</span>
          <div class="repair__body">
            ${open.length ? html`
              <p class="repair__title">${yName} is still open</p>
              <p class="repair__text">
                You have until tonight to mark ${yName} if you did
                ${open.length === 1 ? open[0].behavior.toLowerCase() : plural(open.length, 'habit')}
                and forgot to say so.
              </p>
              <p class="u-flow u-wrap" style="margin-block-start:var(--space-8)">
                ${open.map((h) => html`
                  <button class="btn btn--secondary btn--sm" type="button" data-grace="${h.id}">
                    Mark ${h.behavior} done
                  </button>`)}
              </p>`
            : html`
              <p class="repair__title">Nothing is waiting from ${yName}</p>
              <p class="repair__text">
                Everything scheduled for ${yName} is marked. If a day ever slips,
                you have until the following night to fill it in.
              </p>`}
          </div>
        </div>

        <!-- DECAY — the streak eases down rather than resetting. The demo button
             moves the bar so the mechanic is visible, not described. -->
        <div class="repair__row repair__row--decay">
          <span class="repair__mark" aria-hidden="true">${icon('leaf')}</span>
          <div class="repair__body">
            <p class="repair__title">A gap softens a streak, it does not end it</p>
            <p class="repair__text" data-repair-readout
               data-full="You showed up for ${plural(streak, 'day')} straight."
               data-decayed="You showed up for ${plural(streak, 'day')} straight. After a week away it reads ${decayed} — the days you did are still yours.">
              You showed up for ${plural(streak, 'day')} straight.
            </p>

            <div class="repair__decay">
              <div class="repair__track" role="img"
                   aria-label="Streak length: ${plural(streak, 'day')}, easing to ${decayed} after a week away">
                <span class="repair__was" style="inline-size:100%"></span>
                <span class="repair__now" data-repair-now
                      data-full="100%" data-decayed="${pct}%" style="inline-size:100%"></span>
              </div>
              <p class="repair__scale"><span>0</span><span>${plural(streak, 'day')}</span></p>
            </div>

            <p style="margin-block-start:var(--space-12)">
              <button class="btn btn--ghost btn--sm" type="button"
                      data-repair-run aria-pressed="false">Show a week away</button>
            </p>
          </div>
        </div>
      </div>
    </section>`;
}

/* --- Per-habit rows -------------------------------------------------------
   Literally the kit's habit cards — same 72px pitch, same title, same 13px meta
   line, same permanent gild marks — with the check-in ring swapped for the
   micro-strip. They carry NO `data-habit`, so nothing on any screen counts them
   as today's work and no ring needs restoring. [README §12.4]
------------------------------------------------------------------------- */

function habitRow(h) {
  const gild = store.gildOf(h);
  const streak = store.streakOf(h);
  const week = habitWeek(h);
  /* Count only days that have finished. An open today is not a missed day —
     that is the same rule streakOf() uses, and the copy has to agree with it. */
  const closed = week.filter((c) => c.state === 'done' || c.state === 'missed');
  const kept = closed.filter((c) => c.state === 'done').length;
  const openToday = week.some((c) => c.state === 'open');

  const seal = gild >= 100
    ? html`<span class="${cls('seal', gild >= 365 && 'seal--solid')}" role="img"
                 aria-label="${gild}-day seal${gild >= 365 ? ', solid gold' : ''}">
             <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-rosette"></use></svg>
           </span>`
    : '';

  const title = seal
    ? html`<div class="u-flow-tight"><h3 class="habit-card__title">${h.behavior}</h3>${seal}</div>`
    : html`<h3 class="habit-card__title">${h.behavior}</h3>`;

  /* Past tense, and it counts what you kept rather than what you missed. */
  const count = closed.length
    ? 'kept ' + (kept === closed.length ? 'all ' : '') + kept + ' of the last ' + closed.length +
      (h.days.length === 7 ? ' days' : ' scheduled days') + (openToday ? ', today still open' : '')
    : openToday ? 'today is the first one' : 'nothing scheduled this week';
  const line = [h.prompt, count].filter(Boolean).join(' · ');

  return html`
    <li>
      <article class="${cls('card', 'habit-card', gild && 'habit-card--gild-' + gild, 'prog-row')}">
        <div class="habit-card__body">
          ${title}
          <p class="habit-card__meta">${line}</p>
        </div>
        <div class="prog-row__strip">
          ${dotStrip(week)}
          ${streak > 0 ? html`
            <span class="chip chip--streak">
              ${icon('flame')}<span>${plural(streak, 'day')}</span>
            </span>` : html`<span class="t-body-sm t-muted">Starts today</span>`}
        </div>
      </article>
    </li>`;
}

/* The one empty state on this screen. You cannot have a record of days you have
   not lived yet, so the copy does not apologise and does not ask for anything
   beyond the one thing that fills the page in. [M6] */
function emptyState() {
  return html`
    <div class="empty-state">
      <svg class="illus" viewBox="0 0 120 120" role="img"
           aria-label="A blank ruled ledger page with a single leaf marking it">
        <ellipse class="illus__ground" cx="60" cy="104" rx="32" ry="7"/>
        <path class="illus__shape" d="M30 20h60v76H30z"/>
        <path class="illus__line" d="M40 40h40M40 54h40M40 68h26"/>
        <g class="illus__drift">
          <path class="illus__accent" d="M86 34c11-2 17-9 18-20-11 0-19 7-18 20z"/>
        </g>
      </svg>
      <p class="empty-state__title">Nothing to show yet</p>
      <p class="empty-state__body t-body">
        This page fills itself in as you go. Check something off and the first
        line appears today.
      </p>
      <a class="btn btn--primary" href="#/home">Go to today's habits</a>
    </div>`;
}

/* --------------------------------------------------------------------------
   RENDER
-------------------------------------------------------------------------- */

export function render() {
  const habits = store.activeHabits();
  const streak = store.overallStreak();
  const totals = ledgerTotals();
  const hasRecord = totals.count > 0;

  const marks = milestoneDays();
  const week = heroWeek();
  const keptThisWeek = week.filter((c) => c.state === 'done').length;
  const shownThisWeek = week.filter((c) => c.state === 'done' || c.state === 'partial').length;
  const elapsed = week.filter((c) => c.state !== 'future').length;

  const runWeeks = weeksInARow(4);
  const rate = keptRate(30);

  /* Habits that have graduated — best streak at 100 or more. The Lifestyle
     panel's whole content, derived rather than listed. */
  const graduated = store.state.habits
    .filter((h) => store.bestStreakOf(h) >= 100)
    .sort((a, b) => store.bestStreakOf(b) - store.bestStreakOf(a));

  return String(html`
    <div class="page">

      <!-- PAGE HEAD. h1 in Fraunces — a daily voice, not an event voice.
           The app's Material TabBar becomes the kit's segmented control; the
           Summary / Lifestyle split itself stays, because it is real IA.
           [data-tabs] is prototype.js's full ARIA tabs pattern: click, arrows,
           Home, End, roving tabindex, panel fade. [README §4] -->
      <header class="prog-head">
        <div>
          <h1 class="t-h1 prog-head__title">Progress</h1>
          <p class="t-body-sm t-muted">A record of what you have actually kept.</p>
        </div>

        <div class="segmented" role="tablist" aria-label="Progress views" data-tabs>
          <button class="seg-btn" type="button" role="tab" id="tab-prog-summary"
                  aria-selected="${panel === 'summary' ? 'true' : 'false'}"
                  tabindex="${panel === 'summary' ? '0' : '-1'}"
                  aria-controls="panel-prog-summary" data-tab="prog-summary">Summary</button>
          <button class="seg-btn" type="button" role="tab" id="tab-prog-lifestyle"
                  aria-selected="${panel === 'lifestyle' ? 'true' : 'false'}"
                  tabindex="${panel === 'lifestyle' ? '0' : '-1'}"
                  aria-controls="panel-prog-lifestyle" data-tab="prog-lifestyle">Lifestyle</button>
        </div>
      </header>

      <!-- ==================================================================
           SUMMARY. Stat tiles row 1, calendar + chart row 2, per-habit list
           row 3. On a phone it is one column in that order. [B §6.3]
           =============================================================== -->
      <div class="prog-panel" id="panel-prog-summary" role="tabpanel"
           aria-labelledby="tab-prog-summary" data-tabpanel="prog-summary" tabindex="0"
           ${panel === 'summary' ? '' : 'hidden'}>

        ${!hasRecord ? emptyState() : html`
          <div class="grid12">

            <!-- THE ONE DEEP-BLUE SURFACE ON THIS SCREEN. Streak as a 48px
                 Fraunces numeral, "day streak", this week's consistency, and
                 the gold flame chip. After 20:00 it takes the two-stop gradient
                 under the grain automatically. [D §2.5]
                 The week strip repeats the numbers in words, so the dots are
                 never the only carrier of the information. -->
            <section class="hero hero--streak prog-hero prog-item--hero" aria-labelledby="streak-h">
              <div>
                <p class="hero__numeral">${streak}</p>
                <h2 id="streak-h" class="hero__label t-label">day streak</h2>
                <p class="hero__body t-body-sm" style="margin-block-start:var(--space-8)">
                  ${streak >= 7
                    ? plural(Math.floor(streak / 7), 'week') + ' with at least one check-in every single day.'
                    : 'Every day so far this week has something on it.'}
                </p>
                ${runWeeks >= 4 ? html`
                  <span class="chip chip--streak" style="margin-block-start:var(--space-12)">
                    ${icon('flame')}<span>${plural(runWeeks, 'week')} running</span>
                  </span>` : ''}
              </div>

              <div class="prog-hero__week">
                <p class="hero__label t-caption">This week</p>
                ${dotStrip(week, 'prog-dots--on-hero')}
                <p class="hero__body t-body-sm">
                  ${plural(elapsed, 'day')} in, ${keptThisWeek} kept in full${shownThisWeek > keptThisWeek
                    ? ' and ' + (shownThisWeek - keptThisWeek) + ' in part' : ''}.
                </p>
              </div>
            </section>

            <!-- THE LEDGER — three stat tiles, ruled by the same hairline as
                 the rest of the screen at lg+. No boxes inside boxes. -->
            <section class="card card--roomy prog-item--ledger" aria-labelledby="ledger-h">
              <h2 id="ledger-h" class="t-label t-muted">The ledger</h2>
              <div class="prog-ledger">
                <div class="stat-tile">
                  <span class="stat-tile__value">${plural(runWeeks, 'week')}</span>
                  <span class="stat-tile__label">in a row with four or more days you showed up</span>
                </div>
                <div class="stat-tile">
                  <span class="stat-tile__value">${rate}%</span>
                  <span class="stat-tile__label">of your scheduled check-ins kept over the last 30 days</span>
                </div>
                <div class="stat-tile">
                  <span class="stat-tile__value">${totals.count.toLocaleString('en-GB')}</span>
                  <span class="stat-tile__label">check-ins${totals.since ? ' since you started in ' + totals.since : ''}</span>
                </div>
              </div>
            </section>

            ${repair(streak)}
            ${calendar(marks)}
            ${chart()}

            <section class="prog-item--rows" aria-labelledby="habits-h">
              <div class="section-head">
                <h2 id="habits-h" class="t-h2">Every habit, day by day</h2>
                <p class="t-body-sm t-muted">
                  ${WEEKDAY[daysAgo(6).getDay()]} ${daysAgo(6).getDate()} to today
                </p>
              </div>

              ${habits.length ? html`<ul class="prog-rows">${habits.map(habitRow)}</ul>` : html`
                <div class="empty-state empty-state--compact">
                  <svg class="illus" viewBox="0 0 120 120" role="img" aria-label="A stone resting on its own">
                    <ellipse class="illus__ground" cx="60" cy="86" rx="32" ry="9"/>
                    <path class="illus__shape" d="M38 82c0-14 10-24 22-24s22 10 22 24z"/>
                    <path class="illus__line" d="M34 82h52"/>
                  </svg>
                  <p class="empty-state__title">Every habit is archived</p>
                  <p class="empty-state__body t-body">Restore one from your profile, or craft a new one.</p>
                </div>`}

              <p style="margin-block-start:var(--space-16)">
                <a class="text-link" href="#/home">
                  Back to today's habits ${icon('arrow', 'icon--sm')}
                </a>
              </p>
            </section>
          </div>`}
      </div>

      <!-- ==================================================================
           LIFESTYLE — the habits that graduated. No hero here: one hero-fill
           surface per screen, and Summary already spends it. The "Removed
           Habits" expander is CUT from this scroll; it lives in the Profile
           archive now. [D §3.2]
           =============================================================== -->
      <div class="prog-panel" id="panel-prog-lifestyle" role="tabpanel"
           aria-labelledby="tab-prog-lifestyle" data-tabpanel="prog-lifestyle" tabindex="0"
           ${panel === 'lifestyle' ? '' : 'hidden'}>

        <div class="grid12">
          <section class="span-8" aria-labelledby="life-h">
            <h2 id="life-h" class="t-h2">Part of your life now</h2>
            <p class="t-body t-measure" style="margin-block-start:var(--space-8)">
              These have been kept for a hundred days or more. They are not
              projects any more — they are just things you do.
            </p>

            ${graduated.length ? html`
              <ul class="prog-fulfilled" style="margin-block-start:var(--space-24)">
                ${graduated.map((h) => {
                  const best = store.bestStreakOf(h);
                  const gild = store.gildOf(h);
                  return html`
                    <li>
                      <article class="${cls('card', 'habit-card--gild-' + gild, 'prog-fulfilled__row')}">
                        <span class="${cls('seal', gild >= 365 && 'seal--solid')}" role="img"
                              aria-label="${gild}-day seal">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-rosette"></use></svg>
                        </span>
                        <div class="u-grow">
                          <h3 class="t-h3">${h.behavior}</h3>
                          <p class="t-body-sm t-muted">
                            You showed up for ${plural(best, 'day')}${h.archived ? ' · archived' : ' · still going'}
                          </p>
                        </div>
                      </article>
                    </li>`;
                })}
              </ul>`
            : html`
              <div class="empty-state empty-state--compact" style="margin-block-start:var(--space-24)">
                <svg class="illus" viewBox="0 0 120 120" role="img"
                     aria-label="A stem with one leaf, still growing">
                  <ellipse class="illus__ground" cx="60" cy="99" rx="34" ry="9"/>
                  <path class="illus__line" d="M60 97V46"/>
                  <path class="illus__shape" d="M60 74c-16 0-26-9-27-23 15-2 27 6 27 23z"/>
                </svg>
                <p class="empty-state__title">Nothing has graduated yet</p>
                <p class="empty-state__body t-body">
                  A habit lands here after a hundred days. Yours are still on their way.
                </p>
              </div>`}
          </section>

          <aside class="span-4" aria-labelledby="marks-h">
            <section class="card card--tinted">
              <h2 id="marks-h" class="t-label t-brand">Marks you've earned</h2>
              <p class="t-body-sm" style="margin-block-start:var(--space-8)">
                A gild is cosmetic and permanent. It records what you did, not what you are
                keeping up, so it stays even if a streak ends.
              </p>
              <p class="t-body-sm t-muted" style="margin-block-start:var(--space-12)">
                Seven days, a corner tick. Thirty, a gold rule around the card. A hundred, a
                seal. Three hundred and sixty-five, the seal fills solid.
              </p>
            </section>

            <section class="card" style="margin-block-start:var(--layout-card-gap)">
              <h2 class="t-label t-muted">Habits you removed</h2>
              <p class="t-body-sm" style="margin-block-start:var(--space-8)">
                ${store.archivedHabits().length
                  ? plural(store.archivedHabits().length, 'habit') + ' live in your archive now, with everything they earned intact.'
                  : 'Nothing is archived. When you stop keeping a habit it moves here, with everything it earned intact.'}
              </p>
              <a class="text-link" href="#/profile">
                Open your archive ${icon('arrow', 'icon--sm')}
              </a>
            </section>
          </aside>
        </div>
      </div>
    </div>`);
}

/* --------------------------------------------------------------------------
   MOUNT
   Three delegated listeners. No rings on this screen, so no restoreRings; no
   subscription, because app.js re-renders this view on every store change and
   that is exactly what it wants.
-------------------------------------------------------------------------- */

export function mount(root) {
  /* Remember the segment across the re-render that marking yesterday triggers.
     prototype.js owns the tab behaviour itself — this only records the choice
     so render() can put it back. */
  on(root, 'click', '[data-tab]', (e, el) => {
    panel = el.getAttribute('data-tab') === 'prog-lifestyle' ? 'lifestyle' : 'summary';
  });
  on(root, 'keyup', '[data-tab]', (e, el) => {
    const sel = el.closest('[data-tabs]').querySelector('[aria-selected="true"]');
    if (sel) panel = sel.getAttribute('data-tab') === 'prog-lifestyle' ? 'lifestyle' : 'summary';
  });

  /* The grace window, for real: yesterday gains a check-in, the history grows,
     and every derived number on this page moves on the next render. */
  on(root, 'click', '[data-grace]', (e, el) => {
    const id = el.getAttribute('data-grace');
    const crossed = store.checkIn(id, { date: daysAgo(1) });
    if (window.HC) window.HC.announce('Marked done for yesterday.');
    if (crossed && window.HC) window.HC.fireMilestone({ days: crossed });
  });
}
