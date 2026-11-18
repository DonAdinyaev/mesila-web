// Platforms and live train delays from Israel Railways, through our relay (relay/worker.js,
// a Cloudflare Worker at mesila-live.mesila.workers.dev). The relay answers, per pair of
// stations and day, every train's departure and arrival platform, and for the trains
// running right now their delay, last/next station and the predicted delay at each
// station still ahead. Planned times stay the base; this adds platforms and
// "x min late" / "on time" to the trip on screen.

window.LIVE = (() => {
  const URL = 'https://mesila-live.mesila.workers.dev/trains';
  const REFRESH = 30e3;
  // Israel Railways station numbers (as the live API uses them) for our station ids.
  // Built by matching train numbers and times in the API's answers against the GTFS
  // timetable. Missing: Hadera East, Shomron, Tira (Eastern line), so no live data there.
  const RAIL = { afula:1260, ahihud:1820, akko:1500, ashdod:5800, ashkelon:5900, atlit:2500, bat_galim:2200, beer_yaakov:5300, beit_shean:1280, beit_shem:6300, beit_yh:3400, bengurion:8600, binyamina:2800, bnei_brak:4100, bs_center:7320, bs_north:7300, by_komem:4690, by_yoseftal:4680, caesarea:2820, dimona:7500, hadera:3100, hahagana:4900, hashalom:4600, hashmona:2100, herzliya:3500, hod_hash:9200, hof_carmel:2300, holon_jct:4640, holon_wolf:4660, hutzot:1300, k_hayim:700, k_motzkin:1400, karmiel:1840, kfar_habad:4800, kfar_saba:8700, kgat:7000, kmalakhi:6150, lehavim:8550, lod:5000, lod_gan:5150, mazkeret:6900, merkazit:1220, migdal:1250, modiin:400, nahariya:1600, netanya:3300, netivot:9650, ofakim:9700, paatei:300, ptkv_arye:4170, ptkv_sgula:4250, raanana_s:2960, raanana_w:2940, ramla:5010, rehovot:5200, rosh_ayin:8800, rz_dayan:9800, rz_haris:9100, sapir:3310, savidor:3700, sderot:9600, university:3600, yavne_e:5410, yavne_w:9000, yitzhak_nav:680, yoknaam:1240 };

  const cache = {};   // "from|to|date" -> { at, p }
  function pair(from, to, date) {
    const k = from + '|' + to + '|' + date, c = cache[k];
    if (c && Date.now() - c.at < REFRESH) return c.p;
    const p = fetch(`${URL}?from=${from}&to=${to}&date=${date}`)
      .then(r => (r.ok ? r.json() : null)).catch(() => null);
    cache[k] = { at: Date.now(), p };
    return p;
  }

  // Platforms and live state of each leg of journey j (from window.SCHEDULE), or null
  // where there is nothing: a station without a number, an unknown train, the relay down.
  // -> [{ pf, pt, dep, arr } | null]: platform at the leg's first / last station, and the
  // delay in minutes there (dep / arr: null unless the train is running now)
  async function forJourney(j) {
    const S = window.SCHEDULE; if (!S || !j) return null;
    const now = S.israelNow(), nowAbs = now.day * 1440 + now.min;
    const base = Date.parse(j.day) / 864e5 * 1440;
    return Promise.all(j.legs.map(async (leg) => {
      const a = leg.stationIds[0], b = leg.stationIds[leg.stationIds.length - 1];
      const ra = RAIL[a], rb = RAIL[b];
      const dep = base + leg.depart, arr = base + leg.arrive;
      if (!ra || !rb) return null;
      const date = new Date(Math.floor(dep / 1440) * 864e5).toISOString().slice(0, 10);
      const data = await pair(ra, rb, date);
      const t = data && data.trains && data.trains[leg.train];
      if (!t) return null;
      const out = { pf: t.pf || null, pt: t.pt || null, dep: null, arr: null };
      // a train only reports while it runs: trust that from 2 h before it reaches us
      // until it arrives (the same number runs every day)
      if (nowAbs >= dep - 120 && nowAbs <= arr + 20) {
        const at = (r) => (t.eta && t.eta[r] != null ? t.eta[r] : t.delay);
        const d0 = at(ra), d1 = at(rb);
        if (d0 != null || d1 != null) { out.dep = d0 != null ? d0 : d1; out.arr = d1 != null ? d1 : d0; }
      }
      return out.pf || out.pt || out.dep != null ? out : null;
    }));
  }

  return { forJourney, RAIL, REFRESH };
})();
