/* ============================================================================
   HabitCrafts — views/learn.js
   THE PILOT FLOW.  #/learn

   Upload → extract → clarify → lessons → when.

   This is a WALKTHROUGH, not the shipping Bindery. It exists to make one
   journey argue for itself with real material — Mark's みんなの日本語 第1課
   deck — so the shape can be judged before any of it is built properly.

   What it is deliberately NOT:
     · not wired to the store  (nothing it does survives a reload)
     · not a second pipeline   (when this is agreed, it folds into the Bindery)
     · not generation          (the corpus is a real hand decomposition; the
                                point under test is the FLOW, not model output)

   Step state is view-local and the view re-renders through the router, the
   same way Progress owns its tab. Nothing here belongs in the store until the
   flow is settled.
   ========================================================================= */

import * as router from '../router.js';
import { html, icon, cls, on } from '../ui.js';
import { KINDS, kind, EXERCISES } from '../knowledge-kinds.js';
import JA from '../data-japanese.js';

export const meta = {
  title: 'Learn',
  nav: null,
  level: 0,
};

const STEPS = ['Upload', 'What we found', 'A few questions', 'Your lessons', 'When'];

/* View-local. Reset on a fresh entry so the walkthrough always starts at the
   top for the next person who opens it. */
let step = 1;
let answers = {};
let kindId = null;      /* null until the extract step confirms it */

export function resetFlow() { step = 1; answers = {}; kindId = null; }

/* -------------------------------------------------------------------------
   PIECES
------------------------------------------------------------------------- */

/* Answers are a string for single-choice questions and an array for `multi`.
   One helper reads both, so no screen has to know which it is holding. */
function isChosen(q, o) {
  const a = answers[q.id];
  if (q.kind === 'multi') return Array.isArray(a) && a.includes(o.id);
  return a === o.id || (a === undefined && !!o.default);
}

function stepper(n) {
  return html`
    <ol class="bind-steps" aria-label="Progress">
      ${STEPS.map((label, i) => html`
        <li class="${cls('bind-steps__step', i + 1 < n && 'is-done')}"
            ${i + 1 === n ? 'aria-current="step"' : ''}>${label}</li>`)}
    </ol>`;
}

function foot(back, next, nextLabel) {
  return html`
    <div class="u-row" style="gap:var(--space-12);margin-block-start:var(--space-32)">
      ${back ? html`<button class="btn btn--ghost" type="button" data-back>${icon('arrow-back', 'icon--sm')} Back</button>` : ''}
      ${next ? html`<button class="btn btn--primary" type="button" data-next>${nextLabel || 'Continue'} ${icon('arrow', 'icon--sm')}</button>` : ''}
    </div>`;
}

/* -------------------------------------------------------------------------
   1. UPLOAD
------------------------------------------------------------------------- */

function stepUpload() {
  return html`
    <h1 class="t-h1">What are you learning?</h1>
    <p class="t-body-lg t-muted" style="max-inline-size:52ch">
      Bring the thing you are already studying. A class deck, a chapter, a set
      of notes. Or write your own lessons if you already know what you want to
      be reminded of.
    </p>

    <div class="bind-desk" style="margin-block-start:var(--space-24)">
      <button class="bind-drop" type="button" data-next>
        <svg class="bind-sheet" viewBox="0 0 96 120" aria-hidden="true">
          <path class="bind-sheet__page" d="M12 6h56l16 16v92H12z"/>
          <path class="bind-sheet__fold" d="M68 6v16h16"/>
          <path class="bind-sheet__rule" d="M26 46h44M26 60h44M26 74h30"/>
        </svg>
        <span class="bind-drop__title">${JA.source.filename}</span>
        <span class="bind-drop__sub t-body-sm">14 pages · ready to read</span>
      </button>
    </div>

    <!-- The custom path is a peer of upload, not a fallback under it. Someone
         who already knows what they want reminded of should not have to find a
         document to say so. -->
    <p class="t-body t-muted" style="margin-block-start:var(--space-16)">
      Nothing to upload?
      <a class="text-link" href="#/learn" data-own>Write your own lessons instead</a>
    </p>
    ${foot(false, false)}`;
}

/* -------------------------------------------------------------------------
   2. WHAT WE FOUND — ingest note, the kind with its evidence, the buckets.
------------------------------------------------------------------------- */

function bucket(title, count, note, rows) {
  return html`
    <section class="card card--roomy" style="margin-block-start:var(--space-16)">
      <div class="section-head">
        <h3 class="t-h3">${title}</h3>
        <span class="t-body-sm t-muted">${count}</span>
      </div>
      ${note ? html`<p class="t-body t-muted" style="margin-block-end:var(--space-12)">${note}</p>` : ''}
      <ul class="u-stack" style="gap:var(--space-8)">${rows}</ul>
    </section>`;
}

function stepFound() {
  const k = kind(kindId || JA.detected.id);

  return html`
    <h1 class="t-h1">What we found</h1>

    <!-- The honest note. This deck is scanned: its text layer is the teacher's
         annotation over slide images, so a text-only read would have produced
         a confident, wrong practice. Saying so is a moment of earned trust. -->
    <p class="t-body-lg t-muted" style="max-inline-size:54ch">
      Your pages are scans, so we read them as images. The text layer is only
      the annotations over the top: ${JA.source.ingest.textLayerChars}
      characters across ${JA.source.pages} pages. Building from that alone
      would have produced something confident and wrong.
    </p>

    <section class="card card--roomy" style="margin-block-start:var(--space-24)">
      <div class="section-head">
        <h2 class="t-h2">This looks like ${k.label.toLowerCase()}</h2>
        <span class="chip">${JA.detected.confidence} confidence</span>
      </div>
      <p class="t-body-lg">${k.blurb}</p>

      <p class="t-label" style="margin-block-start:var(--space-16)">Why</p>
      <ul class="u-stack t-body" style="gap:var(--space-4)">
        ${JA.detected.evidence.map((e) => html`<li>${e}</li>`)}
      </ul>

      <p class="t-label" style="margin-block-start:var(--space-16)">What it changes</p>
      <p class="t-body t-muted">
        Checks will be ${k.exercises.map((x) => EXERCISES[x].label.toLowerCase()).join(', ')}.
        Making the form, not picking it from a list. ${k.cadence.blurb}
      </p>

      <!-- Detection is allowed to be wrong. It is not allowed to be wrong
           silently, which is the whole reason this control is here. -->
      <p class="t-label" style="margin-block-start:var(--space-16)">Not right?</p>
      <div class="u-row" style="gap:var(--space-8);flex-wrap:wrap">
        ${Object.values(KINDS).filter((x) => x.id !== k.id).map((x) => html`
          <button class="btn btn--ghost btn--sm" type="button" data-kind="${x.id}">${x.label}</button>`)}
      </div>
    </section>

    ${bucket('Patterns', JA.rules.length + ' found', 'Frames that transform. These are the lesson.',
      JA.rules.map((r) => html`
        <li class="t-body">
          <strong class="ja">${r.frame}</strong> — ${r.gloss}
          <span class="t-muted"> · p${r.page}</span>
        </li>`))}

    ${bucket('Vocabulary', JA.items.length + ' found', null,
      JA.items.map((i) => html`
        <li class="t-body"><span class="ja">${i.ja}</span> <span class="t-muted">${i.romaji} · ${i.en} · p${i.page}</span></li>`))}

    ${bucket('Exceptions', JA.irregulars.length + ' found',
      'Kept apart on purpose. Three exceptions mixed among seven regular forms get a seventh of the repetitions, and they are the part you will still be missing in six months.',
      JA.irregulars.map((x) => html`
        <li class="t-body">
          ${x.n} → <strong class="ja">${x.ja}</strong>
          <span class="t-muted"> not <span class="ja">${x.expected}</span> · ${x.note} · p${x.page}</span>
        </li>`))}

    ${foot(true, true)}`;
}

/* -------------------------------------------------------------------------
   3. QUESTIONS
   Asked AFTER extraction: before, they are hypothetical; after, Mark is
   answering about material he can see. The duration question is held back to
   the last step, with the schedule, because it sizes everything.
------------------------------------------------------------------------- */

function stepQuestions() {
  const qs = JA.questions.filter((q) => q.id !== 'q-duration');

  return html`
    <h1 class="t-h1">A few questions</h1>
    <p class="t-body-lg t-muted" style="max-inline-size:52ch">
      Each of these changes what gets built. Anything that would leave your
      practice identical either way is not worth asking, so it is not here.
    </p>

    ${qs.map((q) => html`
      <section class="card card--roomy" style="margin-block-start:var(--space-16)">
        <h3 class="t-h3">${q.ask}</h3>
        <p class="t-body t-muted" style="margin-block-start:var(--space-4)">${q.why}</p>
        <p class="t-label" style="margin-block-start:var(--space-12)">Changes: ${q.affects}</p>

        <!-- A multi-kind question takes any number of answers. "Which of these
             do you already know" is the obvious case: the honest answer is
             usually two of five, and a radio group forces a wrong one.
             (No backticks in here - they close the template literal.) -->
        <div class="u-row" style="gap:var(--space-8);flex-wrap:wrap;margin-block-start:var(--space-12)">
          ${q.options.map((o) => {
            const chosen = isChosen(q, o);
            return html`
              <button class="${cls('btn', 'btn--sm', chosen ? 'btn--primary' : 'btn--ghost')}"
                      type="button" data-answer="${q.id}" data-value="${o.id}"
                      data-multi="${q.kind === 'multi' ? 'true' : 'false'}"
                      role="${q.kind === 'multi' ? 'checkbox' : 'radio'}"
                      aria-checked="${chosen ? 'true' : 'false'}">
                ${q.kind === 'multi' ? html`<span aria-hidden="true">${chosen ? '✓' : '+'}</span> ` : ''}${o.label}
              </button>`;
          })}
        </div>

        ${(() => {
          if (q.kind === 'multi') {
            const n = (answers[q.id] || []).length;
            return html`<p class="t-body t-muted" style="margin-block-start:var(--space-8)">
              ${n ? `${n} of ${q.options.length} dropped from drilling, kept for review.`
                  : 'Nothing ticked, so everything gets drilled.'}
            </p>`;
          }
          const sel = q.options.find((o) => (answers[q.id] ? o.id === answers[q.id] : o.default));
          return sel && sel.consequence
            ? html`<p class="t-body t-muted" style="margin-block-start:var(--space-8)">${sel.consequence}</p>`
            : '';
        })()}
      </section>`)}

    ${foot(true, true, 'Build my lessons')}`;
}

/* -------------------------------------------------------------------------
   4. LESSONS
------------------------------------------------------------------------- */

function stepLessons() {
  const total = JA.lessons.reduce((n, l) => n + l.minutes, 0) + JA.irregularDrill.minutes;

  return html`
    <h1 class="t-h1">Your lessons</h1>
    <p class="t-body-lg t-muted" style="max-inline-size:52ch">
      ${JA.lessons.length} lessons and one drill, ${total} minutes in total.
      Ordered by what depends on what. Your deck introduces nationality before
      the sentence that uses it, so we moved the frame first.
    </p>

    ${JA.lessons.map((l) => html`
      <section class="card card--roomy" style="margin-block-start:var(--space-16)">
        <div class="section-head">
          <h3 class="t-h3">${l.n}. ${l.title}</h3>
          <span class="t-body-sm t-muted">${l.minutes} min</span>
        </div>
        <p class="t-body-lg">${l.standfirst}</p>

        <p class="t-label" style="margin-block-start:var(--space-16)">Practice</p>
        <ul class="u-stack" style="gap:var(--space-8)">
          ${l.exercises.map((e) => html`
            <li class="t-body">
              <span class="chip chip--sm">${EXERCISES[e.type].label}</span>
              ${e.prompt}
              <span class="t-muted"> · p${e.page}</span>
            </li>`)}
        </ul>
      </section>`)}

    <section class="card card--roomy" style="margin-block-start:var(--space-16)">
      <div class="section-head">
        <h3 class="t-h3">${JA.irregularDrill.title}</h3>
        <span class="t-body-sm t-muted">${JA.irregularDrill.minutes} min · recurring</span>
      </div>
      <p class="t-body t-muted">${JA.irregularDrill.why}</p>
      <p class="t-body" style="margin-block-start:var(--space-12)">
        <span class="ja">${JA.irregulars.map((x) => x.n + ' → ' + x.ja).join('　·　')}</span>
      </p>
    </section>

    ${foot(true, true, 'Set when')}`;
}

/* -------------------------------------------------------------------------
   5. WHEN — the bridge, plus the duration budget.
------------------------------------------------------------------------- */

function stepWhen() {
  const q = JA.questions.find((x) => x.id === 'q-duration');
  const h = JA.proposedHabit;

  return html`
    <h1 class="t-h1">When will you do this?</h1>
    <p class="t-body-lg t-muted" style="max-inline-size:52ch">
      A practice with no place in the day competes with everything else in it,
      and loses. Anchor it to something you already do.
    </p>

    <section class="card card--roomy" style="margin-block-start:var(--space-24)">
      <h3 class="t-h3">${q.ask}</h3>
      <p class="t-body t-muted" style="margin-block-start:var(--space-4)">${q.why}</p>
      <div class="u-row" style="gap:var(--space-8);flex-wrap:wrap;margin-block-start:var(--space-12)">
        ${q.options.map((o) => {
          const chosen = answers[q.id] === o.id || (!answers[q.id] && o.default);
          return html`
            <button class="${cls('btn', 'btn--sm', chosen ? 'btn--primary' : 'btn--ghost')}"
                    type="button" data-answer="${q.id}" data-value="${o.id}"
                    aria-pressed="${chosen ? 'true' : 'false'}">${o.label}</button>`;
        })}
      </div>
      ${(() => {
        const sel = q.options.find((o) => (answers[q.id] ? o.id === answers[q.id] : o.default));
        return sel ? html`<p class="t-body t-muted" style="margin-block-start:var(--space-8)">${sel.consequence}</p>` : '';
      })()}
    </section>

    <section class="card card--roomy" style="margin-block-start:var(--space-16)">
      <h3 class="t-h3">Your habit</h3>
      <p class="t-body" style="margin-block-start:var(--space-8)"><strong>${h.behavior}</strong></p>
      <p class="t-body t-muted">${h.prompt} · every day</p>
      <p class="t-body t-muted" style="margin-block-start:var(--space-8)">${h.why}</p>
    </section>

    <p class="t-label" style="margin-block-start:var(--space-24)">Or anchor each lesson separately</p>
    <ul class="u-stack" style="gap:var(--space-8)">
      ${JA.lessons.map((l) => html`
        <li class="t-body">
          <strong>${l.habitSuggestion.behavior}</strong>
          <span class="t-muted"> · ${l.habitSuggestion.prompt}</span>
        </li>`)}
    </ul>

    ${foot(true, true, 'Start tomorrow')}`;
}

/* -------------------------------------------------------------------------
   RENDER
------------------------------------------------------------------------- */

const RENDERERS = [stepUpload, stepFound, stepQuestions, stepLessons, stepWhen];

export function render() {
  return String(html`
    <div class="page">
      ${stepper(step)}
      <div style="margin-block-start:var(--space-24)">
        ${RENDERERS[step - 1]()}
      </div>
    </div>`);
}

export function mount(root) {
  on(root, 'click', '[data-next]', () => {
    if (step < STEPS.length) { step += 1; router.refresh(); }
  });
  on(root, 'click', '[data-back]', () => {
    if (step > 1) { step -= 1; router.refresh(); }
  });
  on(root, 'click', '[data-answer]', (e, el) => {
    const id = el.getAttribute('data-answer');
    const val = el.getAttribute('data-value');
    if (el.getAttribute('data-multi') === 'true') {
      const cur = Array.isArray(answers[id]) ? answers[id] : [];
      answers[id] = cur.includes(val) ? cur.filter((v) => v !== val) : cur.concat(val);
    } else {
      answers[id] = val;
    }
    router.refresh();
  });
  on(root, 'click', '[data-kind]', (e, el) => {
    kindId = el.getAttribute('data-kind');
    router.refresh();
  });
  on(root, 'click', '[data-own]', (e) => {
    e.preventDefault();
    kindId = 'own';
    router.refresh();
  });
}
