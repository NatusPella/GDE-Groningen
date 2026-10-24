// Fietstrucs en klimmen (#207): pure regels, geen DOM en geen THREE
// (scripts/bewegingrules_test.mjs).
//
// Zwemmen, over een hek springen en op een autodak klimmen doet player.js al
// (vaultkit.js, swim*); hier komt bij:
// - de wheelie op een gewone fiets: Ctrl vasthouden, trappen, tussen 2,5 m/s en
//   driekwart van de topsnelheid. Na een paar seconden zakt het voorwiel zachtjes
//   terug (balans kwijt) en de fietser trapt rustig door: niemand valt, niemand raakt gewond.
// - zonder handen rijden boven driekwart van de topsnelheid (HANDS), en de houding van de fietser bij
//   wheelie, stoppie en zonder handen (fietsHouding).
// - de standen voor de acteur (actoranim.js en de speler in scene3d.js): zwemmen, klimmen en over iets heen springen.

export const WHEELIE = { minSpeed: 2.5, topShare: 0.75, pitch: 0.5, holdMax: 2.6, rise: 3.2, fall: 4.5, drag: 0.35 };

// Het sprongetje (bunny hop) op de gewone fiets: Ctrl vasthouden en de rem (Spatie) kort aantikken (korter dan `tap`
// seconden) bij minstens `minSpeed` m/s; beide wielen komen van de grond (`vz` m/s omhoog, ruim een halve
// meter hoog, de landing is zacht). Een lange rem blijft een stoppie. Daarna `cooldown` seconden rust.
export const HOP = { minSpeed: 2.5, tap: 0.22, vz: 3.1, cooldown: 0.6 };

// De stoppie op de gewone fiets: Ctrl vasthouden en remmen; het achterwiel komt een beetje omhoog.
const STOPPIE = { minSpeed: 3.5, pitch: -0.32, holdMax: 2.2 };

// Zonder handen (handsfree): Ctrl vast en trappen boven driekwart van de topsnelheid, waar een wheelie niet meer kan,
// rechtdoor (stuur minder dan `steer`): de handen gaan van het stuur de lucht in. Zodra je bocht neemt, rem pakt of
// Ctrl loslaat, pakt de fietser het stuur weer. Alleen de houding verandert; de fiets rijdt hetzelfde.
export const HANDS = { steer: 0.3, rise: 5, fall: 8 };

export function createWheelie() {
  return { nose: false, nosed: 0, pitch: 0, held: 0, up: false, dist: 0, best: 0, lost: false, brakeT: 0, hop: false, hopCool: 0, hops: 0, hands: 0, handsT: 0, handsBest: 0 };
}

// Eén stap. i: { trick, throttle, speed, top, dt }. Geeft de bijgewerkte staat terug (dezelfde
// instantie) en in s.slow de factor waarmee de snelheid dit beeld afneemt (1 = niets).
export function stepWheelie(s, i) {
  const dt = Math.max(0, Number.isFinite(i.dt) ? i.dt : 0);
  const speed = Math.abs(Number.isFinite(i.speed) ? i.speed : 0);
  const top = Number.isFinite(i.top) && i.top > 0 ? i.top : 7;
  const ok = !!i.trick && i.throttle > 0 && speed >= WHEELIE.minSpeed && speed <= top * WHEELIE.topShare;
  if (!i.trick) s.lost = false;
  // het sprongetje: de rem kort aantikken met de trucknop ingedrukt; s.hop is één beeld lang waar
  s.hop = false;
  s.hopCool = Math.max(0, (s.hopCool || 0) - dt);
  if (i.trick && (i.brake || 0) > 0.5) s.brakeT = (s.brakeT || 0) + dt;
  else {
    if (i.trick && s.brakeT > 0 && s.brakeT < HOP.tap && speed >= HOP.minSpeed && s.hopCool <= 0 && !i.airborne) { s.hop = true; s.hopCool = HOP.cooldown; s.hops = (s.hops || 0) + 1; }
    s.brakeT = 0;
  }
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
  // zonder handen: boven de wheelie-snelheid, rechtdoor, op de grond; s.hands loopt zacht van 0 naar 1
  const steer = Math.abs(Number.isFinite(i.steer) ? i.steer : 0);
  const free = !!i.trick && i.throttle > 0 && speed > top * WHEELIE.topShare && steer < HANDS.steer && !(i.brake > 0.1) && !i.airborne;
  s.hands = Math.max(0, Math.min(1, s.hands + (free ? 1 : -1) * dt * (free ? HANDS.rise : HANDS.fall)));
  if (s.hands > 0.5) { s.handsT += dt; s.handsBest = Math.max(s.handsBest, s.handsT); } else s.handsT = 0;
  return s;
}

// De afstand in meters van de laatste en de beste wheelie, voor een prestatie of tip.
export const wheelieMeters = (s) => Math.round(Math.max(s.dist, s.best));

// --- standen voor de acteur ------------------------------------------------------------
// Elke functie geeft de hoeken (radialen) van de ledematen op tijdstip t, zoals
// actoranim.js ze in applyPose gebruikt: { legL, legR: { z, k }, armL, armR: { z, e }, chest: { z } }.
// Met een eigen `o` (newStand()) schrijven ze daarin en maken ze niets nieuws: de speler gebruikt
// dat elk beeld. Zonder `o` krijg je een vers object (cutscenes, tests).
const sin = Math.sin;
const clamp01 = (x) => (x > 1 ? 1 : x > 0 ? x : 0);
export const newStand = () => ({ armL: { z: 0, e: 0 }, armR: { z: 0, e: 0 }, legL: { z: 0, k: 0 }, legR: { z: 0, k: 0 }, chest: { z: 0 } });
const fill = (o, aLz, aLe, aRz, aRe, lLz, lLk, lRz, lRk, cz) => {
  o.armL.z = aLz; o.armL.e = aLe; o.armR.z = aRz; o.armR.e = aRe;
  o.legL.z = lLz; o.legL.k = lLk; o.legR.z = lRz; o.legR.k = lRk;
  o.chest.z = cz;
  return o;
};

// Zwemmen (schoolslag-achtig): armen om de beurt naar voren, benen trappelen, romp plat.
export function zwemStand(t, o = newStand()) {
  const a = sin(t * 4.2), b = -a;
  return fill(o, 1.9 + a * 0.5, 0.3 + Math.max(0, a) * 0.5, 1.9 + b * 0.5, 0.3 + Math.max(0, b) * 0.5,
    -0.15 + a * 0.35, 0.35 + Math.max(0, -a) * 0.4, -0.15 + b * 0.35, 0.35 + Math.max(0, -b) * 0.4, -0.2);
}

// Klimmen: hand over hand, de knieën om de beurt omhoog.
export function klimStand(t, o = newStand()) {
  const a = sin(t * 3), b = -a;
  return fill(o, 2.5 + a * 0.4, 0.7, 2.5 + b * 0.4, 0.7,
    0.5 + Math.max(0, a) * 0.7, 0.9 + Math.max(0, a) * 0.4, 0.5 + Math.max(0, b) * 0.7, 0.9 + Math.max(0, b) * 0.4, 0.1);
}

// Over een hek: p loopt van 0 (afzet) tot 1 (landing). Benen opgetrokken in het midden, armen vooruit.
export function sprongStand(p, o = newStand()) {
  const q = Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0));
  const up = sin(q * Math.PI);
  return fill(o, 0.4 + up * 1.3, 0.3, 0.4 + up * 1.3, 0.3, 0.2 + up * 1.5, up * 1.6, 0.1 + up * 1.1, up * 1.2, up * 0.25);
}

// Aaien: door de knieën, rechterhand strijkt heen en weer, linkerhand steunt. u loopt van 0 tot 1; in- en uitzakken zacht.
export function aaienStand(u, o = newStand()) {
  const q = clamp01(Number.isFinite(u) ? u : 0);
  const env = clamp01(Math.min(q / 0.18, (1 - q) / 0.15));
  const streel = sin(q * Math.PI * 9) * 0.18 * env;
  fill(o, 0.9 * env, 0.4 * env, (1.35 + streel) * env, (0.35 + Math.abs(streel)) * env, 0.65 * env, -1.25 * env, 0.65 * env, -1.25 * env, 0.4 * env);
  o.pelvisDrop = 0.3 * env;
  return o;
}

// De houding van de fietser bij een truc, uit de staat van stepWheelie. `armBase` is de armhoek aan het stuur.
// Geeft in `o` terug: lean (erbij op de romphoek, positief = achterover), armZ (armen naar voren/omhoog)
// en armX (armen opzij, alleen links negatief en rechts positief toepassen).
//  - wheelie: achterover, armen gestrekt naar het opgetrokken stuur
//  - stoppie: voorover boven het stuur
//  - zonder handen: rechtop, beide armen de lucht in en een beetje open
export function fietsHouding(s, armBase, o = { lean: 0, armZ: 0, armX: 0 }) {
  const w = clamp01(s.pitch / WHEELIE.pitch), n = clamp01(-s.pitch / -STOPPIE.pitch), h = clamp01(s.hands || 0);
  o.lean = w * 0.3 - n * 0.22 + h * 0.1;
  const bars = armBase + (1.2 - armBase) * w + 0.1 * n;
  o.armZ = bars + (2.75 - bars) * h;
  o.armX = 0.5 * h;
  return o;
}
