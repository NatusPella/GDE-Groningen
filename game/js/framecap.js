// Zuinige modus (#96): begrenst het aantal beelden per seconde, zodat een
// telefoon of laptop op batterij minder warm wordt. Pure rekenregel; main.js
// slaat een animatiebeeld over als deze true geeft. Test: scripts/framecap_test.mjs.
export const ZUINIG_FPS = 30;

// elapsedMs: tijd sinds het vorige getekende beeld. De marge van 3 ms laat een
// scherm van 60 Hz (16,7 ms per beeld) precies om het andere beeld tekenen.
export function skipFrame(elapsedMs, cap = ZUINIG_FPS) {
  if (!(cap > 0)) return false;
  return elapsedMs < 1000 / cap - 3;
}
