<p align="center">
  <img src="assets/mesila-logo.svg" width="96" alt="Mesila logo: the Hebrew letter מ drawn as two rail lines">
</p>

<h1 align="center">Mesila · מסילה</h1>

<p align="center">An interactive Israel Railways map with trip planning, for phone and desktop, in English and Hebrew.</p>

<p align="center"><a href="https://donadinyaev.github.io/mesila-web/">Open the live app</a></p>

---

## What it does

- **Schematic network map:** all passenger lines drawn in metro-map style, with straight runs, 45° and 90° bends, parallel tracks through shared corridors, and interchange markers.
- **Trip planner:** tap two stations, or type them in the From/To boxes. The fastest route with the fewest changes is highlighted on the map, with a step-by-step timeline below.
- **Two layouts:**
  - **Desktop:** the full map with pan and zoom.
  - **Phone (under 600 px wide):** a tall, narrow version that scrolls only up and down, so every station is reachable with one finger.
- **English and Hebrew:** switch with the עב / EN button. Station names, line names and the whole interface are translated, and Hebrew runs right to left.
- **Line filter:** hide lines you don't use. The trip planner only routes over the lines you can see.
- **Night lines** (N1, N2): hidden by default, switched on in Tweaks.
- **Light and dark themes**, plus a choice of English and Hebrew fonts.

> Timetables in the app are simulated. Departure times, intervals and journey times are illustrative, not live Israel Railways data. See [PROJECT.md](PROJECT.md#known-limitations).

## Run it locally

There's no build step. The app is plain static files.

```bash
git clone https://github.com/DonAdinyaev/mesila-web.git
cd mesila-web
python3 -m http.server 8000      # or: npx serve .
```

Then open <http://localhost:8000>. Opening `index.html` straight from disk (`file://`) won't work, because the browser blocks the scripts it loads.

## Deploy

Every push to `main` is published to GitHub Pages by [`.github/workflows/pages.yml`](.github/workflows/pages.yml). No configuration is needed beyond enabling Pages ("GitHub Actions" as the source) in the repository settings.

## Project layout

```
index.html              App shell: top bar, line filter, Tweaks panel, fonts, theme
data/network.js         Lines, stations, desktop + phone coordinates, route planner
data/i18n.js            English/Hebrew strings, station, line and place names
components/MapSVG.js    Map renderer: track layout, bends, markers, labels, pan/zoom
components/Sheet.js     Bottom sheet: From/To search and trip timeline
assets/                 Logo files (light icon, dark icon, transparent mark)
.github/workflows/      GitHub Pages deployment
```

React 18 and Babel are loaded from a CDN and the JSX is compiled in the browser, so editing a file and refreshing is the whole development loop.

## More

- [PROJECT.md](PROJECT.md): goals, how the map and router work, data conventions, known limitations and roadmap
- [CHANGELOG.md](CHANGELOG.md): what changed and when
