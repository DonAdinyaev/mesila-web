// Mesila live-delays relay (Cloudflare Worker).
//
// The Israel Railways API (rail-api.rail.co.il) only answers browsers on www.rail.co.il,
// so the app asks this relay instead. It calls the API with the key (a Worker secret,
// RAIL_KEY, never in the page), keeps each answer for 30 s so users don't multiply
// requests, and returns only what the app needs: the live state of trains running now.
//
//   GET /trains?from=3300&to=3700&date=2026-11-18
//   -> { at, trains: { "137": { delay: 2, last: 2500, next: 2800, eta: { "3300": 1 } } } }
//
// Station numbers are Israel Railways' own (see data/railids.js in the app).
const API = 'https://rail-api.rail.co.il/rjpa/api/v1/timetable/searchTrain';
const ORIGINS = [/^https:\/\/donadinyaev\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const TTL = 30;

function cors(origin) {
  const ok = origin && ORIGINS.some(r => r.test(origin));
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : { 'Vary': 'Origin' };
}
function json(body, status, origin, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(origin), ...extra } });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), origin = req.headers.get('Origin');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors(origin), 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
    if (req.method !== 'GET' || url.pathname !== '/trains') return json({ error: 'not found' }, 404, origin);
    const from = url.searchParams.get('from'), to = url.searchParams.get('to'), date = url.searchParams.get('date');
    if (!/^\d{1,5}$/.test(from || '') || !/^\d{1,5}$/.test(to || '') || !/^\d{4}-\d{2}-\d{2}$/.test(date || ''))
      return json({ error: 'from, to (station numbers) and date (YYYY-MM-DD) are required' }, 400, origin);

    // one cached answer per station pair and day, shared by every user
    const key = new Request(`https://cache.mesila/trains/${from}/${to}/${date}`);
    const cache = caches.default;
    let res = await cache.match(key);
    if (!res) {
      let api;
      try {
        api = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*', 'Ocp-Apim-Subscription-Key': env.RAIL_KEY,
            'Origin': 'https://www.rail.co.il', 'Referer': 'https://www.rail.co.il/', 'User-Agent': 'Mozilla/5.0 (compatible; MesilaRelay/1.0)' },
          body: JSON.stringify({ fromStation: +from, toStation: +to, date, hour: '00:00', scheduleType: 'ByDeparture', systemType: '2', languageId: 'English' }),
        });
      } catch (e) { return json({ error: 'upstream unreachable' }, 502, origin); }
      if (!api.ok) return json({ error: 'upstream ' + api.status }, 502, origin);
      const data = await api.json();
      const trains = {};
      for (const tv of (data.result && data.result.travels) || []) for (const t of tv.trains || []) {
        const p = t.trainPosition;
        if (!p && !(t.etaDiffTimes && t.etaDiffTimes.length)) continue;     // not running now
        const eta = {};
        for (const e of t.etaDiffTimes || []) eta[e.stationId] = e.difMin;
        trains[t.trainNumber] = { delay: p ? p.calcDiffMinutes : null, last: p ? p.currentLastStation : null, next: p ? p.nextStation || null : null, eta };
      }
      res = new Response(JSON.stringify({ at: new Date().toISOString(), trains }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${TTL}` },
      });
      ctx.waitUntil(cache.put(key, res.clone()));
    }
    const body = await res.text();
    return new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${TTL}`, ...cors(origin) } });
  },
};
