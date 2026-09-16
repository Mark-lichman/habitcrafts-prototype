/* ============================================================================
   HabitCrafts — views/today.js
   THE SCREEN YOU OPEN ON A TRAIN.

   Everything due across every deck, one card at a time. This is what the app is
   for, and until now no screen did it: the Library lists what you have uploaded
   and the lesson flow walks one deck in order, but neither answers "I have nine
   minutes, what should I look at".

   ---------------------------------------------------------------------------
   ONE CARD, NOT A LIST — AND WHY THAT IS NOT A DUPLICATE OF learn.js
   ---------------------------------------------------------------------------
   learn.js shows every exercise in a lesson at once, which is right when you
   have just read the lesson and are working through it. This shows exactly one,
   because a review session is a different activity: you are not studying a
   topic, you are being asked whether you still know something. A list would let
   you read ahead, and reading ahead is the thing the whole reading/practice
   split exists to prevent.

   So this is a second component, not a second copy of one. It shares the card
   classes and the token vocabulary; it does not share the exercise list.

   ---------------------------------------------------------------------------
   THE QUEUE IS FROZEN WHEN THE SESSION STARTS
   ---------------------------------------------------------------------------
   `dueCards()` is a live selector: answering a card changes what it returns. If
   the view read it on every render, marking a card would reshuffle the deck
   underneath the person holding the phone, and the next card would depend on
   the answer they just gave. That is disorienting and it makes the session
   unrepeatable.

   So the queue is taken once, held in module state, and walked. Cards missed
   during the session are appended to the end rather than re-sorted in, which is
   what "again today" means in a box system: before you close the app, not
   immediately after seeing the answer.
-------------------------------------------------------------------------- */

import * as store from '../store.js';
import * as router from '../router.js';
import { dueCards, dueSummary } from '../study.js';
import * as srs from '../srs.js';
import { html, icon, cls, on, plural } from '../ui.js';

/* --------------------------------------------------------------------------
   MODULE STATE
   Same reasoning as learn.js: this is view state, not app state. Which card is
   showing and whether its answer is revealed are worth nothing tomorrow, and
   putting them in the store would mean a reload resumed you mid-card with the
   answer already up.
-------------------------------------------------------------------------- */

let queue = [];         /* the frozen session */
let at = 0;             /* index into it */
let revealed = false;
let answered = 0;       /* how many marks this session, for the progress line */

/** A session is a fresh queue. Called on arrival and by "Practise again". */
function startSession() {
  queue = dueCards({ limit: 20 });
  at = 0;
  revealed = false;
  answered = 0;
}

export function resetSession() { startSession(); }

/* --------------------------------------------------------------------------
   THE STATES THIS SCREEN HAS

   Three, and the empty ones matter as much as the full one. "Nothing due" is a
   success and has to read like one; a screen that looks broken when you are
   finished teaches you to distrust it.
-------------------------------------------------------------------------- */

function nothingDue(sum) {
  return html`
    <div class="page">
      <header class="page-head">
        <div class="page-head__text">
          <h1 class="t-h1">Nothing due</h1>
          <p class="page-head__sub t-body">
            ${sum.total
              ? `All ${plural(sum.total, 'card')} across ${plural(sum.sources, 'deck')} are ahead of schedule.`
              : 'Upload something and it will show up here.'}
          </p>
        </div>
      </header>

      ${sum.total ? html`
        <section class="card card--roomy" style="margin-block-start:var(--space-24)">
          <p class="t-body">
            Coming back tomorrow is the whole mechanism. A card you answered
            today is not worth more contact today: the interval is what makes it
            stick.
          </p>
          <a class="btn btn--ghost" href="#/library" style="margin-block-start:var(--space-16)">
            See your decks ${icon('arrow', 'icon--sm')}
          </a>
        </section>` : html`
        <section class="card card--roomy" style="margin-block-start:var(--space-24)">
          <a class="btn btn--primary" href="#/learn">Upload something ${icon('arrow', 'icon--sm')}</a>
        </section>`}
    </div>`;
}

function sessionDone(sum) {
  return html`
    <div class="page">
      <header class="page-head">
        <div class="page-head__text">
          <h1 class="t-h1">Done for now</h1>
          <p class="page-head__sub t-body">
            ${plural(answered, 'card')} answered.
            ${sum.due ? `${sum.due} still due if you have another minute.` : 'Nothing else is due today.'}
          </p>
        </div>
      </header>

      <section class="card card--roomy" style="margin-block-start:var(--space-24)">
        ${sum.due ? html`
          <button class="btn btn--primary" type="button" data-again>
            Keep going ${icon('arrow', 'icon--sm')}
          </button>` : html`
          <p class="t-body">
            Everything you missed today will come back today. Everything you got
            moves further out.
          </p>`}
        <a class="btn btn--ghost" href="#/library" style="margin-block-start:var(--space-16)">
          See your decks
        </a>
      </section>
    </div>`;
}

/* --------------------------------------------------------------------------
   THE CARD

   The answer is hidden until asked for, and the SOURCE of the card is shown
   only after. Before, it would narrow the answer for free: "Japanese · Lesson 6"
   above a prompt tells you which twenty words it is one of.
-------------------------------------------------------------------------- */

function card(c, sum) {
  const e = c.exercise;
  const answer = Array.isArray(e.options) && e.options.length ? e.options[e.answer] : e.answer;

  return html`
    <div class="page">
      <header class="page-head">
        <div class="page-head__text">
          <h1 class="t-h1">Today</h1>
          <p class="page-head__sub t-body">
            ${at + 1} of ${queue.length}${sum.due > queue.length
              ? ` · ${sum.due} due in all` : ''}
          </p>
        </div>
      </header>

      <section class="card card--roomy" style="margin-block-start:var(--space-24)">
        <div class="section-head">
          <span class="chip chip--sm">${e.type}</span>
          <span class="t-body-sm t-muted">${srs.boxLabel(c.schedule)}</span>
        </div>

        <p class="t-h3" style="margin-block-start:var(--space-16)">${e.prompt}</p>

        ${Array.isArray(e.options) && e.options.length && !revealed ? html`
          <ul class="u-stack t-body ja" style="gap:var(--space-8);margin-block-start:var(--space-16)">
            ${e.options.map((o) => html`<li>${o}</li>`)}
          </ul>` : ''}

        ${revealed ? html`
          <div style="margin-block-start:var(--space-24)">
            <p class="t-label t-muted">Answer</p>
            <p class="t-h3 ja">${answer}</p>
            ${e.romaji ? html`<p class="t-body t-muted">${e.romaji}</p>` : ''}
            ${e.because ? html`<p class="t-body t-muted" style="margin-block-start:var(--space-8)">${e.because}</p>` : ''}
            <p class="t-body-sm t-muted" style="margin-block-start:var(--space-12)">
              ${c.sourceName} · ${c.lessonTitle}
            </p>
          </div>

          <div class="u-row" style="gap:var(--space-8);margin-block-start:var(--space-24)">
            <button class="btn btn--primary" type="button" data-grade="got">Got it</button>
            <button class="btn btn--ghost" type="button" data-grade="again">Not yet</button>
          </div>` : html`
          <button class="btn btn--primary" type="button" data-show
                  style="margin-block-start:var(--space-24)">
            Show the answer
          </button>`}
      </section>

      <p class="t-body-sm t-muted" style="margin-block-start:var(--space-16)">
        Answer honestly. "Not yet" brings it back before you close the app, which
        is the only thing that makes the schedule mean anything.
      </p>
    </div>`;
}

/* -------------------------------------------------------------------------- */

export function render() {
  const sum = dueSummary();

  /* A session that has never started, or one whose cards are all answered while
     more are still due, both want a fresh queue on arrival. */
  if (!queue.length && sum.due) startSession();

  if (!sum.due && !answered) return String(nothingDue(sum));
  if (at >= queue.length) return String(sessionDone(sum));
  return String(card(queue[at], sum));
}

export function mount(root) {
  on(root, 'click', '[data-show]', () => {
    revealed = true;
    router.refresh();
  });

  on(root, 'click', '[data-grade]', (e, el) => {
    const grade = el.getAttribute('data-grade');
    const c = queue[at];
    if (!c) return;

    store.recordReview(c.card, grade);
    answered += 1;

    /* A miss goes to the BACK of this session rather than straight back in
       front. Re-asking immediately tests whether you can still see the answer
       you are looking at, which is not the same question. */
    if (grade === 'again') queue = queue.concat({ ...c });

    at += 1;
    revealed = false;
    router.refresh();
  });

  on(root, 'click', '[data-again]', () => {
    startSession();
    router.refresh();
  });
}
