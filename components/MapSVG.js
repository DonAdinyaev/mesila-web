// Israel Railways schematic renderer.
// Lines are offset per shared EDGE (not per station) and joined with miters, so
// every line in a bundle stays visible and parallel. Sizes adapt to zoom.

// Geometry follows each line's full path, including stations it passes without
// stopping (PASS): those reserve a track but get no dot.
const { LINES, STATIONS: STATIONS_D, BY_ID: BY_ID_D, GEO_PATHS: PATHS, PASS, MOBILE } = window.MESILA;
// Occasional service (data/schedule.js): stops only some of a line's trains make are
// drawn as hollow rings; track only some of them use is a "ghost" line ("L3~1") drawn
// hollow in its parent's colour, on the parent's track where they meet.
const OCC = window.MESILA.OCC || {};
const parentOf = (id) => id.split('~')[0];
const GHOST = new Set(LINES.filter(l => l.ghost).map(l => l.id));
const LINE_ORDER = LINES.map(l => l.id);
// Paint order: line 1 (red) last so it sits on top where it crosses the trunk
const DRAW_ORDER = [...LINE_ORDER.filter(id => id !== 'L1'), 'L1'];
const GEO_LINES = {};
for (const s of STATIONS_D) GEO_LINES[s.id] = LINE_ORDER.filter(id => PATHS[id].includes(s.id));
// Cross-bundle ordering (west/south side first), as on the official map:
// (see FORCE_ORDER for pairs that must keep their order, e.g. line 3 east of 6 and 7)
const BUNDLE_ORDER = ['L1','L10','L2','L4','L5','L7','L6','L3','HS','L8','L12','E','L9','L11'];
// Pairs whose track order is never traded away for tighter packing: [west/south, east/north].
// '*' means every other line; 'L1@herzliya' is line 1's run that starts at Herzliya.
const FORCE_ORDER = [
  ['*','L1@herzliya'],          // Herzliya: the Sharon line leaves east, so it sits east-most
  ['L7@ahihud','L5@ahihud'],    // Ahihud–Karmiel: orange on top, maroon below
  // Airport – Pa'atei Modi'in: line 3 rides the bottom (south) track after the HaHagana curve
  ['L3@bengurion','HS@bengurion'],
  ['L3@bengurion','L12@paatei'],
  // line 3 runs east of lines 7 (Haifa) and 6 (Netanya – Tel Aviv)
  ['L7','L3'],
  ['L6','L3'],
];
const MAJOR = new Set(['nahariya','akko','karmiel','hashmona','hof_carmel','afula','beit_shean','binyamina','hadera','netanya','herzliya','kfar_saba','savidor','hahagana','bengurion','modiin','lod','rehovot','beit_shem','yitzhak_nav','malha','ashdod','ashkelon','sderot','kgat','bs_center','dimona']);
const SHORT = { university:'University', by_yoseftal:'Bat Yam – Yoseftal', beit_shean:'Beit She’an', hadera_e:'Hadera East', shomron:'Shomron', tira:'Tira', bat_galim:'Bat Galim', hof_carmel:'Hof HaCarmel', ashdod:'Ashdod', bs_center:'BS Center', hashmona:'HaShmona', caesarea:'Caesarea', modiin:'Modi’in', migdal:'Migdal HaEmek', yoknaam:'Yokne’am', bs_north:'BS North / University', rz_dayan:'Moshe Dayan', rz_haris:'HaRishonim', kmalakhi:'Kiryat Malakhi', ptkv_arye:'Kiryat Arye', ptkv_sgula:'Sgula', hod_hash:'Hod HaSharon', kfar_saba:'Kfar Saba', rosh_ayin:'Rosh Ha’Ayin', yitzhak_nav:'Yitzhak Navon', lehavim:'Lehavim' };
// Measure label text with a canvas (falls back to an average glyph width)
let _measureCtx = null;
function textW(str, size, weight) {
  try {
    if (!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
    _measureCtx.font = `${weight} 100px ${window.__fontStack || 'var(--font)'}`;
    return _measureCtx.measureText(str).width / 100 * size;
  } catch (e) { return str.length * size * 0.56; }
}
const CITY_LABELS_D = [['HAIFA',490,400,'middle'],['TEL AVIV',530,885,'middle'],['JERUSALEM',800,1200,'middle'],['BE’ER SHEVA',470,1975,'middle']];
const CITY_PREFIX = /^(Tel Aviv|Be’er Sheva|Jerusalem) – /;

// Label side per station: r / l / t / b (default r)
const LABEL_SIDE_D = {
  nahariya:'l', akko:'l', k_motzkin:'l', k_hayim:'l', hutzot:'l', merkazit:'l',
  hashmona:'l', bat_galim:'l', hof_carmel:'l', atlit:'l', binyamina:'l', caesarea:'l', hadera:'l',
  netanya:'l', sapir:'l', beit_yh:'l', herzliya:'l', university:'l', savidor:'l', hashalom:'l', hahagana:'l',
  ahihud:'b', karmiel:'b', yoknaam:'t', migdal:'r', afula:'b', beit_shean:'b',
  hadera_e:'t', shomron:'l', tira:'l',
  raanana_w:'t', raanana_s:'b', hod_hash:'t', kfar_saba:'b', rosh_ayin:'r',
  ptkv_sgula:'b', ptkv_arye:'t', bnei_brak:'b',
  bengurion:'t', paatei:'t', modiin:'r', yitzhak_nav:'b',
  holon_jct:'l', holon_wolf:'l', by_yoseftal:'l', by_komem:'l', rz_dayan:'l', yavne_w:'l', ashdod:'l', ashkelon:'l',
  kfar_habad:'r', rz_haris:'b', lod_gan:'r', lod:'r',
  beer_yaakov:'l', rehovot:'r', yavne_e:'r',
  ramla:'r', beit_shem:'b', biblical_zoo:'t', malha:'t',
  mazkeret:'r', kmalakhi:'r', kgat:'r', lehavim:'r', bs_north:'r', bs_center:'r', dimona:'r',
  sderot:'r', netivot:'l', ofakim:'l',
};

// Schematic Israel geography (octolinear, aligned to network grid)
// Straight N–S shoreline at x = 200 down to Gaza; the Egypt border runs 45° SE
// and the Arava border straight south, meeting at the Eilat peak over the Gulf.
const GEO_LAND = [[200,-40],[900,-40],[900,380],[930,410],[930,2470],[910,2490],[890,2490],[200,1800]];
const GEO_SEA = [[-600,-600],[200,-600],[200,1800],[120,1880],[-600,1880]];
const GEO_GULF = [[886,2494],[934,2494],[934,2720],[886,2720]];
const EILAT = [905, 2462];
function roundPoly(pts, R) {
  const n = pts.length; let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[(i-1+n)%n], c = pts[i], q = pts[(i+1)%n];
    const v1x=c[0]-p[0], v1y=c[1]-p[1], v2x=q[0]-c[0], v2y=q[1]-c[1];
    const l1=Math.hypot(v1x,v1y), l2=Math.hypot(v2x,v2y), r=Math.min(R,l1/2,l2/2);
    const a=[c[0]-v1x/l1*r, c[1]-v1y/l1*r], b=[c[0]+v2x/l2*r, c[1]+v2y/l2*r];
    d += (i===0?'M':'L') + a[0].toFixed(1)+' '+a[1].toFixed(1)+' Q'+c[0]+' '+c[1]+' '+b[0].toFixed(1)+' '+b[1].toFixed(1);
  }
  return d + 'Z';
}
const LAND_D = roundPoly(GEO_LAND, 28), SEA_D = roundPoly(GEO_SEA, 28), GULF_D = roundPoly(GEO_GULF, 14);
const VB_D = { x: 0, y: -90, w: 1000, h: 2850 };
const BOUNDS_D = { x0: -40, x1: 1040, y0: -120, y1: 2760 }; // pan limits, map units


const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cross = (a, b) => a.x * b.y - a.y * b.x;

function cornerPts(a, b, diagFirst) {
  const dx = b.x - a.x, dy = b.y - a.y, adx = Math.abs(dx), ady = Math.abs(dy);
  if (adx < 0.5 || ady < 0.5 || Math.abs(adx - ady) < 0.5) return [a, b];
  const sx = Math.sign(dx), sy = Math.sign(dy), k = Math.min(adx, ady);
  let c;
  if (diagFirst) c = { x: a.x + sx * k, y: a.y + sy * k };
  else c = adx > ady ? { x: a.x + sx * (adx - ady), y: a.y } : { x: a.x, y: a.y + sy * (ady - adx) };
  return [a, c, b];
}

// Each station gets one octolinear AXIS (direction most of its lines travel).
// Lines occupy parallel slots across that axis, pass straight through for a
// short stub, and only then turn — so every interchange marker sits at n×45°
// and no line bends inside a station.
const AXES = [{x:0,y:1},{x:1,y:0},{x:Math.SQRT1_2,y:Math.SQRT1_2},{x:-Math.SQRT1_2,y:Math.SQRT1_2}];
const AXIS_OVERRIDE_D = { rosh_ayin: 0, beit_shem: 1, lod: 0, yoknaam: 1, kfar_habad: 2, yitzhak_nav: 1, beer_yaakov: 3, rehovot: 3, yavne_e: 3, sderot: 2, netivot: 2, ofakim: 2 }; // 0 V, 1 H, 2 "\\", 3 "/"
const dot = (a, b) => a.x * b.x + a.y * b.y;
const add = (p, v, k) => ({ x: p.x + v.x * k, y: p.y + v.y * k });
const unit = (v) => { const l = Math.hypot(v.x, v.y) || 1; return { x: v.x / l, y: v.y / l }; };

// ---- Phone layout ----------------------------------------------------------
// Same network, re-drawn narrow and tall (see MOBILE in network.js). The view is
// locked to the screen width; it only scrolls vertically.
const STATIONS_M = STATIONS_D.map(s => ({ ...s, x: MOBILE[s.id][0], y: MOBILE[s.id][1] }));
const BY_ID_M = Object.fromEntries(STATIONS_M.map(s => [s.id, s]));
const AXIS_OVERRIDE_M = { rosh_ayin: 0, lod: 0, lod_gan: 2, ahihud: 3, kfar_habad: 2, beer_yaakov: 3, rehovot: 3, yavne_e: 3,
  sderot: 2, netivot: 2, ofakim: 2, bengurion: 1, paatei: 1, modiin: 1, yitzhak_nav: 1, raanana_w: 0, beit_shem: 1 };
const LABEL_SIDE_M = {
  nahariya:'l', akko:'l', k_motzkin:'l', k_hayim:'l', hutzot:'l', merkazit:'l', hashmona:'l', bat_galim:'l', hof_carmel:'l',
  atlit:'l', binyamina:'l', caesarea:'l', hadera:'l', netanya:'l', sapir:'l', beit_yh:'l', herzliya:'l',
  university:'l', savidor:'l', hashalom:'l', hahagana:'l',
  ahihud:'r', karmiel:'r', yoknaam:'r', migdal:'r', afula:'r', beit_shean:'r',
  hadera_e:'t', shomron:'l', tira:'l', raanana_w:'l', raanana_s:'l', hod_hash:'l', kfar_saba:'l', rosh_ayin:'r',
  ptkv_sgula:'r', ptkv_arye:'r', bnei_brak:'r', bengurion:'t', paatei:'t', modiin:'t', yitzhak_nav:'b',
  holon_jct:'l', holon_wolf:'l', by_yoseftal:'l', by_komem:'l', rz_dayan:'l', yavne_w:'l', ashdod:'l', ashkelon:'l',
  kfar_habad:'l', lod_gan:'r', lod:'r', rz_haris:'b', beer_yaakov:'l', rehovot:'l', yavne_e:'r',
  ramla:'r', beit_shem:'b', mazkeret:'r', kmalakhi:'r', kgat:'r', lehavim:'r',
  bs_north:'r', bs_center:'r', dimona:'r', sderot:'r', netivot:'l', ofakim:'l',
};
// Short names tried when the full one doesn't fit on a phone
const SHORT_M = { raanana_w:'Ra’anana W', raanana_s:'Ra’anana S', hod_hash:'Hod HaSharon', kfar_saba:'Kfar Saba',
  rosh_ayin:'Rosh HaAyin', ptkv_sgula:'Sgula', ptkv_arye:'Kiryat Arye', bs_north:'BS North', bs_center:'BS Center',
  biblical_zoo:'Biblical Zoo', bengurion:'Airport', yitzhak_nav:'Yitzhak Navon', modiin:'Modi’in', paatei:'Pa’atei',
  university:'University', hashmona:'HaShmona', bat_galim:'Bat Galim', hof_carmel:'Hof HaCarmel', rz_dayan:'Moshe Dayan',
  rz_haris:'HaRishonim', by_yoseftal:'Yoseftal', by_komem:'Komemiyut', holon_wolf:'Wolfson', kmalakhi:'Kiryat Malakhi',
  lehavim:'Lehavim', migdal:'Migdal HaEmek', yoknaam:'Yokne’am', beit_shean:'Beit She’an', caesarea:'Caesarea',
  hadera:'Hadera W', hadera_e:'Hadera E', shomron:'Shomron', tira:'Tira', lod_gan:'Ganei Aviv', yavne_w:'Yavne W',
  yavne_e:'Yavne E', sapir:'Sapir', savidor:'Savidor', hashalom:'HaShalom', hahagana:'HaHagana', malha:'Malha' };
const SHORT_M_HE = { raanana_w:'רעננה מערב', raanana_s:'רעננה דרום', hod_hash:'הוד השרון', kfar_saba:'כפר סבא',
  rosh_ayin:'ראש העין', ptkv_sgula:'סגולה', ptkv_arye:'קריית אריה', bs_north:'ב"ש צפון', bs_center:'ב"ש מרכז',
  biblical_zoo:'גן החיות', bengurion:'נתב"ג', yitzhak_nav:'יצחק נבון', modiin:'מודיעין', paatei:'פאתי',
  university:'האוניברסיטה', hashmona:'השמונה', bat_galim:'בת גלים', hof_carmel:'חוף הכרמל', rz_dayan:'משה דיין',
  rz_haris:'הראשונים', by_yoseftal:'יוספטל', by_komem:'הקוממיות', holon_wolf:'וולפסון', kmalakhi:'קריית מלאכי',
  lehavim:'להבים', migdal:'מגדל העמק', yoknaam:'יוקנעם', beit_shean:'בית שאן', caesarea:'קיסריה', hadera:'חדרה מערב',
  hadera_e:'חדרה מזרח', shomron:'שומרון', tira:'טירה', lod_gan:'גני אביב', yavne_w:'יבנה מערב', yavne_e:'יבנה מזרח',
  sapir:'ספיר', savidor:'סבידור', hashalom:'השלום', hahagana:'ההגנה', malha:'מלחה' };
// Always use the short name here (the full one would sit across the trunk lines)
const FORCE_SHORT_M = new Set(['bengurion', 'paatei', 'modiin']);
const CITY_LABELS_M = [['HAIFA',300,450,'middle'],['TEL AVIV',265,1210,'middle'],['BE’ER SHEVA',180,2140,'middle']];

const LAYOUT_D = { mobile: false, STATIONS: STATIONS_D, BY_ID: BY_ID_D, AXIS_OVERRIDE: AXIS_OVERRIDE_D, LABEL_SIDE: LABEL_SIDE_D,
  CITY_LABELS: CITY_LABELS_D, VB: VB_D, BOUNDS: BOUNDS_D };
const LAYOUT_M = { mobile: true, STATIONS: STATIONS_M, BY_ID: BY_ID_M, AXIS_OVERRIDE: AXIS_OVERRIDE_M, LABEL_SIDE: LABEL_SIDE_M,
  CITY_LABELS: CITY_LABELS_M,
  // Jezreel branch on phones: leave HaMifratz Central northwards, then east, then down its own strand
  FORCE_DIR: { 'merkazit>yoknaam': -1, 'yoknaam>merkazit': -1, 'raanana_w>herzliya': -1, 'paatei>yitzhak_nav': -1 },
  // opposite-facing ends offset sideways: step across with two right angles instead of a diagonal
  Z_TURN: { 'bengurion>yitzhak_nav': { ref: 'L12', at: 'paatei' } },
  // Sharon loop on phones: line 1 leaves Herzliya straight east, then turns down
  FORCE_SIDE: { 'herzliya>raanana_w': true }, VB: { x: 0, y: -70, w: 400, h: 2300 }, BOUNDS: { x0: 0, x1: 400, y0: -70, y1: 2270 } };
// The active layout; MapSVG picks it from the screen width before each render
let LY = LAYOUT_D;
const MOBILE_MAX = 600; // px of map width below which the phone layout is used

function buildGeometry(visible, W, GAP, ms) {
  const weight = {}, axis = {}, slot = {};
  for (const s of LY.STATIONS) weight[s.id] = s.lines.filter(l => visible.has(l)).length;
  const vis = LINE_ORDER.filter(id => visible.has(id));
  // 1. axis per station, scored by line-connections quantized to the 4 axes
  const score = {};
  for (const id of vis) {
    const p = PATHS[id];
    for (let i = 0; i < p.length; i++) {
      const c = LY.BY_ID[p[i]];
      for (const nb of [p[i-1], p[i+1]]) {
        if (!nb) continue;
        const v = unit({ x: LY.BY_ID[nb].x - c.x, y: LY.BY_ID[nb].y - c.y });
        let bk = 0, bd = -1;
        AXES.forEach((ax, k) => { const d = Math.abs(dot(v, ax)); if (d > bd + 1e-6) { bd = d; bk = k; } });
        (score[p[i]] = score[p[i]] || [0,0,0,0])[bk]++;
      }
    }
  }
  for (const s of LY.STATIONS) {
    const sc = score[s.id]; if (!sc) continue;
    let bk = 0; for (let k = 1; k < 4; k++) if (sc[k] > sc[bk]) bk = k;
    if (s.id in LY.AXIS_OVERRIDE) bk = LY.AXIS_OVERRIDE[s.id];
    const ax = AXES[bk], n = { x: -ax.y, y: ax.x };
    axis[s.id] = ax;
    const ls = GEO_LINES[s.id].filter(l => visible.has(l)).sort((p, q) => BUNDLE_ORDER.indexOf(parentOf(p)) - BUNDLE_ORDER.indexOf(parentOf(q)));
    slot[s.id] = { _ls: ls, _n: n, _b: Object.fromEntries(ls.map((l, i) => [l, ((ls.length - 1) / 2 - i) * GAP])) };
  }
  // Corridors: chains of stations on one straight axis. Every line keeps ONE
  // fixed track across its whole corridor (no jogs). Track order is chosen to
  // avoid gaps; where that forces lines to swap, they simply cross (drawn
  // over/under) instead of bending.
  const nbrs = {};
  for (const id of vis) {
    const p = PATHS[id];
    for (let i = 0; i < p.length - 1; i++) {
      const A = p[i], B = p[i+1];
      if (axis[A] !== axis[B]) continue;
      const v = unit({ x: LY.BY_ID[B].x - LY.BY_ID[A].x, y: LY.BY_ID[B].y - LY.BY_ID[A].y });
      if (Math.abs(dot(v, axis[A])) < 0.99) continue;
      (nbrs[A] = nbrs[A] || new Set()).add(B); (nbrs[B] = nbrs[B] || new Set()).add(A);
    }
  }
  const seen = new Set();
  const base = (k) => parentOf(k.split('@')[0]);
  const bo = (l) => BUNDLE_ORDER.indexOf(base(l));
  const fm = (f, k) => k === f || base(k) === f;
  const pathAdj = (l, a, b) => { const p = PATHS[l], i = p.indexOf(a); return p[i - 1] === b || p[i + 1] === b; };
  for (const s0 of LY.STATIONS) {
    if (!slot[s0.id] || seen.has(s0.id)) continue;
    const comp = [], stack = [s0.id];
    while (stack.length) { const u = stack.pop(); if (seen.has(u)) continue; seen.add(u); comp.push(u); for (const v of (nbrs[u] || [])) stack.push(v); }
    if (comp.length < 2) { const sl = slot[s0.id]; for (const l of sl._ls) sl[l] = add(s0, sl._n, sl._b[l]); continue; }
    const ax = axis[s0.id];
    comp.sort((p, q) => dot(LY.BY_ID[p], ax) - dot(LY.BY_ID[q], ax));
    // A line that leaves the corridor and rejoins it later gets a separate run
    // (key "L12@ashdod"), so each run can take its own track.
    const iv = {}, last = {}, runKey = {};
    comp.forEach((sid, k) => {
      runKey[sid] = {};
      for (const l of slot[sid]._ls) {
        const pr = last[l];
        let key;
        if (pr && pathAdj(l, pr.sid, sid)) { key = pr.key; iv[key][1] = k; }
        else { key = l + '@' + sid; iv[key] = [k, k]; }
        last[l] = { key, sid }; runKey[sid][l] = key;
      }
    });
    const ls = Object.keys(iv);
    // a ghost run that only touches its parent's run end to end continues it: same track, no clash
    const touch = (p, q) => p.split('@')[0] !== q.split('@')[0] && base(p) === base(q) && (iv[p][1] === iv[q][0] || iv[q][1] === iv[p][0]);
    const ov = (p, q) => iv[p][0] <= iv[q][1] && iv[q][0] <= iv[p][1] && !touch(p, q);
    const gaps = (s) => {
      let c = 0;
      for (let k = 0; k < comp.length; k++) {
        const occ = ls.filter(l => iv[l][0] <= k && k <= iv[l][1]).map(l => s[l]);
        if (occ.length) c += (Math.max(...occ) - Math.min(...occ) + 1) - occ.length;
      }
      return c;
    };
    const pack = (perm) => {
      const s = {}; perm.forEach((l, i) => { let v = 0; for (let j = 0; j < i; j++) if (ov(l, perm[j])) v = Math.max(v, s[perm[j]] + 1); s[l] = v; });
      for (const l of perm) for (const q of perm) if (touch(l, q) && GHOST.has(l.split('@')[0]) && !perm.some(o => o !== l && ov(l, o) && s[o] === s[q])) s[l] = s[q];
      // Compaction: slide a line one track into a free neighbouring track when that
      // closes an empty gap at its stations (order among overlapping lines is kept).
      let g = gaps(s);
      for (let pass = 0, moved = true; moved && pass < 8; pass++) {
        moved = false;
        for (const l of perm) for (const d of [1, -1]) {
          const v = s[l] + d;
          if (v < 0 || perm.some(o => o !== l && ov(l, o) && s[o] === v)) continue;
          const old = s[l]; s[l] = v; const ng = gaps(s);
          if (ng < g) { g = ng; moved = true; } else s[l] = old;
        }
      }
      return s;
    };
    const cost = (perm) => {
      const s = pack(perm); let c = 0;
      for (let k = 0; k < comp.length; k++) {
        const occ = ls.filter(l => iv[l][0] <= k && k <= iv[l][1]).map(l => s[l]);
        if (occ.length) c += (Math.max(...occ) - Math.min(...occ) + 1) - occ.length;
      }
      for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) {
        const p = ls[i], q = ls[j]; if (!ov(p, q)) continue;
        if ((s[p] - s[q]) * (bo(p) - bo(q)) < 0) c += 10;
      }
      for (const p of ls) for (const q of ls) if (touch(p, q) && s[p] !== s[q]) c += 5;
      // Hard order constraints: first line always on the west/left track of the second
      for (const [p, q] of FORCE_ORDER) for (const a of ls) if (p === '*' ? !fm(q, a) : fm(p, a)) for (const b of ls) if (a !== b && fm(q, b) && ov(a, b) && s[a] > s[b]) c += 1000;
      return c;
    };
    let perm = [...ls].sort((p, q) => bo(p) - bo(q)), best = cost(perm);
    for (let pass = 0, improved = true; improved && pass < 6; pass++) {
      improved = false;
      for (const l of ls) {
        const rest = perm.filter(x => x !== l);
        for (let pos = 0; pos <= rest.length; pos++) {
          const cand = [...rest.slice(0, pos), l, ...rest.slice(pos)];
          const c = cost(cand);
          if (c < best - 1e-9) { best = c; perm = cand; improved = true; }
        }
      }
    }
    const sl = pack(perm), vals = Object.values(sl), mid = (Math.min(...vals) + Math.max(...vals)) / 2;
    for (const sid of comp) { const st = slot[sid]; for (const l of st._ls) st[l] = add(LY.BY_ID[sid], st._n, (mid - sl[runKey[sid][l]]) * GAP); }
  }
  // connection type at station s toward neighbour nb: along axis (with sign) or perpendicular
  // Every line passes a station along the station's axis; the sign says which way it leaves toward nb.
  // A neighbour exactly perpendicular continues straight through (opposite of where the line came from).
  const conn = (s, nb, other) => {
    const v = unit({ x: LY.BY_ID[nb].x - LY.BY_ID[s].x, y: LY.BY_ID[nb].y - LY.BY_ID[s].y });
    const d = dot(v, axis[s]);
    const forced = LY.FORCE_DIR && LY.FORCE_DIR[s + '>' + nb];
    if (forced) return { along: true, sgn: forced };
    // leave straight out of the side of the marker, level with the station
    if (LY.FORCE_SIDE && LY.FORCE_SIDE[s + '>' + nb]) return { along: false, flush: true };
    // A leg leaving across the axis is a side exit from the marker end; it must not get an axial stub.
    if (Math.abs(d) < 0.3) return { along: false };
    return { along: true, sgn: d >= 0 ? 1 : -1 };
  };
  const LIM = GAP * 3;

  const lines = {}, stationPts = {};
  for (const id of vis) {
    const path = PATHS[id];
    const edges = [];
    for (let i = 0; i < path.length - 1; i++) {
      const A = path[i], B = path[i+1];
      const sA = slot[A][id], sB = slot[B][id], aA = axis[A], aB = axis[B];
      const ca = conn(A, B, path[i-1]), cb = conn(B, A, path[i+2]);
      const stub = Math.min(18 * ms, 0.3 * Math.hypot(LY.BY_ID[B].x - LY.BY_ID[A].x, LY.BY_ID[B].y - LY.BY_ID[A].y));
      let eA = ca.along ? add(sA, aA, ca.sgn * stub) : null;
      let eB = cb.along ? add(sB, aB, cb.sgn * stub) : null;
      if (!eA) { const o = eB || sB; eA = ca.flush ? sA : add(sA, aA, clamp(dot({ x: o.x - sA.x, y: o.y - sA.y }, aA), -LIM, LIM)); }
      if (!eB) { eB = add(sB, aB, clamp(dot({ x: eA.x - sB.x, y: eA.y - sB.y }, aB), -LIM, LIM)); }
      // Single bend: leave A along its direction, enter B along its direction, meet at one corner
      const outDir = (s, c, nb, ax) => {
        if (c.along) return { x: ax.x * c.sgn, y: ax.y * c.sgn };
        const n = { x: -ax.y, y: ax.x }, sg = Math.sign(dot({ x: LY.BY_ID[nb].x - LY.BY_ID[s].x, y: LY.BY_ID[nb].y - LY.BY_ID[s].y }, n)) || 1;
        return { x: n.x * sg, y: n.y * sg };
      };
      const dA = outDir(A, ca, B, aA), dB = outDir(B, cb, A, aB);
      // rays start at the slot for along-axis ends (so a shorter straight run is allowed), at the aligned point for side exits
      const oA = ca.along ? sA : eA, oB = cb.along ? sB : eB, minR = 5 * ms;
      const w0 = { x: oB.x - oA.x, y: oB.y - oA.y }, cr = cross(dA, dB);
      const w = { x: eB.x - eA.x, y: eB.y - eA.y };
      let mid;
      if (Math.abs(cr) > 1e-6) {
        const u = cross(w0, dB) / cr, v = cross(w0, dA) / cr;
        if (u >= (ca.along ? minR : -0.5) && v >= (cb.along ? minR : -0.5)) {
          const X = add(oA, dA, Math.max(0, u));
          if (ca.along) eA = X; if (cb.along) eB = X;
          mid = [X];
        } else mid = cornerPts(eA, eB, weight[A] >= weight[B]).slice(1, -1);
      } else {
        if (dot(dA, dB) > 0.99 && Math.abs(cross(w, dA)) >= 0.5) {
          // both ends leave the same way (a branch doubling back): two right-angle turns,
          // out past the farther stub, across, and back in
          const t = Math.max(dot(eA, dA), dot(eB, dA));
          eA = add(oA, dA, t - dot(oA, dA)); eB = add(oB, dB, t - dot(oB, dB));
          mid = [];
        } else if (LY.Z_TURN && LY.Z_TURN[A + '>' + B] && dot(dA, dB) < -0.99) {
          const z = LY.Z_TURN[A + '>' + B];
          let t = dot(oA, dA) + (typeof z === 'number' ? z : 0.5) * (dot(oB, dA) - dot(oA, dA));
          // nest beside another line's drop (ref leaves station `at` toward B): same spacing as at B's marker
          if (typeof z === 'object' && slot[z.at][z.ref] && slot[B][z.ref]) {
            const P = LY.BY_ID[z.at], Q = LY.BY_ID[B];
            const stubP = Math.min(18 * ms, 0.3 * Math.hypot(Q.x - P.x, Q.y - P.y));
            const off = Math.abs(cross({ x: sB.x - slot[B][z.ref].x, y: sB.y - slot[B][z.ref].y }, dA));
            t = dot(slot[z.at][z.ref], dA) - stubP - off;
          }
          eA = add(oA, dA, t - dot(oA, dA)); eB = add(oB, dA, t - dot(oB, dA));
          mid = [];
        } else mid = Math.abs(cross(w, dA)) < 0.5 ? [] : cornerPts(eA, eB, weight[A] >= weight[B]).slice(1, -1);
      }
      edges.push({ eA, eB, alongA: ca.along, alongB: cb.along, mid });
    }
    const poly = [], stIdx = [];
    const push = (p) => { const q = poly[poly.length - 1]; if (!q || Math.hypot(q.x - p.x, q.y - p.y) > 0.3) poly.push(p); };
    for (let i = 0; i < path.length; i++) {
      const sid = path[i], sp = slot[sid][id];
      if (!PASS[id].has(sid)) (stationPts[sid] = stationPts[sid] || []).push({ x: sp.x, y: sp.y, id, occ: !!(OCC[id] && OCC[id].has(sid)) });
      const inE = edges[i-1], outE = edges[i];
      if (inE) { push(inE.eA); inE.mid.forEach(push); push(inE.eB); }
      const inAlong = inE ? inE.alongB : true, outAlong = outE ? outE.alongA : true;
      // a line that starts or ends here always reaches its own dot, even when it leaves sideways
      if ((inAlong && outAlong) || !inE || !outE) { push(sp); stIdx[i] = poly.length - 1; }
      else stIdx[i] = Math.max(0, poly.length - (inE ? 1 : 0));
    }
    // a station passed by side exits has no vertex of its own: give it one where the line runs past its dot
    for (let i = 0; i < path.length; i++) {
      const sp = slot[path[i]][id], q = poly[stIdx[i]];
      if (Math.hypot(q.x - sp.x, q.y - sp.y) < 1) continue;
      const lo = i > 0 ? stIdx[i - 1] : 0, hi = i < path.length - 1 ? Math.min(poly.length - 1, stIdx[i] + 2) : poly.length - 1;
      let best = null, bd = Infinity;
      for (let k = lo; k < hi; k++) {
        const P = poly[k], Q = poly[k + 1], L2 = (Q.x - P.x) ** 2 + (Q.y - P.y) ** 2;
        const t = L2 ? clamp(((sp.x - P.x) * (Q.x - P.x) + (sp.y - P.y) * (Q.y - P.y)) / L2, 0, 1) : 0;
        const X = { x: P.x + (Q.x - P.x) * t, y: P.y + (Q.y - P.y) * t }, dd = Math.hypot(X.x - sp.x, X.y - sp.y);
        if (dd < bd) { bd = dd; best = { k, t, X }; }
      }
      if (!best) continue;
      if (best.t < 1e-3) stIdx[i] = best.k;
      else if (best.t > 1 - 1e-3) stIdx[i] = best.k + 1;
      else { poly.splice(best.k + 1, 0, best.X); stIdx[i] = best.k + 1; for (let j = i + 1; j < path.length; j++) stIdx[j]++; }
    }
    lines[id] = { poly, stIdx };
  }
  const markers = {};
  for (const sid in stationPts) {
    const pts = stationPts[sid];
    let a = pts[0], b = pts[0], best = -1;
    for (const p of pts) for (const q of pts) { const d = (p.x-q.x)**2 + (p.y-q.y)**2; if (d > best) { best = d; a = p; b = q; } }
    const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y);
    markers[sid] = { pts, a, b, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys), cx: (a.x+b.x)/2, cy: (a.y+b.y)/2 };
  }
  cornerRadii(lines, 16 * ms);
  return { lines, markers, weight };
}

// Parallel lines turning together share one centre: the outer line's radius
// grows by its distance from the innermost line, so the gap stays constant
// through the bend instead of pinching/widening.
function cornerRadii(lines, R) {
  const cs = [];
  for (const id in lines) {
    const p = lines[id].poly, rad = lines[id].rad = new Array(p.length).fill(R);
    for (let i = 1; i < p.length - 1; i++) {
      const a = p[i-1], c = p[i], b = p[i+1];
      const v1 = unit({ x: c.x - a.x, y: c.y - a.y }), v2 = unit({ x: b.x - c.x, y: b.y - c.y });
      const dd = dot(v1, v2); if (dd > 0.999) continue;
      cs.push({ id, i, c, v1, v2, u: unit({ x: v2.x - v1.x, y: v2.y - v1.y }), k: Math.sqrt((1 + dd) / 2) });
    }
  }
  const same = (A, B) => (dot(A.v1, B.v1) > 0.999 && dot(A.v2, B.v2) > 0.999) || (dot(A.v1, B.v2) < -0.999 && dot(A.v2, B.v1) < -0.999);
  for (const A of cs) {
    let best = 0;
    for (const B of cs) {
      if (B === A || !same(A, B)) continue;
      const w = { x: B.c.x - A.c.x, y: B.c.y - A.c.y }, along = dot(w, A.u);
      if (Math.abs(cross(w, A.u)) > 2 || along <= 0 || along > 160) continue;
      best = Math.max(best, along);
    }
    lines[A.id].rad[A.i] = R + best * A.k;
  }
}

function polyD(poly, R, rad) {
  if (poly.length < 2) return '';
  let d = 'M' + poly[0].x.toFixed(1) + ' ' + poly[0].y.toFixed(1);
  // A curve may use most of a segment when the vertex at its other end is
  // straight (a station or line end); it only has to share it with another bend.
  const isBend = (j) => {
    if (j <= 0 || j >= poly.length - 1) return false;
    const a = poly[j-1], b = poly[j], c = poly[j+1];
    return Math.abs(cross(unit({ x: b.x - a.x, y: b.y - a.y }), unit({ x: c.x - b.x, y: c.y - b.y }))) > 0.01;
  };
  for (let i = 1; i < poly.length - 1; i++) {
    const p = poly[i-1], c = poly[i], q = poly[i+1];
    const v1x = c.x - p.x, v1y = c.y - p.y, v2x = q.x - c.x, v2y = q.y - c.y;
    const l1 = Math.hypot(v1x, v1y) || 1, l2 = Math.hypot(v2x, v2y) || 1;
    // rad is a true radius; the curve's reach along each segment is r·tan(turn/2),
    // so 45° and 90° bends share the same radius and parallel bends stay concentric.
    const cd = clamp((v1x * v2x + v1y * v2y) / (l1 * l2), -0.999, 1), tanHalf = Math.sqrt((1 - cd) / (1 + cd));
    const r = Math.min((rad ? rad[i] : R) * tanHalf, l1 * (isBend(i - 1) ? 0.5 : 0.85), l2 * (isBend(i + 1) ? 0.5 : 0.85));
    d += ' L' + (c.x - v1x / l1 * r).toFixed(1) + ' ' + (c.y - v1y / l1 * r).toFixed(1);
    d += ' Q' + c.x.toFixed(1) + ' ' + c.y.toFixed(1) + ' ' + (c.x + v2x / l2 * r).toFixed(1) + ' ' + (c.y + v2y / l2 * r).toFixed(1);
  }
  const e = poly[poly.length - 1];
  return d + ' L' + e.x.toFixed(1) + ' ' + e.y.toFixed(1);
}

function distSeg(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l = dx*dx + dy*dy || 1;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l, 0, 1);
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

function MapSVG({ route, from, to, onPickStation, visibleLines, focusTick, zoomCmd, density, lang, fontKey, here, centerHereTick, openCenterTick }) {
  const T = window.I18N, he = T.lang === 'he';
  const svgRef = React.useRef(null);
  const [mobile, setMobile] = React.useState(() => window.innerWidth < MOBILE_MAX);
  LY = mobile ? LAYOUT_M : LAYOUT_D;
  const [view, setViewRaw] = React.useState({ x: 0, y: 0, k: 1 });
  // Keep the map inside its bounds: an edge can reach the screen edge but not
  // pull away from it; if the map is smaller than the screen it stays centred.
  const clampView = (v) => {
    const svg = svgRef.current; if (!svg) return v;
    // The free map area is what the top bar and the bottom sheet leave uncovered, so the
    // map's edges may be pulled up to those UI edges (not just the screen edges); that
    // lets every part of the network be scrolled into view on small screens.
    const r = svg.getBoundingClientRect();
    const sheet = document.querySelector('[data-sheet]');
    const topUI = Math.min(window.UI.MAP_TOP_PAD + (window.safeTop ? window.safeTop() : 0), r.height * 0.25), botUI = sheet ? Math.min(Math.max(0, innerHeight - sheet.getBoundingClientRect().top), r.height * 0.6) : 0;
    const a = toUser(r.left, r.top + topUI), b = toUser(r.right, r.bottom - botUI);
    const ax = (lo, hi, pos, vlo, vhi, k = v.k) => {
      const s = (hi - lo) * k;
      if (s <= vhi - vlo) return (vlo + vhi) / 2 - (lo + hi) / 2 * k;
      return clamp(pos, vhi - hi * k, vlo - lo * k);
    };
    if (LY.mobile) {
      // phone: the map's width is pinned to the screen width; only vertical scrolling is free
      const l = toUser(r.left, 0), rr = toUser(r.right, 0), k = (rr.x - l.x) / LY.VB.w;
      return { k, x: l.x - LY.VB.x * k, y: ax(LY.BOUNDS.y0, LY.BOUNDS.y1, v.y, a.y, b.y, k) };
    }
    return { k: v.k, x: ax(LY.BOUNDS.x0, LY.BOUNDS.x1, v.x, a.x, b.x), y: ax(LY.BOUNDS.y0, LY.BOUNDS.y1, v.y, a.y, b.y) };
  };
  // Phone: the map is a tall element in the page and the page scrolls it, so the view
  // stays { k: 1, x: 0, y: 0 } (map units = svg user units) and "moving the view" means
  // scrolling the page: a target view with y = Y shows map y at the screen position
  // where (current) user y + Y would be, i.e. scroll by -Y user units.
  const pageScroll = (v, smooth) => {
    const nv = typeof v === 'function' ? v(viewRef.current) : v;
    const dy = -(nv.y - viewRef.current.y) * base;
    if (Math.abs(dy) > 0.5) window.scrollBy({ top: dy, behavior: smooth ? 'smooth' : 'instant' });
  };
  const setView = (v) => LY.mobile ? pageScroll(v, false) : setViewRaw(prev => clampView(typeof v === 'function' ? v(prev) : v));
  const [anim, setAnim] = React.useState(false);
  const [base, setBase] = React.useState(0.4);
  const [measured, setMeasured] = React.useState(false);   // base reflects the real size
  const [hoverId, setHoverId] = React.useState(null);
  const [selLine, setSelLine] = React.useState(null);
  const viewRef = React.useRef(view); viewRef.current = view;
  const gestureRef = React.useRef(null);
  const movedRef = React.useRef(false);

  React.useEffect(() => {
    const svg = svgRef.current;
    const ro = new ResizeObserver(() => {
      const r = svg.getBoundingClientRect(), mob = r.width < MOBILE_MAX, L = mob ? LAYOUT_M : LAYOUT_D;
      setMobile(mob);
      // phone: the map's width is the screen width (its height follows); desktop: fit
      setBase((mob ? r.width / L.VB.w : Math.min(r.width / L.VB.w, r.height / L.VB.h)) || 0.4);
      setMeasured(true);
    });
    ro.observe(svg); return () => ro.disconnect();
  }, []);
  React.useEffect(() => { if (route) setSelLine(null); }, [route]);
  // Phone: the bottom sheet's height, so the end of the network can scroll up above it
  const [sheetH, setSheetH] = React.useState(0);
  React.useEffect(() => {
    const sh = document.querySelector('[data-sheet]'); if (!sh) return;
    const upd = () => setSheetH(Math.round(Math.max(0, innerHeight - sh.getBoundingClientRect().top)));   // covered from its top edge down
    upd(); const ro = new ResizeObserver(upd); ro.observe(sh); return () => ro.disconnect();
  }, []);

  // Effective screen px per map unit drives line weight, marker and label size
  const e = base * view.k;
  const ms = Math.round(clamp(0.8 / e, 1, 1.9) * 20) / 20;
  const W = 5.5 * ms, GAP = 7.5 * ms;
  // Labels keep a constant ~14px on screen at every zoom (only capped when far zoomed out)
  const fs = LY.mobile ? 12.5 / e : clamp(14 / e, 2, 38);
  const visKey = [...visibleLines].sort().join(',');
  const geo = React.useMemo(() => buildGeometry(visibleLines, W, GAP, ms), [visKey, ms, mobile]);

  // "You are here": the map is schematic, so a GPS fix can't be drawn where it is.
  // Find the stretch of track (between two consecutive stations of a drawn line,
  // using the stations' real positions) closest to the user, and put the dot the
  // same fraction of the way along that stretch on the drawing; within 300 m of a
  // station it sits on the station. Express hops (a stretch that passes another
  // station on the way, e.g. Hof HaCarmel -> Herzliya) are skipped while a local
  // stretch is drawn: on the diagram their in-between stations aren't spaced as in
  // reality, so a fraction along them lands in the wrong place. The halo's radius is the uncertainty: the GPS
  // accuracy or the distance from the track, whichever is larger (none under 150 m).
  const herePt = React.useMemo(() => {
    const TT = window.TIMETABLE;
    if (!here || !TT || !TT.coords) return null;
    const real = {}; TT.stations.forEach((id, i) => { real[id] = TT.coords[i]; });
    const kx = 111.32 * Math.cos(here.lat * Math.PI / 180), ky = 110.57;      // km per degree
    const P = (lat, lon) => ({ x: lon * kx, y: lat * ky }), me = P(here.lat, here.lon);
    const stationPts = TT.stations.filter(id => LY.BY_ID[id]).map(id => ({ id, p: P(real[id][0], real[id][1]) }));
    let best = null, bestHop = null;
    for (const id of Object.keys(geo.lines)) {
      const path = PATHS[id];
      for (let i = 0; i < path.length - 1; i++) {
        const ra = real[path[i]], rb = real[path[i + 1]]; if (!ra || !rb) continue;
        const A = P(ra[0], ra[1]), B = P(rb[0], rb[1]), dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy;
        const t = L2 ? clamp(((me.x - A.x) * dx + (me.y - A.y) * dy) / L2, 0, 1) : 0;
        const d = Math.hypot(me.x - (A.x + t * dx), me.y - (A.y + t * dy));
        const cand = { d, t, id, i, km: Math.sqrt(L2) };
        // another station within 1.5 km of this stretch, between its ends: an express hop
        const hop = L2 > 0 && stationPts.some(({ id: c, p: C }) => {
          if (c === path[i] || c === path[i + 1]) return false;
          const tc = ((C.x - A.x) * dx + (C.y - A.y) * dy) / L2;
          return tc > 0.05 && tc < 0.95 && Math.hypot(C.x - (A.x + tc * dx), C.y - (A.y + tc * dy)) < 1.5;
        });
        if (hop) { if (!bestHop || d < bestHop.d) bestHop = cand; }
        else if (!best || d < best.d) best = cand;
      }
    }
    if (!best || best.d > 25) best = bestHop;                // only express lines drawn here
    if (!best || best.d > 25) return null;                   // not near the network
    const gl = geo.lines[best.id], path = PATHS[best.id];
    const pts = gl.poly.slice(gl.stIdx[best.i], gl.stIdx[best.i + 1] + 1);
    const segLen = pts.slice(1).reduce((s, q, k) => s + Math.hypot(q.x - pts[k].x, q.y - pts[k].y), 0);
    const unitsPerKm = best.km > 0 ? segLen / best.km : 0;
    const uncKm = Math.max((here.acc || 0) / 1000, best.d);
    const r = uncKm < 0.15 ? 0 : Math.min(uncKm * unitsPerKm, 400);
    // at a station?
    const alongKm = best.t * best.km;
    const atSt = alongKm < 0.3 ? path[best.i] : best.km - alongKm < 0.3 ? path[best.i + 1] : null;
    if (atSt && best.d < 0.3 && geo.markers[atSt]) return { x: geo.markers[atSt].cx, y: geo.markers[atSt].cy, r };
    // walk the drawn polyline to the same fraction of its length
    let want = best.t * segLen;
    for (let k = 0; k < pts.length - 1; k++) {
      const l = Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].y - pts[k].y);
      if (want <= l || k === pts.length - 2) {
        const f = l ? Math.min(1, want / l) : 0;
        return { x: pts[k].x + (pts[k + 1].x - pts[k].x) * f, y: pts[k].y + (pts[k + 1].y - pts[k].y) * f, r };
      }
      want -= l;
    }
    return pts.length ? { x: pts[0].x, y: pts[0].y, r } : null;
  }, [here, geo]);
  // Smooth movement: a new fix glides the dot (and its halo) from where it was over
  // ~0.9 s, easing out. A redraw of the map (zoom) moves it at once so it never lags
  // the lines; so do jumps of more than 400 map units and "Reduce motion".
  const [hereShown, setHereShown] = React.useState(null);
  const hereAnim = React.useRef({ raf: 0, fix: null, cur: null });
  React.useEffect(() => {
    const A = hereAnim.current; cancelAnimationFrame(A.raf);
    const newFix = A.fix !== here; A.fix = here;
    const from = A.cur, to = herePt;
    const still = () => { A.cur = to; setHereShown(to); };
    let rm = false; try { rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (err) {}
    if (!to || !from || !newFix || rm || Math.hypot(to.x - from.x, to.y - from.y) > 400) return still();
    const t0 = performance.now(), DUR = 900;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / DUR), f = 1 - Math.pow(1 - k, 3);
      A.cur = { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f, r: from.r + (to.r - from.r) * f };
      setHereShown(A.cur);
      if (k < 1) A.raf = requestAnimationFrame(step);
    };
    A.raf = requestAnimationFrame(step);
  }, [herePt]);
  React.useEffect(() => () => cancelAnimationFrame(hereAnim.current.raf), []);

  const toUser = (cx, cy) => {
    const svg = svgRef.current; const pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy; const r = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: r.x, y: r.y };
  };
  const toMap = (cx, cy) => { const u = toUser(cx, cy), v = viewRef.current; return { x: (u.x - v.x) / v.k, y: (u.y - v.y) / v.k }; };
  const clampK = (k) => clamp(k, 0.8, 7);
  const animTimer = React.useRef(null);
  const animateTo = (v) => { if (LY.mobile) return pageScroll(v, true); stopGlide(); setAnim(true); setView(v); clearTimeout(animTimer.current); animTimer.current = setTimeout(() => setAnim(false), 450); };
  const zoomAt = (m, factor, animated) => {
    touched.current = true;
    if (LY.mobile) return;
    const v = viewRef.current, nk = clampK(v.k * factor), r = nk / v.k;
    const nv = { x: m.x - (m.x - v.x) * r, y: m.y - (m.y - v.y) * r, k: nk };
    animated ? animateTo(nv) : setView(nv);
  };
  const visibleBox = () => {
    if (LY.mobile) {
      const sheet = document.querySelector('[data-sheet]'), sh = sheet ? Math.max(0, innerHeight - sheet.getBoundingClientRect().top) : 0;
      const a = toUser(16, window.UI.MAP_TOP_PAD + (window.safeTop ? window.safeTop() : 0)), b = toUser(innerWidth - 64, innerHeight - sh - 16);
      return { x: a.x, y: a.y, w: Math.max(50, b.x - a.x), h: Math.max(50, b.y - a.y) };
    }
    const rect = svgRef.current.getBoundingClientRect();
    const sheet = document.querySelector('[data-sheet]');
    const sh = sheet ? Math.max(0, innerHeight - sheet.getBoundingClientRect().top) : 0;
    const a = toUser(rect.left + 16, rect.top + window.UI.MAP_TOP_PAD + (window.safeTop ? window.safeTop() : 0)), b = toUser(rect.right - 64, rect.bottom - sh - 16);
    return { x: a.x, y: a.y, w: Math.max(50, b.x - a.x), h: Math.max(50, b.y - a.y) };
  };
  const fitBox = (bx) => {
    const vb = visibleBox();
    const k = clampK(Math.min(vb.w / bx.w, vb.h / bx.h));
    animateTo({ k, x: vb.x + vb.w/2 - (bx.x + bx.w/2) * k, y: vb.y + vb.h/2 - (bx.y + bx.h/2) * k });
  };
  const fitIds = (ids) => {
    const ps = ids.map(id => LY.BY_ID[id]);
    if (LY.mobile) {   // phone: just scroll the trip into the middle of the free area
      const ys = ps.map(p => p.y), cy = (Math.min(...ys) + Math.max(...ys)) / 2, vb = visibleBox(), k = viewRef.current.k;
      animateTo({ k, x: viewRef.current.x, y: vb.y + vb.h / 2 - cy * k });
      return;
    }
    const xs = ps.map(p=>p.x), ys = ps.map(p=>p.y);
    const x0 = Math.min(...xs) - 140, x1 = Math.max(...xs) + 140, y0 = Math.min(...ys) - 60, y1 = Math.max(...ys) + 60;
    fitBox({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  };

  // Default view: Tel Aviv. Phone: scroll its stations to the middle of the free area;
  // desktop: fit the Tel Aviv area (Herzliya - Holon - airport).
  const TLV_AREA = ['herzliya', 'bnei_brak', 'university', 'savidor', 'hashalom', 'hahagana', 'holon_jct', 'bengurion', 'kfar_habad'];
  const cityView = () => {
    const vb = visibleBox();
    if (LY.mobile) {
      // the phone map's zoom is pinned to the screen width (as in clampView)
      const r = svgRef.current.getBoundingClientRect(), l = toUser(r.left, 0), rr = toUser(r.right, 0), k = (rr.x - l.x) / LY.VB.w;
      const ys = ['university', 'hahagana'].map(id => LY.BY_ID[id].y), cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      return { k, x: l.x - LY.VB.x * k, y: vb.y + vb.h / 2 - cy * k };
    }
    const ps = TLV_AREA.map(id => LY.BY_ID[id]).filter(Boolean), xs = ps.map(p => p.x), ys = ps.map(p => p.y);
    const bx = { x: Math.min(...xs) - 120, y: Math.min(...ys) - 40, w: Math.max(...xs) - Math.min(...xs) + 240, h: Math.max(...ys) - Math.min(...ys) + 80 };
    const k = clampK(Math.min(vb.w / bx.w, vb.h / bx.h));
    return { k, x: vb.x + vb.w / 2 - (bx.x + bx.w / 2) * k, y: vb.y + vb.h / 2 - (bx.y + bx.h / 2) * k };
  };
  const homeView = () => {
    if (LY.mobile) return { k: 1, x: 0, y: 1e9 };   // clamped to: top of the network under the toolbar
    const rect = svgRef.current.getBoundingClientRect();
    const a = toUser(rect.left + 8, rect.top + 112), b = toUser(rect.right - 56, rect.bottom);
    const k = clampK((b.x - a.x) / 880);
    return { k, x: a.x - 60 * k, y: a.y + 10 * k };
  };
  const homed = React.useRef(false);
  // first view once the map has its real size (on the phone the page must be full length
  // before it can scroll there); a frame later so the new size is laid out
  React.useEffect(() => {
    if (homed.current || !measured) return;
    homed.current = true; requestAnimationFrame(() => setView(cityView()));
  }, [measured, base]);
  // switching between phone and desktop layouts starts again from the top of the network
  const lastMobile = React.useRef(mobile);
  React.useEffect(() => { if (lastMobile.current !== mobile) { lastMobile.current = mobile; setView(cityView()); } }, [mobile, base]);
  // Bring the "you are here" dot to the middle of the free map area (desktop also
  // zooms in to at least 2.5x, like map apps).
  const centerOnHere = () => {
    const vb = visibleBox(), k = LY.mobile ? viewRef.current.k : Math.max(viewRef.current.k, 2.5);
    const kk = clampK(k), cxu = vb.x + vb.w / 2, cyu = vb.y + vb.h / 2;   // screen-space centre (svg units)
    animateTo({ k: kk, x: cxu - herePt.x * kk, y: cyu - herePt.y * kk });
  };
  // Map button: show the planned trip; with none, the user's position; else the overview
  React.useEffect(() => {
    if (!focusTick) return;
    if (route && route.length > 1) fitIds(route.map(r => r.id));
    else if (herePt) centerOnHere();
    else animateTo(LY.mobile ? cityView() : homeView());   // phone: Tel Aviv; desktop: whole network
  }, [focusTick]);
  // Locate button in the From field
  React.useEffect(() => { if (centerHereTick && herePt) centerOnHere(); }, [centerHereTick]);
  // On opening: go to the user's dot, unless they've already moved the map or a trip is shown
  const touched = React.useRef(false);
  React.useEffect(() => {
    if (openCenterTick && herePt && !touched.current && !(route && route.length > 1)) centerOnHere();
  }, [openCenterTick]);
  React.useEffect(() => {
    if (!zoomCmd || !zoomCmd.n || LY.mobile) return;
    const vb = visibleBox();
    zoomAt({ x: vb.x + vb.w/2, y: vb.y + vb.h/2 }, zoomCmd.dir > 0 ? 1.6 : 1/1.6, true);
  }, [zoomCmd]);
  React.useEffect(() => {
    if (!route || route.length < 2) return;
    const t = setTimeout(() => fitIds(route.map(r => r.id)), 300);
    return () => clearTimeout(t);
  }, [route]);

  // Hit testing: nearest station within a generous screen radius, else nearest line
  const hitTest = (cx, cy) => {
    const p = toMap(cx, cy), ek = base * viewRef.current.k;
    let best = null, bd = Infinity;
    for (const s of LY.STATIONS) {
      const m = geo.markers[s.id]; if (!m) continue;
      const d = distSeg(p, m.a, m.b);
      if (d < bd) { bd = d; best = s.id; }
    }
    if (best && bd * ek < 22) return { station: best };
    let bl = null, bld = Infinity;
    for (const id in geo.lines) {
      const poly = geo.lines[id].poly;
      for (let i = 0; i < poly.length - 1; i++) { const d = distSeg(p, poly[i], poly[i+1]); if (d < bld) { bld = d; bl = id; } }
    }
    if (bl && bld * ek < 12) return { line: parentOf(bl) };
    return {};
  };

  const activePointers = React.useRef(new Map());
  // Inertia, following the usual platform conventions:
  //  - release speed from the last ~100 ms of moves; exponential slow-down, tau 325 ms
  //  - speed limits 0.08..6 px/ms (12 px/ms when flicks add up)
  //  - edges are elastic: dragging past an edge meets growing resistance (iOS-style
  //    rubber band) and a glide that reaches an edge overshoots a little; both spring
  //    back with a critically damped spring
  //  - a touch during a glide only catches it (it is not a tap); a flick made while
  //    still gliding the same way adds to the speed
  //  - "Reduce motion": no glide, no bounce
  const samples = React.useRef([]), glide = React.useRef(0), glideVel = React.useRef(null);
  const reduceMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const stopGlide = () => { cancelAnimationFrame(glide.current); glide.current = 0; glideVel.current = null; };
  React.useEffect(() => stopGlide, []);
  const userPerPx = () => { const a = toUser(0, 0), b = toUser(1, 1); return { ux: b.x - a.x, uy: b.y - a.y }; };
  // Rubber band: a pull of d (user units) past an edge shows as this much; dim = screen size in user units
  const rubber = (d, dim) => Math.sign(d) * (1 - 1 / (Math.abs(d) * 0.55 / dim + 1)) * dim;
  const elastic = (raw) => {                 // clamp, but let the edges give way elastically
    const c = clampView(raw);
    if (reduceMotion()) return c;
    const r = svgRef.current.getBoundingClientRect(), { ux, uy } = userPerPx();
    return { k: c.k,
      x: LY.mobile ? c.x : c.x + rubber(raw.x - c.x, r.width * ux),
      y: c.y + rubber(raw.y - c.y, r.height * uy) };
  };
  // Glide with speed (vx, vy) in screen px/ms from view `from` (default: current). Inside
  // the bounds speed decays; past an edge a spring pulls the map back. With zero speed
  // this just springs an over-pulled map back into place.
  const startGlide = (vx, vy, from) => {
    stopGlide();
    const { ux, uy } = userPerPx(), W = 0.02, K = W * W, D = 2 * W;   // spring: settles in ~0.3 s
    let cur = { ...(from || viewRef.current) }, vX = vx * ux, vY = vy * uy, last = performance.now();
    if (LY.mobile) vX = 0;
    const axis = (pos, vel, target, dt) => {
      const o = pos - target;
      if (Math.abs(o) < 1e-9) return [pos + vel * dt, vel * Math.exp(-dt / 325)];
      const acc = -K * o - D * vel, v2 = vel + acc * dt;   // spring past the edge
      return [pos + v2 * dt, v2];
    };
    const step = (now) => {
      const dt = Math.min(32, now - last); last = now;
      const c = clampView(cur);
      let [x, nvx] = axis(cur.x, vX, c.x, dt), [y, nvy] = axis(cur.y, vY, c.y, dt);
      // entering the bounds while springing back: land exactly on the edge
      const c2 = clampView({ ...cur, x, y });
      if (Math.abs(cur.x - c.x) > 1e-9 && Math.sign(x - c2.x) !== Math.sign(cur.x - c.x)) { x = c2.x; nvx = 0; }
      if (Math.abs(cur.y - c.y) > 1e-9 && Math.sign(y - c2.y) !== Math.sign(cur.y - c.y)) { y = c2.y; nvy = 0; }
      if (LY.mobile) x = c2.x;
      vX = nvx; vY = nvy; cur = { k: c.k, x, y }; setViewRaw(cur);
      glideVel.current = { vx: vX / ux, vy: vY / uy };
      const out = Math.abs(x - c2.x) + Math.abs(y - c2.y);
      const moving = Math.hypot(vX / ux, vY / uy) > 0.01;
      if (moving || out > 0.5 * Math.abs(uy)) glide.current = requestAnimationFrame(step);
      else { glide.current = 0; glideVel.current = null; setViewRaw(clampView(cur)); }
    };
    glide.current = requestAnimationFrame(step);
  };
  const caught = React.useRef(null);         // { vx, vy, t } of a glide this touch stopped
  // Phone: dragging is native page scrolling; the handlers only recognise taps.
  const tapRef = React.useRef(null);
  const onPD = (e) => {
    touched.current = true;
    if (LY.mobile) { tapRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; return; }
    caught.current = glide.current ? { ...(glideVel.current || { vx: 0, vy: 0 }), t: e.timeStamp } : null;
    stopGlide(); samples.current = [{ t: e.timeStamp, x: e.clientX, y: e.clientY }];
    // keep receiving moves even when the finger/mouse slides over the toolbar or sheet
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setAnim(false);
    if (activePointers.current.size === 1) {
      movedRef.current = false;
      gestureRef.current = { type:'pan', sx: e.clientX, sy: e.clientY, start: toUser(e.clientX, e.clientY), view: { ...viewRef.current } };
    } else if (activePointers.current.size === 2 && !LY.mobile) {
      movedRef.current = true;
      const [a, b] = [...activePointers.current.values()];
      gestureRef.current = { type:'pinch', dist: Math.hypot(a.x-b.x, a.y-b.y), view:{ ...viewRef.current } };
    }
  };
  const onPM = (e) => {
    if (LY.mobile) { const t = tapRef.current; if (t && Math.hypot(e.clientX - t.x, e.clientY - t.y) > 8) tapRef.current = null; return; }
    if (!activePointers.current.has(e.pointerId)) {
      if (e.pointerType === 'mouse') { const h = hitTest(e.clientX, e.clientY); setHoverId(h.station || (h.line ? 'line:' + h.line : null)); }
      return;
    }
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gestureRef.current; if (!g) return;
    if (g.type === 'pan' && activePointers.current.size === 1) {
      samples.current.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
      if (samples.current.length > 12) samples.current.shift();
      if (Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 6) movedRef.current = true;
      if (!movedRef.current) return;
      const p = toUser(e.clientX, e.clientY);
      setViewRaw(elastic({ ...g.view, x: g.view.x + p.x - g.start.x, y: g.view.y + p.y - g.start.y }));
    } else if (g.type === 'pinch' && activePointers.current.size === 2) {
      const [a, b] = [...activePointers.current.values()];
      const m = toUser((a.x+b.x)/2, (a.y+b.y)/2);
      const nk = clampK(g.view.k * (Math.hypot(a.x-b.x, a.y-b.y) / g.dist)), r = nk / g.view.k;
      setView({ x: m.x - (m.x - g.view.x) * r, y: m.y - (m.y - g.view.y) * r, k: nk });
    }
  };
  const onPU = (e) => {
    if (LY.mobile) {
      const t = tapRef.current; tapRef.current = null;
      if (t && e.type === 'pointerup' && t.id === e.pointerId) {
        const h = hitTest(e.clientX, e.clientY);
        if (h.station) onPickStation(h.station);
        else if (h.line && !route) setSelLine(s => s === h.line ? null : h.line);
        else setSelLine(null);
      }
      return;
    }
    const wasTap = activePointers.current.size === 1 && !movedRef.current && e.type === 'pointerup';
    // a one-finger pan released while still moving: glide on
    const g0 = gestureRef.current, sm = samples.current;
    if (g0 && g0.type === 'pan' && activePointers.current.size === 1 && e.type === 'pointerup' && sm.length) {
      const prev = sm[sm.length - 1];
      // the lift point, unless the finger rested before lifting (then it adds no speed)
      if (e.timeStamp - prev.t < 250 && (e.clientX !== prev.x || e.clientY !== prev.y))
        sm.push({ t: Math.max(e.timeStamp, prev.t + 1), x: e.clientX, y: e.clientY });
      const lastS = sm[sm.length - 1];
      const recent = sm.filter(q => q.t >= lastS.t - 100), firstS = recent[0];
      const dt = lastS.t - firstS.t, dist = Math.hypot(lastS.x - firstS.x, lastS.y - firstS.y);
      // a quick flick can be over before the drag threshold: apply its movement first
      let from = null;
      if (!movedRef.current && dist > 6) {
        const p = toUser(lastS.x, lastS.y);
        from = elastic({ ...g0.view, x: g0.view.x + p.x - g0.start.x, y: g0.view.y + p.y - g0.start.y });
        setViewRaw(from);
        movedRef.current = true;
      }
      // Forgiving release: a short rest before lifting (up to 250 ms) only softens
      // the glide instead of cancelling it, and slow flicks (from 0.08 px/ms) glide too.
      const rest = e.timeStamp - lastS.t;
      let vx = 0, vy = 0;
      if (movedRef.current && dt > 0 && rest < 250 && !reduceMotion()) {
        const soften = Math.exp(-rest / 200);
        vx = (lastS.x - firstS.x) / dt * soften; vy = (lastS.y - firstS.y) / dt * soften;
        // a flick made while still gliding the same way (caught < 400 ms ago) adds up
        const cg = caught.current, stack = cg && e.timeStamp - cg.t < 400 && cg.vx * vx + cg.vy * vy > 0;
        if (stack) { vx += cg.vx; vy += cg.vy; }
        const sp = Math.hypot(vx, vy), MAX = stack ? 12 : 6;   // px/ms; caps a violent flick
        if (sp > MAX) { vx *= MAX / sp; vy *= MAX / sp; }
        if (sp <= 0.08) vx = vy = 0;
      }
      // glide on, or (no speed) spring back if the map was pulled past an edge
      if (vx || vy) startGlide(vx, vy, from);
      else if (movedRef.current) startGlide(0, 0, from);
    } else if (g0 && g0.type === 'pan' && e.type !== 'pointerup' && activePointers.current.size === 1) {
      startGlide(0, 0);                      // cancelled touch: settle back inside the edges
    }
    samples.current = [];
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) gestureRef.current = null;
    if (activePointers.current.size === 1) {
      const [a] = [...activePointers.current.values()];
      gestureRef.current = { type:'pan', sx: a.x, sy: a.y, start: toUser(a.x, a.y), view: { ...viewRef.current } };
    }
    // not a tap: a quick flick (moved only at release), or a touch that caught a glide
    if (wasTap && !movedRef.current && !caught.current) {
      const h = hitTest(e.clientX, e.clientY);
      if (h.station) onPickStation(h.station);
      else if (h.line && !route) setSelLine(s => s === h.line ? null : h.line);
      else setSelLine(null);
    }
  };
  React.useEffect(() => {
    const svg = svgRef.current;
    // Pinch (trackpad, sent as ctrl+wheel) or ctrl/cmd+wheel zooms; plain scroll pans.
    const onWheel = (ev) => {
      touched.current = true;
      if (LY.mobile) return;                  // phone: the page scrolls natively
      ev.preventDefault(); setAnim(false); stopGlide();
      const unitPx = ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? 400 : 1;
      if ((ev.ctrlKey || ev.metaKey) && !LY.mobile) {
        zoomAt(toUser(ev.clientX, ev.clientY), Math.exp(-ev.deltaY * unitPx * 0.01), false);
        return;
      }
      const a = toUser(0, 0), b = toUser(1, 1); // user units per screen px
      const dx = (ev.shiftKey && !ev.deltaX ? ev.deltaY : ev.deltaX) * unitPx * (b.x - a.x);
      const dy = (ev.shiftKey && !ev.deltaX ? 0 : ev.deltaY) * unitPx * (b.y - a.y);
      setView(v => ({ ...v, x: v.x - (LY.mobile ? 0 : dx), y: v.y - dy }));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const routeSegments = React.useMemo(() => {
    if (!route || route.length < 2) return [];
    // One piece per stretch ridden along one line in one direction. A trip can stay on the
    // same line but turn back (ride past the destination on a train that doesn't stop
    // there, then back on another): that starts a new piece, or the drawing would only
    // span the first and last station and miss the ride out and back.
    const segs = [];
    const dirOf = (line, a, b) => { const p = PATHS[line]; return p ? Math.sign(p.indexOf(b) - p.indexOf(a)) : 0; };
    let cur = { line: route[1].line, ids: [route[0].id], dir: 0 };
    for (let i = 1; i < route.length; i++) {
      const step = route[i], d = dirOf(step.line, route[i - 1].id, step.id);
      if (i > 1 && (step.line !== cur.line || (cur.dir && d && d !== cur.dir))) {
        segs.push(cur); cur = { line: step.line, ids: [route[i - 1].id], dir: 0 };
      }
      if (d) cur.dir = d;
      cur.ids.push(step.id);
    }
    segs.push(cur);
    return segs;
  }, [route]);

  const routeNodeIds = new Set((route || []).map(r => r.id));
  const hasRoute = !!(route && route.length > 1);
  const focusLine = !hasRoute && selLine && visibleLines.has(selLine) ? selLine : null;
  const hoverLine = hoverId && hoverId.startsWith('line:') ? hoverId.slice(5) : null;
  const lineDim = (id) => hasRoute ? true : (focusLine ? parentOf(id) !== focusLine : false);
  const stationActive = (s) => hasRoute ? routeNodeIds.has(s.id)
    : (focusLine ? s.lines.includes(focusLine) || LINES.some(l => parentOf(l.id) === focusLine && window.MESILA.PATHS[l.id].includes(s.id)) : true);

  const th = density === 'dense' ? [0, 0] : density === 'sparse' ? [0.85, 1.4] : [0, 0.6];
  const showLabel = (s, vis) => {
    if (e >= th[1]) return true;
    if (e >= th[0]) return vis >= 2 || MAJOR.has(s.id);
    return MAJOR.has(s.id);
  };
  const halo = { paintOrder:'stroke', stroke:'var(--land)', strokeWidth: fs * 0.38, strokeLinejoin:'round' };
  const R = 16 * ms;
  // Colour dot fills most of the white marker interior (white radius = W/2 + 0.8ms)
  const DOT = W * 0.5 - 0.2 * ms;
  const geoText = { fontFamily:'var(--font)', pointerEvents:'none' };

  const selLineObj = focusLine ? LINES.find(l => l.id === focusLine) : null;

  // Label placement with collision avoidance. Label text stays ~14px on screen while
  // station spacing scales with zoom, so at some zooms neighbouring names would collide.
  // Each label tries: preferred side full name → preferred side short name → opposite
  // side full → opposite side short; if none fits it is hidden (unless it must show).
  const placeLabels = () => {
    const pad = 1.5 * ms, rr = W / 2 + 4 * ms, gapL = 4 * ms;
    const boxes = [];
    for (const s of LY.STATIONS) {           // station markers are obstacles too
      const m = geo.markers[s.id]; if (!m) continue;
      boxes.push({ id: s.id, x0: m.minX - rr, x1: m.maxX + rr, y0: m.minY - rr, y1: m.maxY + rr });
    }
    // big city names are obstacles as well, so station names step around them
    for (const [nm, cx, cy] of LY.CITY_LABELS) {
      const sz = fs * 1.25, txt = T.geo(nm), w = textW(txt, sz, 800) + (he ? 0 : fs * 0.18 * txt.length);
      boxes.push({ id: 'city:' + nm, x0: cx - w / 2, x1: cx + w / 2, y0: cy - sz * 0.75, y1: cy + sz * 0.2 });
    }
    const off = (b) => LY.mobile && (b.x0 < LY.VB.x + 2 || b.x1 > LY.VB.x + LY.VB.w - 2);
    // On a phone, names must also stay off the line strokes themselves
    const segs = [];
    if (LY.mobile) for (const id in geo.lines) { const P = geo.lines[id].poly; for (let i = 0; i < P.length - 1; i++) segs.push([P[i], P[i + 1]]); }
    const segHit = (b, m) => {
      const x0 = b.x0 - W * 0.3, x1 = b.x1 + W * 0.3, y0 = b.y0 - W * 0.3, y1 = b.y1 + W * 0.3;
      // the station's own legs start at its marker; a name sitting beside them is fine
      const near = (pt) => m && pt.x >= m.minX - rr - 2 && pt.x <= m.maxX + rr + 2 && pt.y >= m.minY - rr - 2 && pt.y <= m.maxY + rr + 2;
      for (const [p, q] of segs) {
        if (near(p) || near(q)) continue;           // Liang–Barsky clip of the segment against the box
        let t0 = 0, t1 = 1; const dx = q.x - p.x, dy = q.y - p.y; let ok = true;
        for (const [pp, qq] of [[-dx, p.x - x0], [dx, x1 - p.x], [-dy, p.y - y0], [dy, y1 - p.y]]) {
          if (pp === 0) { if (qq < 0) { ok = false; break; } continue; }
          const r = qq / pp;
          if (pp < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; }
        }
        if (ok && t0 <= t1) return true;
      }
      return false;
    };
    let strict = true;
    const hit = (b, own, m) => off(b) || (strict && segHit(b, m)) || boxes.some(o => o.id !== own && b.x0 < o.x1 && o.x0 < b.x1 && b.y0 < o.y1 && o.y0 < b.y1);
    const OPP = { l:'r', r:'l', t:'b', b:'t' };
    const items = [];
    for (const s of LY.STATIONS) {
      const m = geo.markers[s.id]; if (!m) continue;
      const vis = geo.weight[s.id];
      const isEnd = s.id === from || s.id === to, hot = hoverId === s.id;
      const inRoute = routeNodeIds.has(s.id);
      const onFocus = !!(focusLine && s.lines.includes(focusLine));
      const forced = isEnd || hot || inRoute || onFocus;
      if (!(showLabel(s, vis) || forced)) continue;
      const pri = forced ? 0 : MAJOR.has(s.id) ? 1 : vis >= 2 ? 2 : 3;
      items.push({ s, m, vis, isEnd, hot, forced, pri });
    }
    items.sort((a, b) => a.pri - b.pri);
    const out = [];
    for (const it of items) {
      const { s, m } = it;
      const size = fs * (it.vis >= 2 || it.isEnd ? 1.04 : 0.96), weight = it.isEnd || it.hot ? 600 : 500;
      const full = T.station(s.id);
      let short = he ? T.stationShortHe(s.id) : (SHORT[s.id] || s.name.replace(CITY_PREFIX, ''));
      if (LY.mobile) short = (he ? SHORT_M_HE[s.id] : SHORT_M[s.id]) || short;
      const names = LY.mobile ? (FORCE_SHORT_M.has(s.id) ? [short] : short !== full ? [full, short] : [full])
        : e >= 1 && short !== full ? [full, short] : [e >= 1 ? full : short];
      const pref = LY.LABEL_SIDE[s.id] || 'r';
      const tries = [];
      for (const side of [pref, OPP[pref]]) for (const name of names) tries.push({ side, name });
      const geomOf = ({ side, name }) => {
        const w = textW(name, size, weight);
        const x = side === 'r' ? m.maxX + rr + gapL : side === 'l' ? m.minX - rr - gapL : m.cx;
        const y = side === 't' ? m.minY - rr - gapL : side === 'b' ? m.maxY + rr + gapL + size * 0.75 : m.cy + size * 0.36;
        const anchor = side === 'r' ? 'start' : side === 'l' ? 'end' : 'middle';
        const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
        return { x, y, anchor, name, box: { id: s.id, x0: x0 - pad, x1: x0 + w + pad, y0: y - size * 0.78 - pad, y1: y + size * 0.24 + pad } };
      };
      let pick = null;
      for (const t of tries) { const g = geomOf(t); if (!hit(g.box, s.id, m)) { pick = g; break; } }
      // phone: rather than hide a name, let it sit over a line (its halo keeps it readable)
      if (!pick && LY.mobile) { strict = false; for (const t of tries) { const g = geomOf(t); if (!hit(g.box, s.id, m)) { pick = g; break; } } strict = true; }
      if (!pick && it.forced) pick = geomOf(tries[0]);
      if (!pick) continue;
      boxes.push(pick.box);
      out.push({ id: s.id, x: pick.x, y: pick.y, anchor: pick.anchor, name: pick.name, size, weight, active: stationActive(s) });
    }
    return out;
  };

  // Phone: the whole network as one tall drawing, with room above it for the top bar
  // and below it for the bottom sheet, so both ends can scroll fully into view.
  const padTopU = (window.UI.MAP_TOP_PAD + (window.safeTop ? window.safeTop() : 0)) / base, padBotU = sheetH / base;
  const mobileVB = `${LY.VB.x} ${LY.VB.y - padTopU} ${LY.VB.w} ${LY.VB.h + padTopU + padBotU}`;
  const mobileH = Math.round((LY.VB.h + padTopU + padBotU) * base);

  return (
    <>
    <svg ref={svgRef}
      viewBox={LY.mobile ? mobileVB : `${LY.VB.x} ${LY.VB.y} ${LY.VB.w} ${LY.VB.h}`}
      preserveAspectRatio="xMidYMid meet"
      style={LY.mobile
        ? { direction:'ltr', width:'100%', height: mobileH, display:'block', touchAction:'pan-y', background:'var(--outside)' }
        : { direction:'ltr', width:'100%', height:'100%', display:'block', touchAction:'none', background:'var(--outside)', cursor: hoverId ? 'pointer' : 'grab' }}
      onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerCancel={onPU}
      onPointerLeave={() => setHoverId(null)}>
      <g style={{ transform:`translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin:'0 0', transition: anim ? 'transform 420ms cubic-bezier(.2,.7,.2,1)' : 'none' }}>
        {/* Geography */}
        {LY.mobile ? (
          <g>
            <rect x="-1500" y="-1500" width="4000" height="6000" fill="var(--land)"/>
            <rect x="-1500" y="-1500" width="1506" height="6000" fill="var(--sea)"/>
            <path d="M 6 -1500 L 6 4500" stroke="var(--coast)" strokeWidth="2" fill="none"/>
          </g>
        ) : (<>
        <rect x="-1500" y="-1500" width="4000" height="5000" fill="var(--outside)"/>
        <path d={SEA_D} fill="var(--sea)"/>
        <path d={GULF_D} fill="var(--sea)"/>
        <path d={LAND_D} fill="var(--land)" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="1 0"/>
        <path d="M 200 -40 L 200 1800" fill="none" stroke="var(--coast)" strokeWidth="3" strokeLinejoin="round"/>
        <path d="M 900 290 L 900 380 L 930 410 L 930 1340" fill="none" stroke="var(--sea-deep)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <ellipse cx="900" cy="245" rx="22" ry="44" fill="var(--sea)" stroke="var(--coast)" strokeWidth="1.5"/>
        <rect x="912" y="1330" width="38" height="460" rx="19" fill="var(--sea)" stroke="var(--coast)" strokeWidth="1.5"/>
        <g style={geoText}>
          <text x="95" y="1150" transform="rotate(-90 95 1150)" textAnchor="middle" fontSize="22" fontStyle="italic" fontWeight="500" letterSpacing={he ? 0 : 4} fill="var(--sea-ink)">{T.geo('Mediterranean Sea')}</text>
          <text x="890" y="190" textAnchor="end" fontSize="11" fontStyle="italic" fill="var(--sea-ink)">{T.geo('Sea of Galilee')}</text>
          <text x="985" y="1560" transform="rotate(90 985 1560)" textAnchor="middle" fontSize="13" fontStyle="italic" fill="var(--sea-ink)">{T.geo('Dead Sea')}</text>
          <text x="874" y="2620" textAnchor="end" fontSize="12" fontStyle="italic" fill="var(--sea-ink)">{T.geo('Red Sea')}</text>
          {[['LEBANON',560,-46],['JORDAN',968,1000,90],['EGYPT',300,2080]].map(([n,x,y,r]) => (
            <text key={n} x={x} y={y} transform={r ? `rotate(${r} ${x} ${y})` : undefined} textAnchor="middle" fontSize="14" fontWeight="600" letterSpacing={he ? 0 : 6} fill="var(--geo-ink)">{T.geo(n)}</text>
          ))}
          {[['GALILEE',680,175],['SHARON',600,665],['NEGEV',620,2040]].map(([n,x,y]) => (
            <text key={n} x={x} y={y} textAnchor="middle" fontSize="16" fontWeight="600" letterSpacing={he ? 2 : 8} fill="var(--region-ink)" style={{ opacity: hasRoute ? 0.4 : 1 }}>{T.geo(n)}</text>
          ))}
          <circle cx={EILAT[0]} cy={EILAT[1]} r="4" fill="var(--geo-ink)"/>
          <text x={EILAT[0] - 10} y={EILAT[1] + 4} textAnchor="end" fontSize="13" fontWeight="500" fill="var(--geo-ink)">{T.geo('Eilat')}</text>
        </g>
        </>)}


        {/* Casings first so neighbouring lines in a bundle read as separate strokes */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {DRAW_ORDER.filter(id => geo.lines[id]).map(id => {
            const line = LINES.find(l => l.id === id);
            const dimmed = lineDim(id);
            const hot = hoverLine === parentOf(id) && !dimmed;
            const dd = polyD(geo.lines[id].poly, R, geo.lines[id].rad);
            return (
              <g key={id}>
              <path d={dd} stroke="var(--land)" strokeWidth={W + 3 * ms} opacity={dimmed ? 0.16 : 1}/>
              <path d={dd} stroke={line.color}
                strokeWidth={hot ? W + 1.5 * ms : W}
                opacity={dimmed ? 0.16 : 1} style={{ transition: 'opacity 250ms' }}/>
              {/* occasional track: hollow, a coloured outline around a pale fill of the same colour */}
              {line.ghost && <>
                <path d={dd} stroke="var(--land)" strokeWidth={(hot ? W + 1.5 * ms : W) - 2.4 * ms}/>
                <path d={dd} stroke={line.color} strokeWidth={(hot ? W + 1.5 * ms : W) - 2.4 * ms} opacity={(dimmed ? 0.16 : 1) * 0.35}/>
              </>}
              </g>
            );
          })}
        </g>

        {routeSegments.map((seg, i) => {
          const line = LINES.find(l => l.id === seg.line), gl = geo.lines[seg.line];
          if (!line || !gl) return null;
          const path = PATHS[seg.line];
          const a = path.indexOf(seg.ids[0]), b = path.indexOf(seg.ids[seg.ids.length - 1]);
          if (a < 0 || b < 0) return null;
          const lo = Math.min(a, b), hi = Math.max(a, b);
          const pts = gl.poly.slice(gl.stIdx[lo], gl.stIdx[hi] + 1);
          const d = polyD(pts, R, gl.rad.slice(gl.stIdx[lo], gl.stIdx[hi] + 1));
          return (
            <g key={i} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={d} stroke="var(--land)" strokeWidth={W + 7 * ms}/>
              <path d={d} stroke={line.color} strokeWidth={W + 2.5 * ms}/>
            </g>
          );
        })}

        {/* Station markers */}
        {LY.STATIONS.map(s => {
          const m = geo.markers[s.id]; if (!m) return null;
          const vis = geo.weight[s.id];
          const active = stationActive(s);
          const isFrom = s.id === from, isTo = s.id === to, isEnd = isFrom || isTo;
          const hot = hoverId === s.id;
          const color = LINES.find(l => l.id === s.lines.find(x => visibleLines.has(x)))?.color || '#333';
          const single = vis <= 1 && Math.hypot(m.a.x - m.b.x, m.a.y - m.b.y) < 0.5;
          const ln = { x1: m.a.x, y1: m.a.y, x2: m.b.x, y2: m.b.y, strokeLinecap: 'round' };
          const dots = m.pts.map((p, i) => p.occ
            ? <g key={i}><circle cx={p.x} cy={p.y} r={DOT - 0.55 * ms} fill="#fff"/>
                <circle cx={p.x} cy={p.y} r={DOT - 0.55 * ms} fill={LINES.find(l => l.id === p.id).color} fillOpacity={0.35} stroke={LINES.find(l => l.id === p.id).color} strokeWidth={1.1 * ms}/></g>
            : <circle key={i} cx={p.x} cy={p.y} r={DOT} fill={LINES.find(l => l.id === p.id).color}/>);
          const ring = isEnd ? 1 * ms : 0;   // a chosen start/end: the black outline twice as thick
          return (
            <g key={s.id} style={{ opacity: active ? 1 : 0.28, transition: 'opacity 250ms' }} pointerEvents="none">
              {single ? (
                // Same construction as interchange pills, just with one dot
                <g>
                  <circle cx={m.cx} cy={m.cy} r={(W + 7.6 * ms + ring * 2) / 2} fill="var(--land)"/>
                  <circle cx={m.cx} cy={m.cy} r={(W + (hot ? 4.6 : 3.6) * ms + ring * 2) / 2} fill="#1A1A1C"/>
                  <circle cx={m.cx} cy={m.cy} r={(W + 1.6 * ms) / 2} fill={isFrom ? '#1A1A1C' : s.closed ? '#8A8A8A' : '#fff'}/>
                  {isFrom && <circle cx={m.cx} cy={m.cy} r={DOT + 0.6 * ms} fill="#fff"/>}
                  {!s.closed && <circle cx={m.cx} cy={m.cy} r={DOT} fill={color}/>}
                </g>
              ) : (
                <g>
                  <line {...ln} stroke="var(--land)" strokeWidth={W + 7.6 * ms + ring * 2}/>
                  <line {...ln} stroke="#1A1A1C" strokeWidth={W + (hot ? 4.6 : 3.6) * ms + ring * 2}/>
                  <line {...ln} stroke={isFrom ? '#1A1A1C' : '#fff'} strokeWidth={W + 1.6 * ms}/>
                  {isFrom ? m.pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={DOT + 0.6 * ms} fill="#fff"/>) : null}
                  {dots}
                </g>
              )}
            </g>
          );
        })}

        {/* You are here: always on a line or a station, with a halo for uncertainty */}
        {hereShown && (
          <g pointerEvents="none">
            {hereShown.r > 0 && <circle cx={hereShown.x} cy={hereShown.y} r={hereShown.r} fill="#1A73E8" fillOpacity={0.14}
              stroke="#1A73E8" strokeOpacity={0.35} strokeWidth={1.2 / e}/>}
            <circle cx={hereShown.x} cy={hereShown.y} r={11 / e} fill="#1A73E8" opacity={0.25}>
              <animate attributeName="r" values={`${9 / e};${15 / e};${9 / e}`} dur="2.4s" repeatCount="indefinite"/>
            </circle>
            <circle cx={hereShown.x} cy={hereShown.y} r={8.5 / e} fill="#fff" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.35))' }}/>
            <circle cx={hereShown.x} cy={hereShown.y} r={6 / e} fill="#1A73E8"/>
          </g>
        )}

        {/* Station labels (drawn above all markers) */}
        <g pointerEvents="none" style={{ fontFamily:'var(--font)' }}>
          {placeLabels().map(L => (
            <text key={L.id} x={L.x} y={L.y} textAnchor={L.anchor}
              fontSize={L.size} fontWeight={L.weight}
              fill="var(--text)" opacity={L.active ? 1 : 0.35} style={halo}>{L.name}</text>
          ))}
        </g>

        <g pointerEvents="none" style={{ opacity: hasRoute || focusLine ? 0.35 : 1, transition:'opacity 280ms' }}>
          {LY.CITY_LABELS.map(([nm,x,y,a]) => (
            <text key={nm} x={x} y={y} textAnchor={a} fontSize={fs * 1.25} fontWeight="800" letterSpacing={he ? 0 : fs * 0.18} fill="var(--city-ink)" style={{ ...halo, fontFamily:'var(--font)' }}>{T.geo(nm)}</text>
          ))}
        </g>
      </g>
    </svg>
    {selLineObj && (
      <div style={{ position:'fixed', left: 12, right: 64, top: `calc(env(safe-area-inset-top, 0px) + ${window.UI.BELOW_TOP_ROW}px)`, zIndex: 4, display:'flex', justifyContent:'flex-start', pointerEvents:'none' }}>
        <div style={{ pointerEvents:'auto', display:'flex', alignItems:'center', gap: 10, padding:'6px 6px 6px 6px', borderRadius: 999, background:'var(--surface)', border:'1px solid var(--chip-border)', boxShadow:'0 4px 12px rgba(0,0,0,0.08)', animation:'fadeIn 180ms', maxWidth:'100%' }}>
          <span style={{ minWidth: 26, height: 26, padding:'0 6px', borderRadius: 13, background: selLineObj.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', font:'700 12px var(--font)', flexShrink: 0 }}>{selLineObj.num}</span>
          <span style={{ display:'flex', flexDirection:'column', minWidth: 0 }}>
            <span style={{ font:'600 13px var(--font)', color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{T.line(selLineObj.id)}</span>
            {/* key to the occasional-service marks, only for a line that has them */}
            {LINES.some(l => parentOf(l.id) === selLineObj.id && (l.ghost || OCC[l.id]?.size)) && (
              <span style={{ display:'flex', alignItems:'center', gap: 5, font:'500 11px var(--font)', color:'var(--text-dim)', whiteSpace:'nowrap' }}>
                <svg width="30" height="10" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <line x1="2" y1="5" x2="18" y2="5" stroke={selLineObj.color} strokeWidth="5" strokeLinecap="round"/>
                  <line x1="2" y1="5" x2="18" y2="5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"/>
                  <line x1="2" y1="5" x2="18" y2="5" stroke={selLineObj.color} strokeOpacity="0.35" strokeWidth="2.6" strokeLinecap="round"/>
                  <circle cx="25" cy="5" r="3" fill="#fff"/>
                  <circle cx="25" cy="5" r="3" fill={selLineObj.color} fillOpacity="0.35" stroke={selLineObj.color} strokeWidth="1.5"/>
                </svg>
                {T.t('occasional')}
              </span>
            )}
          </span>
          <button onClick={() => fitIds(PATHS[selLineObj.id])} style={{ border:'1px solid var(--chip-border)', background:'var(--chip-bg)', borderRadius: 999, padding:'4px 10px', font:'600 12px var(--font)', color:'var(--text)', cursor:'pointer', flexShrink: 0 }}>{T.t('show')}</button>
          <button onClick={() => setSelLine(null)} title={T.t('clear')} aria-label={T.t('clear')} style={{ width: 26, height: 26, borderRadius: 13, border:'none', background:'var(--chip-bg)', color:'var(--text)', cursor:'pointer', fontSize: 15, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>
      </div>
    )}
    </>
  );
}

window.MapSVG = MapSVG;
