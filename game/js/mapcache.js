// #661: de kaartoverlay bouwde elke frame de complete dynamische laag opnieuw op
// terwijl de wereld stilstond (menu open, speler stil). Staat hij stil en is er
// niets vuil, dan is 15 Hz ruim genoeg voor de pulserende markers en de route;
// bij beweging, invoer of een vuile laag tekent hij gewoon elke frame.
export const MAP_RENDER_HZ = 15;

export function mapRenderDue(now, last, paused, dirty, hz = MAP_RENDER_HZ) {
  if (!paused || dirty) return true;
  return now - last >= 1000 / hz;
}
