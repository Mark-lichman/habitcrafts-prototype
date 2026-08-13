/* ============================================================================
   HabitCrafts — views/auth.js
   THE LOGGED-OUT DOOR. Sign in, sign up and forgot password in ONE shell.

   `meta.chrome = false` is the whole reason this screen has no nav: app.js
   reads it, sets `data-chrome="none"` on the shell and hides the nav root, so
   the bottom bar, the rail and the shell's insets all go at once. There is
   nothing to navigate to yet, so there is no navigation. [B §6.3]

   ------------------------------------------------------------------------
   WHO OWNS WHAT
   ------------------------------------------------------------------------
   prototype.js already owns the view switch and the password reveal:

     [data-auth-view="signin|signup|reset"]   the three panels
     [data-auth-go="…"]                       any control that swaps to one
     [data-pw-toggle="<input id>"]            the reveal button

   Those are its hooks and this view does not write a second handler for them —
   it just authors the markup they key off. What this view DOES own is submit,
   under its own `[data-auth-submit]` attribute rather than prototype.js's
   `[data-auth-form]`: that handler ends in `window.location.href =
   'onboarding.html'`, which was right for ten static files and would walk
   straight out of the single-page app. One attribute, one owner, no drift.

   ------------------------------------------------------------------------
   SCOPE — stated, not implied
   ------------------------------------------------------------------------
   No validation, no error states, no auth, no network. This screen exists to
   settle the visual language of a logged-out surface. Sign in walks to #/home;
   sign up walks to #/onboarding (a new account is the one that needs the
   welcome tour); reset shows the confirmation the shipping screen never had.
   ========================================================================= */

import * as router from '../router.js';
import { html, icon, on } from '../ui.js';

export const meta = {
  title: 'Sign in',
  nav: null,      /* nothing in the nav lights up — there is no nav */
  level: 0,       /* a destination, not a push → fade-through */
  chrome: false,  /* logged out: no nav, no shell insets */
};

/* --------------------------------------------------------------------------
   PIECES
-------------------------------------------------------------------------- */

/** A password field with its reveal control. The button is a real button with
    a text label and `aria-pressed`, not an unlabelled eye glyph; prototype.js
    swaps the label and the input type. */
function passwordField(id, label, { autocomplete, placeholder, describedBy }) {
  return html`
    <p class="field field--reveal">
      <label class="field__label" for="${id}">${label}</label>
      <input class="input" id="${id}" name="${id}" type="password"
             autocomplete="${autocomplete}" placeholder="${placeholder}"
             ${describedBy ? html`aria-describedby="${describedBy}"` : ''}>
      <button class="pw-toggle" type="button" data-pw-toggle="${id}" aria-pressed="false">Show</button>
    </p>`;
}

/** The two third-party buttons. The shipping signup renders these icon-only
    with `text: ''`, so they reach the accessibility tree with no name at all.
    Labelled here, and the wordmarks come from the sprite. */
function socialButtons(verb) {
  return html`
    <div class="auth__actions" style="margin-block-start:0">
      <button class="btn btn--secondary btn--block" type="button">
        ${icon('google', 'icon--sm')} ${verb} with Google
      </button>
      <button class="btn btn--secondary btn--block" type="button">
        ${icon('apple', 'icon--sm')} ${verb} with Apple
      </button>
    </div>`;
}

/* --------------------------------------------------------------------------
   THE THREE VIEWS
   Exactly one is visible; the other two carry `hidden`, so they are out of the
   tab order and out of the accessibility tree rather than merely off-screen.
-------------------------------------------------------------------------- */

function signIn() {
  return html`
    <div class="auth__form" data-auth-view="signin">
      <h1 class="auth__title t-h1">Login</h1>
      <p class="auth__intro t-body">Good to see you again.</p>

      <form data-auth-submit="signin" novalidate>
        <div class="auth__fields">
          <p class="field">
            <label class="field__label" for="signin-email">Email</label>
            <input class="input" id="signin-email" name="signin-email" type="email"
                   autocomplete="email" placeholder="you@example.com">
          </p>
          ${passwordField('signin-password', 'Password', {
            autocomplete: 'current-password', placeholder: 'Your password',
          })}
        </div>

        <div class="auth__row" style="margin-block-start:var(--space-12)">
          <label class="check">
            <input type="checkbox" name="remember" checked>
            <span class="t-body-sm">Keep me signed in</span>
          </label>
          <!-- The link the shipping login screen does not have, which is the
               reason forgot_password is unreachable in the app. -->
          <button class="text-link" type="button" data-auth-go="reset">Forgot password?</button>
        </div>

        <div class="auth__actions">
          <button class="btn btn--primary btn--block" type="submit">Login</button>
        </div>
      </form>

      <p class="t-body-sm t-muted" style="text-align:center;margin-block:var(--space-24) var(--space-12)">or</p>
      ${socialButtons('Login')}

      <p class="auth__switch t-body">
        New here?
        <button class="text-link" type="button" data-auth-go="signup">Create an account</button>
      </p>
    </div>`;
}

function signUp() {
  return html`
    <div class="auth__form" data-auth-view="signup" hidden>
      <h1 class="auth__title t-h1">Sign Up</h1>
      <p class="auth__intro t-body">It takes about a minute, and the first habit is the easy one.</p>

      <form data-auth-submit="signup" novalidate>
        <div class="auth__fields">
          <p class="field">
            <label class="field__label" for="signup-name">Name</label>
            <input class="input" id="signup-name" name="signup-name" type="text"
                   autocomplete="name" placeholder="What should we call you?">
          </p>
          <p class="field">
            <label class="field__label" for="signup-email">Email</label>
            <input class="input" id="signup-email" name="signup-email" type="email"
                   autocomplete="email" placeholder="you@example.com">
          </p>
          ${passwordField('signup-password', 'Password', {
            autocomplete: 'new-password',
            placeholder: 'At least 8 characters',
            describedBy: 'signup-password-help',
          })}
          <!-- The shipping signup enforces no length rule while login requires
               eight, so you can create an account the login screen rejects.
               Nothing is validated here either — but the rule is at least
               stated at the point of choosing. -->
          <span class="field__help" id="signup-password-help">At least 8 characters. Longer beats cleverer.</span>

          ${passwordField('signup-confirm', 'Confirm password', {
            autocomplete: 'new-password', placeholder: 'Type it once more',
          })}
        </div>

        <!-- The app carries eulaAccepted in its state and never asks. -->
        <label class="check" style="margin-block-start:var(--space-16)">
          <input type="checkbox" name="terms">
          <span class="t-body-sm">
            I agree to the <a class="text-link" href="https://www.habitcrafts.com/eula">Terms of Service</a>
            and the <a class="text-link" href="https://www.habitcrafts.com/privacy">Privacy Policy</a>.
          </span>
        </label>

        <div class="auth__actions">
          <button class="btn btn--primary btn--block" type="submit">Sign Up</button>
        </div>
      </form>

      <p class="t-body-sm t-muted" style="text-align:center;margin-block:var(--space-24) var(--space-12)">Sign up with</p>
      ${socialButtons('Sign up')}

      <p class="auth__switch t-body">
        Already have an account?
        <button class="text-link" type="button" data-auth-go="signin">Log in</button>
      </p>
    </div>`;
}

/* The shipping body promises "a verification code" while its own button says
   "Send Reset Link" and the backend sends a link. The button was the true one,
   so the body is written to match it. [README §7, rewrite 2] It also has no
   success state at all — tap it and nothing visibly changes — so one is built
   here as a `role="status"` panel. */
function reset() {
  return html`
    <div class="auth__form" data-auth-view="reset" hidden>
      <button class="page-back" type="button" data-auth-go="signin">
        ${icon('arrow-back', 'icon--sm')} Back to login
      </button>

      <h1 class="auth__title t-h1" style="margin-block-start:var(--space-12)">Forgot Password</h1>
      <p class="auth__intro t-body">
        Enter the email associated with your account and we'll send you a link
        to set a new password.
      </p>

      <form data-auth-submit="reset" novalidate>
        <div class="auth__fields">
          <p class="field">
            <label class="field__label" for="reset-email">Email</label>
            <input class="input" id="reset-email" name="reset-email" type="email"
                   autocomplete="email" placeholder="you@example.com">
          </p>
        </div>
        <div class="auth__actions">
          <button class="btn btn--primary btn--block" type="submit">Send Reset Link</button>
        </div>
      </form>

      <div class="card card--tinted" data-reset-sent role="status" hidden
           style="margin-block-start:var(--space-24)">
        <p class="u-flow-tight">
          <span class="chip chip--sage">${icon('check')}Sent</span>
        </p>
        <p class="t-body" style="margin-block-start:var(--space-8)">
          Check your inbox. The link works for one hour — if it expires, come
          back and ask for another one.
        </p>
      </div>

      <p class="auth__switch t-body">
        Remembered it?
        <button class="text-link" type="button" data-auth-go="signin">Log in</button>
      </p>
    </div>`;
}

/* --------------------------------------------------------------------------
   RENDER
   <840 : the poster is a short brand banner above the form.
   ≥840 : the same element becomes a full-height panel beside it.
   It is ONE node at both widths, not two copies of a lockup — which is also
   why the splash screen is folded in rather than kept as an extra tap.
-------------------------------------------------------------------------- */

export function render() {
  return String(html`
    <div class="auth">

      <!-- This screen's ONE --c-hero-fill surface. The grain comes from the
           .hero class, which this element also carries. [D §2.5]
           (No backticks in a comment inside a template literal — they close
           it. That is a real 20-minute bug, not a style note.) -->
      <section class="hero auth__poster" aria-label="HabitCrafts">
        <div class="auth__art" aria-hidden="true">
          <!-- The two-colour rule, inverted for the hero ground: the shapes
               are hero-ink-muted and the linework hero-ink, because brand-700
               linework on a brand-700 fill is not linework. One gold accent.
               [D §6] -->
          <svg viewBox="0 0 220 200" focusable="false">
            <ellipse cx="110" cy="176" rx="78" ry="12" fill="var(--c-hero-ink-muted)" opacity=".28"/>
            <path d="M72 176c0-21 17-38 38-38s38 17 38 38z" fill="var(--c-hero-ink-muted)"
                  opacity=".55" stroke="var(--c-hero-ink)" stroke-width="2.5"/>
            <path d="M110 138V80" stroke="var(--c-hero-ink)" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M110 112c-24 0-38-13-40-34 22-3 40 9 40 34z" fill="var(--c-hero-ink-muted)"
                  opacity=".55" stroke="var(--c-hero-ink)" stroke-width="2.5"/>
            <path d="M110 96c21-2 34-14 36-32-21-2-36 8-36 32z" fill="var(--c-hero-ink-muted)"
                  opacity=".8" stroke="var(--c-hero-ink)" stroke-width="2.5"/>
            <circle cx="110" cy="74" r="6" fill="var(--c-gold-500)"/>
          </svg>
        </div>

        <p class="auth__brand">
          <img src="assets/images/Habit_Craft_Logo_File-09.png" alt="">
          <span>HabitCrafts</span>
        </p>
        <p class="auth__line">Small enough to do on your worst day.</p>
        <p class="auth__sub t-body">
          One behaviour, one prompt, one way to celebrate. Keep it small, you
          can always do more.
        </p>
      </section>

      <div class="auth__panel">
        ${signIn()}
        ${signUp()}
        ${reset()}

        <p class="auth__legal t-body-sm">
          Prototype only — no account is created and nothing is sent. There is
          no validation, no auth and no persistence behind these forms.
        </p>
      </div>
    </div>`);
}

/* --------------------------------------------------------------------------
   MOUNT
   Submit only. The view switch, the focus move and the password reveal are
   prototype.js's, and are already wired by the time this runs.
-------------------------------------------------------------------------- */

export function mount(root) {
  on(root, 'submit', '[data-auth-submit]', (e, form) => {
    e.preventDefault();  /* no backend, and never a page load out of the SPA */
    const kind = form.getAttribute('data-auth-submit');

    if (kind === 'reset') {
      const sent = form.parentNode.querySelector('[data-reset-sent]');
      if (sent) sent.hidden = false;
      if (window.HC) window.HC.announce('Reset link sent. Check your inbox.');
      return;
    }

    /* Signing in returns you to the app; signing up earns the welcome tour. */
    router.go(kind === 'signup' ? '/onboarding' : '/home');
  });

  /* Nothing here outlives the view — every listener is on `root`, which the
     router removes whole — so there is no destroy() to return. */
}
