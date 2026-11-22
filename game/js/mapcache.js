// #661: de kaartoverlay bouwde elke frame de complete dynamische laag opnieuw op
// terwijl de wereld stilstond (menu open, speler stil). Staat hij stil en is er
// niets vuil, dan is 15 Hz ruim genoeg voor de pulserende markers en de route;
// bij beweging, invoer of een vuile laag tekent hij gewoon elke frame.
export const MAP_RENDER_HZ = 15;

export function mapRenderDue(now, last, paused, dirty, hz = MAP_RENDER_HZ) {
  if (!paused || dirty) return true;
  return now - last >= 1000 / hz;
}

// Kaart-perf 22-11: wat doet de vaste laag (labels, namen, vaste pictogrammen) bij deze tekening?
// 'reuse': hetzelfde beeld en niets vuil, de vorige bitmap is goed.
// 'interim': het beeld is net veranderd (pannen/zoomen), schaal de vorige bitmap mee.
// 'build': bouw hem opnieuw (eerste keer, andere oorzaak van vuil, of het beeld staat stil).
export const OVERLAY_SETTLE_MS = 120;

export function overlayPlan({ valid, sameView, wasDirty, sameBase, sinceMoveMs }, settleMs = OVERLAY_SETTLE_MS) {
  if (valid && sameView && !wasDirty) return 'reuse';
  if (valid && !sameView && sameBase && sinceMoveMs < settleMs) return 'interim';
  return 'build';
}
