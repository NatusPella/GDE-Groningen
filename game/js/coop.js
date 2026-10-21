// Mini-coöp (#95): lokaal, één scherm, één machine. Speler 2 bestuurt de
// metgezel (Tessa naast Tammo, of andersom) in dezelfde wereld; de
// volg-AI van companion.js staat dan uit. Alleen aan met ?coop (devflags.js).
// Dit bestand is pure logica (geen DOM, geen netwerk); de koppeling met de
// invoer staat in coopglue.js, de aanroep in companion.js.

import { radialDeadzone } from './padlogic.js';

// Speler 2 op het toetsenbord: IJKL lopen, U rennen. Speler 1 houdt WASD/pijlen.
const P2_KEYS = { up: 'i', down: 'k', left: 'j', right: 'l', run: 'u' };
export const P2_WALK = 3.0;
export const P2_RUN = 5.6;
const PAD_DEADZONE = 0.25;
// Beide spelers delen één scherm: P2 mag zo ver van P1 en wordt anders teruggeleid.
export const LEASH_DIST = 38;
export const CAM_ZOOM_MAX = 1.6;

// Welk apparaat bij welke speler hoort. Een pad dat al P1 bedient (padIndex)
// wordt nooit aan P2 gegeven; P2 krijgt de eerste andere verbonden pad,
// anders het toetsenbord.
export function assignDevices(connectedPadIndexes, p1PadIndex) {
  const free = (connectedPadIndexes || []).filter((i) => i !== p1PadIndex).sort((a, b) => a - b);
  return {
    p1: { kind: p1PadIndex != null ? 'pad+keys' : 'keys', pad: p1PadIndex ?? null },
    p2: free.length ? { kind: 'pad', pad: free[0] } : { kind: 'keys', pad: null },
  };
}

function norm(x, y) {
  const m = Math.hypot(x, y);
  return m > 1 ? [x / m, y / m] : [x, y];
}

// Beweging van speler 2 uit toetsen: { isDown(k) }. Geeft [x, y] in -1..1
// (x naar rechts, y naar beneden, zoals Input.axis()).
export function keyAxis(isDown) {
  let x = 0, y = 0;
  if (isDown(P2_KEYS.left)) x -= 1;
  if (isDown(P2_KEYS.right)) x += 1;
  if (isDown(P2_KEYS.up)) y -= 1;
  if (isDown(P2_KEYS.down)) y += 1;
  return norm(x, y);
}

// Beweging uit een gamepad (axes[0], axes[1]) met dode zone.
export function padAxis(axes) {
  if (!axes) return [0, 0];
  return radialDeadzone(axes[0] || 0, axes[1] || 0, PAD_DEADZONE);
}

// Kiest de invoer van speler 2: pad wint van toetsen als het pad beweegt.
export function readP2(input) {
  const pad = padAxis(input && input.padAxes);
  const k = keyAxis((key) => !!(input && input.isDown && input.isDown(key)));
  const useKeys = !(pad[0] || pad[1]);
  const [x, y] = useKeys ? k : pad;
  const run = !!(input && ((input.isDown && input.isDown(P2_KEYS.run)) || input.padRun));
  return { x, y, run, active: !!(x || y) };
}

// Gewenste snelheid (x, y per seconde) uit invoer; analoog gewicht blijft behouden.
export function velocityFor(inp) {
  const sp = inp.run ? P2_RUN : P2_WALK;
  return [inp.x * sp, inp.y * sp];
}

// Zachte band: ligt P2 verder dan LEASH_DIST van P1, dan terug op die rand.
// Geeft { x, y, clamped }.
export function leash(p1, p2, max = LEASH_DIST) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const d = Math.hypot(dx, dy);
  if (d <= max || d === 0) return { x: p2.x, y: p2.y, clamped: false };
  return { x: p1.x + dx / d * max, y: p1.y + dy / d * max, clamped: true };
}

// Cameradoel voor één gedeeld scherm: midden tussen beiden en een zoomfactor
// (1 = zoals nu) die oploopt met de afstand, begrensd.
export function cameraFocus(p1, p2) {
  const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const zoom = Math.min(CAM_ZOOM_MAX, 1 + Math.max(0, d - 8) / 40);
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, zoom };
}

// Dun koppelpunt voor companion.js: schuift het lichaam van speler 2.
// state: { x, y, angle, vx, vy, crouching }. Geeft true als P2 stuurt.
export function stepSlot2(state, inp, dt, p1) {
  const [vx, vy] = velocityFor(inp);
  const acc = Math.min(1, 14 * dt);
  state.vx += (vx - state.vx) * acc;
  state.vy += (vy - state.vy) * acc;
  if (inp.active) state.angle = Math.atan2(vy, vx);
  return { moving: Math.hypot(state.vx, state.vy) > 0.15, leashed: p1 ? leash(p1, state) : null };
}

// Online (#95): invoer van de gast zoals de host die ontvangt ({ mx, my, buttons })
// wordt dezelfde vorm als readP2: x naar rechts, y naar beneden, bit 0 = rennen.
export function remoteP2(r) {
  if (!r) return { x: 0, y: 0, run: false, active: false };
  const [x, y] = norm(Number.isFinite(r.mx) ? r.mx : 0, Number.isFinite(r.my) ? r.my : 0);
  return { x, y, run: !!((r.buttons || 0) & 1), active: !!(x || y) };
}

// Schermrichting (x rechts, y omlaag) naar wereldrichting, gezien met een camera die yaw gedraaid is.
// Zelfde berekening als coopglue.js coopStep; ook voor de figuren van extra spelers (coopnet.js).
export function cameraRelative(inp, yaw = 0) {
  const cs = Math.cos(yaw), sn = Math.sin(yaw);
  return { ...inp, x: cs * -inp.y - sn * inp.x, y: sn * -inp.y + cs * inp.x };
}

// Gedeelde camera (#95): staan de eerste twee spelers te voet en dicht bij elkaar, dan kijkt de
// camera naar het midden tussen hen (en zoomt een stukje uit); anders volgt iedereen zijn eigen
// figuur. Extra spelers (plek 2 en hoger) gebruiken dit niet. a en b: { x, y, inVehicle? }.
export const SHARE_MAX_DIST = 60;
export function sharedCamera(a, b, maxDist = SHARE_MAX_DIST) {
  if (!a || !b || a.inVehicle || b.inVehicle) return null;
  if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) return null;
  if (Math.hypot(a.x - b.x, a.y - b.y) > maxDist) return null;
  return cameraFocus(a, b);
}
