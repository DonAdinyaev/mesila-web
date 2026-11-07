# Mesila web app

Interactive Israel Railways map with trip planning: desktop and phone layouts, English and Hebrew.

Live site (GitHub Pages): https://donadinyaev.github.io/mesila-web/

Files (keep this structure; index.html loads the others by relative path):
- index.html: app shell (React 18.3.1 + Babel standalone 7.29.0 from unpkg), header, line filter, Tweaks panel, fonts
- data/network.js: lines, stations, desktop coordinates, the MOBILE layout, and the router `route(from, to, allowedLines)`
- data/i18n.js: Hebrew/English UI strings, station, line and geography names
- components/MapSVG.js: octolinear map renderer, label placement, pan/zoom, route highlight
- components/Sheet.js: bottom sheet with From/To search and trip timeline

Run locally: serve this folder with any static server and open index.html (file:// won't load the scripts).

Deploy: every push to `main` is published to GitHub Pages by `.github/workflows/pages.yml`.
