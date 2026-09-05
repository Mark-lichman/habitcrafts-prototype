/* ============================================================================
   HabitCrafts — views/bindery.js
   THE BINDERY, STEPS 1–3.  #/bindery                                    [#5]

   You bring loose pages; it binds them into something you can keep. This is the
   pipeline all three business-model experiments share — only the source, the
   branding and the invoice differ — so it is the one screen worth building
   properly before any of them is decided.

   THREE STEPS, ONE VIEW. The stage lives in module state rather than the URL
   because a half-configured binding is not a thing anyone should be able to
   link to or reload into. Step 4 (review) IS addressable, because a draft is a
   real object with a real id: it lives in bindery-review.js.

   ------------------------------------------------------------------------
   THE TWO RULES THIS SCREEN EXISTS TO HOLD
   ------------------------------------------------------------------------
   1. THE TOGGLES ARE NOT A WIZARD BRANCH. Lessons, Recall checks and Habits
      are independent switches on one panel. Most sources want all three, and a
      branch would make the common case the longest path.

   2. STEP 3 HAS NO SPINNER. It is the one place in the app where a "loading"
      state could wreck the calm, so the progress is determinate — a real meter
      over real named stages, and the sheet folding into signatures beside it.
      Paper stays quiet; the progress is honest rather than decorative.

   The guiding prompt (1c) is disclosed, not hidden behind a "advanced" fold.
   It is optional, but it is the thing that makes the output feel authored
   rather than machine-made, so a reviewer has to be able to see that it exists.
   ========================================================================= */

import * as store from '../store.js';
import * as router from '../router.js';
import { flag } from '../config.js';
import { SAMPLE_UPLOADS } from '../data-practices.js';
import { html, icon, on, cls } from '../ui.js';

export const meta = {
  title: 'Bindery',
  nav: null,       /* a flow, not a destination — nothing in the nav lights up */
  level: 1,        /* a push → shared-axis X in, mirrored on the way back */
};

/* --------------------------------------------------------------------------
   THE DRAFT
   Module state, deliberately. It is not in the store because an abandoned
   half-configuration is not data — it is a person changing their mind, and
   persisting it would mean every reviewer inherits the last one's mess.
-------------------------------------------------------------------------- */

const BLANK = {
  stage: 'pick',            /* pick → options → binding */
  pick: null,               /* the chosen SAMPLE_UPLOADS entry */
  rights: false,
  outputs: { lessons: true, checks: true, habits: true },
  prompt: '',
  progress: 0,              /* 0–1, drives the meter at stage 3 */
  startedAt: 0,             /* performance.now() when binding began */
  stageLabel: '',
  boundSource: null,
};

let draft = Object.assign({}, BLANK, { outputs: Object.assign({}, BLANK.outputs) });

export function resetDraft() {
  draft = Object.assign({}, BLANK, { outputs: Object.assign({}, BLANK.outputs) });
}

/* --------------------------------------------------------------------------
   STEP 1 — BRING A SOURCE
   An empty desk and one sheet. The drop target is paper — a sheet with a
   turned corner — not the dashed rectangle every upload widget on the web
   uses. A dashed border is a browser convention; this app's ground rule is
   that everything you look at is paper.
-------------------------------------------------------------------------- */

function stepPick() {
  return html`
    <div class="bindery">
      <ol class="bind-steps" aria-label="Bindery progress">
        <li class="bind-steps__step" aria-current="step">Bring a source</li>
        <li class="bind-steps__step">Choose what to make</li>
        <li class="bind-steps__step">Bind</li>
        <li class="bind-steps__step">Review and publish</li>
      </ol>

      <div class="bind-desk">
        <button class="bind-drop" type="button" data-drop
                aria-describedby="drop-help">
          <svg class="bind-sheet" viewBox="0 0 96 120" aria-hidden="true">
            <path class="bind-sheet__page" d="M12 6h56l16 16v92H12z"/>
            <path class="bind-sheet__fold" d="M68 6v16h16"/>
            <path class="bind-sheet__rule" d="M26 46h44M26 60h44M26 74h30"/>
          </svg>
          <span class="bind-drop__title">Drop a PDF here</span>
          <span class="bind-drop__sub t-body-sm">or choose one below</span>
        </button>
        <p id="drop-help" class="visually-hidden">
          The prototype does not read real files. Choosing a sample below binds
          the same pipeline with fixture content.
        </p>
      </div>

      <h2 class="section-head t-label">Or start from a sample</h2>
      <div class="bind-samples">
        ${SAMPLE_UPLOADS.map((s, i) => html`
          <button class="card card--interactive bind-sample" type="button" data-pick="${i}">
            <span class="bind-sample__kind t-label">${s.kind === 'pdf' ? 'PDF' : 'Community library'}</span>
            <span class="bind-sample__title t-h3">${s.title}</span>
            <span class="bind-sample__author t-body-sm t-muted">${s.author} · ${s.pages} pages</span>
            <span class="bind-sample__blurb t-body-sm">${s.blurb}</span>
          </button>`)}
      </div>

      <!-- THE RIGHTS CONFIRMATION.
           A logged checkbox rather than buried terms, and it does not default
           to checked: a confirmation that confirms itself is not one. This is
           the whole copyright position for E1 — the creator owns or licenses
           what they upload — so it gates the Continue button rather than
           sitting decoratively beside it. [#2 §copyright] -->
      <label class="check bind-rights">
        <input type="checkbox" data-rights ${draft.rights ? 'checked' : ''}>
        <span class="t-body-sm">
          I own this source, or I have the rights to turn it into a practice
          programme for an audience.
        </span>
      </label>

      <div class="bind-actions">
        <button class="btn btn--primary" type="button" data-next
                ${!draft.pick || !draft.rights ? 'disabled' : ''}>
          Choose what to make
        </button>
        <a class="btn btn--ghost" href="#/library">Cancel</a>
      </div>
    </div>`;
}

/* --------------------------------------------------------------------------
   STEP 2 — CHOOSE WHAT TO MAKE
   Three switches and a prompt. 1a, 1b and the habits the aim implies, plus 1c
   beneath them in the open.
-------------------------------------------------------------------------- */

const OUTPUTS = [
  {
    key: 'lessons',
    label: 'Lessons',
    help: 'Short readable pieces, one idea each, in weeks.',
  },
  {
    key: 'checks',
    label: 'Recall checks',
    help: 'A question per lesson. Only ever asks what the source actually answers.',
  },
  {
    key: 'habits',
    label: 'Habits',
    help: 'A suggested daily behaviour per lesson — the only output that reaches the habit layer.',
  },
];

function stepOptions() {
  const s = draft.pick;
  const none = !draft.outputs.lessons && !draft.outputs.checks && !draft.outputs.habits;

  return html`
    <div class="bindery">
      <ol class="bind-steps" aria-label="Bindery progress">
        <li class="bind-steps__step is-done">Bring a source</li>
        <li class="bind-steps__step" aria-current="step">Choose what to make</li>
        <li class="bind-steps__step">Bind</li>
        <li class="bind-steps__step">Review and publish</li>
      </ol>

      <div class="card bind-source-row">
        <span class="bind-sample__kind t-label">${s.kind === 'pdf' ? 'PDF' : 'Community library'}</span>
        <span class="t-h3">${s.title}</span>
        <span class="t-body-sm t-muted">${s.author} · ${s.pages} pages</span>
        <button class="btn btn--ghost btn--sm" type="button" data-back-to-pick>Change</button>
      </div>

      <div class="card card--roomy bind-opts">
        ${OUTPUTS.map((o) => html`
          <div class="setting-row">
            <span class="setting-row__body">
              <span class="setting-row__label">${o.label}</span>
              <span class="setting-row__value t-body-sm t-muted">${o.help}</span>
            </span>
            <span class="switch">
              <input type="checkbox" id="out-${o.key}" role="switch"
                     data-output="${o.key}" ${draft.outputs[o.key] ? 'checked' : ''}>
              <span class="switch__track" aria-hidden="true"></span>
              <span class="switch__thumb" aria-hidden="true"></span>
              <label class="visually-hidden" for="out-${o.key}">Make ${o.label}</label>
            </span>
          </div>`)}

        ${none ? html`
          <p class="bind-warn t-body-sm">
            With all three off there is nothing to bind. Turn at least one on.
          </p>` : ''}
      </div>

      <!-- 1c. Disclosed, not hidden. -->
      <div class="card card--roomy">
        <div class="field">
          <label class="field__label" for="bind-prompt">Guide the conversion <span class="t-muted">(optional)</span></label>
          <textarea class="textarea" id="bind-prompt" rows="3" data-prompt
                    placeholder="Keep the language for a team-lead audience, one habit per chapter, no meditation.">${draft.prompt}</textarea>
          <p class="field__help t-body-sm">
            This changes the output, not just the tone — it sets the angle carried on
            every card, and it can anchor the suggested habits to a time of day.
          </p>
        </div>
      </div>

      <div class="bind-actions">
        <button class="btn btn--primary" type="button" data-bind ${none ? 'disabled' : ''}>Bind it</button>
        <button class="btn btn--ghost" type="button" data-back-to-pick>Back</button>
      </div>
    </div>`;
}

/* --------------------------------------------------------------------------
   STEP 3 — BINDING
   The no-spinner rule, built. A determinate meter over named stages, and the
   sheet folding into signatures as sections complete. `.week-meter` is reused
   rather than reinvented: it is already the app's honest-progress component.
-------------------------------------------------------------------------- */

const STAGES = [
  'Reading the source',
  'Finding the ideas that ask you to do something',
  'Writing the lessons',
  'Locating every passage they came from',
  'Drafting the habits',
];

function stepBinding() {
  const pct = Math.round(draft.progress * 100);
  const signatures = 5;
  const folded = Math.floor(draft.progress * signatures);

  return html`
    <div class="bindery">
      <ol class="bind-steps" aria-label="Bindery progress">
        <li class="bind-steps__step is-done">Bring a source</li>
        <li class="bind-steps__step is-done">Choose what to make</li>
        <li class="bind-steps__step" aria-current="step">Bind</li>
        <li class="bind-steps__step">Review and publish</li>
      </ol>

      <div class="card card--roomy bind-binding">
        <svg class="bind-signatures" viewBox="0 0 160 96" role="img"
             aria-label="${folded} of ${signatures} sections folded">
          ${Array.from({ length: signatures }, (_, i) => html`
            <g class="${cls('bind-sig', i < folded && 'is-folded')}"
               style="--i:${i}">
              <path class="bind-sig__leaf" d="M${12 + i * 28} 78 L${12 + i * 28} 20 L${34 + i * 28} 20 L${34 + i * 28} 78 Z"/>
              <path class="bind-sig__spine" d="M${12 + i * 28} 20 L${12 + i * 28} 78"/>
            </g>`)}
        </svg>

        <p class="bind-binding__stage t-body">${draft.stageLabel}</p>

        <div class="week-meter" role="progressbar" aria-valuenow="${pct}"
             aria-valuemin="0" aria-valuemax="100" aria-label="Binding progress">
          <span class="week-meter__bar">
            <span class="week-meter__fill" style="inline-size:${pct}%"></span>
          </span>
          <span class="week-meter__label t-body-sm">${pct}%</span>
        </div>

        <p class="t-body-sm t-muted bind-binding__note">
          Every lesson is being tied back to the page it came from. That is the
          slow part, and it is the part that makes the result publishable.
        </p>
      </div>
    </div>`;
}

/* --------------------------------------------------------------------------
   THE PAYWALL — E3 only
   The wall sits on CONVERSION, never on the check-in. A user who never pays
   still has a complete habit app; what Plus buys is a second source. [#4 §5.4]
-------------------------------------------------------------------------- */

function wall() {
  return html`
    <div class="bindery">
      <section class="hero bind-wall">
        <p class="hero__label">HabitCrafts Plus</p>
        <h1 class="bind-wall__title">Your first practice is free. This is your second.</h1>
        <p class="bind-wall__body t-body">
          Checking in, streaks, progress and everything you have already built stay
          free forever — this wall is on turning new sources into practices, and
          nowhere near the ring.
        </p>
        <p class="bind-wall__price">$6.99<span class="t-body-sm">/month</span>
          <span class="t-body-sm bind-wall__alt">or $49/year</span></p>
        <div class="bind-actions">
          <button class="btn btn--gold" type="button" data-plus>Start Plus</button>
          <a class="btn btn--ghost" href="#/library">Not now</a>
        </div>
      </section>
    </div>`;
}

/* --------------------------------------------------------------------------
   RENDER
-------------------------------------------------------------------------- */

export function render() {
  if (!flag('bindery')) return String(unavailable());
  if (draft.stage === 'pick' && store.needsPlusToBind()) return String(page(wall(), 'Plus'));

  const body =
    draft.stage === 'options' ? stepOptions() :
    draft.stage === 'binding' ? stepBinding() :
    stepPick();

  /* Step 1's heading is the first sentence a stranger reads on a fifteen-minute
     call, so it is the one place the copy speaks to the specific person in the
     chair. A creator is being asked about their book; a consumer is being asked
     about their own reading. Everything after step 1 is the same pipeline and
     says so — a product that renamed itself per audience would be three
     products. */
  const pickHead = flag('bringYourOwn')
    ? ['What are you reading right now?', 'Bring it in and get a week of practice out of it. Takes about a minute.']
    : ['Turn your material into daily practice', 'Bring a source. Loose pages in, something your audience can keep out.'];

  const heads = {
    pick: pickHead,
    options: ['What should it make?', 'Three outputs, independent. Most sources want all three.'],
    binding: ['Binding', 'This takes a moment, and the moment is honest.'],
  };
  const [title, sub] = heads[draft.stage] || heads.pick;
  return String(page(body, title, sub));
}

function page(body, title, sub) {
  return html`
    <div class="page">
      <a class="page-back" href="#/library">${icon('arrow-back', 'icon--sm')} Library</a>
      <header class="page-head">
        <div class="page-head__text">
          <h1 class="t-h1">${title}</h1>
          ${sub ? html`<p class="page-head__sub t-body">${sub}</p>` : ''}
        </div>
      </header>
      ${body}
    </div>`;
}

function unavailable() {
  return html`
    <div class="page">
      <div class="empty-state">
        <p class="empty-state__title">The Bindery is off in this configuration</p>
        <p class="empty-state__body t-body">
          Switch to an experiment that turns it on using the control at the top
          of the screen.
        </p>
        <a class="btn btn--primary" href="#/home">Back to today</a>
      </div>
    </div>`;
}

/* --------------------------------------------------------------------------
   MOUNT
-------------------------------------------------------------------------- */

export function mount(root) {
  /* --- the binding animation ------------------------------------------
     Driven imperatively against the mounted DOM, NOT by re-rendering.

     This is the same rule the check-in gesture follows and it matters for the
     same reason: `router.refresh()` tears the view down (destroy → render →
     mount), so a ticking meter that called refresh would cancel its own timer
     on the first tick and replace every animating node on the ones after. The
     view renders the binding stage once at 0%; this walks it to 100%.        */
  let raf = null;
  if (draft.stage === 'binding') {
    const fill = root.querySelector('.week-meter__fill');
    const meter = root.querySelector('[role="progressbar"]');
    const pctLabel = root.querySelector('.week-meter__label');
    const stageLabel = root.querySelector('.bind-binding__stage');
    const sigs = Array.from(root.querySelectorAll('.bind-sig'));
    const source = draft.boundSource;
    const TOTAL = 2600;

    /* Elapsed time is kept on the draft, not in this closure. A store commit
       anywhere re-renders the mounted view, which would otherwise restart the
       meter from zero; reading a shared start time means a remount RESUMES. */
    const tick = (now) => {
      const t = Math.min(1, (now - draft.startedAt) / TOTAL);
      draft.progress = t;
      const pct = Math.round(t * 100);
      if (fill) fill.style.inlineSize = pct + '%';
      if (meter) meter.setAttribute('aria-valuenow', String(pct));
      if (pctLabel) pctLabel.textContent = pct + '%';
      if (stageLabel) {
        stageLabel.textContent = STAGES[Math.min(STAGES.length - 1, Math.floor(t * STAGES.length))];
      }
      const folded = Math.floor(t * sigs.length);
      sigs.forEach((g, i) => g.classList.toggle('is-folded', i < folded));

      if (t < 1) { raf = requestAnimationFrame(tick); return; }

      raf = null;
      const practice = source && store.bindSource(source.id, {
        lessons: draft.outputs.lessons,
        checks: draft.outputs.checks,
        habits: draft.outputs.habits,
        prompt: draft.prompt,
      });
      resetDraft();
      if (practice) router.go('/bindery/' + practice.id + '/review');
      else router.go('/library');
    };
    raf = requestAnimationFrame(tick);
  }

  on(root, 'click', '[data-pick]', (e, el) => {
    draft.pick = SAMPLE_UPLOADS[Number(el.getAttribute('data-pick'))] || null;
    router.refresh();
  });

  /* The drop target does not read files. It picks the first sample and says so
     — a prototype that pretended to parse a PDF would be lying about the one
     thing this screen is not testing. */
  on(root, 'click', '[data-drop]', () => {
    draft.pick = SAMPLE_UPLOADS[0];
    router.refresh();
  });

  on(root, 'change', '[data-rights]', (e, el) => {
    draft.rights = el.checked;
    router.refresh();
  });

  on(root, 'click', '[data-next]', () => {
    if (!draft.pick || !draft.rights) return;
    draft.stage = 'options';
    router.refresh();
  });

  on(root, 'click', '[data-back-to-pick]', () => {
    draft.stage = 'pick';
    router.refresh();
  });

  on(root, 'change', '[data-output]', (e, el) => {
    draft.outputs[el.getAttribute('data-output')] = el.checked;
    router.refresh();
  });

  /* The prompt is read on the way out rather than on every keystroke: a
     re-render per character would move the caret to the end of the field. */
  on(root, 'input', '[data-prompt]', (e, el) => { draft.prompt = el.value; });

  on(root, 'click', '[data-plus]', () => {
    store.startPlus();
    router.refresh();
  });

  on(root, 'click', '[data-bind]', () => {
    const box = root.querySelector('[data-prompt]');
    if (box) draft.prompt = box.value;

    /* The source is recorded now, with the rights confirmation the reviewer
       actually ticked — not defaulted in, which would make the checkbox
       decorative. */
    draft.boundSource = store.addSource(Object.assign({}, draft.pick, { rightsConfirmed: true }));
    draft.stage = 'binding';
    draft.progress = 0;
    draft.startedAt = performance.now();
    draft.stageLabel = STAGES[0];
    router.refresh();       /* renders the binding stage; its mount drives it */
  });

  /* The frame loop must not outlive the view: left running it would navigate a
     reviewer who had already walked away from the screen. */
  return function destroy() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  };
}
