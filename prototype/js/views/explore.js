/* ============================================================================
   HabitCrafts — views/explore.js
   HABIT IDEAS. A real destination instead of a dead end.

   In the shipping app this screen is reachable only through a tooltip on Create
   Habit, and a habit idea is a 73px row with no affordance at all: tapping it
   jumps straight into Create Habit with six prefill query parameters and no
   chance to look first. Here it is a nav destination and Home's "Find a new
   habit" link, an idea opens a preview you can read and try, and "Make it a
   habit" hands the whole object to the workbench.

   ------------------------------------------------------------------------
   WHAT prototype.js OWNS AND WHAT THIS FILE OWNS
   ------------------------------------------------------------------------
   `initBrowse` owns [data-cat-list]/[data-cat]/[data-idea-grid]/[data-sub] and
   is a real WAI-ARIA tablist — roving tabindex, arrows, Home and End — plus the
   AND-ed subcategory filter, the free-text search and the count read-out. It is
   the owner of that hook and is not reimplemented here.

   This file adds two things on top of it:

     1. The subcategory chips belong to categories, so choosing a category hides
        the chips that cannot match. A chip that is still pressed when it goes
        away is un-pressed *through its own button*, so `initBrowse`'s private
        filter state stays the one source of truth.

     2. The preview dialog — all of it. Two reasons, both verified in Chrome:

        · `initIdeaPreview` registers a listener on `document` that is never
          removed, so a view that re-mounts would stack one per visit. Naming
          the dialog `idea-preview` rather than `idea` leaves it inert.

        · `initModals`, which owns [data-modal-open], lives in prototype.js's
          Create Habit + Profile module — the one module that never reassigns
          `HC.init` to chain itself on. It runs once, on DOMContentLoaded,
          against a document that has no view in it yet, and is never invited
          back. Nothing it owns reaches an injected view, so the opener is
          rebuilt here under this view's own hooks (`data-idea-open` /
          `data-idea-close`) — different names on purpose, so there can never
          be two owners if that chain is fixed upstream.

        Everything bound here is bound to the view root, which the router
        removes with the view. Nothing outlives it.
   ========================================================================= */

import * as store from '../store.js';
import * as router from '../router.js';
import { prefillFrom } from './create.js';
import { html, icon, cls, plural, on } from '../ui.js';

export const meta = {
  title: 'Habit ideas',
  nav: 'explore',
  level: 0,
};

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * Is this idea already one of your habits? Derived by matching the behavior
 * against the live store rather than read off a fixture flag, so making a habit
 * from an idea and coming straight back shows "Already yours" — the screen
 * cannot disagree with Home.
 */
function takenBy(idea) {
  return store.activeHabits().find((h) => h.behavior === idea.behavior) || null;
}

/* --------------------------------------------------------------------------
   PIECES
-------------------------------------------------------------------------- */

function ideaCard(idea) {
  const habit = takenBy(idea);
  const cat = store.data.categories.find((c) => c.id === idea.cat);

  /* "Already yours" is three redundant signals — the tone step, the tick glyph
     and the word — never colour alone. [D §6]
     The trailing cue carries whichever of category / subcategory the chip did
     not: one chip and one cue, so the foot never wraps in a 260px column. */
  const foot = habit
    ? html`<span class="chip chip--sage">${icon('check')}Already yours</span>`
    : html`<span class="chip chip--brand">${cat ? cat.name : 'Habit'}</span>`;
  const cue = habit ? (cat ? cat.name : '') : idea.sub;

  return html`
    <li>
      <button class="${cls('card', 'card--interactive', 'idea-card', habit && 'is-taken')}"
              type="button" data-idea-open data-idea-id="${idea.id}"
              aria-haspopup="dialog"
              data-cats="${idea.cat}" data-sub="${slug(idea.sub)}">
        <h3 class="idea-card__title t-h3">${idea.behavior}</h3>
        <p class="idea-card__prompt t-body-sm">${idea.prompt}</p>
        <span class="idea-card__foot">
          ${foot}
          <span class="idea-card__cue">${cue}</span>
        </span>
      </button>
    </li>`;
}

/** One <ul>: a horizontal pill scroller below 840, a 240px vertical rail above. */
function categoryRail() {
  const ideas = store.data.ideas;
  const tab = (id, name, n, first) => html`
    <li><button class="cat-btn" type="button" role="tab" data-cat="${id}"
                tabindex="${first ? '0' : '-1'}"
                aria-selected="${first ? 'true' : 'false'}">${name}
          <span class="cat-btn__count">${n}</span></button></li>`;

  return html`
    <div class="browse-rail">
      <h2 class="browse-rail__title t-label" id="cats-h">Categories</h2>
      <ul class="cat-list" role="tablist" aria-orientation="vertical"
          aria-labelledby="cats-h" data-cat-list>
        ${tab('all', 'Everything', ideas.length, true)}
        ${store.data.categories.map((c) =>
          tab(c.id, c.name, ideas.filter((i) => i.cat === c.id).length, false))}
      </ul>
    </div>`;
}

/** Every subcategory in the system. `data-owner` is this view's own hook for
    hiding the ones the chosen category cannot match; `data-sub` is the filter
    key initBrowse reads. */
function subcatRow() {
  return html`
    <ul class="subcat-row" aria-label="Refine">
      ${store.data.categories.map((c) => c.subs.map((s) => html`
        <li data-owner="${c.id}">
          <button class="subcat-btn" type="button" data-sub="${slug(s)}"
                  aria-pressed="false">${s}</button>
        </li>`))}
    </ul>`;
}

/**
 * The preview dialog. One dialog, filled on the way in — you see the whole
 * idea (behaviour, prompt, celebration, why) and the card you would be getting
 * before you commit to anything.
 *
 * The habit card inside is data-habit="preview": a real ring, wired to the real
 * press-and-hold, that app.js deliberately does not record. Pressing it is how
 * you find out what the celebration feels like. [README §4, D §2.2]
 */
function previewDialog() {
  return html`
    <div class="scrim" data-modal="idea-preview" hidden>
      <div class="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="idea-title">
        <div class="u-between" style="align-items:flex-start">
          <div>
            <p class="t-label t-muted">Habit idea</p>
            <h2 id="idea-title" class="t-h2" data-slot="behavior"
                style="margin-block-start:var(--space-4)"></h2>
          </div>
          <button class="icon-btn" type="button" data-idea-close aria-label="Close preview">
            ${icon('close', 'icon--sm')}
          </button>
        </div>

        <p class="idea-preview__lead t-body" style="margin-block-start:var(--space-12)"
           data-slot="why"></p>

        <div class="idea-preview__section" style="margin-block-start:var(--space-24)">
          <span class="idea-preview__label t-label">When will you do it?</span>
          <p class="t-body" data-slot="prompt"></p>
        </div>

        <div class="idea-preview__section">
          <span class="idea-preview__label t-label">How will you celebrate?</span>
          <p class="t-body" data-slot="celebration"></p>
        </div>

        <div class="idea-preview__section">
          <span class="idea-preview__label t-label">What it will look like</span>
          <article class="card habit-card" data-habit="preview">
            <div class="habit-card__body">
              <h3 class="habit-card__title" data-slot="behavior"></h3>
              <p class="habit-card__meta" data-slot="meta"></p>
              <p class="habit-card__echo" data-echo hidden></p>
            </div>
            <button class="btn btn--ghost btn--sm habit-card__undo" type="button" data-undo hidden>Undo</button>
            <button class="ring" type="button" data-checkin aria-pressed="false"
                    aria-label="Preview check-in. Press and hold to see how it feels.">
              <svg class="ring__svg" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
                <circle class="ring__track" cx="22" cy="22" r="16" pathLength="100"/>
                <circle class="ring__fill"  cx="22" cy="22" r="16" pathLength="100"/>
                <path class="ring__check" d="M14.6 22.4l5.1 5.1 9.7-10.6" pathLength="100"/>
              </svg>
              <span class="ring__hint" data-ring-hint hidden>Hold to check in</span>
            </button>
          </article>
        </div>

        <div class="idea-preview__actions">
          <!-- "Make it a habit" is the string the shipping code already has,
               sitting inside an if (false). Here it is the bridge into the
               workbench. (No backticks in a comment inside a template literal
               — they close it.) -->
          <a class="btn btn--primary" href="#/create" data-idea-make>Make it a habit</a>
          <button class="btn btn--ghost" type="button" data-idea-close>Not this one</button>
        </div>

        <p class="t-body-sm t-muted" data-idea-taken hidden
           style="margin-block-start:var(--space-12)"></p>
      </div>
    </div>`;
}

/* --------------------------------------------------------------------------
   RENDER
-------------------------------------------------------------------------- */

export function render() {
  return String(html`
    <div class="page">

      <!-- Below 600 Explore is not in the bottom bar, so it gets a way back. -->
      <a class="page-back page-back--compact" href="#/home">
        ${icon('arrow-back', 'icon--sm')} Today
      </a>

      <header class="page-head">
        <div class="page-head__text">
          <h1 class="t-h1">Habit ideas</h1>
          <p class="page-head__sub t-body-sm">Get inspired to cultivate positive habits.</p>
        </div>

        <label class="input-with-icon" style="flex:1 1 260px;max-inline-size:360px">
          <span class="visually-hidden">Search habit ideas</span>
          ${icon('search', 'icon--sm')}
          <input class="input" type="search" placeholder="Search" data-idea-search>
        </label>
      </header>

      <!-- The one hero surface on this screen. [D §6: gold is a highlight] -->
      <section class="hero" aria-labelledby="start-small-h" style="margin-block-end:var(--space-24)">
        <h2 id="start-small-h" class="t-h3" style="color:var(--c-hero-ink)">Not sure where to start?</h2>
        <p class="hero__body t-body" style="margin-block-start:var(--space-8);max-inline-size:52ch">
          Keep it small, you can always do more. Every idea here is already the
          two-minute version — the one you can still do on your worst day.
        </p>
      </section>

      <div class="browse-layout">
        ${categoryRail()}

        <section aria-labelledby="ideas-h">
          <div class="section-head" style="margin-block-end:var(--space-12)">
            <h2 id="ideas-h" class="t-h3" data-idea-heading>Everything</h2>
            <p class="t-body-sm t-muted">
              <span data-idea-count>${store.data.ideas.length}</span> habits
            </p>
          </div>

          ${subcatRow()}

          <ul class="idea-grid" data-idea-grid>
            ${store.data.ideas.map(ideaCard)}
          </ul>

          <!-- No dead end: the way out of an empty filter is to craft one. -->
          <div class="empty-state" data-idea-empty hidden>
            <svg class="illus" viewBox="0 0 120 120" role="img"
                 aria-label="An empty stem waiting for a leaf">
              <ellipse class="illus__ground" cx="60" cy="98" rx="34" ry="9"/>
              <path class="illus__line" d="M60 96V40"/>
              <circle class="illus__line" cx="60" cy="36" r="6"/>
            </svg>
            <p class="empty-state__title">Nothing here yet</p>
            <p class="empty-state__body t-body">
              Try another category — or craft the one you already had in mind.
            </p>
            <a class="btn btn--primary" href="#/create">Craft it yourself</a>
          </div>
        </section>
      </div>

      ${previewDialog()}
    </div>`);
}

/* --------------------------------------------------------------------------
   MOUNT
-------------------------------------------------------------------------- */

export function mount(root) {
  /* The dialog is re-queried on every use rather than captured: innerHTML
     replaces it on a re-render, and a handler holding the old node would be
     writing into a detached tree. */
  const dialog = () => root.querySelector('[data-modal="idea-preview"]');
  let opener = null;

  function onKey(e) { if (e.key === 'Escape') closeDialog(); }

  function closeDialog() {
    const modal = dialog();
    document.removeEventListener('keydown', onKey);
    if (modal) modal.hidden = true;
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  }

  /* Bound ONCE per root element. `router.refresh()` calls mount() again on the
     same element, and an unguarded `on(root, …)` would stack a second copy of
     every handler — here that would mean two `keydown` listeners per open, one
     of which nothing ever removes. Guarded the way prototype.js guards its own
     bindings. */
  if (!root.__hcExploreBound) {
    /* Stash the closures, not just a flag: only the first mount's `onKey` is
       ever registered, so a later mount's destroy() has to remove that one. */
    root.__hcExploreBound = { onKey };

    /* 1. THE DIALOG. Fill, then show. Escape, the close buttons and a click on
          the scrim itself all dismiss it and put focus back where it came from.
          The `keydown` listener is the only thing bound outside the view; it
          goes on at open, comes off at close, and destroy() sweeps it. */
    on(root, 'click', '[data-idea-open]', (e, card) => {
      const modal = dialog();
      if (!modal) return;
      fill(modal, card.getAttribute('data-idea-id'));
      opener = card;
      modal.hidden = false;
      const first = modal.querySelector('[data-idea-close]');
      if (first) first.focus();
      document.addEventListener('keydown', onKey);
    });

    on(root, 'click', '[data-idea-close]', closeDialog);

    /* The scrim is inside the view, so its own click bubbles to root. Only a
       hit on the scrim itself counts — not one on the card sitting in it. */
    on(root, 'click', '[data-modal="idea-preview"]', (e, modal) => {
      if (e.target === modal) closeDialog();
    });

    /* 2. Subcategories belong to categories. Hide the chips the chosen category
          cannot match, and un-press any that were on — through the button's own
          click, so initBrowse's private filter state does the updating. */
    on(root, 'click', '[data-cat]', (e, tab) => {
      const cat = tab.getAttribute('data-cat');
      root.querySelectorAll('.subcat-row > li').forEach((li) => {
        const show = cat === 'all' || li.getAttribute('data-owner') === cat;
        const btn = li.querySelector('[data-sub]');
        if (!show && btn && btn.getAttribute('aria-pressed') === 'true') btn.click();
        li.hidden = !show;
      });
    });

    /* 3. The bridge. The idea goes to the workbench as an object, not as six
          query parameters, and Create opens already assembled. */
    on(root, 'click', '[data-idea-make]', (e, link) => {
      const idea = store.data.ideas.find((i) => i.id === link.getAttribute('data-idea-id'));
      if (!idea) return;
      e.preventDefault();
      prefillFrom(idea);
      closeDialog();
      router.go('/create');
    });
  }

  const bound = root.__hcExploreBound;
  return function destroy() {
    document.removeEventListener('keydown', bound.onKey);
  };
}

/** Write one idea into the shared dialog. */
function fill(modal, id) {
  const idea = store.data.ideas.find((i) => i.id === id);
  if (!idea) return;
  const habit = takenBy(idea);

  const text = {
    behavior: idea.behavior,
    prompt: idea.prompt,
    celebration: idea.celebration,
    why: idea.why,
    meta: habit
      ? idea.prompt + ' · ' + plural(store.streakOf(habit), 'day') + ' streak'
      : idea.prompt + ' · new habit',
  };
  modal.querySelectorAll('[data-slot]').forEach((el) => {
    el.textContent = text[el.getAttribute('data-slot')] || '';
  });

  /* The preview card echoes the idea's own celebration at commit, exactly like
     every other habit card in the system. [D §2.2] */
  const card = modal.querySelector('[data-habit="preview"]');
  if (card) card.setAttribute('data-celebration', idea.celebration);

  const make = modal.querySelector('[data-idea-make]');
  const note = modal.querySelector('[data-idea-taken]');
  if (make) {
    make.hidden = !!habit;
    make.setAttribute('data-idea-id', idea.id);
  }
  if (note) {
    note.hidden = !habit;
    note.innerHTML = '';
    if (habit) {
      /* Built as nodes rather than a string: the link is this screen's only
         cross-reference into a detail route and must stay a real anchor. */
      note.append('You already keep this one — ' + plural(store.streakOf(habit), 'day') + ' so far. ');
      const a = document.createElement('a');
      a.className = 'text-link';
      a.href = '#/habit/' + habit.id;
      a.textContent = 'Open it';
      note.append(a);
    }
  }
}
