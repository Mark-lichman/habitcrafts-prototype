/* ============================================================================
   HabitCrafts — app.js
   THE BOOTSTRAP. Three jobs, nothing else.

     1. Start the router into the shell's <main>, and keep the nav, the title
        and the logged-out chrome in step with the current route.
     2. Bridge the behaviour layer to the store. prototype.js animates; the
        store remembers. This file is the only place the two meet.
     3. Re-render the current view when state changes — with the one exception
        that keeps the check-in animation alive (see below).

   Nothing here knows what any individual view looks like. Adding a view means
   touching router.js's table and creating one file; this one stays as it is.
   ========================================================================= */

import * as store from './store.js';
import * as router from './router.js';
import * as config from './config.js';
import { longDate, today } from './data.js';
import { html, icon } from './ui.js';

/* --------------------------------------------------------------------------
   1. SHELL — nav state, document title, logged-out chrome
-------------------------------------------------------------------------- */

const shell = document.querySelector('[data-shell]');
const navRoot = document.querySelector('[data-nav-root]');
const navList = document.querySelector('[data-nav-list]');
const viewRoot = document.querySelector('[data-view-root]');
const xbar = document.querySelector('[data-xbar]');

/* --------------------------------------------------------------------------
   THE NAVIGATION IS DATA NOW

   app.html used to hand-write six <li>s. It holds an empty <ul> instead,
   because an experiment can add a destination (Studio, Spaces) and a shipping
   configuration will eventually remove some — and markup is the wrong place
   for a decision that changes per configuration.

   The markup produced here is byte-for-byte what was there before. The four
   nav shapes (bar / rail / extended rail / drawer) are pure CSS off this one
   list, so nothing about the responsive behaviour depends on who wrote it.
-------------------------------------------------------------------------- */

function paintNav() {
  if (!navList) return;
  navList.innerHTML = String(html`
    ${config.navItems().map((item) => html`
      <li class="${item.rail ? 'nav-li--rail' : ''}">
        <a class="nav-item" href="${item.href}" data-nav="${item.id}">
          <span class="nav-item__pill" aria-hidden="true"></span>
          ${icon(item.icon)}
          <span class="nav-item__label">${item.label}</span>
        </a>
      </li>`)}`);
}

function paintShell(meta) {
  /* Selected destination. `aria-current="page"` is the whole mechanism — the
     brand-600 ink and the 3px gold pill are CSS off that attribute, never a
     class, so there is nothing to get out of sync. Never `opacity: 0.5`. */
  navRoot.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.getAttribute('data-nav') === meta.nav) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  /* auth and onboarding are logged out and carry NO nav chrome at all — the
     shell's insets go with it, or the page sits in a rail-shaped hole. */
  const bare = meta.chrome === false;
  shell.setAttribute('data-chrome', bare ? 'none' : 'app');
  navRoot.hidden = bare;
}

function paintUser() {
  const u = store.state.user;
  const set = (sel, text) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = text;
  };
  set('[data-user-initial]', u.initial);
  set('[data-user-name]', u.name);
  set('[data-user-since]', 'Member since ' + u.memberSince);
  document.documentElement.setAttribute('data-quick-checkin', String(!!u.quickCheckIn));
}

/* --------------------------------------------------------------------------
   THE EXPERIMENT SWITCHER

   The one piece of scaffolding allowed inside app.html, and it is allowed on
   three conditions:

     1. It is styled from the harness's vocabulary, not the product's, so it can
        never be mistaken for shipping design in a screenshot.
     2. It states the hypothesis the surfaces below it exist to test. A reviewer
        clicking through E1 should be able to see, without leaving the screen,
        what the screen is supposed to prove.
     3. It can be turned off outright: `app.html?chrome=clean`.

   Switching does not reload. It repaints the nav, re-renders the current view
   and leaves the route and the store alone — so you can stand on one screen and
   watch it change shape as the payer changes, which is the entire point of
   having the control at all.

   WHEN AN EXPERIMENT WINS: delete this function, the [data-xbar] element, and
   every entry in EXPERIMENTS except the winner. Nothing else changes, because
   nothing else reads the experiment id.
-------------------------------------------------------------------------- */

function paintSwitcher() {
  if (!xbar) return;
  if (!config.switcherVisible()) { xbar.hidden = true; return; }

  const active = config.experiment();
  xbar.hidden = false;
  xbar.innerHTML = String(html`
    <div class="xbar__row">
      <span class="xbar__legend">Simulating</span>
      <div class="xbar__group" role="group" aria-label="Business model experiment">
        ${config.EXPERIMENT_IDS.map((id) => {
          const x = config.EXPERIMENTS[id];
          return html`
            <button class="xbar__btn" type="button" data-x="${id}"
                    aria-pressed="${String(id === active.id)}">${x.label}</button>`;
        })}
      </div>
      <span class="xbar__spacer"></span>
      ${active.ticket
        ? html`<a class="xbar__link"
                  href="https://github.com/Mark-lichman/habitcrafts-prototype/issues/${active.ticket}"
                  target="_blank" rel="noopener">issue #${active.ticket} ↗</a>`
        : ''}
    </div>
    <p class="xbar__persona">${active.persona}</p>
    ${active.hypothesis
      ? html`<p class="xbar__hypothesis"><strong>Hypothesis:</strong> ${active.hypothesis}</p>`
      : ''}`);
}

/* Repaint everything a configuration can change, then re-render the view in
   place. `router.refresh()` rather than a navigation: the reviewer stays where
   they were standing. */
config.onExperimentChange(() => {
  paintNav();
  paintSwitcher();
  const cur = router.current();
  paintShell(cur && cur.meta ? cur.meta : {});

  /* Stay where you are standing — that is the point of the switcher, and
     watching one screen change shape as the payer changes is the whole reason
     to have the control.

     Unless the screen you are standing on does not exist in the configuration
     you just switched into. Then go to that configuration's front door rather
     than leaving a reviewer parked on an "unavailable" page with a paragraph
     explaining why. */
  if (cur && !config.routeAvailable(cur.path)) router.go(config.entryRoute());
  else router.refresh();
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-x]');
  if (btn) config.setExperiment(btn.getAttribute('data-x'));
});

/* --------------------------------------------------------------------------
   2. THE BRIDGE — prototype.js ⇄ store.js

   The press-and-hold lives entirely in prototype.js and is not reimplemented
   here: it fires `hc:checkin` / `hc:undo` on `document` with the card element,
   and the card carries `data-habit="<habitId>"`. That single attribute is the
   whole join between the animation layer and the data layer.

   Everything downstream of the gesture is therefore free: check in on Home and
   Progress's calendar, the day arc, the streak and the gild are all already
   correct the next time you look at them, because they read the same history
   array this handler just wrote to.
-------------------------------------------------------------------------- */

function habitIdFrom(card) {
  const id = card && card.getAttribute('data-habit');
  return id && id !== 'preview' ? id : null;
}

document.addEventListener('hc:checkin', (e) => {
  const id = habitIdFrom(e.detail && e.detail.card);
  if (!id) return;                              /* a preview card — not data */
  const crossed = store.checkIn(id, { origin: 'dom' });

  /* A milestone crossing. HC.fireMilestone owns the once-per-session rule:
     the first one this session gets the full card, the rest get the quiet
     streak-increment treatment. We just report the number. [D §2.4] */
  if (crossed && window.HC) window.HC.fireMilestone({ days: crossed });
});

document.addEventListener('hc:undo', (e) => {
  const id = habitIdFrom(e.detail && e.detail.card);
  if (id) store.undoCheckIn(id, { origin: 'dom' });
});

/* --------------------------------------------------------------------------
   3. STATE → VIEW

   Views get live updates for free: any store change re-renders the mounted
   view. A view author writes no subscription code at all.

   THE ONE EXCEPTION. When a check-in comes from the DOM, prototype.js has
   already run ~700ms of choreography on that card — the ring fill, the
   checkmark draw, the flecks, the celebration echo, the FLIP reorder, the arc
   increment. Re-rendering on top of that would replace the animating nodes
   with fresh ones and the signature moment would become a flicker. So a view
   that owns the check-in gesture declares `meta.ownsCheckIn = true` in its
   meta, and DOM-originated check-in/undo events skip its re-render. Its own
   DOM is already correct; the store agrees with it; nothing needs repainting.

   Every other view re-renders normally on those same events, which is exactly
   right — Progress genuinely does need to redraw when Home checks something in.

   Renders are coalesced to one per frame, so three mutations in a handler cost
   one render.
-------------------------------------------------------------------------- */

let queued = false;

store.subscribe((_state, event) => {
  const cur = router.current();
  const meta = cur && cur.meta ? cur.meta : {};
  const domCheckIn = event.origin === 'dom' && (event.type === 'checkin' || event.type === 'undo');
  if (domCheckIn && meta.ownsCheckIn) return;

  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    router.refresh();
  });
});

router.afterRender((meta) => {
  paintShell(meta);
  paintUser();
});

/* --------------------------------------------------------------------------
   4. GO
   Wait for DOMContentLoaded so prototype.js's own boot() — theme, motion, hour
   and the initial refreshDay() — has run before the first view is wired.
   Handlers fire in registration order and prototype.js registered first.
-------------------------------------------------------------------------- */

function boot() {
  /* The nav has to exist before the first render — paintShell moves
     aria-current onto an item it expects to already be in the document. */
  paintNav();
  paintSwitcher();
  paintUser();
  router.start(viewRoot);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

/* --------------------------------------------------------------------------
   5. THE HARNESS HANDLE
   index.html drives this app through the iframe's contentWindow. Everything it
   is allowed to touch is here, and nothing else is global. Same-origin only —
   which is another reason the prototype needs the local server.
-------------------------------------------------------------------------- */

window.HCApp = {
  store,
  router,
  config,
  /** The harness's experiment control drives the same path the in-app one does,
      so there is one switch and not two implementations of it. */
  setExperiment(id) { config.setExperiment(id); },
  experimentId() { return config.experimentId(); },
  /** "Reset data" on the control bar. Back to the fixtures, same route. */
  reset() {
    store.resetAll();
    router.refresh();
  },
  /** The control bar's readout, so the harness never re-implements a selector. */
  summary() {
    const p = store.dayProgress();
    return { date: longDate(today()), done: p.done, total: p.total, route: router.current() };
  },
};
