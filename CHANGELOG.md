# Changelog

## 2026-11-08 (timetable)

- **Real timetable.** Trip times now come from the planned Israel Railways timetable (Ministry of Transport GTFS open data) instead of a formula. Each leg shows the train number, its departure and arrival, and the time at every stop; changes show both arrival and onward departure.
- **Leave at:** plan for now or any date and time. Times are always Israel time, wherever you are. Shabbat and late-night gaps are handled: you get the next train that actually runs.
- The map highlight follows the actual trains.
- `tools/build_timetable.py` builds the data; a GitHub Action refreshes it twice a week and redeploys.
- Not live yet: no delays or cancellations.

## 2026-11-08

- New logo: the Hebrew letter מ drawn as two rail lines, in the map's own style. It's now in the top bar and in `assets/` (light icon, dark icon, transparent mark).
- Project documentation: README, PROJECT.md and this changelog.

## 2026-11-07

- **Trip planner** now routes only over the lines shown on the map. Before, a trip could ride a hidden night line, leaving a gap in the highlighted route.
- Route highlights now start and stop exactly at each station's marker on every line, on both layouts.
- **Phone map** fixes:
  - Line 1 reconnected at Herzliya.
  - Ra'anana to Rosh HaAyin straightened.
  - Airport, Pa'atei Modi'in and Yitzhak Navon junction redrawn as two nested right-angle turns.
  - Kfar Habad and Lod – Ganei Aviv moved so their names fit.
- First version on GitHub Pages.

## Earlier (design phase)

- Desktop map aligned with the official Israel Railways line map. Closed stations and lines (Jerusalem Malha branch) removed.
- Phone layout with vertical-only scrolling.
- English/Hebrew interface, font choices, light/dark theme.
- Label collision avoidance and constant-size labels at every zoom.
