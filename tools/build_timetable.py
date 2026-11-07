#!/usr/bin/env python3
"""Build data/timetable.js from the official Israel public-transport GTFS feed.

Source: Israel Ministry of Transport open data, https://gtfs.mot.gov.il/gtfsfiles/
Only agency 2 (Israel Railways) is kept. The output is the *planned* timetable
(no live delays), covering every day the feed's calendar covers (usually ~30 days).

Usage:
    python3 tools/build_timetable.py                 # download the feed, write data/timetable.js
    python3 tools/build_timetable.py --zip feed.zip  # use an already-downloaded feed

Standard library only, so it runs anywhere (including GitHub Actions) with no installs.
"""
import argparse, csv, datetime, io, json, os, sys, tempfile, urllib.request, zipfile

FEED_URL = 'https://gtfs.mot.gov.il/gtfsfiles/israel-public-transportation.zip'
RAIL_AGENCY = '2'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'timetable.js')

# GTFS stop_code -> Mesila station id (data/network.js). stop_code is the stable
# public number of a stop; stop_id can change between feeds.
STOP_CODES = {
    '17014': 'nahariya',   '17012': 'akko',        '17117': 'k_motzkin',   '17004': 'k_hayim',
    '17010': 'hutzot',     '17008': 'merkazit',    '17123': 'merkazit',    '17016': 'hashmona',
    '17018': 'bat_galim',  '17020': 'hof_carmel',  '17022': 'atlit',       '17024': 'binyamina',
    '17026': 'caesarea',   '17028': 'hadera',      '17030': 'netanya',     '17114': 'sapir',
    '17032': 'beit_yh',    '17034': 'herzliya',    '17036': 'university',  '17038': 'savidor',
    '17046': 'hashalom',   '17104': 'hahagana',    '17116': 'ahihud',      '17115': 'karmiel',
    '17110': 'yoknaam',    '17113': 'migdal',      '17112': 'afula',       '17111': 'beit_shean',
    '2653': 'hadera_e',    '2652': 'shomron',      '2643': 'tira',         '17121': 'raanana_w',
    '17122': 'raanana_s',  '17100': 'hod_hash',    '17092': 'kfar_saba',   '17094': 'rosh_ayin',
    '17044': 'ptkv_sgula', '17042': 'ptkv_arye',   '17040': 'bnei_brak',   '17090': 'bengurion',
    '17000': 'paatei',     '17002': 'modiin',      '17118': 'yitzhak_nav', '17048': 'holon_jct',
    '17050': 'holon_wolf', '17052': 'by_yoseftal', '17054': 'by_komem',    '17102': 'rz_dayan',
    '17096': 'yavne_w',    '17070': 'ashdod',      '17072': 'ashkelon',    '17056': 'kfar_habad',
    '17062': 'lod_gan',    '17058': 'lod',         '17098': 'rz_haris',    '17066': 'beer_yaakov',
    '17064': 'rehovot',    '17068': 'yavne_e',     '17060': 'ramla',       '17074': 'beit_shem',
    '17120': 'mazkeret',   '17119': 'kmalakhi',    '17080': 'kgat',        '17088': 'lehavim',
    '17082': 'bs_north',   '17084': 'bs_center',   '17086': 'dimona',      '17106': 'sderot',
    '17108': 'netivot',    '17109': 'ofakim',
}
WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']


def read(z, name):
    return csv.DictReader(io.TextIOWrapper(z.open(name), encoding='utf-8-sig'))


def mins(hms):
    h, m, s = (int(x) for x in hms.split(':'))
    return h * 60 + m + (1 if s >= 30 else 0)


def ymd(s):
    return datetime.date(int(s[:4]), int(s[4:6]), int(s[6:]))


def build(zpath):
    z = zipfile.ZipFile(zpath)
    feed_date = max(datetime.datetime(*i.date_time).date() for i in z.infolist()).isoformat()

    routes = {r['route_id']: r for r in read(z, 'routes.txt') if r['agency_id'] == RAIL_AGENCY}
    trips = {t['trip_id']: t for t in read(z, 'trips.txt') if t['route_id'] in routes}
    services = {t['service_id'] for t in trips.values()}
    cal = {c['service_id']: c for c in read(z, 'calendar.txt') if c['service_id'] in services}
    stops = {s['stop_id']: s for s in read(z, 'stops.txt')}

    # Active days per service, over the feed's whole calendar window
    first = min(ymd(c['start_date']) for c in cal.values())
    last = max(ymd(c['end_date']) for c in cal.values())
    ndays = (last - first).days + 1
    days = {}
    for sid, c in cal.items():
        a, b = ymd(c['start_date']), ymd(c['end_date'])
        days[sid] = {i for i in range(ndays)
                     if a <= first + datetime.timedelta(i) <= b
                     and c[WEEKDAYS[(first + datetime.timedelta(i)).weekday()]] == '1'}
    if any(n.filename == 'calendar_dates.txt' for n in z.infolist()):
        for r in read(z, 'calendar_dates.txt'):
            if r['service_id'] in days:
                i = (ymd(r['date']) - first).days
                if 0 <= i < ndays:
                    (days[r['service_id']].add if r['exception_type'] == '1' else days[r['service_id']].discard)(i)

    # Stop times (the big file: stream it, keep rail rows only)
    st = {}
    unknown = {}
    for r in read(z, 'stop_times.txt'):
        if r['trip_id'] not in trips:
            continue
        code = stops[r['stop_id']]['stop_code']
        sid = STOP_CODES.get(code)
        if sid is None:
            unknown[code] = stops[r['stop_id']]['stop_name']
            continue
        st.setdefault(r['trip_id'], []).append((int(r['stop_sequence']), sid, mins(r['departure_time'])))
    if unknown:
        sys.exit('Rail stops missing from STOP_CODES (add them, and to data/network.js): %r' % unknown)

    # Merge identical runs (same train number, stops and times) across services
    patterns = {}
    for tid, rows in st.items():
        rows.sort()
        seq = []
        for _, sid, t in rows:
            if seq and seq[-1][0] == sid:  # same station twice in a row (two GTFS stops) -> keep one
                continue
            seq.append((sid, t))
        if len(seq) < 2:
            continue
        train = routes[trips[tid]['route_id']]['route_desc'].split('-')[0].strip()
        key = (train, tuple(seq))
        patterns.setdefault(key, set()).update(days.get(trips[tid]['service_id'], ()))

    station_ids = sorted({sid for (_, seq) in patterns for sid, _ in seq})
    idx = {s: i for i, s in enumerate(station_ids)}
    day_sets, day_idx, out_trips = [], {}, []
    for (train, seq), dset in sorted(patterns.items(), key=lambda kv: (kv[0][1][0][1], kv[0][0])):
        if not dset:
            continue
        mask = ''.join('1' if i in dset else '0' for i in range(ndays))
        if mask not in day_idx:
            day_idx[mask] = len(day_sets)
            day_sets.append(mask)
        flat = [idx[seq[0][0]], seq[0][1]]
        for k in range(1, len(seq)):
            flat += [idx[seq[k][0]], seq[k][1] - seq[k - 1][1]]
        out_trips.append([day_idx[mask], int(train) if train.isdigit() else train, flat])

    data = {
        'source': 'Israel Ministry of Transport GTFS (gtfs.mot.gov.il), agency: Israel Railways',
        'feedDate': feed_date,
        'start': first.isoformat(),
        'days': ndays,
        'stations': station_ids,
        'daySets': day_sets,
        'trips': out_trips,
    }
    return data


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--zip', help='path to a downloaded GTFS zip (default: download it)')
    ap.add_argument('--out', default=OUT)
    a = ap.parse_args()
    zpath = a.zip
    if not zpath:
        fd, zpath = tempfile.mkstemp(suffix='.zip')
        os.close(fd)
        print('Downloading', FEED_URL, file=sys.stderr)
        req = urllib.request.Request(FEED_URL, headers={'User-Agent': 'mesila-timetable-builder'})
        with urllib.request.urlopen(req, timeout=600) as r, open(zpath, 'wb') as f:
            while True:
                b = r.read(1 << 20)
                if not b:
                    break
                f.write(b)
    data = build(zpath)
    if not a.zip:
        os.remove(zpath)
    js = ('// Israel Railways planned timetable. GENERATED by tools/build_timetable.py, do not edit.\n'
          '// Source: %s. Feed date %s.\n'
          '// trips: [daySet, trainNo, [station, departure (min after midnight), then station, +min, ...]]\n'
          '// daySets: one char per day from `start` ("1" = runs that day). Times past 24:00 belong to the service day.\n'
          'window.TIMETABLE = %s;\n') % (data['source'], data['feedDate'],
                                         json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    with open(a.out, 'w', encoding='utf-8') as f:
        f.write(js)
    print('Wrote %s: %d trains, %d stations, %s + %d days, %d KB' % (
        os.path.relpath(a.out), len(data['trips']), len(data['stations']), data['start'], data['days'],
        len(js.encode()) // 1024), file=sys.stderr)


if __name__ == '__main__':
    main()
