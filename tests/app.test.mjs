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
    // the language button: the top right corner in both languages
    const lb = await app.page.locator('button', { hasText: /^(EN|עב)$/ }).boundingBox();
    const W = await app.page.evaluate(() => innerWidth);
    assert.ok(lb && lb.x + lb.width > W - 20, 'language button at the right ' + JSON.stringify(opts));
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

test('route view: no form, no swap; the X above the panel clears the trip back to the form', async () => {
  const app = await withRoute();
  const { page } = app;
  const card = await app.panelTop();
  assert.ok(card > 400, 'the trip card, folded');
  // the X rides just above the panel's top edge at every position, and while dragged
  const xGap = async () => { const xb = await page.locator('[data-clear-trip]').boundingBox(); return (await app.panelTop()) - (xb.y + xb.height); };
  const gap0 = await xGap();
  assert.ok(gap0 > 0 && gap0 < 20, `X just above the card (${gap0})`);
  await app.handle().click(); await app.wait(500);                                   // half
  assert.ok(near(await xGap(), gap0), 'X follows the panel up to half');
  await app.handle().click(); await app.wait(500);                                   // full
  assert.ok(near(await xGap(), gap0), 'X follows the panel up to full');
  assert.equal(await app.input('from').count(), 0, 'no form in the route view');
  assert.equal(await page.locator('[data-trip-card]').evaluate(el => getComputedStyle(el).opacity), '1');
  assert.equal(await page.locator('[data-swap]').count(), 0, 'no swap button on the trip card');
  // the X: back to the form, nothing planned
  await app.handle().click(); await app.wait(600);                                   // back to the card
  const x = page.locator('[data-clear-trip]');
  const xb = await x.boundingBox(), lb = await page.locator('[data-locate]').boundingBox();
  assert.ok(xb.x < 60 && lb.x > 300 && near(xb.y, lb.y), 'at the card: the X on the left, level with the location button');
  await x.click(); await app.wait(700);
  assert.equal(await page.locator('[data-trip-card]').count(), 0, 'no trip');
  assert.equal(await x.count(), 0, 'the X goes away with the trip');
  assert.equal(await app.input('from').count(), 1, 'the form is back');
  assert.equal(await app.input('to').inputValue(), '', 'no destination');
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

test('station suggestions: fill the panel down to its edge, the rest scrolls', async () => {
  const app = await openApp(browser, server.url);
  await app.input('from').tap(); await app.page.keyboard.type('a'); await app.wait(600);
  const [h, sh, gap] = await app.page.locator('[data-suggestions]').evaluate(el => [el.clientHeight, el.scrollHeight,
    Math.round(document.querySelector('[data-sheet]').getBoundingClientRect().bottom - el.getBoundingClientRect().bottom)]);
  assert.ok(gap >= 8 && gap <= 24, `the list ends just above the panel's bottom edge (gap ${gap})`);
  assert.ok(sh > h + 100, `more matches than fit: it scrolls (${h} of ${sh})`);
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

test('phone held sideways: the panel is a full-height column on the left, the map beside it', async () => {
  for (const lang of ['en', 'he']) {
    const app = await openApp(browser, server.url, { landscape: true, lang });
    const { page } = app;
    const W = await page.evaluate(() => innerWidth), H = await page.evaluate(() => innerHeight);
    const p = await app.panel();
    assert.ok(p.x < 20 && p.width < W / 2 && p.y < 20 && p.y + p.height > H - 20, `a full-height column on the left ${JSON.stringify(p)}`);
    assert.equal(await page.locator('[data-handle]').isVisible(), false, 'no handle: nothing to drag');
    assert.equal(await page.locator('[aria-label="Zoom in"], [aria-label="הגדלה"]').count(), 0, 'no zoom buttons (pinch)');
    const lb = await page.locator('[data-locate]').boundingBox();
    assert.ok(lb.x > W - 70 && lb.y > H - 80, 'the location button in the bottom right corner');
    await app.choose('to', lang === 'he' ? 'סביד' : 'Savid', 'savidor');
    await app.choose('from', lang === 'he' ? 'נהרי' : 'Nahar', 'nahariya');
    await app.wait(1200);
    const xb = await page.locator('[data-clear-trip]').boundingBox();
    assert.ok(xb.x > p.x + p.width && xb.x < p.x + p.width + 30 && xb.y < 30, 'the X at the top of the map, beside the panel');
    // the trip is fitted beside the panel, not under it
    const names = lang === 'he' ? ['נהריה', 'סבידור מרכז'] : ['Nahariya', 'Savidor Center'];
    const xs = await page.evaluate((names) => names.map(n => { const t = [...document.querySelectorAll('svg text')].find(x => x.textContent === n); return t ? Math.round(t.getBoundingClientRect().left) : null; }), names);
    assert.ok(xs.every(x => x !== null && x > p.x + p.width), `both ends of the trip right of the panel ${xs}`);
    assert.deepEqual(app.errors, []);
    await app.close();
  }
});

test('tapping a station name on the map picks the station, like its marker', async () => {
  for (const lang of ['en', 'he']) {
    const app = await openApp(browser, server.url, { lang });
    const { page } = app;
    // a label's far end, away from its marker: the end of the text furthest from the line
    const pt = await page.evaluate(() => {
      const panelTop = document.querySelector('[data-sheet]').getBoundingClientRect().top;
      const t = [...document.querySelectorAll('text[data-label-id]')].find(x => { const r = x.getBoundingClientRect(); return r.width > 80 && r.top > 80 && r.bottom < panelTop - 20; });
      const r = t.getBoundingClientRect(), mid = r.left + r.width / 2;
      // the marker is at the anchor side; tap the other end
      const a = t.getAttribute('text-anchor'), x = a === 'end' ? r.left + 6 : a === 'start' ? r.right - 6 : mid;
      return { id: t.getAttribute('data-label-id'), name: t.textContent, x, y: r.top + r.height / 2 };
    });
    await page.touchscreen.tap(pt.x, pt.y); await app.wait(500);
    const full = await page.evaluate((id) => window.I18N.station(id), pt.id);
    assert.equal(await app.input('from').inputValue(), full, `${lang}: tapping "${pt.name}" sets From`);
    assert.deepEqual(app.errors, []);
    await app.close();
  }
});
