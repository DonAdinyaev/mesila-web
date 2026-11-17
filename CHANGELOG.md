# Changelog

## 2026-11-17

- **Thinner outline on the chosen stations:** the black outline around the start and destination is now twice a normal station's outline instead of about six times, with the usual light edge around it.
- **Track order:** line 3 (lime) now runs east of line 7 (maroon) through Haifa and east of line 6 (blue) from Netanya through Tel Aviv.
- **Occasional service drawn automatically:** when some trains of a line stop where the map line doesn't, or run beyond its end, the app now works this out from the timetable when it loads, so a new timetable needs no map edits. Stops only some trains make get a hollow ring in the line's colour, with a pale fill of that colour (for example line 3 at Netanya and Hadera at night, line 4 at Atlit and Binyamina, line 5 at Lehavim). Track only some trains use is drawn hollow the same way (a coloured outline around a pale fill), continuing the line's own track. A trip that uses either is highlighted as one continuous line. Tapping such a line shows a small key ("some trains"). A regular stop still wins over an occasional one when matching a train to its line. With today's timetable every train now matches its line on the map (42 didn't before).
- **High-speed line extended to Hadera:** about 2 trains an hour on the Herzliya–Jerusalem line actually start at Hadera West and call at Netanya and Beit Yehoshua (passing Netanya Sapir). The map now draws the line from Hadera, so a direct trip such as Netanya → Tel Aviv Savidor is highlighted as one continuous pink line instead of seeming to change trains at Herzliya. Renamed to Hadera – Jerusalem.

## 2026-11-16

- **Region indicator removed** (the region bar and the region name label next to the scroll bar). On phones Safari's own scroll indicator remains.
- **Phone: native scroll indicator.** Dragging our own region bar made the map jump. On phones the map now uses Safari's own scroll indicator (touch and hold it to drag; native and smooth), and the region name rides beside its thumb, switching as you pass each region. Desktop keeps the draggable region bar.
- **iPhone:** removed the grey band under the trip panel. It was the panel's own drop shadow, which reached about 40px below it and was cut off by Safari at the top of its toolbar zone, 8px under the panel. The shadow is now cast upward and stays within those 8px.
- **Trip panel as an island:** the panel now floats as a rounded card 8px from the sides and from the bottom of the visible area, with the map showing around it, instead of being glued to the screen edge. Safari's own scroll bar is hidden on phones so only the region indicator shows.
- **Phone map scrolls as the page:** on a phone the map is now the page itself and scrolls natively (iOS momentum, bounce and toolbar behaviour), so Safari draws it behind its status bar and toolbar like any scrolled page. The header, buttons, region indicator and trip panel are fixed on top. Everything that moved the map (opening at Tel Aviv or your location, the locate and map buttons, the region indicator, showing a trip) now scrolls the page. Desktop is unchanged. `viewport-test.html` is a diagnostic page that shows what the browser draws behind its bars.
- **Smoother region indicator:** the thumb and region label follow instantly (no trailing animation), the thumb stays under your finger while dragging with the map catching up once per frame, and the label no longer flickers at a region border.
- **Starts at Tel Aviv:** without your location the map now opens on Tel Aviv (on a computer zoomed to the Tel Aviv area, Herzliya to Holon and the airport) instead of the top of the network. With no trip and no location, the map button on a phone also returns to Tel Aviv; on a computer it still shows the whole network.
- **Opens at your location:** when the app opens and your location arrives, the map scrolls to your blue dot. It does this once, and not if you've already moved the map by then.
- **Line filter removed.** Every line is always shown and used for planning.
- **Smarter map button:** the ⛶ button next to the zoom controls now shows your planned trip; with no trip, it brings your blue dot into view; only without either does it go back to the overview.
- **Locate scrolls to you:** the locate button now also brings your blue dot to the middle of the visible map (on a computer it zooms in a little too). It acts at once with the position the app already has, then refines it with a fresh fix. When From already holds your nearest station, the "Nearest station · …" line under the name is the locate button, so the name keeps its full width. Distances under 50 m show as 50 m instead of 0 m.
- **Smooth "you are here":** on a moving train the dot now glides to each new position (and its circle grows or shrinks with it) instead of jumping. Zooming moves it at once so it never trails the map, and with "Reduce motion" it doesn't animate.
- **Fix:** the "you are here" dot could land at the wrong station (e.g. next to Netanya – Sapir while you were in central Netanya). It was being placed along an express stretch drawn as one hop (Hof HaCarmel → Herzliya), whose in-between stations aren't spaced as in reality. Such hops are now skipped whenever a local stretch is drawn.
- **You are here.** Your position shows on the map as a blue dot, like in map apps. The map is a diagram, so the dot goes on the stretch of track you're closest to (by the stations' real positions), at the same point along it, or on the station itself within 300 m. It never floats in the background. When the position is approximate (weak GPS, or you're away from the track) a translucent circle shows how approximate. It follows you while the app is open.
- **Fix:** stop dots in an opened stop list now sit exactly on the line (they were 2 px off).
- **Fix:** the time wheel couldn't be scrolled back to earlier times while the trip details were scrolled to the top (the downward swipe was taken as dragging the panel). Swipes on the wheel now always scroll the wheel.
- **Map scrolling feels native.** The map's edges are elastic: drag past the end of the network and it gives way with growing resistance, and a glide that reaches an edge overshoots slightly; both spring back smoothly. A touch that stops a glide only stops it (it no longer also taps a station), quick flicks in the same direction add up, and with the system's "Reduce motion" setting the map neither glides nor bounces.
- **Easier flick:** the map now glides on slower flicks too, and a brief rest before lifting your finger (up to about a quarter of a second) just makes the glide gentler instead of cancelling it. Holding still longer than that still ends the drag in place.
- **Trip timeline alignment:** the time column now has one width for the whole trip (wider when times carry a weekday, e.g. "Tue 00:56"), so the line and station markers stay in one straight column. A trip leaving the evening before the picked time shows its real time ("22:56") instead of a negative one, and earlier alternatives that have already left are no longer offered.
- **Map keeps gliding after a flick.** Let go of the map while it's still moving and it carries on, slowing down smoothly like iPhone scrolling, and stops at the network's edges. Fast flicks glide too, even one too quick for the map to register as a drag (speed is measured from the moment the finger touches down to when it lifts, and capped so a violent flick doesn't fling the map away). A drag that stops before you lift doesn't glide, and touching the map stops a glide at once.
- **Nearest station as departure.** When the app opens with From empty, it asks for your location and fills From with the closest station, with "Nearest station · 200 m" under the name. Only stations within 25 km count, so nothing is filled in from abroad, and a station you've already picked is never overwritten. The locate button in the From field finds it again (with a fresh position). Station positions come from the official GTFS feed and refresh with the timetable.
- **Tab title and icon:** the browser tab now reads like the header, "Mesila · Israel Railways" ("מסילה · רכבת ישראל" in Hebrew), with the Mesila logo as its icon (a dark version in dark mode). Adding the app to an iPhone home screen uses the logo too.
- **Smoother panel drag from the details:** dragging the trip details down no longer jumps. The content used to move faster than the finger: an extra slide added to the fade, plus the iPhone's own elastic scroll. Now it follows the finger exactly, and only the fade remains.
- **Night lines merged into their day lines.** N1 ran line 3's route (Nahariya – Modi'in) and N2 the high-speed line's (Herzliya – Jerusalem) overnight, hourly, with fewer stops. Their trains now belong to line 3 and the high-speed line, are always included in trip planning (a 1 a.m. search finds the next night train instead of the first morning one) and are marked "Night train" with a moon. The "Show night lines" setting and the dashed night lines on the map are gone.
- **Time wheel:** the departure time now sits at the start of the station card as a scroll wheel: "Now", then 15-minute steps for the next week (later days are labelled, e.g. "Tomorrow"). It snaps to each step with a light vibration (Android; iPhone with iOS 18+ where Safari allows it) and re-plans when it stops. Tap the selected time to pick any other date and time.
- **Compact search:** From and To share one card (two slim rows joined by a route line, swap button inside), and the departure time is a single chip, "Leave now" or the picked time, that opens the phone's own date-time picker; "Now" resets it. The section is less than half its old height, and fields no longer make iPhones zoom in.
- Hebrew: the trip card's time range now reads right to left with the arrow pointing to the arrival.
- **Alternative trips:** the planner now finds several trips around your time, ordered by departure. Swipe left or right on the trip card (or use the ‹ › buttons) to move between them; the dots show where you are. The map follows the selected trip. With a picked time, a couple of earlier trips are included too.
- **Collapsible trip panel:** the trip card stays above the map at all times. Swipe down to hide the details, swipe up or tap the handle to bring them back. The panel follows your finger both ways, and the details fade out as it nears the bottom and back in as it rises. Let go and it snaps open or closed: a quick flick goes where you flicked, a slow drag to whichever is nearer. Scrolling the details never closes the panel by accident.

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
