/* ============================================================================
   HabitCrafts — views/spaces.js
   THE COMMUNITY CONTAINER.  #/spaces                                    [#7]

   A member joins their community's Space and finds three things: the
   operator's Practice, their own habits from it, and what the rest of the
   cohort is practising this week.

   ------------------------------------------------------------------------
   WHAT THIS SCREEN DELIBERATELY DOES NOT HAVE
   ------------------------------------------------------------------------
   NO SSO. NO OAUTH. NO COMMUNITY-PLATFORM API. The brief for E2 said "connect
   to the community, likely through a login or API" and the answer is: not yet,
   and possibly never. An integration is the most expensive way to discover
   that nobody wanted the thing behind it, and it tests none of E2's actual
   risks — which are licensing first, then which side of the table pays.

   What is here instead is a CSV roster and a magic link. From the member's
   chair those are indistinguishable from SSO: they click a link in an email
   from a name they trust and they are in. Build the first real integration
   when the SECOND paying operator asks for it by name — a request from one is
   a customisation; from two it is a roadmap.

   The fixture says `roster: 'csv'` for the same reason: a fixture that quietly
   implies an API exists would make the next person build one.

   ------------------------------------------------------------------------
   THE COHORT STRIP SHOWS PRACTICE, NEVER MISSES
   ------------------------------------------------------------------------
   The design direction treats a missed day as data rather than failure. A
   cohort view that surfaced individual gaps would turn that private fact into
   a public one and quietly re-introduce the shame the whole product is built
   to avoid. So the strip shows what people are practising and how long they
   have kept it — never who broke a streak, never a leaderboard.
   ========================================================================= */

import * as store from '../store.js';
import { flag } from '../config.js';
import { html, on, plural } from '../ui.js';

export const meta = {
  title: 'Spaces',
  nav: 'spaces',
  level: 0,
};

/* --------------------------------------------------------------------------
   THE JOINED SPACE
-------------------------------------------------------------------------- */

function joinedSpace(space) {
  const practice = space.practiceId ? store.practiceById(space.practiceId) : null;
  const lessons = practice ? store.practiceLessons(practice) : [];
  const mine = store.state.habits.filter(
    (h) => !h.archived && lessons.some((l) => l.id === h.fromLesson)
  );

  return html`
    <section class="space" aria-labelledby="sp-${space.id}">
      <header class="hero space-hero">
        <p class="hero__label">${space.operator}</p>
        <h2 id="sp-${space.id}" class="space-hero__title">${space.name}</h2>
        <p class="t-body space-hero__meta">
          ${plural(space.seats, 'seat')} · ${space.plan}
        </p>
        ${practice ? html`
          <div class="lib-hero__actions">
            <a class="btn btn--secondary" href="#/practice/${practice.id}">Open the practice</a>
          </div>` : ''}
      </header>

      <!-- YOUR OWN HABITS FROM THIS SPACE.
           First, above the cohort. What the community is doing is context; what
           you are doing is the product. -->
      <section aria-labelledby="mine-${space.id}">
        <h3 id="mine-${space.id}" class="section-head t-label">What you are practising</h3>
        ${mine.length ? html`
          <ul class="space-mine">
            ${mine.map((h) => html`
              <li class="card space-mine__row">
                <span class="space-mine__behavior t-body">${h.behavior}</span>
                <span class="space-mine__streak t-body-sm t-muted">
                  ${plural(store.streakOf(h), 'day')} kept
                </span>
                <a class="text-link t-body-sm" href="#/habit/${h.id}">Open</a>
              </li>`)}
          </ul>` : html`
          <div class="empty-state empty-state--inline">
            <p class="empty-state__title">Nothing yet from this space</p>
            <p class="empty-state__body t-body">
              Open the practice and cross the bridge on any lesson. That is the
              whole thing your membership is for.
            </p>
            ${practice ? html`
              <a class="btn btn--primary" href="#/practice/${practice.id}">Open the practice</a>` : ''}
          </div>`}
      </section>

      <!-- THE COHORT. Practice and duration only. -->
      ${flag('cohort') && space.cohort.length ? html`
        <section aria-labelledby="coh-${space.id}">
          <h3 id="coh-${space.id}" class="section-head t-label">The cohort this week</h3>
          <ul class="space-cohort">
            ${space.cohort.map((m) => html`
              <li class="card space-cohort__row">
                <span class="avatar avatar--sm avatar--${m.tint}" aria-hidden="true">${m.initial}</span>
                <span class="space-cohort__body">
                  <span class="space-cohort__name t-label">${m.name}</span>
                  <span class="space-cohort__what t-body-sm">${m.practising}</span>
                </span>
                <span class="chip chip--sage">${plural(m.days, 'day')}</span>
              </li>`)}
          </ul>
          <p class="t-body-sm t-muted space-cohort__note">
            What people are keeping, not who missed. Gaps are nobody else's business.
          </p>
        </section>` : ''}

      <!-- THE MEMBER-PAID ARM.
           The hypothesis as written names the MEMBER as the payer, so the test
           has to give them a real chance to buy — even though the prior is that
           the operator pays. An experiment that only offers the option you
           expect to win has not tested anything. [#3 §4.5] -->
      ${flag('memberPaywall') ? html`
        <section class="card card--roomy space-upgrade" aria-labelledby="up-${space.id}">
          <h3 id="up-${space.id}" class="t-h3">Practice companion</h3>
          <p class="t-body">
            Your seat covers the practice itself. The companion adds recall
            checks across every module, your own progress history, and the
            weekly cohort digest.
          </p>
          <p class="space-upgrade__price">$19<span class="t-body-sm">/month</span></p>
          <button class="btn btn--gold" type="button" data-member-upgrade>Add the companion</button>
        </section>` : ''}
    </section>`;
}

/* --------------------------------------------------------------------------
   AN INVITATION — the CSV + magic-link path, made visible
-------------------------------------------------------------------------- */

function invitation(space) {
  return html`
    <li class="card space-invite">
      <span class="space-invite__body">
        <span class="t-label">${space.operator}</span>
        <span class="t-h3">${space.name}</span>
        <span class="t-body-sm t-muted">
          Invited by email. No account to make. The link is the login.
        </span>
      </span>
      <button class="btn btn--primary btn--sm" type="button" data-join-space="${space.id}">
        Join
      </button>
    </li>`;
}

/* --------------------------------------------------------------------------
   THE FRONT DOOR

   Joining leads this screen, above everything a member already has.

   That ordering is for the interview, not for the returning member — and it is
   worth being honest that those two want opposite things. A member who is
   already in a Space wants their own practice first; a stranger on a
   fifteen-minute call needs to meet the decision the experiment is actually
   asking about within a second of the screen appearing, without being walked
   there. Discovery wins for now because nobody is a returning member yet.

   Revisit this the moment there are real members. It is a deliberate,
   temporary inversion, not the finished information architecture.
-------------------------------------------------------------------------- */

function frontDoor(invited) {
  return html`
    <section class="card card--roomy space-door" aria-labelledby="door-h">
      <h2 id="door-h" class="t-h3">Join your community</h2>
      <p class="t-body space-door__lede">
        The method you already learned, turned into something that shows up on a
        Tuesday. Your community sends the link. There is no account to make.
      </p>

      ${invited.length ? html`
        <ul class="space-invites space-door__invites">${invited.map(invitation)}</ul>`
        : html`
        <p class="t-body-sm t-muted space-door__none">
          No pending invitations. If you have a code, use it below.
        </p>`}

      <form class="space-door__code" data-code-form>
        <div class="field">
          <label class="field__label" for="space-code">Have a code instead?</label>
          <input class="input join-code" id="space-code" type="text"
                 autocomplete="off" spellcheck="false"
                 placeholder="NORTHBEAM" data-code>
        </div>
        <button class="btn btn--secondary" type="submit">Join with a code</button>
      </form>
    </section>`;
}

/* --------------------------------------------------------------------------
   RENDER
-------------------------------------------------------------------------- */

export function render() {
  if (!flag('spaces')) return String(unavailable());

  const joined = store.joinedSpaces();
  const invited = store.state.spaces.filter((s) => !s.joined);

  return String(html`
    <div class="page">
      <header class="page-head">
        <div class="page-head__text">
          <h1 class="t-h1">Spaces</h1>
          <p class="page-head__sub t-body">
            The communities you are part of, and what their method looks like on
            a Tuesday.
          </p>
        </div>
      </header>

      ${frontDoor(invited)}

      ${joined.length ? html`
        <h2 class="section-head t-label space-yours">Your spaces</h2>
        ${joined.map(joinedSpace)}` : ''}
    </div>`);
}

function unavailable() {
  return html`
    <div class="page">
      <div class="empty-state">
        <p class="empty-state__title">Spaces belong to Experiment 2</p>
        <p class="empty-state__body t-body">
          Switch to <strong>E2 · Communities</strong> at the top of the screen to see it.
        </p>
        <a class="btn btn--primary" href="#/home">Back to today</a>
      </div>
    </div>`;
}

/* --------------------------------------------------------------------------
   MOUNT
-------------------------------------------------------------------------- */

export function mount(root) {
  on(root, 'click', '[data-join-space]', (e, el) => {
    store.joinSpace(el.getAttribute('data-join-space'));
  });

  /* The member-paid arm. In the prototype it flips the same Plus flag the
     consumer wall sets — one entitlement, two price points, which is the shape
     the real thing would have too. */
  on(root, 'click', '[data-member-upgrade]', () => {
    store.startPlus();
  });

  /* Joining by code. Any code that is not recognised joins the first pending
     invitation instead of failing — during an interview a dead end teaches us
     nothing about the idea and everything about our typo handling. */
  const form = root.querySelector('[data-code-form]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const field = root.querySelector('[data-code]');
      const typed = String(field ? field.value : '').trim().toUpperCase();
      const byName = store.state.spaces.find(
        (s) => !s.joined && s.name.toUpperCase().replace(/[^A-Z]/g, '').includes(typed) && typed
      );
      const pending = store.state.spaces.find((s) => !s.joined);
      const target = byName || pending;
      if (target) store.joinSpace(target.id);
    });
  }
}
