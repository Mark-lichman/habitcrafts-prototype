/* ============================================================================
   HabitCrafts — views/_scaffold.js
   THE PLACEHOLDER A VIEW SHIPS WITH UNTIL IT IS BUILT.

   Every route in router.js resolves to a real module from day one, so the shell,
   the nav and the page transitions can be exercised end to end before a single
   screen is finished. Each unbuilt view renders this panel, which states what
   belongs on that screen and where the spec for it is.

   DELETE THE IMPORT AND THIS CALL when you build your view. Nothing else in the
   system references this file, and when the last view lands it goes with them.

   It is styled from the existing kit only — `.page-head`, `.card`,
   `.empty-state` — so it cannot become a source of drift while it exists.
   ========================================================================= */

import { html, icon, raw } from '../ui.js';

/**
 * @param {object} o
 * @param {string} o.title    the screen's h1
 * @param {string} o.sub      one line on what the screen is emotionally for
 * @param {string} o.spec     where the spec lives, e.g. "design-direction.md §3.2"
 * @param {string[]} o.parts  what has to be on it
 * @param {string} [o.back]   optional route for a `.page-back` link
 */
export function scaffold(o) {
  return html`
    <div class="page">
      ${o.back ? html`
        <a class="page-back" href="${o.back}">
          ${icon('arrow-back', 'icon--sm')} Back
        </a>` : ''}

      <header class="page-head">
        <div class="page-head__text">
          <h1 class="t-h1">${o.title}</h1>
          <p class="page-head__sub t-body">${o.sub}</p>
        </div>
      </header>

      <div class="card card--roomy" style="margin-block-start:var(--space-24)">
        <p class="t-label t-muted">Not built yet</p>
        <p class="t-body" style="margin-block-start:var(--space-8)">
          This route is live and the transitions run — the screen itself is the
          next piece of work. Replace this file's <code>render()</code> with the
          real view; the contract is documented in
          <code>js/views/home.js</code> and <code>README-buildnotes.md §12</code>.
        </p>

        <p class="t-label t-muted" style="margin-block-start:var(--space-24)">What goes here</p>
        <ul class="t-body" style="margin-block-start:var(--space-8); padding-inline-start:var(--space-24)">
          <!-- raw() because these briefs are authored strings carrying <code>
               markup and entities, not data. Never use raw() on anything that
               reaches the app from the store. -->
          ${o.parts.map((p) => html`<li style="margin-block-start:var(--space-4)">${raw(p)}</li>`)}
        </ul>

        <p class="t-body-sm t-muted" style="margin-block-start:var(--space-24)">Spec: ${o.spec}</p>
      </div>
    </div>`;
}
