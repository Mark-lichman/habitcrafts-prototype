/* ============================================================================
   HabitCrafts — views/studio.js
   THE AUTHOR DASHBOARD.  #/studio                                       [#6]

   THIS, NOT THE BINDERY, IS WHAT A CREATOR IS PAYING FOR. The Bindery is the
   mechanism; the Studio is the product. What an author is buying is proof
   their book changed behaviour — something no publisher, no retailer dashboard
   and no course platform gives them today.

   FOUR NUMBERS AND ONE CHART. RESIST EVERY TEMPTATION TO ADD A FIFTH.
   A dashboard that shows everything is a dashboard the author skims once and
   never opens again — the same failure the research brief records on the
   shipping app's home screen, where shops, journeys and premium all compete
   with the core task. The fifth number always seems free. It is not: it costs
   the fourth one its meaning.

   PTR CARRIES THE HERO. Enrolment is the vanity number — it measures the
   author's email list, not their book — so it must not get the loudest
   treatment on the screen. This is the one --c-hero-fill surface here, and it
   goes on the number that says the bridge was crossed and held.
   ========================================================================= */

import * as store from '../store.js';
import { flag } from '../config.js';
import { html, icon, on, plural } from '../ui.js';
import { unavailableIn } from '../components.js';

export const meta = {
  title: 'Studio',
  nav: 'studio',
  level: 0,
};

/* --------------------------------------------------------------------------
   THE CHART — PTR by joining week, oldest first

   A bar per week rather than a line: the buckets are discrete cohorts, and a
   line between them would imply a continuity that does not exist. Weeks with
   nobody old enough to measure are drawn as a gap, never as a zero — a zero we
   do not mean is worse than an absence we do.
-------------------------------------------------------------------------- */

function chart(series) {
  const W = 320, H = 96, pad = 18;
  const n = series.length;
  const bw = (W - pad * 2) / n;
  const target = 25;                    /* the assumption to beat [#1] */
  const yFor = (pct) => H - pad - (pct / 100) * (H - pad * 2);

  return html`
    <figure class="ptr-chart">
      <svg viewBox="0 0 ${W} ${H}" role="img"
           aria-label="Practice take rate by joining week, oldest first">
        <!-- the 25% line the whole business is measured against -->
        <line class="ptr-chart__target" x1="${pad}" x2="${W - pad}"
              y1="${yFor(target)}" y2="${yFor(target)}"/>
        <text class="ptr-chart__target-label" x="${W - pad}" y="${yFor(target) - 5}"
              text-anchor="end">25% target</text>

        ${series.map((s, i) => {
          if (s.pct == null) return '';
          const x = pad + i * bw + bw * 0.22;
          const y = yFor(s.pct);
          return html`<rect class="ptr-chart__bar" x="${x}" y="${y}"
                            width="${bw * 0.56}" height="${H - pad - y}" rx="2"/>`;
        })}

        <line class="ptr-chart__base" x1="${pad}" x2="${W - pad}"
              y1="${H - pad}" y2="${H - pad}"/>
      </svg>
      <figcaption class="t-body-sm t-muted">
        Take rate by the week a reader joined. Readers who have not yet reached
        day 14 are not counted — a practice published last week would otherwise
        report near zero on launch day.
      </figcaption>
    </figure>`;
}

/* --------------------------------------------------------------------------
   ONE PRACTICE
-------------------------------------------------------------------------- */

function practicePanel(p) {
  const s = store.studioStats(p.id);
  const ptr = s.ptr;

  return html`
    <section class="studio-practice" aria-labelledby="sp-${p.id}">
      <header class="section-head">
        <h2 id="sp-${p.id}" class="t-h2">${p.title}</h2>
        <p class="t-body-sm t-muted">
          Published ${p.publishedAt} · code ${p.code || '—'}
        </p>
      </header>

      <!-- THE ONE HERO SURFACE ON THIS SCREEN, and it is on PTR. -->
      <div class="hero studio-ptr">
        <p class="hero__label">Practice take rate · day 14</p>
        ${ptr.pct == null
          ? html`
            <p class="studio-ptr__pending t-body">
              Nobody has reached day 14 yet. The first reading will be
              ${plural(14, 'day')} after your first reader joined.
            </p>`
          : html`
            <p class="hero__numeral studio-ptr__value">${ptr.pct}<span>%</span></p>
            <p class="studio-ptr__sub t-body">
              ${ptr.kept} of ${ptr.of} readers made a habit from this and were
              still keeping it two weeks later.
            </p>`}
        ${chart(store.ptrSeries(p.id))}
      </div>

      <!-- The other three. Deliberately plain: they are context for the number
           above, not competitors to it. -->
      <div class="studio-stats">
        <div class="stat-tile">
          <span class="stat-tile__value">${s.enrolled}</span>
          <span class="stat-tile__label">Enrolled</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile__value">${s.week1}</span>
          <span class="stat-tile__label">Finished week 1</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile__value">${s.habits}</span>
          <span class="stat-tile__label">Habits created</span>
        </div>
      </div>

      <div class="studio-actions">
        <a class="btn btn--secondary btn--sm" href="#/practice/${p.id}">See what readers see</a>
      </div>
    </section>`;
}

function draftRow(p) {
  const ready = store.readyToPublish(p);
  return html`
    <li>
      <a class="card card--interactive studio-draft" href="#/bindery/${p.id}/review">
        <span class="t-label draft-flag">Draft</span>
        <span class="t-h3">${p.title}</span>
        <span class="t-body-sm t-muted">
          ${ready ? 'Every week read — ready to publish' : 'Unread weeks remain'}
        </span>
        ${icon('chev-right', 'icon--sm')}
      </a>
    </li>`;
}

/* --------------------------------------------------------------------------
   RENDER
-------------------------------------------------------------------------- */

export function render() {
  if (!flag('studio')) return String(unavailableIn('The Studio belongs to Experiment 1', 'E1 · Creators'));

  const published = store.publishedPractices();
  const drafts = store.draftPractices();

  return String(html`
    <div class="page">
      <header class="page-head">
        <div class="page-head__text">
          <h1 class="t-h1">Studio</h1>
          <p class="page-head__sub t-body">
            What happened to your readers after they closed the book.
          </p>
        </div>
        <a class="btn btn--primary" href="#/bindery">Upload new lesson source</a>
      </header>

      ${drafts.length ? html`
        <section aria-labelledby="drafts-h">
          <h2 id="drafts-h" class="section-head t-label">Drafts</h2>
          <ul class="studio-drafts">${drafts.map(draftRow)}</ul>
        </section>` : ''}

      ${published.length
        ? published.map(practicePanel)
        : html`
          <div class="empty-state">
            <svg class="illus" viewBox="0 0 120 120" role="img" aria-label="An empty desk">
              <ellipse class="illus__ground" cx="60" cy="98" rx="34" ry="9"/>
              <path class="illus__line" d="M30 62h60M30 74h40"/>
              <rect class="illus__shape" x="30" y="34" width="60" height="20" rx="3"/>
            </svg>
            <p class="empty-state__title">Nothing published yet</p>
            <p class="empty-state__body t-body">
              Upload a lesson source, read every week of it, and publish. The numbers
              start the day your first reader joins.
            </p>
            <a class="btn btn--primary" href="#/bindery">Open the Bindery</a>
          </div>`}
    </div>`);
}


export function mount(root) {
  /* Nothing to wire — every action on this screen is a link. That is not an
     omission, it is the point: a dashboard whose controls all navigate is a
     dashboard with no hidden state. */
  on(root, 'click', '[data-noop]', () => {});
}
