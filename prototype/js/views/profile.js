/* ============================================================================
   HabitCrafts — views/profile.js
   IDENTITY FIRST, PLUMBING LAST.

   The hero is the SHELF: every gild mark earned across every habit, derived
   from `store.gildOf()` — which reads the BEST streak, not the current one, so
   a mark records what you did and survives a break. [D §2.4] It is the trophy
   case the gilding system pays into and the one place gold appears in quantity.
   Everything below it is settings, behind eight named doors rather than in a
   list-graveyard.

   Four of those settings are REAL, not painted:
     · Theme       → store.setTheme        (System / Light / Dark, persists)
     · Motion      → store.setMotion       (drives the same reduced-motion path)
     · Quick check-in → store.setQuickCheckIn — genuinely switches the check-in
       gesture from press-and-hold to a single tap on every screen. [D §2.1]
     · Archive / restore → store.archiveHabit / store.restoreHabit — this is
       where a habit archived from habit-detail lands.

   The milestone chime and the privacy switches are view-local: the data model
   stores neither, and inventing a fake backend for them would be worse than
   admitting they are in-session. They are declared below with the pane state
   for the same reason.

   This view does NOT set meta.ownsCheckIn: it renders no check-in rings, and it
   wants the re-render every store change gives it. [README §12.4]
   ========================================================================= */

import * as store from '../store.js';
import { html, icon, cls, plural, on, restoreRings } from '../ui.js';

export const meta = {
  title: 'Profile',
  nav: 'profile',
  level: 0,
};

/* --------------------------------------------------------------------------
   VIEW-LOCAL UI STATE

   render() is a pure function of the store plus these four. They are here and
   not in the store because the store models the product, not the furniture:
   which settings pane is open is not something the app should persist, and a
   re-render caused by flipping a switch must not throw the reader back to the
   first pane. Written only by mount(), read only by render().
-------------------------------------------------------------------------- */

let pane = 'habits';   /* which [data-pane-tab] is selected */
let pushed = false;    /* below 600 the panes push; this survives a re-render */
let chime = false;     /* milestone sound — OFF by default, per the direction */

const visibility = {
  Goals: true, Habits: true, Profile: true,
  Age: false, Gender: false, Height: false, Weight: false,
};

const PANES = [
  { id: 'habits',     icon: 'goal',          label: 'My Goals & Habits' },
  { id: 'details',    icon: 'person',        label: 'Profile' },
  { id: 'privacy',    icon: 'lock',          label: 'Privacy' },
  { id: 'appearance', icon: 'contrast',      label: 'Appearance' },
  { id: 'access',     icon: 'accessibility', label: 'Accessibility' },
  { id: 'notify',     icon: 'bell',          label: 'Notifications' },
  { id: 'blocked',    icon: 'community',     label: 'Blocked Users' },
  { id: 'account',    icon: 'key',           label: 'Account' },
];

/* --------------------------------------------------------------------------
   DERIVATIONS
-------------------------------------------------------------------------- */

/** Fixture categories are ids ("c-mind"); habits carry the bare name ("mind").
    One place to reconcile them rather than six. */
function categoryName(key) {
  const want = String(key || '').replace(/^c-/, '');
  const found = store.data.categories.find((c) => c.id.replace(/^c-/, '') === want);
  return found ? found.name : 'Other';
}

/** Every earned mark, best first. Archived habits keep theirs — that is the
    whole point of a mark being cosmetic and permanent. [D §2.4] */
function shelf() {
  return store.state.habits
    .map((h) => ({ habit: h, tier: store.gildOf(h), best: store.bestStreakOf(h) }))
    .filter((m) => m.tier > 0)
    .sort((a, b) => b.tier - a.tier || b.best - a.best);
}

/** The habit closest to its next mark, so the shelf can say what is coming. */
function nextMark() {
  let best = null;
  store.activeHabits().forEach((h) => {
    const streak = store.streakOf(h);
    const next = store.data.MILESTONES.find((m) => m > streak);
    if (!next) return;
    const away = next - streak;
    if (!best || away < best.away) {
      best = { habit: h, away, tier: next, first: store.gildOf(h) === 0 };
    }
  });
  return best;
}

/* --------------------------------------------------------------------------
   PIECES
-------------------------------------------------------------------------- */

/** One mark on the shelf. The glyph restates the gild that sits on the habit
    card itself: day 7 a corner tick, day 30 a gold ring, day 100 the embossed
    seal, day 365 the seal filled solid. */
function mark(m) {
  const glyph = m.tier >= 100
    ? html`<span class="${cls('seal', m.tier >= 365 && 'seal--solid')}" aria-hidden="true">
             <svg viewBox="0 0 24 24"><use href="#i-rosette"></use></svg>
           </span>`
    : m.tier >= 30
      ? html`<span class="mark__ring" aria-hidden="true"></span>`
      : html`<span class="mark__tick" aria-hidden="true"></span>`;

  const tier = m.tier >= 365 ? '365 days · solid seal'
    : m.tier >= 100 ? '100 days · embossed seal'
    : m.tier >= 30 ? '30 days · gold hairline'
    : '7 days · corner tick';

  return html`
    <div class="mark">
      ${glyph}
      <span class="mark__body">
        <span class="mark__name">${m.habit.behavior}</span>
        <span class="mark__tier">${tier}${m.habit.archived ? ' · archived' : ''}</span>
      </span>
    </div>`;
}

/** A habit card as it appears inside a goal row or the archive: no ring, no
    `data-habit`, so nothing on any screen counts it as today's work. */
function habitCard(h, action) {
  const gild = store.gildOf(h);
  const best = store.bestStreakOf(h);

  const seal = gild >= 100
    ? html`<span class="${cls('seal', gild >= 365 && 'seal--solid')}" role="img"
                 aria-label="${gild}-day seal">
             <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-rosette"></use></svg>
           </span>`
    : '';

  const title = seal
    ? html`<div class="u-flow-tight"><h3 class="habit-card__title">${h.behavior}</h3>${seal}</div>`
    : html`<h3 class="habit-card__title">${h.behavior}</h3>`;

  const line = [h.prompt, best > 0 ? 'you showed up for ' + plural(best, 'day') : 'no days recorded yet']
    .filter(Boolean).join(' · ');

  return html`
    <article class="${cls('card', 'habit-card', gild && 'habit-card--gild-' + gild)}">
      <div class="habit-card__body">
        ${title}
        <p class="habit-card__meta">${line}</p>
      </div>
      ${action}
    </article>`;
}

/** A privacy switch. The value is written out as a word as well as shown by the
    thumb, so the state never rests on colour. prototype.js paints the word and
    announces the change; this view keeps the value. */
function visibilityRow(name, help) {
  const id = 'v-' + name.toLowerCase();
  return html`
    <div class="setting-row">
      <div class="setting-row__body">
        <span class="setting-row__label">${name}</span>
        <span class="setting-row__value"><span data-visibility-value>${visibility[name] ? 'Public' : 'Private'}</span>${help ? ' · ' + help : ''}</span>
      </div>
      <span class="switch">
        <input type="checkbox" id="${id}" role="switch" data-visibility="${name}" ${visibility[name] ? 'checked' : ''}>
        <span class="switch__track" aria-hidden="true"></span>
        <span class="switch__thumb" aria-hidden="true"></span>
        <label class="visually-hidden" for="${id}">Show my ${name.toLowerCase()} to other people</label>
      </span>
    </div>`;
}

/* --------------------------------------------------------------------------
   RENDER
-------------------------------------------------------------------------- */

export function render() {
  const u = store.state.user;
  const active = store.activeHabits();
  const archived = store.archivedHabits();
  const marks = shelf();
  const next = nextMark();
  const streak = store.overallStreak();

  /* Goals, derived: the fixture groups habits by category, and the category is
     the closest thing the data model has to a goal. No invented list. */
  const goals = [];
  active.forEach((h) => {
    const name = categoryName(h.category);
    const g = goals.find((x) => x.name === name);
    if (g) g.habits.push(h);
    else goals.push({ name, habits: [h] });
  });

  const reminders = active.filter((h) => h.time);
  const publicHabits = visibility.Habits;

  const paneOf = (id) => PANES.find((p) => p.id === id);

  return String(html`
    <div class="page">

      <!-- ==================================================================
           THE SHELF — the hero. Avatar, name, member-since, and the gild marks
           earned across every habit. This is the screen's ONE hero-fill
           surface, and the only place gold appears in quantity. [D §3.5]
           =============================================================== -->
      <section class="hero profile-hero" aria-labelledby="me-h"
               style="margin-block-end:var(--space-24)">
        <div class="profile-hero__head">
          <span class="avatar avatar--xl" aria-hidden="true">${u.initial}</span>
          <div class="u-grow">
            <h1 class="t-h1" id="me-h" style="color:var(--c-hero-ink)">${u.name}</h1>
            <p class="hero__body t-body-sm">
              Member since ${u.memberSince} · ${plural(active.length, 'habit')} kept
            </p>
            ${streak > 0 ? html`
              <span class="chip chip--streak" style="margin-block-start:var(--space-8)">
                ${icon('flame')}<span>${plural(streak, 'day')}</span>
              </span>` : ''}
          </div>
          <button class="btn btn--secondary btn--sm" type="button" data-modal-open="preview">
            ${icon('eye')} Preview profile
          </button>
        </div>

        <h2 class="hero__label t-label" style="margin-block-start:var(--space-24)">Marks earned</h2>
        ${marks.length ? html`<div class="shelf">${marks.map(mark)}</div>` : html`
          <p class="hero__body t-body-sm" style="margin-block-start:var(--space-8)">
            The shelf is empty for now. Seven days on any habit puts the first
            mark on it, and marks are yours to keep whatever happens next.
          </p>`}
        ${next ? html`
          <p class="hero__body t-body-sm" style="margin-block-start:var(--space-12)">
            ${next.habit.behavior} earns ${next.first ? 'its first mark' : 'its ' + next.tier + '-day mark'}
            in ${plural(next.away, 'day')}.
          </p>` : ''}
      </section>

      <!-- ==================================================================
           THE REST. The Overview / Membership / Settings tab bar is cut.
           Below 600 choosing a section pushes to its detail with a back
           affordance; from 600 up both panes are permanent. [D §3.5]
           =============================================================== -->
      <div class="${cls('profile-panes', pushed && 'is-detail')}" data-panes>

        <div class="profile-panes__nav">
          <div class="pane-nav" role="tablist" aria-orientation="vertical" aria-label="Profile sections">
            ${PANES.map((p) => html`
              <button class="pane-nav__btn" type="button" role="tab" data-pane-tab
                      id="tab-${p.id}" aria-controls="pane-${p.id}"
                      aria-selected="${pane === p.id ? 'true' : 'false'}"
                      tabindex="${pane === p.id ? '0' : '-1'}">
                ${icon(p.icon)}
                <span class="u-grow">${p.label}</span>
                ${icon('chevron', 'icon--chevron')}
              </button>`)}
          </div>
        </div>

        <div class="profile-panes__detail">
          <button class="pane-back" type="button" data-pane-back>
            ${icon('arrow')} All sections
          </button>

          <!-- ── My Goals & Habits, with the archive absorbed from Progress's
                  "Removed Habits". This is where a habit archived from habit
                  detail lands, and where it comes back from. [D §3.2 / §3.5] -->
          <section class="card card--roomy" id="pane-habits" role="tabpanel"
                   aria-labelledby="tab-habits" tabindex="0" ${pane === 'habits' ? '' : 'hidden'}>
            <h2 class="t-h2">My Goals &amp; Habits</h2>
            <p class="t-body-sm t-muted" style="margin-block:var(--space-4) var(--space-16)">
              If you wish to keep your goals and habits private from other people,
              turn them off under Privacy.
            </p>

            ${goals.length ? goals.map((g, i) => html`
              <details class="goal-row" ${i === 0 ? 'open' : ''}>
                <summary>
                  ${icon('goal')}
                  <span class="u-grow">
                    <span class="goal-row__name" style="display:block">${g.name}</span>
                    <span class="goal-row__meta">Habits: ${g.habits.length}</span>
                  </span>
                  ${icon('chevron', 'icon--chevron')}
                </summary>
                <div class="goal-row__body">
                  ${g.habits.map((h) => habitCard(h, html`
                    <button class="btn btn--ghost btn--sm" type="button" data-archive="${h.id}">Archive</button>`))}
                </div>
              </details>`)
            : html`
              <div class="empty-state empty-state--inline">
                <p class="empty-state__title">No active habits</p>
                <p class="empty-state__body t-body">Everything you have made is in the archive below.</p>
                <a class="btn btn--primary" href="#/create">Craft a habit</a>
              </div>`}

            <!-- The glyph is inline-block so it sits ON the heading's baseline
                 rather than above it — .icon is a flex item everywhere else. -->
            <h3 class="t-h3" style="margin-block:var(--space-32) var(--space-4)">
              <span style="display:inline-block;vertical-align:-4px">${icon('archive', 'icon--sm')}</span>
              Archive
            </h3>
            <p class="t-body-sm t-muted" style="margin-block-end:var(--space-16)">
              Habits you've stopped keeping. Nothing here is lost, and the marks
              they earned stay on the shelf.
            </p>

            ${archived.length ? html`
              <div class="u-stack">
                ${archived.map((h) => habitCard(h, html`
                  <button class="btn btn--secondary btn--sm" type="button" data-restore="${h.id}">Restore</button>`))}
              </div>`
            : html`
              <p class="t-body-sm t-muted">
                Nothing is archived. Archiving a habit stops it appearing on Today
                without deleting a single day of it.
              </p>`}
          </section>

          <!-- ── Profile details. Real fields from the shipping form; the two
                  lorem-ipsum placeholders are simply gone. [D §3.5 cut] -->
          <section class="card card--roomy" id="pane-details" role="tabpanel"
                   aria-labelledby="tab-details" tabindex="0" ${pane === 'details' ? '' : 'hidden'}>
            <h2 class="t-h2">Profile</h2>
            <p class="t-body-sm t-muted" style="margin-block:var(--space-4) var(--space-24)">
              Only what you make public under Privacy is ever shown to other people.
            </p>

            <div class="field-grid">
              <div class="field">
                <label class="field__label" for="p-name">Name</label>
                <input class="input" id="p-name" type="text" maxlength="50" value="${u.name}">
              </div>
              <div class="field">
                <label class="field__label" for="p-email">Email Address</label>
                <input class="input" id="p-email" type="email" maxlength="50" value="${u.email}">
              </div>
              <div class="field">
                <label class="field__label" for="p-age">Date of birth</label>
                <input class="input" id="p-age" type="date" value="1988-04-12">
                <span class="field__help">Your birthday is never shown — only the age it works out to.</span>
              </div>
              <div class="field">
                <label class="field__label" for="p-gender">Gender</label>
                <input class="input" id="p-gender" type="text" value="Male">
              </div>
              <div class="field">
                <span class="field__label" id="p-height-label">Height</span>
                <div class="field-pair" role="group" aria-labelledby="p-height-label">
                  <select class="select" aria-label="Feet">
                    <option>4 ft</option><option selected>5 ft</option><option>6 ft</option><option>7 ft</option>
                  </select>
                  <select class="select" aria-label="Inches">
                    <option>0 in</option><option>1 in</option><option>2 in</option><option>3 in</option>
                    <option>4 in</option><option>5 in</option><option>6 in</option><option>7 in</option>
                    <option>8 in</option><option selected>9 in</option><option>10 in</option><option>11 in</option>
                  </select>
                </div>
              </div>
              <div class="field">
                <label class="field__label" for="p-weight">Weight (lbs)</label>
                <input class="input" id="p-weight" type="number" value="168">
              </div>
              <div class="field field-grid__full">
                <label class="field__label" for="p-location">Location</label>
                <input class="input" id="p-location" type="text" maxlength="50" value="Portland, OR">
              </div>
            </div>

            <p class="t-body-sm t-muted" style="margin-block-start:var(--space-24)">
              Read our <a href="https://www.habitcrafts.com/privacy">privacy policy</a>
              and our <a href="https://www.habitcrafts.com/eula">terms of service</a>.
            </p>

            <div class="u-flow u-wrap" style="margin-block-start:var(--space-24)">
              <button class="btn btn--primary" type="button" data-profile-save>Save</button>
              <span class="t-body-sm t-sage" data-profile-saved hidden>Profile updated!</span>
            </div>
          </section>

          <!-- ── Privacy. Seven visibility switches, each writing its value out
                  as a word so the state never rests on colour. -->
          <section class="card card--roomy" id="pane-privacy" role="tabpanel"
                   aria-labelledby="tab-privacy" tabindex="0" ${pane === 'privacy' ? '' : 'hidden'}>
            <h2 class="t-h2">Privacy</h2>
            <p class="t-body-sm t-muted" style="margin-block:var(--space-4) var(--space-16)">
              You choose what other people see. Everything starts private.
            </p>
            ${visibilityRow('Goals')}
            ${visibilityRow('Habits')}
            ${visibilityRow('Profile')}
            ${visibilityRow('Age')}
            ${visibilityRow('Gender')}
            ${visibilityRow('Height')}
            ${visibilityRow('Weight')}
          </section>

          <!-- ── Appearance. Wired to store.setTheme, which mirrors the choice
                  into HC — so it holds across every route and survives the
                  re-render it causes. [D §3.5 add] -->
          <section class="card card--roomy" id="pane-appearance" role="tabpanel"
                   aria-labelledby="tab-appearance" tabindex="0" ${pane === 'appearance' ? '' : 'hidden'}>
            <h2 class="t-h2">Appearance</h2>
            <p class="t-body-sm t-muted" style="margin-block:var(--space-4) var(--space-16)">
              Daylight and Nightfall are the same room at two times of day.
              After 20:00 the app dims a little on its own.
            </p>
            <div class="setting-row">
              <div class="setting-row__body">
                <span class="setting-row__label">Theme</span>
                <span class="setting-row__value">
                  ${store.state.theme === 'system'
                    ? 'Follows your system unless you choose'
                    : store.state.theme === 'dark' ? 'Nightfall, whatever your system says'
                    : 'Daylight, whatever your system says'}
                </span>
              </div>
              <div class="segmented" role="group" aria-label="Theme">
                <button class="seg-btn" type="button" data-theme-btn="system" aria-pressed="${store.state.theme === 'system' ? 'true' : 'false'}">System</button>
                <button class="seg-btn" type="button" data-theme-btn="light" aria-pressed="${store.state.theme === 'light' ? 'true' : 'false'}">Light</button>
                <button class="seg-btn" type="button" data-theme-btn="dark" aria-pressed="${store.state.theme === 'dark' ? 'true' : 'false'}">Dark</button>
              </div>
            </div>
          </section>

          <!-- ── Accessibility. "Quick check-in" writes the same flag the ring
                  already reads, so turning it on genuinely changes the gesture
                  on every screen in this prototype. [D §2.1] -->
          <section class="card card--roomy" id="pane-access" role="tabpanel"
                   aria-labelledby="tab-access" tabindex="0" ${pane === 'access' ? '' : 'hidden'}>
            <h2 class="t-h2">Accessibility</h2>

            <div class="setting-row">
              <div class="setting-row__body">
                <span class="setting-row__label">Quick check-in (single tap)</span>
                <span class="setting-row__value">
                  ${u.quickCheckIn ? 'On' : 'Off'} · complete a habit with one tap
                  instead of a press and hold.
                </span>
              </div>
              <span class="switch">
                <input type="checkbox" id="a-quick" role="switch" data-quick-checkin-toggle
                       ${u.quickCheckIn ? 'checked' : ''}>
                <span class="switch__track" aria-hidden="true"></span>
                <span class="switch__thumb" aria-hidden="true"></span>
                <label class="visually-hidden" for="a-quick">Quick check-in, single tap</label>
              </span>
            </div>

            <div class="setting-row">
              <div class="setting-row__body">
                <span class="setting-row__label">Motion</span>
                <span class="setting-row__value">
                  Reduced keeps the ring fill and the colour changes, and drops the
                  springs, the scale and the flecks.
                </span>
              </div>
              <div class="segmented" role="group" aria-label="Motion">
                <button class="seg-btn" type="button" data-motion-btn="auto" aria-pressed="${store.state.motion === 'auto' ? 'true' : 'false'}">System</button>
                <button class="seg-btn" type="button" data-motion-btn="reduce" aria-pressed="${store.state.motion === 'reduce' ? 'true' : 'false'}">Reduced</button>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-row__body">
                <span class="setting-row__label">Milestone chime</span>
                <span class="setting-row__value">
                  <span data-onoff-value>${chime ? 'On' : 'Off'}</span> · a short sound at 7, 30, 100 and 365 days.
                  Off unless you ask for it.
                </span>
              </div>
              <span class="switch">
                <input type="checkbox" id="a-chime" role="switch" data-onoff="Milestone chime" ${chime ? 'checked' : ''}>
                <span class="switch__track" aria-hidden="true"></span>
                <span class="switch__thumb" aria-hidden="true"></span>
                <label class="visually-hidden" for="a-chime">Play a chime at milestones</label>
              </span>
            </div>
          </section>

          <!-- ── Notifications. Each habit carries its own reminder; whether it
                  can reach you at all is the device's decision. Say so. -->
          <section class="card card--roomy" id="pane-notify" role="tabpanel"
                   aria-labelledby="tab-notify" tabindex="0" ${pane === 'notify' ? '' : 'hidden'}>
            <h2 class="t-h2">Notifications</h2>
            <p class="t-body-sm t-muted" style="margin-block:var(--space-4) var(--space-16)">
              Each habit carries its own reminder, set where you wrote its prompt.
              Whether they can reach you at all is your device's decision.
            </p>

            ${reminders.map((h) => html`
              <div class="setting-row">
                <div class="setting-row__body">
                  <span class="setting-row__label">${h.behavior}</span>
                  <span class="setting-row__value reminder-line">
                    ${icon('bell')}
                    <span>${h.days.length === 7 ? 'Every day' : h.days.length === 2 ? 'Weekends' : plural(h.days.length, 'day') + ' a week'} at ${h.time}</span>
                  </span>
                </div>
                <a class="btn btn--secondary btn--sm" href="#/habit/${h.id}">Edit</a>
              </div>`)}

            <div class="setting-row">
              <div class="setting-row__body">
                <span class="setting-row__label">System permission</span>
                <span class="setting-row__value">Allowed</span>
              </div>
              <a class="btn btn--secondary btn--sm" href="#/profile">Open device settings</a>
            </div>
          </section>

          <!-- ── Blocked Users. -->
          <section class="card card--roomy" id="pane-blocked" role="tabpanel"
                   aria-labelledby="tab-blocked" tabindex="0" ${pane === 'blocked' ? '' : 'hidden'}>
            <h2 class="t-h2">Blocked Users</h2>
            <div class="empty-state">
              <svg class="illus" viewBox="0 0 120 120" role="img"
                   aria-label="A closed door drawn in two colours">
                <ellipse class="illus__ground" cx="60" cy="100" rx="32" ry="8"/>
                <rect class="illus__shape" x="34" y="26" width="52" height="72" rx="6"/>
                <circle class="illus__accent" cx="74" cy="64" r="4"/>
              </svg>
              <p class="empty-state__title">No Blocked Users</p>
              <p class="empty-state__body t-body">
                Blocking someone hides your check-ins from them and theirs from you.
                You can undo it here whenever you like.
              </p>
            </div>
          </section>

          <!-- ── Account. Deletion lives behind this door, in clay-600 and in
                  the product's voice — never red-alarm styling, and the
                  all-caps "WARNING" dialog is rewritten. [D §3.5] -->
          <section class="card card--roomy" id="pane-account" role="tabpanel"
                   aria-labelledby="tab-account" tabindex="0" ${pane === 'account' ? '' : 'hidden'}>
            <h2 class="t-h2">Account</h2>

            <div class="setting-row">
              <div class="setting-row__body">
                <span class="setting-row__label">Contact Us</span>
                <span class="setting-row__value">Tell us about your experience.</span>
              </div>
              <a class="btn btn--secondary btn--sm"
                 href="mailto:support@habitcrafts.com?subject=HabitCrafts%20Help">Email us</a>
            </div>

            <div class="setting-row">
              <div class="setting-row__body">
                <span class="setting-row__label">Log Out</span>
                <span class="setting-row__value">Signed in as ${u.email}</span>
              </div>
              <button class="btn btn--secondary btn--sm" type="button" data-modal-open="logout">Log out</button>
            </div>

            <div class="setting-row">
              <div class="setting-row__body">
                <span class="setting-row__label">Delete Account</span>
                <span class="setting-row__value">
                  Removes your account and everything in it, for good.
                </span>
              </div>
              <button class="btn btn--danger btn--sm" type="button" data-modal-open="delete">Delete Account</button>
            </div>
          </section>
        </div>
      </div>

      <!-- ==================================================================
           MODALS. The kit's floating layer: scrim at 40% ink, spring-gentle
           entry, shadow-lg, Escape and focus restore from prototype.js.
           There is no snackbar anywhere in this system. [D §2.2]
           =============================================================== -->

      <div class="scrim" data-modal="preview" hidden>
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="preview-title">
          <div class="u-between">
            <h2 class="t-h2" id="preview-title">How others see you</h2>
            <button class="icon-btn" type="button" data-modal-close aria-label="Close preview">
              ${icon('close', 'icon--sm')}
            </button>
          </div>
          <div class="u-flow" style="margin-block-start:var(--space-16)">
            <span class="avatar avatar--lg" aria-hidden="true">${u.initial}</span>
            <p class="t-h3">${u.name}</p>
          </div>
          <div class="u-flow-tight u-wrap" style="margin-block-start:var(--space-12)">
            <span class="chip">Portland, OR</span>
            <span class="chip">Member since ${u.memberSince}</span>
          </div>
          <p class="t-body-sm t-muted" style="margin-block-start:var(--space-8)">
            ${['Age', 'Gender', 'Height', 'Weight'].filter((k) => !visibility[k]).length
              ? ['Age', 'Gender', 'Height', 'Weight'].filter((k) => !visibility[k]).join(', ').replace(/, ([^,]*)$/, ' and $1') + ' stay private until you turn them on.'
              : 'Everything on your profile is public right now.'}
          </p>
          <h3 class="t-label t-muted" style="margin-block:var(--space-24) var(--space-8)">My Habits</h3>
          ${publicHabits && active.length ? html`
            <ul class="u-stack-8" style="list-style:none;padding:0;margin:0">
              ${active.map((h) => html`<li class="t-body">${h.behavior}</li>`)}
            </ul>`
          : html`<p class="t-body t-muted">Your habits are private, so nobody sees this list.</p>`}
          <div style="margin-block-start:var(--space-24)">
            <button class="btn btn--secondary" type="button" data-modal-close>Close</button>
          </div>
        </div>
      </div>

      <div class="scrim" data-modal="logout" hidden>
        <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="logout-title">
          <h2 class="t-h2" id="logout-title">Log out?</h2>
          <p class="t-body t-muted" style="margin-block:var(--space-8) var(--space-24)">
            Your habits and marks stay exactly where they are. Sign back in whenever.
          </p>
          <div class="u-flow u-wrap">
            <a class="btn btn--primary" href="#/auth" data-modal-close>Log out</a>
            <button class="btn btn--ghost" type="button" data-modal-close>Cancel</button>
          </div>
        </div>
      </div>

      <div class="scrim" data-modal="delete" hidden>
        <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
          <h2 class="t-h2" id="delete-title">Delete your account?</h2>
          <p class="t-body t-muted" style="margin-block:var(--space-8) var(--space-24)">
            This permanently removes your account and everything in it — every habit,
            every day you showed up, and every mark you earned. It can't be undone.
          </p>
          <div class="u-flow u-wrap">
            <button class="btn btn--danger" type="button" data-modal-close>Delete account</button>
            <button class="btn btn--ghost" type="button" data-modal-close>Cancel</button>
          </div>
        </div>
      </div>
    </div>`);
}

/* --------------------------------------------------------------------------
   FALLBACK WIRING — and why it exists

   prototype.js's Profile module (§"Create Habit + Profile") owns [data-panes],
   the switch wording, [data-profile-save] and [data-modal-open]. Unlike the
   Progress module, it does NOT chain onto HC.init — its boot() runs once on
   DOMContentLoaded against `document` and nothing re-runs it. On the ten static
   screens that was enough. In the SPA it is not: this view's markup is injected
   into the document long after that, and again on every re-render, so those
   four hooks arrive unwired.

   So the view wires them, and each function guards on the SAME flag
   prototype.js sets (`__hcPanes`, `__hcBound`). mount() runs after HC.init, so
   if that module is ever chained on, its flags are already set and every one of
   these becomes a no-op. One hook, one owner, whichever owner got there first.
   [README §4]
-------------------------------------------------------------------------- */

function say(msg) { if (window.HC) window.HC.announce(msg); }

/** The 2-pane category tabs: roving tabindex, arrows, Home, End, and the
    push-to-detail behaviour below 600. */
function wirePanes(root) {
  const wrap = root.querySelector('[data-panes]');
  if (!wrap || wrap.__hcPanes) return null;
  wrap.__hcPanes = true;

  const tabs = [...wrap.querySelectorAll('[data-pane-tab]')];
  const narrow = () => window.matchMedia('(max-width: 599px)').matches;

  function select(tab, focusPanel) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const p = document.getElementById(t.getAttribute('aria-controls'));
      if (p) p.hidden = !on;
    });
    if (narrow()) {
      wrap.classList.add('is-detail');
      const p = document.getElementById(tab.getAttribute('aria-controls'));
      if (focusPanel && p) p.focus();
    }
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab, true));
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      next.focus();
      select(next, false);
    });
  });

  wrap.querySelectorAll('[data-pane-back]').forEach((b) => {
    b.addEventListener('click', () => {
      wrap.classList.remove('is-detail');
      const cur = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
      if (cur) cur.focus();
    });
  });

  /* Leaving the narrow width must not strand the reader in "detail" mode.
     A window listener outlives the view, so it is returned for cleanup. */
  const onResize = () => {
    if (narrow()) return;
    pushed = false;
    wrap.classList.remove('is-detail');
  };
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}

/** The switches write their value as a word as well as moving the thumb, so no
    setting state ever rests on colour alone. */
function wireSwitchText(root) {
  root.querySelectorAll('[data-visibility], [data-onoff]').forEach((input) => {
    if (input.__hcBound) return;
    input.__hcBound = true;
    const vis = input.getAttribute('data-visibility');
    const row = input.closest('.setting-row') || input.parentNode;
    const out = row.querySelector(vis ? '[data-visibility-value]' : '[data-onoff-value]');
    input.addEventListener('change', () => {
      if (out) out.textContent = vis ? (input.checked ? 'Public' : 'Private') : (input.checked ? 'On' : 'Off');
      say(vis
        ? vis + ' is now ' + (input.checked ? 'public' : 'private') + '.'
        : input.getAttribute('data-onoff') + ' ' + (input.checked ? 'on' : 'off') + '.');
    });
  });
}

/** The shipping app confirms a save with a dark snackbar. There is no snackbar
    in this system, so it is an inline line beside the button. [D §2.2] */
function wireSave(root) {
  root.querySelectorAll('[data-profile-save]').forEach((btn) => {
    if (btn.__hcBound) return;
    btn.__hcBound = true;
    btn.addEventListener('click', () => {
      const flag = root.querySelector('[data-profile-saved]');
      if (flag) flag.hidden = false;
      say('Profile updated!');
    });
  });
}

/** The kit's .scrim / .modal, plus Escape, scrim click, initial focus and focus
    restore. Nothing here traps focus — that is a real dialog's job, and these
    are the prototype's three confirmations. */
function wireModals(root) {
  root.querySelectorAll('[data-modal-open]').forEach((btn) => {
    if (btn.__hcBound) return;
    btn.__hcBound = true;
    btn.addEventListener('click', () => {
      const modal = root.querySelector('[data-modal="' + btn.getAttribute('data-modal-open') + '"]');
      if (!modal) return;
      modal.hidden = false;
      const first = modal.querySelector('[data-modal-close], button, a[href]');
      if (first) first.focus();

      function close() {
        modal.hidden = true;
        document.removeEventListener('keydown', onKey);
        modal.removeEventListener('click', onClick);
        btn.focus();
      }
      function onKey(e) { if (e.key === 'Escape') close(); }
      function onClick(e) {
        if (e.target === modal || (e.target.closest && e.target.closest('[data-modal-close]'))) close();
      }
      document.addEventListener('keydown', onKey);
      modal.addEventListener('click', onClick);
    });
  });
}

/* --------------------------------------------------------------------------
   MOUNT

   Two jobs: the join to the store, and putting the view-local state back after
   the re-render a store mutation causes.
-------------------------------------------------------------------------- */

export function mount(root) {
  /* Defensive: no ring renders here today, but a habit card that ever gains one
     must not come back from a re-render with an empty ring. [README §12.4] */
  restoreRings(root);

  /* --- Pane selection, remembered across re-renders ----------------------
     These only RECORD the choice. The DOM work belongs to whichever module
     owns [data-panes] — see the note above wirePanes. */
  on(root, 'click', '[data-pane-tab]', (e, el) => {
    pane = el.id.replace(/^tab-/, '');
    if (window.matchMedia('(max-width: 599px)').matches) pushed = true;
  });
  on(root, 'keyup', '[data-pane-tab]', () => {
    const sel = root.querySelector('[data-pane-tab][aria-selected="true"]');
    if (sel) pane = sel.id.replace(/^tab-/, '');
  });
  on(root, 'click', '[data-pane-back]', () => { pushed = false; });

  /* --- The real settings ------------------------------------------------ */

  /* Theme and motion. prototype.js binds [data-theme-btn] once at boot against
     the devbar that app.html does not have, so these buttons are ours to wire.
     Going through the store rather than HC directly is what makes the choice
     survive a route change: store.setTheme mirrors it into HC AND into state. */
  on(root, 'click', '[data-theme-btn]', (e, el) => {
    store.setTheme(el.getAttribute('data-theme-btn'));
  });
  on(root, 'click', '[data-motion-btn]', (e, el) => {
    store.setMotion(el.getAttribute('data-motion-btn'));
  });

  /* Quick check-in. prototype.js's own handler writes the <html> flag; the
     store call is what persists it, because app.js re-asserts the attribute
     from state.user on every route change. */
  on(root, 'change', '[data-quick-checkin-toggle]', (e, el) => {
    store.setQuickCheckIn(el.checked);
  });

  /* Archive and restore — the real mutations. A habit archived from habit
     detail lands in the section above; this is the way back. */
  on(root, 'click', '[data-archive]', (e, el) => {
    const h = store.habitById(el.getAttribute('data-archive'));
    store.archiveHabit(el.getAttribute('data-archive'));
    if (window.HC && h) window.HC.announce(h.behavior + ' archived. Its marks stay on the shelf.');
  });
  on(root, 'click', '[data-restore]', (e, el) => {
    const h = store.habitById(el.getAttribute('data-restore'));
    store.restoreHabit(el.getAttribute('data-restore'));
    if (window.HC && h) window.HC.announce(h.behavior + ' restored.');
  });

  /* --- The view-local ones ----------------------------------------------
     Neither commits, so neither re-renders; the switch's own word is written
     by wireSwitchText and this just keeps the model in step for the next
     render that some other change causes. */
  on(root, 'change', '[data-onoff]', (e, el) => { chime = el.checked; });
  on(root, 'change', '[data-visibility]', (e, el) => {
    visibility[el.getAttribute('data-visibility')] = el.checked;
  });

  /* --- Hooks prototype.js's Profile module never reaches in the SPA ------ */
  const unresize = wirePanes(root);
  wireSwitchText(root);
  wireSave(root);
  wireModals(root);

  /* The only thing here that outlives the view. Everything else is bound to
     nodes the router removes wholesale. [README §12.4] */
  return unresize || undefined;
}
