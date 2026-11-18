<p align="center">
  <img src="assets/mesila-logo.svg" width="96" alt="Mesila logo: the Hebrew letter מ drawn as two rail lines">
</p>

<h1 align="center">Mesila · מסילה</h1>

<p align="center">An interactive Israel Railways map with trip planning, for phone and desktop, in English and Hebrew.</p>

<p align="center"><a href="https://donadinyaev.github.io/mesila-web/">Open the live app</a></p>

---

## What it does

- **Schematic network map:** all passenger lines drawn in metro-map style, with straight runs, 45° and 90° bends, parallel tracks through shared corridors, and interchange markers.
- **You are here:** a blue dot on the line or station nearest to you, with a translucent circle when the position is approximate.
- **Nearest station:** when the app opens it asks for your location (once; the browser remembers) and fills From with the closest station, showing how far it is. The locate button in the From field does it again.
- **Trip planner:** tap two stations, or type them in the From/To boxes. The planner finds the earliest-arriving trains in the real timetable (fewest changes on a tie), highlights them on the map and lists each train with its number, departure, arrival and every stop's time. Leave now or pick a date and time.
- **Two layouts:**
  - **Desktop:** the full map with pan and zoom.
  - **Phone (under 600 px wide):** a tall, narrow version that scrolls only up and down, so every station is reachable with one finger.
- **English and Hebrew:** switch with the עב / EN button. Station names, line names and the whole interface are translated, and Hebrew runs right to left.
- **Night trains:** the overnight service runs as part of line 3 (Nahariya – Modi'in) and the high-speed line (Herzliya – Jerusalem) with fewer stops. It's always included in trip planning and marked with a moon.
- **Light and dark themes**, plus a choice of English and Hebrew fonts.

> Times come from the **planned Israel Railways timetable** (Ministry of Transport open data, GTFS), refreshed twice a week. They are not live: delays and last-minute changes are not shown. See [PROJECT.md](PROJECT.md#timetable).

## Run it locally

There's no build step. The app is plain static files.

```bash
git clone https://github.com/DonAdinyaev/mesila-web.git
cd mesila-web
python3 -m http.server 8000      # or: npx serve .
```

Then open <http://localhost:8000>. Opening `index.html` straight from disk (`file://`) won't work, because the browser blocks the scripts it loads.

## Deploy

Every push to `main` is tested and then published to GitHub Pages by [`.github/workflows/pages.yml`](.github/workflows/pages.yml); a version that fails the tests is not published. The deploy also stamps every script's `?v=` in `index.html` with the commit id, so phones load the new files (no need to bump those numbers by hand). No configuration is needed beyond enabling Pages ("GitHub Actions" as the source) in the repository settings.

## Tests

Browser tests in [`tests/`](tests/) (Node's test runner + Playwright, Chromium) cover the trip panel: its positions and gestures (drags, flicks, the handle), typing a station with and without a route, the iPhone keyboard handling (with a simulated visual viewport: the panel fits above the keyboard, the map doesn't move, all is restored after), that swipes on the panel never scroll the map, and that the app loads cleanly on a phone and a computer in both languages. They run offline: React and Babel come from `node_modules` instead of the CDN, fonts are stubbed and the live-delays relay is blocked.

```bash
npm install                      # once
npx playwright install chromium  # once, if Playwright has no browser yet
npm test
```

[`.github/workflows/tests.yml`](.github/workflows/tests.yml) runs them on every push to a branch and on pull requests.

## Update the timetable

[`.github/workflows/timetable.yml`](.github/workflows/timetable.yml) does this on Sundays and Wednesdays (or on demand from the Actions tab) and redeploys the site if anything changed. To do it by hand:

```bash
python3 tools/build_timetable.py              # downloads ~150 MB, writes data/timetable.js
python3 tools/build_timetable.py --zip feed.zip   # or use a feed you already downloaded
```

The script needs only Python 3's standard library.

## Platforms and live delays

The trip card and timeline show each train's platforms, and live delays ("4 min late", new times in red, a warning when a change is likely missed) for trains running now, refreshed every 30 seconds. They come from Israel Railways' own API (`rail-api.rail.co.il`, unofficial: it is the API behind rail.co.il). That API only answers browsers on www.rail.co.il, so the app asks a small relay instead:

- [`relay/worker.js`](relay/worker.js) is a Cloudflare Worker, deployed as `mesila-live` at `https://mesila-live.mesila.workers.dev/trains?from=3300&to=3700&date=YYYY-MM-DD`. It keeps the API key as a Worker secret (`RAIL_KEY`), caches each answer for 30 seconds, and only answers this site (and `localhost` for development).
- [`data/live.js`](data/live.js) has Israel Railways' station numbers for our stations (the Eastern line's Hadera East, Shomron and Tira are still missing) and applies the delays to the trip on screen.

To redeploy the relay after changing it (needs a Cloudflare API token with Workers edit rights):

```bash
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/workers/scripts/mesila-live" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'metadata={"main_module":"worker.js","compatibility_date":"2026-11-01","keep_bindings":["secret_text"]};type=application/json' \
  -F 'worker.js=@relay/worker.js;type=application/javascript+module'
```

If the relay or the API is down, the app simply shows the planned times.

## Project layout

```
index.html              App shell: loading screen, language switch, map buttons, Tweaks panel, fonts, theme
data/ui.js              Shared screen layout sizes (button row, gaps, panel handle) used by the shell, map and panel
data/network.js         Lines, stations, desktop + phone coordinates
data/timetable.js       Planned Israel Railways timetable (GENERATED from GTFS, don't edit)
data/schedule.js        Matches trains to map lines; timetable trip planner
data/live.js            Live delays for the trip on screen (through relay/)
relay/worker.js         Cloudflare Worker relaying live delays from the Israel Railways API
tools/build_timetable.py  Builds data/timetable.js from the Ministry of Transport GTFS feed
data/i18n.js            English/Hebrew strings, station, line and place names
components/MapSVG.js    Map renderer: track layout, bends, markers, labels, pan/zoom
components/Sheet.js     The trip panel: positions and gestures, From/To search, trip card and timeline
tests/                  Browser tests (npm test)
assets/                 Logo files (light icon, dark icon, transparent mark), favicon and iPhone home-screen PNGs
.github/workflows/      Tests; GitHub Pages deployment (after the tests pass); twice-weekly timetable refresh
```

React 18 and Babel are loaded from a CDN and the JSX is compiled in the browser, so editing a file and refreshing is the whole development loop.

## More

- [PROJECT.md](PROJECT.md): goals, how the map and router work, data conventions, known limitations and roadmap
- [CHANGELOG.md](CHANGELOG.md): what changed and when
