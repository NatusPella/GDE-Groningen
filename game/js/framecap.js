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

// De cap wacht bewust tussen twee beelden. Voor de kwaliteitsmeting (#561) moet
// dat wachten eraf: 30 fps op een 60 Hz-scherm meet 33,4 ms en zou anders als een
// trage GPU gelden, waarna de adaptieve kwaliteit de resolutie naar 50% zakt —
// precies het omgekeerde van wat de instelling belooft. refreshMs is de
// beeldperiode van het scherm; de cap tekent op de eerstvolgende verversing, dus
// de wachttijd is die verversingstrap min één beeld. Standaard 60 Hz: op een
// sneller scherm is de echte wachttijd groter, dus deze waarde corrigeert nooit
// te veel (hooguit te weinig, en dan blijft een echt traag beeld zichtbaar).
export function capIdleMs(refreshMs = 1000 / 60, cap = ZUINIG_FPS) {
  if (!(cap > 0) || !(refreshMs > 0)) return 0;
  const target = 1000 / cap - 3;
  const stride = Math.ceil(target / refreshMs) * refreshMs;
  return Math.max(0, stride - refreshMs);
}

// Een gemeten beeldtijd zonder het bewuste wachten van de cap (#561).
export function frameWorkMs(ms, zuinig = false, refreshMs = 1000 / 60) {
  if (!zuinig) return ms;
  return Math.max(0, ms - capIdleMs(refreshMs));
}
