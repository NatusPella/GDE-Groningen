// Fietstrucs en klimmen (#207): pure regels, geen DOM en geen THREE
// (scripts/bewegingrules_test.mjs).
//
// Zwemmen, over een hek springen en op een autodak klimmen doet player.js al
// (vaultkit.js, swim*); hier komt bij:
// - de wheelie op een gewone fiets: Ctrl vasthouden, trappen, tussen 2,5 m/s en
//   driekwart van de topsnelheid. Na een paar seconden zakt het voorwiel zachtjes
//   terug (balans kwijt) en de fietser trapt rustig door: niemand valt, niemand raakt gewond.
// - de standen voor de acteur (actoranim.js): zwemmen, klimmen en over iets heen springen.

export const WHEELIE = { minSpeed: 2.5, topShare: 0.75, pitch: 0.5, holdMax: 2.6, rise: 3.2, fall: 4.5, drag: 0.35 };

// De stoppie op de gewone fiets: Ctrl vasthouden en remmen; het achterwiel komt een beetje omhoog.
const STOPPIE = { minSpeed: 3.5, pitch: -0.32, holdMax: 2.2 };

export function createWheelie() {
  return { nose: false, nosed: 0, pitch: 0, held: 0, up: false, dist: 0, best: 0, lost: false };
}

// Eén stap. i: { trick, throttle, speed, top, dt }. Geeft de bijgewerkte staat terug (dezelfde
// instantie) en in s.slow de factor waarmee de snelheid dit beeld afneemt (1 = niets).
export function stepWheelie(s, i) {
  const dt = Math.max(0, Number.isFinite(i.dt) ? i.dt : 0);
  const speed = Math.abs(Number.isFinite(i.speed) ? i.speed : 0);
  const top = Number.isFinite(i.top) && i.top > 0 ? i.top : 7;
  const ok = !!i.trick && i.throttle > 0 && speed >= WHEELIE.minSpeed && speed <= top * WHEELIE.topShare;
  if (!i.trick) s.lost = false;
  let want = 0;
  const nose = !!i.trick && (i.brake || 0) > 0.5 && speed >= STOPPIE.minSpeed && !s.lost && !ok;
  s.nose = nose;
  if (nose) {
    s.nosed += dt;
    if (s.nosed > STOPPIE.holdMax) { s.lost = true; s.nosed = 0; s.nose = false; } else want = STOPPIE.pitch;
  } else s.nosed = 0;
  if (ok && !s.lost) {
    s.held += dt;
    if (s.held > WHEELIE.holdMax) { s.lost = true; s.held = 0; } else want = WHEELIE.pitch;
  } else if (!ok) s.held = 0;
  const k = Math.min(1, dt * (want > s.pitch ? WHEELIE.rise : WHEELIE.fall));
  s.pitch += (want - s.pitch) * k;
  if (Math.abs(s.pitch) < 0.01 && want === 0) s.pitch = 0;
  const was = s.up;
  s.up = s.pitch > 0.15;
  if (s.up) s.dist += speed * dt;
  else if (was) { s.best = Math.max(s.best, s.dist); s.dist = 0; }
  s.slow = s.up ? Math.pow(1 - WHEELIE.drag * 0.1, dt * 10) : 1;
  return s;
}

// De afstand in meters van de laatste en de beste wheelie, voor een prestatie of tip.
export const wheelieMeters = (s) => Math.round(Math.max(s.dist, s.best));

// --- standen voor de acteur ------------------------------------------------------------
// Elke functie geeft de hoeken (radialen) van de ledematen op tijdstip t, zoals
// actoranim.js ze in applyPose gebruikt: { legL, legR: { z, k }, armL, armR: { z, e }, chest: { z } }.
const sin = Math.sin;

// Zwemmen (schoolslag-achtig): armen om de beurt naar voren, benen trappelen, romp plat.
export function zwemStand(t) {
  const a = sin(t * 4.2), b = sin(t * 4.2 + Math.PI);
  return {
    armL: { z: 1.9 + a * 0.5, e: 0.3 + Math.max(0, a) * 0.5 }, armR: { z: 1.9 + b * 0.5, e: 0.3 + Math.max(0, b) * 0.5 },
    legL: { z: -0.15 + a * 0.35, k: 0.35 + Math.max(0, -a) * 0.4 }, legR: { z: -0.15 + b * 0.35, k: 0.35 + Math.max(0, -b) * 0.4 },
    chest: { z: -0.2 },
  };
}

// Klimmen: hand over hand, de knieën om de beurt omhoog.
export function klimStand(t) {
  const a = sin(t * 3), b = sin(t * 3 + Math.PI);
  return {
    armL: { z: 2.5 + a * 0.4, e: 0.7 }, armR: { z: 2.5 + b * 0.4, e: 0.7 },
    legL: { z: 0.5 + Math.max(0, a) * 0.7, k: 0.9 + Math.max(0, a) * 0.4 }, legR: { z: 0.5 + Math.max(0, b) * 0.7, k: 0.9 + Math.max(0, b) * 0.4 },
    chest: { z: 0.1 },
  };
}

// Over een hek: p loopt van 0 (afzet) tot 1 (landing). Benen opgetrokken in het midden, armen vooruit.
export function sprongStand(p) {
  const q = Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0));
  const up = sin(q * Math.PI);
  return {
    armL: { z: 0.4 + up * 1.3, e: 0.3 }, armR: { z: 0.4 + up * 1.3, e: 0.3 },
    legL: { z: 0.2 + up * 1.5, k: up * 1.6 }, legR: { z: 0.1 + up * 1.1, k: up * 1.2 },
    chest: { z: up * 0.25 },
  };
}
