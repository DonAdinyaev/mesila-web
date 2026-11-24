// Mesila's service worker: the app opens and plans trips without a connection.
//
//  - The page and the app's own files (scripts, timetable, icons): from the network first,
//    so a new version shows as soon as you are online; the saved copy only when the
//    network fails. A script's ?v= changes with every deploy; the saved copy is found
//    whatever its ?v=, and older copies of the same file are dropped.
//  - React (unpkg) and the fonts (Google Fonts): their addresses never change content, so
//    they are saved once and served from the saved copy.
//  - Live delays (the relay) are never saved: offline, trips show their planned times.
//
// On install everything the page loads is saved (read from the page itself, so there is
// no list to keep up to date), so the next visit already works offline.

const CACHE = 'mesila-v1';
const IMMUTABLE = /^https:\/\/(unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
const OWN = (url) => new URL(url).origin === self.location.origin;

// the files a page loads: scripts, stylesheets, icons, the manifest
const refs = (html, base) => [...html.matchAll(/<(?:script|link)\b[^>]*?\s(?:src|href)="([^"]+)"/g)]
  .map(m => new URL(m[1], base).href)
  .filter(u => OWN(u) || IMMUTABLE.test(u));

async function save(cache, url) {
  const res = await fetch(url, OWN(url) ? { cache: 'no-cache' } : { mode: 'cors' });
  if (!res.ok) throw new Error(url + ': ' + res.status);
  // a font stylesheet: the font files it names too
  if (/fonts\.googleapis\.com/.test(url)) {
    const css = await res.clone().text();
    await Promise.all([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)]
      .map(m => fetch(m[1], { mode: 'cors' }).then(r => r.ok && cache.put(m[1], r)).catch(() => {})));
  }
  await put(cache, url, res);
}

// saves one of our files, dropping its copies with another ?v=
async function put(cache, url, res) {
  const u = new URL(url);
  if (OWN(url) && u.search) {
    for (const k of await cache.keys()) {
      const ku = new URL(k.url);
      if (ku.pathname === u.pathname && ku.search !== u.search) await cache.delete(k);
    }
  }
  await cache.put(url, res);
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const page = new URL('./', self.location).href;
    const res = await fetch(page, { cache: 'no-cache' });
    const html = await res.clone().text();
    await cache.put(page, res);
    // a file that fails is left to be saved when the page next loads it
    await Promise.all(refs(html, page).map(u => save(cache, u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;

  if (IMMUTABLE.test(url)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(url);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(url, res.clone()).catch(() => {});
      return res;
    })());
    return;
  }
  if (!OWN(url)) return;                      // the relay and anything else: network only

  // the page and our files: network first, the saved copy when offline
  const page = req.mode === 'navigate';
  const key = page ? new URL('./', self.location).href : url;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) e.waitUntil(put(cache, key, res.clone()).catch(() => {}));
      return res;
    } catch (err) {
      const hit = await cache.match(key, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
