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
import * as store from '../store.js';
import { html, icon, cls, on, plural } from '../ui.js';
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
let openLesson = null;  /* a lesson key while one is open */
let revealed = {};      /* exerciseId -> answer has been shown */
let results = {};       /* exerciseId -> 'got' | 'again' */
let practice = {};      /* lessonKey -> reading is put away, exercises showing */
let anchors = {};       /* lessonKey -> { on, prompt, time } */
let covered = null;     /* which lessons the one reminder covers; null = all */
let logged = {};        /* lessonKey -> this visit's completion already counted */
let appliedKey = null;  /* the deep-link key already consumed, so it applies once */
let created = [];       /* habit ids, once the bridge has fired */

export function resetFlow() {
  step = 1; answers = {}; kindId = null; openLesson = null;
  revealed = {}; results = {}; practice = {}; anchors = {};
  covered = null; logged = {}; created = [];
}

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

/* NEVER INTERPOLATE AN ATTRIBUTE. `html` escapes every value it substitutes,
   so `${cond ? 'aria-current="step"' : ''}` renders the quotes as &quot; and
   the whole thing lands as TEXT inside the element. The stepper had no
   aria-current at all: no current step for a screen reader, and no hook for
   the styling that marks where you are. Branch on the whole tag instead. */
function stepper(n) {
  return html`
    <ol class="bind-steps" aria-label="Progress">
      ${STEPS.map((label, i) => (i + 1 === n
        ? html`<li class="bind-steps__step is-current" aria-current="step">${label}</li>`
        : html`<li class="${cls('bind-steps__step', i + 1 < n && 'is-done')}">${label}</li>`))}
    </ol>`;
}

/* `action` names the attribute the primary button carries. Every step but the
   last advances; the last one writes to the store instead, so it must not also
   be a Next or the flow would step past its own result. */
function foot(back, next, nextLabel, action) {
  const attr = action || 'data-next';
  return html`
    <div class="u-row" style="gap:var(--space-12);margin-block-start:var(--space-32)">
      ${back ? html`<button class="btn btn--ghost" type="button" data-back>${icon('arrow-back', 'icon--sm')} Back</button>` : ''}
      ${next ? html`<button class="btn btn--primary" type="button" ${attr}>${nextLabel || 'Continue'} ${icon('arrow', 'icon--sm')}</button>` : ''}
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

/* One exercise, mid-practice. The answer is HIDDEN until asked for, which is
   the whole difference between practice and reading: retrieval only counts if
   you attempted it first. Every card carries its page, so the answer is always
   checkable against the deck. */
function exerciseCard(l, e, i) {
  const id = l.key + ':' + i;
  const shown = revealed[id];
  const mark = results[id];

  return html`
    <section class="card card--roomy" style="margin-block-start:var(--space-16)">
      <div class="section-head">
        <span class="chip chip--sm">${EXERCISES[e.type].label}</span>
        <span class="t-body-sm t-muted">${i + 1} of ${l.exercises.length} · p${e.page}</span>
      </div>

      <p class="t-body-lg" style="margin-block-start:var(--space-8)">${e.prompt}</p>
      <p class="t-body-sm t-muted">${EXERCISES[e.type].hint}</p>

      ${Array.isArray(e.options) ? html`
        <ul class="u-stack" style="gap:var(--space-8);margin-block-start:var(--space-12)">
          ${e.options.map((o, oi) => html`
            <li class="${cls('t-body', shown && oi === e.answer && 'u-strong')}">
              <span class="ja">${o}</span>
              ${shown && oi === e.answer ? html`<span class="t-muted"> correct</span>` : ''}
            </li>`)}
        </ul>` : ''}

      ${shown ? html`
        <div style="margin-block-start:var(--space-16);padding-block-start:var(--space-12);border-block-start:1px solid var(--c-border)">
          <p class="t-label">Answer</p>
          <p class="t-body-lg"><span class="ja">${Array.isArray(e.options) ? e.options[e.answer] : e.answer}</span></p>
          ${e.romaji ? html`<p class="t-body t-muted">${e.romaji}</p>` : ''}
          ${e.because ? html`<p class="t-body t-muted" style="margin-block-start:var(--space-8)">${e.because}</p>` : ''}
          <div class="u-row" style="gap:var(--space-8);margin-block-start:var(--space-16)">
            <button class="${cls('btn', 'btn--sm', mark === 'got' ? 'btn--primary' : 'btn--ghost')}"
                    type="button" data-mark="${id}" data-result="got">Got it</button>
            <button class="${cls('btn', 'btn--sm', mark === 'again' ? 'btn--primary' : 'btn--ghost')}"
                    type="button" data-mark="${id}" data-result="again">Not yet</button>
          </div>
        </div>`
      : html`
        <button class="btn btn--ghost btn--sm" type="button" data-reveal="${id}"
                style="margin-block-start:var(--space-16)">Show the answer</button>`}
    </section>`;
}

/* A lesson, opened. TWO PHASES, and the split is not cosmetic.
   Lesson 5 teaches いっさい, はっさい, じゅっさい in its body, and then asks
   "how do you say eight years old?". With the reading still on screen that is
   not retrieval, it is copying, and copying produces the feeling of knowing
   without the knowing. So the reading is put away when practice starts, and it
   can be fetched back deliberately at the cost of admitting you needed it. */
function lessonDetail(l) {
  const done = l.exercises.filter((_, i) => results[l.key + ':' + i]).length;
  const practising = !!practice[l.key];

  return html`
    <button class="page-back" type="button" data-close-lesson>
      ${icon('arrow-back', 'icon--sm')} All lessons
    </button>

    <h1 class="t-h1" style="margin-block-start:var(--space-12)">${l.n}. ${l.title}</h1>
    <p class="t-body-lg t-muted" style="max-inline-size:52ch">${l.standfirst}</p>

    ${!practising ? html`
      <section class="card card--roomy" style="margin-block-start:var(--space-24)">
        ${l.body.map((p) => html`<p class="t-body" style="margin-block-end:var(--space-12)">${p}</p>`)}

        <p class="t-label" style="margin-block-start:var(--space-16)">From your deck</p>
        <ul class="u-stack t-body" style="gap:var(--space-4)">
          ${(l.rules || []).map((k) => {
            const r = JA.rules.find((x) => x.key === k);
            return r ? html`<li><strong class="ja">${r.frame}</strong> <span class="t-muted">p${r.page}</span></li>` : '';
          })}
        </ul>
      </section>

      <div class="u-row" style="gap:var(--space-12);margin-block-start:var(--space-24)">
        <button class="btn btn--primary" type="button" data-practise="${l.key}">
          Start practice ${icon('arrow', 'icon--sm')}
        </button>
      </div>
      <p class="t-body-sm t-muted" style="margin-block-start:var(--space-8)">
        The reading goes away while you practise. That is the point of it.
      </p>`
    : html`
      <div class="section-head" style="margin-block-start:var(--space-24)">
        <h2 class="t-h2">Practice</h2>
        <span class="t-body-sm t-muted">${done} of ${l.exercises.length} marked</span>
      </div>

      ${l.exercises.map((e, i) => exerciseCard(l, e, i))}

      <div class="u-row" style="gap:var(--space-12);margin-block-start:var(--space-32)">
        <button class="btn btn--primary" type="button" data-close-lesson>
          ${done === l.exercises.length ? 'Done' : 'Back to lessons'} ${icon('arrow', 'icon--sm')}
        </button>
        <button class="btn btn--ghost" type="button" data-unpractise="${l.key}">
          Read it again
        </button>
      </div>`}`;
}

function stepLessons() {
  if (openLesson) {
    const l = JA.lessons.find((x) => x.key === openLesson);
    if (l) return lessonDetail(l);
  }

  const total = JA.lessons.reduce((n, l) => n + l.minutes, 0) + JA.irregularDrill.minutes;

  return html`
    <h1 class="t-h1">Your lessons</h1>
    <p class="t-body-lg t-muted" style="max-inline-size:52ch">
      ${JA.lessons.length} lessons and one drill, ${total} minutes in total.
      Ordered by what depends on what. Your deck introduces nationality before
      the sentence that uses it, so we moved the frame first.
    </p>

    ${JA.lessons.map((l) => {
      const done = l.exercises.filter((_, i) => results[l.key + ':' + i]).length;
      const all = done === l.exercises.length;
      return html`
        <section class="card card--roomy card--interactive" style="margin-block-start:var(--space-16)">
          <button class="u-stretch" type="button" data-open-lesson="${l.key}"
                  aria-label="Open lesson ${l.n}: ${l.title}"></button>
          <div class="section-head">
            <h3 class="t-h3">${l.n}. ${l.title}</h3>
            <span class="t-body-sm t-muted">
              ${all ? 'Done' : done ? done + ' of ' + l.exercises.length : l.minutes + ' min'}
            </span>
          </div>
          <p class="t-body-lg">${l.standfirst}</p>
          <p class="t-body t-muted" style="margin-block-start:var(--space-12)">
            ${l.exercises.length} exercises ·
            ${[...new Set(l.exercises.map((e) => EXERCISES[e.type].label))].join(', ')}
          </p>
        </section>`;
    })}

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

    <!-- ONE reminder, covering as many lessons as you like.

         The first version asked for an anchor per lesson, which is five
         decisions to make a week of practice and five notifications to receive
         on the same morning. Five reminders at once is one reminder, and
         nobody sets up five anchors twice.

         So the reminder is the unit and the lessons are its contents. Picking
         which lessons it covers is a multi-select, everything on by default,
         and the reminder rotates through what you have not done recently. -->
    <section class="card card--roomy" style="margin-block-start:var(--space-16)">
      <div class="section-head">
        <h3 class="t-h3">Your daily practice</h3>
        ${anchorToggle('daily')}
      </div>
      <p class="t-body-lg"><strong>${h.behavior}</strong></p>
      <p class="t-body t-muted">${h.why}</p>
      ${anchorFields('daily', h.prompt, '07:00')}

      ${anchorState('daily', '', '').on ? html`
        <p class="t-label" style="margin-block-start:var(--space-24)">
          What this reminder covers
        </p>
        <p class="t-body t-muted">
          ${coveredKeys().length} of ${JA.lessons.length} lessons, plus the
          exceptions drill. It offers whichever you have gone longest without.
        </p>
        <div class="u-row" style="gap:var(--space-8);flex-wrap:wrap;margin-block-start:var(--space-12)">
          ${JA.lessons.map((l) => {
            const on = coveredKeys().includes(l.key);
            return html`
              <button class="${cls('btn', 'btn--sm', on ? 'btn--primary' : 'btn--ghost')}"
                      type="button" data-cover="${l.key}"
                      role="checkbox" aria-checked="${on ? 'true' : 'false'}">
                <span aria-hidden="true">${on ? '✓' : '+'}</span> ${l.n}. ${l.title}
              </button>`;
          })}
        </div>` : ''}
    </section>

    ${createdPanel()}

    ${foot(true, !created.length && anchorState('daily', '', '').on && coveredKeys().length > 0,
           'Set the reminder',
           'data-create-habits')}`;
}

/* Which lessons this one reminder covers. All of them until told otherwise:
   the default should be the whole practice, because someone who just built it
   wants it, and narrowing is the rarer intent. */
function coveredKeys() {
  if (covered === null) return JA.lessons.map((l) => l.key);
  return covered;
}

function anchorState(key, promptText, time) {
  const a = anchors[key] || {};
  return {
    on: a.on !== undefined ? a.on : key === 'daily',
    prompt: a.prompt !== undefined ? a.prompt : promptText,
    time: a.time !== undefined ? a.time : time,
  };
}

function countOn() {
  return anchorState('daily', '', '').on ? 1 : 0;
}

function anchorToggle(key) {
  const on = anchorState(key, '', '').on;
  return html`
    <button class="${cls('btn', 'btn--sm', on ? 'btn--primary' : 'btn--ghost')}"
            type="button" data-anchor-toggle="${key}"
            role="switch" aria-checked="${on ? 'true' : 'false'}">
      ${on ? 'Reminder on' : 'Off'}
    </button>`;
}

/* The anchor and the clock time are the SAME reminder expressed two ways. The
   anchor is what makes it fire in your head; the time is what makes the phone
   fire. Neither works alone, which is why they are edited together. */
function anchorFields(key, promptText, time) {
  const a = anchorState(key, promptText, time);
  if (!a.on) return '';
  return html`
    <div class="u-row" style="gap:var(--space-12);flex-wrap:wrap;margin-block-start:var(--space-12)">
      <label class="field" style="flex:1 1 22ch">
        <span class="t-label">After I…</span>
        <input class="input" type="text" value="${a.prompt}" data-anchor-prompt="${key}">
      </label>
      <label class="field">
        <span class="t-label">Remind me at</span>
        <input class="input" type="time" value="${a.time}" data-anchor-time="${key}">
      </label>
    </div>`;
}

/* What actually happened. Shown only after the bridge has fired, because a
   confirmation before the fact is a promise, not a receipt. */
function createdPanel() {
  if (!created.length) return '';
  const made = created.map((id) => store.habitById(id)).filter(Boolean);
  return html`
    <section class="card card--roomy" style="margin-block-start:var(--space-24)">
      <h3 class="t-h3">${plural(made.length, 'reminder')} set</h3>
      <p class="t-body t-muted">These are real habits now. They are on Home, and Progress counts them.</p>
      <ul class="u-stack" style="gap:var(--space-8);margin-block-start:var(--space-12)">
        ${made.map((m) => html`
          <li class="t-body">
            <strong>${m.behavior}</strong>
            <span class="t-muted"> · ${m.prompt} · ${m.time} · every day</span>
          </li>`)}
      </ul>
      <div class="u-row" style="gap:var(--space-12);margin-block-start:var(--space-16)">
        <a class="btn btn--primary" href="#/home">Open Home ${icon('arrow', 'icon--sm')}</a>
        <a class="btn btn--ghost" href="#/progress">See Progress</a>
      </div>
    </section>`;
}

/* -------------------------------------------------------------------------
   RENDER
------------------------------------------------------------------------- */

const RENDERERS = [stepUpload, stepFound, stepQuestions, stepLessons, stepWhen];

export function render(params) {
  /* Deep link: /learn/<lessonKey> opens that lesson directly. The reminder
     uses it, and so does the Library, so neither has to replay the flow. */
  const key = params && params.key;
  /* Applied ONCE per arrival, not on every render. render() runs again after
     every click, so re-reading the param each time meant closing the lesson
     set openLesson to null and the next render put it straight back - the
     back button looked dead while working perfectly. */
  if (key && key !== appliedKey && JA.lessons.some((l) => l.key === key)) {
    step = 4;
    openLesson = key;
    appliedKey = key;
  }
  if (!key) appliedKey = null;
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

  /* --- lessons ------------------------------------------------------- */
  on(root, 'click', '[data-open-lesson]', (e, el) => {
    openLesson = el.getAttribute('data-open-lesson');
    router.refresh();
  });
  on(root, 'click', '[data-close-lesson]', () => {
    openLesson = null;
    /* Arrived by deep link? Leave the keyed route, or the URL still names a
       lesson and a reload would reopen it. Otherwise a refresh is enough.

       appliedKey is NOT cleared here on purpose: it is cleared by render()
       once a keyless route arrives. Clearing it now would let a render that
       still carries the old param re-open the lesson we are closing. */
    if (router.current() !== '/learn') router.go('/learn');
    else router.refresh();
  });
  on(root, 'click', '[data-practise]', (e, el) => {
    practice[el.getAttribute('data-practise')] = true;
    router.refresh();
  });
  on(root, 'click', '[data-unpractise]', (e, el) => {
    practice[el.getAttribute('data-unpractise')] = false;
    router.refresh();
  });
  on(root, 'click', '[data-reveal]', (e, el) => {
    revealed[el.getAttribute('data-reveal')] = true;
    router.refresh();
  });
  on(root, 'click', '[data-mark]', (e, el) => {
    const id = el.getAttribute('data-mark');
    results[id] = el.getAttribute('data-result');

    /* A lesson counts as run once every exercise in it has been marked. The
       count is what separates "read once" from "practised eleven times", and
       it is recorded here rather than on open, because opening is not
       practising. Logged once per visit: re-marking does not inflate it. */
    const key = id.split(':')[0];
    const l = JA.lessons.find((x) => x.key === key);
    if (l && !logged[key] && l.exercises.every((_, i) => results[key + ':' + i])) {
      logged[key] = true;
      store.completeLesson(key);
    }
    router.refresh();
  });

  /* --- anchors and reminders ------------------------------------------ */
  on(root, 'click', '[data-cover]', (e, el) => {
    const k = el.getAttribute('data-cover');
    const cur = coveredKeys();
    covered = cur.includes(k) ? cur.filter((x) => x !== k) : cur.concat(k);
    router.refresh();
  });
  on(root, 'click', '[data-anchor-toggle]', (e, el) => {
    const k = el.getAttribute('data-anchor-toggle');
    const cur = anchorState(k, '', '');
    anchors[k] = { ...cur, on: !cur.on };
    router.refresh();
  });

  /* Typed values are captured on `input` and NOT re-rendered: a refresh on
     every keystroke would rebuild the field and throw the caret to the end.
     The value is already in the DOM; the store only needs it at submit. */
  on(root, 'input', '[data-anchor-prompt]', (e, el) => {
    const k = el.getAttribute('data-anchor-prompt');
    anchors[k] = { ...anchorState(k, '', ''), prompt: el.value };
  });
  on(root, 'input', '[data-anchor-time]', (e, el) => {
    const k = el.getAttribute('data-anchor-time');
    anchors[k] = { ...anchorState(k, '', ''), time: el.value };
  });

  /* THE BRIDGE. The only place this flow writes to the store, and the moment
     a practice stops being a document and becomes something that will
     interrupt your Tuesday. */
  on(root, 'click', '[data-create-habits]', () => {
    if (created.length) return;                    /* fire once */
    const h = JA.proposedHabit;
    const daily = anchorState('daily', h.prompt, '07:00');
    if (!daily.on || !coveredKeys().length) return;

    /* ONE habit, carrying the lessons it covers. The reminder is the unit; the
       lessons are its contents, and which one it offers is decided when it
       fires rather than now. */
    created.push(store.createHabit({
      behavior: h.behavior, prompt: daily.prompt, celebration: h.celebration,
      why: h.why, time: daily.time, days: h.days, category: 'c-mind',
      lessons: coveredKeys(), sourceId: JA.source.id, origin: 'learn',
    }).id);

    router.refresh();
  });
}
