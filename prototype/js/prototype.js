/* ============================================================================
   HabitCrafts — prototype.js
   Vanilla JS. No dependencies, no build step, no CDN. Opens from file://.

   This file is the "springs" half of paper-and-springs. [D §1]
   Everything you look at is paper; everything you touch is a spring: it
   compresses under your finger, resists, snaps back with a little overshoot.

   WHAT IS IN HERE
     1. Utilities + reduced-motion gate
     2. Theme control (system / light / dark)
     3. Hour simulation (so a reviewer can see the after-20:00 state)
     4. The press-and-hold check-in — the centrepiece   [D §2.1]
     5. The celebration echo — your own words back      [D §2.2]
     6. The day arc + closing the day                   [D §2.3]
     7. Milestone moment (gallery demo)                 [D §2.4]
     8. List reorder (FLIP)

   PUBLIC API — window.HC
     HC.reducedMotion()            → boolean, honours OS + the [data-motion] hook
     HC.init(root)                 → wire everything inside root (default: document)
     HC.refreshDay()               → recount habits, update every day arc + greeting
     HC.setTheme('system'|'light'|'dark')
     HC.setHour(0..23)
     HC.fireMilestone({days, habit})
     HC.on(event, handler)         → 'checkin' | 'undo' | 'daycomplete'

   DOM CONTRACT — see README-buildnotes.md. JS only ever keys off data-*
   attributes, never off class names, so styling can change freely.
   ========================================================================= */

(function () {
  'use strict';

  /* ==========================================================================
     1. UTILITIES
     ====================================================================== */

  var root = document.documentElement;
  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };
  var clamp = function (n, lo, hi) { return n < lo ? lo : n > hi ? hi : n; };

  /* Read a duration token straight out of CSS so JS and CSS can never drift. */
  function cssMs(name, fallback) {
    var v = getComputedStyle(root).getPropertyValue(name).trim();
    if (!v) return fallback;
    if (v.indexOf('ms') > -1) return parseFloat(v);
    if (v.indexOf('s') > -1) return parseFloat(v) * 1000;
    return parseFloat(v) || fallback;
  }

  function cssColor(el, name) {
    return getComputedStyle(el).getPropertyValue(name).trim();
  }

  /* Colour interpolation for the ring's brand-500 → sage-600 crossfade.
     Handles #rgb, #rrggbb and rgb()/rgba() so it works whichever form the
     token resolves to in a given theme. */
  function toRgb(str) {
    if (!str) return [0, 0, 0];
    str = str.trim();
    if (str.charAt(0) === '#') {
      var h = str.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    var m = str.match(/-?\d+(\.\d+)?/g) || [0, 0, 0];
    return [+m[0], +m[1], +m[2]];
  }
  function mix(a, b, t) {
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
                    Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
                    Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }

  /* --- Reduced motion -------------------------------------------------------
     [B §3.6] "reduced" means REDUCED, not none. Every branch below removes
     transform-based motion (the actual vestibular trigger) and substitutes an
     opacity or colour change — a substitution WCAG 2.3.3 explicitly sanctions.
     The [data-motion="reduce"] hook lets the prototype's own control force this
     path so a reviewer can verify it without changing OS settings.
  ------------------------------------------------------------------------- */
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reducedMotion() {
    if (root.getAttribute('data-motion') === 'reduce') return true;
    if (root.getAttribute('data-motion') === 'full') return false;
    return mqReduce.matches;
  }

  /* Tiny event bus so screens can react without reaching into internals. */
  var bus = document.createElement('div');
  function emit(name, detail) {
    bus.dispatchEvent(new CustomEvent(name, { detail: detail }));
    document.dispatchEvent(new CustomEvent('hc:' + name, { detail: detail, bubbles: true }));
  }
  function on(name, fn) { bus.addEventListener(name, fn); }

  /* A single polite live region. Screen-reader users get the same information
     the animation carries — the reward still lands. */
  var live;
  function announce(msg) {
    if (!live) {
      live = document.createElement('div');
      live.className = 'visually-hidden';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      document.body.appendChild(live);
    }
    live.textContent = '';
    window.setTimeout(function () { live.textContent = msg; }, 40);
  }

  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem('hc:' + key);
      window.localStorage.setItem('hc:' + key, value);
    } catch (e) { /* file:// may block storage; the prototype still works */ }
    return null;
  }


  /* ==========================================================================
     2. THEME — system / light / dark
     The CSS supports both directions: prefers-color-scheme sets the default,
     and [data-theme] on <html> overrides it either way. 'system' simply removes
     the attribute. [tokens.css §theme architecture]
     ====================================================================== */

  function setTheme(mode) {
    if (mode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
    store('theme', mode);
    $$('[data-theme-btn]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-btn') === mode));
    });
  }

  function setMotion(mode) {
    if (mode === 'auto') root.removeAttribute('data-motion');
    else root.setAttribute('data-motion', mode);
    store('motion', mode);
    $$('[data-motion-btn]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-motion-btn') === mode));
    });
  }

  function initControls() {
    $$('[data-theme-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () { setTheme(btn.getAttribute('data-theme-btn')); });
    });
    $$('[data-motion-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () { setMotion(btn.getAttribute('data-motion-btn')); });
    });
    setTheme(store('theme') || 'system');
    setMotion(store('motion') || 'auto');
  }


  /* ==========================================================================
     3. THE ROOM DIMS — hour simulation                                [D §2.5]
     The app acknowledges the hour in exactly two quiet, non-structural ways:
     the greeting, and the hero card's background (flat brand-700 by day; after
     20:00 a barely-there brand-700 → brand-800 vertical gradient under the
     grain). Nothing moves, nothing else changes, the layout is identical.
     At 10pm it should feel like someone dimmed the lights, not like a different
     app. The slider exists so a reviewer can see it without waiting until 8pm.
     ====================================================================== */

  var state = { hour: new Date().getHours(), name: 'Mark' };

  function setHour(h) {
    state.hour = clamp(parseInt(h, 10) || 0, 0, 23);
    root.setAttribute('data-hour', String(state.hour));
    root.setAttribute('data-hour-late', state.hour >= 20 ? 'true' : 'false');
    $$('[data-hour-input]').forEach(function (i) { i.value = state.hour; });
    $$('[data-hour-readout]').forEach(function (o) {
      o.textContent = (state.hour < 10 ? '0' : '') + state.hour + ':00';
    });
    updateGreeting();
  }

  function greetingFor(hour) {
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  /* Done-for-the-day copy, adapting to the hour. [D §2.3, §2.5] */
  function doneCopy(hour) {
    return hour >= 20 ? "That's everything. Sleep well."
                      : "That's everything. Go enjoy your day.";
  }

  function updateGreeting(dayComplete) {
    /* Called without an argument (e.g. from the hour slider) it must not undo
       the done-for-the-day copy, so fall back to the current day state. */
    if (dayComplete === undefined) dayComplete = dayWasComplete;
    $$('[data-greeting]').forEach(function (el) {
      var name = el.getAttribute('data-name') || state.name;
      var next = dayComplete ? doneCopy(state.hour) : greetingFor(state.hour) + ', ' + name;
      if (el.textContent.trim() === next) return;
      if (reducedMotion()) { el.textContent = next; return; }
      /* Crossfade, never a slide — the greeting is announcing, not moving. */
      el.classList.add('is-swapping');
      window.setTimeout(function () {
        el.textContent = next;
        el.classList.remove('is-swapping');
      }, cssMs('--dur-base', 260) / 2);
    });
  }


  /* ==========================================================================
     4. THE PRESS — press-and-hold check-in                            [D §2.1]

     ~450ms hold on the ring at the right edge of the habit card.

       t=0        card 1.0 → 0.97 over 120ms ease-standard; ring begins to fill
                  clockwise, LINEARLY, mapped 1:1 to hold time (linear is
                  correct: the fill IS a progress bar for the hold)
       t=0–450    stroke sweeps 0 → 100%, colour crossfading brand-500 → sage-600
       release    early: the fill runs BACKWARD at 2× speed, card springs back,
                  no penalty and no message. Fully interruptible at any
                  millisecond — this is what makes it feel like a real object
                  rather than a loading bar.
       t=450      commit: checkmark draws over 200ms; card releases 0.97 → 1.0
                  on the spring-bounce bezier (its ~9% overshoot is the spring);
                  6–8 sage/gold flecks fly radially 24px and fade over 400ms;
                  card crossfades to sage-100 and the title mutes over 240ms
       tap        2px wobble + a one-time "Hold to check in." tooltip.
                  NEVER an error state.

     Total ≤ 700ms after release, and it never blocks the next press.

     Works with mouse, touch (Pointer Events) AND keyboard (hold Space/Enter).
     WCAG 2.5.1 is satisfied because the hold is a single-pointer, non-path
     gesture; the product additionally ships a "Quick check-in (single tap)"
     accessibility setting, stubbed here as [data-quick-checkin] on <html>.

     Reduced motion: the fill still runs — it is the ONLY feedback that a hold
     is in progress, so removing it would break the control, and a stroke length
     change is not a vestibular trigger. What goes: the card scale, the spring,
     and the flecks. The colour crossfade collapses to 120ms and the checkmark
     appears rather than drawing. [D §2.1]
     ====================================================================== */

  var hintShown = false; /* the "Hold to check in." tooltip is once per session */

  function initRing(btn) {
    if (btn.__hcBound) return;
    btn.__hcBound = true;

    var card  = btn.closest('[data-habit]');
    var fill  = $('.ring__fill', btn);
    var check = $('.ring__check', btn);
    var hint  = $('[data-ring-hint]', btn);
    var HOLD  = cssMs('--dur-hold', 450);

    var raf = null, holding = false, dir = 1, progress = 0, last = 0;
    var pressedAt = 0, midFired = false, keyDown = false;

    function paint() {
      fill.style.strokeDashoffset = String(100 - progress * 100);
      var a = toRgb(cssColor(btn, '--c-ring-start'));
      var b = toRgb(cssColor(btn, '--c-ring-end'));
      fill.style.stroke = mix(a, b, reducedMotion() ? (progress >= 1 ? 1 : 0) : progress);
    }

    function loop(now) {
      var dt = now - last; last = now;
      /* Forward at 1× over --dur-hold; backward at 2× on early release. */
      progress = clamp(progress + (dir > 0 ? dt / HOLD : -2 * dt / HOLD), 0, 1);
      paint();

      if (dir > 0 && !midFired && progress >= 0.5) { midFired = true; }
      if (dir > 0 && progress >= 1) { raf = null; commit(); return; }
      if (dir < 0 && progress <= 0) { raf = null; rest(); return; }
      raf = window.requestAnimationFrame(loop);
    }

    function start() {
      if (holding || card.classList.contains('is-complete')) return;
      holding = true; dir = 1; midFired = false;
      pressedAt = performance.now(); last = pressedAt;
      if (!reducedMotion()) card.classList.add('is-pressed');
      /* Quick check-in accessibility setting: commit immediately. [D §2.1] */
      if (root.getAttribute('data-quick-checkin') === 'true') {
        progress = 1; paint(); commit(); return;
      }
      if (!raf) raf = window.requestAnimationFrame(loop);
    }

    function release() {
      if (!holding) return;
      holding = false;
      var held = performance.now() - pressedAt;
      /* Abandoned holds release on spring-snap; only a commit earns the
         reward's spring-bounce. */
      card.classList.add('is-abandoning');
      card.classList.remove('is-pressed');
      window.setTimeout(function () { card.classList.remove('is-abandoning'); }, 320);
      dir = -1;
      last = performance.now();
      if (!raf) raf = window.requestAnimationFrame(loop);
      /* A tap, not a hold. Wobble + a one-time tooltip. Never an error. */
      if (held < 140) tapHint();
    }

    function rest() {
      progress = 0; paint();
    }

    function tapHint() {
      if (!reducedMotion()) {
        btn.classList.add('is-wobbling');
        window.setTimeout(function () { btn.classList.remove('is-wobbling'); }, 240);
      }
      if (hintShown || !hint) return;
      hintShown = true;
      hint.hidden = false;
      window.requestAnimationFrame(function () {
        hint.setAttribute('data-visible', 'true');
      });
      window.setTimeout(function () {
        hint.setAttribute('data-visible', 'false');
        window.setTimeout(function () { hint.hidden = true; }, 200);
      }, 2200);
    }

    function commit() {
      holding = false;
      progress = 1; paint();

      /* Checkmark: draws over 200ms ease-enter; appears instantly if reduced. */
      if (reducedMotion()) {
        check.style.transition = 'none';
      } else {
        check.style.transition = 'stroke-dashoffset ' + cssMs('--dur-checkmark', 200) +
                                 'ms var(--ease-enter)';
      }
      check.style.strokeDashoffset = '0';

      card.classList.remove('is-pressed');
      btn.setAttribute('aria-pressed', 'true');
      btn.setAttribute('aria-label', 'Checked in: ' + habitName(card) + '. Activate to undo.');

      if (!reducedMotion()) {
        /* The reward pop. spring-bounce is for reward pops ONLY. [B §5.1]
           The card's own 0.97 → 1.0 release rides the same bezier via CSS. */
        flecks(btn);
        pop(btn);
      }

      showEcho(card);
      /* The tone change is CSS: .is-complete crossfades to sage-100 over 240ms. */
      reorder(card, function () { card.classList.add('is-complete'); });

      announce(habitName(card) + ' checked in.');
      emit('checkin', { card: card });
      refreshDay();
    }

    function reset() {
      progress = 0;
      check.style.transition = 'none';
      check.style.strokeDashoffset = '100';
      paint();
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', 'Check in: ' + habitName(card) + '. Press and hold to complete.');
    }

    /* --- Pointer: mouse, touch and pen through one code path. --- */
    btn.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      if (card.classList.contains('is-complete')) { undo(card, btn, reset); return; }
      if (btn.setPointerCapture) { try { btn.setPointerCapture(e.pointerId); } catch (err) {} }
      start();
    });
    /* Release is listened for on the window as well as the button: pointer
       capture normally keeps the events on the ring, but if capture is
       unavailable the hold must still end when the finger lifts anywhere.
       release() no-ops when nothing is being held, so double delivery is safe.
       Note there is deliberately NO pointerleave handler — a finger drifting a
       few pixels off the ring should not cancel a hold in progress. */
    ['pointerup', 'pointercancel'].forEach(function (evt) {
      btn.addEventListener(evt, function () { release(); });
      window.addEventListener(evt, function () { release(); });
    });

    /* --- Keyboard: hold Space or Enter. preventDefault on keydown stops both
           page scroll and the synthetic click, so the hold is the only path. --- */
    btn.addEventListener('keydown', function (e) {
      if (e.key !== ' ' && e.key !== 'Spacebar' && e.key !== 'Enter') return;
      e.preventDefault();
      if (keyDown) return;            /* swallow auto-repeat */
      keyDown = true;
      if (card.classList.contains('is-complete')) { undo(card, btn, reset); return; }
      start();
    });
    btn.addEventListener('keyup', function (e) {
      if (e.key !== ' ' && e.key !== 'Spacebar' && e.key !== 'Enter') return;
      e.preventDefault();
      keyDown = false;
      release();
    });
    btn.addEventListener('blur', function () { keyDown = false; release(); });
    btn.addEventListener('click', function (e) { e.preventDefault(); });

    btn.__hcReset = reset;
    paint();
  }

  function habitName(card) {
    var t = $('.habit-card__title', card);
    return t ? t.textContent.trim() : 'habit';
  }

  /* The reward pop — a real ~8% overshoot on the object that earned it. */
  function pop(el) {
    el.animate(
      [{ scale: '1' }, { scale: String(getComputedStyle(root).getPropertyValue('--overshoot').trim() || 1.08) }, { scale: '1' }],
      { duration: cssMs('--dur-spring-bounce', 350), easing: 'cubic-bezier(0.42,1.67,0.21,0.90)' }
    );
  }

  /* 6–8 flecks, 3px, sage-500 + gold-500, radial 24px, fade over 400ms. */
  function flecks(host) {
    var field = document.createElement('span');
    field.className = 'spark-field';
    var n = 6 + Math.floor(Math.random() * 3);   /* 6–8, per the cap [B §3.3] */
    var base = Math.random() * Math.PI * 2;
    for (var i = 0; i < n; i++) {
      var a = base + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      var d = 20 + Math.random() * 8;            /* ~24px */
      var s = document.createElement('i');
      s.className = 'spark' + (i % 2 ? ' spark--b' : '');
      s.style.setProperty('--dx', (Math.cos(a) * d).toFixed(1) + 'px');
      s.style.setProperty('--dy', (Math.sin(a) * d).toFixed(1) + 'px');
      field.appendChild(s);
    }
    host.appendChild(field);
    window.setTimeout(function () { field.remove(); }, cssMs('--dur-particles', 400) + 80);
  }


  /* ==========================================================================
     5. YOUR OWN WORDS BACK — the celebration echo                     [D §2.2]
     Create Habit already asks every user "How will you celebrate?" and then
     buries the answer in 10px text. Here it comes back, verbatim, in the
     display serif italic, sage-700, unfurling under the title at the commit
     moment, holding 5s, then settling into the completed state.

     An inline Undo ghost button sits at the card's right edge for those 5s.
     THERE IS NO SNACKBAR ANYWHERE IN THIS SYSTEM — the dark toast is deleted.
     If the Undo has keyboard focus when the timer fires we leave it up: on the
     web that is the closest honest equivalent of the "untimed under a screen
     reader" rule, since there is no reliable screen-reader signal in a browser.
     ====================================================================== */

  function showEcho(card) {
    var text = card.getAttribute('data-celebration');
    var echo = $('[data-echo]', card);
    var undo = $('[data-undo]', card);

    if (echo && text) {
      echo.textContent = text;
      echo.hidden = false;
      if (!reducedMotion()) {
        echo.classList.remove('is-entering');
        void echo.offsetWidth;                    /* restart the animation */
        echo.classList.add('is-entering');
      }
    }
    if (!undo) return;

    undo.hidden = false;
    window.clearTimeout(card.__hcUndoTimer);
    card.__hcUndoTimer = window.setTimeout(function () {
      if (document.activeElement === undo) return; /* keep it while focused */
      undo.hidden = true;
    }, cssMs('--dur-echo-dwell', 5000));
  }

  function undo(card, btn, resetRing) {
    window.clearTimeout(card.__hcUndoTimer);
    reorder(card, function () { card.classList.remove('is-complete'); });
    var echo = $('[data-echo]', card);
    var undoBtn = $('[data-undo]', card);
    if (echo) { echo.hidden = true; echo.classList.remove('is-entering'); }
    if (undoBtn) undoBtn.hidden = true;
    if (resetRing) resetRing();
    else if (btn && btn.__hcReset) btn.__hcReset();
    announce(habitName(card) + ' un-checked.');
    emit('undo', { card: card });
    refreshDay();
  }


  /* ==========================================================================
     6. CLOSING THE DAY — the arc                                      [D §2.3]
     The arc fills with each check-in (260ms ease-enter per increment). When the
     LAST habit of the day lands: the final segment closes, a single soft glint
     travels the full arc once over 600ms, the arc flushes sage-600 → gold-500
     over 300ms, and the greeting crossfades to the done-for-the-day copy.
     Then the app goes quiet. No modal, no confetti, no share prompt.
     Reduced motion: segments and the gold flush crossfade; no travelling glint.
     ====================================================================== */

  var dayWasComplete = false;

  function refreshDay() {
    var habits = $$('[data-habit]').filter(function (c) {
      return c.getAttribute('data-habit') !== 'preview';
    });
    var total = habits.length;
    var done = habits.filter(function (c) { return c.classList.contains('is-complete'); }).length;
    var complete = total > 0 && done === total;

    $$('[data-day-arc]').forEach(function (arc) { paintArc(arc, done, total, complete); });

    $$('[data-when-complete]').forEach(function (el) { el.hidden = !complete; });
    $$('[data-when-incomplete]').forEach(function (el) { el.hidden = complete; });
    $$('[data-when-empty]').forEach(function (el) { el.hidden = total !== 0; });

    updateGreeting(complete);

    if (complete && !dayWasComplete) {
      announce("That's everything for today.");
      emit('daycomplete', { total: total });
    }
    dayWasComplete = complete;
  }

  function paintArc(arc, done, total, complete) {
    var pct = total ? done / total : 0;
    var fill  = $('.day-arc__fill', arc);
    var glint = $('.day-arc__glint', arc);
    if (fill) fill.style.strokeDashoffset = String(100 - pct * 100);

    var d = $('[data-arc-done]', arc);
    var t = $('[data-arc-total]', arc);
    if (d) d.textContent = String(done);
    if (t) t.textContent = String(total);

    arc.setAttribute('role', 'img');
    arc.setAttribute('aria-label', done + ' of ' + total + ' habits done today');

    var wasComplete = arc.classList.contains('is-complete');
    arc.classList.toggle('is-complete', !!complete);

    /* The glint fires once, on the transition into complete, and never loops. */
    if (complete && !wasComplete && glint && !reducedMotion()) {
      arc.classList.remove('is-glinting');
      void arc.offsetWidth;
      arc.classList.add('is-glinting');
      window.setTimeout(function () { arc.classList.remove('is-glinting'); },
                        cssMs('--dur-arc-glint', 600) + 60);
    }
  }


  /* ==========================================================================
     7. MILESTONE MOMENT — gilding, the moment half                    [D §2.4]
     Fires at streak days 7 / 30 / 100 / 365 (day 50 is cut from the brief's
     ladder — four tiers map cleanly to the four gilding marks). One full
     celebration per session, maximum; further milestones fall back to the
     quieter streak-increment treatment.
       scrim to 40% · card enters with spring-gentle · ≤40 confetti pieces from
       the top edge in a 60° cone, all cleared by 1100ms · numeral counts up ·
       auto-dismiss at 4000ms or on tap.
     Reduced motion: the card crossfades in, NO confetti — a static gold
     starburst replaces it — and the final number renders directly.
     ====================================================================== */

  var milestoneFired = false;

  function fireMilestone(opts) {
    opts = opts || {};
    var days = opts.days || 7;
    if (milestoneFired) { announce(days + ' day streak.'); return; }
    milestoneFired = true;

    var scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.innerHTML =
      '<div class="modal modal--milestone" role="alertdialog" aria-modal="true" aria-label="' +
        days + ' day streak">' +
        '<span class="seal seal--lg seal--solid" aria-hidden="true">' + rosette() + '</span>' +
        '<p class="modal__numeral" data-count>' + (reducedMotion() ? days : 0) + '</p>' +
        '<p class="t-h3">day streak</p>' +
        '<p class="t-body t-muted" style="margin-block:8px 16px">' +
          'You showed up for ' + days + ' days. That is the whole trick.</p>' +
        '<button class="btn btn--gold" type="button" data-dismiss>Nice</button>' +
      '</div>';
    document.body.appendChild(scrim);

    var card = $('.modal', scrim);
    if (!reducedMotion()) {
      confetti(card, days);
      countUp($('[data-count]', card), days);
    }

    function close() {
      window.clearTimeout(timer);
      scrim.remove();
    }
    var timer = window.setTimeout(close, 4000);
    scrim.addEventListener('click', function (e) {
      if (e.target === scrim || e.target.hasAttribute('data-dismiss')) close();
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
    $('[data-dismiss]', card).focus();
  }

  /* ≤40 pieces, 60° cone from the top edge, gravity, cleared by 1100ms, no loop. */
  function confetti(host, seed) {
    var colors = ['--c-gold-500', '--c-sage-500', '--c-brand-300', '--c-clay-600'];
    for (var i = 0; i < 40; i++) {
      var p = document.createElement('i');
      p.className = 'spark';
      p.style.background = 'var(' + colors[i % 4] + ')';
      p.style.insetBlockStart = '0';
      p.style.inlineSize = '5px';
      p.style.blockSize = '8px';
      p.style.borderRadius = '1px';
      p.style.animation = 'none';
      host.appendChild(p);
      var angle = (-60 + Math.random() * 120) * Math.PI / 180;  /* 60° cone */
      var dist = 90 + Math.random() * 160;
      p.animate([
        { translate: '0 0', rotate: '0deg', opacity: 1 },
        { translate: (Math.sin(angle) * dist).toFixed(0) + 'px ' +
                     (Math.abs(Math.cos(angle)) * dist * 0.9 + 40).toFixed(0) + 'px',
          rotate: (Math.random() * 720 - 360).toFixed(0) + 'deg', opacity: 0 }
      ], { duration: 840, delay: Math.random() * 200, easing: 'cubic-bezier(0.3,0,0.8,0.15)',
           fill: 'forwards' });
      (function (el) { window.setTimeout(function () { el.remove(); }, 1100); })(p);
    }
    return seed;
  }

  function countUp(el, to) {
    if (!el) return;
    var start = performance.now(), dur = 500;
    (function step(now) {
      var t = clamp((now - start) / dur, 0, 1);
      el.textContent = String(Math.round(to * t));
      if (t < 1) window.requestAnimationFrame(step);
    })(start);
  }

  function rosette() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.2 3.1 3.7-.9.4 3.8 3.4 1.7-2.3 3 2.3 3-3.4 1.7-.4 3.8-3.7-.9L12 24l-2.2-3.1-3.7.9-.4-3.8L2.3 16l2.3-3-2.3-3 3.4-1.7.4-3.8 3.7.9L12 2zm0 5.5A4.5 4.5 0 1 0 12 16.5 4.5 4.5 0 0 0 12 7.5z"/></svg>';
  }


  /* ==========================================================================
     8. LIST REORDER — completed cards sink to the bottom              [D §3.1]
     A 260ms ease-standard move, not a jump. FLIP: measure, mutate, invert,
     play. The inverse uses the `translate` property while the habit card's
     spring uses `scale` — they are independent CSS properties, so the reorder
     and the release spring never fight over `transform`.
     Reduced motion: the mutation applies with no movement at all.
     ====================================================================== */

  function reorder(card, mutate) {
    var list = card.closest('.habit-list');
    if (!list || reducedMotion()) { mutate(); return; }

    var items = $$(':scope > li', list);
    var before = items.map(function (li) { return li.getBoundingClientRect().top; });
    mutate();
    var after = items.map(function (li) { return li.getBoundingClientRect().top; });

    items.forEach(function (li, i) {
      var dy = before[i] - after[i];
      if (!dy) return;
      li.animate(
        [{ translate: '0 ' + dy + 'px' }, { translate: '0 0' }],
        { duration: cssMs('--dur-reorder', 260), easing: 'cubic-bezier(0.2,0,0,1)' }
      );
    });
  }


  /* ==========================================================================
     9. WIRING
     ====================================================================== */

  function init(ctx) {
    ctx = ctx || document;

    $$('[data-checkin]', ctx).forEach(initRing);

    /* Inline Undo buttons inside habit cards. */
    $$('[data-undo]', ctx).forEach(function (b) {
      if (b.__hcBound) return;
      b.__hcBound = true;
      b.addEventListener('click', function () {
        var card = b.closest('[data-habit]');
        var ring = $('[data-checkin]', card);
        undo(card, ring, ring && ring.__hcReset);
        if (ring) ring.focus();
      });
    });

    $$('[data-hour-input]', ctx).forEach(function (i) {
      if (i.__hcBound) return;
      i.__hcBound = true;
      i.addEventListener('input', function () { setHour(i.value); });
    });

    $$('[data-demo="milestone"]', ctx).forEach(function (b) {
      if (b.__hcBound) return;
      b.__hcBound = true;
      b.addEventListener('click', function () {
        milestoneFired = false;   /* the gallery may replay it; the product may not */
        fireMilestone({ days: parseInt(b.getAttribute('data-days'), 10) || 7 });
      });
    });

    /* Reset control — re-open the day so a reviewer can run the moment again. */
    $$('[data-demo="reset"]', ctx).forEach(function (b) {
      if (b.__hcBound) return;
      b.__hcBound = true;
      b.addEventListener('click', function () {
        $$('[data-habit]').forEach(function (card) {
          if (!card.classList.contains('is-complete')) return;
          var ring = $('[data-checkin]', card);
          undo(card, ring, ring && ring.__hcReset);
        });
      });
    });
  }

  function boot() {
    /* ?frame=1 strips the prototype control bar so a screen can be embedded in
       the gallery's device frames without its own scaffolding showing. */
    if (/[?&]frame=1/.test(window.location.search)) {
      $$('.devbar').forEach(function (el) { el.remove(); });
    }
    initControls();
    init(document);
    setHour(new Date().getHours());
    refreshDay();
    mqReduce.addEventListener('change', function () { /* branches read live */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.HC = {
    reducedMotion: reducedMotion,
    init: init,
    refreshDay: refreshDay,
    setTheme: setTheme,
    setMotion: setMotion,
    setHour: setHour,
    fireMilestone: fireMilestone,
    announce: announce,
    on: on,
    state: state
  };
})();


/* ============================================================================
   PROGRESS SCREEN BEHAVIOUR                                          [D §3.2]
   APPEND-ONLY SECTION, added by the Progress build. Nothing above is edited.
   Self-contained IIFE; keys off data-* attributes only, never class names, and
   chains onto HC.init so injected markup is wired the same way as the kit's.

   Two behaviours, both of which the screen genuinely needs:

     1. The Summary / Lifestyle segmented control. The app ships a Material
        TabBar; the redesign keeps the split but as the kit's `.segmented`.
        Implemented as a real WAI-ARIA tabs pattern: roving tabindex, arrow /
        Home / End keys, aria-selected, and panels that are actually removed
        from the a11y tree when inactive.

     2. The calendar month stepper. Only the panels are swapped — there is no
        motion, no slide, nothing that needs a reduced-motion branch beyond the
        opacity fade the CSS already caps. The month name is announced politely
        so the change is not silent for a screen reader user.

   DOM CONTRACT
     [data-tabs]                     tablist container
     [data-tab="<id>"]               role=tab button inside it
     [data-tabpanel="<id>"]          the panel it controls (anywhere in the doc)
     [data-cal]                      calendar container
     [data-cal-step="-1|1"]          previous / next month button
     [data-cal-month="<key>"]        one month grid, newest FIRST in the DOM
     [data-cal-name="August 2026"]   the label for that month
     [data-cal-label]                the element the month name is written into
   ========================================================================= */

(function () {
  'use strict';

  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  /* --- 1. Segmented control as ARIA tabs ---------------------------------- */

  function initTabs(list) {
    if (list.__hcProgTabs) return;
    list.__hcProgTabs = true;

    var tabs = $$('[data-tab]', list);
    if (!tabs.length) return;

    function panelFor(tab) {
      return document.querySelector('[data-tabpanel="' + tab.getAttribute('data-tab') + '"]');
    }

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = panelFor(t);
        if (!panel) return;
        panel.hidden = !on;
        /* The fade is opacity-only, so it is safe under reduced motion and the
           base.css cap simply shortens it. Re-trigger it on each show. */
        panel.classList.remove('is-entering');
        if (on) { void panel.offsetWidth; panel.classList.add('is-entering'); }
      });
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        select(next, true);
      });
    });

    /* Honour whichever tab the markup declared selected. */
    var initial = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    select(initial, false);
    /* The initial paint is a state, not an arrival — no entrance animation. */
    var p = panelFor(initial);
    if (p) p.classList.remove('is-entering');
  }

  /* --- 2. Calendar month stepper ------------------------------------------ */

  function initCalendar(cal) {
    if (cal.__hcProgCal) return;
    cal.__hcProgCal = true;

    var months = $$('[data-cal-month]', cal);
    var label  = cal.querySelector('[data-cal-label]');
    var steps  = $$('[data-cal-step]', cal);
    if (months.length < 2) return;

    /* Newest month first in the DOM, so step -1 walks backwards in time. */
    var index = Math.max(0, months.findIndex(function (m) { return !m.hidden; }));

    function show(i, announce) {
      index = Math.min(months.length - 1, Math.max(0, i));
      months.forEach(function (m, n) { m.hidden = n !== index; });
      var name = months[index].getAttribute('data-cal-name') || '';
      if (label) label.textContent = name;
      steps.forEach(function (b) {
        var dir = parseInt(b.getAttribute('data-cal-step'), 10);
        /* -1 goes back in time = forward through the list. */
        var target = dir < 0 ? index + 1 : index - 1;
        b.disabled = target < 0 || target > months.length - 1;
      });
      if (announce && window.HC && window.HC.announce) window.HC.announce(name);
    }

    steps.forEach(function (b) {
      b.addEventListener('click', function () {
        var dir = parseInt(b.getAttribute('data-cal-step'), 10);
        show(dir < 0 ? index + 1 : index - 1, true);
      });
    });

    show(index, false);
  }

  /* --- 3. Wiring ---------------------------------------------------------- */

  function initProgress(ctx) {
    ctx = ctx || document;
    $$('[data-tabs]', ctx).forEach(initTabs);
    $$('[data-cal]', ctx).forEach(initCalendar);
  }

  /* Chain onto the kit's initialiser so HC.init(el) keeps its documented
     meaning — "wire everything inside root" — for this screen too. */
  function attach() {
    if (window.HC && typeof window.HC.init === 'function' && !window.HC.__progChained) {
      var kitInit = window.HC.init;
      window.HC.init = function (root) { kitInit(root); initProgress(root); };
      window.HC.__progChained = true;
    }
    initProgress(document);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();


/* ============================================================================
   COMMUNITY — appended behaviour for community.html.
   Self-contained IIFE, appended only; nothing above this line is edited.
   Keys off data-* attributes exclusively, never class names, exactly like the
   core module. Re-entrant: every handler is guarded so HC.init()-style
   re-wiring cannot double-bind.

   Attributes owned by this module
     data-workspace + data-view="list|thread|detail" which pane is on screen <840
     data-view-set="list|thread|detail"             back / details buttons
     data-group-select="id" + data-group-panel="id" list selection -> panes
     data-filter-input + data-filter-scope / data-filter-list / data-filter-name
     data-disclosure="x" + its panel id                invitations inbox
     data-invite-item / data-invite-action / data-invite-count / data-invite-empty
     data-composer / data-composer-field                send a message
     data-reply-to / data-reply-chip / data-reply-text / data-reply-clear
   ========================================================================= */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  };
  var reduced = function () {
    return window.HC && window.HC.reducedMotion ? window.HC.reducedMotion() : false;
  };
  var say = function (msg) {
    if (window.HC && window.HC.announce) window.HC.announce(msg);
  };
  var bind = function (el, key, evt, fn) {
    if (el['__hc' + key]) return;
    el['__hc' + key] = true;
    el.addEventListener(evt, fn);
  };

  /* --- 1. The three segments -------------------------------------------- */
  /* REMOVED. This module used to carry a second [data-tab] implementation that
     bound the same buttons as the Progress module's [data-tabs] handler, so on
     community.html every segment was wired twice. The Progress one is kept: it
     scopes tabs to their own [data-tabs] container (this one queried the whole
     root, so two tablists on one page would have fought), it honours whichever
     tab the markup declares selected, and it drives the panel fade. The DOM
     contract — data-tabs / data-tab / data-tabpanel — is unchanged.
     ---------------------------------------------------------------------- */

  /* --- 2. Which pane is on screen below 840 ------------------------------ */
  function setView(ws, view) {
    if (!ws) return;
    ws.setAttribute('data-view', view);
    /* Move focus to the pane that just arrived so keyboard and screen-reader
       users are not left behind in a pane that is no longer rendered. At 840+
       nothing is hidden, so this is a no-op the user never notices. */
    var pane = ws.querySelector(
      view === 'list' ? '.workspace__list' :
      view === 'thread' ? '.workspace__thread' : '.workspace__detail');
    var head = pane && pane.querySelector('[data-group-panel]:not([hidden]) .pane-head, .pane-head');
    if (head && window.innerWidth < 840) {
      head.setAttribute('tabindex', '-1');
      head.focus({ preventScroll: true });
    }
  }

  function initViewButtons(root) {
    $$('[data-view-set]', root).forEach(function (btn) {
      bind(btn, 'View', 'click', function () {
        setView(btn.closest('[data-workspace]'), btn.getAttribute('data-view-set'));
      });
    });
  }

  /* --- 3. Selecting a group --------------------------------------------- */
  function initGroupList(root) {
    $$('[data-group-select]', root).forEach(function (btn) {
      bind(btn, 'Group', 'click', function () {
        var ws = btn.closest('[data-workspace]');
        if (!ws) return;
        var id = btn.getAttribute('data-group-select');

        $$('[data-group-select]', ws).forEach(function (b) {
          if (b === btn) b.setAttribute('aria-current', 'true');
          else b.removeAttribute('aria-current');
        });
        $$('[data-group-panel]', ws).forEach(function (p) {
          p.hidden = p.getAttribute('data-group-panel') !== id;
        });

        setView(ws, 'thread');
        var title = $('.group-row__name', btn);
        say((title ? title.textContent : 'Group') + ' opened.');
      });
    });
  }

  /* --- 4. Search: filters the group list in place ------------------------ */
  function initFilter(root) {
    $$('[data-filter-input]', root).forEach(function (input) {
      bind(input, 'Filter', 'input', function () {
        var scope = input.getAttribute('data-filter-scope');
        var list = document.querySelector('[data-filter-list="' + scope + '"]');
        if (!list) return;
        var q = input.value.trim().toLowerCase();
        var shown = 0;
        $$('[data-filter-name]', list).forEach(function (item) {
          var hit = !q || item.getAttribute('data-filter-name').toLowerCase().indexOf(q) > -1;
          var li = item.closest('li') || item;
          li.hidden = !hit;
          if (hit) shown++;
        });
        if (q) say(shown + (shown === 1 ? ' group' : ' groups') + ' match.');
      });
    });
  }

  /* --- 5. The invitations inbox ------------------------------------------ */
  function initDisclosures(root) {
    $$('[data-disclosure]', root).forEach(function (btn) {
      bind(btn, 'Disc', 'click', function () {
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (!panel) return;
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        panel.hidden = open;
      });
    });
  }

  function initInvites(root) {
    $$('[data-invite-action]', root).forEach(function (btn) {
      bind(btn, 'Inv', 'click', function () {
        var item = btn.closest('[data-invite-item]');
        var inbox = btn.closest('.invite-inbox');
        if (!item || !inbox) return;
        var accepted = btn.getAttribute('data-invite-action') === 'accept';
        var who = item.textContent.replace(/\s+/g, ' ').trim().split(' · ')[0];

        item.remove();
        var left = $$('[data-invite-item]', inbox).length;

        $$('[data-invite-count]', inbox).forEach(function (c) {
          c.textContent = left === 0 ? 'All caught up'
                        : left === 1 ? '1 waiting'
                        : left + ' waiting';
        });
        $$('[data-invite-empty]', inbox).forEach(function (e) { e.hidden = left !== 0; });
        /* Real copy from the product: "Request accepted!" / "Request denied!" —
           said politely, once, in the live region. There is no snackbar in this
           system and this screen does not add one. */
        say(accepted ? 'Request accepted. ' + who : 'Request declined.');
      });
    });
  }

  /* --- 6. Encouragement: "Say something" targets the composer ------------ */
  function initReply(root) {
    $$('[data-reply-to]', root).forEach(function (btn) {
      bind(btn, 'Reply', 'click', function () {
        var panel = btn.closest('[data-group-panel]') || document;
        var chip = $('[data-reply-chip]', panel);
        var text = $('[data-reply-text]', panel);
        var field = $('[data-composer-field]', panel);
        if (text) text.textContent = btn.getAttribute('data-reply-to');
        if (chip) chip.hidden = false;
        if (field) field.focus();
      });
    });

    $$('[data-reply-clear]', root).forEach(function (btn) {
      bind(btn, 'ReplyX', 'click', function () {
        var chip = btn.closest('[data-reply-chip]');
        if (chip) chip.hidden = true;
        var panel = btn.closest('[data-group-panel]');
        var field = panel && $('[data-composer-field]', panel);
        if (field) field.focus();
      });
    });
  }

  /* --- 7. Sending a message ---------------------------------------------- */
  function timeNow() {
    var d = new Date();
    var h = d.getHours(), m = d.getMinutes();
    var ap = h < 12 ? 'am' : 'pm';
    h = h % 12; if (h === 0) h = 12;
    return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ap;
  }

  function initComposer(root) {
    $$('[data-composer]', root).forEach(function (form) {
      bind(form, 'Comp', 'submit', function (e) {
        e.preventDefault();
        var panel = form.closest('[data-group-panel]') || document;
        var field = $('[data-composer-field]', form);
        var log = $('[data-thread-log]', panel);
        if (!field || !log) return;
        var value = field.value.trim();
        if (!value) { field.focus(); return; }

        var chip = $('[data-reply-chip]', panel);
        var replyTo = chip && !chip.hidden ? $('[data-reply-text]', panel) : null;

        var row = document.createElement('div');
        row.className = 'chat-row chat-row--self';
        var wrap = document.createElement('div');
        var bubble = document.createElement('p');
        bubble.className = 'chat-bubble';
        bubble.textContent = value;
        var meta = document.createElement('p');
        meta.className = 'chat-meta';
        meta.textContent = 'You · ' + timeNow() +
          (replyTo ? ' · in reply to ' + replyTo.textContent : '');
        wrap.appendChild(bubble);
        wrap.appendChild(meta);
        row.appendChild(wrap);
        log.appendChild(row);

        /* The entrance is a fade plus a 6px rise; under reduced motion the
           class is simply not added and the message is just there. */
        if (!reduced()) {
          row.classList.add('is-entering');
          window.setTimeout(function () { row.classList.remove('is-entering'); }, 400);
        }

        field.value = '';
        if (chip) chip.hidden = true;
        log.scrollTop = log.scrollHeight;
        row.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
        field.focus();
        say('Message sent.');
      });
    });
  }

  function initCommunity(root) {
    var ctx = root || document;
    if (!$('[data-workspace]', ctx)) return;   /* tabs are the Progress module's */
    initViewButtons(ctx);
    initGroupList(ctx);
    initFilter(ctx);
    initDisclosures(ctx);
    initInvites(ctx);
    initReply(ctx);
    initComposer(ctx);
  }

  function boot() {
    initCommunity(document);
    /* Newly injected markup gets wired by the core HC.init(); re-run ours on
       the same tick so the two stay in step without patching the core. */
    if (window.HC && typeof window.HC.init === 'function' && !window.HC.__hcCommunityWrapped) {
      var coreInit = window.HC.init;
      window.HC.__hcCommunityWrapped = true;
      window.HC.init = function (el) { coreInit(el); initCommunity(el); };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();


/* ============================================================================
   APPENDED MODULE — CREATE HABIT + PROFILE
   Added for create-habit.html and profile.html. Append-only: it does not touch
   anything above, it keys off data-* attributes exclusively (never class names),
   and it reuses the public HC.* API rather than reimplementing it. Every hook
   below no-ops when its markup is absent, so this module is inert on any other
   screen.

   HOOKS
     Create Habit
       [data-craft]                      the workbench root
       [data-craft-field="behavior|prompt|celebration|goal|why"]
       [data-craft-step="…"]             the step block, gains .is-done
       [data-craft-ordinal] / [data-craft-check]   the step's number / tick
       [data-craft-preview]              wrapper around the live habit card
       [data-craft-echo] / [data-craft-echo-caption]  the promise, on the hero
       [data-craft-remind]               the "Remind me" checkbox
       [data-craft-schedule]             the day/time region it reveals
       [data-craft-day="Mon"]            one day button (aria-pressed)
       [data-craft-selectall]            Select All / Unselect All
       [data-craft-time]                 <input type="time">
       [data-craft-reminder]             the "Mon, Wed, Fri at 7:00 AM" read-out
       [data-craft-template]             a starting point; carries data-behavior,
                                         data-prompt, data-celebration, data-goal,
                                         data-days, data-time
       [data-craft-submit]               the Create Habit button
       [data-craft-crowded]              the supportive 5+ habits note
       [data-demo="crowded"]             prototype control that shows it
     Profile
       [data-panes] [data-pane-tab] [data-pane-panel] [data-pane-back]
       [data-visibility] / [data-visibility-value]      Public / Private
       [data-onoff] / [data-onoff-value]                On / Off
       [data-profile-save] / [data-profile-saved]
       [data-quick-checkin-toggle]
       [data-modal-open="id"] [data-modal="id"] [data-modal-close]
   ========================================================================= */

(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  };
  var reduced = function () {
    return window.HC && window.HC.reducedMotion ? window.HC.reducedMotion() : false;
  };
  var say = function (m) { if (window.HC && window.HC.announce) window.HC.announce(m); };


  /* ==========================================================================
     1. CREATE HABIT — the workbench                                  [D §3.4]
     The four Fogg questions in the order the direction sets (Behavior → Prompt
     → Celebration → Goal, lead with the doable thing and end with the meaning),
     plus the app's real optional fifth, "Why is this goal important?".
     Everything the user types assembles the live habit card immediately: the
     point of the screen is watching the object come together.
     ====================================================================== */

  var DAYS = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];

  function fmtTime(v) {
    if (!v) return '';
    var p = String(v).split(':');
    var h = parseInt(p[0], 10);
    var m = p[1] || '00';
    if (isNaN(h)) return '';
    var suffix = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + ':' + m + ' ' + suffix;
  }

  function craftValue(name, ctx) {
    var el = $('[data-craft-field="' + name + '"]', ctx);
    return el ? el.value.trim() : '';
  }

  function craftDays(ctx) {
    return $$('[data-craft-day]', ctx)
      .filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })
      .map(function (b) { return b.getAttribute('data-craft-day'); });
  }

  /* The app's own reminder sentence: "Mon, Wed, Fri at 7:00 AM". Returns ''
     until it is a real, complete sentence — a half-set reminder must never be
     written onto the habit card as if it meant something. */
  function reminderText(ctx) {
    var remind = $('[data-craft-remind]', ctx);
    if (remind && !remind.checked) return '';
    var days = craftDays(ctx);
    var time = fmtTime(($('[data-craft-time]', ctx) || {}).value);
    if (!days.length || !time) return '';
    return (days.length === DAYS.length ? 'Every day' : days.join(', ')) + ' at ' + time;
  }

  /* What the read-out beside the "Remind me" switch says, including the two
     incomplete states the sentence itself refuses to describe. */
  function reminderStatus(ctx) {
    var remind = $('[data-craft-remind]', ctx);
    if (remind && !remind.checked) return 'No reminder set';
    var full = reminderText(ctx);
    if (full) return full;
    return craftDays(ctx).length ? 'Pick a time' : 'Pick the days it should reach you';
  }

  function paintCraft(ctx) {
    var behavior    = craftValue('behavior', ctx);
    var prompt      = craftValue('prompt', ctx);
    var celebration = craftValue('celebration', ctx);
    var goal        = craftValue('goal', ctx);
    var why         = craftValue('why', ctx);
    var reminder    = reminderText(ctx);

    /* --- step progress. A fill change AND a glyph, never colour alone. --- */
    var done = {
      behavior: !!behavior, prompt: !!prompt,
      celebration: !!celebration, goal: !!goal, why: !!why
    };
    $$('[data-craft-step]', ctx).forEach(function (step) {
      var isDone = !!done[step.getAttribute('data-craft-step')];
      step.classList.toggle('is-done', isDone);
      var num = $('[data-craft-ordinal]', step);
      var tick = $('[data-craft-check]', step);
      if (num) num.hidden = isDone;
      /* The tick is an <svg>, and `hidden` is an HTMLElement IDL attribute —
         assigning el.hidden on an SVGElement sets a JS expando and leaves the
         content attribute (and therefore [hidden] in CSS) untouched. Toggle the
         attribute directly. */
      if (tick) {
        if (isDone) tick.removeAttribute('hidden');
        else tick.setAttribute('hidden', '');
      }
    });

    /* --- the live card. data-habit="preview" keeps it out of the day arc. --- */
    var preview = $('[data-craft-preview]', ctx);
    if (preview) {
      var card  = $('[data-habit]', preview);
      var title = $('.habit-card__title', preview);
      var meta  = $('.habit-card__meta', preview);
      if (title) title.textContent = behavior || 'Your habit';
      if (meta) {
        var bits = [];
        if (prompt) bits.push(prompt);
        if (reminder) bits.push(reminder);
        meta.textContent = bits.length ? bits.join(' · ')
                                       : 'It takes shape here as you write.';
      }
      if (card) {
        if (celebration) card.setAttribute('data-celebration', celebration);
        else card.removeAttribute('data-celebration');
        var ring = $('[data-checkin]', card);
        if (ring && !card.classList.contains('is-complete')) {
          ring.setAttribute('aria-label',
            'Try it: ' + (behavior || 'your habit') + '. Press and hold to complete.');
        }
      }
    }

    /* --- the promise, echoed on the hero in the exact face it will unfurl in. */
    var echo = $('[data-craft-echo]', ctx);
    var cap  = $('[data-craft-echo-caption]', ctx);
    if (echo) echo.textContent = celebration;
    if (cap) {
      cap.textContent = celebration
        ? 'This is what unfurls inside the card the moment you check in.'
        : 'Whatever you write here comes back to you, word for word, every time you check in.';
    }

    /* --- the reminder read-out --- */
    $$('[data-craft-reminder]', ctx).forEach(function (el) {
      el.textContent = reminderStatus(ctx);
    });

    /* --- the app's real rule: behavior + prompt + goal are required. --- */
    var submit = $('[data-craft-submit]', ctx);
    if (submit) {
      var ready = !!(behavior && prompt && goal);
      submit.disabled = !ready;
      submit.setAttribute('aria-disabled', String(!ready));
    }
    var needs = $('[data-craft-needs]', ctx);
    if (needs) needs.hidden = !!(behavior && prompt && goal);

    return { behavior: behavior, goal: goal, why: why };
  }

  function settle(ctx) {
    var preview = $('[data-craft-preview]', ctx);
    if (!preview || reduced()) return;
    preview.classList.remove('is-settling');
    void preview.offsetWidth;
    preview.classList.add('is-settling');
    window.setTimeout(function () { preview.classList.remove('is-settling'); }, 560);
  }

  function initCraft(ctx) {
    var root = $('[data-craft]', ctx);
    if (!root || root.__hcCraft) return;
    root.__hcCraft = true;

    $$('[data-craft-field]', root).forEach(function (el) {
      el.addEventListener('input', function () { paintCraft(root); });
      el.addEventListener('change', function () { paintCraft(root); });
    });

    /* Day buttons are plain aria-pressed buttons — keyboard support is free. */
    $$('[data-craft-day]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') === 'true';
        b.setAttribute('aria-pressed', String(!on));
        syncSelectAll(root);
        paintCraft(root);
      });
    });

    function syncSelectAll(scope) {
      var btn = $('[data-craft-selectall]', scope);
      if (!btn) return;
      var all = craftDays(scope).length === DAYS.length;
      btn.textContent = all ? 'Unselect All' : 'Select All';
      btn.setAttribute('aria-pressed', String(all));
    }

    var selectAll = $('[data-craft-selectall]', root);
    if (selectAll) {
      selectAll.addEventListener('click', function () {
        var all = craftDays(root).length === DAYS.length;
        $$('[data-craft-day]', root).forEach(function (b) {
          b.setAttribute('aria-pressed', String(!all));
        });
        syncSelectAll(root);
        paintCraft(root);
      });
    }

    var time = $('[data-craft-time]', root);
    if (time) time.addEventListener('input', function () { paintCraft(root); });

    var remind = $('[data-craft-remind]', root);
    if (remind) {
      remind.addEventListener('change', function () {
        var region = $('[data-craft-schedule]', root);
        if (region) region.hidden = !remind.checked;
        paintCraft(root);
        say(remind.checked ? 'Reminder on.' : 'Reminder off.');
      });
    }

    /* A template fills the whole object at once and lands with one settle. */
    $$('[data-craft-template]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        ['behavior', 'prompt', 'celebration', 'goal', 'why'].forEach(function (k) {
          var v = b.getAttribute('data-' + k);
          var el = $('[data-craft-field="' + k + '"]', root);
          if (el && v !== null) el.value = v;
        });
        var days = (b.getAttribute('data-days') || '').split(',')
                     .map(function (s) { return s.trim(); }).filter(Boolean);
        if (days.length) {
          $$('[data-craft-day]', root).forEach(function (d) {
            d.setAttribute('aria-pressed',
              String(days.indexOf(d.getAttribute('data-craft-day')) > -1));
          });
          if (remind) remind.checked = true;
          var region = $('[data-craft-schedule]', root);
          if (region) region.hidden = false;
        }
        var t = b.getAttribute('data-time');
        if (t && time) time.value = t;
        syncSelectAll(root);
        paintCraft(root);
        settle(root);
        say('Filled in: ' + (b.getAttribute('data-behavior') ||
                             b.getAttribute('data-celebration') ||
                             b.getAttribute('data-goal') || 'a suggestion') + '.');
      });
    });

    /* The "More than 7 habits?" blocking dialog is cut; the supportive note
       shows before the button instead. [D §3.4] This control fakes the state. */
    $$('[data-demo="crowded"]').forEach(function (b) {
      if (b.__hcBound) return;
      b.__hcBound = true;
      b.addEventListener('click', function () {
        var note = $('[data-craft-crowded]');
        if (!note) return;
        note.hidden = !note.hidden;
        b.setAttribute('aria-pressed', String(!note.hidden));
      });
    });

    /* Nothing is persisted here, and pressing Enter in a field must not reload
       the page and throw the whole object away. */
    if (root.tagName === 'FORM') {
      root.addEventListener('submit', function (e) {
        e.preventDefault();
        say('Habit crafted. This is a prototype, so nothing is saved.');
      });
    }

    syncSelectAll(root);
    paintCraft(root);
  }


  /* ==========================================================================
     2. PROFILE — 2-pane categories                                   [D §3.5]
     Real tabs: arrow keys, Home and End, roving tabindex, and each panel
     labelled by its tab. Below 600px selecting a category hides the list and
     reveals a back affordance, which is the honest web equivalent of the
     direction's "rows push to detail"; from 600px up both panes are permanent
     and the back link disappears.
     ====================================================================== */

  function initPanes(ctx) {
    var wrap = $('[data-panes]', ctx);
    if (!wrap || wrap.__hcPanes) return;
    wrap.__hcPanes = true;

    var tabs = $$('[data-pane-tab]', wrap);
    var narrow = function () { return window.matchMedia('(max-width: 599px)').matches; };

    function select(tab, focusPanel) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (narrow()) {
        wrap.classList.add('is-detail');
        var p = document.getElementById(tab.getAttribute('aria-controls'));
        if (focusPanel && p) p.focus();
      }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, true); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
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

    $$('[data-pane-back]', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        wrap.classList.remove('is-detail');
        var current = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
        if (current) current.focus();
      });
    });

    /* Leaving the narrow width must not strand the user in "detail" mode. */
    window.addEventListener('resize', function () {
      if (!narrow()) wrap.classList.remove('is-detail');
    });
  }

  /* Privacy switches. The value is written as text as well as shown by the
     thumb position, so the state never rests on colour. */
  function initVisibility(ctx) {
    $$('[data-visibility]', ctx).forEach(function (input) {
      if (input.__hcBound) return;
      input.__hcBound = true;
      var row = input.closest('.setting-row') || input.parentNode;
      var out = $('[data-visibility-value]', row);
      var label = input.getAttribute('data-visibility');
      function paint() {
        if (out) out.textContent = input.checked ? 'Public' : 'Private';
      }
      input.addEventListener('change', function () {
        paint();
        say(label + ' is now ' + (input.checked ? 'public' : 'private') + '.');
      });
      paint();
    });
  }

  /* A plain on/off switch that writes its own state as words (the milestone
     chime). Same rule as above: never colour alone. */
  function initOnOff(ctx) {
    $$('[data-onoff]', ctx).forEach(function (input) {
      if (input.__hcBound) return;
      input.__hcBound = true;
      var row = input.closest('.setting-row') || input.parentNode;
      var out = $('[data-onoff-value]', row);
      input.addEventListener('change', function () {
        if (out) out.textContent = input.checked ? 'On' : 'Off';
        say(input.getAttribute('data-onoff') + ' ' + (input.checked ? 'on' : 'off') + '.');
      });
      if (out) out.textContent = input.checked ? 'On' : 'Off';
    });
  }

  /* The shipping app confirms a profile save with a dark snackbar. There is no
     snackbar in this system [D §2.2], so the confirmation is an inline line
     beside the button, plus the polite live region. */
  function initProfileSave(ctx) {
    $$('[data-profile-save]', ctx).forEach(function (btn) {
      if (btn.__hcBound) return;
      btn.__hcBound = true;
      btn.addEventListener('click', function () {
        var flag = $('[data-profile-saved]', btn.parentNode) || $('[data-profile-saved]');
        if (flag) flag.hidden = false;
        say('Profile updated!');
      });
    });
  }

  /* "Quick check-in (single tap)" — the motor-accessibility setting the check-in
     gesture promises. It writes the same [data-quick-checkin] flag on <html>
     that the ring already reads, so turning it on here changes the real
     behaviour of every ring in the prototype. [D §2.1] */
  function initQuickCheckin(ctx) {
    $$('[data-quick-checkin-toggle]', ctx).forEach(function (input) {
      if (input.__hcBound) return;
      input.__hcBound = true;
      input.addEventListener('change', function () {
        if (input.checked) document.documentElement.setAttribute('data-quick-checkin', 'true');
        else document.documentElement.removeAttribute('data-quick-checkin');
        say('Quick check-in ' + (input.checked ? 'on' : 'off') + '.');
      });
    });
  }


  /* ==========================================================================
     3. A SMALL MODAL OPENER
     Used by Profile's "Preview profile" and the account-deletion confirm. Uses
     the kit's existing .scrim / .modal, adds Escape, scrim-click, initial focus
     and focus restore. No snackbar anywhere — that stays deleted. [D §2.2]
     ====================================================================== */

  function initModals(ctx) {
    $$('[data-modal-open]', ctx).forEach(function (btn) {
      if (btn.__hcBound) return;
      btn.__hcBound = true;
      btn.addEventListener('click', function () {
        var modal = document.querySelector(
          '[data-modal="' + btn.getAttribute('data-modal-open') + '"]');
        if (!modal) return;
        var opener = btn;
        modal.hidden = false;
        var first = modal.querySelector('[data-modal-close], button, a[href]');
        if (first) first.focus();

        function close() {
          modal.hidden = true;
          document.removeEventListener('keydown', onKey);
          modal.removeEventListener('click', onClick);
          if (opener) opener.focus();
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


  /* ==========================================================================
     4. WIRING — runs after prototype.js has booted, and again on HC.init().
     ====================================================================== */

  function boot() {
    initCraft(document);
    initPanes(document);
    initVisibility(document);
    initOnOff(document);
    initProfileSave(document);
    initQuickCheckin(document);
    initModals(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();


/* ============================================================================
   ============================================================================
   PRIMITIVES BUILD — milestone (full spec), skeleton loading, empty-state and
   streak-repair demo controls.                                    [D §2.4, §4.5]

   APPEND-ONLY SECTION. Nothing above this line is edited, reordered or
   removed. Self-contained IIFE; keys off data-* attributes only, never class
   names; re-entrant, so HC.init() on injected markup is safe.

   It takes over ONE public method — HC.fireMilestone — by reassignment rather
   than by editing the core, and it intercepts the [data-demo="milestone"]
   buttons in the CAPTURE phase so the core's own (stubbed) handler never runs.
   Both are additive: delete this section and the prototype falls back to the
   original behaviour with nothing broken.

   PROTOTYPE SCOPE, STATED PLAINLY: everything here is scripted to demonstrate
   the design. There is no data layer, no persistence and no state machine —
   fixture numbers live in the HTML, the loading state is triggered by hand,
   and "one celebration per session" is a single boolean. A real build would
   own all three properly.
   ========================================================================= */

(function () {
  'use strict';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }
  function reduced() {
    return !!(window.HC && window.HC.reducedMotion && window.HC.reducedMotion());
  }
  function say(msg) { if (window.HC && window.HC.announce) window.HC.announce(msg); }
  function cssMs(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var n = parseFloat(v);
    if (!n) return fallback;
    return /ms$/.test(v) ? n : n * 1000;
  }


  /* ==========================================================================
     1. THE MILESTONE MOMENT, TO SPEC                                  [D §2.4]

     Sequence, in the exact numbers the ticket names:
       scrim   fades to 40% ink-strong (the --c-scrim token IS 40%)
       card    enters on --ease-spring-gentle at its paired 650ms (CSS)
       confetti 34 pieces (cap is 40) released along the card's TOP EDGE in a
               60 degree cone (+/-30 from straight down); every piece is gone by
               1100ms, guaranteed by a single sweep timer, not by trusting the
               animations to finish
       numeral counts up in the display serif with WONK 1 — the one place in
               the system WONK is allowed to leave 0
       exit    auto-dismiss at 4000ms, or on tap/Escape, whichever is first

     ONE FULL CELEBRATION PER SESSION, MAXIMUM. The second and later milestones
     get the quiet streak-increment treatment instead: the streak numeral
     flushes gold once and the live region says the number. That ratio — gold
     owning the screen for 1.6s on one day, and nothing on the others — is the
     whole reward economy. [D §6]

     REDUCED MOTION: no confetti is created at all (not created-then-hidden),
     the card crossfades instead of springing (CSS branch), and the numeral is
     rendered at its final value immediately.
     ====================================================================== */

  var CONFETTI_MAX = 40;
  var CONFETTI_N = 34;
  var CONFETTI_CLEAR = 1100;   /* ms — every piece is removed by here */
  var MILESTONE_DWELL = 4000;  /* ms — auto-dismiss */

  var celebrated = false;      /* the once-per-session latch */

  function fireMilestone(opts) {
    opts = opts || {};
    var days = parseInt(opts.days, 10) || 7;

    /* Second and later milestones: the quieter treatment, never the card. */
    if (celebrated && !opts.replay) { quietIncrement(days); return; }
    celebrated = true;

    var opener = document.activeElement;
    var soft = reduced();

    var scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.setAttribute('data-milestone', '');
    scrim.innerHTML =
      '<div class="modal modal--milestone" role="alertdialog" aria-modal="true"' +
           ' aria-labelledby="hc-ms-title" aria-describedby="hc-ms-body">' +
        '<span class="seal seal--lg' + (days >= 365 ? ' seal--solid' : '') + '" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24"><use href="#i-rosette"></use></svg>' +
        '</span>' +
        '<p class="modal__numeral" data-ms-count>' + (soft ? days : 0) + '</p>' +
        '<h2 class="t-h3" id="hc-ms-title">day streak</h2>' +
        '<p class="t-body t-muted" id="hc-ms-body" style="margin-block:8px 16px">' +
          'You showed up for ' + days + ' days. ' + markCopy(days) + '</p>' +
        '<button class="btn btn--gold" type="button" data-ms-dismiss>Nice</button>' +
      '</div>';
    document.body.appendChild(scrim);

    var card = $('.modal', scrim);

    if (!soft) {
      confetti(card);
      countUp($('[data-ms-count]', card), days);
    }

    var timer = window.setTimeout(close, MILESTONE_DWELL);

    function close() {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      scrim.remove();
      /* Focus goes back where it came from — a celebration must not strand the
         keyboard user at the top of the document. */
      if (opener && document.contains(opener) && opener.focus) opener.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') { close(); return; }
      /* A minimal trap: the card has exactly one focusable, so Tab simply
         stays on it rather than walking the page behind the scrim. */
      if (e.key === 'Tab') { e.preventDefault(); }
    }
    scrim.addEventListener('click', function (e) {
      if (e.target === scrim || (e.target.closest && e.target.closest('[data-ms-dismiss]'))) close();
    });
    document.addEventListener('keydown', onKey, true);

    var cta = $('[data-ms-dismiss]', card);
    if (cta) cta.focus();
    say(days + ' day streak. You showed up for ' + days + ' days.');
  }

  /* The mark each tier earns, in the product's own voice. */
  function markCopy(days) {
    if (days >= 365) return 'Your seal is solid gold now.';
    if (days >= 100) return 'This one carries a seal from here on.';
    if (days >= 30)  return 'A gold rule around the card, permanently.';
    return 'A corner tick, and it stays.';
  }

  /* ≤40 pieces, released along the TOP EDGE, 60 degree cone, cleared by 1100ms.
     No loop, no repeat, nothing left in the DOM afterwards. */
  function confetti(host) {
    var tones = ['gold', 'gold2', 'sage', 'brand'];
    var n = Math.min(CONFETTI_N, CONFETTI_MAX);
    var pieces = [];

    for (var i = 0; i < n; i++) {
      var p = document.createElement('i');
      p.className = 'confetti-piece confetti-piece--' + tones[i % tones.length];
      /* Spread across the card's top edge rather than firing from one point:
         the brief's cone is a direction, not an origin. */
      p.style.insetInlineStart = (2 + (i / n) * 96 + (Math.random() * 4 - 2)).toFixed(1) + '%';
      host.appendChild(p);
      pieces.push(p);

      /* 60 degree cone: +/-30 degrees either side of straight down. */
      var angle = (Math.random() * 60 - 30) * Math.PI / 180;
      var dist = 120 + Math.random() * 150;
      p.animate([
        { translate: '0 0', rotate: '0deg', opacity: 1, offset: 0 },
        { opacity: 1, offset: 0.7 },
        { translate: (Math.sin(angle) * dist).toFixed(0) + 'px ' +
                     (Math.cos(angle) * dist).toFixed(0) + 'px',
          rotate: (Math.random() * 540 - 270).toFixed(0) + 'deg',
          opacity: 0, offset: 1 }
      ], {
        duration: 820,
        delay: Math.random() * 160,        /* 820 + 160 = 980 < 1100 */
        easing: 'cubic-bezier(0.3,0,0.8,0.15)',
        fill: 'forwards'
      });
    }

    /* One sweep, one timer. Whatever the animations did, the DOM is clean at
       1100ms — which is what "all cleared by 1100ms" has to mean. */
    window.setTimeout(function () {
      pieces.forEach(function (el) { if (el.parentNode) el.remove(); });
    }, CONFETTI_CLEAR);
  }

  /* The numeral counts up in the display serif. Tabular figures are already on
     .modal__numeral, so the digits do not jitter as they climb. */
  function countUp(el, to) {
    if (!el) return;
    var start = performance.now();
    var dur = 700;
    (function step(now) {
      var t = Math.min(1, (now - start) / dur);
      /* ease-out so the last digits settle rather than slam. */
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(to * eased));
      if (t < 1) window.requestAnimationFrame(step);
      else el.textContent = String(to);
    })(start);
  }

  /* THE QUIET FALLBACK — the streak-increment treatment. A single gold colour
     flush on the streak numeral and its flame chip, plus the live region. No
     scrim, no card, no particles. Colour-only, so it is identical under
     reduced motion (WCAG 2.3.3 puts colour change outside motion animation). */
  function quietIncrement(days) {
    var targets = $$('.hero__numeral, [data-streak-numeral], .chip--streak');
    targets.forEach(function (el) {
      el.classList.remove('is-streak-flush');
      /* reflow so a repeat press replays the flush */
      void el.offsetWidth;
      el.classList.add('is-streak-flush');
      window.setTimeout(function () { el.classList.remove('is-streak-flush'); }, 1000);
    });
    say(days + ' day streak.');
  }


  /* ==========================================================================
     2. SKELETON LOADING — the 400ms rule, made real                   [D §4.5]

     Under 400ms: NOTHING is shown. The container is emptied of its own paint
     and no skeleton is inserted, so a fast load is a blank beat rather than a
     flash of grey boxes.
     Beyond 400ms: static blocks at the container's own radii, one 1200ms
     opacity pulse (CSS), no shimmer.

     Prototype scope: the "load" is a timer on a devbar button. There is no
     fetch, no cache and no error path — a real build owns all three.

     Markup contract:
       <div data-skeleton="list|panel"> ...real content... </div>
       <button data-demo="load">      slow  (1400ms) — skeleton appears
       <button data-demo="load-fast"> fast  (250ms)  — nothing appears
     ====================================================================== */

  var SKELETON_DELAY = 400;

  function skeletonFor(kind) {
    var host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');   /* the live region does the talking */
    host.setAttribute('data-skeleton-paint', '');

    if (kind === 'panel') {
      host.className = 'u-stack';
      host.innerHTML =
        '<div class="skeleton skeleton--hero"></div>' +
        '<div class="skeleton skeleton--tile"></div>' +
        '<div class="skeleton skeleton--tile"></div>';
      return host;
    }
    host.className = 'skeleton-list';
    var row =
      '<div class="skeleton-card">' +
        '<div class="skeleton-card__body">' +
          '<div class="skeleton skeleton--line" style="inline-size:62%"></div>' +
          '<div class="skeleton skeleton--line-sm" style="inline-size:84%"></div>' +
        '</div>' +
        '<div class="skeleton skeleton--ring"></div>' +
      '</div>';
    host.innerHTML = row + row + row + row;
    return host;
  }

  function runLoad(ms) {
    $$('[data-skeleton]').forEach(function (container) {
      if (container.__hcLoading) return;
      container.__hcLoading = true;

      var paint = skeletonFor(container.getAttribute('data-skeleton'));
      var shown = false;
      container.setAttribute('aria-busy', 'true');
      container.style.display = 'none';

      var appear = window.setTimeout(function () {
        container.parentNode.insertBefore(paint, container);
        shown = true;
      }, SKELETON_DELAY);

      window.setTimeout(function () {
        window.clearTimeout(appear);
        if (shown && paint.parentNode) paint.remove();
        container.style.display = '';
        container.removeAttribute('aria-busy');
        container.__hcLoading = false;
      }, ms);
    });
    say(ms < SKELETON_DELAY ? 'Loading.' : 'Loading your habits.');
  }


  /* ==========================================================================
     3. EMPTY-STATE DEMO TOGGLE                                          [M6]
     Swaps a screen between its populated state and its empty state so both can
     be reviewed without emptying any data. Purely a review control.

       [data-empty-demo]        shown when the toggle is on
       [data-empty-demo-hide]   hidden when the toggle is on
     ====================================================================== */

  function toggleEmpty(btn) {
    var on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    $$('[data-empty-demo]').forEach(function (el) { el.hidden = !on; });
    $$('[data-empty-demo-hide]').forEach(function (el) { el.hidden = on; });
    say(on ? 'Empty state shown.' : 'Habits restored.');
  }


  /* ==========================================================================
     4. STREAK DECAY — the scripted demonstration                      [D §3.2]
     Moves the decay bar from "kept" to "after a week away" and back, so the
     point of the mechanic (it goes DOWN A LITTLE, it does not reset) is
     visible rather than described. Two numbers, both in the HTML.
     ====================================================================== */

  function initRepair(ctx) {
    $$('[data-repair-run]', ctx).forEach(function (btn) {
      if (btn.__hcBound) return;
      btn.__hcBound = true;
      btn.addEventListener('click', function () {
        var wrap = btn.closest('[data-repair]');
        if (!wrap) return;
        var bar = $('[data-repair-now]', wrap);
        var out = $('[data-repair-readout]', wrap);
        var decayed = btn.getAttribute('aria-pressed') === 'true';
        var next = decayed ? bar.getAttribute('data-full') : bar.getAttribute('data-decayed');
        var label = decayed ? out.getAttribute('data-full') : out.getAttribute('data-decayed');
        bar.style.inlineSize = next;
        out.textContent = label;
        btn.setAttribute('aria-pressed', String(!decayed));
        btn.textContent = decayed ? 'Show a week away' : 'Show it recovered';
        say(label);
      });
    });
  }


  /* ==========================================================================
     5. WIRING
     The milestone buttons are intercepted in the CAPTURE phase so this
     implementation runs instead of the core's, without editing the core.
     ====================================================================== */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-demo]');
    if (!btn) return;
    var kind = btn.getAttribute('data-demo');

    if (kind === 'milestone' || kind === 'milestone-replay') {
      e.stopPropagation();                 /* the core handler never sees it */
      fireMilestone({
        days: parseInt(btn.getAttribute('data-days'), 10) || 7,
        replay: kind === 'milestone-replay'
      });
      return;
    }
    if (kind === 'load')      { e.stopPropagation(); runLoad(1400); return; }
    if (kind === 'load-fast') { e.stopPropagation(); runLoad(250);  return; }
    if (kind === 'empty')     { e.stopPropagation(); toggleEmpty(btn); return; }
  }, true);

  function boot(root) {
    initRepair(root || document);
    /* Take over the public method. Anything calling HC.fireMilestone() — the
       gallery, a screen, a console — gets this implementation. */
    if (window.HC) window.HC.fireMilestone = fireMilestone;
  }

  /* Chain onto HC.init so injected markup is wired the same way as the kit's,
     exactly as the Progress and Community sections above do. */
  function chain() {
    if (window.HC && typeof window.HC.init === 'function' && !window.HC.__hcPrimChained) {
      var coreInit = window.HC.init;
      window.HC.__hcPrimChained = true;
      window.HC.init = function (el) { coreInit(el); initRepair(el || document); };
    }
    boot(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', chain);
  } else {
    chain();
  }
})();


/* ============================================================================
   REMAINING SCREENS — Explore · Library · Library detail · Onboarding · Auth
   APPEND-ONLY SECTION. Nothing above this line is edited or reordered.
   Self-contained IIFE in the same house style as the blocks above it: keys off
   data-* attributes only, never class names, guards every handler so it is
   re-entrant, and chains onto HC.init so injected markup is wired the same way
   as the kit's.

   SCOPE, DELIBERATELY SMALL. This is prototype behaviour, not an application.
   Everything below is scripted to demonstrate a design decision:
     - there is no data layer, no persistence, no storage of any kind;
     - there is NO form validation and no auth — the auth forms show the
       fields, the states and the layout, and submitting walks the happy path;
     - filtering is a hardcoded tree in the markup, matched on a data attribute;
     - a real build needs validation, error states, empty/loading states per
       query, and a router. None of that is here, on purpose.

   DOM CONTRACT
     [data-cat-list] / [data-cat]        category rail (role=tablist) + its tabs
     [data-idea-grid] / [data-cats]      the filtered grid + each item's keys
     [data-sub]                          subcategory toggle (aria-pressed)
     [data-idea-heading] [data-idea-count] [data-idea-empty]
     [data-idea-search]                  free-text filter over the grid
     [data-modal-open="idea"] + data-behavior/prompt/celebration/why/taken
                                         an idea card; fills the shared dialog
     [data-idea-field="…"]               a slot in that dialog
     [data-ob-stage] [data-ob-slide]     onboarding stage + slides
     [data-ob-go] [data-ob-prev] [data-ob-next] [data-ob-done]
     [data-auth-view] [data-auth-go]     auth view + the controls that switch it
     [data-auth-form] [data-auth-sent] [data-pw-toggle]
   ========================================================================= */

(function () {
  'use strict';

  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };

  var reduced = function () {
    return window.HC && window.HC.reducedMotion ? window.HC.reducedMotion() : false;
  };
  var say = function (m) { if (window.HC && window.HC.announce) window.HC.announce(m); };

  /* Bind once per element per purpose. Same guard shape the blocks above use. */
  function bind(el, key, evt, fn, opts) {
    var flag = '__hcX' + key;
    if (el[flag]) return;
    el[flag] = true;
    el.addEventListener(evt, fn, opts);
  }


  /* ==========================================================================
     1. BROWSE — the category rail + the grid it filters
     Used by: explore.html (habit ideas), library.html (resources).
     One implementation because both screens are the same object: a list of
     categories on the left, a grid of things on the right. The rail is a real
     WAI-ARIA tablist — roving tabindex, arrows, Home and End — because at 840+
     it looks and behaves exactly like one.
     ====================================================================== */

  function initBrowse(scope) {
    if (scope.__hcBrowse) return;
    scope.__hcBrowse = true;

    var list  = $('[data-cat-list]', scope);
    var grid  = $('[data-idea-grid]', scope);
    if (!list || !grid) return;

    var tabs    = $$('[data-cat]', list);
    var items   = $$(':scope > li', grid);
    var subs    = $$('[data-sub]', scope);
    var heading = $('[data-idea-heading]', scope);
    var count   = $('[data-idea-count]', scope);
    var empty   = $('[data-idea-empty]', scope);
    /* The search box sits in the page header, outside the browse layout. */
    var search  = $('[data-idea-search]');

    var state = { cat: 'all', subs: [], q: '' };

    function matches(li) {
      var el = li.firstElementChild || li;
      var cats = (el.getAttribute('data-cats') || '').split(/\s+/);
      var sub  = (el.getAttribute('data-sub') || '').split(/\s+/);

      if (state.cat !== 'all' && cats.indexOf(state.cat) === -1) return false;

      /* Subcategories are AND-ed: each chip you press narrows further. */
      for (var i = 0; i < state.subs.length; i++) {
        if (sub.indexOf(state.subs[i]) === -1) return false;
      }

      if (state.q) {
        if (li.textContent.toLowerCase().indexOf(state.q) === -1) return false;
      }
      return true;
    }

    function apply(announce) {
      var shown = 0;
      items.forEach(function (li) {
        var on = matches(li);
        li.hidden = !on;
        if (on) shown++;
      });
      if (count) count.textContent = String(shown);
      if (empty) empty.hidden = shown !== 0;
      if (announce) say(shown + (shown === 1 ? ' result' : ' results'));
    }

    function selectCat(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      state.cat = tab.getAttribute('data-cat');
      if (heading) heading.textContent = (tab.textContent || '').trim().replace(/\s+\d+$/, '');
      apply(true);
    }

    tabs.forEach(function (tab) {
      bind(tab, 'Cat', 'click', function () { selectCat(tab); });
      bind(tab, 'CatKey', 'keydown', function (e) {
        var i = tabs.indexOf(tab), next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        selectCat(next, true);
      });
    });

    subs.forEach(function (btn) {
      bind(btn, 'Sub', 'click', function () {
        var key = btn.getAttribute('data-sub');
        var on  = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', String(!on));
        state.subs = on
          ? state.subs.filter(function (k) { return k !== key; })
          : state.subs.concat([key]);
        apply(true);
      });
    });

    if (search) {
      bind(search, 'Search', 'input', function () {
        state.q = search.value.trim().toLowerCase();
        apply(false);
      });
    }
  }


  /* ==========================================================================
     2. THE HABIT-IDEA PREVIEW DIALOG
     In the shipping app tapping an idea jumps straight into Create Habit with
     six prefill query parameters and no chance to look first. Here the card
     opens a dialog that shows the whole idea — behaviour, prompt, celebration,
     why — and the habit card you would be getting.

     The dialog's open/close/Escape/focus-restore is the kit's existing
     [data-modal-open] opener; all this does is fill the slots first. The
     listener is registered in the CAPTURE phase so it runs before that opener,
     which binds in the bubble phase.
     ====================================================================== */

  function initIdeaPreview(ctx) {
    var modal = $('[data-modal="idea"]', ctx) || $('[data-modal="idea"]');
    if (!modal || modal.__hcIdea) return;
    modal.__hcIdea = true;

    document.addEventListener('click', function (e) {
      var card = e.target.closest && e.target.closest('[data-modal-open="idea"]');
      if (!card) return;

      var data = {
        behavior:    card.getAttribute('data-behavior') || '',
        prompt:      card.getAttribute('data-prompt') || '',
        celebration: card.getAttribute('data-celebration') || '',
        why:         card.getAttribute('data-why') || ''
      };
      var taken = card.getAttribute('data-taken') === 'true';

      $$('[data-idea-field]', modal).forEach(function (slot) {
        var key = slot.getAttribute('data-idea-field');
        if (key === 'prompt-meta') {
          slot.textContent = data.prompt + (taken ? ' · 112 day streak' : ' · new habit');
        } else if (data[key]) {
          slot.textContent = data[key];
        }
      });

      /* The preview card echoes the user's own words at commit, like every
         other habit card in the system. [D §2.2] */
      var preview = $('[data-habit="preview"]', modal);
      if (preview) preview.setAttribute('data-celebration', data.celebration);

      var make = $('[data-idea-make]', modal);
      var note = $('[data-idea-taken]', modal);
      if (make) make.hidden = taken;
      if (note) note.hidden = !taken;
    }, true);
  }


  /* ==========================================================================
     3. ONBOARDING PAGING
     Three slides, hardcoded. The shipping flow is a swipe-only PageView with
     no Next, no Back, no Skip and no way to jump — so it is unusable by
     keyboard and gives no affordance at all on slides 1 and 2. Here every step
     has a visible control, the dots are buttons you can jump with, and the
     arrow keys work.

     Only the active slide is in the DOM flow; the others carry `hidden`, so
     they are out of the tab order and out of the accessibility tree rather
     than merely off-screen.
     ====================================================================== */

  function initOnboarding(ctx) {
    var stage = $('[data-ob-stage]', ctx);
    if (!stage || stage.__hcOb) return;
    stage.__hcOb = true;

    var slides = $$('[data-ob-slide]', stage);
    var dots   = $$('[data-ob-go]');
    var prev   = $('[data-ob-prev]');
    var next   = $('[data-ob-next]');
    var done   = $('[data-ob-done]');
    if (!slides.length) return;

    var at = 1;

    function go(n, announce) {
      n = Math.min(Math.max(n, 1), slides.length);
      at = n;

      slides.forEach(function (s) {
        var on = Number(s.getAttribute('data-ob-slide')) === n;
        s.hidden = !on;
        s.classList.remove('is-entering');
        /* Under reduced motion the 8px rise is dropped entirely rather than
           run fast — the CSS branch does the same thing for the class-based
           path, and this keeps the two honest. [B §3.6] */
        if (on && !reduced()) {
          /* reflow so the animation restarts on every change */
          void s.offsetWidth;
          s.classList.add('is-entering');
        }
      });

      dots.forEach(function (d) {
        d.setAttribute('aria-current', String(Number(d.getAttribute('data-ob-go')) === n));
      });

      if (prev) prev.hidden = n === 1;
      if (next) next.hidden = n === slides.length;
      if (done) done.hidden = n !== slides.length;

      if (announce) {
        var title = $('.ob-slide__title', slides[n - 1]);
        say('Slide ' + n + ' of ' + slides.length + (title ? ': ' + title.textContent.trim() : ''));
      }
    }

    dots.forEach(function (d) {
      bind(d, 'ObGo', 'click', function () { go(Number(d.getAttribute('data-ob-go')), true); });
    });
    if (prev) bind(prev, 'ObPrev', 'click', function () { go(at - 1, true); });
    if (next) bind(next, 'ObNext', 'click', function () { go(at + 1, true); });

    bind(document, 'ObKeys', 'keydown', function (e) {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(at + 1, true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(at - 1, true); }
    });

    go(1, false);
  }


  /* ==========================================================================
     4. AUTH — three views, one shell
     Login, signup and password reset swap in place. No validation, no auth, no
     persistence: submitting signin or signup walks the happy path to
     onboarding (which is where the shipping app goes too — both auth buttons
     set showOnboard), and submitting the reset form shows the confirmation
     state the shipping screen never had.
     ====================================================================== */

  function initAuth(ctx) {
    var views = $$('[data-auth-view]', ctx);
    if (!views.length) return;
    var root = views[0].closest('.auth') || document;
    if (root.__hcAuth) return;
    root.__hcAuth = true;

    var TITLES = { signin: 'Sign in', signup: 'Create an account', reset: 'Reset your password' };

    function setView(name, moveFocus) {
      views.forEach(function (v) { v.hidden = v.getAttribute('data-auth-view') !== name; });
      $$('[data-auth-go]').forEach(function (b) {
        if (b.hasAttribute('aria-pressed')) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-auth-go') === name));
        }
      });
      document.title = TITLES[name] + ' · HabitCrafts';

      var view = views.filter(function (v) { return !v.hidden; })[0];
      var h1 = view && view.querySelector('h1');
      if (h1 && moveFocus) {
        h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
      }
      say(TITLES[name]);
    }

    $$('[data-auth-go]').forEach(function (btn) {
      bind(btn, 'AuthGo', 'click', function () {
        setView(btn.getAttribute('data-auth-go'), true);
      });
    });

    /* Password reveal. A real button with aria-pressed and a text label, not an
       unlabelled eye glyph. */
    $$('[data-pw-toggle]', root).forEach(function (btn) {
      bind(btn, 'PwToggle', 'click', function () {
        var input = document.getElementById(btn.getAttribute('data-pw-toggle'));
        if (!input) return;
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-pressed', String(show));
        btn.textContent = show ? 'Hide' : 'Show';
        say(show ? 'Password shown' : 'Password hidden');
      });
    });

    $$('[data-auth-form]', root).forEach(function (form) {
      bind(form, 'AuthSubmit', 'submit', function (e) {
        e.preventDefault();
        var kind = form.getAttribute('data-auth-form');
        if (kind === 'reset') {
          var sent = $('[data-auth-sent]', form.parentNode);
          if (sent) {
            sent.hidden = false;
            say('Reset link sent. Check your inbox.');
          }
          return;
        }
        window.location.href = 'onboarding.html';
      });
    });
  }


  /* ==========================================================================
     5. WIRING — runs after prototype.js has booted, and again on HC.init().
     ====================================================================== */

  function initExtra(ctx) {
    ctx = ctx || document;
    $$('.browse-layout', ctx).forEach(initBrowse);
    initIdeaPreview(ctx);
    initOnboarding(ctx);
    initAuth(ctx);
  }

  function attach() {
    if (window.HC && typeof window.HC.init === 'function' && !window.HC.__extraChained) {
      var kitInit = window.HC.init;
      window.HC.__extraChained = true;
      window.HC.init = function (root) { kitInit(root); initExtra(root); };
    }
    initExtra(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
