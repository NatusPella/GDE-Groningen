// De minimap tekent niet elk frame (de kaart kost 2 tot 14 ms). Deze module beslist, puur
// en zonder canvas of DOM, wanneer de volgende tekenbeurt aan de beurt is, zodat
// scripts/minimapcadence_test.mjs de regels kan natrekken; hud_panel.js voert alleen uit.
// Een stilstaande kaart (speler staat, kaart draait niet, zoom is uitgeëased) heeft geen
// 30 fps nodig: dan volstaat een rustige cadans voor pulsen en treinen. Een bewegende kaart
// houdt de eerdere cadans, zodat hij niet gaat stotteren naast de 60 fps-wereld.
export const MM_MIN_INTERVAL_MS = 33;
// #804: op een dure kaart (spoor/uitgezoomd: ~6 ms per tekenbeurt) 20 fps in plaats van 30.
export const MM_HEAVY_INTERVAL_MS = 50;
export const MM_HEAVY_COST_MS = 4;
// stilstaande kaart: alleen de animaties (pulsen, treinen, routes) lopen nog
export const MM_IDLE_INTERVAL_MS = 100;
// een tekenbeurt mag hooguit 10% van de tijd (was 1/16: 5 ms tekenen gaf 80 ms, 12 fps) kosten (kostenproportionele cadans, #804)
export const MM_COST_FACTOR = 10;
const MOVE_EPS_M = 0.05;
const TURN_EPS_RAD = 0.002;

const hoek = (a) => a - Math.round(a / (Math.PI * 2)) * Math.PI * 2;

// Is de kaart sinds de vorige tekenbeurt veranderd? prev/cur: { x, y, yaw }.
// settling: drawMinimap meldt dat zoom of rotatie nog uitgeëased wordt.
export function minimapMoved(prev, cur, settling = false) {
  if (settling || !prev || !cur) return true;
  if (![cur.x, cur.y, cur.yaw].every(Number.isFinite)) return true;
  return Math.abs(cur.x - prev.x) > MOVE_EPS_M || Math.abs(cur.y - prev.y) > MOVE_EPS_M || Math.abs(hoek(cur.yaw - prev.yaw)) > TURN_EPS_RAD;
}

// Het minimale aantal ms tussen twee tekenbeurten.
export function minimapIntervalMs(costMs, moved) {
  const basis = costMs > MM_HEAVY_COST_MS ? MM_HEAVY_INTERVAL_MS : MM_MIN_INTERVAL_MS;
  const rustig = moved ? basis : Math.max(basis, MM_IDLE_INTERVAL_MS);
  return Math.max(rustig, (costMs || 0) * MM_COST_FACTOR);
}

export function minimapRedrawDue(now, lastAt, costMs, moved) {
  return now - lastAt >= minimapIntervalMs(costMs, moved);
}
