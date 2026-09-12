/* ============================================================================
   HabitCrafts — components.js
   SHARED VIEW COMPONENTS: markup AND the behaviour that belongs to it.

   This file exists because `ui.js` says, correctly, that it is not a component
   library — it is escaping, formatting and event plumbing. A component that owns
   a DOM interaction is a different category and needed a different home.

   THE RULE THAT CREATED THIS FILE. A component owns its behaviour. The
   provenance line used to be half-shared: `practice.js` imported the markup
   from `bindery-review.js` and then re-implemented the reveal handler,
   byte-identically, nine lines each. Sharing markup while duplicating behaviour
   is worse than duplicating both, because the copies look connected and drift
   silently — fix the reveal in one screen and the other keeps the old one.

   It also meant the reader screen imported from the author's review screen, so
   two unrelated surfaces were coupled. CLAUDE.md says a view imports from
   store, router, ui and config; this file is the fourth legitimate answer for
   anything genuinely shared between views.

   If you add something here, it must be used by TWO OR MORE views. One caller
   is not a component, it is a function that belongs in its own view.
   ========================================================================= */

import { html, icon, on } from './ui.js';

/* --------------------------------------------------------------------------
   THE PROVENANCE LINE                                                    [#8]

   The trust mechanism: every generated card cites the chapter, page and
   verbatim passage it came from, and reveals the passage in place rather than
   navigating away — the reason to check a citation is to stay where you are.

   Quiet at rest, because this is a citation and not a call to action. It is a
   <button> rather than a span so it is reachable by keyboard and carries its
   own expanded state.
-------------------------------------------------------------------------- */

export function provenance(ref, id) {
  if (!ref) return '';
  const q = ref.quote;
  return html`
    <div class="prov-wrap">
      <button class="prov" type="button" data-prov="${id}"
              aria-expanded="false" ${q ? '' : 'disabled'}>
        ${icon('doc', 'icon--sm prov__icon')}
        <span class="prov__ref">${ref.chapter} · p.&nbsp;${ref.page}</span>
        ${q ? html`<span class="prov__cue t-body-sm">show passage</span>` : ''}
      </button>
      ${q ? html`
        <blockquote class="prov__quote" id="prov-q-${id}" hidden>
          ${q}
        </blockquote>` : ''}
    </div>`;
}

/**
 * Wire every provenance line inside `root`. Call from `mount()` in any view
 * that renders one.
 *
 * Deliberately a local DOM toggle and not a store change: checking a citation
 * is not an edit, and re-rendering the page underneath someone who is reading a
 * quote would close the quote they opened.
 */
export function mountProvenance(root) {
  on(root, 'click', '[data-prov]', (e, el) => {
    const quote = el.parentElement.querySelector('.prov__quote');
    if (!quote) return;
    const open = el.getAttribute('aria-expanded') === 'true';
    el.setAttribute('aria-expanded', String(!open));
    quote.hidden = open;
    const cue = el.querySelector('.prov__cue');
    if (cue) cue.textContent = open ? 'show passage' : 'hide passage';
  });
}

/* --------------------------------------------------------------------------
   THE EMPTY PAGE

   One shell for every "there is nothing here" screen. It replaced three
   `unavailable()` functions and two `notFound()` functions that differed only
   in a title, one sentence and a button label — five copies of the same eleven
   lines.

   Deliberately NOT used for the two illustrated not-found screens in
   `library-detail.js` and `habit-detail.js`. Those carry bespoke SVG
   illustrations and genuinely differ; forcing them through a shared shell would
   mean adding a slot parameter used once, which is how a helper turns back into
   a copy with extra steps.

   @param {object}  o
   @param {string}  o.title           the headline
   @param {string}  o.body            one sentence, plain text
   @param {object}  [o.back]          { href, label } for a `.page-back` link
   @param {object}  [o.action]        { href, label } for the primary button
-------------------------------------------------------------------------- */

export function emptyPage(o) {
  return html`
    <div class="page">
      ${o.back ? html`
        <a class="page-back" href="${o.back.href}">
          ${icon('arrow-back', 'icon--sm')} ${o.back.label}
        </a>` : ''}
      <div class="empty-state">
        <p class="empty-state__title">${o.title}</p>
        <p class="empty-state__body t-body">${o.body}</p>
        ${o.action ? html`
          <a class="btn btn--primary" href="${o.action.href}">${o.action.label}</a>` : ''}
      </div>
    </div>`;
}

/**
 * The specific case of "this surface belongs to an experiment that is not the
 * active one". Three views needed it and each had written its own.
 *
 * THE CALLER OWNS THE SENTENCE. The first version of this composed the title
 * from a surface name — `${surface} belongs to ${where}` — which produced
 * "Spaces belongs to E2" because the shell had quietly assumed a singular
 * subject. A component that does grammar will get grammar wrong; it takes the
 * finished title and owns only the shell.
 *
 * @param {string} title  the complete headline, written by the caller
 * @param {string} [where] the configuration to switch to, for the body line.
 *                         Omit for the generic "turn it on somewhere" wording.
 */
export function unavailableIn(title, where) {
  return emptyPage({
    title,
    body: where
      ? `Switch to ${where} using the control at the top of the screen to see it.`
      : 'Switch to an experiment that turns it on using the control at the top of the screen.',
    action: { href: '#/home', label: 'Back to today' },
  });
}
