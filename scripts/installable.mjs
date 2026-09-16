import { withBrowser } from './lib/browser.mjs';
await withBrowser(async (b) => {
  b.section('what Chrome itself decides');
  /* beforeinstallprompt is the event Chrome fires only when a page meets the
     full installability bar: manifest, icons, start_url in scope, HTTPS or
     localhost, and a service worker with a fetch handler. It is the same check
     Android runs before offering "Install" rather than "Add to Home screen". */
  const verdict = await b.evaluate(`(async () => {
    return await new Promise((resolve) => {
      let fired = false;
      window.addEventListener('beforeinstallprompt', (e) => { fired = true; resolve('INSTALLABLE'); });
      setTimeout(() => resolve(fired ? 'INSTALLABLE' : 'not offered'), 6000);
    });
  })()`);
  console.log('   beforeinstallprompt:', verdict);
  await b.check('Chrome considers it installable', `${JSON.stringify(verdict)}`, 'INSTALLABLE');
}, { query: 'solo=1&x=japanese', bootMs: 3000 });
