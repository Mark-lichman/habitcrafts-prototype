/* ============================================================================
   HabitCrafts — views/join.js
   THE AUDIENCE'S FRONT DOOR.  #/join                                    [#5]

   A reader arrives with a code from the back of a book, a slide at the end of
   a talk, or a link in the community's welcome email. This is the shortest
   screen in the app and it should stay that way: every field between a reader
   and their first lesson is a reader the author paid to acquire and lost.

   There is no account creation here on purpose. The prototype has an auth
   screen and this route does not lead to it — joining is free, keeps your
   place in the session, and asks for an email only if you come back. That
   ordering is the whole difference between a funnel and a wall.
   ========================================================================= */

import * as store from '../store.js';
import * as router from '../router.js';
import { html, icon, on } from '../ui.js';

export const meta = {
  title: 'Join a practice',
  nav: null,
  level: 1,
};

/* Module state: the last code typed and whether it missed. Not in the store —
   a failed code is not a fact about the world, it is a typo. */
let attempt = { code: '', missed: false };

export function render() {
  const open = store.publishedPractices();

  return String(html`
    <div class="page page--read">
      <a class="page-back" href="#/library">${icon('arrow-back', 'icon--sm')} Library</a>

      <header class="page-head">
        <div class="page-head__text">
          <h1 class="t-h1">Join a practice</h1>
          <p class="page-head__sub t-body">
            Enter the code from the back of the book, the last slide, or your
            community's welcome email.
          </p>
        </div>
      </header>

      <form class="card card--roomy join-form" data-join-form>
        <div class="field">
          <label class="field__label" for="join-code">Practice code</label>
          <input class="input join-code" id="join-code" type="text"
                 autocomplete="off" spellcheck="false"
                 placeholder="LONGGAME" value="${attempt.code}" data-code>
          ${attempt.missed ? html`
            <p class="field__help t-clay">
              No practice with that code. Codes are letters only — check for a
              stray space.
            </p>` : html`
            <p class="field__help t-body-sm">Letters only. Case does not matter.</p>`}
        </div>
        <button class="btn btn--primary" type="submit">Join</button>
      </form>

      ${open.length ? html`
        <section aria-labelledby="open-h">
          <h2 id="open-h" class="section-head t-label">Open right now</h2>
          <ul class="join-open">
            ${open.map((p) => html`
              <li>
                <a class="card card--interactive join-open__row" href="#/practice/${p.id}">
                  <span class="t-h3">${p.title}</span>
                  <span class="t-body-sm t-muted">${p.author} · code ${p.code}</span>
                  ${icon('chev-right', 'icon--sm')}
                </a>
              </li>`)}
          </ul>
        </section>` : ''}
    </div>`);
}

export function mount(root) {
  const form = root.querySelector('[data-join-form]');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const field = root.querySelector('[data-code]');
    const code = field ? field.value : '';
    const found = store.practiceByCode(code);
    if (!found) {
      attempt = { code, missed: true };
      router.refresh();
      return;
    }
    attempt = { code: '', missed: false };
    store.joinPractice(found.id);
    router.go('/practice/' + found.id);
  });
}
