# Mesila: project overview

Mesila (מסילה, "railway") is a map-first trip planner for the Israel Railways passenger network. The guiding idea: a rail map should be as easy to read as a good metro map, and planning a trip should take two taps.

## Goals

1. **Readable schematic map:** a diagram, not a geographic map. Lines run straight, bend only at 45° or 90°, and keep their order through shared corridors, so you can follow any line by eye.
2. **Works on a phone:** a dedicated narrow layout that scrolls only vertically, with no pinch-zooming to find a station.
3. **Bilingual from the start:** Hebrew and English are both first-class, including right-to-left layout.
4. **Zero-install, zero-build:** static files that run anywhere, including GitHub Pages.

Non-goals for now: live train positions, ticketing, and accounts.

## Status

| Area | State |
|---|---|
| Network data (15 lines, Nov 2026 official map) | Done |
| Desktop map | Done |
| Phone map (vertical scroll) | Done |
| Trip planner | Done (simulated times) |
| English / Hebrew | Done |
| Logo and app icons | Done |
| Real timetables | Not started |
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

### Trip planner (`route()` in `data/network.js`)

A shortest-path search over (station, line) pairs. Distance is the cost, and every change of line adds a fixed transfer penalty, so the planner prefers fewer changes unless a change saves real distance. It only uses the lines currently visible on the map, so every leg it suggests is drawn.

### Languages (`data/i18n.js`)

All interface text goes through `I18N.t(key)`, and names through `I18N.station(id)`, `I18N.line(id)` and `I18N.geo(label)`. The chosen language is remembered in the browser. Hebrew switches the page to right-to-left; the map itself stays left-to-right so geography doesn't flip.

## Conventions

- **Adding a station:** add it to the station list with desktop coordinates, add `MOBILE` coordinates, add its Hebrew name in `i18n.js`, and insert it into the relevant line paths. Check both layouts, since crowded spots may need a label side or axis override.
- **Adding a line:** add it to `LINES` and to the line paths, place it in the preferred track order in `MapSVG.js`, and add its Hebrew name.
- **Closed stations and lines** are removed from the data rather than greyed out.
- Keep geometry on the grid: straight runs, 45° and 90° only. If a curve looks wrong, move a station before adding a special case.

## Known limitations

- **Times are simulated.** Departures, intervals and journey times come from a fixed formula, not Israel Railways timetables or live data. Don't use the app to catch a real train.
- No service patterns: the planner assumes every line runs all day, and night lines are treated like any other line when shown.
- Network data was transcribed by hand from the official line map (November 2026) and may lag behind service changes.
- React and Babel load from a CDN at runtime, so the first load needs a network connection and is slower than a pre-built bundle would be.

## Roadmap ideas

- Real timetables from Israel Railways open data (GTFS)
- Installable PWA with offline map
- Accessibility pass: keyboard navigation, screen-reader station list
- Pre-built bundle (drop in-browser Babel) for faster first load
- Russian and Arabic interface

## Credits

Built by Don Adinyaev, with the map renderer, layouts and logo developed together with Claude.
Line colours and numbering follow the official Israel Railways line map. Mesila is an independent project and is not affiliated with Israel Railways.
