/* ============================================================================
   HabitCrafts — scripts/pwa.mjs
   IS IT ACTUALLY INSTALLABLE?              node scripts/pwa.mjs

   Everything a phone checks before it will build a WebAPK, checked here so the
   answer is not "install it and see". The failure mode this guards is the
   quietest one in the whole app: Chrome does not explain why it offered "Add to
   Home screen" instead of "Install". It just offers the lesser thing, and you
   get a bookmark in a browser session with no offline and no standalone window,
   which looks close enough to working that it can go unnoticed for weeks.

   IT ALSO CHECKS THE WORKER IS *NOT* REGISTERED IN THE PROTOTYPE, which matters
   more than it sounds: a service worker running under the other suites would
   serve them a cached app, and a stale cache is the most confusing failure a
   test can have — the code is right, the assertion is right, and the browser is
   running last week's build.
   ========================================================================= */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowser } from './lib/browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = resolve(root, 'prototype');
const swManifest = readFileSync(resolve(app, 'sw-manifest.js'), 'utf8');
const PRECACHE = JSON.parse(swManifest.match(/PRECACHE = (\[[\s\S]*?\]);/)[1]);

/* Two modes, because they need different browsers. The static checks run in
   the prototype configuration (no worker, so they can read the files the worker
   WOULD cache). `--installed` runs the shipping configuration and proves the
   worker takes over and the app opens with the network switched off, which is
   the only claim that actually matters on a train. */
const installed = process.argv.includes('--installed');

if (installed) await withBrowser(async (b) => {
  b.section('the worker, in the configuration that ships');

  await b.goto('#/today');
  /* Registration is deferred to `load` and installation is async: wait for the
     worker to control the page rather than sleeping and hoping. */
  const ready = await b.evaluate(`(async () => {
    const r = await navigator.serviceWorker.ready;
    return !!(r && r.active);
  })()`);
  await b.check('a service worker activates', `${JSON.stringify(ready)}`, true);
  await b.check('and it controls the page',
    '(async () => { await navigator.serviceWorker.ready; return !!navigator.serviceWorker.controller; })()',
    true);

  const cached = await b.evaluate(`(async () => {
    const keys = await caches.keys();
    const mine = keys.filter((k) => k.startsWith('habitcrafts-ja-'));
    if (!mine.length) return 0;
    return (await (await caches.open(mine[0])).keys()).length;
  })()`);
  await b.check(`the cache is populated (${cached} entries)`, `${cached} > 30`, true);

  b.section('with the network switched off');

  /* The real test. Not "is there a cache" but "does it open".
     Network.emulateNetworkConditions is what the browser itself uses for the
     offline toggle in devtools, so this is the same switch a person flips. */
  await b.send('Network.enable');
  await b.send('Network.emulateNetworkConditions', {
    offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0,
  });

  await b.send('Page.reload', {});
  await b.wait(2500);

  await b.check('the app still boots', `${b.T}.length > 40`, true);
  await b.check('and it is Today that comes up',
    'document.querySelector("#main h1")?.innerText', 'Today');
  await b.check('a card is offered', b.count('[data-show]'), 1);

  await b.click('[data-show]');
  await b.check('the answer still reveals offline', b.count('[data-grade]'), 2);
  await b.click('[data-grade]');
  await b.check('and the review is recorded offline',
    'window.HCApp.store.reviewsByCard().size > 0', true);

  await b.send('Network.emulateNetworkConditions', {
    offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
  });
  await b.evaluate('window.HCApp.store.resetAll()');
}, { query: 'solo=1&x=japanese', bootMs: 2500 });

else await withBrowser(async (b) => {
  b.section('the manifest, as Chrome reads it');

  /* Fetched through the page rather than read off disk, because a manifest the
     server will not serve is a manifest that does not exist. */
  const served = await b.evaluate(`(async () => {
    const r = await fetch('manifest.webmanifest');
    return r.ok ? await r.json() : null;
  })()`);
  await b.check('the server serves it', `(${JSON.stringify(served)}) !== null`, true);

  await b.check('display is standalone', `${JSON.stringify(served.display)}`, 'standalone');
  await b.check('it has a name and a short_name',
    `${JSON.stringify(!!(served.name && served.short_name))}`, true);

  /* Chrome needs a 192 AND a 512 to build a WebAPK. Anything less and the
     install prompt silently degrades to a shortcut. */
  const sizes = served.icons.map((i) => i.sizes);
  await b.check('there is a 192 icon', `${JSON.stringify(sizes.includes('192x192'))}`, true);
  await b.check('there is a 512 icon', `${JSON.stringify(sizes.includes('512x512'))}`, true);
  await b.check('and a maskable one, so Android does not crop the mark',
    `${JSON.stringify(served.icons.some((i) => (i.purpose || '').includes('maskable')))}`, true);

  /* Every icon has to actually be there at the size it claims. A 404 here is
     invisible until install time. */
  const iconResults = await b.evaluate(`(async () => {
    const out = [];
    for (const i of ${JSON.stringify(served.icons)}) {
      try {
        const r = await fetch(i.src);
        if (!r.ok) { out.push(i.src + ' -> ' + r.status); continue; }
        const bmp = await createImageBitmap(await r.blob());
        const want = i.sizes.split('x').map(Number);
        if (bmp.width !== want[0] || bmp.height !== want[1]) {
          out.push(i.src + ' is ' + bmp.width + 'x' + bmp.height + ', claims ' + i.sizes);
        }
      } catch (e) { out.push(i.src + ' -> ' + e.message); }
    }
    return out;
  })()`);
  await b.check('every icon exists at the size it claims', 'true',
    () => { if (iconResults.length) console.log(`        ${iconResults.join(' | ')}`); return !iconResults.length; });

  b.section('the start url actually starts the app');

  /* The one that would be caught last and hurt most: a start_url that 404s, or
     that opens the harness instead of the app, means the installed icon opens
     a broken screen. */
  const start = served.start_url;
  await b.check('start_url is reachable',
    `(async () => (await fetch(${JSON.stringify(start.split('#')[0])})).ok)()`, true);
  await b.check('start_url opens the app, not the reviewer harness',
    `${JSON.stringify(start.startsWith('app.html'))}`, true);
  await b.check('start_url selects the shipping configuration',
    `${JSON.stringify(start.includes('x=japanese'))}`, true);
  await b.check('start_url lands on Today',
    `${JSON.stringify(start.includes('#/today'))}`, true);

  b.section('the precache list covers what the app runs on');

  /* Every precached URL must exist. One 404 costs that file, by design in
     sw.js, but a 404 in the list means something moved and nobody noticed. */
  const missing = await b.evaluate(`(async () => {
    const out = [];
    for (const u of ${JSON.stringify(PRECACHE)}) {
      try { const r = await fetch(u, { method: 'GET' }); if (!r.ok) out.push(u + ' -> ' + r.status); }
      catch (e) { out.push(u + ' -> ' + e.message); }
    }
    return out;
  })()`);
  await b.check(`all ${PRECACHE.length} precached files exist`, 'true',
    () => { if (missing.length) console.log(`        ${missing.slice(0, 6).join(' | ')}`); return !missing.length; });

  await b.check('the app shell is in the list, or nothing works offline',
    `${JSON.stringify(PRECACHE.includes('app.html'))}`, true);
  await b.check('every view is in it, so no route needs signal',
    `${JSON.stringify(PRECACHE.filter((f) => f.includes('/views/')).length >= 19)}`, true);
  await b.check('the corpora are in it, since they are the content',
    `${JSON.stringify(PRECACHE.some((f) => f.includes('corpus/')))}`, true);

  b.section('the worker stays out of the prototype');
  await b.check('no service worker registered without x=japanese',
    '(async () => (await navigator.serviceWorker.getRegistrations()).length)()', 0);
}, { query: 'solo=1&demo=1' });
