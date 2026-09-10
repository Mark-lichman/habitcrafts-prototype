/* ============================================================================
   HabitCrafts — views/practice.js
   THE READER'S SIDE OF A PRACTICE.  #/practice/:id                      [#5]

   What an author's audience, a community member and a consumer all see. One
   screen, three payers — which is the entire argument for building the
   pipeline once.

   It is the Library with an author on it: the same weeks, the same numbered
   lessons, the same week-meter. Two things are new, and both are load-bearing:

     1. THE PROVENANCE LINE on every generated card, so a reader can check any
        claim against the page it came from without leaving the screen. [#8]
     2. THE BRIDGE IS INSTRUMENTED. Crossing it is the moment Practice Take
        Rate measures, so it goes through `createHabitFromLesson` rather than
        the plain mutation. [#9]

   The bridge still routes through Create rather than making the habit outright.
   The suggested behaviour, cue and celebration arrive as DEFAULTS THE READER
   EDITS, not as a habit handed to them — a lesson that spends four minutes
   saying "make it yours" and then fills the form in for you has argued against
   itself.
   ========================================================================= */

import * as store from '../store.js';
import * as router from '../router.js';
import { prefillFrom } from './create.js';
import { provenance } from './bindery-review.js';
import { html, icon, on, plural } from '../ui.js';

export const meta = {
  title: 'Practice',
  nav: 'library',
  level: 1,
};

/* --------------------------------------------------------------------------
   ONE LESSON, EXPANDED IN PLACE

   Inline rather than a push into a second route. A Practice lesson is short and
   the reader is working through a week — sending them out to a detail screen
   and back for each one turns a sitting into six navigations.
-------------------------------------------------------------------------- */

function lesson(practice, l, n) {
  const already = store.state.habits.some((h) => h.fromLesson === l.id && !h.archived);

  return html`
    <details class="card card--flush prac-lesson" data-lesson="${l.id}">
      <summary>
        ${icon('arrow', 'icon--sm week-fold__chev')}
        <span class="lesson-row__num" aria-hidden="true">${n}</span>
        <span class="prac-lesson__title">${l.title}</span>
        <span class="week-fold__meta">
          ${already ? html`<span class="t-sage">Habit made</span> · ` : ''}${l.minutes} min
        </span>
      </summary>

      <div class="week-fold__body prac-lesson__body">
        <p class="article__standfirst">${l.standfirst}</p>

        ${l.body.map((p) => html`<p class="prac-lesson__para">${p}</p>`)}

        ${provenance(l.sourceRef, 'r-' + l.id)}

        ${l.checks.length ? html`
          <section class="prac-check" aria-label="Recall check">
            <p class="t-label">Check yourself</p>
            ${l.checks.map((c, ci) => html`
              <p class="prac-check__q t-body">${c.q}</p>
              <ul class="prac-check__opts">
                ${c.options.map((o, i) => html`
                  <li>
                    <button class="prac-check__opt" type="button"
                            data-answer="${l.id}:${ci}:${i}">${o}</button>
                  </li>`)}
              </ul>
              <p class="prac-check__verdict t-body-sm" data-verdict="${l.id}:${ci}" hidden></p>`)}
          </section>` : ''}

        ${l.habitSuggestion ? html`
          <section class="hero read-bridge" aria-label="Make it a habit">
            <h3 class="read-bridge__title">Make it a habit</h3>
            <p class="read-bridge__body t-body">
              ${already
                ? 'You already crafted one from this lesson. You can make another.'
                : 'Reading it is not the habit. Here is a starting point. Change any of it.'}
            </p>
            <p class="prac-suggest">
              <span class="prac-suggest__behavior">${l.habitSuggestion.behavior}</span>
              <span class="prac-suggest__cue t-body-sm">${l.habitSuggestion.prompt}</span>
            </p>
            <div class="read-bridge__actions">
              <button class="btn btn--secondary" type="button" data-bridge="${l.id}">
                Craft it now
              </button>
            </div>
          </section>` : ''}
      </div>
    </details>`;
}

/* --------------------------------------------------------------------------
   RENDER
-------------------------------------------------------------------------- */

export function render(params) {
  const p = store.practiceById(params.id);
  if (!p) return String(notFound());

  const joined = store.hasJoined(p.id);
  const lessons = store.practiceLessons(p);
  const made = lessons.filter((l) => store.state.habits.some((h) => h.fromLesson === l.id)).length;
  const pct = lessons.length ? Math.round((made / lessons.length) * 100) : 0;

  return String(html`
    <div class="page">
      <a class="page-back" href="#/library">${icon('arrow-back', 'icon--sm')} Library</a>

      <section class="hero lib-hero prac-hero">
        <p class="lib-hero__kicker">${p.author}</p>
        <h1 class="lib-hero__title">${p.title}</h1>
        <p class="t-body prac-hero__meta">
          ${plural(lessons.length, 'lesson')} · ${plural(p.weeks.length, 'week')}
          ${p.code ? html` · join code <strong>${p.code}</strong>` : ''}
        </p>

        ${joined ? html`
          <div class="week-meter" role="progressbar" aria-valuenow="${pct}"
               aria-valuemin="0" aria-valuemax="100"
               aria-label="Lessons you have turned into habits">
            <span class="week-meter__bar">
              <span class="week-meter__fill" style="inline-size:${pct}%"></span>
            </span>
            <span class="week-meter__label t-body-sm">${made} of ${lessons.length} made into habits</span>
          </div>` : html`
          <div class="lib-hero__actions">
            <button class="btn btn--gold" type="button" data-join="${p.id}">Join this practice</button>
          </div>`}
      </section>

      ${!joined ? html`
        <p class="t-body-sm t-muted prac-preview-note">
          Previewing week 1. Joining is free and keeps your place.
        </p>` : ''}

      ${p.weeks
        .filter((w) => joined || w.n === 1)
        .map((w) => html`
          <section class="prac-week" aria-labelledby="w-${w.n}">
            <h2 id="w-${w.n}" class="section-head t-label">Week ${w.n} — ${w.title}</h2>
            <div class="prac-list">
              ${w.lessons.map((l, i) => lesson(p, l, i + 1))}
            </div>
          </section>`)}
    </div>`);
}

function notFound() {
  return html`
    <div class="page">
      <a class="page-back" href="#/library">${icon('arrow-back', 'icon--sm')} Library</a>
      <div class="empty-state">
        <p class="empty-state__title">That practice is not here</p>
        <p class="empty-state__body t-body">It may have been a draft in another session.</p>
        <a class="btn btn--primary" href="#/library">Back to the Library</a>
      </div>
    </div>`;
}

/* --------------------------------------------------------------------------
   MOUNT
-------------------------------------------------------------------------- */

export function mount(root, params) {
  const p = store.practiceById(params.id);
  if (!p) return;

  on(root, 'click', '[data-join]', (e, el) => {
    store.joinPractice(el.getAttribute('data-join'));
  });

  /* Provenance reveal — local DOM only, same as in review. [#8] */
  on(root, 'click', '[data-prov]', (e, el) => {
    const q = el.parentElement.querySelector('.prov__quote');
    if (!q) return;
    const open = el.getAttribute('aria-expanded') === 'true';
    el.setAttribute('aria-expanded', String(!open));
    q.hidden = open;
    const cue = el.querySelector('.prov__cue');
    if (cue) cue.textContent = open ? 'show passage' : 'hide passage';
  });

  /* Recall checks answer in place. No score, no streak, no penalty: this is a
     retrieval prompt, not an exam, and turning it into one would make skipping
     it the rational move. */
  on(root, 'click', '[data-answer]', (e, el) => {
    const [lessonId, ci, choice] = el.getAttribute('data-answer').split(':');
    const l = store.practiceLessonById(p, lessonId);
    const check = l && l.checks[Number(ci)];
    if (!check) return;
    const right = Number(choice) === check.answer;

    const list = el.closest('.prac-check__opts');
    if (list) {
      list.querySelectorAll('.prac-check__opt').forEach((b) => b.classList.remove('is-right', 'is-wrong'));
      el.classList.add(right ? 'is-right' : 'is-wrong');
      if (!right) {
        const correct = list.querySelectorAll('.prac-check__opt')[check.answer];
        if (correct) correct.classList.add('is-right');
      }
    }
    const verdict = root.querySelector(`[data-verdict="${lessonId}:${ci}"]`);
    if (verdict) {
      verdict.hidden = false;
      verdict.textContent = right
        ? 'That is the one.'
        : 'Not quite. The passage above has it.';
    }
  });

  /* THE BRIDGE, INSTRUMENTED.
     Prefill carries the attribution alongside the suggestion, so whatever the
     reader edits it into, the crossing is still recorded against this Practice
     and this lesson when Create saves. [#9] */
  on(root, 'click', '[data-bridge]', (e, el) => {
    const l = store.practiceLessonById(p, el.getAttribute('data-bridge'));
    if (!l || !l.habitSuggestion) return;
    if (!store.hasJoined(p.id)) store.joinPractice(p.id);
    prefillFrom({
      behavior: l.habitSuggestion.behavior,
      prompt: l.habitSuggestion.prompt,
      celebration: l.habitSuggestion.celebration,
      why: l.habitSuggestion.why,
      fromPractice: p.id,
      fromLesson: l.id,
    });
    router.go('/create');
  });
}
