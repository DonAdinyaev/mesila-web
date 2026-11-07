// UI language (English / Hebrew): strings, station and line names.
// Loaded after network.js. The chosen language is remembered per browser.

window.I18N = (() => {
  const HE_STATIONS = {
    nahariya:'נהריה', akko:'עכו', k_motzkin:'קריית מוצקין', k_hayim:'קריית חיים', hutzot:'חוצות המפרץ',
    merkazit:'מרכזית המפרץ', hashmona:'חיפה – מרכז השמונה', bat_galim:'חיפה – בת גלים', hof_carmel:'חיפה – חוף הכרמל',
    atlit:'עתלית', binyamina:'בנימינה', caesarea:'קיסריה – פרדס חנה', hadera:'חדרה – מערב', netanya:'נתניה',
    sapir:'נתניה – ספיר', beit_yh:'בית יהושע', herzliya:'הרצליה', university:'תל אביב – האוניברסיטה – אקספו',
    savidor:'תל אביב – סבידור מרכז', hashalom:'תל אביב – השלום', hahagana:'תל אביב – ההגנה',
    ahihud:'אחיהוד', karmiel:'כרמיאל', yoknaam:'יוקנעם – כפר יהושע', migdal:'מגדל העמק – כפר ברוך',
    afula:'עפולה', beit_shean:'בית שאן – דוד לוי', hadera_e:'חדרה – מזרח', shomron:'שומרון – טייבה',
    tira:'טירה – כוכב יאיר', raanana_w:'רעננה – מערב', raanana_s:'רעננה – דרום', hod_hash:'הוד השרון – סוקולוב',
    kfar_saba:'כפר סבא – נורדאו', rosh_ayin:'ראש העין – צפון', ptkv_sgula:'פתח תקווה – סגולה',
    ptkv_arye:'פתח תקווה – קריית אריה', bnei_brak:'בני ברק', bengurion:'נמל התעופה בן גוריון',
    paatei:'פאתי מודיעין', modiin:'מודיעין – מרכז', yitzhak_nav:'ירושלים – יצחק נבון', holon_jct:'צומת חולון',
    holon_wolf:'חולון – וולפסון', by_yoseftal:'בת ים – אלי כהן – יוספטל', by_komem:'בת ים – הקוממיות',
    rz_dayan:'ראשון לציון – משה דיין', yavne_w:'יבנה – מערב', ashdod:'אשדוד – עד הלום', ashkelon:'אשקלון',
    kfar_habad:'כפר חב"ד', lod_gan:'לוד – גני אביב', lod:'לוד', rz_haris:'ראשון לציון – הראשונים',
    beer_yaakov:'באר יעקב', rehovot:'רחובות', yavne_e:'יבנה – מזרח', ramla:'רמלה', beit_shem:'בית שמש',
    biblical_zoo:'ירושלים – גן החיות התנ"כי', malha:'ירושלים – מלחה', mazkeret:'מזכרת בתיה',
    kmalakhi:'קריית מלאכי – יואב', kgat:'קריית גת', lehavim:'להבים – רהט', bs_north:'באר שבע – צפון / האוניברסיטה',
    bs_center:'באר שבע – מרכז', dimona:'דימונה', sderot:'שדרות', netivot:'נתיבות', ofakim:'אופקים',
  };
  // Short forms used when zoomed out (city prefix dropped otherwise)
  const HE_SHORT = {
    hashmona:'השמונה', university:'האוניברסיטה', by_yoseftal:'בת ים – יוספטל', beit_shean:'בית שאן', hadera_e:'חדרה מזרח',
    shomron:'שומרון', tira:'טירה', caesarea:'קיסריה', modiin:'מודיעין', yoknaam:'יוקנעם', migdal:'מגדל העמק',
    rz_dayan:'משה דיין', rz_haris:'הראשונים', kmalakhi:'קריית מלאכי', ptkv_arye:'קריית אריה', ptkv_sgula:'סגולה',
    hod_hash:'הוד השרון', kfar_saba:'כפר סבא', rosh_ayin:'ראש העין', lehavim:'להבים', bs_center:'ב"ש מרכז',
    bs_north:'ב"ש צפון / האוניברסיטה', bengurion:'נתב"ג', ashdod:'אשדוד',
  };
  const HE_PREFIX = /^(תל אביב|באר שבע|ירושלים|חיפה) – /;
  const HE_LINES = {
    L1:'הרצליה – באר שבע (דרך השרון והחוף)', L2:'בנימינה – אשקלון', L3:'נהריה – מודיעין', L4:'נהריה – באר שבע',
    L5:'כרמיאל – באר שבע', L6:'נתניה – בית שמש', L7:'כרמיאל – חוף הכרמל', L8:'עתלית – בית שאן',
    L9:'בית שמש – ירושלים מלחה (סגור)', L10:'לוד – ראשון לציון הראשונים', L11:'באר שבע – דימונה',
    L12:'מודיעין – ירושלים', HS:'הרצליה – ירושלים', E:'חדרה מזרח – ראש העין (המסילה המזרחית)',
    N1:'לילה: נהריה – מודיעין', N2:'לילה: הרצליה – ירושלים',
  };
  // Map geography labels
  const HE_GEO = {
    'HAIFA':'חיפה', 'TEL AVIV':'תל אביב', 'JERUSALEM':'ירושלים', 'BE’ER SHEVA':'באר שבע',
    'GALILEE':'גליל', 'SHARON':'שרון', 'NEGEV':'נגב', 'LEBANON':'לבנון', 'JORDAN':'ירדן', 'EGYPT':'מצרים',
    'Mediterranean Sea':'הים התיכון', 'Sea of Galilee':'ים כנרת', 'Dead Sea':'ים המלח', 'Red Sea':'ים סוף', 'Eilat':'אילת',
  };

  const STR = {
    en: {
      brand: 'Mesila', operator: 'Israel Railways', filter: 'Filter lines', zoomIn: 'Zoom in', zoomOut: 'Zoom out',
      whole: 'Show whole network', tapStart: 'Tap a station to start', tapDest: 'Now tap your destination',
      langBtn: 'עב', langTitle: 'עברית', from: 'From', to: 'To', swap: 'Swap', clear: 'Clear',
      hint: 'Tap two stations on the map, or type above to plan a trip.', direct: 'Direct',
      transfers: (n) => `${n} transfer${n > 1 ? 's' : ''}`, transferWait: (m) => `Transfer · ${m} min to next train`,
      toward: (s) => `Toward ${s}`, departsIn: (m) => `Departs in ${m} min · `, every: (m) => `every ${m} min`,
      stops: (n, m) => `${n} stop${n > 1 ? 's' : ''} · ${m} min`, arrive: 'Arrive',
      dur: (h, m) => (h > 0 ? `${h}h ${m}m` : `${m} min`), departHere: 'Depart from here', goHere: 'Go here', show: 'Show',
      tweaks: 'Tweaks', theme: 'Theme', light: 'Light', dark: 'Dark', density: 'Label density', sparse: 'Sparse',
      normal: 'Normal', dense: 'Dense', night: 'Show night lines', fontEn: 'English font', fontHe: 'Hebrew font',
    },
    he: {
      brand: 'מסילה', operator: 'רכבת ישראל', filter: 'סינון קווים', zoomIn: 'הגדלה', zoomOut: 'הקטנה',
      whole: 'הצגת כל הרשת', tapStart: 'הקישו על תחנה כדי להתחיל', tapDest: 'עכשיו הקישו על היעד',
      langBtn: 'EN', langTitle: 'English', from: 'מ־', to: 'אל', swap: 'החלפת כיוון', clear: 'ניקוי',
      hint: 'הקישו על שתי תחנות במפה, או הקלידו למעלה כדי לתכנן נסיעה.', direct: 'ישיר',
      transfers: (n) => (n === 1 ? 'החלפה אחת' : `${n} החלפות`), transferWait: (m) => `החלפה · ${m} דק׳ לרכבת הבאה`,
      toward: (s) => `לכיוון ${s}`, departsIn: (m) => `יוצאת בעוד ${m} דק׳ · `, every: (m) => `כל ${m} דק׳`,
      stops: (n, m) => `${n === 1 ? 'תחנה אחת' : `${n} תחנות`} · ${m} דק׳`, arrive: 'הגעה',
      dur: (h, m) => (h > 0 ? `${h} ש׳ ${m} דק׳` : `${m} דק׳`), departHere: 'יציאה מכאן', goHere: 'נסיעה לכאן', show: 'הצגה',
      tweaks: 'התאמות', theme: 'ערכת נושא', light: 'בהירה', dark: 'כהה', density: 'צפיפות תוויות', sparse: 'דלילה',
      normal: 'רגילה', dense: 'צפופה', night: 'הצגת קווי לילה', fontEn: 'גופן אנגלית', fontHe: 'גופן עברית',
    },
  };

  let lang = 'en';
  try { const v = localStorage.getItem('mesila.lang'); if (v === 'he' || v === 'en') lang = v; } catch (e) {}

  const M = () => window.MESILA;
  const api = {
    get lang() { return lang; },
    get dir() { return lang === 'he' ? 'rtl' : 'ltr'; },
    setLang(l) { lang = l; try { localStorage.setItem('mesila.lang', l); } catch (e) {} },
    t(key, ...args) { const v = (STR[lang] || STR.en)[key]; return typeof v === 'function' ? v(...args) : (v ?? key); },
    // Full station name in the current language
    station(id) { const s = M().BY_ID[id]; if (!s) return id; return lang === 'he' ? (HE_STATIONS[id] || s.name) : s.name; },
    // Hebrew short form (English short forms live in the map renderer)
    stationShortHe(id) { return HE_SHORT[id] || (HE_STATIONS[id] || M().BY_ID[id].name).replace(HE_PREFIX, ''); },
    line(id) { const l = M().LINES.find(x => x.id === id); if (!l) return id; return lang === 'he' ? (HE_LINES[id] || l.name) : l.name; },
    geo(label) { return lang === 'he' ? (HE_GEO[label] || label) : label; },
    // Both names, for search
    searchText(id) { const s = M().BY_ID[id]; return (s.name + ' ' + (HE_STATIONS[id] || '')).toLowerCase(); },
  };
  return api;
})();
