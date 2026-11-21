// The trip panel: From/To search with the time wheel, the trip card and timeline (planned
// times from window.SCHEDULE, platforms and live delays from window.LIVE), and the station popup.

const { LINES: APP_LINES, STATIONS: APP_STATIONS, BY_ID: APP_BY_ID } = window.MESILA;
function fmtMin(m) {
  const h = Math.floor(m / 60), mm = Math.round(m % 60);
  return window.I18N.t('dur', h, mm);
}

// One row of the search card. 16px text so iPhones don't zoom the page on focus.
// a hairline divider: fades in over the first quarter of its length, solid (light) in the
// middle half, fades out over the last quarter
const FADE_LINE = (dir) => { const c = 'color-mix(in srgb, var(--text) 20%, transparent)';
  return `linear-gradient(${dir}, transparent, ${c} 25%, ${c} 75%, transparent)`; };

function StationAutocomplete({ label, placeholder, value, onChange, onPick, onFocus, onBlur, autoFocus, note, onLocate, locating }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const display = value ? window.I18N.station(value) : '';
  const query = (q || display || '').toLowerCase();
  const results = open && query
    ? APP_STATIONS.filter(s => window.I18N.searchText(s.id).includes(query)).slice(0, 30)
    : [];

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingInlineStart: 12, paddingInlineEnd: 6, height: 42 }}>
        <span style={{
          width: 10, height: 10, borderRadius: 10, position: 'relative', zIndex: 1,
          background: label === 'from' ? '#1A1A1C' : 'transparent',
          border: label === 'from' ? 'none' : '2px solid #1A1A1C',
          flexShrink: 0,
        }}/>
        {/* station name, with an optional small note (distance) underneath so the name keeps the full width */}
        <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <input
            ref={inputRef} data-station-input={label}
            value={open ? q : display}
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => { setOpen(true); setQ(''); onFocus?.(); }}
            onBlur={() => setTimeout(() => { setOpen(false); onBlur?.(); }, 150)}
            placeholder={placeholder}
            style={{
              width: '100%', border: 'none', outline: 'none', background: 'transparent',
              font: '500 16px var(--font)', lineHeight: '20px',
              color: 'var(--text)',
              minWidth: 0, height: note && !open ? 20 : '100%', padding: 0,
            }}
          />
          {/* the note doubles as the locate button, so the name keeps its full width */}
          {note && !open && (onLocate
            ? <button onClick={onLocate} title={window.I18N.t('locate')} aria-label={window.I18N.t('locate')} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start', border: 'none', background: 'transparent',
                padding: 0, cursor: 'pointer', font: '500 11px var(--font)', lineHeight: '13px', color: 'var(--text-dim)', whiteSpace: 'nowrap',
                animation: locating ? 'mesilaPulse 1s ease-in-out infinite' : 'none' }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="4.6" stroke="currentColor" strokeWidth="1.8"/>
                  <circle cx="8" cy="8" r="1.8" fill="currentColor"/>
                  <path d="M8 0.8v2.4M8 12.8v2.4M0.8 8h2.4M12.8 8h2.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                {note}
              </button>
            : <span style={{ font: '500 11px var(--font)', lineHeight: '13px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{note}</span>)}
        </div>
        {onLocate && !note && (
          <button onClick={onLocate} title={window.I18N.t('locate')} aria-label={window.I18N.t('locate')} style={{
            border:'none', background:'transparent', cursor:'pointer', color: note ? 'var(--text)' : 'var(--text-dim)',
            width: 30, height: 30, flexShrink: 0, padding: 0, display:'flex', alignItems:'center', justifyContent:'center',
            animation: locating ? 'mesilaPulse 1s ease-in-out infinite' : 'none' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="4.6" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="8" cy="8" r="1.6" fill="currentColor"/>
              <path d="M8 0.8v2.4M8 12.8v2.4M0.8 8h2.4M12.8 8h2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
        {value && (
          <button onClick={() => onChange(null)} style={{
            border:'none', background:'transparent', cursor:'pointer',
            color: 'var(--text-dim)', fontSize: 18, lineHeight: 1, width: 30, height: 30, flexShrink: 0,
          }} title={window.I18N.t('clear')} aria-label={window.I18N.t('clear')}>×</button>
        )}
      </div>
      {results.length > 0 && (
        // about four and a half rows tall, the rest scrolls (its touches are its own: they
        // neither drag the panel nor scroll it)
        <div data-own-scroll="true" data-suggestions=""
          onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}
          style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--surface)', borderRadius: 14,
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
          border: '1px solid var(--chip-border)',
          maxHeight: 196, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch',
          zIndex: 10,
        }}>
          {results.map(s => (
            <div
              key={s.id} data-suggestion={s.id}
              onMouseDown={(e) => { e.preventDefault(); onPick(s.id); setOpen(false); setQ(''); }}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                borderBottom: '1px solid var(--chip-border)',
                display:'flex', alignItems:'center', gap: 10,
                font: '500 14px var(--font)',
                color: 'var(--text)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--chip-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span>{window.I18N.station(s.id)}</span>
              {/* the station's lines, at the end of the row */}
              <div style={{ display:'flex', gap: 3, marginInlineStart: 'auto', flexShrink: 0 }}>
                {s.lines.map(l => {
                  const c = APP_LINES.find(x=>x.id===l)?.color;
                  return <span key={l} style={{ width: 8, height: 8, borderRadius: 8, background: c }}/>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LineBadge({ lineId, size = 22 }) {
  const line = APP_LINES.find(l=>l.id===lineId);
  if (!line) return null;
  const label = line.num || line.short || '';
  const fontSize = label.length > 1 ? Math.round(size*0.42) : Math.round(size*0.55);
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width: size, height: size, borderRadius: size,
      background: line.color, color: line.ink || '#fff',
      font: `700 ${fontSize}px var(--font)`,
      letterSpacing: '-0.02em',
      flexShrink: 0,
    }}>{label}</span>
  );
}


// The trip timeline uses the map's proportions (MapSVG: line W, marker W + 3.6, white inside
// W + 1.6, dot W - 0.4, outer halo W + 7.6, tracks GAP = 7.5 apart, at W = 5.5), scaled to
// an 8px line and rounded to whole, even sizes: the line, the markers and the stops then
// share one pixel-exact centre (fractional widths got snapped half a pixel aside).
const TL_LINE = 8, TL_K = TL_LINE / 5.5;
const TL = {
  line: TL_LINE,
  outer: 14,      // the marker's width, outline included (map ratio: 13.2)
  ring: 1.5,      // its black outline; the destination's is doubled (map ratio: 1.45)
  dot: 8,         // a line's colour dot (map ratio: 7.4)
  halo: 3,        // the gap kept clear around the marker (map ratio: 2.9)
  // the distance between two lines' dots at a change: the dots are as far apart as each is
  // from the outline ((14 - 2 * 1.5 - 8) / 2 = 1.5px), not twice that
  step: 8 + 1.5,
};
// A station on the trip timeline: the map's station marker, stood upright. One dot per line
// used there, one above the other: at a change, the line you arrive on above the one you
// leave on. As on the map, the start is dark (dots ringed in white) and the destination
// has a thicker outline. kind: start | transfer | end
function TLNode({ kind, colors }) {
  // drawn as an SVG, like the map: the same strokes in the same order, so the
  // fractional sizes stay exact and the dots sit dead centre
  const n = colors.length, hw = TL.outer / 2 + TL.halo;            // half width incl. the halo
  const w = hw * 2, h = w + (n - 1) * TL.step, x = hw;
  const y0 = hw, y1 = hw + (n - 1) * TL.step;                       // first and last dot centres
  const ln = { x1: x, y1: y0, x2: x, y2: y1, strokeLinecap: 'round' };
  const ring = kind === 'end' ? 2 * TL.ring : TL.ring;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"
      style={{ position:'relative', zIndex: 1, flexShrink: 0, margin: `${-TL.halo}px 0`, overflow:'visible' }}>
      <line {...ln} stroke="var(--surface)" strokeWidth={TL.outer + 2 * TL.halo + (ring - TL.ring) * 2}/>
      <line {...ln} stroke="#1A1A1C" strokeWidth={TL.outer + (ring - TL.ring) * 2}/>
      <line {...ln} stroke={kind === 'start' ? '#1A1A1C' : '#fff'} strokeWidth={TL.outer - 2 * TL.ring}/>
      {colors.map((c, k) => (
        <g key={k}>
          {kind === 'start' && <circle cx={x} cy={y0 + k * TL.step} r={TL.dot / 2 + 0.6 * TL_K} fill="#fff"/>}
          <circle cx={x} cy={y0 + k * TL.step} r={TL.dot / 2} fill={c}/>
        </g>
      ))}
    </svg>
  );
}

// ---- Real timetable (window.SCHEDULE): times are minutes after midnight, Israel time,
// of the search day j.day. Days other than today get a weekday prefix.
// m may be negative (a trip from the evening before the search day) or past 1440.
function clockOf(j, m) {
  const off = Math.floor(m / 1440), r = m - off * 1440;      // whole days + minutes into that day
  const hh = String(Math.floor(r / 60)).padStart(2, '0'), mm = String(r % 60).padStart(2, '0');
  const today = window.SCHEDULE.israelNow().day;
  const day = Date.parse(j.day) / 864e5 + off;
  if (day === today) return `${hh}:${mm}`;
  const wd = new Date(day * 864e5).toLocaleDateString(window.I18N.lang === 'he' ? 'he-IL' : 'en-GB', { weekday: 'short', timeZone: 'UTC' }).replace(/יום\s*/, '');   // Hebrew: just א׳, ב׳ (not יום א׳)
  return `${wd} ${hh}:${mm}`;
}

// Crescent moon marking night trains (overnight runs of line 3 and the high-speed
// line that skip stops their day trains make)
function Moon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M8.9 8.6A4.6 4.6 0 0 1 3.4 3.1 4.6 4.6 0 1 0 8.9 8.6z" fill="currentColor"/>
    </svg>
  );
}

// ---- Platforms and live delays (data/live.js): rt = [{ pf, pt, dep, arr } | null] per leg
// (pf / pt: platform at the leg's first / last station; dep / arr: minutes late, or null)
const LATE = '#D2372D', ONTIME = '#2E8B4A';
// Refreshed every 30 s while the trip is on screen and the page is visible
function useLiveDelays(j) {
  const [rt, setRt] = React.useState(null);
  const key = j ? j.day + ':' + j.legs.map(l => l.train + '@' + l.depart).join(',') : '';
  React.useEffect(() => {
    setRt(null);
    if (!j || !window.LIVE) return;
    let alive = true;
    const run = () => { if (!document.hidden) window.LIVE.forJourney(j).then(r => { if (alive) setRt(r && r.some(Boolean) ? r : null); }); };
    run();
    const id = setInterval(run, window.LIVE.REFRESH);
    document.addEventListener('visibilitychange', run);
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', run); };
  }, [key]);
  return rt;
}
// A clock time moved by a live delay: the new time in red, the planned one struck through
function LiveClock({ j, m, d, small }) {
  if (!d) return clockOf(j, m);
  return (
    <span style={{ display:'inline-flex', flexDirection: small ? 'row' : 'column', gap: small ? 6 : 0, alignItems: small ? 'baseline' : 'flex-start' }}>
      <span style={{ color: LATE }}>{clockOf(j, m + d)}</span>
      <span style={{ textDecoration:'line-through', opacity: 0.55, fontWeight: 500, fontSize: '0.85em' }}>{clockOf(j, m)}</span>
    </span>
  );
}
// "3 min late" / "On time", with a dot that says it is live
function LiveStatus({ d }) {
  const T = window.I18N, late = d > 0, c = late ? LATE : ONTIME;
  return (
    <span style={{ color: c, fontWeight: 600, whiteSpace: 'nowrap' }}>
      <span style={{ display:'inline-block', width: 6, height: 6, borderRadius: 3, background: c, marginInlineEnd: 4, verticalAlign: '0.08em', animation: 'mesilaPulse 2s ease-in-out infinite' }}></span>
      {late ? T.t('late', d) : T.t('onTime')}
    </span>
  );
}

// The platform, on the line of the station's name, after it
function Plat({ text }) {
  if (!text) return null;
  return <span style={{ font:'600 12px var(--font)', color:'var(--text-dim)', letterSpacing: 0, marginInlineStart: 8, whiteSpace:'nowrap' }}>{text}</span>;
}

function JourneyTimeline({ j, live, rt }) {
  const [open, setOpen] = React.useState({});
  const T = window.I18N;
  // One width for the whole trip, so the line and markers stay in one straight column: the
  // widest time as drawn (e.g. "Tue 00:56" / "ג׳ 00:56"), measured, so the line sits just
  // beside the times
  const allTimes = j.legs.flatMap(l => l.times);
  const withDay = allTimes.some(m => clockOf(j, m).includes(' '));
  const boxRef = React.useRef(null);
  const [timeW, setTimeW] = React.useState(withDay ? 70 : 46);
  React.useLayoutEffect(() => {
    const box = boxRef.current; if (!box) return;
    const w = Math.ceil(Math.max(0, ...[...box.querySelectorAll('[data-tl-time]')].map(el => el.getBoundingClientRect().width)));
    if (w && w !== timeW) setTimeW(w);
  });
  const timeCol = { width: timeW, flexShrink: 0, font:'600 13px "JetBrains Mono", ui-monospace, monospace', color:'var(--text)', paddingTop: 1, whiteSpace:'nowrap' };
  // the rail: a fixed-width column; the line, markers and stops are all centred inside a box
  // of this width (flex / auto margins), so they share one centre whatever their sizes
  const RAIL = 24;
  const rail = { width: RAIL, flexShrink: 0, display:'flex', flexDirection:'column', alignItems:'center', position:'relative' };
  // square ends: the pieces of one line meet seamlessly from row to row (the ends are under markers)
  const bar = (c) => ({ position:'absolute', top: 0, bottom: 0, left: 0, right: 0, marginInline: 'auto', width: TL.line, background: c });
  // Station rows: the rail is as tall as the whole row, and the lines run into the marker's
  // dots (the line in from above to the first dot, the line out from the last dot down to
  // the row's end), so every marker meets its lines with the same small gap (its halo)
  const dotY = (k) => 1 + TL.outer / 2 + k * TL.step;
  const colorOf = (id) => (APP_LINES.find(l => l.id === id) || { color: '#888' }).color;
  const rows = [];
  j.legs.forEach((leg, i) => {
    const color = colorOf(leg.line);
    const ids = leg.stationIds, n = ids.length - 1;
    const L = rt && rt[i], P = i > 0 && rt && rt[i - 1];
    const dDep = L && L.dep != null ? L.dep : 0, dArr = P && P.arr != null ? P.arr : 0;
    const wait = i === 0 ? leg.depart + dDep - j.start : leg.depart + dDep - j.legs[i - 1].arrive - dArr;
    // with live delays, a change that leaves under 2 minutes is likely missed
    const risky = i > 0 && ((L && L.dep != null) || (P && P.arr != null)) && wait < 2;
    // where to board: "Platform 2"; at a change, from the arrival platform to this one
    const plat = !L || !L.pf ? null : i > 0 && P && P.pt && P.pt !== L.pf ? T.t('platformChange', P.pt, L.pf) : T.t('platform', L.pf);
    rows.push(
      <div key={'s'+i} style={{ display:'flex', gap: 8, alignItems:'flex-start' }}>
        <div style={timeCol}><span data-tl-time="" style={{ display: 'inline-block' }}>
          {i > 0 && <div style={{ color:'var(--text-dim)', fontWeight: 500 }}><LiveClock j={j} m={j.legs[i - 1].arrive} d={P && P.arr}/></div>}
          <LiveClock j={j} m={leg.depart} d={L && L.dep}/>
        </span></div>
        <div style={{ ...rail, paddingTop: 1, alignSelf: 'stretch' }}>
          {i > 0 && <span style={{ ...bar(colorOf(j.legs[i-1].line)), bottom: 'auto', height: dotY(0) }}></span>}
          <span style={{ ...bar(color), top: dotY(i > 0 ? 1 : 0) }}></span>
          <TLNode kind={i === 0 ? 'start' : 'transfer'} colors={i === 0 ? [color] : [colorOf(j.legs[i - 1].line), color]}/>
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingBottom: 10 }}>
          <div style={{ font:'700 15px var(--font)', color:'var(--text)', letterSpacing:'-0.01em' }}>{T.station(ids[0])}<Plat text={plat}/></div>
          {i > 0 && <div style={{ font:'500 12px var(--font)', color: risky ? LATE : 'var(--text-dim)', fontWeight: risky ? 600 : 500, marginTop: 2 }}>{risky ? T.t('tightTransfer') : T.t('transferWait', wait)}</div>}
        </div>
      </div>
    );
    rows.push(
      <div key={'r'+i} style={{ display:'flex', gap: 8, alignItems:'stretch' }}>
        {/* the line's badge sits in the time column next to the line, beside the ride, leaving the text the full width */}
        <div style={{ ...timeCol, display:'flex', alignItems:'center', justifyContent:'flex-end', paddingTop: 0, paddingBottom: 12 }}><LineBadge lineId={leg.line} size={24}/></div>
        <div style={rail}><span style={bar(color)}></span></div>
        <div style={{ flex: 1, minWidth: 0, padding: '2px 0 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ font:'600 13px var(--font)', color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{T.t('toward', T.station(leg.terminus))}</div>
              <div style={{ font:'500 12px var(--font)', color:'var(--text-dim)' }}>
                {T.t('train', leg.train)}
                {L && L.dep != null && <> · <LiveStatus d={Math.max(L.dep, 0)}/></>}
                {leg.night && <> · <span style={{ display:'inline-flex', alignItems:'center', gap: 3, verticalAlign: '-1px' }}><Moon size={11}/>{T.t('nightTrain')}</span></>}
                {i === 0 && live && wait > 0 ? ' · ' + T.t('departsInOnly', wait) : ''}
              </div>
            </div>
          </div>
          <button onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))} style={{
            marginTop: 8, display:'flex', alignItems:'center', gap: 6, border:'none', background:'transparent', padding: 0, cursor:'pointer',
            font:'500 12px "JetBrains Mono", ui-monospace, monospace', color:'var(--text-dim)' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: open[i] ? 'rotate(90deg)' : (T.dir === 'rtl' ? 'scaleX(-1)' : 'none'), transition:'transform 150ms' }}><path d="M3 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
            <span>{T.t('stops', n, leg.arrive - leg.depart)}</span>
          </button>
          {open[i] && n > 1 && (
            <div style={{ marginTop: 6, display:'flex', flexDirection:'column', gap: 6 }}>
              {ids.slice(1, -1).map((id, k) => (
                <div key={id} style={{ display:'flex', alignItems:'center', gap: 8, marginInlineStart: -(RAIL + 8) }}>
                  {/* a rail-wide box right under the rail, the stop centred in it */}
                  <span style={{ width: RAIL, flexShrink: 0, display:'flex', justifyContent:'center', position:'relative', zIndex: 1 }}>
                    <span style={{ width: TL.line + 2, height: TL.line + 2, borderRadius: '50%', background: color, boxShadow:'0 0 0 2px var(--surface)' }}></span>
                  </span>
                  <span style={{ font:'500 12px "JetBrains Mono", ui-monospace, monospace', color:'var(--text-dim)', flexShrink: 0 }}>{clockOf(j, leg.times[k + 1]).slice(-5)}</span>
                  <span style={{ font:'500 13px/1.3 var(--font)', color:'var(--text-dim)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', minWidth: 0 }}>{T.station(id)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
    if (i === j.legs.length - 1) rows.push(
      <div key="end" style={{ display:'flex', gap: 8, alignItems:'flex-start' }}>
        <div style={timeCol}><span data-tl-time="" style={{ display: 'inline-block' }}><LiveClock j={j} m={leg.arrive} d={L && L.arr}/></span></div>
        <div style={{ ...rail, paddingTop: 1, alignSelf: 'stretch' }}>
          <span style={{ ...bar(color), bottom: 'auto', height: dotY(0) }}></span>
          <TLNode kind="end" colors={[color]}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font:'700 15px var(--font)', color:'var(--text)', letterSpacing:'-0.01em' }}>{T.station(ids[n])}<Plat text={L && L.pt ? T.t('platform', L.pt) : null}/></div>
          <div style={{ font:'500 12px var(--font)', color:'var(--text-dim)', marginTop: 2 }}>{T.t('arrive')}</div>
        </div>
      </div>
    );
  });
  return <div ref={boxRef} style={{ borderTop:'1px solid var(--chip-border)', paddingTop: 14 }}>{rows}</div>;
}

function TimetableNote({ borrowed }) {
  return (
    <div style={{ marginTop: 12, font: '500 11px/1.4 var(--font)', color: 'var(--text-dim)' }}>
      {borrowed && <div style={{ marginBottom: 4 }}>{window.I18N.t('ttBorrowed')}</div>}
      <div style={{ fontSize: 10, opacity: 0.75 }}>{window.I18N.t('credit')}</div>
    </div>
  );
}

// A light tick for each step of the time wheel. Android: the Vibration API.
// iPhone Safari has no Vibration API; toggling a hidden switch control plays the
// system haptic on iOS 18+ (best effort; silently does nothing elsewhere).
const haptic = (() => {
  let sw = null;
  return () => {
    try {
      if (navigator.vibrate) { navigator.vibrate(8); return; }
      if (!sw) {
        sw = document.createElement('label');
        sw.setAttribute('aria-hidden', 'true');
        sw.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none';
        const input = document.createElement('input');
        input.type = 'checkbox'; input.setAttribute('switch', ''); input.tabIndex = -1;
        sw.appendChild(input); document.body.appendChild(sw);
      }
      sw.click();
    } catch (e) { /* no haptics available */ }
  };
})();

// Departure time as a scroll wheel: "Now", then 15-minute slots for the next week.
// It snaps to each slot with a light tick; the trip is re-planned once scrolling
// stops. Tapping the selected time opens the phone's own date-time picker for any
// other moment (rounded to the nearest 15 minutes). Times are Israel wall-clock.
const SLOT = 15, ITEM_H = 28, WHEEL_DAYS = 7;
const BACK = 2;   // slots before "Now": 15 and 30 minutes ago (to see a train that just left)
function TimeWheel({ when, setWhen }) {
  const T = window.I18N;
  const pad = (x) => String(x).padStart(2, '0');
  const now = window.SCHEDULE.israelNow();
  const abs = (w) => w.day * 1440 + w.min;                       // minutes since 1970, Israel wall clock
  const nowAbs = abs(now);
  const past = when && abs(when) < nowAbs;
  const firstSlot = Math.min(Math.ceil((nowAbs + 1) / SLOT) * SLOT, when && !past ? abs(when) : Infinity);
  // index: 0 .. BACK-1 = 30 / 15 min ago, BACK = Now, then the 15-minute slots ahead
  const count = BACK + 1 + (WHEEL_DAYS * 1440) / SLOT;
  const slotAt = (i) => firstSlot + (i - BACK - 1) * SLOT;      // i > BACK
  const pastAt = (i) => nowAbs - (BACK - i) * SLOT;             // i < BACK
  const indexOf = (w) => {
    if (!w) return BACK;
    const a = abs(w);
    if (a < nowAbs) return BACK - Math.max(1, Math.min(BACK, Math.round((nowAbs - a) / SLOT)));
    return Math.max(BACK + 1, Math.min(count - 1, BACK + 1 + Math.round((a - firstSlot) / SLOT)));
  };
  const selected = indexOf(when);

  const ref = React.useRef(null), inputRef = React.useRef(null);
  const [live, setLive] = React.useState(selected);            // index under the centre line while scrolling
  const settle = React.useRef(null), userScroll = React.useRef(false);
  // keep the wheel on the chosen slot when it changes from outside (picker, "now" tick)
  React.useLayoutEffect(() => {
    if (userScroll.current || !ref.current) return;
    ref.current.scrollTop = selected * ITEM_H; setLive(selected);
  }, [selected, firstSlot]);
  const commit = (i) => {
    userScroll.current = false;
    if (i === selected) return;
    if (i === BACK) setWhen(null);
    else { const m = i < BACK ? pastAt(i) : slotAt(i); setWhen({ day: Math.floor(m / 1440), min: m % 1440 }); }
  };
  const onScroll = () => {
    const el = ref.current; if (!el) return;
    const i = Math.max(0, Math.min(count - 1, Math.round(el.scrollTop / ITEM_H)));
    if (i !== live) { setLive(i); if (userScroll.current) haptic(); }
    clearTimeout(settle.current);
    settle.current = setTimeout(() => commit(i), 220);
  };
  const label = (i) => {
    if (i === BACK) return { time: T.t('now'), day: '' };
    if (i < BACK) {   // a picked past time keeps its own minute; the other shows now - 15 / 30
      const m = past && i === selected ? abs(when) : pastAt(i);
      return { time: `${pad(Math.floor((m % 1440) / 60))}:${pad(m % 60)}`, day: T.t('minAgo', (BACK - i) * SLOT) };
    }
    const m = slotAt(i), day = Math.floor(m / 1440);
    const d = day === now.day ? '' : day === now.day + 1 ? T.t('tomorrow')
      : new Date(day * 864e5).toLocaleDateString(T.lang === 'he' ? 'he-IL' : 'en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).replace(/יום\s*/, '');
    return { time: `${pad(Math.floor((m % 1440) / 60))}:${pad(m % 60)}`, day: d };
  };
  // only render the slots near the centre; spacers keep the scroll length right
  const lo = Math.max(0, live - 40), hi = Math.min(count - 1, live + 40);
  const cur = when || now, d0 = new Date(cur.day * 864e5);
  const inputValue = `${d0.getUTCFullYear()}-${pad(d0.getUTCMonth() + 1)}-${pad(d0.getUTCDate())}T${pad(Math.floor(cur.min / 60))}:${pad(cur.min % 60)}`;
  const onPicked = (e) => {
    const m = /^(\d+)-(\d+)-(\d+)T(\d+):(\d+)/.exec(e.target.value); if (!m) return;
    const total = Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 * 1440 + +m[4] * 60 + +m[5]) / SLOT) * SLOT;
    setWhen({ day: Math.floor(total / 1440), min: total % 1440 });
  };
  const stop = (e) => e.stopPropagation();   // the sheet's own swipe handling must not see wheel drags
  return (
    <div style={{ position:'relative', width: 74, flexShrink: 0, alignSelf: 'stretch' }}>
      {/* centre band */}
      <div aria-hidden="true" style={{ position:'absolute', left: 6, right: 6, top: '50%', height: ITEM_H, marginTop: -ITEM_H / 2,
        borderRadius: 8, background: 'var(--surface)', boxShadow: '0 0 0 1px var(--chip-border)' }}/>
      <div ref={ref} role="listbox" aria-label={T.t('leave')} tabIndex={0} data-own-scroll="true"
        onScroll={onScroll}
        onTouchStart={(e) => { stop(e); userScroll.current = true; }} onTouchMove={stop} onTouchEnd={stop}
        onWheel={() => { userScroll.current = true; }}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); userScroll.current = true;
          ref.current.scrollBy({ top: e.key === 'ArrowDown' ? ITEM_H : -ITEM_H, behavior: 'smooth' }); } }}
        onClick={(e) => { // tap on the centre slot: open the full date-time picker
          const r = ref.current.getBoundingClientRect();
          if (Math.abs(e.clientY - (r.top + r.height / 2)) <= ITEM_H / 2) { try { inputRef.current.showPicker(); } catch (err) { inputRef.current.focus(); } }
          else ref.current.scrollBy({ top: e.clientY < r.top + r.height / 2 ? -ITEM_H : ITEM_H, behavior: 'smooth' });
        }}
        style={{ position:'absolute', inset: 0, overflowY: 'auto', scrollSnapType: 'y mandatory', overscrollBehavior: 'contain',
          scrollbarWidth: 'none', cursor: 'pointer', outline: 'none', touchAction: 'pan-y',
          maskImage: 'linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)' }}>
        <div style={{ height: `calc(50% - ${ITEM_H / 2}px)` }}/>
        <div style={{ height: lo * ITEM_H }}/>
        {Array.from({ length: hi - lo + 1 }, (_, k) => {
          const i = lo + k, l = label(i), on = i === live;
          return (
            <div key={i} role="option" aria-selected={on} style={{ height: ITEM_H, scrollSnapAlign: 'center', position: 'relative',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', lineHeight: 1,
              color: on ? 'var(--text)' : 'var(--text-dim)', transition: 'color 120ms' }}>
              {/* line-height after the font shorthand (which resets it), so time and day sit together */}
              <span style={{ font: `${on ? 700 : 500} ${i === BACK ? 13 : 14}px ${i === BACK ? 'var(--font)' : '"JetBrains Mono", ui-monospace, monospace'}`, lineHeight: '14px' }}>{l.time}</span>
              {l.day && <span style={{ font: '500 9px var(--font)', lineHeight: '10px', whiteSpace: 'nowrap' }}>{l.day}</span>}
            </div>
          );
        })}
        <div style={{ height: (count - 1 - hi) * ITEM_H }}/>
        <div style={{ height: `calc(50% - ${ITEM_H / 2}px)` }}/>
      </div>
      <input ref={inputRef} type="datetime-local" value={inputValue} onChange={onPicked} tabIndex={-1} aria-hidden="true"
        style={{ position:'absolute', left: 0, bottom: 0, width: 1, height: 1, opacity: 0, border: 0, padding: 0, pointerEvents: 'none' }}/>
    </div>
  );
}

// Touch gestures. The axis is locked after the first few pixels, so a sideways
// swipe never moves the panel and a vertical drag never changes the trip.
// onDrag(dy) runs while a vertical drag is in progress; onEnd({dx, dy, axis, top, vy})
// on release, vy being the finger's recent vertical speed in px/ms. With `scrollRef`, `top` says whether that element was scrolled to its
// top when the touch began (only then may a downward drag move the panel).
function useSwipe({ onDrag, onEnd, scrollRef }) {
  const st = React.useRef(null);
  return {
    onTouchStart: (e) => {
      const t = e.touches[0];
      st.current = { x: t.clientX, y: t.clientY, axis: null, ly: t.clientY, lt: e.timeStamp, vy: 0,
        top: !scrollRef || !scrollRef.current || scrollRef.current.scrollTop <= 0 };
    },
    onTouchMove: (e) => {
      const s0 = st.current; if (!s0) return;
      const t = e.touches[0], dx = t.clientX - s0.x, dy = t.clientY - s0.y;
      if (!s0.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) s0.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      const dt = e.timeStamp - s0.lt;
      if (dt > 0) { s0.vy = 0.6 * ((t.clientY - s0.ly) / dt) + 0.4 * s0.vy; s0.ly = t.clientY; s0.lt = e.timeStamp; }
      if (s0.axis === 'y' && onDrag) onDrag(dy, s0.top);
    },
    onTouchEnd: (e) => {
      const s0 = st.current; st.current = null; if (!s0) return;
      const t = e.changedTouches[0];
      // a finger that stopped before lifting has no speed left
      const vy = e.timeStamp - s0.lt > 100 ? 0 : s0.vy;
      onEnd({ dx: t.clientX - s0.x, dy: t.clientY - s0.y, axis: s0.axis, top: s0.top, vy });
    },
    onTouchCancel: () => { const s0 = st.current; st.current = null; if (s0) onEnd({ dx: 0, dy: 0, axis: null, top: s0.top }); },
  };
}

// Compact trip card: always visible at the top of the sheet. Arrows (and swipes)
// move between alternative trips, ordered by departure time.
function TripSummary({ j, live, rt, index, count, onPrev, onNext }) {
  const T = window.I18N, rtl = T.dir === 'rtl';
  const first = rt && rt[0], last = rt && rt[rt.length - 1];
  const wait = j.depart + (first && first.dep != null ? first.dep : 0) - j.start;
  const shown = rt && rt.find(x => x && x.dep != null);   // the status shown: the first leg with live data
  // a trip from the past (the time wheel goes back 30 minutes): how long ago it left
  const nowI = window.SCHEDULE.israelNow();
  const leftAgo = Math.round(nowI.day * 1440 + nowI.min - (Date.parse(j.day) / 864e5 * 1440 + j.depart + (first && first.dep != null ? first.dep : 0)));
  const gone = !live && leftAgo > 0 ? ' · ' + T.t('leftAgo', leftAgo) : '';
  // Earlier / later: small chevron chips beside the page dots ("‹ ● ○ ○ ›"). The chip is
  // 22px; the button around it is 32px, so it's still easy to hit.
  const arrow = (dir, disabled, onClick, label) => (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label} style={{
      width: 32, height: 26, flexShrink: 0, border: 'none', background: 'transparent', padding: 0,
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.3 : 1,
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ width: 22, height: 22, borderRadius: 11, border: '1px solid var(--chip-border)', background: 'var(--chip-bg)',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" style={{ transform: (dir < 0) !== rtl ? 'scaleX(-1)' : 'none' }}>
          <path d="M2.8 1.2 5.6 4 2.8 6.8" stroke="var(--text)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </button>
  );
  return (
    <div style={{ padding: '2px 16px 10px' }}>
      <div>
        <div key={index} style={{ minWidth: 0, animation: 'fadeIn 180ms ease-out' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap: 10, flexWrap:'wrap' }}>
            <div style={{ font: '700 26px var(--font)', letterSpacing: '-0.02em', color: 'var(--text)', whiteSpace:'nowrap' }}>{fmtMin(j.arrive - j.depart)}</div>
            <div style={{ font: '500 13px "JetBrains Mono", ui-monospace, monospace', color: 'var(--text-dim)', whiteSpace:'nowrap' }}><LiveClock j={j} m={j.depart} d={first && first.dep} small/> {rtl ? '←' : '→'} <LiveClock j={j} m={j.arrive} d={last && last.arr} small/></div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap: 6, marginTop: 4, flexWrap:'wrap', font: '500 12px var(--font)', color: 'var(--text-dim)' }}>
            {j.legs.map((l, k) => (
              <React.Fragment key={k}>
                {k > 0 && <span aria-hidden="true">›</span>}
                <LineBadge lineId={l.line} size={18}/>
                {l.night && <span title={T.t('nightTrain')} style={{ display:'inline-flex', color: 'var(--text-dim)' }}><Moon size={12}/></span>}
              </React.Fragment>
            ))}
            <span style={{ marginInlineStart: 4 }}>
              {/* the badges already show how many trains it takes: when the platform is
                  known it takes the place of "Direct" / "1 transfer", so the row stays one line */}
              {first && first.pf
                ? (live && wait > 0 ? T.t('platformIn', first.pf, wait) : T.t('platform', first.pf) + gone)
                : <>{j.transfers === 0 ? T.t('direct') : T.t('transfers', j.transfers)}{live && wait > 0 ? ' · ' + T.t('departsInOnly', wait) : gone}</>}
              {shown && <> · <LiveStatus d={Math.max(shown.dep, 0)}/></>}
            </span>
          </div>
        </div>
      </div>
      {count > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap: 4, marginTop: 4, marginBottom: -4 }}>
          {arrow(-1, index === 0, onPrev, T.t('earlier'))}
          <div aria-label={T.t('tripN', index + 1, count)} style={{ display:'flex', alignItems:'center', gap: 5 }}>
            {Array.from({ length: count }, (_, k) => (
              <span key={k} style={{ width: k === index ? 14 : 6, height: 6, borderRadius: 3, transition: 'width 150ms',
                background: k === index ? 'var(--text)' : 'var(--chip-border)' }}/>
            ))}
          </div>
          {arrow(1, index === count - 1, onNext, T.t('later'))}
        </div>
      )}
    </div>
  );
}

// ---- Panel building blocks

// The part of the page the phone actually shows (Safari's visual viewport), kept up to
// date. With the on-screen keyboard up, iOS doesn't shrink the page: it slides this visible
// area over it. null on computers and where the browser has no visual viewport.
function useVisualViewport(enabled) {
  const [vv, setVv] = React.useState(null);
  React.useEffect(() => {
    const V = window.visualViewport;
    if (!enabled || !V) return;
    const upd = () => setVv({ top: V.offsetTop, h: V.height, lh: document.documentElement.clientHeight });
    upd();
    V.addEventListener('resize', upd); V.addEventListener('scroll', upd);
    return () => { V.removeEventListener('resize', upd); V.removeEventListener('scroll', upd); };
  }, [enabled]);
  return vv;
}

// Holds the page still: the usual iOS scroll lock (the body fixed at its current offset).
// On phones the page is the map, and Safari scrolls the page to bring a focused field into
// view; while locked it has nothing to scroll. release() puts the body back at the same
// place, so nothing moves. Always released when the panel goes away.
function usePageLock() {
  const saved = React.useRef(null);
  const lock = React.useCallback(() => {
    if (saved.current != null) return;
    saved.current = window.scrollY;
    Object.assign(document.body.style, { position: 'fixed', top: -saved.current + 'px', left: '0', right: '0', width: '100%' });
  }, []);
  const release = React.useCallback(() => {
    if (saved.current == null) return;
    const y = saved.current; saved.current = null;
    Object.assign(document.body.style, { position: '', top: '', left: '', right: '', width: '' });
    window.scrollTo(0, y);
    // the map couldn't move while the page was held (e.g. to show a new route): it can now
    window.dispatchEvent(new Event('mesila:pagefree'));
  }, []);
  React.useEffect(() => release, [release]);
  return { lock, release, isLocked: () => saved.current != null };
}

// One native touch listener for the whole panel (React's touch handlers are passive, so
// they can't cancel the browser's own scrolling):
//  - a vertical drag that moves the panel (on the details below 'full', or pulling down
//    from their top at 'full') must not also scroll or bounce the content;
//  - a swipe never reaches the page behind (the map, on phones): it scrolls something in
//    the panel that can still scroll that way (details, suggestions, time wheel) or nothing.
// The panel's own drag runs on the touch events, which still arrive either way.
function useTouchGuard(sheetRef, bodyRef, snapRef) {
  React.useEffect(() => {
    const sheet = sheetRef.current; if (!sheet) return;
    let x0 = 0, y0 = 0, lastY = 0, mode = null, panelDrag = false;
    const start = (e) => {
      const t = e.touches[0], body = bodyRef.current;
      x0 = t.clientX; y0 = lastY = t.clientY; mode = null;
      const own = e.target.closest && e.target.closest('[data-own-scroll]');
      const inBody = !!(body && body.contains(e.target)) && !own;
      // on the details, this gesture moves the panel if the panel isn't fully up, or (decided
      // on the first move) if it's a pull down from the top
      panelDrag = inBody && (snapRef.current !== 'full' ? 'yes' : body.scrollTop <= 0 ? 'if-down' : false);
    };
    const move = (e) => {
      if (!e.cancelable) return;
      const t = e.touches[0], step = t.clientY - lastY;
      lastY = t.clientY;
      if (!mode && Math.max(Math.abs(t.clientX - x0), Math.abs(t.clientY - y0)) > 8)
        mode = Math.abs(t.clientX - x0) > Math.abs(t.clientY - y0) ? 'x'
          : panelDrag === 'yes' || (panelDrag === 'if-down' && t.clientY > y0) ? 'panel' : 'scroll';
      if (mode === 'x') return;
      if (mode === 'panel') return e.preventDefault();
      if (!step) return;
      for (let el = e.target; el && el !== sheet.parentNode; el = el.parentElement) {
        const st = getComputedStyle(el);
        if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
          const canUp = el.scrollTop > 0, canDown = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
          if ((step > 0 && canUp) || (step < 0 && canDown)) return;     // this one scrolls: let it
        }
      }
      e.preventDefault();
    };
    sheet.addEventListener('touchstart', start, { passive: true });
    sheet.addEventListener('touchmove', move, { passive: false });
    return () => { sheet.removeEventListener('touchstart', start); sheet.removeEventListener('touchmove', move); };
  }, []);
}

// The panel rests in one of three positions ('snap'):
//   'rest':   the trip card (or, with nothing planned, the search card)
//   'half':   halfway between the card and full
//   'full':   its top edge just under the top row of buttons; the details scroll inside
// Without a trip it goes no higher than half. Dragging the handle, the card or the details
// moves it with the finger; on release it snaps to the nearest position (a flick goes to
// the next one that way). The handle steps card -> half -> full -> card.
// Typing a station (phones): the panel unrolls exactly as from the handle, to full (half
// without a trip); the page is held still, and with the keyboard up the panel is fitted
// to the visible area above it. When the keyboard closes the panel returns to the card,
// riding down with the keyboard in one movement.
// All moves are one CSS transition of the panel's height (and bottom, with the keyboard).
function BottomSheet({ from, to, onSetFrom, onSetTo, onSwap, located, locating, onLocate, journey, when, setWhen, trips = [], tripIndex = 0, onSelectTrip, stationsKey }) {
  const T = window.I18N, UI = window.UI;
  const phone = window.innerWidth < 600;
  const hasTrip = !!journey;
  const rt = useLiveDelays(journey);
  const [snap, setSnap] = React.useState('rest');
  const [searching, setSearching] = React.useState(false);
  const [dy, setDy] = React.useState(null);           // finger offset while dragging, else null
  const sheetRef = React.useRef(null), sumRef = React.useRef(null), bodyRef = React.useRef(null), contentRef = React.useRef(null);
  const snapRef = React.useRef(snap); snapRef.current = snap;
  // the latest values, for callbacks that run later (blur timers)
  const live = React.useRef({}); live.current = { searching, hasTrip };
  const vv = useVisualViewport(phone);
  const pageLock = usePageLock();
  useTouchGuard(sheetRef, bodyRef, snapRef);

  // ---- heights of the four positions
  // natural heights of the trip card and of the content, and where the panel's bottom sits
  // at rest (screen bottom - home indicator - edge gap; not read from the panel itself,
  // which may be mid-animation or riding on the keyboard)
  const [m, setM] = React.useState({ card: 0, content: 0, bottom: window.innerHeight - UI.EDGE });
  React.useLayoutEffect(() => {
    const measure = () => setM({
      card: sumRef.current ? sumRef.current.scrollHeight : 0,
      content: contentRef.current ? contentRef.current.offsetHeight : 0,
      bottom: document.documentElement.clientHeight - (window.safeBottom ? window.safeBottom() : 0) - UI.EDGE });
    measure();
    const ro = new ResizeObserver(measure);
    if (contentRef.current) ro.observe(contentRef.current);
    if (sumRef.current && sumRef.current.firstChild) ro.observe(sumRef.current.firstChild);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [hasTrip]);
  const safeTop = window.safeTop ? window.safeTop() : 0;
  const kb = !!(vv && vv.h < vv.lh - 80);                 // keyboard up (opening, open or closing)
  const fitted = kb && searching;                         // typing: fit the visible area above the keyboard
  const fullH = fitted ? Math.max(0, vv.h - (vv.top < 4 ? safeTop + UI.BELOW_TOP_ROW : UI.EDGE) - UI.EDGE)
    : Math.max(0, m.bottom - (safeTop + UI.BELOW_TOP_ROW));
  const restH = Math.min(fullH, UI.HANDLE + (hasTrip ? m.card : m.content) + UI.PANEL_CHROME);
  const H = { rest: restH, half: fitted ? fullH : Math.round((restH + fullH) / 2), full: fullH };
  const topSnap = hasTrip ? 'full' : 'half';
  // the card is the lowest the panel goes: a drag down stops there
  const height = dy === null ? H[snap] : Math.max(restH, Math.min(H[topSnap], H[snap] - dy));
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  // with a trip, the details fade in as the panel rises above the card
  const bodyOpacity = hasTrip ? clamp01((height - restH) / 80) : 1;
  // the resting height, for what floats just above the panel (the location button)
  React.useLayoutEffect(() => { document.documentElement.style.setProperty('--sheet-rest', restH + 'px'); }, [restH]);

  // ---- moving between positions
  const goSnap = (t) => {
    if (!hasTrip && t === 'full') t = 'half';
    if (live.current.searching && t === 'rest') { const a = document.activeElement; if (a && a.blur) a.blur(); setSearching(false); }
    // no route yet: opening the panel starts typing the first empty station
    if (!hasTrip && t === 'half' && !live.current.searching && (!from || !to) && sheetRef.current) {
      const el = sheetRef.current.querySelector(`[data-station-input="${!from ? 'from' : 'to'}"]`);
      if (el) { el.focus(); if (!phone) setSnap('half'); return; }   // on phones the focus opens it
    }
    setSnap(t);
  };
  const tapHandle = () => goSnap(snap === 'rest' ? 'half' : snap === 'half' && hasTrip ? 'full' : 'rest');
  const go = (d) => { if (onSelectTrip && tripIndex + d >= 0 && tripIndex + d < trips.length) onSelectTrip(tripIndex + d); };
  const onEnd = ({ dx, dy: ddy, axis, top, vy = 0 }, fromBody) => {
    setDy(null);
    if (axis === 'x') {
      if (!searching && Math.abs(dx) > 50) go((dx < 0) !== (T.dir === 'rtl') ? 1 : -1);
      return;
    }
    if (axis !== 'y') return;
    if (fromBody && snap === 'full' && (!top || ddy < 0)) return;     // that was a scroll, not a drag
    const h = Math.max(restH, Math.min(H[topSnap], H[snap] - ddy));
    const order = hasTrip ? ['rest', 'half', 'full'] : ['rest', 'half'];
    let t;
    if (Math.abs(vy) > 0.4 && Math.abs(ddy) > 20)                    // a flick: the next position that way
      t = vy < 0 ? order.find(k => H[k] > h + 1) || topSnap : [...order].reverse().find(k => H[k] < h - 1) || 'rest';
    else t = order.reduce((b, k) => Math.abs(H[k] - h) < Math.abs(H[b] - h) ? k : b, 'rest');
    goSnap(t);
  };
  const stripSwipe = useSwipe({ onDrag: (d) => setDy(d), onEnd: (g) => onEnd(g, false) });
  // on the details: below 'full' any vertical drag moves the panel; at 'full' only a pull
  // down from the top does (otherwise it scrolls)
  const bodySwipe = useSwipe({ scrollRef: bodyRef, onDrag: (d, top) => { if (snap !== 'full' || (top && d > 0)) setDy(d); }, onEnd: (g) => onEnd(g, true) });
  React.useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [tripIndex, snap, searching]);

  // ---- typing a station (phones)
  const startSearch = () => {
    if (!phone || live.current.searching) return;
    pageLock.lock();
    setSearching(true); setSnap(live.current.hasTrip ? 'full' : 'half');
  };
  // runs after a field loses focus (the field's own short delay): unless the other field
  // took the focus, typing is over
  const endSearch = () => {
    const a = document.activeElement;
    if (!live.current.searching || (a && a.dataset && a.dataset.stationInput)) return;
    setSearching(false);
    setSnap('rest');
  };
  // the page is let go once the keyboard has gone, so it doesn't move under the closing keyboard
  React.useEffect(() => { if (!kb && !searching) pageLock.release(); }, [kb, searching]);
  // new stations: the trip card (once typing is over)
  const firstKey = React.useRef(true);
  React.useEffect(() => {
    if (firstKey.current) { firstKey.current = false; return; }
    if (!live.current.searching) setSnap('rest');
  }, [stationsKey]);
  const ease = 'cubic-bezier(.2,.7,.2,1)';
  // picking a station when the other one is already set: typing is over, so the keyboard
  // goes away (the panel then folds to the trip card and the map shows the route)
  const pick = (set, other) => (id) => {
    set(id);
    if (other && other !== id) { const a = document.activeElement; if (a && a.blur) a.blur(); }
  };

  return (
    <div ref={sheetRef} data-sheet="" style={{
      // an island: floats 8px from the sides and from the bottom of the visible area
      // (above the home indicator), all corners rounded, the map showing around it
      position:'fixed', left: UI.EDGE, right: UI.EDGE,
      // with the keyboard up: sits on top of it (the visible area's bottom edge)
      bottom: kb ? Math.max(0, vv.lh - (vv.top + vv.h)) + UI.EDGE : `calc(env(safe-area-inset-bottom, 0px) + ${UI.EDGE}px)`,
      height, transition: dy === null ? `height 300ms ${ease}, bottom 250ms ${ease}` : 'none',
      display:'flex', flexDirection:'column',
      background: 'var(--surface)',
      borderRadius: 24, overflow: 'hidden',
      // Shadow cast upward and kept within 8px below the island: iOS Safari clips fixed
      // elements at the top of its toolbar zone, just 8px under the island, so a deeper
      // shadow was cut off there in a hard grey band.
      boxShadow: '0 -6px 14px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.08)', border: '1px solid var(--chip-border)',
      paddingBottom: 6,
      zIndex: snap === 'full' || dy !== null ? 6 : 5,   // above the map buttons when up
    }}>
      {/* Top strip: handle + trip card. Drag up/down to move the panel, swipe sideways to change trip. */}
      <div {...stripSwipe} style={{ flexShrink: 0, touchAction: 'none' }}>
        <div style={{ display:'flex', justifyContent:'center', padding: '6px 0 4px', cursor: 'pointer' }}
          onClick={tapHandle} role="button" data-handle=""
          aria-label={T.t(snap === 'rest' ? 'expand' : 'collapse')} aria-expanded={snap === 'full'}>
          <div style={{ width: 32, height: 3, borderRadius: 3, background: '#D7D4CC' }}/>
        </div>
        {journey && (
          <div data-trip-card="">
            <div ref={sumRef} style={{ overflow:'hidden', minHeight: 0 }}>
              <TripSummary j={journey} live={!when} rt={rt} index={tripIndex} count={trips.length}
                onPrev={() => go(-1)} onNext={() => go(1)}/>
            </div>
          </div>
        )}
      </div>

      <div aria-hidden={bodyOpacity < 0.5 ? true : undefined} style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          borderTop: hasTrip ? '1px solid var(--chip-border)' : 'none',
          opacity: bodyOpacity, pointerEvents: bodyOpacity < 0.5 ? 'none' : 'auto',
          transition: dy === null ? `opacity 260ms ${ease}` : 'none' }}>
        <div ref={bodyRef} {...bodySwipe} style={{ overflowY: 'auto', overscrollBehavior: 'contain', flex: 1, minHeight: 0 }}>
        <div ref={contentRef}>
          {/* Search card: [time wheel | From/To rows joined by a route line | swap] */}
          <div style={{ padding: '4px 8px 2px' }}>
            {/* the panel's own colour, no border: its edge is a soft shadow */}
            <div style={{ position:'relative', display:'flex', alignItems:'center',
              background: 'var(--surface)', borderRadius: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 14px rgba(0,0,0,0.07)' }}>
              <TimeWheel when={when} setWhen={setWhen}/>
              <div aria-hidden="true" style={{ width: 1, alignSelf: 'stretch', margin: '10px 0', background: FADE_LINE('to bottom') }}/>
              <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                {/* route line: three dots spread evenly between the two station markers
                    (marker centres sit 21px from the rows' top and bottom; 5px radius) */}
                <span aria-hidden="true" style={{ position:'absolute', insetInlineStart: 12, width: 10, top: 26, bottom: 26,
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-evenly' }}>
                  {[0, 1, 2].map(k => <span key={k} style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--text-dim)', opacity: 0.7 }}/>)}
                </span>
                <StationAutocomplete label="from" placeholder={T.t('from')} value={from}
                  note={located && from === located.id ? T.t('kmAway', located.km) : null}
                  onLocate={navigator.geolocation ? onLocate : null} locating={locating}
                  onFocus={startSearch} onBlur={endSearch}
                  onChange={onSetFrom} onPick={pick(onSetFrom, to)}/>
                <div style={{ height: 1, background: FADE_LINE('to right'), marginInlineStart: 34, marginInlineEnd: 4 }}/>
                <StationAutocomplete label="to" placeholder={T.t('to')} value={to}
                  onFocus={startSearch} onBlur={endSearch}
                  onChange={onSetTo} onPick={pick(onSetTo, from)}/>
              </div>
              <button onClick={onSwap} title={T.t('swap')} aria-label={T.t('swap')} style={{
                width: 34, height: 34, borderRadius: 17, margin: '0 6px', flexShrink: 0,
                background: 'var(--surface)', border: '1px solid var(--chip-border)', cursor: 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', padding: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" style={{ transform: 'rotate(90deg)' }}>
                  <path d="M4 6h10M11 3l3 3-3 3M14 12H4M7 15l-3-3 3-3"
                    stroke="var(--text)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* the selected trip's timeline */}
          {journey && (
            <div key={tripIndex} style={{ padding: '0 16px 16px', animation: 'fadeIn 180ms ease-out' }}>
              <JourneyTimeline j={journey} live={!when} rt={rt}/>
              <TimetableNote borrowed={journey.borrowed}/>
            </div>
          )}
          {from && to && from !== to && !journey && (
            <div style={{ padding: '4px 16px 20px', color: 'var(--text-dim)', font: '500 13px var(--font)' }}>
              {T.t('noTrains')}
              <TimetableNote/>
            </div>
          )}

          {!journey && !(from && to) && !phone && (
            <div style={{ padding: '12px 16px 20px', color: 'var(--text-dim)', font: '500 13px var(--font)' }}>
              {T.t('hint')}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

function StationPopup({ stationId, onClose, onSetFrom, onSetTo }) {
  if (!stationId) return null;
  const s = APP_BY_ID[stationId];
  if (!s) return null;
  return (
    <div style={{
      position:'fixed', left: 12, right: 12, top: `calc(env(safe-area-inset-top, 0px) + ${window.UI.BELOW_TOP_ROW}px)`,
      background: 'var(--surface)', borderRadius: 16,
      boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
      border: '1px solid var(--chip-border)',
      padding: 14, zIndex: 6,
      animation: 'fadeIn 200ms ease-out',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font:'700 18px var(--font)', color:'var(--text)', letterSpacing:'-0.01em', marginBottom: 6 }}>
            {window.I18N.station(s.id)}
          </div>
          <div style={{ display:'flex', gap: 6, flexWrap:'wrap' }}>
            {s.lines.map(l => {
              const line = APP_LINES.find(x=>x.id===l);
              return (
                <div key={l} style={{
                  display:'flex', alignItems:'center', gap: 6,
                  background: 'var(--chip-bg)', borderRadius: 999,
                  padding: '3px 10px 3px 3px',
                }}>
                  <LineBadge lineId={l} size={20}/>
                  <span style={{ font:'500 12px var(--font)', color:'var(--text)' }}>{window.I18N.line(l)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <button onClick={onClose} aria-label={window.I18N.t('clear')} style={{
          border:'none', background:'var(--chip-bg)', width: 28, height: 28,
          borderRadius: 14, cursor:'pointer', color:'var(--text)', fontSize: 16,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>×</button>
      </div>
      <div style={{ display:'flex', gap: 8, marginTop: 12 }}>
        <button onClick={() => { onSetFrom(stationId); onClose(); }} style={{
          flex: 1, padding: '10px', borderRadius: 12,
          border: '1px solid var(--chip-border)', background: 'var(--chip-bg)',
          font: '600 13px var(--font)', color:'var(--text)', cursor:'pointer',
        }}>{window.I18N.t('departHere')}</button>
        <button onClick={() => { onSetTo(stationId); onClose(); }} style={{
          flex: 1, padding: '10px', borderRadius: 12,
          border: 'none', background: 'var(--text)',
          font: '600 13px var(--font)', color:'var(--surface)', cursor:'pointer',
        }}>{window.I18N.t('goHere')}</button>
      </div>
    </div>
  );
}

window.BottomSheet = BottomSheet;
window.StationPopup = StationPopup;
