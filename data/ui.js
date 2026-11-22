// Screen layout constants shared by the app shell (index.html), the map (MapSVG.js) and the
// panel (Sheet.js), so the parts that depend on each other's sizes change together.
// All in CSS px; "below the safe area" means below the status bar / notch.
window.UI = (() => {
  const EDGE = 8;          // gap between the panel and the screen edges
  const TOP_ROW = 12;      // top of the top row of buttons (language switch), below the safe area
  const BTN = 40;          // the round buttons: language, location, zoom
  return {
    EDGE, TOP_ROW, BTN,
    BELOW_TOP_ROW: TOP_ROW + BTN + EDGE,   // 60: the map buttons column, the panel at 'full', popups
    MAP_TOP_PAD: 64,       // the map keeps what it centres on (a trip, you) this far below the safe area
    LOCATE_GAP: 10,        // the location button's gap above the panel at rest
    HANDLE: 13,            // the panel's handle strip: 6 + 3 (bar) + 4
    PANEL_CHROME: 8,       // the panel's bottom padding (6) + border (2)
    // A phone held sideways (wider than tall, and short): the panel is a column on the
    // left, full height, instead of a sheet at the bottom
    SIDE_W: 340,           // the side panel's width
    isSide: () => window.innerWidth > window.innerHeight && window.innerHeight < 500,
  };
})();
