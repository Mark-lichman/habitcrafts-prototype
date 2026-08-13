/* ============================================================================
   HabitCrafts — views/community.js
   THE SOCIAL LAYER. Groups · Challenges · Events.

   The five-tab bar (Chats · Invitations · Events · Monthly Challenges ·
   Webinars) is CUT. Three segments remain, invitations become a pinned inbox
   row with a PLAIN COUNT — never a red badge — and webinars fold into Events
   as a type tag. [D §3.3]

   THE POSTURE. Group chat pulls hard toward notification-heavy patterns.
   Everything here resists it: no unread counts, no reactions, no likes, no
   leaderboards, no dot swarms. A peer check-in is NOT a chat bubble — it is a
   quiet full-width note in the completed-habit vocabulary, so someone else's
   progress reads as warmth rather than as a scoreboard. Missed days are simply
   absent, never red. The one gold on the screen is the gild seal beside a
   milestone somebody actually kept.

   ------------------------------------------------------------------------
   WHICH HOOKS ARE PROTOTYPE.JS'S AND WHICH ARE MINE — read before editing
   ------------------------------------------------------------------------
   prototype.js's Community module already owns the pure-DOM behaviour of this
   screen (§4). Re-implementing it here would be exactly the drift that file
   exists to prevent, so the split is:

     THEIRS (pure DOM, no store, safe)          MINE (store-backed)
       data-tabs / data-tab / data-tabpanel       data-say + submit → sendMessage
       data-group-select / data-group-panel       data-invite-resolve → acceptInvitation
       data-view-set / data-workspace             data-invites (the inbox fold)
       data-filter-input / -list / -name          data-goto-group (challenge → group)
       data-reply-to / -chip / -text / -clear

   The composer is deliberately NOT `data-composer`: that handler appends a
   bubble to the DOM itself, which would double every message once the store
   re-render put the real one in. The field keeps `data-composer-field` so the
   "Say something" reply hook still finds it.

   ------------------------------------------------------------------------
   WHY THERE IS MODULE STATE
   ------------------------------------------------------------------------
   Which group is selected, which segment is showing and which pane is on
   screen below 840 are view state, not app state — they do not belong in the
   store. But `render` is called again from scratch on every store change, so
   anything held only in the DOM (the selected row, the open segment) would
   snap back to the markup default the moment a message was sent. `ui` below is
   the small amount of state that has to survive that, and the delegated
   listeners in mount() do nothing but keep it in step with what prototype.js
   has already done to the DOM. Render then declares that state in the markup,
   and prototype.js's own initialisers honour it (initTabs explicitly adopts
   whichever tab the markup marks selected).

   No `meta.ownsCheckIn`: this view renders no [data-checkin] rings.
   ========================================================================= */

import * as store from '../store.js';
import { iso, today, daysAgo, WEEKDAY, MONTH } from '../data.js';
import { html, icon, cls, plural, on, relTime, raw } from '../ui.js';

/**
 * A bare attribute, conditionally.  `html` escapes every interpolation — which
 * is the point of it — so `${cond ? 'hidden' : ''}` would land in the markup as
 * escaped text and the element would stay visible. Presence-only attributes
 * have to go through raw(). Values do not: `aria-current="${x ? 'true':'false'}"`
 * is always safe and is used in preference wherever the attribute has one.
 */
function at(cond, attribute) {
  return raw(cond ? attribute : '');
}

export const meta = {
  title: 'Community',
  nav: 'community',
  level: 0,            /* a top-level destination → fade-through */
};

/* --------------------------------------------------------------------------
   VIEW STATE — see the header note. Module scope, so it also survives leaving
   the screen and coming back, which is what a reviewer expects.
-------------------------------------------------------------------------- */

const ui = {
  segment: 'groups',      /* groups | challenges | events */
  groupId: null,          /* null → first group */
  view: 'list',           /* which pane is on screen below 840 */
  invitesOpen: false,
  justSent: false,        /* mount() refocuses the composer after a send */
};

function currentGroup() {
  const gs = store.state.groups;
  if (!gs.length) return null;
  return gs.find((g) => g.id === ui.groupId) || gs[0];
}

/* --------------------------------------------------------------------------
   SMALL PURE HELPERS
-------------------------------------------------------------------------- */

/** Avatars are CSS-generated initials — no network, no photographs. The tone
    is picked by a deterministic hash of the person id, so a face keeps the
    same colour on every screen and every reload. */
const TONES = ['', 'avatar--sage', 'avatar--gold', 'avatar--clay', 'avatar--amber'];
function toneOf(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return TONES[h % TONES.length];
}

function person(id) {
  return store.data.people[id] || { id, name: id, initial: '?' };
}

function avatar(id, extra) {
  const p = person(id);
  return html`<span class="${cls('avatar', extra, toneOf(id))}" aria-hidden="true">${p.initial}</span>`;
}

/** "Morning Movers" → MM · "The Two-Minute Club" → TC. Articles are skipped so
    the monogram is made of the words a person would actually say. */
const SKIP = ['the', 'a', 'an', 'of', 'and'];
function monogram(name) {
  return name.split(/[\s-]+/)
    .filter((w) => w && !SKIP.includes(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/** "Today" / "Yesterday" / "Tuesday, 12 Aug" — the thread's day rules. */
function dayLabel(d) {
  const k = iso(d);
  if (k === iso(today())) return 'Today';
  if (k === iso(daysAgo(1))) return 'Yesterday';
  return WEEKDAY[d.getDay()] + ', ' + d.getDate() + ' ' + MONTH[d.getMonth()].slice(0, 3);
}

/** A member's activity line sometimes records a milestone ("hit 30 days").
    When it does, the note earns the seal — one of the five sanctioned
    appearances of gold in the system. [D §2.4, §6] */
function milestoneIn(text) {
  const m = /(\d+)\s*days?/.exec(text);
  const n = m ? parseInt(m[1], 10) : 0;
  return store.data.MILESTONES.includes(n) ? n : 0;
}

/* --------------------------------------------------------------------------
   PIECES — the group list
-------------------------------------------------------------------------- */

/** The avatar stack of who checked in today, plus the "+n today" count. THIS
    is the hero of the screen: it makes Community about momentum rather than
    messaging, and it is the same signal a completed habit gives, in sage. */
function todayStack(g, max) {
  const shown = g.checkedInToday.slice(0, max || 4);
  return html`
    <span class="group-row__today">
      <span class="avatar-stack" aria-hidden="true">
        ${shown.map((id) => avatar(id, 'avatar--sm'))}
      </span>
      <span class="group-row__count">+${g.checkedInToday.length} today</span>
    </span>`;
}

function previewOf(g) {
  if (!g.messages.length) return 'No messages yet.';
  const last = g.messages[g.messages.length - 1];
  const who = last.who === store.state.user.id ? 'You' : person(last.who).name;
  return who + ': ' + last.text;
}

function groupRow(g, selectedId) {
  return html`
    <li>
      <button class="group-row" type="button" data-group-select="${g.id}"
              data-filter-name="${g.name}"
              aria-current="${g.id === selectedId ? 'true' : 'false'}">
        <span class="avatar avatar--group avatar--lg" aria-hidden="true">${monogram(g.name)}</span>
        <span class="group-row__body">
          <span class="group-row__name">${g.name}</span>
          <span class="group-row__meta">${plural(g.members.length, 'member')}</span>
          ${todayStack(g)}
          <span class="group-row__preview">${previewOf(g)}</span>
        </span>
      </button>
    </li>`;
}

/* --------------------------------------------------------------------------
   PIECES — the invitations inbox
   A queue you empty, not a place you live: one pinned row carrying a PLAIN
   count in ink-muted. There is no red badge anywhere on this screen.
-------------------------------------------------------------------------- */

function inviteInbox() {
  const list = store.state.invitations;
  const count = list.length === 0 ? 'All caught up'
    : list.length === 1 ? '1 waiting'
      : list.length + ' waiting';

  return html`
    <div class="invite-inbox">
      <!-- data-disclosure is prototype.js's hook: it owns the open/close, and
           mount() only records the result so the fold survives a re-render. -->
      <button class="invite-row" type="button" data-disclosure="invites"
              aria-expanded="${ui.invitesOpen ? 'true' : 'false'}" aria-controls="invite-panel">
        <span class="invite-row__icon" aria-hidden="true">${icon('invite', 'icon--sm')}</span>
        <span class="u-grow">
          <span class="invite-row__title">Invitations</span>
          <span class="invite-row__meta t-body-sm">${count}</span>
        </span>
        ${icon('arrow', 'icon--sm invite-row__chevron')}
      </button>

      <div class="invite-panel" id="invite-panel" ${at(!ui.invitesOpen, 'hidden')}>
        ${list.length ? html`
          <ul class="invite-list">
            ${list.map((inv) => html`
              <li class="invite-item">
                ${avatar(inv.from)}
                <span class="u-grow">
                  <span class="t-body">${person(inv.from).name} invited you to <strong>${inv.group}</strong></span>
                  <span class="t-body-sm t-muted" style="display:block">${plural(inv.members, 'member')}</span>
                </span>
                <span class="invite-item__actions">
                  <button class="btn btn--secondary btn--sm" type="button"
                          data-invite-resolve="${inv.id}" data-invite-kind="accept">Accept</button>
                  <button class="btn btn--ghost btn--sm" type="button"
                          data-invite-resolve="${inv.id}" data-invite-kind="decline">Decline</button>
                </span>
              </li>`)}
          </ul>` : html`
          <!-- The reachable empty state: the queue empties, and says so kindly. -->
          <div class="empty-state empty-state--inline">
            <svg class="illus" viewBox="0 0 120 120" role="img"
                 aria-label="An empty tray with a leaf resting in it">
              <ellipse class="illus__ground" cx="60" cy="94" rx="34" ry="8"/>
              <path class="illus__line" d="M28 62h64l-8 26H36l-8-26z"/>
              <path class="illus__accent" d="M60 62c0-14 10-22 24-21-1 13-10 21-24 21z"/>
            </svg>
            <p class="empty-state__title">Nothing waiting</p>
            <p class="empty-state__body t-body-sm">You are all caught up.</p>
          </div>`}
      </div>
    </div>`;
}

/* --------------------------------------------------------------------------
   PIECES — the thread
-------------------------------------------------------------------------- */

/** A peer check-in. Deliberately NOT a bubble: full width, sage-100, one small
    tick, 13px. Accountability without shame — nothing to beat, nothing to
    react to, no count that ticks up. */
function checkInNote(row) {
  const p = person(row.who);
  const days = milestoneIn(row.what);
  return html`
    <div class="checkin-item">
      ${avatar(row.who, 'avatar--sm')}
      <span class="checkin-item__body">
        <span class="checkin-item__text"><strong>${p.name}</strong> checked in · ${row.what}</span>
        <span class="checkin-item__time t-body-sm">Today</span>
      </span>
      ${days
        ? html`<span class="seal" role="img" aria-label="${days}-day seal">
                 <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-rosette"></use></svg>
               </span>`
        : icon('tick', 'icon--sm checkin-item__tick')}
      <button class="btn btn--ghost btn--sm checkin-item__say" type="button"
              data-reply-to="${p.name + "'s check-in"}">Say something</button>
    </div>`;
}

/** Others: surface + hairline. You: brand-100. NEVER a filled brand-500
    bubble — far too loud for the paper room. [D §3.3] */
function messageRow(m) {
  const self = m.who === store.state.user.id;
  const p = person(m.who);
  const bubble = html`
    <div>
      <p class="chat-bubble">${m.text}</p>
      <p class="chat-meta">${self ? 'You' : p.name} · ${relTime(m.at)}</p>
    </div>`;
  return self
    ? html`<div class="chat-row chat-row--self" data-msg="${m.id}">${bubble}</div>`
    : html`<div class="chat-row" data-msg="${m.id}">${avatar(m.who, 'avatar--sm')}${bubble}</div>`;
}

function dayDivider(text) {
  return html`<p class="thread__day"><span>${text}</span></p>`;
}

/**
 * The log. Earlier days first under their own dividers, then Today: the
 * check-in notes (which are today's, by definition) and then today's messages,
 * so anything you send lands at the bottom where you are looking.
 */
function threadLog(g) {
  const tk = iso(today());
  const msgs = g.messages.slice().sort((a, b) => (a.at < b.at ? -1 : 1));
  const earlier = msgs.filter((m) => iso(new Date(m.at)) !== tk);
  const todays = msgs.filter((m) => iso(new Date(m.at)) === tk);

  /* Group the earlier ones by day, preserving order. */
  const days = [];
  earlier.forEach((m) => {
    const d = new Date(m.at);
    const key = iso(d);
    const last = days[days.length - 1];
    if (last && last.key === key) last.rows.push(m);
    else days.push({ key, label: dayLabel(d), rows: [m] });
  });

  const nothing = !msgs.length && !g.activity.length;

  return html`
    <div class="pane-scroll thread" data-thread-log>
      ${nothing ? html`
        <div class="empty-state empty-state--inline">
          <svg class="illus" viewBox="0 0 120 120" role="img"
               aria-label="A folded sheet of paper resting on a stone">
            <ellipse class="illus__ground" cx="60" cy="94" rx="30" ry="8"/>
            <path class="illus__shape" d="M40 44h40v46H40z"/>
            <path class="illus__line" d="M48 58h24M48 68h24M48 78h14"/>
          </svg>
          <p class="empty-state__title">Nothing here yet</p>
          <p class="empty-state__body t-body-sm">Say the first thing. It does not have to be clever.</p>
        </div>` : ''}

      ${days.map((d) => html`${dayDivider(d.label)}${d.rows.map(messageRow)}`)}

      ${(g.activity.length || todays.length) ? dayDivider('Today') : ''}
      ${g.activity.map(checkInNote)}
      ${todays.map(messageRow)}
    </div>`;
}

/**
 * The composer. `data-say` is this view's own hook, NOT `data-composer` —
 * see the header note. The field keeps `data-composer-field` so prototype.js's
 * "Say something" reply hook can still find and focus it.
 */
function composer(g) {
  return html`
    <form class="composer" data-say="${g.id}">
      <p class="composer__reply" data-reply-chip hidden>
        <span class="chip chip--brand"><span>Replying to <span data-reply-text></span></span></span>
        <button class="icon-btn" type="button" data-reply-clear aria-label="Stop replying">
          ${icon('close', 'icon--sm')}
        </button>
      </p>
      <span class="composer__field">
        <label class="visually-hidden" for="say-${g.id}">Send a message to ${g.name}</label>
        <input class="input" id="say-${g.id}" type="text" autocomplete="off"
               placeholder="Send a message" data-composer-field>
      </span>
      <button class="icon-btn composer__send" type="submit" aria-label="Send message">
        ${icon('send', 'icon--sm')}
      </button>
    </form>`;
}

function threadPanel(g, selected) {
  return html`
    <div class="thread-panel" data-group-panel="${g.id}" ${at(g.id !== selected, 'hidden')}>
      <div class="pane-head">
        <button class="icon-btn pane-head__back" type="button" data-view-set="list"
                aria-label="Back to your groups">${icon('back', 'icon--sm')}</button>
        <span class="avatar avatar--group" aria-hidden="true">${monogram(g.name)}</span>
        <span class="u-grow">
          <span class="pane-head__title">${g.name}</span>
          <span class="pane-head__meta t-body-sm">${g.checkedInToday.length} of ${g.members.length} showed up today</span>
        </span>
        <button class="icon-btn pane-head__details" type="button" data-view-set="detail"
                aria-label="Group members and details">${icon('info', 'icon--sm')}</button>
      </div>
      ${threadLog(g)}
      ${composer(g)}
    </div>`;
}

/* --------------------------------------------------------------------------
   PIECES — members & details
-------------------------------------------------------------------------- */

function memberRow(id, checkedIn) {
  const p = person(id);
  const you = id === store.state.user.id;
  return html`
    <div class="member-row">
      ${avatar(id)}
      <span class="u-grow">
        <span class="member-row__name">${p.name}${you ? ' (you)' : ''}</span>
        <!-- A missed day is simply absent. No red, no broken chain. [D §7] -->
        ${checkedIn ? html`<span class="member-row__meta">Checked in today</span>` : ''}
      </span>
      ${checkedIn ? icon('tick', 'icon--sm member-row__tick') : ''}
    </div>`;
}

function detailPanel(g, selected) {
  const done = g.checkedInToday.length;
  return html`
    <div class="detail-panel" data-group-panel="${g.id}" ${at(g.id !== selected, 'hidden')}>
      <div class="pane-head">
        <button class="icon-btn pane-head__back" type="button" data-view-set="thread"
                aria-label="Back to the conversation">${icon('back', 'icon--sm')}</button>
        <h2 class="t-label t-ink-strong u-grow">Members &amp; details</h2>
      </div>
      <div class="pane-scroll detail-body">
        <!-- The one deep-blue surface on this screen. -->
        <section class="hero detail-hero">
          <p class="hero__label t-label">Today in ${g.name}</p>
          <p class="hero__numeral">${done}<span class="detail-hero__of">of ${g.members.length}</span></p>
          <p class="hero__body t-body-sm">
            ${done === 1 ? 'One person did their small thing today.'
              : done === 0 ? 'Nobody yet. The day is not over.'
                : done + ' people did their small thing today.'}
          </p>
          <span class="avatar-stack avatar-stack--hero" aria-hidden="true">
            ${g.checkedInToday.slice(0, 5).map((id) => avatar(id, 'avatar--sm'))}
          </span>
        </section>

        <dl class="detail-facts">
          <dt>Group description</dt>
          <dd>${g.blurb}</dd>
        </dl>

        <h3 class="detail-subhead t-label t-muted">Members</h3>
        ${g.members.map((id) => memberRow(id, g.checkedInToday.includes(id)))}

        <div class="detail-actions">
          <button class="btn btn--secondary btn--sm" type="button">Invite members</button>
          <button class="btn btn--ghost btn--sm" type="button">Leave group</button>
        </div>
      </div>
    </div>`;
}

/* --------------------------------------------------------------------------
   PIECES — challenges and events

   Neither has a fixtures collection in data.js, and data.js is not this view's
   to change. Both are therefore DERIVED from the groups that do exist: a
   challenge's ring is the real share of that group's members who checked in
   today, and an event's date is computed forward from today so the screen is
   never showing a date in the past. The titles are the only invented strings,
   exactly as the category and lesson copy in data.js is invented.
-------------------------------------------------------------------------- */

const CHALLENGE_TITLES = {
  'g-movers': 'Two minutes before breakfast',
  'g-pages': 'A page a night, all month',
  'g-two-minute': 'Keep the floor where it is',
};

function daysLeftInMonth() {
  const t = today();
  const end = new Date(t.getFullYear(), t.getMonth() + 1, 0);
  return Math.max(0, Math.round((end - t) / 86400000));
}

function challengeCard(g) {
  const on = g.checkedInToday.length;
  const of = g.members.length;
  const pct = of ? Math.round((on / of) * 100) : 0;
  return html`
    <article class="card challenge-card">
      <!-- The same 270-degree geometry and pathLength=100 normalisation as the
           day arc, at 56px. STATIC: a progress ring that fills itself on load
           is a slot machine. -->
      <span class="group-ring" role="img"
            aria-label="${on} of ${of} members on track, ${pct} percent"
            style="--pct:${pct}">
        <svg class="group-ring__svg" viewBox="0 0 72 72" aria-hidden="true" focusable="false">
          <path class="group-ring__track" d="M16.2 55.8A28 28 0 1 1 55.8 55.8" pathLength="100"/>
          <path class="group-ring__fill"  d="M16.2 55.8A28 28 0 1 1 55.8 55.8" pathLength="100"/>
        </svg>
        <span class="group-ring__value" aria-hidden="true">${pct}%</span>
      </span>
      <div class="u-grow">
        <p class="challenge-card__kicker">${MONTH[today().getMonth()]} · ${g.name}</p>
        <h3 class="challenge-card__title">${CHALLENGE_TITLES[g.id] || g.blurb}</h3>
        <p class="t-body-sm t-muted">${on} of ${of} members on track · ${plural(daysLeftInMonth(), 'day')} left</p>
      </div>
      <button class="btn btn--ghost btn--sm" type="button" data-goto-group="${g.id}">Open</button>
    </article>`;
}

/* Webinars are a TYPE TAG here, not a top-level tab. [D §3.3] */
const EVENTS = [
  { in: 4, time: '7:00 pm', kind: 'Group check-in', chip: 'chip--sage', group: 0,
    title: 'Sunday check-in', extra: 'everyone invited', action: 'Add to calendar' },
  { in: 8, time: '12:00 pm', kind: 'Webinar', chip: 'chip--brand', group: null,
    title: 'Making a habit smaller than it needs to be', extra: '45 minutes', action: 'Save a seat' },
  { in: 24, time: '9:00 am', kind: 'Meet-up', chip: '', group: 1,
    title: 'Reading hour', extra: 'Central library, quiet room', action: 'Add to calendar' },
];

function eventRow(e) {
  const d = daysAgo(-e.in);
  const g = e.group === null ? null : store.state.groups[e.group];
  const title = g ? g.name + ': ' + e.title : e.title;
  const when = WEEKDAY[d.getDay()] + ', ' + d.getDate() + ' ' + MONTH[d.getMonth()];
  return html`
    <li>
      <article class="card event-row">
        <span class="event-date" aria-hidden="true">
          <span class="event-date__month">${MONTH[d.getMonth()].slice(0, 3)}</span>
          <span class="event-date__day">${String(d.getDate()).padStart(2, '0')}</span>
        </span>
        <div class="u-grow">
          <h3 class="event-row__title">${title}</h3>
          <p class="t-body-sm t-muted">${when} · ${e.time} · ${e.extra}</p>
          <span class="${cls('chip', e.chip)}">${e.kind}</span>
        </div>
        <button class="btn btn--secondary btn--sm" type="button">${e.action}</button>
      </article>
    </li>`;
}

/* --------------------------------------------------------------------------
   EMPTY STATE — an empty social surface reads as failure unless it says
   plainly that nothing is missing. The copy invites; it does not nag, and
   there is no follower count anywhere. [M6]
-------------------------------------------------------------------------- */

function noGroupsState() {
  return html`
    <div class="empty-state">
      <svg class="illus" viewBox="0 0 120 120" role="img"
           aria-label="Three stones stacked, with one sage leaf on top">
        <ellipse class="illus__ground" cx="60" cy="102" rx="30" ry="7"/>
        <path class="illus__shape" d="M32 84h56a6 6 0 0 1 0 12H32a6 6 0 0 1 0-12z"/>
        <path class="illus__shape" d="M40 66h40a6 6 0 0 1 0 12H40a6 6 0 0 1 0-12z"/>
        <path class="illus__shape" d="M48 48h24a6 6 0 0 1 0 12H48a6 6 0 0 1 0-12z"/>
        <g class="illus__drift">
          <path class="illus__accent" d="M60 44c11-2 18-9 19-20-12-1-20 6-19 20z"/>
        </g>
      </svg>
      <p class="empty-state__title">No groups yet</p>
      <p class="empty-state__body t-body">
        A group is a few people doing small things on the same days. Two is enough.
      </p>
      <button class="btn btn--primary" type="button">Find a group</button>
    </div>`;
}

/* --------------------------------------------------------------------------
   RENDER
-------------------------------------------------------------------------- */

function segment(id, label, selected) {
  return html`
    <button class="seg-btn" type="button" role="tab" id="tab-${id}" data-tab="${id}"
            ${at(!selected, 'tabindex="-1"')}
            aria-selected="${selected ? 'true' : 'false'}" aria-controls="panel-${id}">${label}</button>`;
}

export function render() {
  const groups = store.state.groups;
  const sel = currentGroup();
  const seg = ui.segment;

  return String(html`
    <div class="page">

      <!-- HEADER. Three segments. The five-tab bar is cut. [D §3.3] -->
      <header class="page-head">
        <div class="page-head__text">
          <h1 class="t-h1">Community</h1>
          <p class="page-head__sub t-body-sm">The people who are in it with you.</p>
        </div>
        <div class="segmented" role="tablist" aria-label="Community sections" data-tabs>
          ${segment('groups', 'Groups', seg === 'groups')}
          ${segment('challenges', 'Challenges', seg === 'challenges')}
          ${segment('events', 'Events', seg === 'events')}
        </div>
      </header>

      <!-- PANEL 1 — GROUPS.
           <600  one pane at a time (list → thread → details)
           600   2-pane: list | thread; details swaps with the thread
           840   3-pane: list | thread on row one, members & details as a
                 full-width band beneath. 280 | flex | 300 does not fit at 840
                 (the extended rail takes 200 and the gutter 48), so all three
                 are on screen but the third is a band until 1200, where the
                 canonical three columns arrive. components.css §22 carries the
                 arithmetic. -->
      <div id="panel-groups" role="tabpanel" tabindex="0" aria-labelledby="tab-groups"
           data-tabpanel="groups" ${at(seg !== 'groups', 'hidden')}>

        ${!groups.length ? noGroupsState() : html`
        <div class="workspace" data-workspace data-view="${ui.view}">

          <section class="card card--flush workspace__list" aria-labelledby="groups-h">
            <div class="pane-head">
              <h2 id="groups-h" class="t-label t-ink-strong u-grow">Your groups</h2>
              <button class="btn btn--ghost btn--sm" type="button">Create</button>
            </div>

            <div class="pane-scroll">
              ${inviteInbox()}

              <div class="field pane-search">
                <label class="visually-hidden" for="group-search">Search your groups</label>
                <span class="input-with-icon">
                  ${icon('search', 'icon--sm')}
                  <input class="input" id="group-search" type="search" placeholder="Search groups"
                         data-filter-input data-filter-scope="group-list">
                </span>
              </div>

              <ul class="group-list" data-filter-list="group-list" aria-label="Your groups">
                ${groups.map((g) => groupRow(g, sel.id))}
              </ul>
            </div>
          </section>

          <section class="card card--flush workspace__thread" aria-label="Group conversation">
            ${groups.map((g) => threadPanel(g, sel.id))}
          </section>

          <aside class="card card--flush workspace__detail" aria-label="Group members and details">
            ${groups.map((g) => detailPanel(g, sel.id))}
          </aside>

        </div>`}
      </div>

      <!-- PANEL 2 — CHALLENGES. A group ring — the share of members on track —
           instead of a leaderboard. No ranking, no "you are 14th". -->
      <div id="panel-challenges" role="tabpanel" tabindex="0" aria-labelledby="tab-challenges"
           data-tabpanel="challenges" ${at(seg !== 'challenges', 'hidden')}>
        <div class="challenge-grid">${groups.map(challengeCard)}</div>
        <p class="t-body-sm t-muted challenge-foot">
          Challenges are a group's shared intention for the month. There is no leaderboard.
        </p>
      </div>

      <!-- PANEL 3 — EVENTS. Webinars are a type tag on a row, not a tab. -->
      <div id="panel-events" role="tabpanel" tabindex="0" aria-labelledby="tab-events"
           data-tabpanel="events" ${at(seg !== 'events', 'hidden')}>
        <ul class="event-list">${EVENTS.map(eventRow)}</ul>
      </div>

    </div>`);
}

/* --------------------------------------------------------------------------
   MOUNT
   Two kinds of listener: the ones that only RECORD what prototype.js has
   already done to the DOM (so the next render declares the same state), and
   the two that actually reach the store.
-------------------------------------------------------------------------- */

export function mount(root) {
  /* --- Recorders. These never touch the DOM; prototype.js owns that. ------ */
  on(root, 'click', '[data-tab]', (e, el) => { ui.segment = el.getAttribute('data-tab'); });
  on(root, 'click', '[data-group-select]', (e, el) => {
    ui.groupId = el.getAttribute('data-group-select');
    ui.view = 'thread';
  });
  on(root, 'click', '[data-view-set]', (e, el) => { ui.view = el.getAttribute('data-view-set'); });
  on(root, 'click', '[data-disclosure]', () => { ui.invitesOpen = !ui.invitesOpen; });

  /* Keyboard tab moves (arrows / Home / End) change the panel too. */
  on(root, 'keydown', '[data-tab]', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    /* prototype.js has already moved focus by the time this bubbles back. */
    requestAnimationFrame(() => {
      const sel = root.querySelector('[data-tab][aria-selected="true"]');
      if (sel) ui.segment = sel.getAttribute('data-tab');
    });
  });

  /* --- Store-backed. ------------------------------------------------------ */

  /* SENDING A MESSAGE actually works: it goes through the store, so it is in
     the fixture from that moment on and survives a trip to Home and back. The
     re-render that follows is what puts it in the thread — which is exactly
     why this form is not `data-composer`. */
  on(root, 'submit', '[data-say]', (e, form) => {
    e.preventDefault();
    const field = form.querySelector('[data-composer-field]');
    const text = field ? field.value.trim() : '';
    if (!text) { if (field) field.focus(); return; }
    ui.justSent = true;
    store.sendMessage(form.getAttribute('data-say'), text);
    if (window.HC && window.HC.announce) window.HC.announce('Message sent.');
  });

  /* Accept and decline both resolve the invitation off the queue — the store
     has one mutation for that and the difference is only what we say. */
  on(root, 'click', '[data-invite-resolve]', (e, el) => {
    const accepted = el.getAttribute('data-invite-kind') === 'accept';
    ui.invitesOpen = true;
    store.acceptInvitation(el.getAttribute('data-invite-resolve'));
    if (window.HC && window.HC.announce) {
      window.HC.announce(accepted ? 'Request accepted.' : 'Request declined.');
    }
  });

  /* A challenge card opens its group: switch the segment, then select the row.
     Driving the owning hooks rather than duplicating what they do. */
  on(root, 'click', '[data-goto-group]', (e, el) => {
    const id = el.getAttribute('data-goto-group');
    const tab = root.querySelector('[data-tab="groups"]');
    if (tab) tab.click();
    const row = root.querySelector('[data-group-select="' + id + '"]');
    if (row) { row.click(); row.focus(); }
  });

  /* --- After the paint ---------------------------------------------------- */

  /* A thread is read from the bottom. Every render starts there, including the
     one that just added your own message. */
  root.querySelectorAll('.thread-panel:not([hidden]) [data-thread-log]').forEach((log) => {
    log.scrollTop = log.scrollHeight;
  });

  if (ui.justSent) {
    ui.justSent = false;
    const field = root.querySelector('.thread-panel:not([hidden]) [data-composer-field]');
    if (field) field.focus({ preventScroll: true });

    /* The settle-in on the message you just sent. The class is only added when
       motion is allowed: the keyframe animates `translate`, which base.css's
       `transform: none` cannot reach, and HC.reducedMotion() also honours the
       [data-motion] review hook the media query knows nothing about. */
    const rows = root.querySelectorAll('.thread-panel:not([hidden]) .chat-row--self');
    const last = rows[rows.length - 1];
    if (last && !(window.HC && window.HC.reducedMotion())) {
      last.classList.add('is-entering');
      setTimeout(() => last.classList.remove('is-entering'), 400);
    }
  }

  /* Nothing here outlives the view: every listener is bound to `root`, which
     the router removes wholesale, and the one timer above is 400ms and harmless
     if the view goes first. No destroy() needed. */
}
