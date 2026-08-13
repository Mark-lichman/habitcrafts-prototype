/* ============================================================================
   HabitCrafts — views/create.js
   THE WORKBENCH. [D §3.4] "The one screen where the Crafts in the name is
   literal."

   Four Fogg questions in the direction's order — Behavior → Prompt →
   Celebration → Goal. Lead with the doable thing, end with the meaning. Every
   step stays on screen; there is no wizard and no wall of fields. The live
   habit card on the right assembles as you type, and it is the exact card that
   will appear on Home.

   ------------------------------------------------------------------------
   WHAT THIS FILE DOES AND WHAT prototype.js DOES
   ------------------------------------------------------------------------
   The whole *feel* of this screen already exists: `prototype.js`'s Create Habit
   module owns [data-craft*] and does the live preview, the step ticks, the day
   picker, the reminder sentence, the template fill and the submit gating. This
   view renders that contract and adds the two things the static screen could
   not have: real data in, and a real habit out.

     · the templates are real `data.ideas`, filtered to the ones you have not
       already taken;
     · the 5+ habits note is driven by `store.activeHabits()`, not a devbar
       toggle;
     · submit calls `store.createHabit()` and routes to Home, where the new
       habit is on the list before the transition finishes.

   ONE DELIBERATE PLACEMENT: `data-craft` sits on the `.page` <div>, not on the
   <form>. `initCraft` installs its own `submit` handler *only* when its root is
   a FORM — a handler that preventDefaults and announces "nothing is saved",
   which is no longer true. Rooting the module on the wrapper leaves the form
   free for this view's own submit, and every [data-craft-*] hook still resolves
   because they all live inside the wrapper.

   ------------------------------------------------------------------------
   THE FIELD NAMES
   ------------------------------------------------------------------------
   A habit stores four fields. The fourth, `why`, is the answer to "What will
   success look like?" (see data.js). Its HC hook is named `goal` because that
   is the name `paintCraft` checks when it decides whether the form is ready —
   the hook name is prototype.js's vocabulary, `why` is the store's. The mapping
   is done once, in `readDraft()`.
   ========================================================================= */

import * as store from '../store.js';
import * as router from '../router.js';
import { html, icon, on } from '../ui.js';

export const meta = {
  title: 'Create a habit',
  nav: null,        /* a task flow entered from the FAB, not a destination */
  level: 0,         /* still a top-level surface → fade-through */
  /* No ownsCheckIn. The preview card is data-habit="preview", which app.js
     ignores, so a press on it never reaches the store and never re-renders. */
};

/* --------------------------------------------------------------------------
   THE DRAFT

   The form's own state lives here rather than only in the DOM, for two
   reasons. First, `render` is called again from scratch on every store change
   (a "Reset data" from the harness, the commit of this very form), and a
   half-written habit must not evaporate underneath the person writing it.
   Second, it is where Explore hands an idea over.

   It is cleared when the view is torn down for a *navigation* — the hash has
   already changed by then, which is what tells a real exit apart from a
   re-render, where the hash is still #/create.
-------------------------------------------------------------------------- */

const DAY_LABELS = [
  ['Mon', 1], ['Tues', 2], ['Wed', 3], ['Thurs', 4],
  ['Fri', 5], ['Sat', 6], ['Sun', 0],
];

function blank() {
  return {
    behavior: '', prompt: '', celebration: '', goal: '',
    days: [], time: '07:00', remind: false, category: '',
  };
}

let draft = blank();

/**
 * Hand this view a starting point. Explore calls it with an idea and then
 * routes to #/create; the workbench opens already assembled, and the preview
 * card lands with the same spring-snap settle a template gets. [D §3.4]
 */
export function prefillFrom(idea) {
  draft = Object.assign(blank(), {
    behavior: idea.behavior || '',
    prompt: idea.prompt || '',
    celebration: idea.celebration || '',
    goal: idea.why || '',
    category: idea.cat || '',
    prefilled: true,
  });
}

/** draft → the shape `store.createHabit` wants. */
function toHabit(d) {
  return {
    behavior: d.behavior,
    prompt: d.prompt,
    celebration: d.celebration,
    why: d.goal,                               /* "What will success look like?" */
    days: d.remind ? d.days.map(labelToNum).filter((n) => n !== undefined) : [],
    time: d.remind ? d.time : '',
    category: d.category || undefined,
  };
}

function labelToNum(label) {
  const row = DAY_LABELS.find((r) => r[0] === label);
  return row ? row[1] : undefined;
}

/* --------------------------------------------------------------------------
   PIECES
-------------------------------------------------------------------------- */

/** The numbered kicker every step carries. HC swaps the digit for a tick. */
function kicker(n, type, id) {
  return html`
    <p class="craft-step__kicker">
      <span class="craft-step__ordinal">
        <span data-craft-ordinal>${n}</span>
        <svg class="icon" data-craft-check hidden aria-hidden="true"><use href="#i-check"></use></svg>
      </span>
      <span class="craft-step__type" id="${id}">${type}</span>
    </p>`;
}

/**
 * The live preview. `data-habit="preview"` keeps it out of the day arc's count
 * (app.js drops the event too, so nothing reaches the store) — but the ring is
 * real: press and hold it and your own celebration text unfurls, which is the
 * entire reason the screen asks for one. [D §2.2 / §3.4]
 */
function previewCard(d) {
  const metaLine = d.prompt || 'It takes shape here as you write.';
  return html`
    <article class="card habit-card" data-habit="preview"
             ${d.celebration ? html`data-celebration="${d.celebration}"` : ''}>
      <div class="habit-card__body">
        <h3 class="habit-card__title">${d.behavior || 'Your habit'}</h3>
        <p class="habit-card__meta">${metaLine}</p>
        <p class="habit-card__echo" data-echo hidden></p>
      </div>
      <button class="btn btn--ghost btn--sm habit-card__undo" type="button" data-undo hidden>Undo</button>
      <button class="ring" type="button" data-checkin aria-pressed="false"
              aria-label="Try it: ${d.behavior || 'your habit'}. Press and hold to complete.">
        <svg class="ring__svg" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
          <circle class="ring__track" cx="22" cy="22" r="16" pathLength="100"/>
          <circle class="ring__fill"  cx="22" cy="22" r="16" pathLength="100"/>
          <path class="ring__check" d="M14.6 22.4l5.1 5.1 9.7-10.6" pathLength="100"/>
        </svg>
        <span class="ring__hint" data-ring-hint hidden>Hold to check in</span>
      </button>
    </article>`;
}

/** Three ideas you have not taken yet, as one-press starting points. */
function templateChips() {
  const taken = new Set(store.activeHabits().map((h) => h.behavior));
  const picks = store.data.ideas.filter((i) => !taken.has(i.behavior)).slice(0, 3);
  if (!picks.length) return '';
  return html`
    <div class="u-flow-tight u-wrap" style="margin-block-start:var(--space-8)">
      ${picks.map((i) => html`
        <button class="chip chip--brand" type="button" data-craft-template
                data-behavior="${i.behavior}" data-prompt="${i.prompt}"
                data-celebration="${i.celebration}" data-goal="${i.why}">${i.behavior}</button>`)}
    </div>`;
}

/* --------------------------------------------------------------------------
   RENDER
-------------------------------------------------------------------------- */

export function render() {
  const d = draft;
  const active = store.activeHabits().length;
  const crowded = active >= 5;

  return String(html`
    <!-- data-craft on the wrapper, not the form. See the header note. -->
    <div class="page" data-craft>

      <header style="margin-block-end:var(--space-24)">
        <h1 class="t-h1">Create a habit</h1>
        <p class="t-body-lg t-muted" style="margin-block-start:var(--space-4)">
          Keep it small, you can always do more.
        </p>
      </header>

      <form class="craft-layout" novalidate data-create-form>

        <div class="craft-steps">

          <!-- STARTING POINTS. The app's "Need inspiration?" link survives and
               now goes to a real destination. Choosing a chip fills the whole
               object at once and the preview lands with one settle. [D §3.4] -->
          <section class="card" aria-labelledby="tpl-h">
            <div class="u-between u-wrap">
              <h2 id="tpl-h" class="t-label">Start from something that works</h2>
              <a class="text-link" href="#/explore">
                Need inspiration? ${icon('arrow', 'icon--sm')}
              </a>
            </div>
            ${templateChips()}
          </section>

          <!-- 1 · BEHAVIOR -->
          <section class="card card--roomy craft-step" data-craft-step="behavior"
                   aria-labelledby="k-behavior q-behavior">
            ${kicker(1, 'Behavior', 'k-behavior')}
            <label class="craft-step__question" id="q-behavior" for="f-behavior">What will you do?</label>
            <p class="craft-step__help">Small enough that you could still do it on your worst day.</p>
            <div class="craft-step__control">
              <input class="input" id="f-behavior" type="text" data-craft-field="behavior"
                     style="inline-size:100%" autocomplete="off"
                     placeholder="Meditate for two minutes" value="${d.behavior}">
            </div>
          </section>

          <!-- 2 · PROMPT. The real day/time picker inline rather than in a
               bottom sheet: on a workbench you should see the whole object at
               once. -->
          <section class="card card--roomy craft-step" data-craft-step="prompt"
                   aria-labelledby="k-prompt q-prompt">
            ${kicker(2, 'Prompt', 'k-prompt')}
            <label class="craft-step__question" id="q-prompt" for="f-prompt">When will you do it?</label>
            <p class="craft-step__help">A habit you already have makes the steadiest cue.</p>
            <div class="craft-step__control">
              <input class="input" id="f-prompt" type="text" data-craft-field="prompt"
                     style="inline-size:100%" autocomplete="off"
                     placeholder="After I pour my morning coffee" value="${d.prompt}">

              <div class="setting-row" style="margin-block-start:var(--space-16)">
                <div class="setting-row__body">
                  <span class="setting-row__label">Set a schedule</span>
                  <span class="setting-row__value reminder-line">
                    ${icon('bell')}
                    <span data-craft-reminder>No reminder set</span>
                  </span>
                </div>
                <span class="switch">
                  <input type="checkbox" id="f-remind" role="switch" data-craft-remind
                         ${d.remind ? 'checked' : ''}>
                  <span class="switch__track" aria-hidden="true"></span>
                  <span class="switch__thumb" aria-hidden="true"></span>
                  <label class="visually-hidden" for="f-remind">Set a schedule for this habit</label>
                </span>
              </div>

              <!-- Off by default, and off means every day: store.createHabit
                   treats an empty schedule as the whole week. -->
              <div data-craft-schedule ${d.remind ? '' : 'hidden'}>
                <p class="field__label" id="daypick-label"
                   style="margin-block:var(--space-16) var(--space-8)">Which days?</p>
                <div class="daypick" role="group" aria-labelledby="daypick-label">
                  ${DAY_LABELS.map(([label]) => html`
                    <button class="daypick__day" type="button" data-craft-day="${label}"
                            aria-pressed="${d.days.includes(label) ? 'true' : 'false'}">
                      <span>${label}</span><span class="daypick__dot" aria-hidden="true"></span>
                    </button>`)}
                  <button class="btn btn--secondary btn--sm" type="button"
                          data-craft-selectall aria-pressed="false">Select All</button>
                </div>

                <div class="field" style="margin-block-start:var(--space-16);max-inline-size:200px">
                  <label class="field__label" for="f-time">At what time?</label>
                  <input class="input" id="f-time" type="time" value="${d.time}" data-craft-time>
                </div>
              </div>
            </div>
          </section>

          <!-- 3 · CELEBRATION. THE SCREEN'S ONE HERO SURFACE. [D §2.2, §3.4]
               The app already asks this and then buries the answer in 10px
               text. Here the question gets the deep-blue paper and the answer
               is written straight onto it, in the same italic display face and
               the same size it will unfurl in inside the card at check-in.
               This field is a promise being made, not a form input. -->
          <section class="hero craft-step" data-craft-step="celebration"
                   aria-labelledby="k-celebration q-celebration">
            ${kicker(3, 'Celebration', 'k-celebration')}
            <label class="craft-step__question" id="q-celebration" for="f-celebration">How will you celebrate?</label>
            <p class="craft-step__help u-flow-tight">
              ${icon('bulb', 'icon--sm')}
              <span>Something that brings you joy!</span>
            </p>

            <div class="craft-step__control">
              <input class="input input--on-hero" id="f-celebration" type="text"
                     data-craft-field="celebration" autocomplete="off"
                     placeholder="Fist pump!" value="${d.celebration}">
            </div>

            <div class="u-flow-tight u-wrap" style="margin-block-start:var(--space-12)">
              ${['Fist pump!', "Say out loud: that's who I am now.", 'Stretch and smile.', 'Nice.']
                .map((c) => html`
                  <button class="chip chip--brand" type="button" data-craft-template
                          data-celebration="${c}">${c}</button>`)}
            </div>

            <p class="promise-echo">
              <span class="promise-echo__text" data-craft-echo></span>
              <span class="promise-echo__caption" data-craft-echo-caption>
                Whatever you write here comes back to you, word for word, every time you check in.
              </span>
            </p>
          </section>

          <!-- 4 · GOAL. Stored as the habit's "why" field. (No backticks in a
               comment inside a template literal — they close it.) -->
          <section class="card card--roomy craft-step" data-craft-step="goal"
                   aria-labelledby="k-goal q-goal">
            ${kicker(4, 'Goal', 'k-goal')}
            <label class="craft-step__question" id="q-goal" for="f-goal">What will success look like?</label>
            <p class="craft-step__help">Reuse one of your goals, or write a new one.</p>
            <div class="craft-step__control">
              <input class="input" id="f-goal" type="text" data-craft-field="goal"
                     list="recent-goals" style="inline-size:100%" autocomplete="off"
                     placeholder="Two minutes of quiet before anyone needs anything from me."
                     value="${d.goal}">
              <datalist id="recent-goals">
                ${store.activeHabits().filter((h) => h.why).slice(0, 3)
                  .map((h) => html`<option value="${h.why}"></option>`)}
              </datalist>
            </div>
          </section>

          <!-- The app's blocking "More than 7 habits?" alert is cut. The same
               care arrives as supportive inline copy, before the button rather
               than as a dialog after it. [D §3.4] -->
          ${crowded ? html`
            <section class="card card--tinted" data-craft-crowded aria-labelledby="crowded-h">
              <h2 id="crowded-h" class="t-label">You already keep ${active} habits</h2>
              <p class="t-body t-muted" style="margin-block-start:var(--space-4)">
                That's a lot to keep. Consider finishing one first — this one will
                still be here.
              </p>
            </section>` : ''}

          <div class="u-flow u-wrap" style="margin-block-start:var(--space-8)">
            <button class="btn btn--primary" type="submit" data-craft-submit
                    disabled aria-disabled="true">Create habit</button>
            <a class="btn btn--ghost" href="#/home">Cancel</a>
            <span class="t-body-sm t-muted" data-craft-needs>
              A behavior, a prompt and a goal finish it.
            </span>
          </div>
        </div>

        <!-- THE LIVE PREVIEW — the hero of this screen in the "eye hits first"
             sense. The exact card that will appear on Home, assembling field by
             field as you type. [D §3.4] -->
        <aside class="craft-aside" aria-labelledby="preview-h">
          <div class="craft-preview" data-craft-preview>
            <h2 id="preview-h" class="t-label t-muted" style="margin-block-end:var(--space-8)">
              As it will look on Home
            </h2>
            ${previewCard(d)}
            <p class="craft-preview__caption">Press and hold the ring to try it.</p>
          </div>

          <!-- 1200+ only: the rail is a real column there, so it can carry the
               reasoning behind the order of the questions. -->
          <section class="card craft-aside__desk" aria-labelledby="order-h">
            <h2 id="order-h" class="t-label t-muted">Why this order</h2>
            <p class="t-body-sm" style="margin-block-start:var(--space-8)">
              Behavior first, because it's the doable part. Then the prompt that
              fires it, then the celebration that makes it stick — and the goal
              last, because that's the intimidating one.
            </p>
            <p class="t-body-sm t-muted" style="margin-block-start:var(--space-12)">
              The celebration is the only part the app hands back to you: every
              check-in, in your own words.
            </p>
          </section>
        </aside>
      </form>
    </div>`);
}

/* --------------------------------------------------------------------------
   THE ASSEMBLY — why this lives here and not in prototype.js

   prototype.js's Create Habit module is the designed owner of every
   [data-craft-*] hook, and it is not to be rewritten. But it is unreachable
   from a router-injected view: unlike the Progress, Community, primitives and
   remaining-screens modules — each of which reassigns `HC.init` to chain
   itself on — that module only calls its `boot()` once, on DOMContentLoaded,
   against `document`. At that instant no view has been rendered, and it is
   never invited back. Verified in Chrome: typing into a field on #/create left
   the preview, the step ticks and the submit button untouched.

   So this view carries the behaviour, keyed off exactly the same attributes and
   producing exactly the same DOM writes. If the chain is ever fixed upstream
   the two agree rather than fight: both are pure repaints of the same read.
-------------------------------------------------------------------------- */

const DAY_ORDER = DAY_LABELS.map(([l]) => l);

function fmtTime(v) {
  if (!v) return '';
  const [hh, mm = '00'] = String(v).split(':');
  const h = parseInt(hh, 10);
  if (isNaN(h)) return '';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return h12 + ':' + mm + ' ' + (h >= 12 ? 'PM' : 'AM');
}

/** The app's own reminder sentence. Empty until it is a real, complete one — a
    half-set reminder must never be written onto the card as if it meant something. */
function reminderText(d) {
  if (!d.remind) return '';
  const time = fmtTime(d.time);
  if (!d.days.length || !time) return '';
  const days = DAY_ORDER.filter((l) => d.days.includes(l));
  return (days.length === 7 ? 'Every day' : days.join(', ')) + ' at ' + time;
}

function reminderStatus(d) {
  if (!d.remind) return 'No reminder set';
  return reminderText(d) || (d.days.length ? 'Pick a time' : 'Pick the days it should reach you');
}

/**
 * Repaint everything derived from the form. Called on every input.
 *
 * The step state is a fill change AND a glyph, never colour alone. The tick is
 * an <svg>, and `hidden` is an HTMLElement IDL property — assigning
 * `el.hidden` on an SVGElement sets a JS expando and leaves the content
 * attribute, and therefore `[hidden]` in CSS, untouched. Toggle the attribute.
 */
function paint(root) {
  const d = Object.assign(draft, readDom(root));
  const reminder = reminderText(d);

  const done = {
    behavior: !!d.behavior, prompt: !!d.prompt,
    celebration: !!d.celebration, goal: !!d.goal,
  };
  root.querySelectorAll('[data-craft-step]').forEach((step) => {
    const isDone = !!done[step.getAttribute('data-craft-step')];
    step.classList.toggle('is-done', isDone);
    const num = step.querySelector('[data-craft-ordinal]');
    const tick = step.querySelector('[data-craft-check]');
    if (num) num.hidden = isDone;
    if (tick) isDone ? tick.removeAttribute('hidden') : tick.setAttribute('hidden', '');
  });

  /* The live card. data-habit="preview" keeps it out of the day arc's count. */
  const preview = root.querySelector('[data-craft-preview]');
  if (preview) {
    const card = preview.querySelector('[data-habit]');
    const title = preview.querySelector('.habit-card__title');
    const line = preview.querySelector('.habit-card__meta');
    if (title) title.textContent = d.behavior || 'Your habit';
    if (line) {
      const bits = [d.prompt, reminder].filter(Boolean);
      line.textContent = bits.length ? bits.join(' · ') : 'It takes shape here as you write.';
    }
    if (card) {
      if (d.celebration) card.setAttribute('data-celebration', d.celebration);
      else card.removeAttribute('data-celebration');
      const ring = card.querySelector('[data-checkin]');
      if (ring && !card.classList.contains('is-complete')) {
        ring.setAttribute('aria-label',
          'Try it: ' + (d.behavior || 'your habit') + '. Press and hold to complete.');
      }
    }
  }

  /* The promise, echoed on the hero in the exact face it will unfurl in. */
  const echo = root.querySelector('[data-craft-echo]');
  const cap = root.querySelector('[data-craft-echo-caption]');
  if (echo) echo.textContent = d.celebration;
  if (cap) {
    cap.textContent = d.celebration
      ? 'This is what unfurls inside the card the moment you check in.'
      : 'Whatever you write here comes back to you, word for word, every time you check in.';
  }

  root.querySelectorAll('[data-craft-reminder]').forEach((el) => {
    el.textContent = reminderStatus(d);
  });

  const all = root.querySelector('[data-craft-selectall]');
  if (all) {
    const every = d.days.length === 7;
    all.textContent = every ? 'Unselect All' : 'Select All';
    all.setAttribute('aria-pressed', String(every));
  }

  /* The app's real rule: a behavior, a prompt and a goal finish it. */
  const submit = root.querySelector('[data-craft-submit]');
  const ready = !!(d.behavior && d.prompt && d.goal);
  if (submit) {
    submit.disabled = !ready;
    submit.setAttribute('aria-disabled', String(!ready));
  }
  const needs = root.querySelector('[data-craft-needs]');
  if (needs) needs.hidden = ready;
}

/** The spring-snap settle a filled-in-at-once card lands with. The reduced
    branch is in JS: this runs from script, and a CSS-only branch would look
    like it worked and would not. [README §12.3] */
function settle(root) {
  const preview = root.querySelector('[data-craft-preview]');
  if (!preview || (window.HC && window.HC.reducedMotion())) return;
  preview.classList.remove('is-settling');
  void preview.offsetWidth;
  preview.classList.add('is-settling');
  window.setTimeout(() => preview.classList.remove('is-settling'), 560);
}

/* --------------------------------------------------------------------------
   MOUNT
-------------------------------------------------------------------------- */

export function mount(root) {
  const repaint = () => paint(root);

  /* Delegated on the view root, and bound ONCE per root.
     `router.refresh()` calls mount() again on the same element, so an
     unguarded `on(root, …)` would stack a second copy of every handler — and a
     second copy of a toggle is a toggle that never happens. Guarded exactly the
     way prototype.js guards its own bindings. Nothing below captures a node
     that innerHTML will replace; everything is re-queried when it fires. */
  if (!root.__hcCreateBound) {
    root.__hcCreateBound = true;

    on(root, 'input', '[data-craft-field], [data-craft-time]', repaint);

    on(root, 'click', '[data-craft-day]', (e, btn) => {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true'));
      repaint();
    });

    on(root, 'click', '[data-craft-selectall]', () => {
      const every = readDom(root).days.length === 7;
      root.querySelectorAll('[data-craft-day]').forEach((b) => {
        b.setAttribute('aria-pressed', String(!every));
      });
      repaint();
    });

    on(root, 'change', '[data-craft-remind]', (e, box) => {
      const region = root.querySelector('[data-craft-schedule]');
      if (region) region.hidden = !box.checked;
      repaint();
      if (window.HC) window.HC.announce(box.checked ? 'Schedule on.' : 'Schedule off — every day.');
    });

    /* A template fills the whole object at once and lands with one settle. */
    on(root, 'click', '[data-craft-template]', (e, btn) => {
      ['behavior', 'prompt', 'celebration', 'goal'].forEach((k) => {
        const v = btn.getAttribute('data-' + k);
        const el = root.querySelector('[data-craft-field="' + k + '"]');
        if (el && v !== null) el.value = v;
      });
      repaint();
      settle(root);
      if (window.HC) {
        window.HC.announce('Filled in: ' +
          (btn.getAttribute('data-behavior') || btn.getAttribute('data-celebration') || 'a suggestion') + '.');
      }
    });
  }

  /* An idea arriving from Explore lands the same way a template does. */
  if (draft.prefilled) {
    draft.prefilled = false;
    settle(root);
    if (window.HC) window.HC.announce('Filled in from Habit ideas. Change anything you like.');
  }

  /* First paint: the preview, the ticks and the submit gate must already agree
     with whatever the draft put in the markup. */
  repaint();

  /* THE ROUND TRIP. This is the whole point of the view: a real habit into the
     store, then Home — where it is on the list before the transition has
     finished, because Home renders from the same array this just wrote to.

     Bound to the <form>, which innerHTML replaces on every render, so this one
     is re-attached each mount rather than guarded. */
  const form = root.querySelector('[data-create-form]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.assign(draft, readDom(root));
      if (!d.behavior) return;          /* prototype scope: no validation UI */
      store.createHabit(toHabit(d));
      draft = blank();
      router.go('/home');
    });
  }

  /* The draft survives a re-render but not a real exit. By the time destroy()
     runs on a navigation the hash has already moved on, which is exactly what
     tells the two apart — on a re-render it is still #/create. */
  return function destroy() {
    if (!String(window.location.hash).startsWith('#/create')) draft = blank();
  };
}

/** Read the workbench back out of the DOM. */
function readDom(root) {
  const val = (name) => {
    const el = root.querySelector('[data-craft-field="' + name + '"]');
    return el ? el.value.trim() : '';
  };
  const remindEl = root.querySelector('[data-craft-remind]');
  const timeEl = root.querySelector('[data-craft-time]');
  return {
    behavior: val('behavior'),
    prompt: val('prompt'),
    celebration: val('celebration'),
    goal: val('goal'),
    remind: !!(remindEl && remindEl.checked),
    time: (timeEl && timeEl.value) || '07:00',
    days: Array.from(root.querySelectorAll('[data-craft-day]'))
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.getAttribute('data-craft-day')),
    category: draft.category,
  };
}
