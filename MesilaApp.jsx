import React, { useState, useMemo } from "react";

/* ============================================================
 *  MESILA — Israel Railways routing app
 *  Design mimics Yandex Metro's minimal, map-first UI.
 *  Single-file React artifact. Tailwind utility classes only.
 * ============================================================ */

// ---------- Line palette (matches Israel Railways map legend) -------------
const LINE = {
  red:    "#E84C40", // 1  — Ashkelon ↔ Binyamina ↔ Rosh HaAyin loop (Sharon)
  purple: "#7C3AED", // 2  — Ashkelon ↔ Binyamina (via coast)
  lime:   "#84CC16", // 3  — Nahariya ↔ Modi'in
  green:  "#22C55E", // 4  — Nahariya ↔ Be'er Sheva
  orange: "#F59E0B", // 5  — Karmiel ↔ Be'er Sheva
  blue:   "#3B82F6", // 6  — Netanya ↔ Beit Shemesh
  maroon: "#991B1B", // 7  — Karmiel ↔ Hof HaCarmel
  pink:   "#EC4899", // 8  — Atlit ↔ Beit She'an
  yellow: "#EAB308", // 9  — Beit Shemesh ↔ Malha
  violet: "#9333EA", // 10 — Rishon HaRishonim shuttle
  brown:  "#92400E", // 11 — Be'er Sheva ↔ Dimona
  black:  "#0F172A", // H  — High Speed: Tel Aviv ↔ Jerusalem
  night:  "#9CA3AF", // N  — Night line
};

// ---------- Stations: [x, y, Hebrew, English, isMajor] --------------------
// Coordinate system: viewBox 0 0 400 600 (portrait schematic).
const S = {
  // North
  nahariya:       { x: 150, y:  48, he: "נהריה",           en: "Nahariya",         major: true },
  akko:           { x: 150, y:  72, he: "עכו",              en: "Akko",             major: true },
  motzkin:        { x: 148, y:  96, he: "קרית מוצקין",     en: "Kiryat Motzkin",   major: false },
  hayim:          { x: 148, y: 108, he: "קרית חיים",       en: "Kiryat Hayim",     major: false },
  hutzot:         { x: 148, y: 120, he: "חוצות המפרץ",    en: "Hutzot HaMifratz", major: false },
  lev:            { x: 148, y: 132, he: "לב המפרץ",       en: "Lev HaMifratz",    major: false },
  haifa_center:   { x: 148, y: 144, he: "חיפה מרכז",      en: "Haifa Center",     major: true },
  bat_galim:      { x: 148, y: 156, he: "בת גלים",         en: "Bat Galim",        major: false },
  hof_hacarmel:   { x: 148, y: 172, he: "חוף הכרמל",     en: "Hof HaCarmel",     major: true },
  // Eastern arm (Karmiel)
  ahihud:         { x: 240, y:  82, he: "אחיהוד",          en: "Ahihud",           major: false },
  karmiel:        { x: 320, y:  82, he: "כרמיאל",          en: "Karmiel",          major: true },
  // Valley line
  yokneam:        { x: 220, y: 160, he: "יקנעם",           en: "Yokne'am",         major: false },
  migdal:         { x: 268, y: 172, he: "מגדל העמק",      en: "Migdal HaEmek",    major: false },
  afula:          { x: 310, y: 184, he: "עפולה",           en: "Afula",            major: true },
  beit_shean:     { x: 365, y: 200, he: "בית שאן",        en: "Beit She'an",      major: true },
  // Coast south
  atlit:          { x: 150, y: 196, he: "עתלית",           en: "Atlit",            major: false },
  binyamina:      { x: 150, y: 220, he: "בנימינה",         en: "Binyamina",        major: true },
  caesarea:       { x: 150, y: 244, he: "קיסריה",          en: "Caesarea",         major: false },
  hadera:         { x: 150, y: 264, he: "חדרה מערב",      en: "Hadera West",      major: true },
  netanya:        { x: 150, y: 292, he: "נתניה",           en: "Netanya",          major: true },
  netanya_sapir:  { x: 150, y: 308, he: "נתניה-ספיר",     en: "Netanya-Sapir",    major: false },
  beit_yehoshua:  { x: 150, y: 324, he: "בית יהושע",      en: "Beit Yehoshu'a",   major: false },
  herzliya:       { x: 150, y: 344, he: "הרצליה",          en: "Herzliya",         major: true },
  // Tel Aviv cluster
  university:     { x: 150, y: 368, he: "אוניברסיטה",     en: "University",       major: false },
  savidor:        { x: 150, y: 384, he: "סבידור מרכז",    en: "Savidor Center",   major: true },
  hashalom:       { x: 150, y: 398, he: "השלום",           en: "HaShalom",         major: true },
  hahagana:       { x: 150, y: 412, he: "ההגנה",           en: "HaHagana",         major: true },
  // Sharon loop (from HaHagana east)
  bnei_brak:      { x: 184, y: 400, he: "בני ברק",         en: "Bnei Brak",        major: false },
  pt_kiryat:      { x: 214, y: 390, he: "פ״ת קרית אריה",  en: "PT Kiryat Arye",   major: false },
  pt_sgula:       { x: 240, y: 382, he: "פ״ת סגולה",       en: "PT Sgula",         major: false },
  rosh_haayin:    { x: 270, y: 376, he: "ראש העין צפון",  en: "Rosh HaAyin N.",   major: true },
  kfar_saba:      { x: 272, y: 354, he: "כפר סבא נורדאו", en: "Kfar Saba Nordau", major: true },
  hod_hasharon:   { x: 248, y: 348, he: "הוד השרון",      en: "Hod HaSharon",     major: false },
  raanana_s:      { x: 222, y: 342, he: "רעננה דרום",     en: "Ra'anana South",   major: false },
  raanana_w:      { x: 196, y: 338, he: "רעננה מערב",     en: "Ra'anana West",    major: false },
  // South Tel Aviv / coast
  holon_j:        { x: 138, y: 432, he: "משתלם (הולון)",  en: "Holon Junction",   major: false },
  holon_w:        { x: 118, y: 446, he: "הולון וולפסון",   en: "Holon Wolfson",    major: false },
  bat_yam_y:      { x:  98, y: 460, he: "בת ים יוספטל",   en: "Bat Yam Yoseftal", major: false },
  bat_yam_k:      { x:  88, y: 475, he: "בת ים קוממיות",  en: "Bat Yam Komemiyut",major: false },
  rishon_m:       { x:  78, y: 492, he: "ראשון משה דיין", en: "Rishon Moshe Dayan",major:false },
  // Airport / Modi'in
  kfar_habad:     { x: 188, y: 442, he: "כפר חב\"ד",       en: "Kfar Habad",       major: false },
  ben_gurion:     { x: 228, y: 428, he: "נתב״ג",           en: "Ben Gurion Airport",major:true },
  paatei_modiin:  { x: 290, y: 438, he: "פאתי מודיעין",   en: "Pa'atei Modi'in",  major: false },
  modiin_center:  { x: 330, y: 440, he: "מודיעין מרכז",   en: "Modi'in Center",   major: true },
  // Lod / Rehovot / south
  lod:            { x: 218, y: 468, he: "לוד",              en: "Lod",              major: true },
  lod_ganei:      { x: 194, y: 478, he: "לוד גני אביב",    en: "Lod Ganei Aviv",   major: false },
  ramla:          { x: 232, y: 488, he: "רמלה",             en: "Ramla",            major: false },
  rishon_h:       { x: 150, y: 490, he: "ראשון הראשונים", en: "Rishon HaRishonim",major: false },
  beer_yaakov:    { x: 170, y: 502, he: "באר יעקב",       en: "Be'er Ya'akov",    major: false },
  rehovot:        { x: 148, y: 520, he: "רחובות",           en: "Rehovot",          major: true },
  mazkeret:       { x: 194, y: 514, he: "מזכרת בתיה",     en: "Mazkeret Batya",   major: false },
  yavne_east:     { x: 132, y: 538, he: "יבנה מזרח",      en: "Yavne East",       major: false },
  yavne_west:     { x:  80, y: 538, he: "יבנה מערב",      en: "Yavne West",       major: false },
  ashdod:         { x:  55, y: 554, he: "אשדוד עד הלום", en: "Ashdod",           major: true },
  ashkelon:       { x:  48, y: 578, he: "אשקלון",           en: "Ashkelon",         major: true },
  // South inland
  sderot:         { x:  92, y: 598, he: "שדרות",            en: "Sderot",           major: false },
  netivot:        { x: 138, y: 608, he: "נתיבות",           en: "Netivot",          major: false },
  ofakim:         { x: 184, y: 614, he: "אופקים",           en: "Ofakim",           major: false },
  // Be'er Sheva
  bs_north:       { x: 238, y: 600, he: "ב״ש צפון",         en: "BS North/Univ.",   major: true },
  bs_center:      { x: 250, y: 618, he: "ב״ש מרכז",         en: "Be'er Sheva",      major: true },
  lehavim:        { x: 210, y: 578, he: "להבים-רהט",       en: "Lehavim-Rahat",    major: false },
  kiryat_gat:     { x: 198, y: 548, he: "קרית גת",          en: "Kiryat Gat",       major: true },
  kiryat_malakhi: { x: 198, y: 524, he: "קרית מלאכי",      en: "Kiryat Malakhi",   major: false },
  // Jerusalem
  beit_shemesh:   { x: 290, y: 472, he: "בית שמש",          en: "Beit Shemesh",     major: true },
  biblical_zoo:   { x: 338, y: 478, he: "גן חיות תנ״כי",   en: "Biblical Zoo",     major: false },
  malha:          { x: 358, y: 490, he: "מלחה",             en: "Malha",            major: true },
  yitzhak_navon:  { x: 360, y: 452, he: "יצחק נבון",        en: "Yitzhak Navon",    major: true },
  // Dimona
  dimona:         { x: 330, y: 620, he: "דימונה",           en: "Dimona",           major: true },
};

// ---------- Lines (colored track polylines) -------------------------------
// Only the visual polylines live here; adjacency for routing is built below.
const ROUTES = [
  // Main coastal trunk (green / multi-color)
  { color: LINE.green,  width: 3,
    path: ["nahariya","akko","motzkin","hayim","hutzot","lev","haifa_center","bat_galim","hof_hacarmel",
           "atlit","binyamina","caesarea","hadera","netanya","netanya_sapir","beit_yehoshua","herzliya",
           "university","savidor","hashalom","hahagana","holon_j","holon_w","bat_yam_y","bat_yam_k","rishon_m"] },
  // Orange trunk (Karmiel to Be'er Sheva via Tel Aviv)
  { color: LINE.orange, width: 3, dash: null, offset: -5,
    path: ["karmiel","ahihud","motzkin","hayim","hutzot","lev","haifa_center","bat_galim","hof_hacarmel",
           "atlit","binyamina","hadera","netanya","herzliya","university","savidor","hashalom","hahagana",
           "kfar_habad","lod","kiryat_malakhi","kiryat_gat","lehavim","bs_north","bs_center"] },
  // Blue (Netanya <-> Beit Shemesh)
  { color: LINE.blue,   width: 3, offset: 5,
    path: ["netanya","herzliya","university","savidor","hashalom","hahagana","kfar_habad","lod","ramla","beit_shemesh"] },
  // Lime (Nahariya <-> Modi'in)
  { color: LINE.lime,   width: 3, offset: -10,
    path: ["nahariya","akko","motzkin","haifa_center","hof_hacarmel","binyamina","hadera","netanya","herzliya",
           "savidor","hashalom","hahagana","ben_gurion","paatei_modiin","modiin_center"] },
  // Purple (Ashkelon <-> Binyamina)
  { color: LINE.purple, width: 3, offset: 10,
    path: ["ashkelon","ashdod","yavne_west","rehovot","beer_yaakov","lod_ganei","hahagana","hashalom","savidor",
           "university","herzliya","netanya","hadera","binyamina"] },
  // Red (Sharon loop: Ashkelon -> TLV -> Rosh HaAyin)
  { color: LINE.red,    width: 3, offset: 15,
    path: ["ashkelon","ashdod","yavne_west","rehovot","beer_yaakov","lod_ganei","hahagana","hashalom","savidor",
           "bnei_brak","pt_kiryat","pt_sgula","rosh_haayin","kfar_saba","hod_hasharon","raanana_s","raanana_w","herzliya"] },
  // Maroon / "7" Karmiel <-> Hof HaCarmel
  { color: LINE.maroon, width: 3, offset: -15,
    path: ["karmiel","ahihud","motzkin","haifa_center","hof_hacarmel"] },
  // Pink / Valley line (Atlit <-> Beit She'an)
  { color: LINE.pink,   width: 3,
    path: ["atlit","hof_hacarmel","bat_galim","haifa_center","lev","yokneam","migdal","afula","beit_shean"] },
  // Yellow (Beit Shemesh <-> Malha)
  { color: LINE.yellow, width: 3,
    path: ["beit_shemesh","biblical_zoo","malha"] },
  // Black (Jerusalem high-speed)
  { color: LINE.black,  width: 3, dash: null,
    path: ["hahagana","ben_gurion","yitzhak_navon"] },
  // Violet / 10 (Rishon HaRishonim shuttle)
  { color: LINE.violet, width: 3,
    path: ["rishon_h","beer_yaakov","lod_ganei"] },
  // Brown / 11 (Dimona)
  { color: LINE.brown,  width: 3,
    path: ["bs_north","bs_center","dimona"] },
  // Night line (dashed gray)
  { color: LINE.night,  width: 2, dash: "3 3",
    path: ["nahariya","akko","haifa_center","hof_hacarmel","binyamina","hadera","netanya","herzliya","savidor",
           "hashalom","hahagana","holon_j","bat_yam_k","rehovot","yavne_west","ashdod","ashkelon","sderot","netivot","ofakim","bs_center"] },
];

// ---------- Graph for BFS routing -----------------------------------------
const ADJ = (() => {
  const g = {};
  for (const r of ROUTES) {
    for (let i = 0; i < r.path.length - 1; i++) {
      const a = r.path[i], b = r.path[i + 1];
      (g[a] ||= new Set()).add(b);
      (g[b] ||= new Set()).add(a);
    }
  }
  return g;
})();

function shortestPath(from, to) {
  if (from === to) return [from];
  const q = [[from]];
  const seen = new Set([from]);
  while (q.length) {
    const path = q.shift();
    const tail = path[path.length - 1];
    for (const n of ADJ[tail] || []) {
      if (seen.has(n)) continue;
      if (n === to) return [...path, n];
      seen.add(n);
      q.push([...path, n]);
    }
  }
  return [from, to];
}

// Very light "transfer" heuristic: count direction changes along the path.
function countTransfers(path) {
  if (path.length < 3) return 0;
  let transfers = 0;
  const dir = (a, b) => {
    const A = S[a], B = S[b];
    const dx = B.x - A.x, dy = B.y - A.y;
    const len = Math.hypot(dx, dy) || 1;
    return [dx / len, dy / len];
  };
  let prev = dir(path[0], path[1]);
  for (let i = 1; i < path.length - 1; i++) {
    const cur = dir(path[i], path[i + 1]);
    const dot = prev[0] * cur[0] + prev[1] * cur[1];
    if (dot < 0.5) transfers++;
    prev = cur;
  }
  return transfers;
}

// ---------- Localization --------------------------------------------------
const T = {
  he: {
    appName: "מסילה",
    tagline: "רכבת ישראל",
    min: "דק׳",
    noTransfers: "ללא החלפות",
    transfers: (n) => `${n} החלפות`,
    seeDetails: "ראה פרטים",
    from: "מוצא",
    to: "יעד",
    pick: "בחר תחנה",
    search: "חיפוש תחנה…",
    now: "יציאה עכשיו",
    swap: "החלף",
  },
  en: {
    appName: "Mesila",
    tagline: "Israel Railways",
    min: "min",
    noTransfers: "No transfers",
    transfers: (n) => `${n} transfer${n > 1 ? "s" : ""}`,
    seeDetails: "See details",
    from: "From",
    to: "To",
    pick: "Select a station",
    search: "Search station…",
    now: "Depart now",
    swap: "Swap",
  },
};

// ---------- Small components ---------------------------------------------
function Dot({ cx, cy, fill = "#fff", stroke = "#6B7280", r = 3 }) {
  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1.2} />;
}

function StationLabel({ x, y, text, lang, anchor = "start", fontSize = 7.5, bold = false }) {
  // Labels mirror around x for Hebrew — still rendered LTR in SVG to keep shaping.
  return (
    <text
      x={x}
      y={y}
      fontSize={fontSize}
      fontWeight={bold ? 700 : 500}
      fill="#1F2937"
      textAnchor={anchor}
      style={{ pointerEvents: "none", fontFamily: lang === "he" ? "'Segoe UI', 'Arial Hebrew', Arial, sans-serif" : "Inter, system-ui, sans-serif" }}
    >
      {text}
    </text>
  );
}

// Offset a polyline slightly perpendicular to reduce line overlap.
function polylinePoints(ids, offset = 0) {
  if (!offset) return ids.map((id) => `${S[id].x},${S[id].y}`).join(" ");
  // Compute per-segment perpendicular offset and average at vertices
  const pts = ids.map((id) => ({ x: S[id].x, y: S[id].y }));
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[i - 1] || pts[i];
    const next = pts[i + 1] || pts[i];
    const dx = next.x - prev.x, dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    out.push(`${pts[i].x + nx * offset},${pts[i].y + ny * offset}`);
  }
  return out.join(" ");
}

// ---------- Station Picker Modal -----------------------------------------
function StationPicker({ open, title, lang, onSelect, onClose }) {
  const [q, setQ] = useState("");
  if (!open) return null;
  const entries = Object.entries(S);
  const norm = (s) => s.toLowerCase().replace(/[׳"']/g, "");
  const filtered = entries.filter(([, v]) => {
    if (!q) return v.major;
    const needle = norm(q);
    return norm(v.en).includes(needle) || v.he.includes(q);
  });

  return (
    <div className="absolute inset-0 bg-black/30 z-40 flex items-end" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-white rounded-t-3xl max-h-[78%] flex flex-col shadow-2xl"
        style={{ animation: "slide-up 0.22s ease-out" }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="text-slate-400 text-sm">{title}</span>
          <button onClick={onClose} className="text-slate-400 text-2xl leading-none">×</button>
        </div>
        <div className="px-4 pb-3">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={T[lang].search}
            className="w-full bg-slate-100 rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="overflow-y-auto flex-1 pb-6">
          {filtered.map(([id, v]) => (
            <button
              key={id}
              onClick={() => { onSelect(id); onClose(); }}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 active:bg-slate-100 text-start"
            >
              <span className="w-2 h-2 rounded-full bg-blue-700" />
              <div className="flex-1">
                <div className="text-[15px] font-medium text-slate-900">{v[lang]}</div>
                <div className="text-xs text-slate-400">{v[lang === "he" ? "en" : "he"]}</div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-slate-400 text-sm">— {T[lang].pick} —</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Main App ------------------------------------------------------
export default function MesilaApp() {
  const [lang, setLang] = useState("he");
  const [from, setFrom] = useState("savidor");
  const [to, setTo]     = useState("hof_hacarmel");
  const [picker, setPicker] = useState(null); // "from" | "to" | null

  const path = useMemo(() => shortestPath(from, to), [from, to]);
  const transfers = useMemo(() => countTransfers(path), [path]);
  const duration = useMemo(() => Math.max(5, path.length * 4 + 2), [path]);

  const t = T[lang];
  const dir = lang === "he" ? "rtl" : "ltr";
  const swap = () => { const a = from; setFrom(to); setTo(a); };

  // Labeled stations: majors + anything on the highlighted path.
  const labeled = new Set(Object.entries(S).filter(([, v]) => v.major).map(([id]) => id));
  path.forEach((id) => labeled.add(id));

  const a = S[from], b = S[to];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 p-6 flex items-center justify-center" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        @keyframes slide-up { from { transform: translateY(100%);} to { transform: translateY(0);} }
        @keyframes dash-flow { to { stroke-dashoffset: -24; } }
        .route-line { stroke-dasharray: 6 4; animation: dash-flow 1.4s linear infinite; }
      `}</style>

      {/* Phone frame */}
      <div
        dir={dir}
        className="relative w-[390px] h-[844px] bg-white rounded-[54px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.35)] border-[10px] border-slate-900 overflow-hidden"
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-slate-900 rounded-b-2xl z-30" />

        {/* Status bar */}
        <div className="h-11 px-8 flex justify-between items-center text-[13px] font-semibold text-slate-900 relative z-10">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="tracking-tight">●●●●</span>
            <span>5G</span>
            <span className="w-6 h-2.5 border border-slate-900 rounded-sm relative ms-1 inline-block">
              <span className="absolute inset-0.5 bg-slate-900 rounded-[1px]" />
            </span>
          </span>
        </div>

        {/* App Header */}
        <div className="px-4 pb-3 flex items-center justify-between border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#003C7A] to-[#0057B7] flex items-center justify-center shadow-md">
              {/* Train silhouette logo */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 7a3 3 0 013-3h10a3 3 0 013 3v9a3 3 0 01-3 3H7a3 3 0 01-3-3V7z" stroke="white" strokeWidth="1.8" />
                <path d="M4 12h16" stroke="white" strokeWidth="1.8" />
                <circle cx="8" cy="15.5" r="1.2" fill="white" />
                <circle cx="16" cy="15.5" r="1.2" fill="white" />
                <path d="M9 20l-2 2M15 20l2 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-[17px] font-bold text-slate-900">{t.appName}</div>
              <div className="text-[10px] text-slate-500">{t.tagline}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "he" ? "en" : "he")}
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[12px] font-semibold text-slate-700 transition"
              aria-label="toggle language"
            >
              {lang === "he" ? "English" : "עברית"}
            </button>
          </div>
        </div>

        {/* MAP AREA */}
        <div className="relative h-[560px] bg-gradient-to-b from-[#F4F7FB] via-[#EEF3F9] to-[#E8EEF6]">
          {/* Subtle map background tinting */}
          <div className="absolute inset-0 opacity-50 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 30% 30%, #DBEAFE 0%, transparent 40%), radial-gradient(circle at 70% 80%, #FEF3C7 0%, transparent 45%)" }}
          />
          <svg viewBox="0 0 400 660" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Sea (Mediterranean on west) */}
            <path d="M0 0 L35 0 L28 60 L25 120 L32 200 L30 300 L15 400 L0 500 Z" fill="#DBEAFE" opacity="0.55" />
            <text x="12" y="260" fontSize="8" fill="#60A5FA" fontStyle="italic" transform="rotate(-90 12 260)" opacity="0.8">
              {lang === "he" ? "הים התיכון" : "Mediterranean"}
            </text>

            {/* Render all colored track lines (muted) */}
            {ROUTES.map((r, i) => (
              <polyline
                key={i}
                points={polylinePoints(r.path, r.offset || 0)}
                stroke={r.color}
                strokeWidth={r.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={r.dash || undefined}
                opacity={0.32}
              />
            ))}

            {/* Highlighted route shadow */}
            <polyline
              points={path.map((id) => `${S[id].x},${S[id].y}`).join(" ")}
              stroke="#111827"
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.08}
            />
            {/* Highlighted route line */}
            <polyline
              className="route-line"
              points={path.map((id) => `${S[id].x},${S[id].y}`).join(" ")}
              stroke="#003C7A"
              strokeWidth={4.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* All station dots */}
            {Object.entries(S).map(([id, v]) => (
              <Dot key={id} cx={v.x} cy={v.y} r={v.major ? 2.8 : 1.8} stroke="#94A3B8" />
            ))}

            {/* Selected station dots (darker) */}
            {path.map((id) => (
              <circle key={`sp-${id}`} cx={S[id].x} cy={S[id].y} r={3} fill="#003C7A" />
            ))}

            {/* Station labels */}
            {Object.entries(S).map(([id, v]) => {
              if (!labeled.has(id)) return null;
              // Label position: to the east of coastal trunk (x > 150), to the west otherwise.
              const rightSide = v.x >= 150;
              const lx = rightSide ? v.x + 6 : v.x - 6;
              const ly = v.y + 2.5;
              return (
                <StationLabel
                  key={`l-${id}`}
                  x={lx}
                  y={ly}
                  text={v[lang]}
                  lang={lang}
                  anchor={rightSide ? "start" : "end"}
                  fontSize={v.major ? 8.2 : 7.2}
                  bold={id === from || id === to}
                />
              );
            })}

            {/* A and B markers */}
            <g>
              <circle cx={a.x} cy={a.y} r={13} fill="#0057B7" stroke="white" strokeWidth={3} />
              <text x={a.x} y={a.y + 4.5} fontSize="12" fontWeight="700" fill="white" textAnchor="middle">A</text>
            </g>
            <g>
              <circle cx={b.x} cy={b.y} r={13} fill="#00377A" stroke="white" strokeWidth={3} />
              <text x={b.x} y={b.y + 4.5} fontSize="12" fontWeight="700" fill="white" textAnchor="middle">B</text>
            </g>
          </svg>

          {/* Floating zoom / my-location controls (Yandex-style) */}
          <div className={`absolute top-3 ${lang === "he" ? "start-3" : "end-3"} flex flex-col gap-2`}>
            <button className="w-9 h-9 rounded-xl bg-white shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </button>
            <button className="w-9 h-9 rounded-xl bg-white shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </button>
            <button className="w-9 h-9 rounded-xl bg-white shadow-md flex items-center justify-center text-blue-600 hover:bg-slate-50 mt-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* BOTTOM INFO CARD */}
        <div className="absolute bottom-0 start-0 end-0 bg-white rounded-t-[28px] shadow-[0_-8px_24px_-6px_rgba(0,0,0,0.12)] px-5 pt-3 pb-7">
          {/* grip */}
          <div className="mx-auto w-10 h-1 rounded-full bg-slate-200 mb-3" />

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-[30px] font-extrabold text-slate-900 tracking-tight">
                {duration}
              </span>
              <span className="text-[17px] font-semibold text-slate-600">{t.min}</span>
            </div>
            <span className="text-[14px] text-slate-500">
              {transfers === 0 ? t.noTransfers : t.transfers(transfers)}
            </span>
          </div>

          <button className="mt-1 text-[14px] font-semibold text-[#0057B7] hover:text-[#00377A]">
            {t.seeDetails}
          </button>

          {/* Origin/Dest chips + swap */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setPicker("from")}
              className="flex-1 min-w-0 flex items-center gap-2 bg-slate-100 hover:bg-slate-200 rounded-2xl px-3 py-2.5 transition"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#0057B7] shrink-0" />
              <span className="truncate text-[14px] font-medium text-slate-800">{S[from][lang]}</span>
              <svg className="ms-auto w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/></svg>
            </button>

            <button
              onClick={swap}
              aria-label={t.swap}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M7 4l-3 3 3 3M4 7h12a4 4 0 014 4M17 20l3-3-3-3M20 17H8a4 4 0 01-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              onClick={() => setPicker("to")}
              className="flex-1 min-w-0 flex items-center gap-2 bg-slate-100 hover:bg-slate-200 rounded-2xl px-3 py-2.5 transition"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#00377A] shrink-0" />
              <span className="truncate text-[14px] font-medium text-slate-800">{S[to][lang]}</span>
              <svg className="ms-auto w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/></svg>
            </button>
          </div>

          {/* Home indicator */}
          <div className="mx-auto w-32 h-1.5 rounded-full bg-slate-900 mt-5" />
        </div>

        {/* Station picker modal */}
        <StationPicker
          open={picker !== null}
          title={picker === "from" ? t.from : t.to}
          lang={lang}
          onSelect={(id) => picker === "from" ? setFrom(id) : setTo(id)}
          onClose={() => setPicker(null)}
        />
      </div>
    </div>
  );
}
