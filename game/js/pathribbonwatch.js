// Waakhond voor de route-ribbon (de gele chevronstrook op de weg, scene3d/routeribbon3d.js).
// Aanleiding: "Soms is ineens de route in de wereld niet meer te zien (op de mini-map wel)."
// De minimap tekent de route uit routing.js, de strook is een eigen mesh die kan wegvallen
// (mislukte bouw, uit de scene, alpha overal 0, grond eronder verschoven). Hier staat het pure deel,
// los van THREE: welke staat van de strook is fout, en hoeveel herstelacties waren er.
//
// Samen spelen: de route is lokaal per speler (routing.js is per game); de strook ook.

// Alles wat de strook onzichtbaar maakt terwijl er een actieve route vooruit ligt.
export const RIBBON_FAULTS = ['geen-mesh', 'niet-in-scene', 'verborgen', 'leeg', 'niet-eindig', 'onzichtbaar', 'bouw-mislukt', 'grond-verschoven'];

// Onder deze alpha ziet een speler de strook niet meer.
export const RIBBON_MIN_VISIBLE_ALPHA = 0.3;
// De bodem van de alpha als de hele strook van de verharding af ligt (route over gras, wegen nog niet geladen).
export const RIBBON_ALPHA_FLOOR = 0.45;
// Zoveel meter mag de grond onder de strook afwijken voordat hij als verschoven telt.
export const RIBBON_GROUND_TOLERANCE = 0.35;

// s: { wanted, flying, meshExists, inScene, visible, opacity, indexCount, finite, maxAlpha, buildFailed, groundDelta }
// wanted = er is een actieve route met een stuk vooruit en de navigatie hoort zichtbaar te zijn.
// Geeft de eerste fout, of null als de strook is zoals hij hoort.
export function ribbonFault(s) {
  if (!s || !s.wanted) return null;
  // Vliegen: de route is een luchtlijn (airguide.js, airLineFault); een ontbrekende grondstrook is dan geen fout.
  if (s.flying) return null;
  if (!s.meshExists) return 'geen-mesh';
  if (s.buildFailed) return 'bouw-mislukt';
  if (!s.inScene) return 'niet-in-scene';
  if (!s.visible) return 'verborgen';
  if (!(s.indexCount > 0)) return 'leeg';
  if (s.finite === false) return 'niet-eindig';
  if (!(s.opacity > 0.05) || !(s.maxAlpha >= RIBBON_MIN_VISIBLE_ALPHA)) return 'onzichtbaar';
  if (Math.abs(s.groundDelta || 0) > RIBBON_GROUND_TOLERANCE) return 'grond-verschoven';
  return null;
}

// Heeft de hele strook een te lage alpha (alle punten van de verharding af)? Dan hoort hij een bodem te krijgen:
// de route zelf is leidend, de verharding is alleen een hint om uit te doven.
export function needsAlphaFloor(alphas) {
  let max = 0;
  for (const a of alphas) if (a > max) max = a;
  return max < RIBBON_MIN_VISIBLE_ALPHA;
}

// Teller voor de technische info: aantal herstelacties, per reden, en de laatste.
const stats = { repairs: 0, byFault: {}, last: null, lastAt: 0 };
export function noteRibbonRepair(fault, now = Date.now()) {
  stats.repairs++;
  stats.byFault[fault] = (stats.byFault[fault] || 0) + 1;
  stats.last = fault;
  stats.lastAt = now;
  return stats.byFault[fault];
}
export function getRouteRibbonStats() {
  return { repairs: stats.repairs, byFault: { ...stats.byFault }, last: stats.last, lastAt: stats.lastAt };
}
export function resetRouteRibbonStats() {
  stats.repairs = 0; stats.byFault = {}; stats.last = null; stats.lastAt = 0;
}

// Eén regel voor de technische info (Ctrl+Shift+G): hoe vaak de waakhond de routestrook moest herstellen en waarom.
export function formatRibbonStats(st) {
  if (!st || !(st.repairs > 0)) return 'geen herstel nodig';
  const per = Object.entries(st.byFault || {}).map(([k, v]) => `${k} ${v}`).join(', ');
  return `${st.repairs}x hersteld (${per}), laatste: ${st.last}`;
}
