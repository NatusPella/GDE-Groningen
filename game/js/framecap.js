// Zuinige modus (#96): begrenst het aantal beelden per seconde, zodat een
// telefoon of laptop op batterij minder warm wordt. Pure rekenregel; main.js
// slaat een animatiebeeld over als deze true geeft. Test: scripts/framecap_test.mjs.
export const ZUINIG_FPS = 30;

// De echte schermperiode (#793). De cap-wacht is altijd een aantal
// schermverversingen, dus de kwaliteitsmeting (#561) moet de echte wacht
// aftrekken: op een 120/144 Hz-scherm is die veel groter dan de 60 Hz-aanname.
// In de zuinige modus krijgt skipFrame elk animatiebeeld te zien; de tijd sinds
// het vorige getekende beeld groeit tussen twee overgeslagen beelden met precies
// één schermperiode. Daaruit meten we de verversing (mediaan van de laatste
// metingen); tot er genoeg gemeten is, rekenen we met 60 Hz.
const REFRESH_60 = 1000 / 60;
let refreshMs = REFRESH_60;
let lastElapsed = 0;
const cadence = [];

function noteCadence(elapsedMs) {
  const step = elapsedMs - lastElapsed;
  lastElapsed = elapsedMs;
  if (!(step > 2 && step < 50)) return; // eerste beeld, hapering of verborgen tab: geen schermperiode
  cadence.push(step);
  if (cadence.length > 8) cadence.shift();
  if (cadence.length < 3) return;
  const sorted = [...cadence].sort((a, b) => a - b);
  refreshMs = sorted[sorted.length >> 1];
}

// De gemeten schermperiode in ms (60 Hz als er nog niets gemeten is).
export function screenRefreshMs() {
  return refreshMs;
}

// elapsedMs: tijd sinds het vorige getekende beeld. De marge van 3 ms laat een
// scherm van 60 Hz (16,7 ms per beeld) precies om het andere beeld tekenen.
export function skipFrame(elapsedMs, cap = ZUINIG_FPS) {
  noteCadence(elapsedMs); // #793: elk animatiebeeld is een meting van de schermperiode
  if (!(cap > 0)) return false;
  return elapsedMs < 1000 / cap - 3;
}

// De cap wacht bewust tussen twee beelden. Voor de kwaliteitsmeting (#561) moet
// dat wachten eraf: 30 fps op een 60 Hz-scherm meet 33,4 ms en zou anders als een
// trage GPU gelden, waarna de adaptieve kwaliteit de resolutie naar 50% zakt —
// precies het omgekeerde van wat de instelling belooft. refreshMs is de
// beeldperiode van het scherm (standaard de gemeten periode, #793); de cap tekent
// op de eerstvolgende verversing, dus de wachttijd is die verversingstrap min één
// beeld. Met een te kleine aanname corrigeert de meting te weinig en stapt een
// zuinige 30fps-machine op een snel scherm alsnog naar beneden.
export function capIdleMs(refreshMs = screenRefreshMs(), cap = ZUINIG_FPS) {
  if (!(cap > 0) || !(refreshMs > 0)) return 0;
  const target = 1000 / cap - 3;
  const stride = Math.ceil(target / refreshMs) * refreshMs;
  return Math.max(0, stride - refreshMs);
}

// Een gemeten beeldtijd zonder het bewuste wachten van de cap (#561).
export function frameWorkMs(ms, zuinig = false, refreshMs = screenRefreshMs()) {
  if (!zuinig) return ms;
  return Math.max(0, ms - capIdleMs(refreshMs));
}
