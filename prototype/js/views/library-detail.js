/* ============================================================================
   HabitCrafts — views/library-detail.js
   THE READING VIEW.  #/library/:id

   THE ONE RULE ON THIS SCREEN: the reading column is capped at
   --layout-read-max (600px) at EVERY width. 390, 768, 1280 and 1920 all measure
   600. This is the one screen in the system where a narrow measure is correct,
   so a wide window changes what sits BESIDE the column, never the column's own
   width. `.article` carries the cap unconditionally and the ≥1200 grid's third
   track is `1fr` precisely so the reading column is never the one that loses.
   [B §6.1] [components.css §E6]

   It also keeps the parchment canvas. `library_detail_page` being the only
   white page in the shipping app is one of the defects this redesign fixes —
   the ground inversion has to be total. [D §5.1]

   This is a PUSH route (`level: 1`), so the router runs shared-axis X into it
   and mirrors the motion on the way back. The back path is a plain
   `<a href="#/library">`, which is keyboard- and middle-click-friendly for
   free and gives the router a level 1 → 0 transition to animate.
   ========================================================================= */

import * as store from '../store.js';
import * as router from '../router.js';
import { prefillFrom } from './create.js';
import { todaysLessonId } from '../data.js';
import { html, icon, on, raw } from '../ui.js';

export const meta = {
  title: 'Lesson',
  nav: 'library',      /* still a Library destination while you are reading */
  level: 1,            /* a push into detail → shared-axis X */
};

/* --------------------------------------------------------------------------
   PIECES
-------------------------------------------------------------------------- */

/** A closing line short enough to stand on its own is set as a pull quote:
    a rule and a serif line, as paper. No tinted box, no glass. The rule is
    deterministic so the same lesson always reads the same way. */
const QUOTE_MAX = 90;
function splitBody(body) {
  const rest = body.slice();
  const last = rest[rest.length - 1] || '';
  if (rest.length > 1 && last.length <= QUOTE_MAX) return { paras: rest.slice(0, -1), quote: last };
  return { paras: rest, quote: null };
}

function notFound() {
  return String(html`
    <div class="page">
      <a class="page-back" href="#/library">${icon('arrow-back', 'icon--sm')} Library</a>
      <div class="empty-state">
        <svg class="illus" viewBox="0 0 120 120" role="img" aria-label="An empty shelf">
          <ellipse class="illus__ground" cx="60" cy="98" rx="34" ry="9"/>
          <path class="illus__line" d="M30 54h60"/>
          <rect class="illus__shape" x="36" y="30" width="12" height="22" rx="2"/>
        </svg>
        <p class="empty-state__title">That lesson has moved</p>
        <p class="empty-state__body t-body">The rest of the Library is where you left it.</p>
        <a class="btn btn--primary" href="#/library">Back to the Library</a>
      </div>
    </div>`);
}

/* --------------------------------------------------------------------------
   RENDER
-------------------------------------------------------------------------- */

export function render(params) {
  const all = store.state.lessons;
  const lesson = all.find((l) => l.id === params.id);
  if (!lesson) return notFound();

  const week = all.filter((l) => l.week === lesson.week);
  const idx = all.indexOf(lesson);
  const prev = all[idx - 1] || null;
  const next = all[idx + 1] || null;
  const { paras, quote } = splitBody(lesson.body);

  return String(html`
    <div class="page">

      <a class="page-back" href="#/library">
        ${icon('arrow-back', 'icon--sm')} Library
      </a>

      <div class="read-layout">

        <!-- CONTENTS, ≥1200 only. The fixture's lessons are short prose with no
             internal headings, so a per-section list would have to invent its
             own anchors. What a reader on a wide window actually wants beside
             the column is where this lesson sits in the week — so that is what
             the rail carries, with the bridge under it. Below 1200 it is not
             rendered at all: the article is short enough to scroll and a
             contents list would be furniture. -->
        <nav class="read-toc" aria-labelledby="toc-h">
          <h2 id="toc-h" class="read-toc__title t-label">Week ${lesson.week}</h2>
          <ul class="read-toc__list">
            ${week.map((l) => html`
              <li>
                <a class="read-toc__link" href="#/library/${l.id}"
                   ${raw(l.id === lesson.id ? 'aria-current="page"' : '')}>${l.title}</a>
              </li>`)}
          </ul>
          <a class="btn btn--secondary btn--sm" href="#/create" data-make-habit="${lesson.id}"
             style="margin-block-start:var(--space-24)">Make it a habit</a>
        </nav>

        <!-- THE READING COLUMN. Capped at 600px at every width — see the note
             at the top of this file. -->
        <article class="article">
          <p class="article__meta t-body-sm">
            <span>Week ${lesson.week}</span>
            <span aria-hidden="true">·</span>
            <span>Lesson ${week.indexOf(lesson) + 1} of ${week.length}</span>
            <span aria-hidden="true">·</span>
            <span>${lesson.minutes} min read</span>
            ${lesson.id === todaysLessonId
              ? html`<span aria-hidden="true">·</span><span class="t-brand">Today's lesson</span>`
              : ''}
          </p>

          <h1 class="article__title t-h1">${lesson.title}</h1>

          <p class="article__standfirst">${lesson.standfirst}</p>

          <div class="article__body">
            ${paras.map((p) => html`<p>${p}</p>`)}
            ${quote ? html`<blockquote class="article__quote">${quote}</blockquote>` : ''}
          </div>

          <!-- THE BRIDGE. This screen's ONE --c-hero-fill surface, and the thing
               the shipping app never turned on: "Make it a habit" exists in the
               codebase exactly once, inside an if (false), so the knowledge layer
               currently terminates here with no way into the habit layer. -->
          <section class="hero read-bridge" aria-labelledby="bridge-h">
            <h2 id="bridge-h" class="read-bridge__title">Make it a habit</h2>
            <p class="read-bridge__body t-body">
              Reading it is not the habit. Give it a prompt, keep it small, and
              decide now how you'll celebrate — it takes about a minute.
            </p>
            <div class="read-bridge__actions">
              <a class="btn btn--secondary" href="#/create" data-make-habit="${lesson.id}">Craft it now</a>
              <a class="btn btn--ghost" href="#/explore">Need inspiration?</a>
            </div>
          </section>

          ${(prev || next) ? html`
            <nav class="read-nav" aria-label="Lesson navigation">
              ${prev ? html`
                <a class="card card--interactive" href="#/library/${prev.id}">
                  <span class="read-nav__label t-body-sm">Previous</span>
                  <span class="read-nav__title t-body">${prev.title}</span>
                </a>` : html`<span></span>`}
              ${next ? html`
                <a class="card card--interactive read-nav__next" href="#/library/${next.id}">
                  <span class="read-nav__label t-body-sm">Next</span>
                  <span class="read-nav__title t-body">${next.title}</span>
                </a>` : ''}
            </nav>` : ''}
        </article>

        <!-- The third grid track at ≥1200 is deliberately empty: it keeps the
             220 | 600 pair optically placed in the content area instead of
             pinned to the rail, and being an fr track it is what absorbs a wide
             window so the reading column never has to. Nothing floats in it. -->
        <div aria-hidden="true"></div>
      </div>
    </div>`);
}

/* --------------------------------------------------------------------------
   MOUNT
-------------------------------------------------------------------------- */

export function mount(root, params) {
  /* Opening a lesson is what "read" means. The store is the only record of it,
     so the tick on the Library row, the week meter and the "lessons read" tile
     are all correct on the way back with nothing to keep in sync.

     This commits, which re-renders this view once — markLessonRead returns
     early the second time, so it settles immediately rather than looping. */
  store.markLessonRead(params.id);

  /* THE BRIDGE INTO THE HABIT LAYER.
     The lesson goes to the workbench as an object through Create's own
     `prefillFrom` — the same door Explore hands an idea through, so there is
     one handoff in the app rather than two, and no query-parameter protocol to
     keep in sync. The anchor keeps its href so middle-click and "open in new
     tab" still land on Create (blank, which is the honest fallback).

     "What will success look like?" is the only field a lesson can fill
     truthfully. The behaviour, the prompt and the celebration are the reader's
     to write — pre-writing those would be the app deciding the habit for them,
     which is the opposite of what the lesson just spent four minutes saying. */
  on(root, 'click', '[data-make-habit]', (e, el) => {
    const lesson = store.state.lessons.find((l) => l.id === el.getAttribute('data-make-habit'));
    if (!lesson) return;
    e.preventDefault();
    prefillFrom({ why: lesson.standfirst });
    router.go('/create');
  });

  /* Nothing outlives the view — no destroy(). */
}
