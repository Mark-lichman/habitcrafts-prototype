/* ============================================================================
   HabitCrafts — views/library.js
   THE KNOWLEDGE LAYER.

   Home's redesign cut the whole "Daily Lesson / Lessons Week N / View All
   Lessons" stack out of the primary scroll and left it with one dismissible
   tile [D §3.1]. That weight lands here, so the Library has to be worth the
   trip: today's lesson is the screen's ONE hero surface, the week you are in is
   a real meter beside it, and the back catalogue browses rather than scrolls.

   Everything is read out of the store, so `lesson.read` — which flips the
   moment you open a lesson, because library-detail.js calls markLessonRead —
   drives the tick, the week meter and the "lessons read" tile at once. There is
   no second copy of that fact anywhere.

   No `meta.ownsCheckIn`: this view renders no rings. No restoreRings(): it
   renders no habit cards.
   ========================================================================= */

import * as store from '../store.js';
import { allSources, corpusFor, sourceProgress, sinceLabel } from '../study.js';
import { flag } from '../config.js';
import { todaysLessonId } from '../data.js';
import { html, icon, cls, plural, on, raw } from '../ui.js';

export const meta = {
  title: 'Library',
  nav: 'library',
  level: 0,            /* a top-level destination → fade-through */
};

/** Presence-only attributes have to bypass the escaping in `html`. */
function at(cond, attribute) {
  return raw(cond ? attribute : '');
}

/* Which segment is showing. View state, not app state — but `render` runs
   again from scratch on every store change, so it has to live somewhere that
   survives that. prototype.js's initTabs adopts whichever tab the markup marks
   selected, so declaring it here is all it takes. */
const ui = { segment: 'lessons' };

/* --------------------------------------------------------------------------
   SELECTORS OVER THE LESSON LIST
-------------------------------------------------------------------------- */

function lessons() {
  return store.state.lessons;
}

function todaysLesson() {
  return lessons().find((l) => l.id === todaysLessonId) || lessons()[0] || null;
}

/** [{ week, rows }], ordered by week. */
function byWeek() {
  const out = [];
  lessons().forEach((l) => {
    const found = out.find((w) => w.week === l.week);
    if (found) found.rows.push(l);
    else out.push({ week: l.week, rows: [l] });
  });
  return out.sort((a, b) => a.week - b.week);
}

function readIn(rows) {
  return rows.filter((l) => l.read).length;
}

/* A week's theme is not a field on the fixture, and data.js is not this view's
   to change — the shipping app has no such field either, it just orders
   `lessons` by `order`. These are the only invented strings on the screen, and
   a week with no entry simply shows as "Week N", never as a broken separator. */
const WEEK_NAMES = {
  1: 'Behaviour, prompt, celebration',
  2: 'Keeping it going',
};
function weekTitle(week) {
  return WEEK_NAMES[week] ? 'Week ' + week + ' · ' + WEEK_NAMES[week] : 'Week ' + week;
}

/* --------------------------------------------------------------------------
   PIECES
-------------------------------------------------------------------------- */

/** A lesson row. Read state is a tick PLUS a tone step PLUS a word — never
    colour alone. `is-current` marks today's lesson and carries aria-current. */
function lessonRow(l) {
  const current = l.id === todaysLessonId;
  const metaLine = l.read ? 'Read · ' + l.minutes + ' min'
    : current ? "Today's lesson · " + l.minutes + ' min'
      : l.minutes + ' min read';

  return html`
    <li>
      <a class="${cls('card', 'card--interactive', 'lesson-row', l.read && 'is-read', current && 'is-current')}"
         href="#/library/${l.id}" data-lib-name="${l.title}"
         ${at(current, 'aria-current="true"')}>
        <span class="lesson-row__num" aria-hidden="true">
          ${l.read ? icon('check', 'icon--sm') : l.n}
        </span>
        <span class="lesson-row__body">
          <span class="lesson-row__title t-body" style="display:block">${l.title}</span>
          <span class="lesson-row__meta t-body-sm" style="display:block">${metaLine}</span>
        </span>
        ${icon('arrow', 'icon--sm lesson-row__chev')}
      </a>
    </li>`;
}

/** An earlier week. <details>, so the back catalogue browses with zero
    JavaScript and every fold is keyboard-operable by default. */
function weekFold(w) {
  return html`
    <details class="card card--flush week-fold">
      <summary>
        ${icon('arrow', 'icon--sm week-fold__chev')}
        ${weekTitle(w.week)}
        <span class="week-fold__meta">${readIn(w.rows)} of ${w.rows.length} read</span>
      </summary>
      <div class="week-fold__body">
        <ul class="lesson-list">${w.rows.map(lessonRow)}</ul>
      </div>
    </details>`;
}

const RES_ICON = { worksheet: 'worksheet', doc: 'doc', play: 'play' };
const RES_WORD = { worksheet: 'Worksheet', doc: 'Article', play: 'Video' };

function resourceCard(r) {
  return html`
    <li>
      <article class="card res-card">
        <p class="res-card__type">
          ${icon(RES_ICON[r.type] || 'doc', 'icon--sm')}${RES_WORD[r.type] || 'Resource'}
        </p>
        <h3 class="t-h3">${r.title}</h3>
        <p class="res-card__foot t-body-sm t-muted">${r.meta}</p>
      </article>
    </li>`;
}

function segment(id, label, selected) {
  return html`
    <button class="seg-btn" type="button" role="tab" id="tab-${id}" data-tab="${id}"
            ${at(!selected, 'tabindex="-1"')}
            aria-selected="${selected ? 'true' : 'false'}" aria-controls="panel-${id}">${label}</button>`;
}

function emptyLibrary() {
  return html`
    <div class="empty-state">
      <svg class="illus" viewBox="0 0 120 120" role="img" aria-label="An empty shelf">
        <ellipse class="illus__ground" cx="60" cy="98" rx="34" ry="9"/>
        <path class="illus__line" d="M30 54h60"/>
        <rect class="illus__shape" x="36" y="30" width="12" height="22" rx="2"/>
        <rect class="illus__accent" x="52" y="36" width="10" height="16" rx="2"/>
      </svg>
      <p class="empty-state__title">Nothing here yet</p>
      <p class="empty-state__body t-body">The first lesson arrives with your first habit.</p>
      <a class="btn btn--primary" href="#/create">Craft a habit</a>
    </div>`;
}

/* --------------------------------------------------------------------------
   RENDER
-------------------------------------------------------------------------- */

/* --------------------------------------------------------------------------
   PRACTICES — the Bindery band                                          [#5]

   A Practice is the Library with an author on it, so it belongs on the
   Library rather than in a destination of its own. Three configurations use
   this band and each wants a different first verb, which is the one thing
   worth branching on: a creator BINDS a source, a consumer starts from what
   they are reading, and both can join someone else's with a code.
-------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------
   WHAT YOU UPLOADED.

   A source has to be findable months later, by someone who has forgotten the
   flow that made it. A filename does not do that - _みん日_第1課.pdf means
   nothing at a glance unless you already know. So each one is labelled with
   the date it came in, its subject and unit, and what is actually inside it,
   and it carries how much of it you have practised.

   This is the answer to "I do not want to walk the whole flow again to reach
   lesson 3": the lessons are here, permanently, one tap from the shelf.
--------------------------------------------------------------------------- */
function uploadsBand() {
  const sources = allSources();
  if (!sources.length) return '';

  return html`
    <section aria-labelledby="uploads-h" style="margin-block-start:var(--space-32)">
      <h2 id="uploads-h" class="section-head t-label">What you uploaded</h2>

      ${sources.map((src) => {
        const c = corpusFor(src.id);
        const p = sourceProgress(src.id);
        const done = store.isSourceFinished(src.id);
        return html`
          <article class="${cls('card', 'card--roomy', done && 'is-finished')}"
                   style="margin-block-start:var(--space-12)">
            <div class="section-head">
              <div>
                <h3 class="t-h3">${src.subject} · ${src.unit}</h3>
                <p class="t-body-sm t-muted">
                  ${src.filename} · ${src.pages} pages · added ${src.addedAt}
                </p>
              </div>
              <span class="chip">
                ${done ? 'Finished ' + store.finishedAt(src.id)
                       : p.runs ? plural(p.runs, 'run') : 'not started'}
              </span>
            </div>

            <div class="u-row" style="gap:var(--space-8);flex-wrap:wrap;margin-block-start:var(--space-12)">
              ${(src.topics || []).map((t) => html`<span class="chip chip--sm">${t}</span>`)}
            </div>

            <p class="t-body t-muted" style="margin-block-start:var(--space-12)">
              ${p.started} of ${p.of} lessons started${p.lastAt ? ' · last practised ' + sinceLabel(p.lastAt) : ''}
            </p>

            <p class="t-label" style="margin-block-start:var(--space-16)">Lessons</p>
            <ul class="u-stack" style="gap:var(--space-8)">
              ${c.lessons.map((l) => {
                const st = store.lessonStat(l.key);
                return html`
                  <li>
                    <a class="card card--interactive" href="#/learn/${l.key}" style="display:block">
                      <div class="section-head">
                        <span class="t-body"><strong>${l.n}. ${l.title}</strong></span>
                        <span class="t-body-sm t-muted">${l.minutes} min</span>
                      </div>
                      <p class="t-body-sm t-muted">
                        ${st.count
                          ? 'Practised ' + plural(st.count, 'time') + ' · last ' + sinceLabel(st.lastAt)
                          : 'Never practised'}
                      </p>
                    </a>
                  </li>`;
              })}
            </ul>

            <!-- Closing a practice archives the HABITS so the reminders stop,
                 and keeps the lessons and the study log. "I ran this eleven
                 times" is the most valuable thing here; losing it because you
                 tidied up would be the worst possible trade. -->
            <div class="u-row" style="gap:var(--space-12);margin-block-start:var(--space-24)">
              ${done
                ? html`<button class="btn btn--ghost btn--sm" type="button"
                               data-reopen="${src.id}">Put back on the shelf</button>`
                : html`<button class="btn btn--ghost btn--sm" type="button"
                               data-finish="${src.id}">Finish this practice</button>`}
            </div>
            ${done ? html`
              <p class="t-body-sm t-muted" style="margin-block-start:var(--space-8)">
                Reminders stopped. ${p.runs ? plural(p.runs, 'run') + ' kept in your record.' : ''}
              </p>` : ''}
          </article>`;
      })}

      <div class="bind-actions" style="margin-block-start:var(--space-24)">
        <a class="btn btn--primary" href="#/learn">Upload something new</a>
      </div>
    </section>`;
}

function practiceBand() {
  const mine = store.publishedPractices().filter((p) => store.hasJoined(p.id));
  const drafts = store.draftPractices();
  const open = store.publishedPractices().filter((p) => !store.hasJoined(p.id));
  const rows = [].concat(drafts, mine, open).slice(0, 4);

  return html`
    <section class="prac-band" aria-labelledby="prac-band-h"
             style="margin-block-start:var(--space-24)">
      <h2 id="prac-band-h" class="section-head t-label">Practices</h2>

      ${rows.length ? html`
        <ul class="join-open">
          ${rows.map((p) => html`
            <li>
              <a class="card card--interactive join-open__row"
                 href="${p.status === 'draft' ? '#/bindery/' + p.id + '/review' : '#/practice/' + p.id}">
                <span class="t-h3">${p.title}</span>
                <span class="t-body-sm t-muted">
                  ${p.status === 'draft'
                    ? 'Draft · not published'
                    : store.hasJoined(p.id) ? 'Joined · ' + p.author : p.author + ' · code ' + p.code}
                </span>
              </a>
            </li>`)}
        </ul>` : html`
        <p class="t-body t-muted">
          Nothing yet. Turn something you have read into a week of practice.
        </p>`}

      <div class="bind-actions">
        <a class="btn btn--primary" href="#/bindery">
          ${flag('bringYourOwn') ? 'What are you reading?' : 'Bind a source'}
        </a>
        <a class="btn btn--ghost" href="#/join">Join with a code</a>
      </div>
    </section>`;
}

export function render() {
  const all = lessons();
  const hero = todaysLesson();
  const weeks = byWeek();
  const thisWeek = hero ? weeks.find((w) => w.week === hero.week) : null;
  const earlier = weeks.filter((w) => !thisWeek || w.week !== thisWeek.week)
    .sort((a, b) => b.week - a.week);

  const weekRead = thisWeek ? readIn(thisWeek.rows) : 0;
  const weekTotal = thisWeek ? thisWeek.rows.length : 0;
  const pct = weekTotal ? Math.round((weekRead / weekTotal) * 100) : 0;
  const readAll = all.filter((l) => l.read).length;

  /* The last lesson of the previous week — "From last week" in the aside. */
  const prevWeek = thisWeek ? weeks.filter((w) => w.week < thisWeek.week).pop() : null;
  const prevLesson = prevWeek ? prevWeek.rows[prevWeek.rows.length - 1] : null;

  const seg = ui.segment;

  if (!all.length) {
    return String(html`<div class="page">
      <header class="page-head">
        <div class="page-head__text">
          <h1 class="t-h1">Library</h1>
          <p class="page-head__sub t-body-sm">The thinking behind the habits.</p>
        </div>
      </header>
      ${emptyLibrary()}
    </div>`);
  }

  return String(html`
    <div class="page">

      <!-- Below 600 the Library is not in the bottom bar (there is room for
           four destinations plus the FAB and no more), so it gets a back link
           rather than being a dead end. [README §3] -->
      <a class="page-back page-back--compact" href="#/home">
        ${icon('arrow-back', 'icon--sm')} Today
      </a>

      <header class="page-head">
        <div class="page-head__text">
          <h1 class="t-h1">Library</h1>
          <p class="page-head__sub t-body-sm">The thinking behind the habits.</p>
        </div>

        <label class="input-with-icon" style="flex:1 1 240px;max-inline-size:340px">
          <span class="visually-hidden">Search the Library</span>
          ${icon('search', 'icon--sm')}
          <input class="input" type="search" placeholder="Search lessons" data-lib-search>
        </label>
      </header>

      <!-- TODAY'S LESSON — this screen's ONE --c-hero-fill surface. -->
      <section class="hero lib-hero" aria-labelledby="today-lesson-h">
        <div class="lib-hero__body">
          <p class="lib-hero__kicker">Today's lesson</p>
          <h2 id="today-lesson-h" class="lib-hero__title">${hero.title}</h2>
          <p class="hero__body t-body" style="max-inline-size:52ch">${hero.standfirst}</p>
          <div class="lib-hero__actions">
            <a class="btn btn--secondary" href="#/library/${hero.id}">
              ${hero.read ? 'Read it again' : 'Read the lesson'}
            </a>
            <a class="btn btn--ghost" href="#week">See the week</a>
          </div>
        </div>

        <div class="lib-hero__side">
          <!-- A meter, not a second day-arc: the arc means "today" everywhere
               else in this system and has to keep meaning it. -->
          <span class="week-meter">
            <span class="lib-hero__kicker">Week ${hero.week} of ${weeks.length}</span>
            <span class="week-meter__bar" role="img"
                  aria-label="${weekRead} of ${weekTotal} lessons read this week">
              <span class="week-meter__fill" style="inline-size:${pct}%"></span>
            </span>
            <span class="week-meter__label">${weekRead} of ${weekTotal} read${WEEK_NAMES[hero.week] ? ' · ' + WEEK_NAMES[hero.week] : ''}</span>
          </span>
        </div>
      </section>

      <!-- THE KNOWLEDGE LAYER'S FRONT DOOR.
           The Bindery and the practices made with it are reachable from here
           rather than only from a URL, because the Library is where a person
           already goes looking for something to learn from.

           Gated on the capability, never on the experiment id: base config
           sees the Library exactly as it was, and a shipping configuration
           that keeps the Bindery keeps this with no edit. [#5] -->
      ${flag('bindery') ? practiceBand() : ''}
      ${uploadsBand()}

      <div class="segmented" role="tablist" aria-label="Library sections" data-tabs
           style="margin-block:var(--space-24)">
        ${segment('lessons', 'Lessons', seg === 'lessons')}
        ${segment('resources', 'Resources', seg === 'resources')}
      </div>

      <!-- PANEL 1 — LESSONS. Ordered, so the shape is a numbered list and not a
           card grid: the order IS the content. -->
      <div id="panel-lessons" role="tabpanel" tabindex="0" aria-labelledby="tab-lessons"
           data-tabpanel="lessons" ${at(seg !== 'lessons', 'hidden')}>
        <div class="grid12">
          <section class="span-8" aria-labelledby="week-h" id="week">
            <div class="section-head">
              <h2 id="week-h" class="t-h3">${weekTitle(thisWeek.week)}</h2>
              <p class="t-body-sm t-muted">${weekRead} of ${weekTotal} read</p>
            </div>

            <ul class="lesson-list">${thisWeek.rows.map(lessonRow)}</ul>

            ${earlier.length ? html`
              <h3 class="t-label t-muted" style="margin-block:var(--space-32) var(--space-12)">Earlier weeks</h3>
              ${earlier.map(weekFold)}` : ''}

            <div class="empty-state empty-state--compact" data-lib-empty hidden>
              <p class="empty-state__title">No lessons match</p>
              <p class="empty-state__body t-body-sm">Try fewer words. The whole library is still here.</p>
            </div>
          </section>

          <aside class="span-4 u-stack" aria-label="Where you are">
            <section class="card">
              <h2 class="t-label t-muted">Where you are</h2>
              <div class="stat-tile" style="margin-block-start:var(--space-8)">
                <span class="stat-tile__value">${readAll} of ${all.length}</span>
                <span class="stat-tile__label">lessons read</span>
              </div>
              <p class="t-body-sm t-muted" style="margin-block-start:var(--space-12)">
                There is no schedule to fall behind. One a day is plenty.
              </p>
            </section>

            ${prevLesson ? html`
              <section class="card">
                <h2 class="t-label t-muted">From last week</h2>
                <p class="t-body" style="margin-block-start:var(--space-4)">${prevLesson.title}</p>
                <p class="t-body-sm t-muted">${prevLesson.standfirst}</p>
                <a class="text-link" href="#/library/${prevLesson.id}" style="margin-block-start:var(--space-12)">
                  ${prevLesson.read ? 'Read it again' : 'Read it'} ${icon('arrow', 'icon--sm')}
                </a>
              </section>` : ''}

            <!-- The bridge the shipping app never turned on: "Make it a habit"
                 exists in the codebase exactly once, inside an if (false).
                 (No backticks in a comment inside a template literal — they
                 close it.) -->
            <section class="card card--tinted">
              <h2 class="t-label t-muted">Turn it into something</h2>
              <p class="t-body" style="margin-block-start:var(--space-4)">
                Reading is not the habit. Take one idea out of this week and make it small.
              </p>
              <a class="btn btn--secondary btn--sm" href="#/explore" style="margin-block-start:var(--space-12)">
                Find a habit for it
              </a>
            </section>
          </aside>
        </div>
      </div>

      <!-- PANEL 2 — RESOURCES. The things that are not part of the week. -->
      <div id="panel-resources" role="tabpanel" tabindex="0" aria-labelledby="tab-resources"
           data-tabpanel="resources" ${at(seg !== 'resources', 'hidden')}>
        <div class="section-head" style="margin-block-end:var(--space-12)">
          <h2 class="t-h3">Everything else</h2>
          <p class="t-body-sm t-muted">${plural(store.data.resources.length, 'resource')}</p>
        </div>
        <ul class="res-grid">${store.data.resources.map(resourceCard)}</ul>
      </div>

    </div>`);
}

/* --------------------------------------------------------------------------
   MOUNT
-------------------------------------------------------------------------- */

export function mount(root) {
  /* Closing out a practice. The store archives the habits and shelves the
     source; the view only has to ask, and the re-render comes for free
     because app.js re-renders every mounted view on a store change. */
  on(root, 'click', '[data-finish]', (e, el) => {
    store.finishSource(el.getAttribute('data-finish'));
  });
  on(root, 'click', '[data-reopen]', (e, el) => {
    store.reopenSource(el.getAttribute('data-reopen'));
  });

  /* Record which segment is showing. prototype.js's [data-tabs] handler owns
     the ARIA and the panels; this only remembers, so the next render declares
     the same tab and the choice survives a store change. */
  on(root, 'click', '[data-tab]', (e, el) => { ui.segment = el.getAttribute('data-tab'); });
  on(root, 'keydown', '[data-tab]', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    requestAnimationFrame(() => {
      const sel = root.querySelector('[data-tab][aria-selected="true"]');
      if (sel) ui.segment = sel.getAttribute('data-tab');
    });
  });

  /* Search filters the rows in place. Deliberately DOM-only: a store round trip
     would re-render the view on every keystroke and take the caret with it.
     Nothing here is state anyone needs back — clearing the box restores the
     list, and so does leaving the screen. */
  on(root, 'input', '[data-lib-search]', (e, input) => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    root.querySelectorAll('[data-lib-name]').forEach((row) => {
      const hit = !q || row.getAttribute('data-lib-name').toLowerCase().includes(q);
      const li = row.closest('li');
      if (li) li.hidden = !hit;
      if (hit) shown++;
    });
    /* A fold with nothing left in it is noise while you are searching. */
    root.querySelectorAll('.week-fold').forEach((fold) => {
      const any = fold.querySelector('li:not([hidden])');
      fold.hidden = !!q && !any;
      if (q && any) fold.open = true;
    });
    const empty = root.querySelector('[data-lib-empty]');
    if (empty) empty.hidden = shown > 0;
  });
}
