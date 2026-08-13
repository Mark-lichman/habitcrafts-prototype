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
import { longDate, today } from './data.js';

/* --------------------------------------------------------------------------
   1. SHELL — nav state, document title, logged-out chrome
-------------------------------------------------------------------------- */

const shell = document.querySelector('[data-shell]');
const navRoot = document.querySelector('[data-nav-root]');
const viewRoot = document.querySelector('[data-view-root]');

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
