// Hoogvlieger, het reuzenrad op de kermis: de regels (puur bestand, geen browser).
//   node scripts/reuzenrad_test.mjs
// De geometrie staat hier en niet in kermis.js, zodat het rad dat getekend wordt
// en de gondel waar je in zit nooit uit elkaar lopen. Hoeken zijn die van het rad
// (kermis.js: gondel i staat op i/N * 2pi, het rad draait met `rot` erbij);
// onderaan is -pi/2. Coordinaten zijn kermis-lokaal: u langs de kermis, v dwars
// erop, h de hoogte in meters.

export const WHEEL_AT = { u: -26, v: -50 };
export const R = 8.5;
export const AX = 10;
export const N = 12;
export const OMEGA = 0.12; // rad/s: een ronde duurt zo'n 52 s
export const LAPS = 2;
export const PRICE = 2;
// hoe ver (rad) een gondel van het laagste punt mag zijn om nog in te stappen
export const BOARD_WINDOW = 0.26;
// de gondel hangt zo ver onder het draaipunt; daar zit je
export const SEAT_DROP = 1.05;
// de camera hangt zo ver buiten het vlak van het rad (kermis.js: de twee randen staan op v = +-1,2), anders vullen spaken, randen en lampjes het beeld
export const CAM_OUT = 2.2;
// waar je instapt en uitstapt, aan de marktkant van het rad
export const LOAD_AT = { u: WHEEL_AT.u, v: WHEEL_AT.v + 4 };
export const LOAD_RADIUS = 3.2;
export const PITCH_MIN = -0.9;
export const PITCH_MAX = 0.65;

const TAU = Math.PI * 2;
const BOTTOM = -Math.PI / 2;

// naar (-pi, pi]
export function wrapAngle(a) {
  let x = a % TAU;
  if (x > Math.PI) x -= TAU;
  if (x <= -Math.PI) x += TAU;
  return x;
}

export const gondolaAngle = (i, rot) => (i / N) * TAU + rot;

// Waar het draaipunt van gondel i is, op rad-stand `rot`.
export function gondolaPivot(i, rot) {
  const a = gondolaAngle(i, rot);
  return { u: WHEEL_AT.u + R * Math.cos(a), v: WHEEL_AT.v, h: AX + R * Math.sin(a) };
}

// Waar de speler zit: de gondel hangt altijd recht onder zijn draaipunt.
export function seatPose(i, rot) {
  const p = gondolaPivot(i, rot);
  return { u: p.u, v: p.v, h: p.h - SEAT_DROP };
}

// Hoeveel rad gondel i nog voor of voorbij het laagste punt zit (0 = precies onderaan).
export const bottomGap = (i, rot) => wrapAngle(gondolaAngle(i, rot) - BOTTOM);

// De gondel die het dichtst bij de instap hangt, en of je erin kan: { index, gap, ok }.
export function nearestToBoarding(rot) {
  let best = 0, bg = Infinity;
  for (let i = 0; i < N; i++) {
    const g = bottomGap(i, rot);
    if (Math.abs(g) < Math.abs(bg)) { best = i; bg = g; }
  }
  return { index: best, gap: bg, ok: Math.abs(bg) <= BOARD_WINDOW };
}

// Seconden tot er een gondel instapbaar hangt (0 als er nu een is).
export function secondsToNextGondola(rot) {
  if (nearestToBoarding(rot).ok) return 0;
  let wait = Infinity;
  for (let i = 0; i < N; i++) {
    const d = (((-bottomGap(i, rot)) % TAU) + TAU) % TAU; // het rad draait de goede kant op
    wait = Math.min(wait, Math.max(0, d - BOARD_WINDOW) / OMEGA);
  }
  return wait;
}

// De rit: LAPS rondes, en je stopt waar je begon. endRot is de rad-stand
// waarop jouw gondel weer op het laagste punt hangt.
export function ridePlan(rot, index) {
  const gap = bottomGap(index, rot);
  return { index, startRot: rot, endRot: rot + LAPS * TAU - gap };
}

export const rideDone = (plan, rot) => rot >= plan.endRot - 1e-9;
export const rideFraction = (plan, rot) => Math.max(0, Math.min(1, (rot - plan.startRot) / (plan.endRot - plan.startRot)));
export const rideSecondsLeft = (plan, rot) => Math.max(0, (plan.endRot - rot) / OMEGA);

// Kan je al uitstappen? Alleen als je gondel bijna onderaan hangt.
export const mayExit = (plan, rot) => Math.abs(bottomGap(plan.index, rot)) <= BOARD_WINDOW;

// Is dit punt (kermis-lokaal) dichtbij genoeg de instap?
export const nearLoading = (u, v) => Math.hypot(u - LOAD_AT.u, v - LOAD_AT.v) < LOAD_RADIUS;

// Vrij rondkijken: yaw loopt rond, de kijkhoek omhoog/omlaag is begrensd.
export function lookStep(look, dyaw, dpitch) {
  return { yaw: wrapAngle(look.yaw + dyaw), pitch: Math.max(PITCH_MIN, Math.min(PITCH_MAX, look.pitch + dpitch)) };
}

// Kijkrichting als kermis-lokale eenheidsvector.
export function lookDir(look) {
  const c = Math.cos(look.pitch);
  return { u: Math.cos(look.yaw) * c, v: Math.sin(look.yaw) * c, h: Math.sin(look.pitch) };
}
