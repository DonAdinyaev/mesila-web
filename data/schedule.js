// Real (planned) Israel Railways timetable: line matching and trip planning.
// Data: window.TIMETABLE from data/timetable.js (built by tools/build_timetable.py
// from the Ministry of Transport GTFS feed). Planned times only, no live delays.
//
// Times are minutes after midnight, Israel time, of the day the search starts on
// (so 1500 = 01:00 the next day). That keeps the app correct wherever the viewer is.

window.SCHEDULE = (() => {
  const TT = window.TIMETABLE, M = window.MESILA;
  if (!TT || !M) return null;
  const TZ = 'Asia/Jerusalem';
  const CHANGE = 3;        // minimum minutes to change trains at a station
  const MAX_LEGS = 4;      // at most 3 changes
  const HORIZON = 30 * 60; // search this far ahead (covers Shabbat gaps)

  // ---- Trips: expand stations and absolute times, and match each to a map line
  const trips = TT.trips.map(([ds, train, flat], i) => {
    const st = [], t = [];
    let time = 0;
    for (let k = 0; k < flat.length; k += 2) {
      time = k === 0 ? flat[1] : time + flat[k + 1];
      st.push(TT.stations[flat[k]]); t.push(time);
    }
    return { i, days: TT.daySets[ds], train, st, t, line: null };
  });

  // A train belongs to the line whose stopping pattern contains its stops in order
  // (either direction), preferring the line it skips the fewest stops of. Some real
  // services stop at stations their map line doesn't show (e.g. Netanya – Jerusalem
  // trains, or Nahariya – Be'er Sheva trains calling at Atlit): those get the line
  // that covers most of the trip's length on the map.
  // Overnight trains (the former night lines N1/N2) belong to their day line: they
  // run the same route with fewer stops. Such a train gets `night` = it is on one
  // of those lines, leaves between 23:45 and 05:00 and skips 3+ of the line's
  // stops (or calls where the line doesn't), so the trip view can say so. Early
  // day trains that skip one or two stops are not marked.
  const NIGHT_LINES = new Set(['L3', 'HS']);   // the day lines the night service runs on
  const hop = (a, b) => { const p = M.BY_ID[a], q = M.BY_ID[b]; return Math.hypot(p.x - q.x, p.y - q.y); };
  function classify(trip) {
    let best = null;
    for (const L of M.LINES) {
      const stops = M.PATHS[L.id];
      for (const seq of [stops, [...stops].reverse()]) {
        // walk the trip; hops between two consecutive stops both on the line (in order) are covered
        let j = -1, a = -1, matched = 0, off = 0, prevOn = false;
        trip.st.forEach((s, n) => {
          const k = seq.indexOf(s, j + 1), on = k >= 0;
          if (n > 0 && !(on && prevOn)) off += hop(trip.st[n - 1], s);
          if (on) { if (a < 0) a = k; j = k; matched++; }
          prevOn = on;
        });
        if (matched < 2) continue;
        const skipped = (j - a + 1) - matched;
        const score = off + skipped * 10 + (stops.length - matched) * 0.01;
        if (!best || score < best.score) best = { id: L.id, score, exact: matched === trip.st.length, skipped };
      }
    }
    if (best) {
      const dep = trip.t[0] % 1440;
      trip.exact = best.exact;
      trip.night = NIGHT_LINES.has(best.id) && (dep >= 1425 || dep < 300) && (best.skipped >= 3 || !best.exact);
    }
    return best ? best.id : null;
  }
  for (const tr of trips) tr.line = classify(tr);
  const unmatched = trips.filter(t => !t.line);
  const inexact = trips.filter(t => t.line && !t.exact);

  // ---- Calendar helpers (Israel time)
  const startDay = Date.UTC(+TT.start.slice(0, 4), +TT.start.slice(5, 7) - 1, +TT.start.slice(8, 10)) / 864e5;
  const fmtParts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  // Israel wall clock for a Date -> { day: days since 1970 (as a UTC date), min }
  function israelNow(date = new Date()) {
    const p = Object.fromEntries(fmtParts.formatToParts(date).map(x => [x.type, x.value]));
    return { day: Date.UTC(+p.year, +p.month - 1, +p.day) / 864e5, min: +p.hour * 60 + +p.minute };
  }
  // Index of a day in the feed. Outside the feed, borrow the same weekday from inside it.
  function feedIndex(day) {
    let i = day - startDay;
    if (i >= 0 && i < TT.days) return { i, borrowed: false };
    const last = TT.days - 1;
    if (i < 0) i = ((i % 7) + 7) % 7; else i = last - ((last - i) % 7 + 7) % 7;
    while (i >= TT.days) i -= 7;
    return { i, borrowed: true };
  }
  const runsOn = (trip, day) => { const f = feedIndex(day); return trip.days[f.i] === '1'; };
  const dayLabel = (day) => new Date(day * 864e5).toISOString().slice(0, 10);

  // ---- Connections for a search starting on `day`: yesterday's after-midnight runs,
  // today's and tomorrow's, as [depTime, arrTime, from, to, tripRef] in search minutes.
  const connCache = new Map();
  function connections(day) {
    if (connCache.has(day)) return connCache.get(day);
    const conns = [];
    for (const off of [-1, 0, 1]) {
      for (const tr of trips) {
        if (!runsOn(tr, day + off)) continue;
        const shift = off * 1440;
        if (tr.t[tr.t.length - 1] + shift < 0) continue;
        const ref = { trip: tr, shift };
        for (let k = 0; k < tr.st.length - 1; k++)
          conns.push([tr.t[k] + shift, tr.t[k + 1] + shift, k, ref]);
      }
    }
    conns.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (connCache.size > 6) connCache.clear();
    connCache.set(day, conns);
    return conns;
  }

  // ---- Round-based connection scan: earliest arrival using at most k trains,
  // for k = 1..MAX_LEGS. Returns the journey with the earliest arrival, and among
  // equal arrivals the fewest changes.
  function scan(conns, from, to, t0, allowed) {
    const arr = [{ [from]: t0 }], via = [{}];
    let bestK = 0;
    for (let k = 1; k <= MAX_LEGS; k++) {
      const prev = arr[k - 1], cur = { ...prev }, v = {}, boardAt = new Map();
      for (const c of conns) {
        const [dep, at, idx, ref] = c, tr = ref.trip;
        if (dep < t0) continue;
        if (dep > t0 + HORIZON) break;
        if (allowed && !allowed.has(tr.line)) continue;
        const a = tr.st[idx], b = tr.st[idx + 1];
        if (!boardAt.has(ref)) {
          const ready = prev[a];
          if (ready === undefined || ready + (a === from ? 0 : CHANGE) > dep) continue;
          boardAt.set(ref, idx);
        }
        if (at < (cur[b] ?? Infinity)) { cur[b] = at; v[b] = { ref, from: boardAt.get(ref), to: idx + 1 }; }
      }
      arr.push(cur); via.push(v);
      if (cur[to] !== undefined && (!bestK || cur[to] < arr[bestK][to])) bestK = k;
    }
    if (!bestK) return null;
    const legs = [];
    let st = to, k = bestK;
    while (st !== from) {
      while (k > 0 && !via[k][st]) k--;
      if (k === 0) return null;
      const v = via[k][st];
      legs.unshift({ trip: v.ref.trip, shift: v.ref.shift, from: v.from, to: v.to });
      st = v.ref.trip.st[v.from];
      k--;
    }
    return legs;
  }

  function legInfo(l) {
    const tr = l.trip;
    return {
      line: tr.line, train: tr.train, night: !!tr.night,
      stationIds: tr.st.slice(l.from, l.to + 1),
      times: tr.t.slice(l.from, l.to + 1).map(x => x + l.shift),
      depart: tr.t[l.from] + l.shift, arrive: tr.t[l.to] + l.shift,
      terminus: tr.st[tr.st.length - 1],
    };
  }

  // plan(from, to, allowedLines?, when?: Date | {day, min}) -> journey or null
  // journey: { day, borrowed, start (search minute), legs:[{line, train, stationIds, times, depart, arrive, terminus}], depart, arrive, transfers }
  function plan(from, to, allowed, when) {
    if (!from || !to || from === to) return null;
    // when: a Date, or an Israel wall-clock { day, min } (day = days since 1970)
    const now = when && when.day !== undefined ? when : israelNow(when || new Date());
    const conns = connections(now.day);
    let legs = scan(conns, from, to, now.min, allowed);
    if (!legs) return null;
    // Leave as late as possible for the same arrival (no pointless wait at the origin)
    const target = legs[legs.length - 1].trip.t[legs[legs.length - 1].to] + legs[legs.length - 1].shift;
    for (let guard = 0; guard < 40; guard++) {
      const dep = legs[0].trip.t[legs[0].from] + legs[0].shift;
      const next = scan(conns, from, to, dep + 1, allowed);
      if (!next) break;
      const arr = next[next.length - 1].trip.t[next[next.length - 1].to] + next[next.length - 1].shift;
      if (arr > target || next.length > legs.length) break;
      legs = next;
    }
    const L = legs.map(legInfo);
    const f = feedIndex(now.day);
    return {
      day: dayLabel(now.day), borrowed: f.borrowed, start: now.min,
      legs: L, depart: L[0].depart, arrive: L[L.length - 1].arrive, transfers: L.length - 1,
    };
  }

  // Several trips around the requested time, ordered by departure: the best trip,
  // up to `later` after it and (when a time was picked) up to `earlier` before it.
  // Returns { list, index } where list[index] is the trip plan() would return.
  function alternatives(from, to, allowed, when, { later = 6, earlier = 2 } = {}) {
    const first = plan(from, to, allowed, when);
    if (!first) return { list: [], index: 0 };
    const base = Date.parse(first.day) / 864e5;
    const at = (min) => plan(from, to, allowed, { day: base, min });
    const key = (j) => j.legs.map(l => l.train + '@' + l.depart).join(',') + '>' + j.arrive;
    const seen = new Set([key(first)]);
    const after = [];
    for (let t = first.depart + 1, n = 0; after.length < later && n < later * 3; n++) {
      const j = at(t);
      if (!j || j.depart - first.start > 24 * 60) break;
      if (!seen.has(key(j))) { seen.add(key(j)); after.push(j); }
      t = j.depart + 1;
    }
    const before = [];
    if (when && earlier > 0) {
      for (let t = first.start - 180, n = 0; n < 20; n++) {
        const j = at(t);
        if (!j || j.depart >= first.depart) break;
        if (!seen.has(key(j))) { seen.add(key(j)); before.push(j); }
        t = j.depart + 1;
      }
    }
    const pre = before.slice(-earlier);
    // every trip keeps the requested start, so "departs in" and waits stay relative to it
    const list = [...pre, first, ...after].map(j => ({ ...j, start: first.start }));
    return { list, index: pre.length };
  }

  // Map path for the highlight, in the shape MapSVG expects: [{id, line}, ...].
  // MapSVG draws each run of one line between its first and last station along that
  // line, so every consecutive pair must be stops of the line used for it. A train
  // calling at a station its map line doesn't serve borrows another line for that hop.
  function hopLine(a, b, pref, allowed) {
    const on = (id) => { const p = M.PATHS[id]; return p && p.includes(a) && p.includes(b); };
    if (on(pref)) return pref;
    const cands = M.LINES.map(l => l.id).filter(id => on(id));
    return cands.find(id => !allowed || allowed.has(id)) || cands[0] || pref;
  }
  function toPath(j, allowed) {
    if (!j) return null;
    const path = [{ id: j.legs[0].stationIds[0], line: j.legs[0].line }];
    for (const l of j.legs) {
      const ids = l.stationIds;
      for (let k = 1; k < ids.length; k++) path.push({ id: ids[k], line: hopLine(ids[k - 1], ids[k], l.line, allowed) });
    }
    path[0].line = path[1].line;
    return path;
  }

  // Nearest station to a position, by straight-line distance over the real station
  // coordinates from the GTFS feed. Returns { id, km } or null without coordinates.
  function nearest(lat, lon) {
    if (!TT.coords) return null;
    const R = 6371, rad = Math.PI / 180;
    let best = null;
    TT.stations.forEach((id, i) => {
      if (!M.BY_ID[id]) return;
      const [la, lo] = TT.coords[i];
      const dLa = (la - lat) * rad, dLo = (lo - lon) * rad;
      const h = Math.sin(dLa / 2) ** 2 + Math.cos(lat * rad) * Math.cos(la * rad) * Math.sin(dLo / 2) ** 2;
      const km = 2 * R * Math.asin(Math.sqrt(h));
      if (!best || km < best.km) best = { id, km };
    });
    return best;
  }

  return {
    plan, alternatives, nearest, toPath, israelNow, dayLabel, trips, unmatched, inexact,
    feedDate: TT.feedDate, validFrom: TT.start, validTo: dayLabel(startDay + TT.days - 1),
  };
})();
