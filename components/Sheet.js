// Bottom sheet: From/To inputs, swap, search-results list, route details with schedule

const { LINES: APP_LINES, STATIONS: APP_STATIONS, BY_ID: APP_BY_ID, PATHS: APP_PATHS, route: findRoute } = window.MESILA;
// Terminus of a line in the direction of travel between two of its stations
function towardOf(lineId, aId, bId) {
  const p = APP_PATHS[lineId]; if (!p) return '';
  const i = p.indexOf(aId), j = p.indexOf(bId);
  return window.I18N.station(j >= i ? p[p.length - 1] : p[0]);
}

function fmtMin(m) {
  const h = Math.floor(m / 60), mm = Math.round(m % 60);
  return window.I18N.t('dur', h, mm);
}

function computeItinerary(path) {
  // returns { totalMin, segments:[{line, stations:[names], mins, stops}], transfers }
  if (!path || path.length < 2) return null;
  const segs = [];
  let cur = { line: path[1].line, stations: [window.I18N.station(path[0].id)], stationIds:[path[0].id], mins: 0, stops: 0 };
  for (let i = 1; i < path.length; i++) {
    const p = path[i], prev = path[i-1];
    if (p.line !== cur.line && i > 1) {
      segs.push(cur);
      cur = { line: p.line, stations: [window.I18N.station(prev.id)], stationIds:[prev.id], mins: 0, stops: 0 };
    }
    const a = APP_BY_ID[prev.id], b = APP_BY_ID[p.id];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    cur.mins += d / 60 + 0.9; // fake: 1 unit = ~1/60 min + dwell
    cur.stops += 1;
    cur.stations.push(window.I18N.station(p.id));
    cur.stationIds.push(p.id);
  }
  segs.push(cur);
  const transferMin = 2.5;
  const totalMin = segs.reduce((a,s)=>a+s.mins, 0) + (segs.length - 1) * transferMin;
  return { totalMin, segments: segs, transfers: segs.length - 1 };
}

function nextDepartures(lineId, baseMins = 0) {
  // Deterministic pseudo-random cadence based on line id
  const hash = [...lineId].reduce((a,c)=>a + c.charCodeAt(0), 0);
  const headway = 4 + (hash % 5); // 4-8 min
  const offset = (hash * 7) % headway;
  const now = new Date();
  const deps = [];
  for (let i = 0; i < 4; i++) {
    const m = offset + i * headway + baseMins;
    const t = new Date(now.getTime() + m * 60000);
    deps.push({ t, inMin: m });
  }
  return { headway, deps };
}

function StationAutocomplete({ label, placeholder, value, onChange, onPick, onFocus, autoFocus }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const display = value ? window.I18N.station(value) : '';
  const query = (q || display || '').toLowerCase();
  const results = open && query
    ? APP_STATIONS.filter(s => window.I18N.searchText(s.id).includes(query)).slice(0, 8)
    : [];

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--chip-bg)',
        border: '1px solid var(--chip-border)',
        borderRadius: 14,
        padding: '10px 14px',
        transition: 'border-color 150ms',
      }}>
        <span style={{
          width: 10, height: 10, borderRadius: 10,
          background: label === 'from' ? '#1A1A1C' : 'transparent',
          border: label === 'from' ? 'none' : '2px solid #1A1A1C',
          flexShrink: 0,
        }}/>
        <input
          ref={inputRef}
          value={open ? q : display}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQ(''); onFocus?.(); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            font: '500 15px var(--font)',
            color: 'var(--text)',
            minWidth: 0,
          }}
        />
        {value && (
          <button onClick={() => onChange(null)} style={{
            border:'none', background:'transparent', cursor:'pointer',
            color: 'var(--text-dim)', fontSize: 18, lineHeight: 1, padding: 2,
          }} title={window.I18N.t('clear')} aria-label={window.I18N.t('clear')}>×</button>
        )}
      </div>
      {results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--surface)', borderRadius: 14,
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
          border: '1px solid var(--chip-border)',
          overflow: 'hidden', zIndex: 10,
        }}>
          {results.map(s => (
            <div
              key={s.id}
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
              <div style={{ display:'flex', gap: 3 }}>
                {s.lines.map(l => {
                  const c = APP_LINES.find(x=>x.id===l)?.color;
                  return <span key={l} style={{ width: 8, height: 8, borderRadius: 8, background: c }}/>;
                })}
              </div>
              <span>{window.I18N.station(s.id)}</span>
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


// Timed itinerary: wait for first train, ride, transfer (walk + wait), ride…
function computeSchedule(it) {
  const now = new Date();
  let t = now.getTime();
  const legs = it.segments.map((seg, i) => {
    const dep = nextDepartures(seg.line, 0);
    const minGap = i === 0 ? 0 : 3; // platform change
    const target = t + minGap * 60000, base = dep.deps[0].t.getTime(), hw = dep.headway * 60000;
    const depart = new Date(base + Math.max(0, Math.ceil((target - base) / hw)) * hw), arrive = new Date(depart.getTime() + seg.mins * 60000);
    const leg = { seg, depart, arrive, headway: dep.headway, wait: Math.max(0, Math.round((depart.getTime() - t) / 60000)) };
    t = arrive.getTime();
    return leg;
  });
  return { legs, start: now, end: new Date(t), totalMin: (t - now.getTime()) / 60000 };
}

function TLNode({ kind, color }) {
  // kind: start | transfer | end
  const base = { width: 16, height: 16, borderRadius: 8, boxSizing:'border-box', position:'relative', zIndex: 1 };
  if (kind === 'start') return <span style={{ ...base, background:'#1A1A1C', border:'4px solid #1A1A1C', boxShadow:'inset 0 0 0 2px #fff' }}></span>;
  if (kind === 'end') return <span style={{ ...base, background:'#fff', border:'4px solid #1A1A1C' }}></span>;
  return <span style={{ ...base, background:'#fff', border:'3px solid #1A1A1C' }}></span>;
}

function RouteTimeline({ it, sched, fmtClock }) {
  const [open, setOpen] = React.useState({});
  const timeCol = { width: 46, flexShrink: 0, font:'600 13px "JetBrains Mono", ui-monospace, monospace', color:'var(--text)', paddingTop: 1 };
  const rail = { width: 24, flexShrink: 0, display:'flex', flexDirection:'column', alignItems:'center', position:'relative' };
  const bar = (c, dashed) => ({ position:'absolute', top: 0, bottom: 0, left: '50%', width: 6, marginLeft: -3, borderRadius: 3,
    background: dashed ? 'repeating-linear-gradient(to bottom, var(--chip-border) 0 4px, transparent 4px 8px)' : c });
  const legs = sched.legs;
  const rows = [];
  legs.forEach((leg, i) => {
    const line = APP_LINES.find(l => l.id === leg.seg.line);
    const first = leg.seg.stations[0], last = leg.seg.stations[leg.seg.stations.length - 1];
    const mid = leg.seg.stations.slice(1, -1);
    // Station row: start or transfer
    rows.push(
      <div key={'s'+i} style={{ display:'flex', gap: 8, alignItems:'flex-start' }}>
        <div style={timeCol}>{fmtClock(leg.depart)}</div>
        <div style={{ ...rail, paddingTop: 1 }}>
          {i > 0 && <span style={{ ...bar(APP_LINES.find(l => l.id === legs[i-1].seg.line).color), bottom: '50%' }}></span>}
          <span style={{ ...bar(line.color), top: 8 }}></span>
          <TLNode kind={i === 0 ? 'start' : 'transfer'}/>
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingBottom: 10 }}>
          <div style={{ font:'700 15px var(--font)', color:'var(--text)', letterSpacing:'-0.01em' }}>{first}</div>
          {i > 0 && <div style={{ font:'500 12px var(--font)', color:'var(--text-dim)', marginTop: 2 }}>{window.I18N.t('transferWait', leg.wait)}</div>}
        </div>
      </div>
    );
    // Ride row
    rows.push(
      <div key={'r'+i} style={{ display:'flex', gap: 8, alignItems:'stretch' }}>
        <div style={timeCol}></div>
        <div style={rail}><span style={bar(line.color)}></span></div>
        <div style={{ flex: 1, minWidth: 0, padding: '2px 0 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
            <LineBadge lineId={leg.seg.line} size={24}/>
            <div style={{ minWidth: 0 }}>
              <div style={{ font:'600 13px var(--font)', color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{window.I18N.t('toward', towardOf(leg.seg.line, leg.seg.stationIds[0], leg.seg.stationIds[leg.seg.stationIds.length - 1]))}</div>
              <div style={{ font:'500 12px var(--font)', color:'var(--text-dim)' }}>{i === 0 && leg.wait > 0 ? window.I18N.t('departsIn', leg.wait) : ''}{window.I18N.t('every', leg.headway)}</div>
            </div>
          </div>
          <button onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))} style={{
            marginTop: 8, display:'flex', alignItems:'center', gap: 6, border:'none', background:'transparent', padding: 0, cursor:'pointer',
            font:'500 12px "JetBrains Mono", ui-monospace, monospace', color:'var(--text-dim)' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: open[i] ? 'rotate(90deg)' : (window.I18N.dir === 'rtl' ? 'scaleX(-1)' : 'none'), transition:'transform 150ms' }}><path d="M3 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
            <span>{window.I18N.t('stops', leg.seg.stops, Math.round(leg.seg.mins))}</span>
          </button>
          {open[i] && mid.length > 0 && (
            <div style={{ marginTop: 6, display:'flex', flexDirection:'column', gap: 6 }}>
              {mid.map((n, j) => (
                <div key={j} style={{ display:'flex', alignItems:'center', gap: 8, marginInlineStart: -22 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: line.color, boxShadow:'0 0 0 2px var(--surface)', flexShrink: 0, position:'relative', zIndex: 1 }}></span>
                  <span style={{ font:'500 13px/1.3 var(--font)', color:'var(--text-dim)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', minWidth: 0 }}>{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
    if (i === legs.length - 1) {
      rows.push(
        <div key="end" style={{ display:'flex', gap: 8, alignItems:'flex-start' }}>
          <div style={timeCol}>{fmtClock(leg.arrive)}</div>
          <div style={{ ...rail, paddingTop: 1 }}>
            <span style={{ ...bar(line.color), bottom: '50%' }}></span>
            <TLNode kind="end"/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font:'700 15px var(--font)', color:'var(--text)', letterSpacing:'-0.01em' }}>{last}</div>
            <div style={{ font:'500 12px var(--font)', color:'var(--text-dim)', marginTop: 2 }}>{window.I18N.t('arrive')}</div>
          </div>
        </div>
      );
    } else {
      rows.push(null);
    }
  });
  return <div style={{ borderTop:'1px solid var(--chip-border)', paddingTop: 14 }}>{rows}</div>;
}

function BottomSheet({ from, to, onSetFrom, onSetTo, onSwap, route, onClose, expanded, setExpanded }) {
  const it = computeItinerary(route);
  const hasRoute = !!it;
  const now = new Date();
  const sched = hasRoute ? computeSchedule(it) : null;
  const fmtClock = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div data-sheet="" style={{
      position:'absolute', left: 0, right: 0, bottom: 0,
      background: 'var(--surface)',
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      boxShadow: '0 -8px 32px rgba(0,0,0,0.08)',
      paddingBottom: 'env(safe-area-inset-bottom, 12px)',
      maxHeight: expanded ? '55vh' : '40vh',
      overflowY: 'auto',
      transition: 'max-height 260ms cubic-bezier(.2,.7,.2,1)',
      zIndex: 5,
    }}>
      {/* grab handle */}
      <div style={{
        display:'flex', justifyContent:'center', padding: '8px 0 4px',
        cursor: 'grab',
      }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ width: 40, height: 4, borderRadius: 4, background: '#D7D4CC' }}/>
      </div>

      {/* From/To */}
      <div style={{ padding: '8px 16px 12px' }}>
        <div style={{ display:'flex', gap: 10, alignItems:'center' }}>
          <div style={{ flex: 1, display:'flex', flexDirection:'column', gap: 8 }}>
            <StationAutocomplete label="from" placeholder={window.I18N.t('from')} value={from}
              onChange={onSetFrom} onPick={onSetFrom}/>
            <StationAutocomplete label="to" placeholder={window.I18N.t('to')} value={to}
              onChange={onSetTo} onPick={onSetTo}/>
          </div>
          <button onClick={onSwap} title={window.I18N.t('swap')} aria-label={window.I18N.t('swap')} style={{
            width: 40, height: 40, borderRadius: 20,
            background: 'var(--chip-bg)', border: '1px solid var(--chip-border)',
            cursor: 'pointer', flexShrink: 0,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 6h10M11 3l3 3-3 3M14 12H4M7 15l-3-3 3-3"
                stroke="var(--text)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Route summary + timeline */}
      {hasRoute && sched && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap: 12, marginBottom: 14 }}>
            <div style={{ font: '700 28px var(--font)', letterSpacing: '-0.02em', color: 'var(--text)', whiteSpace:'nowrap' }}>{fmtMin(sched.totalMin)}</div>
            <div style={{ font: '500 13px "JetBrains Mono", ui-monospace, monospace', color: 'var(--text-dim)', whiteSpace:'nowrap' }}>{fmtClock(sched.start)} → {fmtClock(sched.end)}</div>
            <div style={{ marginInlineStart:'auto', font: '500 13px var(--font)', color: 'var(--text-dim)' }}>
              {it.transfers === 0 ? window.I18N.t('direct') : window.I18N.t('transfers', it.transfers)}
            </div>
          </div>
          <RouteTimeline it={it} sched={sched} fmtClock={fmtClock}/>
        </div>
      )}

      {!hasRoute && window.innerWidth >= 600 && (
        <div style={{ padding: '12px 16px 20px', color: 'var(--text-dim)', font: '500 13px var(--font)' }}>
          {window.I18N.t('hint')}
        </div>
      )}
    </div>
  );
}

function StationPopup({ stationId, onClose, onSetFrom, onSetTo }) {
  if (!stationId) return null;
  const s = APP_BY_ID[stationId];
  if (!s) return null;
  return (
    <div style={{
      position:'absolute', left: 12, right: 12, top: 68,
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
window.findRoute = findRoute;
