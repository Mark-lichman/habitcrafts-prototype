/* ============================================================================
   HabitCrafts — ui.js
   THE SMALL SHARED HELPERS EVERY VIEW USES.

   Deliberately tiny. This is not a component library — components are CSS
   classes in components.css and markup in the views. What lives here is only
   the plumbing that would otherwise be copy-pasted into eleven files and drift
   the way the icon sprite once did.
   ========================================================================= */

/** Escape a string for interpolation into HTML. */
export function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Mark a string as already-safe HTML so `html` does not escape it. Use it for
    nested `html` results and for nothing else. */
export function raw(s) {
  const o = new String(s);
  o.__safe = true;
  return o;
}

/**
 * Tagged template that escapes every interpolation.
 *
 *     html`<h3 class="habit-card__title">${habit.behavior}</h3>`
 *
 * Arrays are joined with no separator, so `${list.map(row)}` works. Values
 * wrapped in raw() and results of `html` itself pass through untouched.
 * `false`, `null` and `undefined` render as nothing, which makes
 * `${cond && html`…`}` read cleanly.
 *
 * Escaping matters here even though this is a prototype: group messages are
 * user input, and a view that pastes them in unescaped is one `<img onerror>`
 * away from being a genuinely bad example for the Flutter build to copy.
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    out += stringify(values[i]) + strings[i + 1];
  }
  return raw(out);
}

function stringify(v) {
  if (v == null || v === false || v === true) return '';
  if (Array.isArray(v)) return v.map(stringify).join('');
  if (v && v.__safe) return String(v);
  return esc(v);
}

/** `<svg class="icon"><use href="#i-flame"></svg>` — the sprite, one way. */
export function icon(id, extra) {
  return raw(`<svg class="icon${extra ? ' ' + esc(extra) : ''}" aria-hidden="true" focusable="false"><use href="#i-${esc(id)}"></use></svg>`);
}

/** Join class names, dropping falsy ones: cls('card', done && 'is-complete') */
export function cls(...parts) {
  return parts.filter(Boolean).join(' ');
}

/** Pluralise the boring way. `plural(1,'day')` → "1 day". */
export function plural(n, word, suffix = 's') {
  return n + ' ' + word + (n === 1 ? '' : suffix);
}

/** "4 min ago" / "Yesterday" / "12 Aug" — group message timestamps. */
export function relTime(isoString) {
  const then = new Date(isoString);
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + ' min ago';
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return days + ' days ago';
  return then.getDate() + ' ' + then.toLocaleString('en-GB', { month: 'short' });
}

/**
 * Re-paint the rings of any habit card that renders already-complete.
 *
 * Why this exists: prototype.js's `initRing` finishes by calling its own
 * `paint()`, which writes an inline `stroke-dashoffset: 100` onto the fill —
 * correct for a fresh card, wrong for one that was checked in before the view
 * re-rendered. An inline style cannot be beaten from the stylesheet, so the fix
 * is to write the completed values back AFTER HC.init has run. Call this from
 * `mount()` (which the router runs after HC.init) in any view that renders
 * habit cards in their completed state.
 *
 * Only the resting completed state is restored: full ring, drawn checkmark. The
 * echo and the inline Undo are NOT brought back — those belong to the 5 seconds
 * after the commit, not to the card's permanent appearance.
 */
export function restoreRings(root) {
  root.querySelectorAll('.habit-card.is-complete [data-checkin]').forEach((btn) => {
    const fill = btn.querySelector('.ring__fill');
    const check = btn.querySelector('.ring__check');
    if (fill) {
      fill.style.strokeDashoffset = '0';
      fill.style.stroke = getComputedStyle(btn).getPropertyValue('--c-ring-end').trim();
    }
    if (check) {
      check.style.transition = 'none';
      check.style.strokeDashoffset = '0';
    }
  });
}

/**
 * Delegated event binding, scoped to a view root.
 *
 *     on(root, 'click', '[data-archive]', (e, el) => { … })
 *
 * Delegation rather than per-node listeners because a view re-renders its own
 * innerHTML: direct listeners would be lost on every store change, and a view
 * that re-attached them by hand would leak.
 */
export function on(root, type, selector, handler) {
  root.addEventListener(type, (e) => {
    const el = e.target.closest(selector);
    if (el && root.contains(el)) handler(e, el);
  });
}
