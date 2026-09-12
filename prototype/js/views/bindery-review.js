/* ============================================================================
   HabitCrafts — views/bindery-review.js
   THE BINDERY, STEP 4.  #/bindery/:id/review                        [#5] [#8]

   The screen the whole creator experiment rests on. A draft Practice, week by
   week, with every generated line traceable to the page it came from and every
   card editable before anyone's name goes on it.

   ------------------------------------------------------------------------
   NOTHING PUBLISHES UNREVIEWED
   ------------------------------------------------------------------------
   Publish is disabled until every week has been opened. That is not a nag — it
   is the trust artefact E1 is selling. An author who publishes a machine's
   words under their own byline without reading them will do it exactly once,
   and the first hallucinated claim attributed to them ends the relationship
   and every other creator conversation they influence.

   The gate is enforced in the store (`readyToPublish`), not here, so a second
   entry point cannot route around it. This screen only has to make the state
   legible: which weeks are read, what is still waiting.

   ------------------------------------------------------------------------
   DRAFT IS A MATERIAL STATE, NOT A BADGE
   ------------------------------------------------------------------------
   A draft card is unbound paper: no hairline settled border, the edit
   affordance visible at rest rather than on hover. An author who cannot tell
   at a glance which words are theirs will not adopt any of them. Hover-to-edit
   also does not exist on a phone, and this flow has to work there.
   ========================================================================= */

import * as store from '../store.js';
import * as router from '../router.js';
import { flag } from '../config.js';
import { html, icon, on, cls, plural } from '../ui.js';
import { provenance, mountProvenance, emptyPage } from '../components.js';

export const meta = {
  title: 'Review',
  nav: null,
  level: 1,
};

/* --------------------------------------------------------------------------
   THE PROVENANCE LINE
   The one genuinely new component the experiments create, and the one that
   appears on every generated card in all three. Quiet at rest — it must not
   compete with the lesson title — and it reveals the passage in place rather
   than navigating away, because the reason to check a citation is to stay
   where you are. [#8]

   It is a <button>, not a link and not a bare <span>: it does something, it is
   reachable by keyboard, and it carries its own expanded state.
-------------------------------------------------------------------------- */


/* --------------------------------------------------------------------------
   A DRAFT CARD
-------------------------------------------------------------------------- */

function lessonCard(practice, lesson) {
  return html`
    <li class="card draft-card ${lesson.edited ? 'is-edited' : ''}">
      <div class="draft-card__head">
        <span class="t-label draft-card__state">${lesson.edited ? 'Edited' : 'Generated'}</span>
        ${lesson.angle ? html`<span class="chip chip--brand">${lesson.angle}</span>` : ''}
      </div>

      <!-- Editable at rest. contenteditable rather than a text input so the
           card reads as the thing it will become, not as a form about it. -->
      <h3 class="draft-card__title t-h3" contenteditable="true" spellcheck="false"
          data-edit-title="${lesson.id}"
          aria-label="Lesson title, editable">${lesson.title}</h3>

      <p class="draft-card__standfirst" contenteditable="true" spellcheck="false"
         data-edit-standfirst="${lesson.id}"
         aria-label="Standfirst, editable">${lesson.standfirst}</p>

      ${provenance(lesson.sourceRef, lesson.id)}

      ${lesson.body.length ? html`
        <p class="t-body-sm t-muted draft-card__len">
          ${plural(lesson.body.length, 'paragraph')} · ${lesson.minutes} min read
        </p>` : html`
        <p class="t-body-sm t-muted draft-card__len">No lesson body — checks and habit only</p>`}

      ${lesson.checks.length ? html`
        <div class="draft-checks">
          <p class="t-label">Recall check</p>
          ${lesson.checks.map((c) => html`
            <p class="draft-checks__q t-body">${c.q}</p>
            <ul class="draft-checks__opts">
              ${c.options.map((o, i) => html`
                <li class="${cls('draft-checks__opt', i === c.answer && 'is-answer')}">
                  ${o}${i === c.answer ? html`<span class="visually-hidden"> (correct answer)</span>` : ''}
                </li>`)}
            </ul>
            ${provenance(c.sourceRef, lesson.id + '-c')}`)}
        </div>` : ''}

      ${lesson.habitSuggestion ? html`
        <div class="draft-habit">
          <p class="t-label">Suggested habit</p>
          <p class="draft-habit__behavior t-body">${lesson.habitSuggestion.behavior}</p>
          <p class="draft-habit__cue t-body-sm t-muted">${lesson.habitSuggestion.prompt}</p>
        </div>` : ''}

      <div class="draft-card__actions">
        <button class="btn btn--ghost btn--sm" type="button"
                data-regen="${lesson.id}">Regenerate this card</button>
        <button class="btn btn--ghost btn--sm" type="button"
                data-remove="${lesson.id}">Remove</button>
      </div>
    </li>`;
}

/* --------------------------------------------------------------------------
   THE PUBLISH PANEL
   For E1 this is also the money moment: the price ask sits at publish, after
   the author has seen the thing they would be paying for, and never at upload
   where they have seen nothing. [#2 §3.6]
-------------------------------------------------------------------------- */

function publishPanel(practice) {
  const ready = store.readyToPublish(practice);
  const left = practice.weeks.filter((w) => !(practice.reviewedWeeks || []).includes(w.n));

  return html`
    <section class="hero publish-panel" aria-labelledby="pub-h">
      <h2 id="pub-h" class="publish-panel__title">
        ${ready ? 'Ready to publish' : 'Read it first'}
      </h2>

      <p class="publish-panel__body t-body">
        ${ready
          ? 'Your name goes on this. Everything above has been opened at least once.'
          : `Open ${left.length === 1 ? 'week ' + left[0].n : plural(left.length, 'week') + ' still unread'} before publishing. Nothing here goes out unreviewed.`}
      </p>

      ${flag('priceOnPublish') ? html`
        <div class="publish-price">
          <p class="publish-price__amount">$99<span class="t-body-sm">/month</span></p>
          <p class="t-body-sm publish-price__note">
            One published practice, up to 2,000 readers. Cancel whenever — your
            readers keep what they have already built.
          </p>
        </div>` : ''}

      <div class="bind-actions">
        <button class="btn btn--gold" type="button" data-publish ${ready ? '' : 'disabled'}>
          ${flag('priceOnPublish') ? 'Publish for $99/month' : 'Publish'}
        </button>
        <a class="btn btn--ghost" href="#/library">Save as draft</a>
      </div>
    </section>`;
}

/* --------------------------------------------------------------------------
   RENDER
-------------------------------------------------------------------------- */

export function render(params) {
  const p = store.practiceById(params.id);
  if (!p) return String(emptyPage({
    back: { href: '#/library', label: 'Library' },
    title: 'That draft is gone',
    body: 'Drafts live in the session. Bind the source again to pick it back up.',
    action: { href: '#/bindery', label: 'Open the Bindery' },
  }));

  const reviewed = p.reviewedWeeks || [];
  const lessons = store.practiceLessons(p);

  return String(html`
    <div class="page">
      <a class="page-back" href="#/library">${icon('arrow-back', 'icon--sm')} Library</a>

      <ol class="bind-steps" aria-label="Bindery progress">
        <li class="bind-steps__step is-done">Bring a source</li>
        <li class="bind-steps__step is-done">Choose what to make</li>
        <li class="bind-steps__step is-done">Bind</li>
        <li class="bind-steps__step" aria-current="step">Review and publish</li>
      </ol>

      <header class="page-head">
        <div class="page-head__text">
          <p class="t-label draft-flag">${p.status === 'draft' ? 'Draft' : 'Published'}</p>
          <h1 class="t-h1">${p.title}</h1>
          <p class="page-head__sub t-body">
            ${plural(lessons.length, 'lesson')} across ${plural(p.weeks.length, 'week')},
            from ${p.author || 'your source'}.
            ${p.prompt ? html` Guided by: <em>“${p.prompt}”</em>` : ''}
          </p>
        </div>
      </header>

      ${p.status === 'draft' ? publishPanel(p) : html`
        <div class="card card--roomy">
          <p class="t-label">Published</p>
          <p class="t-body">
            Readers join with the code <strong>${p.code}</strong>.
            ${flag('studio') ? html` Watch what happens next in the <a class="text-link" href="#/studio">Studio</a>.` : ''}
          </p>
        </div>`}

      ${p.weeks.map((w) => html`
        <details class="card card--flush week-fold draft-week" data-week="${w.n}"
                 ${reviewed.includes(w.n) ? 'open' : ''}>
          <summary>
            ${icon('arrow', 'icon--sm week-fold__chev')}
            <span>Week ${w.n} — ${w.title}</span>
            <span class="week-fold__meta">
              ${reviewed.includes(w.n)
                ? html`<span class="t-sage">Read</span>`
                : html`<span class="t-clay">Unread</span>`}
              · ${plural(w.lessons.length, 'lesson')}
            </span>
          </summary>
          <div class="week-fold__body">
            <ul class="draft-list">${w.lessons.map((l) => lessonCard(p, l))}</ul>
          </div>
        </details>`)}
    </div>`);
}


/* --------------------------------------------------------------------------
   MOUNT
-------------------------------------------------------------------------- */

export function mount(root, params) {
  const practice = store.practiceById(params.id);
  if (!practice) return;

  /* Opening a week IS the review. There is no separate "mark as read" control,
     because a button that certifies reading without requiring it is theatre. */
  root.querySelectorAll('.draft-week').forEach((el) => {
    el.addEventListener('toggle', () => {
      if (el.open) store.reviewWeek(params.id, Number(el.getAttribute('data-week')));
    });
  });

  /* The provenance reveal. A local DOM toggle, not a store change: checking a
     citation is not an edit and must not re-render the page underneath the
     person doing it. [#8] */
  mountProvenance(root);

  /* Edits commit on blur rather than on input: a store commit per keystroke
     would re-render the field and send the caret to the end of it. */
  const commitEdit = (el, field) => {
    const id = el.getAttribute('data-edit-' + field);
    const value = el.textContent.trim();
    if (!value) { el.textContent = '—'; return; }
    store.editLesson(params.id, id, { [field]: value });
  };
  root.querySelectorAll('[data-edit-title]').forEach((el) =>
    el.addEventListener('blur', () => commitEdit(el, 'title')));
  root.querySelectorAll('[data-edit-standfirst]').forEach((el) =>
    el.addEventListener('blur', () => commitEdit(el, 'standfirst')));

  /* Enter should finish the edit, not insert a line break into a heading. */
  on(root, 'keydown', '[data-edit-title]', (e, el) => {
    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
  });

  on(root, 'click', '[data-regen]', (e, el) => {
    const id = el.getAttribute('data-regen');
    const extra = window.prompt(
      'Guide this card only — leave blank to reuse the practice prompt:',
      practice.prompt || ''
    );
    if (extra === null) return;    /* cancelled */
    store.regenerateLesson(params.id, id, extra);
  });

  on(root, 'click', '[data-remove]', (e, el) => {
    store.removeLesson(params.id, el.getAttribute('data-remove'));
  });

  on(root, 'click', '[data-publish]', () => {
    const published = store.publishPractice(params.id, { plan: 'companion' });
    if (published && flag('studio')) router.go('/studio');
  });
}
