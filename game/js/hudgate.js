// #659: het pauzemenu verbergt de HUD (visibility: hidden), maar de minimap,
// de prestatiekaart en de snelheidsmeter-prefetch bleven 60x/s doorrekenen.
// Deze pure regel zegt wanneer dat dure werk nog zin heeft.
export function hudExpensiveDue(pauseMenuOpen) {
  return !pauseMenuOpen;
}

// Efficiëntie: tekst die op een seconde of een tiende nauwkeurig is (doelregel, afstand,
// bedieningsregel) hoeft niet 60x/s opnieuw opgebouwd. `st` is { t: 0 }; dit geeft true bij de
// eerste aanroep en daarna één keer per `every` seconden (de rest van dt blijft niet staan).
export function intervalDue(st, dt, every) {
  st.t -= dt;
  if (st.t > 0) return false;
  st.t = every;
  return true;
}
