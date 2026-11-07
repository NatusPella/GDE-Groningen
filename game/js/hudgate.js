// #659: het pauzemenu verbergt de HUD (visibility: hidden), maar de minimap,
// de prestatiekaart en de snelheidsmeter-prefetch bleven 60x/s doorrekenen.
// Deze pure regel zegt wanneer dat dure werk nog zin heeft.
export function hudExpensiveDue(pauseMenuOpen) {
  return !pauseMenuOpen;
}
