// Browser tests for the trip panel and the iPhone-specific behaviour.
// Run: npm test (needs `npm install` once; Playwright's Chromium).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp } from './helpers.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); server.close(); });

const FULL_TOP = 60;                  // the panel's top edge at 'full' (no safe area in the emulator)
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

test('panel positions: card, half, full; drags, flicks and handle taps', async () => {
  const app = await withRoute();
  const card = await app.panelTop();
  await app.drag(-240); const half = await app.panelTop();
  assert.ok(half < card - 100 && half > FULL_TOP + 100, `half ${half} between full and card ${card}`);
  await app.drag(-240);
  assert.ok(near(await app.panelTop(), FULL_TOP), 'slow drag up again reaches full');
  await app.drag(100, { from: 6 });
  assert.ok(near(await app.panelTop(), FULL_TOP), 'a short drag down springs back to full');
  await app.flick(80);
  assert.ok(near(await app.panelTop(), half), 'flick down: full -> half');
  await app.flick(80);
  assert.ok(near(await app.panelTop(), card), 'flick down: half -> card');
  await app.flick(60);
  assert.ok(near(await app.panelTop(), card), 'the card is the lowest: a flick down stays there');
  await app.drag(150);
  assert.ok(near(await app.panelTop(), card), 'and a drag down too');
  for (const [want, label] of [[half, 'card -> half'], [FULL_TOP, 'half -> full'], [card, 'full -> card']]) {
    await app.handle().click(); await app.wait(500);
    assert.ok(near(await app.panelTop(), want), 'tap handle: ' + label);
  }
  assert.deepEqual(app.errors, []);
  await app.close();
});

test('no route yet: opening the panel starts typing, no higher than half; closing the keyboard returns to the card', async () => {
  const app = await openApp(browser, server.url);
  const card = await app.panelTop();
  await app.drag(-500);
  assert.equal(await app.focused(), 'from', 'dragging up starts typing in From');
  const top = await app.panelTop();
  assert.ok(top > FULL_TOP + 100 && top < card, `no higher than half (top ${top})`);
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
  assert.ok(near(await app.panelTop(), FULL_TOP), 'typing with a route: full');
  // the same unroll as from the handle: the trip card stays where it was, fully shown
  const cardTyping = await app.page.locator('[data-trip-card]').boundingBox();
  assert.ok(near(cardTyping.y, cardAtFull.y) && near(cardTyping.height, cardAtFull.height), 'trip card unchanged while typing');
  assert.equal(await app.page.locator('[data-trip-card]').evaluate(el => getComputedStyle(el).opacity), '1');
  await app.blur(); await app.wait(600);
  assert.ok(near(await app.panelTop(), card), 'keyboard closed: the card');
  assert.deepEqual(app.errors, []);
  await app.close();
});

test('keyboard (iPhone): the panel fits above it, the map does not move, all is restored after', async () => {
  const app = await openApp(browser, server.url, { keyboard: true });
  const { page } = app;
  const map0 = await app.mapTop(), scroll0 = await page.evaluate(() => scrollY);
  await app.input('from').tap();
  await page.evaluate(() => window.__kb(200, 330));        // visible part of the page: 200..530
  await app.wait(500);
  const r = await app.panel();
  assert.ok(r.y >= 200 && r.y + r.height <= 530 + 1, `panel ${Math.round(r.y)}-${Math.round(r.y + r.height)} inside the visible area`);
  await page.evaluate(() => window.scrollBy(0, 400));     // what Safari does to reveal the field
  await app.wait(200);
  assert.equal(await app.mapTop(), map0, 'the map stays put while typing');
  await page.keyboard.type('Netan');
  await page.locator('[data-suggestion="netanya"]').dispatchEvent('mousedown');
  await app.blur();
  await app.wait(150);
  await page.evaluate(() => window.__kb(0, innerHeight));  // keyboard gone
  await app.wait(700);
  assert.equal(await app.mapTop(), map0, 'the map is where it was');
  assert.equal(await page.evaluate(() => scrollY), scroll0, 'page scroll restored');
  assert.equal(await page.evaluate(() => document.body.style.position), '', 'scroll lock released');
  assert.deepEqual(app.errors, []);
  await app.close();
});

test('closing the keyboard moves the panel down in one movement (no jumps back up)', async () => {
  const app = await openApp(browser, server.url, { keyboard: true });
  const { page } = app;
  await app.input('from').tap();
  await page.evaluate(() => window.__kb(200, 330)); await app.wait(500);
  await page.keyboard.type('Netan');
  await page.evaluate(() => { window.__tops = []; const t0 = performance.now(); const tick = () => { window.__tops.push(document.querySelector('[data-sheet]').getBoundingClientRect().top); if (performance.now() - t0 < 900) setTimeout(tick, 30); }; tick(); });
  await page.locator('[data-suggestion="netanya"]').dispatchEvent('mousedown');
  await app.blur(); await app.wait(150);
  await page.evaluate(() => window.__kb(0, innerHeight)); await app.wait(900);
  const tops = await page.evaluate(() => window.__tops);
  for (let i = 1; i < tops.length; i++) assert.ok(tops[i] >= tops[i - 1] - 0.5, `moved back up at sample ${i}: ${tops.map(Math.round).join(' ')}`);
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
  assert.equal(await page.evaluate(() => document.body.style.position), '', 'page free again');
  assert.deepEqual(app.errors, []);
  await app.close();
});
