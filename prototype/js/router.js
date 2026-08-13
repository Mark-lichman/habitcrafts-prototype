/* ============================================================================
   HabitCrafts — router.js
   HASH ROUTING + THE PAGE TRANSITIONS.                        [ticket #49]

   Ten static HTML files meant every navigation was a full page load, so the
   page transitions the motion system specifies never ran once — the browser
   tore the old document down before anything could animate out of it. This is
   the file that fixes that. Keeping both views alive for 340ms is the whole
   reason the app is a single page.

   ------------------------------------------------------------------------
   THE TWO TRANSITIONS
   ------------------------------------------------------------------------
   Which one runs is decided by the two views' `level`, never by the view
   itself asking for one — that is what keeps the system coherent as more
   views are added.

     level 0 → level 0   FADE-THROUGH. Switching between top-level nav
                         destinations. Nothing slides, because they are
                         siblings and neither one is "inside" the other.
                         Old fades out over --dur-micro; new fades in and
                         settles from 96% over the remainder of --dur-moderate.

     level 0 → level 1   SHARED-AXIS X, forward. Pushing into a detail view.
                         Old exits left, new enters from the right. The axis
                         carries the meaning: you went deeper.

     level 1 → level 0   SHARED-AXIS X, backward. Same motion, mirrored.

   Total is --dur-moderate (340ms), which the token file already names "page
   transition total". Easings are --ease-exit for the leaving view and
   --ease-enter for the arriving one, both read out of CSS so JS and the tokens
   cannot drift.

   REDUCED MOTION: no translate, no scale, no exceptions — a full-viewport
   slide is the single most vestibular thing in the product. What survives is a
   --dur-micro opacity crossfade, because "reduced" means reduced, not none
   [B §3.6]. The branch is in JS and not in CSS on purpose: these animations run
   through the Web Animations API, and base.css's `transform: none !important`
   does not reach a running WAAPI animation. A CSS-only branch here would look
   like it worked and would not.

   ------------------------------------------------------------------------
   HOW TO ADD A ROUTE  (four lines, one file)
   ------------------------------------------------------------------------
   1. Add a row to ROUTES below. `path` may contain `:params`.
   2. Create js/views/<name>.js exporting `meta` and `render` (see any view).
   3. If the route is a push-into-detail, give its meta `level: 1`.
   4. If it should light up a nav item, give its meta `nav: '<nav id>'` matching
      the `data-nav` attribute in app.html.
   That is the entire integration. Do not touch this file for anything else.
   ========================================================================= */

/* --------------------------------------------------------------------------
   THE ROUTE TABLE
   Dynamic import(), so a view is fetched the first time it is visited and a
   syntax error in one view cannot stop the others from loading. Views under
   construction can therefore land one at a time.
-------------------------------------------------------------------------- */

const ROUTES = [
  { path: '/home',        load: () => import('./views/home.js') },
  { path: '/progress',    load: () => import('./views/progress.js') },
  { path: '/community',   load: () => import('./views/community.js') },
  { path: '/create',      load: () => import('./views/create.js') },
  { path: '/profile',     load: () => import('./views/profile.js') },
  { path: '/explore',     load: () => import('./views/explore.js') },
  { path: '/library',     load: () => import('./views/library.js') },
  { path: '/library/:id', load: () => import('./views/library-detail.js') },
  { path: '/habit/:id',   load: () => import('./views/habit-detail.js') },
  { path: '/onboarding',  load: () => import('./views/onboarding.js') },
  { path: '/auth',        load: () => import('./views/auth.js') },
];

const DEFAULT_ROUTE = '/home';

/* --------------------------------------------------------------------------
   MATCHING
-------------------------------------------------------------------------- */

function parseHash() {
  const raw = (window.location.hash || '').replace(/^#/, '');
  return raw.startsWith('/') ? raw : DEFAULT_ROUTE;
}

function match(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  for (const route of ROUTES) {
    const want = route.path.split('/').filter(Boolean);
    if (want.length !== parts.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < want.length; i++) {
      if (want[i].startsWith(':')) params[want[i].slice(1)] = decodeURIComponent(parts[i]);
      else if (want[i] !== parts[i]) { ok = false; break; }
    }
    if (ok) return { route, params };
  }
  return null;
}

/* --------------------------------------------------------------------------
   MOTION HELPERS
-------------------------------------------------------------------------- */

const root = document.documentElement;

function cssMs(name, fallback) {
  const v = getComputedStyle(root).getPropertyValue(name).trim();
  if (!v) return fallback;
  if (v.includes('ms')) return parseFloat(v);
  if (v.includes('s')) return parseFloat(v) * 1000;
  return parseFloat(v) || fallback;
}
function cssEase(name, fallback) {
  return getComputedStyle(root).getPropertyValue(name).trim() || fallback;
}

/** HC owns the reduced-motion decision (OS preference OR the [data-motion]
    hook), so the router asks rather than deciding for itself. */
function reduced() {
  return window.HC ? window.HC.reducedMotion() : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Run a WAAPI animation and resolve when it is done. */
function play(el, frames, options) {
  return new Promise((resolve) => {
    const anim = el.animate(frames, options);
    anim.addEventListener('finish', resolve, { once: true });
    anim.addEventListener('cancel', resolve, { once: true });
  });
}

const SHIFT = 24; /* px of shared-axis travel. Small: paper does not fly. */

function transitionFrames(kind, direction) {
  const soft = reduced();
  if (soft || kind === 'fade') {
    return {
      out: [{ opacity: 1 }, { opacity: 0 }],
      in: soft
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'scale(1)' }],
    };
  }
  const dx = direction === 'back' ? -SHIFT : SHIFT;
  return {
    out: [
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: `translateX(${-dx}px)` },
    ],
    in: [
      { opacity: 0, transform: `translateX(${dx}px)` },
      { opacity: 1, transform: 'translateX(0)' },
    ],
  };
}

/* --------------------------------------------------------------------------
   THE ROUTER
-------------------------------------------------------------------------- */

let mountEl = null;
let currentEntry = null;   /* { route, params, mod, el, destroy } */
let navigating = false;
let pending = null;

/** Programmatic navigation. Plain <a href="#/route"> works too and is preferred
    in markup — it is keyboard- and middle-click-friendly for free. */
export function go(path) {
  const next = path.startsWith('#') ? path : '#' + path;
  if (window.location.hash === next) render();
  else window.location.hash = next;
}

/** The mounted route: `{ path, params, meta }`, or null before the first
    render. `meta` is the view module's own export — app.js reads
    `meta.ownsCheckIn` off it. */
export function current() {
  if (!currentEntry) return null;
  return {
    path: currentEntry.route.path,
    params: currentEntry.params,
    meta: currentEntry.mod.meta || {},
  };
}

/**
 * Called after every successful render so the shell can update itself.
 * app.js installs the real one; the default is a no-op so router.js stays
 * usable on its own.
 */
let onRendered = () => {};
export function afterRender(fn) { onRendered = fn; }

async function render() {
  /* A hash change mid-transition queues rather than interleaving — two views
     animating over each other leaves orphaned nodes in the stack. */
  if (navigating) { pending = true; return; }
  navigating = true;

  const path = parseHash();
  const found = match(path) || match(DEFAULT_ROUTE);
  if (!found) { navigating = false; return; }

  let mod;
  try {
    mod = await found.route.load();
  } catch (err) {
    console.error('[router] failed to load view for ' + found.route.path, err);
    navigating = false;
    return;
  }

  const meta = mod.meta || {};
  const prev = currentEntry;

  /* Build the incoming view offscreen, so a slow render never shows half a
     page. `render` returns an HTML string; `mount` is optional. */
  const el = document.createElement('div');
  el.className = 'view';
  el.setAttribute('data-view', found.route.path);
  el.innerHTML = mod.render ? mod.render(found.params) : '';

  /* Decide the transition BEFORE anything is in the DOM. */
  const fromLevel = prev ? (prev.mod.meta?.level || 0) : null;
  const toLevel = meta.level || 0;
  let kind = 'fade';
  let direction = 'forward';
  if (fromLevel !== null && fromLevel !== toLevel) {
    kind = 'axis';
    direction = toLevel > fromLevel ? 'forward' : 'back';
  }

  /* --- Swap ------------------------------------------------------------- */
  const total = cssMs('--dur-moderate', 340);
  const outMs = reduced() ? cssMs('--dur-micro', 120) : cssMs('--dur-micro', 120);
  const inMs = reduced() ? cssMs('--dur-micro', 120) : total - outMs;
  const frames = transitionFrames(kind, direction);

  if (prev) {
    /* The outgoing view leaves the flow so the incoming one lays out at its
       natural height immediately. Both are on screen for `outMs`. */
    prev.el.classList.add('view--leaving');
    prev.el.setAttribute('aria-hidden', 'true');
    mountEl.appendChild(el);
    el.style.opacity = '0';

    await play(prev.el, frames.out, {
      duration: outMs, easing: cssEase('--ease-exit', 'ease'), fill: 'forwards',
    });

    if (prev.destroy) { try { prev.destroy(); } catch (e) { console.error(e); } }
    prev.el.remove();
  } else {
    mountEl.appendChild(el);
    el.style.opacity = '0';
  }

  /* Title, nav state and chrome update at the swap, not before it. */
  document.title = (meta.title ? meta.title + ' · ' : '') + 'HabitCrafts';
  onRendered(meta, found.params);

  currentEntry = { route: found.route, params: found.params, mod, el, destroy: null };

  /* Wire the injected markup into the behaviour layer BEFORE it is visible,
     so a habit card is never briefly inert. HC.init is idempotent. */
  if (window.HC) window.HC.init(el);
  if (mod.mount) {
    try { currentEntry.destroy = mod.mount(el, found.params) || null; }
    catch (err) { console.error('[router] mount failed for ' + found.route.path, err); }
  }
  if (window.HC) window.HC.refreshDay();

  el.style.opacity = '';
  if (prev) {
    await play(el, frames.in, {
      duration: inMs, easing: cssEase('--ease-enter', 'ease'),
    });
  }

  /* A new destination starts at the top. A detail view does too — the browser
     would otherwise keep the list's scroll offset and open the article
     halfway down. */
  window.scrollTo(0, 0);

  navigating = false;
  if (pending) { pending = false; render(); }
}

/** Re-run the current view's render. Used by app.js when the store changes
    under a view that did not opt out. */
export function refresh() {
  if (!currentEntry) return;
  const { mod, params, el } = currentEntry;
  if (currentEntry.destroy) { try { currentEntry.destroy(); } catch (e) { console.error(e); } }
  el.innerHTML = mod.render ? mod.render(params) : '';
  if (window.HC) window.HC.init(el);
  currentEntry.destroy = mod.mount ? (mod.mount(el, params) || null) : null;
  if (window.HC) window.HC.refreshDay();
}

export function start(el) {
  mountEl = el;
  if (!window.location.hash) window.location.hash = '#' + DEFAULT_ROUTE;
  window.addEventListener('hashchange', render);
  render();
}
