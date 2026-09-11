/* ============================================================================
   HabitCrafts — scripts/lib/browser.mjs
   DRIVE THE PROTOTYPE IN A REAL BROWSER. Shared by drive, nav and a11y.

   WHY THIS EXISTS AT ALL. Twice in this branch a screen rendered perfectly and
   was dead on click, and once a whole route rendered an empty <main> because a
   backtick closed a template literal. `node --check` passed all three. A DOM
   dump caught the third and neither of the first two. The only thing that
   catches a dead control is clicking it.

   NO DEPENDENCIES, same as the rest of the repo. Node ships a global WebSocket
   and Chrome ships the DevTools protocol, so the whole harness is this file.

   IT LAUNCHES AND CLEANS UP ITS OWN CHROME on an ephemeral debugging port with
   a throwaway profile. Earlier versions expected you to have started Chrome by
   hand with the right flags, which meant the suites only ran on the one machine
   where someone remembered the incantation.

   USAGE

       import { withBrowser } from './lib/browser.mjs';
       await withBrowser(async (b) => {
         await b.goto('#/learn');
         await b.check('the deck is offered', `${b.T}.includes("deck.pdf")`, true);
         await b.click('[data-next]');
       });

   The server is NOT started for you: it is long-running and you usually
   already have one. Point at it with --url or HC_URL, or start one with
   `node scripts/serve.js`.
   ========================================================================= */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

/* --------------------------------------------------------------------------
   FINDING CHROME
   Checked in order; the first that exists wins. CHROME overrides everything.
-------------------------------------------------------------------------- */
const CHROME_CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

function findChrome() {
  const hit = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (hit) return hit;
  throw new Error(
    'Chrome not found. Set CHROME=/path/to/chrome, or install Chrome.\n' +
    'Looked in:\n  ' + CHROME_CANDIDATES.join('\n  '));
}

/** `--url=...`, then HC_URL, then the serve.js default. */
export function baseUrl(argv = process.argv) {
  const flag = argv.find((a) => a.startsWith('--url='));
  return (flag ? flag.slice(6) : process.env.HC_URL) || 'http://localhost:5173';
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, { tries = 60, every = 250, what = 'condition' } = {}) {
  for (let i = 0; i < tries; i++) {
    try { const v = await fn(); if (v) return v; } catch (e) { /* not yet */ }
    await wait(every);
  }
  throw new Error(`Timed out waiting for ${what}`);
}

/* --------------------------------------------------------------------------
   THE SESSION
-------------------------------------------------------------------------- */

export async function withBrowser(fn, opts = {}) {
  const url = opts.url || baseUrl();
  const app = `${url}/app.html?solo=1`;

  /* Fail early and usefully rather than timing out inside the protocol. */
  await waitFor(async () => (await fetch(`${url}/app.html`)).ok, {
    tries: 8, what: `a server at ${url} (start one with: node scripts/serve.js)`,
  });

  const port = 9222 + Math.floor(Math.random() * 400);
  const profile = mkdtempSync(resolve(tmpdir(), 'hc-cdp-'));
  const chrome = spawn(findChrome(), [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    app + '#/learn',
  ], { stdio: 'ignore' });

  let ws;
  const state = { pass: 0, fail: 0, errors: [] };

  try {
    const target = await waitFor(async () => {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      return list.find((t) => t.type === 'page');
    }, { what: 'Chrome to expose a page target' });

    ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0;
    const pending = new Map();

    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
      if (m.method === 'Runtime.exceptionThrown') {
        state.errors.push(m.params.exceptionDetails.text + ' ' +
          (m.params.exceptionDetails.exception?.description || ''));
      }
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
        state.errors.push(m.params.args.map((a) => a.value || a.description).join(' '));
      }
    });
    await new Promise((r) => ws.addEventListener('open', r));

    const send = (method, params = {}) => new Promise((res) => {
      const mid = ++id; pending.set(mid, res);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

    await send('Runtime.enable');
    await send('Page.enable');

    const evaluate = async (expr) => {
      const r = await send('Runtime.evaluate',
        { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
      return r.result?.result?.value;
    };

    const b = {
      app,
      send,
      evaluate,
      wait,

      /** The rendered text of the current view. */
      T: 'document.querySelector("#main").innerText',

      /** Count matching nodes, JSON-escaped so quotes in selectors are safe. */
      count: (sel) => `document.querySelectorAll(${JSON.stringify(sel)}).length`,

      section(title) { console.log(`\n— ${title} —`); },

      async check(label, expr, want) {
        let got;
        try { got = await evaluate(expr); } catch (e) { got = 'THREW ' + e.message; }
        const ok = typeof want === 'function' ? want(got) : got === want;
        console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `  (got ${JSON.stringify(got)})`}`);
        ok ? state.pass++ : state.fail++;
        return ok;
      },

      async click(sel, settle = 700) {
        const hit = await evaluate(
          `(() => { const el = document.querySelector(${JSON.stringify(sel)});
            if (!el) return false; el.click(); return true; })()`);
        if (!hit) { console.log(`  FAIL missing control ${sel}`); state.fail++; }
        await wait(settle);
        return hit;
      },

      /**
       * A HARD reload, not a hash change. The views hold step and openLesson at
       * module scope, and navigating between two hashes of the same document
       * leaves that state intact - a "reset" that does not reset is how an
       * earlier auditor checked every screen against the wrong markup.
       */
      async goto(hash = '#/learn', steps = 0) {
        await evaluate(`try { sessionStorage.clear(); } catch (e) {} location.hash = '${hash}';`);
        await send('Page.reload', {});
        await wait(opts.bootMs || 1800);
        for (let i = 0; i < steps; i++) {
          await evaluate('document.querySelector("[data-next]")?.click()');
          await wait(550);
        }
      },

      /** Resize the viewport so the app's own breakpoints do the work. */
      async width(w, h = 900) {
        await send('Emulation.setDeviceMetricsOverride',
          { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
        await wait(450);
      },

      get errors() { return state.errors; },
    };

    await fn(b);
  } finally {
    try { ws?.close(); } catch (e) { /* already gone */ }
    chrome.kill();
    try { rmSync(profile, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }

  console.log(`\nconsole errors: ${state.errors.length}`);
  state.errors.slice(0, 5).forEach((e) => console.log('   ' + e));

  const bad = state.fail || state.errors.length;
  console.log(bad
    ? `\n${state.fail} of ${state.pass + state.fail} FAILED`
    : `\nall ${state.pass} checks passed`);
  process.exit(bad ? 1 : 0);
}
