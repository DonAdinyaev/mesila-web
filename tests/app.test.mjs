// Browser tests for the trip panel and the iPhone-specific behaviour.
// Run: npm test (needs `npm install` once; Playwright's Chromium).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.close(); });

const FULL_TOP = 60;                  // the panel's top edge at 'full' (no safe area in the emulator)
const isCover = async (app) => { const r = await app.panel(); const H = await app.page.evaluate(() => document.documentElement.clientHeight);
  return near(r.y, 0) && near(r.x, 0) && near(r.height, H); };   // typing: the whole screen
const near = (a, b, tol = 3) => Math.abs(a - b) <= tol;

// a phone with Netanya -> Tel Aviv Savidor planned (there are trains in any 30-hour window)
async function withRoute(opts) {
  const app = await openApp(browser, server.url, opts);
  await app.choose('from', 'Netan', 'netanya');
  await app.choose('to', 'Savid', 'savidor');
  return app;
}

test('loads on a phone and a computer, in English and Hebrew, without errors', async () => {
  for (const opts of [{}, { lang: 'he' }, { phone: false }, { phone: false, lang: 'he' }]) {
    const app = await openApp(browser, server.url, opts);
    assert.equal(await app.page.locator('[data-locate]').count(), 1, 'location button');
    assert.deepEqual(app.errors, [], JSON.stringify(opts));
    await app.close();
  }
});

test('panel positions: card, half, full; drags and handle taps (the browser scrolls and snaps)', async () => {
  const app = await withRoute();
  const card = await app.panelTop();
  await app.drag(-240); const half = await app.panelTop();
  assert.ok(half < card - 100 && half > FULL_TOP + 100, `half ${half} between full and card ${card}`);
  await app.drag(-240);
  assert.ok(near(await app.panelTop(), FULL_TOP), 'drag up again reaches full');
  await app.drag(60);
  assert.ok(near(await app.panelTop(), FULL_TOP), 'a short drag down springs back to full');
  await app.drag(200);
  assert.ok(near(await app.panelTop(), half), 'drag down: full -> half');
  await app.drag(200);
  assert.ok(near(await app.panelTop(), card), 'drag down: half -> card');
  await app.drag(150);
  assert.ok(near(await app.panelTop(), card), 'the card is the lowest');
  for (const [want, label] of [[half, 'card -> half'], [FULL_TOP, 'half -> full'], [card, 'full -> card']]) {
    await app.handle().click(); await app.wait(700);
    assert.ok(near(await app.panelTop(), want), 'tap handle: ' + label);
  }
  // the panel never changes size: only the layer under it scrolls
  const h = (await app.panel()).height;
  await app.handle().click(); await app.wait(700);
  assert.equal((await app.panel()).height, h, 'same height at every position');
  assert.deepEqual(app.errors, []);
  await app.close();
});
test('no route yet: opening the panel starts typing (full screen); closing the keyboard returns to the card', async () => {
  const app = await openApp(browser, server.url);
  const card = await app.panelTop();
  await app.drag(-500); await app.wait(500);
  assert.equal(await app.focused(), 'from', 'dragging up starts typing in From');
  assert.ok(await isCover(app), 'typing: the whole screen');
  await app.blur(); await app.wait(500);
  assert.ok(near(await app.panelTop(), card), 'keyboard closed: back to the card');
  await app.choose('from', 'Netan', 'netanya');
  await app.handle().click(); await app.wait(500);
  assert.equal(await app.focused(), 'to', 'with From chosen, opening starts typing in To');
  await app.blur(); await app.wait(500);
  assert.deepEqual(app.errors, []);
  await app.close();
});

test('choosing both stations shows the trip card; editing a station opens full, closing returns to the card', async () => {
  const app = await withRoute();
  const card = await app.panelTop();
  assert.ok(card > 400, 'the trip card, folded');
  await app.handle().click(); await app.handle().click(); await app.wait(500);       // up to full, where the fields show
  const cardAtFull = await app.page.locator('[data-trip-card]').boundingBox();
  await app.input('to').tap(); await app.wait(500);
  assert.ok(await isCover(app), 'typing with a route: the whole screen');
  // the trip card is still there, whole, at the top
  const cardTyping = await app.page.locator('[data-trip-card]').boundingBox();
  assert.ok(near(cardTyping.height, cardAtFull.height) && cardTyping.y < cardAtFull.y, 'trip card shown while typing');
  assert.equal(await app.page.locator('[data-trip-card]').evaluate(el => getComputedStyle(el).opacity), '1');
  await app.blur(); await app.wait(600);
  assert.ok(near(await app.panelTop(), card), 'keyboard closed: the card');
  assert.deepEqual(app.errors, []);
  await app.close();
});

test('typing (iPhone): the panel covers the screen, the map does not move, all is restored after', async () => {
  const app = await openApp(browser, server.url);
  const { page } = app;
  const card = await app.panelTop();
  const map0 = await app.mapTop(), scroll0 = await page.evaluate(() => scrollY);
  await app.input('from').tap(); await app.wait(700);
  assert.ok(await isCover(app), 'typing: the whole screen');
  // the page is pinned while typing (nothing can scroll it, not even a scroll still gliding)
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).position), 'fixed', 'the page is pinned while typing');
  await page.mouse.move(195, 30); await page.mouse.wheel(0, 400);   // trying to scroll the map
  await app.wait(300);
  assert.equal(await app.mapTop(), map0, 'the map stays put while typing');
  await page.keyboard.type('Netan');
  await page.locator('[data-suggestion="netanya"]').dispatchEvent('mousedown');
  await app.blur(); await app.wait(900);
  assert.ok(near(await app.panelTop(), card), 'back to the card');
  assert.equal(await app.mapTop(), map0, 'the map is where it was');
  assert.equal(await page.evaluate(() => scrollY), scroll0, 'page scroll restored');
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('page-held')), false, 'scroll lock released');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).position), 'static', 'the page is a normal page again');
  assert.deepEqual(app.errors, []);
  await app.close();
});

test('swipes on the panel never scroll the page (the map)', async () => {
  const app = await withRoute();
  await app.handle().click(); await app.handle().click(); await app.wait(500);   // full
  const before = await app.page.evaluate(() => scrollY);
  for (let k = 0; k < 3; k++) await app.drag(-250, { from: 300, steps: 10, pause: 16 });
  assert.equal(await app.page.evaluate(() => scrollY), before);
  await app.close();
});

test('station suggestions: a short list that scrolls', async () => {
  const app = await openApp(browser, server.url);
  await app.input('from').tap(); await app.page.keyboard.type('a'); await app.wait(400);
  const [h, sh] = await app.page.locator('[data-suggestions]').evaluate(el => [el.clientHeight, el.scrollHeight]);
  assert.ok(h <= 200, `list height ${h}`);
  assert.ok(sh > h + 100, 'more matches than fit: it scrolls');
  await app.close();
});

test('picking the second station closes the keyboard and the map shows the route', async () => {
  const app = await openApp(browser, server.url, { keyboard: true });
  const { page } = app;
  // a trip far from where the map opens (Tel Aviv), so the map has to move to show it
  for (const [which, text, id] of [['from', 'Nahar', 'nahariya'], ['to', 'Akk', 'akko']]) {
    await app.input(which).tap();
    await page.evaluate(() => window.__kb(200, 330));
    await page.keyboard.type(text);
    await page.locator(`[data-suggestion="${id}"]`).dispatchEvent('mousedown');
    await app.wait(400);
  }
  assert.equal(await app.focused(), null, 'no station field focused: the keyboard closes');
  await page.evaluate(() => window.__kb(0, innerHeight));     // the keyboard goes away
  await app.wait(1500);
  const panelTop = await app.panelTop();
  const inView = await page.evaluate((panelTop) => ['Nahariya', 'Akko'].map(n => {
    const t = [...document.querySelectorAll('svg text')].find(x => x.textContent === n);
    const r = t.getBoundingClientRect(); return r.top >= 0 && r.bottom <= panelTop;
  }), panelTop);
  assert.deepEqual(inView, [true, true], 'both stations on screen, above the panel');
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('page-held')), false, 'page free again');
  assert.deepEqual(app.errors, []);
  await app.close();
});

test('tapping a field or pulling the panel opens the keyboard on a hidden field at the top first, then moves to the real one', async () => {
  const app = await openApp(browser, server.url);
  const { page } = app;
  const cdp = await app.ctx.newCDPSession(page);
  const card = await app.panelTop();
  const r = await app.input('from').boundingBox();
  const x = r.x + 40, y = r.y + r.height / 2;
  // the first thing focused is a field at the top of the screen (Safari has nothing to slide)
  await page.evaluate(() => { window.__firstFocus = null;
    document.addEventListener('focusin', e => { if (window.__firstFocus === null) window.__firstFocus = e.target.getBoundingClientRect().top; }); });
  // a scroll that starts on a field: nothing happens
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 60 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await app.wait(500);
  assert.equal(await app.focused(), null, 'a scroll does not start typing');
  assert.ok(near(await app.panelTop(), card), 'still the card');
  // a tap: the panel rises and stays up, and the real field ends up focused
  await app.input('from').tap(); await app.wait(900);
  assert.equal(await page.evaluate(() => window.__firstFocus), 0, 'first focus at the top of the screen');
  assert.equal(await app.focused(), 'from');
  assert.ok(await app.panelTop() < card - 100, 'up while typing');
  // closing the keyboard: back to the card
  await page.evaluate(() => document.activeElement.blur()); await app.wait(900);
  assert.ok(near(await app.panelTop(), card), 'back to the card');
  // pulling the handle: the same way in
  await page.evaluate(() => { window.__firstFocus = null; });
  await page.locator('[data-handle]').tap(); await app.wait(900);
  assert.equal(await page.evaluate(() => window.__firstFocus), 0, 'first focus at the top of the screen');
  assert.equal(await app.focused(), 'from');
  assert.deepEqual(app.errors, []);
  await app.close();
});

test('typing full screen: dragging the panel down closes the keyboard and returns to the card', async () => {
  const app = await withRoute();
  const { page } = app;
  const card = await app.panelTop();
  const cdp = await app.ctx.newCDPSession(page);
  await app.input('to').tap(); await app.wait(600);
  assert.ok(await isCover(app), 'full screen');
  // a short drag down springs back
  const x = 195, y0 = 20;
  const drag = async (d) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
    for (let k = 1; k <= 6; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + d * k / 6 }] }); await app.wait(20); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await app.wait(800);
  };
  await drag(40);
  assert.equal(await app.focused(), 'to', 'a short drag: still typing');
  assert.ok(await isCover(app), 'still full screen');
  await drag(200);
  assert.equal(await app.focused(), null, 'a long drag: the keyboard closes');
  assert.ok(near(await app.panelTop(), card), 'back to the card');
  assert.equal(await page.locator('[data-sheet]').evaluate(el => getComputedStyle(el).position), 'static', 'back in its layer');
  assert.deepEqual(app.errors, []);
  await app.close();
});

test('typing full screen: finger drags never scroll the page (only lists inside the panel)', async () => {
  const app = await openApp(browser, server.url);
  const { page } = app;
  const cdp = await app.ctx.newCDPSession(page);
  await app.input('from').tap(); await app.wait(600);
  const y0 = await page.evaluate(() => scrollY), top0 = await app.panelTop();
  const swipe = async (x, y, d) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let k = 1; k <= 8; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + d * k / 8 }] }); await app.wait(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await app.wait(400);
  };
  // iOS scrolls the page under a finger even with its overflow hidden (Chromium doesn't), so
  // check what stops iOS: the drags are cancelled
  await page.evaluate(() => { window.__moves = []; document.addEventListener('touchmove', e => window.__moves.push(e.defaultPrevented), true); });   // after the app's own (capture, added first)
  for (const [y, d] of [[500, -300], [300, -250], [700, -400]]) await swipe(195, y, d);   // swipes up on the empty panel
  assert.ok((await page.evaluate(() => window.__moves)).every(Boolean), 'every drag on the panel is cancelled');
  assert.equal(await page.evaluate(() => scrollY), y0, 'the page did not scroll');
  assert.equal(await app.panelTop(), top0, 'the panel did not move');
  // the suggestions list still scrolls
  await page.keyboard.type('a'); await app.wait(300);
  const list = page.locator('[data-suggestions]');
  const b = await list.boundingBox();
  await page.evaluate(() => { window.__moves = []; });
  await swipe(b.x + b.width / 2, b.y + b.height - 10, -120);
  assert.ok((await page.evaluate(() => window.__moves)).some(p => !p), 'drags on the list are let through');
  assert.ok(await list.evaluate(el => el.scrollTop) > 0, 'the suggestions scroll');
  assert.equal(await page.evaluate(() => scrollY), y0, 'and the page still did not');
  assert.deepEqual(app.errors, []);
  await app.close();
});

test('a scroll of the map still gliding when typing starts does not move the panel', async () => {
  const app = await openApp(browser, server.url);
  const { page } = app;
  await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }));   // the map still gliding
  await app.input('from').tap(); await app.wait(900);
  assert.ok(await isCover(app), 'the panel covers the screen');
  const y = await page.evaluate(() => document.body.style.top);
  await app.wait(400);
  assert.equal(await page.evaluate(() => document.body.style.top), y, 'the page stopped');
  assert.ok(await isCover(app), 'and the panel stays put');
  await app.blur(); await app.wait(900);
  assert.deepEqual(app.errors, []);
  await app.close();
});

test('typing started by pulling the panel up: the panel stays full screen and the layer stops scrolling', async () => {
  const app = await openApp(browser, server.url);
  const { page } = app;
  await app.flick(-300);                       // a quick pull up: the layer would keep gliding
  await app.wait(600);
  assert.ok(await isCover(app), 'full screen');
  const st = await page.locator('.sheet-layer').evaluate(el => [getComputedStyle(el).overflowY, el.scrollTop]);
  assert.equal(st[0], 'hidden', 'the layer does not scroll while typing');
  await app.wait(500);
  assert.equal(await page.locator('.sheet-layer').evaluate(el => el.scrollTop), st[1], 'no glide');
  assert.ok(await isCover(app), 'still full screen');
  await app.blur(); await app.wait(900);
  assert.equal(await page.locator('.sheet-layer').evaluate(el => getComputedStyle(el).overflowY), 'auto', 'scrolls again after');
  assert.deepEqual(app.errors, []);
  await app.close();
});
