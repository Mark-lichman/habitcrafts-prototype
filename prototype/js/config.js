/* ============================================================================
   HabitCrafts — config.js
   THE ONE PLACE THAT KNOWS WHICH PRODUCT IS RUNNING.

   Two jobs, and they are the same job:

     1. PROTOTYPE — which business-model experiment is being simulated, so a
        reviewer can switch between them from the top bar and watch the nav,
        the surfaces and the money moment change underneath them.
     2. PRODUCTION — feature flags. Every experiment is a set of flags plus a
        nav set plus a persona. When one of these experiments wins, its entry
        becomes the shipping configuration and the other three are deleted.
        Nothing else in the codebase has to change.

   That is the whole reason this file exists rather than `if (experiment ===
   'creator')` scattered through eleven views. A view asks `flag('bindery')`;
   it never asks which experiment is running. Views that read the experiment id
   directly are a bug — the only legitimate readers are the nav painter and the
   switcher itself.

   READ THIS BEFORE ADDING A FLAG. A flag is a noun describing a capability the
   product either has or does not ("bindery", "paywall"). It is never a
   proper noun for an experiment ("isE1"), because that is the conditional this
   file exists to delete.
   ========================================================================= */

/* --------------------------------------------------------------------------
   THE BASE NAVIGATION
   The six destinations that exist regardless of experiment. Rendered by
   app.js — app.html holds a mount point, not a hand-written list, so an
   experiment can add a destination without editing markup.

   `rail: true` means "hidden below 600, shown from 600 up" (`.nav-li--rail`).
   Below 600 the bar has room for four items plus the FAB and no more.
-------------------------------------------------------------------------- */

const BASE_NAV = [
  { id: 'habits',    href: '#/home',      icon: 'habits',    label: 'Habits' },
  { id: 'progress',  href: '#/progress',  icon: 'progress',  label: 'Progress' },
  { id: 'community', href: '#/community', icon: 'community', label: 'Community' },
  { id: 'explore',   href: '#/explore',   icon: 'explore',   label: 'Explore', rail: true },
  { id: 'library',   href: '#/library',   icon: 'library',   label: 'Library', rail: true },
  { id: 'profile',   href: '#/profile',   icon: 'person',    label: 'Profile' },
];

/* --------------------------------------------------------------------------
   THE EXPERIMENTS

   `flags`      capabilities this configuration turns on.
   `nav`        destinations added to BASE_NAV, in order, before Profile.
   `persona`    whose chair the reviewer is sitting in. Drives the switcher's
                caption and the empty states, not the layout.
   `hypothesis` the falsifiable sentence from the GitHub issue. Shown in the
                switcher so the person clicking around can see what the screen
                is supposed to prove. It is not decoration: a surface that
                cannot be traced back to one of these sentences should not be
                built.
   `ticket`     the issue this configuration exists to test.
   `entry`      THE FRONT DOOR. Where the app opens in this configuration.

   ------------------------------------------------------------------------
   WHY `entry` EXISTS: THESE ARE DISCOVERY INSTRUMENTS, NOT DEMOS
   ------------------------------------------------------------------------
   Each configuration is going to be put in front of a stranger on a
   fifteen-minute call. Fifteen minutes is unforgiving: a participant who has
   to be navigated to the thing under test has already spent a tenth of the
   session on the navigation, and — worse — has been *shown* it rather than
   *finding* it, which destroys the only honest signal the prototype can give.

   So the app opens on the decision each experiment is actually asking about.
   A creator lands on "bring a source". A community member lands on "join your
   community". A consumer lands on "what are you reading right now". Home, the
   habit layer and everything else is still one tap away and still the whole
   app — it is just no longer the thing that greets them.

   Base config keeps Home, because with no experiment running there is nothing
   to put in front of anyone.
-------------------------------------------------------------------------- */

export const EXPERIMENTS = {
  none: {
    id: 'none',
    label: 'Base app',
    short: 'Base',
    persona: 'Someone keeping their own habits. No experiment surfaces.',
    entry: '/home',
    hypothesis: null,
    ticket: null,
    nav: [],
    flags: {},
  },

  creator: {
    id: 'creator',
    label: 'E1 · Creators',
    short: 'E1',
    persona: 'You are an author with a book and an audience you can reach.',
    entry: '/bindery',
    hypothesis:
      'Authors, speakers and coaches are willing to pay for an app that helps ' +
      'their audience convert knowledge into daily practice.',
    ticket: 2,
    nav: [
      { id: 'studio', href: '#/studio', icon: 'rosette', label: 'Studio' },
    ],
    flags: {
      bindery: true,        /* the source → Practice pipeline */
      studio: true,         /* the author dashboard */
      publishing: true,     /* a Practice can be published to an audience */
      priceOnPublish: true, /* the money moment sits at publish, not at upload */
    },
  },

  community: {
    id: 'community',
    label: 'E2 · Communities',
    short: 'E2',
    persona: 'You are a member of a community whose method you already paid to learn.',
    entry: '/spaces',
    hypothesis:
      'Members of knowledge communities are willing to pay to have the knowledge ' +
      'they are part of put into daily practice.',
    ticket: 3,
    nav: [
      { id: 'spaces', href: '#/spaces', icon: 'shield', label: 'Spaces' },
    ],
    flags: {
      bindery: true,
      spaces: true,         /* joined community container */
      roster: true,         /* CSV + magic link, explicitly NOT SSO — see #7 */
      cohort: true,         /* what the rest of the cohort is practising */
      memberPaywall: true,  /* the $19/mo member-paid arm */
    },
  },

  consumer: {
    id: 'consumer',
    label: 'E3 · Consumers',
    short: 'E3',
    persona: 'You are a learner who reads a lot and applies almost none of it.',
    entry: '/bindery',
    hypothesis:
      'General consumer learners are a reachable audience and are searching for ' +
      'a tool to help them turn their learnings into practice.',
    ticket: 4,
    nav: [],
    flags: {
      bindery: true,
      bringYourOwn: true,   /* the five-minute single-source path in onboarding */
      plusPaywall: true,    /* HabitCrafts Plus — the wall sits on conversion */
    },
  },
};

export const EXPERIMENT_IDS = Object.keys(EXPERIMENTS);

/* --------------------------------------------------------------------------
   RESOLVING THE ACTIVE EXPERIMENT

   Order: URL query → sessionStorage → 'none'.

   The URL wins so a screen can be linked to in the state it should be reviewed
   in — `app.html?x=creator#/studio` is a shareable bug report. sessionStorage
   rather than localStorage for the same reason the store uses it: a prototype
   that remembers the last reviewer's session is one nobody can hand over.
-------------------------------------------------------------------------- */

const STORAGE_KEY = 'hc:experiment';
const QUERY_KEY = 'x';

function readInitial() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(QUERY_KEY);
    if (fromUrl && EXPERIMENTS[fromUrl]) return fromUrl;
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved && EXPERIMENTS[saved]) return saved;
  } catch (e) { /* private mode — fall through to the default */ }
  return 'none';
}

let activeId = readInitial();
const listeners = new Set();

/** The active experiment's whole record. */
export function experiment() {
  return EXPERIMENTS[activeId] || EXPERIMENTS.none;
}

/** Its id. The nav painter and the switcher may read this. Views may not — ask
    `flag()` instead, or the conditional this file deletes comes straight back. */
export function experimentId() {
  return activeId;
}

/**
 * Is a capability on?
 *
 *     if (flag('bindery')) { … }
 *
 * Unknown flags are false, so a view can reference a capability that only one
 * configuration has without guarding for the others.
 */
export function flag(name) {
  return !!experiment().flags[name];
}

/** The nav for the active experiment: base six with its additions slotted in
    before Profile, which stays last because muscle memory lives there. */
export function navItems() {
  const extra = experiment().nav || [];
  if (!extra.length) return BASE_NAV.slice();
  const out = BASE_NAV.slice();
  const profileAt = out.findIndex((i) => i.id === 'profile');
  out.splice(profileAt < 0 ? out.length : profileAt, 0, ...extra);
  return out;
}

/**
 * Where the app opens in this configuration — the decision the experiment is
 * asking about, not Home. See the note above EXPERIMENTS.
 *
 * An explicit hash in the URL always wins: `app.html?x=creator#/studio` has to
 * keep working, or every link into a specific screen breaks the moment an
 * entry route is set.
 */
export function entryRoute() {
  return experiment().entry || '/home';
}

/* Which capability each experiment surface needs. Used only to decide whether
   the route you are standing on survives a configuration change — the views
   already guard themselves, this just avoids stranding a reviewer on an
   "unavailable" page when a perfectly good front door exists. */
const ROUTE_FLAGS = {
  '/studio': 'studio',
  '/spaces': 'spaces',
  '/bindery': 'bindery',
  '/bindery/:id/review': 'bindery',
  '/practice/:id': 'bindery',
  '/join': 'bindery',
};

/** Is this route's capability on in the active configuration? */
export function routeAvailable(path) {
  const needs = ROUTE_FLAGS[path];
  return !needs || flag(needs);
}

/** Switch experiments. Notifies; the caller decides whether to re-render. */
export function setExperiment(id) {
  if (!EXPERIMENTS[id] || id === activeId) return;
  activeId = id;
  try { sessionStorage.setItem(STORAGE_KEY, id); } catch (e) {}
  document.documentElement.setAttribute('data-experiment', id);
  listeners.forEach((fn) => fn(experiment()));
}

/** subscribe(fn) → unsubscribe. app.js uses this to repaint the shell. */
export function onExperimentChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* The attribute is written at module load as well as on change, so CSS that
   keys off `[data-experiment]` is correct on the first paint. */
document.documentElement.setAttribute('data-experiment', activeId);

/* --------------------------------------------------------------------------
   THE SWITCHER'S OWN VISIBILITY

   The switcher is scaffolding — it is the one thing in app.html that is not
   shipping design, and the repo's rule is that app.html carries none. The
   compromise is that it is plainly styled (it borrows the harness's look, not
   the product's) and it can be turned off outright:

       app.html?chrome=clean        → no switcher, screenshot-safe
       app.html?x=creator           → switcher visible, E1 selected

   When an experiment wins and its flags become the shipping config, delete the
   switcher markup, this function, and `EXPERIMENTS` minus the winner.
-------------------------------------------------------------------------- */

export function switcherVisible() {
  try {
    return new URLSearchParams(window.location.search).get('chrome') !== 'clean';
  } catch (e) {
    return true;
  }
}
