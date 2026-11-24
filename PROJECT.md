# Mesila: project overview

Mesila (מסילה, "railway") is a map-first trip planner for the Israel Railways passenger network. The guiding idea: a rail map should be as easy to read as a good metro map, and planning a trip should take two taps.

## Goals

1. **Readable schematic map:** a diagram, not a geographic map. Lines run straight, bend only at 45° or 90°, and keep their order through shared corridors, so you can follow any line by eye.
2. **Works on a phone:** a dedicated narrow layout that scrolls only vertically, with no pinch-zooming to find a station.
3. **Bilingual from the start:** Hebrew and English are both first-class, including right-to-left layout.
4. **Zero-install, no build to develop:** static files that run straight from the repository (the JSX compiles in the browser). The published site is compiled ahead for speed (`tools/build.mjs`), but nothing else is needed to host it, including GitHub Pages.

Non-goals for now: train positions on the map, ticketing, and accounts.

## Status

| Area | State |
|---|---|
| Network data (15 lines, Nov 2026 official map) | Done |
| Desktop map | Done |
| Phone map (vertical scroll) | Done |
| Trip planner | Done (planned timetable) |
| Platforms and live delays | Done (all lines except the Eastern line) |
| English / Hebrew | Done |
| Logo and app icons | Done |
| Published site built ahead (no Babel in the browser) | Done |
| Browser tests (run on every push) | Done |
| Real timetables (planned, GTFS) | Done |
| Offline / installable (PWA) | Not started |

## How it works

### Data model (`data/network.js`)

- **`LINES`:** id, number, name, colour and an optional `ink` (text colour on the line badge).
- **Stations:** id, English name, and desktop coordinates on a 1000-unit-wide grid with north up and the coast on the left. Phone coordinates live separately in `MOBILE`, on a 400-unit-wide grid.
- **Line paths:** the ordered list of stations each line serves. An entry prefixed with `~` is a station the line *passes through without stopping*. It reserves a track there, so bundles stay tidy, but gets no dot and is ignored by the router.

Station ids are stable, short snake_case keys (`hof_carmel`, `yitzhak_nav`). Every other file refers to stations by id, never by name.

### Map renderer (`components/MapSVG.js`)

The renderer turns station coordinates into a metro-style diagram in a few passes:

1. **Axis per station:** each station gets one of four directions (vertical, horizontal, or one of the two diagonals), taken from the way most of its lines travel. Lines always pass through a station along its axis, so markers never sit on a bend.
2. **Corridors and tracks:** chains of stations on one straight axis form a corridor. Every line keeps one fixed track across its whole corridor. Track order follows a preferred west-to-east line order, with a few hard rules (e.g. line 1 stays east-most at Herzliya). Gaps between tracks are closed where possible.
3. **Edges:** between two stations a line leaves along the first station's axis, enters along the second's, and meets at a single corner. Special cases cover branches that double back (a U of two right angles) and offset ends (a Z step).
4. **Bends:** parallel lines turning together share one centre, so bundles stay evenly spaced through curves.
5. **Labels:** each name tries its preferred side, then a short form, then the opposite side. It avoids markers, other labels, city names and, on phones, the lines themselves and the screen edges.

Desktop and phone share all of this. They differ only in coordinates and a small set of per-layout tweaks (`LAYOUT_D`, `LAYOUT_M`).

### Timetable

**Source.** The Israel Ministry of Transport publishes every operator's planned timetable as GTFS at <https://gtfs.mot.gov.il/gtfsfiles/israel-public-transportation.zip>. Israel Railways is agency `2`; each GTFS "route" is a single train number, and the feed has no line numbers.

**Build (`tools/build_timetable.py`).** Keeps the rail trips, maps GTFS `stop_code`s to station ids (`STOP_CODES`; the build fails loudly on an unknown rail stop, which is the signal that a station opened), expands the calendar to one flag per day, merges identical runs, records each station's real position (`coords`, from the GTFS stop latitude/longitude) and writes `data/timetable.js` (~120 KB): a list of trains, each with its days, train number, and stations with minute offsets.

**Line matching (`data/schedule.js`).** At load each train is matched to the map line whose stopping pattern contains its stops in order, preferring the line it skips the fewest stops of. A train with stops off every line gets the line covering most of its length. The overnight service (once separate night lines N1 and N2) belongs to line 3 and the high-speed line: a train on those lines that leaves between 23:45 and 05:00 and skips 3 or more of the line's stops, or calls where the line doesn't, is flagged `night` and shown with a moon.

**Planner.** A round-based connection scan: round *k* finds the earliest arrival at every station using at most *k* trains (up to 4), with a 3-minute minimum change. It returns the earliest arrival, with the fewest changes on a tie, then re-runs from later departures to leave as late as possible for the same arrival. Times are Israel wall-clock minutes from the search day's midnight, so the app is right in any viewer time zone; the search covers the previous day's after-midnight trains through the next day, 30 hours ahead (enough to span Shabbat).

The map highlight is built from the planned trains. A hop between stations that the train's map line doesn't serve is drawn on another line that does.

Trip planning needs `data/timetable.js`: there is no fallback planner any more (the old distance-based route with simulated times was removed).

### Platforms and live delays (`data/live.js`, `relay/worker.js`)

Israel Railways' own API (the one behind rail.co.il, unofficial) only answers browsers on its own site, so the app asks a small relay: a Cloudflare Worker (`relay/worker.js`, `mesila-live.mesila.workers.dev`) that holds the API key, caches each answer for 30 seconds and only answers this site. For each leg of the trip on screen, `data/live.js` asks for the trains between its first and last station that day and matches the train by number. That gives the departure and arrival platform of every train of the day, and, for trains running now, the delay at each station still ahead. The trip card and timeline then show "x min late" or "On time", the live times (planned ones struck through) and a warning when a change is likely to be missed; they refresh every 30 seconds while the trip is on screen. Planned times stay the base: without an answer (relay down, train not running yet) the trip shows as planned.

`data/live.js` maps our station ids to Israel Railways' station numbers. The Eastern line's Hadera East, Shomron and Tira have no number yet, so legs there get no live data.

### Trip panel (`components/Sheet.js`)

On phones the panel is a floating island at the bottom with three positions (the trip card, half, full), moved by dragging, flicking or tapping its handle; a sideways swipe on the trip card changes trip. Typing a station raises it above the on-screen keyboard. iOS Safari doesn't shrink the page for the keyboard, it slides the visible area over it, so the panel follows `window.visualViewport`, and the page (the map) is held still while typing by switching scrolling off (not by pinning the body as a fixed layer, which Safari doesn't draw behind its status bar and toolbar). On a phone held sideways (a short, wide screen) the panel is a full-height column on the left instead.

### Languages (`data/i18n.js`)

All interface text goes through `I18N.t(key)`, and names through `I18N.station(id)`, `I18N.line(id)` and `I18N.geo(label)`. The chosen language is remembered in the browser. Hebrew switches the page to right-to-left; the map itself stays left-to-right so geography doesn't flip.

### Map scrolling (`components/MapSVG.js`)

Panning follows common platform conventions for inertia: release speed from the last ~100 ms of moves (a rest of up to 250 ms before lifting softens rather than cancels it); exponential slow-down with a 325 ms time constant; speed limits 0.08–6 px/ms (12 px/ms when flicks add up); elastic edges (iOS-style rubber band while dragging, overshoot when gliding, critically damped spring back); a touch during a glide only catches it; same-direction flicks within 400 ms add up; `prefers-reduced-motion` turns gliding and bouncing off.

## Conventions

- **Adding a station:** add it to the station list with desktop coordinates, add `MOBILE` coordinates, add its Hebrew name in `i18n.js`, and insert it into the relevant line paths. Check both layouts, since crowded spots may need a label side or axis override.
- **Adding a line:** add it to `LINES` and to the line paths, place it in the preferred track order in `MapSVG.js`, and add its Hebrew name.
- **Closed stations and lines** are removed from the data rather than greyed out.
- Keep geometry on the grid: straight runs, 45° and 90° only. If a curve looks wrong, move a station before adding a special case.

## Known limitations

- **Live data only for trains running now.** Delays show once a train is on its way; cancellations and short-notice timetable changes are not shown, and the Eastern line has no live data yet.
- **The live data is unofficial.** It comes from the API behind rail.co.il through our relay, and could stop working if Israel Railways changes it. The app then shows planned times only.
- The feed covers about a month ahead. For a date outside it, the planner uses the same weekday from inside the feed and says so.
- Some real services stop at stations their line on the map doesn't serve (for example Hadera – Netanya – Jerusalem trains, or Nahariya – Be'er Sheva trains calling at Atlit and Binyamina). They are shown in the colour of the closest map line.
- Network data was transcribed by hand from the official line map (November 2026) and may lag behind service changes.
- React loads from a CDN (unpkg) and fonts from Google Fonts, so the app needs a network connection; it doesn't work offline yet.

## Roadmap ideas

- Installable PWA with offline map and planned timetable
- Live data for the Eastern line (Israel Railways numbers for Hadera East, Shomron, Tira)
- Accessibility pass: keyboard navigation, screen-reader station list
- Russian and Arabic interface

## Credits

Built by Don Adinyaev, with the map renderer, layouts and logo developed together with Claude.
Line colours and numbering follow the official Israel Railways line map. Mesila is an independent project and is not affiliated with Israel Railways.
