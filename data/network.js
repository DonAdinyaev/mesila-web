// Israel Railways network — schematic on an octolinear grid.
// Lines, stops and colours follow the official Israel Railways line map (Nov 2026).
// Layout units: x 0–1000, y -80–2000. North at top, coast on the left.
//
// PATHS list the stations each line STOPS at. A "~id" entry is a station the
// line passes through without stopping: it reserves a track there (so bundles
// stay tidy) but gets no dot, and routing ignores it.

window.MESILA = (() => {
  const LINES = [
    { id:'L1',  num:'1',  name:'Herzliya – Be’er Sheva (via Sharon & coast)', color:'#E3262D' },
    { id:'L2',  num:'2',  name:'Binyamina – Ashkelon',              color:'#1F2852' },
    { id:'L3',  num:'3',  name:'Nahariya – Modi’in',           color:'#B6D335', ink:'#1A1A1C' },
    { id:'L4',  num:'4',  name:'Nahariya – Be’er Sheva',       color:'#3A9C48' },
    { id:'L5',  num:'5',  name:'Karmiel – Be’er Sheva',        color:'#F29A2E' },
    { id:'L6',  num:'6',  name:'Netanya – Beit Shemesh',            color:'#5CAEE0' },
    { id:'L7',  num:'7',  name:'Karmiel – Hof HaCarmel',            color:'#8C1F48' },
    { id:'L8',  num:'8',  name:'Atlit – Beit She’an',          color:'#B97CB8' },
    { id:'L10', num:'10', name:'Lod – Rishon LeZion HaRishonim',    color:'#7E3CA6' },
    { id:'L11', num:'11', name:'Be’er Sheva – Dimona',         color:'#A06E3C' },
    { id:'L12', num:'12', name:'Modi’in – Jerusalem',          color:'#C2679F' },
    { id:'HS',  num:'HS', name:'Herzliya – Jerusalem',              color:'#F2A0C8', ink:'#1A1A1C' },
    { id:'E',   num:'E',  name:'Hadera East – Rosh Ha’Ayin (Eastern Railway)', color:'#0C7F63' },
    { id:'N1',  num:'N1', name:'Night: Nahariya – Modi’in',    color:'#24A69A' },
    { id:'N2',  num:'N2', name:'Night: Herzliya – Jerusalem',       color:'#24A69A' },
  ];

  const S = [];
  const add = (id, name, x, y, extra) => { S.push({ id, name, x, y, lines: [], ...(extra || {}) }); };

  // Coastal trunk (x = 380)
  add('nahariya',    'Nahariya',                    380, 0);
  add('akko',        'Akko',                        380, 60);
  add('k_motzkin',   'Kiryat Motzkin',              380, 140);
  add('k_hayim',     'Kiryat Hayim',                380, 175);
  add('hutzot',      'Hutzot HaMifratz',            380, 210);
  add('merkazit',    'HaMifratz Central',           380, 245);
  add('hashmona',    'Haifa Center – HaShmona',     380, 315);
  add('bat_galim',   'Haifa – Bat Galim',           380, 360);
  add('hof_carmel',  'Haifa – Hof HaCarmel',        380, 405);
  add('atlit',       'Atlit',                       380, 450);
  add('binyamina',   'Binyamina',                   380, 500);
  add('caesarea',    'Caesarea – Pardes Hanna',     380, 545);
  add('hadera',      'Hadera – West',               380, 590);
  add('netanya',     'Netanya',                     380, 635);
  add('sapir',       'Netanya – Sapir',             380, 675);
  add('beit_yh',     'Beit Yehoshu’a',         380, 715);
  add('herzliya',    'Herzliya',                    380, 755);
  add('university',  'Tel Aviv – University – Expo', 380, 835);
  add('savidor',     'Tel Aviv – Savidor Center',   380, 870);
  add('hashalom',    'Tel Aviv – HaShalom',         380, 905);
  add('hahagana',    'Tel Aviv – HaHagana',         380, 940);

  // Karmiel branch — joins the coast at Kiryat Motzkin
  add('ahihud',      'Ahihud',                      520, 95);
  add('karmiel',     'Karmiel',                     660, 95);

  // Jezreel Valley — leaves the coast at HaMifratz Central
  add('yoknaam',     'Yokne’am – Kfar Yehoshu’a', 480, 200);
  add('migdal',      'Migdal HaEmek – Kfar Baruch', 600, 270);
  add('afula',       'Afula',                       700, 340);
  add('beit_shean',  'Beit She’an – David Levy', 805, 340);

  // Eastern Railway (opened June 2026)
  add('hadera_e',    'Hadera – East',               520, 590);
  add('shomron',     'Shomron – Tayibe',            840, 650);
  add('tira',        'Tira – Kokhav Ya’ir',    840, 705);

  // Sharon loop
  add('raanana_w',   'Ra’anana – West',        480, 755);
  add('raanana_s',   'Ra’anana – South',       580, 755);
  add('hod_hash',    'Hod HaSharon – Sokolov',      690, 755);
  add('kfar_saba',   'Kfar Saba – Nordau',          790, 755);
  add('rosh_ayin',   'Rosh Ha’Ayin – North',   840, 775);
  add('ptkv_sgula',  'Petah Tikva – Sgula',         780, 800);
  add('ptkv_arye',   'Petah Tikva – Kiryat Arye',   680, 800);
  add('bnei_brak',   'Bnei Brak',                   480, 800);

  // Airport / Modi'in and the line to Jerusalem
  add('bengurion',   'Ben Gurion Airport',          500, 1010);
  add('paatei',      'Pa’atei Modi’in',   620, 1010);
  add('modiin',      'Modi’in – Center',       710, 1010);
  add('yitzhak_nav', 'Jerusalem – Yitzhak Navon',   770, 1095);

  // South coast: continues the coastal trunk straight down (x = 380)
  add('holon_jct',   'Holon Junction',              380, 1080);
  add('holon_wolf',  'Holon – Wolfson',             380, 1130);
  add('by_yoseftal', 'Bat Yam – Eli Cohen – Yoseftal', 380, 1180);
  add('by_komem',    'Bat Yam – Komemiyut',         380, 1230);
  add('rz_dayan',    'Rishon LeZion – Moshe Dayan', 380, 1285);
  add('yavne_w',     'Yavne – West',                380, 1345);
  add('ashdod',      'Ashdod – Ad Halom',           380, 1530);
  add('ashkelon',    'Ashkelon',                    380, 1590);

  // Lod corridor (45° from HaHagana)
  add('kfar_habad',  'Kfar Habad',                  440, 1100);
  add('lod_gan',     'Lod – Ganei Aviv',            500, 1160);
  add('lod',         'Lod',                         560, 1260);
  add('rz_haris',    'Rishon LeZion – HaRishonim',  450, 1260);

  // Rehovot line (SW from Lod to Ashdod)
  add('beer_yaakov', 'Be’er Ya’akov',     500, 1340);
  add('rehovot',     'Rehovot',                     450, 1390);
  add('yavne_e',     'Yavne – East',                400, 1440);

  // Beit Shemesh (the line on to Jerusalem Malha is closed and not shown)
  add('ramla',       'Ramla',                       560, 1320);
  add('beit_shem',   'Beit Shemesh',                630, 1352);

  // South (x = 560)
  add('mazkeret',    'Mazkeret Batya',              560, 1400);
  add('kmalakhi',    'Kiryat Malakhi – Yoav',       560, 1480);
  add('kgat',        'Kiryat Gat',                  560, 1560);
  add('lehavim',     'Lehavim – Rahat',             560, 1660);
  add('bs_north',    'Be’er Sheva – North / University', 560, 1835);
  add('bs_center',   'Be’er Sheva – Center',   560, 1890);
  add('dimona',      'Dimona',                      680, 1955);

  // Western Negev (45° from Ashkelon)
  add('sderot',      'Sderot',                      400, 1675);
  add('netivot',     'Netivot',                     450, 1725);
  add('ofakim',      'Ofakim',                      500, 1775);


  // Phone layout: the same network re-drawn to fit a 400-unit-wide screen and
  // scroll only vertically. Coast trunk at x = 145 with its names on the left;
  // each eastern branch becomes a short step right and then its own strand down.
  const MOBILE = {
    nahariya:[145,0], akko:[145,45], k_motzkin:[145,115], k_hayim:[145,155], hutzot:[145,195], merkazit:[145,235],
    hashmona:[145,285], bat_galim:[145,325], hof_carmel:[145,365], atlit:[145,405], binyamina:[145,450],
    caesarea:[145,495], hadera:[145,540], netanya:[145,585], sapir:[145,625], beit_yh:[145,665], herzliya:[145,705],
    university:[145,1140], savidor:[145,1180], hashalom:[145,1220], hahagana:[145,1260],
    ahihud:[205,35], karmiel:[265,-25],
    yoknaam:[215,260], migdal:[215,305], afula:[215,350], beit_shean:[215,395],
    hadera_e:[225,540], shomron:[335,600], tira:[335,650],
    raanana_w:[300,745], raanana_s:[300,785], hod_hash:[300,825], kfar_saba:[300,865], rosh_ayin:[300,900],
    ptkv_sgula:[265,965], ptkv_arye:[230,1000], bnei_brak:[195,1035],
    bengurion:[200,1295], paatei:[275,1295], modiin:[325,1295], yitzhak_nav:[325,1360],
    holon_jct:[145,1340], holon_wolf:[145,1385], by_yoseftal:[145,1430], by_komem:[145,1475], rz_dayan:[145,1520],
    yavne_w:[145,1565], ashdod:[145,1725], ashkelon:[145,1770],
    kfar_habad:[235,1420], lod_gan:[265,1450], lod:[275,1500], rz_haris:[205,1500],
    beer_yaakov:[255,1575], rehovot:[220,1610], yavne_e:[185,1645],
    ramla:[275,1560], beit_shem:[332,1612],
    mazkeret:[275,1665], kmalakhi:[275,1720], kgat:[275,1800], lehavim:[275,1900], bs_north:[275,2050],
    bs_center:[275,2100], dimona:[335,2160],
    sderot:[175,1860], netivot:[205,1890], ofakim:[235,1920],
  };

  const HAIFA = ['merkazit','hashmona','bat_galim','hof_carmel'];
  const TLV = ['university','savidor','hashalom','hahagana'];

  const GEO = {
    L1:  ['herzliya','raanana_w','raanana_s','hod_hash','kfar_saba','rosh_ayin','ptkv_sgula','ptkv_arye','bnei_brak',
          ...TLV,'holon_jct','holon_wolf','by_yoseftal','by_komem','rz_dayan','yavne_w','ashdod','ashkelon',
          'sderot','netivot','ofakim','bs_north','bs_center'],
    L2:  ['binyamina','caesarea','hadera','netanya','sapir','beit_yh','herzliya', ...TLV,
          'kfar_habad','lod_gan','lod','beer_yaakov','rehovot','yavne_e','ashdod','ashkelon'],
    L3:  ['nahariya','akko','k_motzkin','k_hayim','hutzot', ...HAIFA,'atlit','binyamina','herzliya', ...TLV,
          'bengurion','paatei','modiin'],
    L4:  ['nahariya','akko','k_motzkin', ...HAIFA,'herzliya', ...TLV,'~kfar_habad','~lod_gan','lod',
          'ramla','mazkeret','kmalakhi','kgat','lehavim','bs_north','bs_center'],
    L5:  ['karmiel','ahihud','k_motzkin', ...HAIFA,'hadera','herzliya', ...TLV,'~kfar_habad','~lod_gan','lod',
          'kgat','bs_north','bs_center'],
    L6:  ['netanya','beit_yh','herzliya', ...TLV,'~kfar_habad','lod_gan','lod','ramla','beit_shem'],
    L7:  ['karmiel','ahihud','k_motzkin','k_hayim','hutzot', ...HAIFA],
    L8:  ['atlit','hof_carmel','bat_galim','hashmona','merkazit','yoknaam','migdal','afula','beit_shean'],
    L10: ['lod','rz_haris'],
    L11: ['bs_north','dimona'],
    L12: ['modiin','paatei','yitzhak_nav'],
    HS:  ['herzliya', ...TLV,'bengurion','yitzhak_nav'],
    E:   ['hadera_e','shomron','tira','rosh_ayin'],
    N1:  ['nahariya','akko','k_motzkin','hashmona','hof_carmel','binyamina','hadera','netanya','herzliya','savidor',
          '~hashalom','~hahagana','bengurion','modiin'],
    N2:  ['herzliya','savidor','~hashalom','~hahagana','bengurion','yitzhak_nav'],
  };
  // Geometry paths (passes stripped of "~") and the set of pass-through stations per line
  const GEO_PATHS = {}, PASS = {}, PATHS = {};
  for (const [id, p] of Object.entries(GEO)) {
    GEO_PATHS[id] = p.map(s => s.replace(/^~/, ''));
    PASS[id] = new Set(p.filter(s => s[0] === '~').map(s => s.slice(1)));
    PATHS[id] = p.filter(s => s[0] !== '~');
  }

  const byId = Object.fromEntries(S.map(s => [s.id, s]));
  for (const s of S) s.lines = LINES.map(l => l.id).filter(id => PATHS[id].includes(s.id));

  const inactive = new Set(LINES.filter(l => l.inactive).map(l => l.id));
  const graph = {};
  for (const s of S) graph[s.id] = [];
  for (const [lineId, path] of Object.entries(PATHS)) {
    if (inactive.has(lineId)) continue;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i+1];
      if (!byId[a] || !byId[b]) continue;
      const d = Math.hypot(byId[a].x - byId[b].x, byId[a].y - byId[b].y);
      graph[a].push({ to: b, line: lineId, cost: d });
      graph[b].push({ to: a, line: lineId, cost: d });
    }
  }

  // Dijkstra over (station, line) states so transfers are minimised correctly
  // allowed: optional Set of line ids the trip may use (the lines shown on the map)
  function route(from, to, allowed) {
    if (from === to) return null;
    const TRANSFER = 180;
    const dist = new Map(), prev = new Map(), done = new Set();
    const start = from + '|';
    dist.set(start, 0);
    const pq = [[0, from, null]];
    let goal = null;
    while (pq.length) {
      pq.sort((x, y) => x[0] - y[0]);
      const [c, u, ul] = pq.shift();
      const key = u + '|' + (ul || '');
      if (done.has(key)) continue;
      done.add(key);
      if (u === to) { goal = key; break; }
      for (const e of graph[u]) {
        if (allowed && !allowed.has(e.line)) continue;
        const nc = c + e.cost + (ul && ul !== e.line ? TRANSFER : 0);
        const nk = e.to + '|' + e.line;
        if (nc < (dist.has(nk) ? dist.get(nk) : Infinity)) {
          dist.set(nk, nc); prev.set(nk, { key, id: u }); pq.push([nc, e.to, e.line]);
        }
      }
    }
    if (!goal) return null;
    const path = [];
    let k = goal;
    while (k !== start) {
      const [id, line] = k.split('|');
      path.unshift({ id, line });
      k = prev.get(k).key;
    }
    path.unshift({ id: from, line: path[0]?.line || null });
    return path;
  }

  return { LINES, STATIONS: S, BY_ID: byId, PATHS, GEO_PATHS, PASS, MOBILE, route, RING: null };
})();
