// Test helpers: a static file server for the site, and a browser page set up like a phone
// (or a computer), with React/Babel served from node_modules instead of the CDN (same files,
// so the pages' integrity hashes still match), Google Fonts stubbed and the live-delays
// relay blocked, so the tests need no network.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// the site served: the repository as it is, or with SITE=dist the built site (npm run build)
const SITE = process.env.SITE ? path.resolve(ROOT, process.env.SITE) : ROOT;
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

export function startServer() {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(SITE, u.endsWith('/') ? u + 'index.html' : u);
    if (!f.startsWith(SITE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() })));
}

// PW_CHANNEL=chrome uses the installed Google Chrome (GitHub's Ubuntu runners have it),
// otherwise Playwright's own Chromium
export const launch = () => chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});

// A stand-in for Safari's visual viewport that a test can move like the on-screen keyboard
// does: kb(top, height) = the part of the page left visible.
const FAKE_KEYBOARD = () => {
  const fake = new EventTarget();
  Object.assign(fake, { offsetTop: 0, offsetLeft: 0, height: innerHeight, width: innerWidth, scale: 1 });
  Object.defineProperty(window, 'visualViewport', { get: () => fake, configurable: true });
  window.__kb = (top, h) => { fake.offsetTop = top; fake.height = h; fake.dispatchEvent(new Event('resize')); };
};

// The service worker (offline, sw.js) is off unless a test asks for it (`offline: true`), so the
// other tests always load the files as they are.
export async function openApp(browser, base, { lang = 'en', phone = true, keyboard = false, landscape = false, offline = false } = {}) {
  const serviceWorkers = offline ? 'allow' : 'block';
  const ctx = await browser.newContext(phone
    ? { ...devices[landscape ? 'iPhone 13 landscape' : 'iPhone 13'], timezoneId: 'Asia/Jerusalem', serviceWorkers }
    : { viewport: { width: 1280, height: 860 }, timezoneId: 'Asia/Jerusalem', serviceWorkers });
  await ctx.route('https://unpkg.com/**', (r) => {
    const m = new URL(r.request().url()).pathname.match(/^\/(@?[^@]+)@[^/]+\/(.*)$/);
    r.fulfill({ path: path.join(ROOT, 'node_modules', m[1], m[2]), contentType: 'application/javascript' });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  await ctx.route(/workers\.dev/, r => r.abort());
  await ctx.addInitScript((lang) => { try { localStorage.setItem('mesila.lang', lang); } catch (e) {} }, lang);
  if (keyboard) await ctx.addInitScript(FAKE_KEYBOARD);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base);
  await page.waitForSelector('[data-sheet]', { timeout: 30000 });
  await page.waitForSelector('#loader', { state: 'detached', timeout: 10000 });
  const cdp = phone ? await ctx.newCDPSession(page) : null;
  const app = {
    page, ctx, errors,
    close: () => ctx.close(),
    wait: (ms) => page.waitForTimeout(ms),
    panel: () => page.locator('[data-sheet]').boundingBox(),
    panelTop: async () => Math.round((await app.panel()).y),
    input: (which) => page.locator(`[data-station-input="${which}"]`),
    focused: () => page.evaluate(() => { const a = document.activeElement; return a && a.dataset ? a.dataset.stationInput || null : null; }),
    blur: () => page.evaluate(() => document.activeElement && document.activeElement.blur()),
    handle: () => page.locator('[data-handle]'),
    mapTop: () => page.evaluate(() => Math.round(document.querySelector('[data-screen-label="Mesila Map"] svg').getBoundingClientRect().top)),
    // type into a station field and pick the first suggestion for `pick` (a station id)
    async choose(which, text, pick) {
      await app.input(which).tap();
      await page.keyboard.type(text);
      await page.locator(`[data-suggestion="${pick}"]`).dispatchEvent('mousedown');
      await app.blur();
      await app.wait(700);
    },
    // a finger drag starting `from` px below the panel's top edge, `dist` px (negative = up)
    async drag(dist, { from = 6, steps = 8, pause = 30 } = {}) {
      const y0 = (await app.panelTop()) + from, x = 195;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
      for (let k = 1; k <= steps; k++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + dist * k / steps }] });
        await page.waitForTimeout(pause);
      }
      await page.waitForTimeout(150);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(500);
    },
    // a quick flick: no pause before lifting the finger
    async flick(dist, { from = 6 } = {}) {
      const y0 = (await app.panelTop()) + from, x = 195;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
      for (let k = 1; k <= 4; k++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + dist * k / 4 }] });
        await page.waitForTimeout(12);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(500);
    },
  };
  return app;
}
