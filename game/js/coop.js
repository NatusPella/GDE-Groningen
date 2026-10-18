// Mini-coöp (#95): lokaal, één scherm, één machine. Speler 2 bestuurt de
// metgezel (Tessa naast Tammo, of andersom) in dezelfde wereld; de
// volg-AI van companion.js staat dan uit. Alleen aan met ?coop (devflags.js).
// Dit bestand is pure logica (geen DOM, geen netwerk); de koppeling met de
// invoer staat in coopglue.js, de aanroep in companion.js.

export const SLOT_P1 = 0;
export const SLOT_P2 = 1;

// Speler 2 op het toetsenbord: IJKL lopen, U rennen. Speler 1 houdt WASD/pijlen.
export const P2_KEYS = { up: 'i', down: 'k', left: 'j', right: 'l', run: 'u' };
export const P2_WALK = 3.0;
export const P2_RUN = 5.6;
export const PAD_DEADZONE = 0.25;
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
  const x = axes[0] || 0, y = axes[1] || 0;
  const m = Math.hypot(x, y);
  if (m < PAD_DEADZONE) return [0, 0];
  const s = (Math.min(1, m) - PAD_DEADZONE) / (1 - PAD_DEADZONE) / m;
  return [x * s, y * s];
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
