// Touch controls, the pure part (touch.js has the DOM): detecting a touch
// device, the virtual stick, camera swipes and which on-screen buttons a
// situation gets. The buttons are the controller's slots (controls.js
// PAD_MAPS), so touch drives exactly the actions the gamepad and keyboard do.
import { PAD_MAPS } from './controls.js';
import { playerBusy } from './busy.js';

// A phone or tablet: a coarse primary pointer that can't hover, or touch
// points without a fine pointer. A laptop with a touchscreen keeps a mouse.
export function detectTouch({ maxTouchPoints = 0, coarse = false, fine = false, hover = false, forced = null } = {}) {
  if (forced === true || forced === false) return forced;
  if (coarse && !hover) return true;
  return maxTouchPoints > 0 && !fine;
}

export const STICK_DEAD = 0.15;
export const STICK_RADIUS = 56;

// Where the thumb is compared with where the stick was planted: a vector
// with length 0-1, dead zone removed, pushed past the radius = full tilt.
export function stickVector(origin, pos, radius = STICK_RADIUS, dead = STICK_DEAD) {
  const dx = pos.x - origin.x, dy = pos.y - origin.y;
  const m = Math.hypot(dx, dy);
  if (!(m > 0) || !(radius > 0)) return [0, 0];
  const raw = Math.min(1, m / radius);
  if (raw < dead) return [0, 0];
  const k = ((raw - dead) / (1 - dead)) / m;
  return [dx * k, dy * k];
}

// The stick drawn where the thumb is: the knob stays inside the ring.
export function knobOffset(origin, pos, radius = STICK_RADIUS) {
  const dx = pos.x - origin.x, dy = pos.y - origin.y;
  const m = Math.hypot(dx, dy);
  if (m <= radius || m === 0) return { x: dx, y: dy };
  return { x: (dx / m) * radius, y: (dy / m) * radius };
}

// A camera swipe in px becomes the mouse motion the camera already takes.
export function lookDelta(prev, cur, sensitivity = 1) {
  return [(cur.x - prev.x) * 1.6 * sensitivity, (cur.y - prev.y) * 1.6 * sensitivity];
}

// Which stick keys to hold for a stick tilt, with hysteresis like gamepad.js.
const ON = 0.5, OFF = 0.35;
export function stickKeys(vec, held = new Set()) {
  const [x, y] = vec;
  const past = (v, k) => (held.has(k) ? v > OFF : v > ON);
  const out = new Set();
  if (past(-y, 'w')) out.add('w');
  if (past(y, 's')) out.add('s');
  if (past(-x, 'a')) out.add('a');
  if (past(x, 'd')) out.add('d');
  return out;
}

const LABELS = {
  ' ': { foot: 'Spring', minigame: 'Spring', vehicle: 'Handrem', vehicleManual: 'Handrem', skutsje: 'Handrem', heli: 'Omhoog', pigeon: 'Vlieg', train: 'Fluit', foodtruck: 'OK', klokken: 'Start' },
  control: { heli: 'Omlaag', pigeon: 'Pikken', foot: 'Bukken', minigame: 'Bukken' },
  e: 'Gebruik', f: 'Instappen', h: 'Toeter', l: 'Sirene', q: 'Achterom', n: 'Radio', m: 'Kaart', o: 'Overslaan', k: 'Kusje',
  shift: 'Rennen', tab: 'Doel', c: 'Koer', x: 'Mens', v: 'Film', r: 'Lak', z: 'Zeil vieren', '[': 'Links', ']': 'Rechts', p: 'Alarm',
  backspace: 'Stop', g: 'Dienst', j: 'Koppeling', ',': 'Lager', '.': 'Hoger', s: 'Rem', w: 'Gas',
  '@fire': 'Vuur', '@aim': 'Richt', '@gas': 'Gas', '@brake': 'Rem', '@wheel+': 'Wapen', '@wheel-': 'Wapen',
};

export function labelFor(ctx, action) {
  const l = LABELS[action];
  if (l && typeof l === 'object') return l[ctx] || '';
  return l || (/^[0-9]$/.test(action) ? action : '');
}

// The right thumb gets the actions, the left thumb (next to the stick) the
// sprint and brake extras.
const RIGHT = ['a', 'b', 'x', 'y', 'rt'];
const LEFT = ['lt', 'ls', 'lb'];
export const TOUCH_SLOTS = [...RIGHT, ...LEFT, 'rb'];

// [{ slot, action, label, side }] for a situation; slots without a Dutch
// label (or no action) are left out so the screen stays quiet.
export function touchPlan(ctx) {
  const map = PAD_MAPS[ctx] || PAD_MAPS.foot;
  const out = [];
  const seen = new Set();
  for (const slot of TOUCH_SLOTS) {
    const action = map[slot];
    if (action == null) continue;
    const label = labelFor(ctx, action);
    if (!label) continue;
    // '@wheel+' and '@wheel-' would be the same button twice
    const id = action.startsWith('@wheel') ? '@wheel' : action;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ slot, action, label, side: RIGHT.includes(slot) ? 'right' : 'left' });
  }
  return out;
}

// Whether on-screen touches count as game input at all: taps on menus and
// the phone must stay plain clicks.
export function touchUiActive({ started, menuOpen }) {
  return !!started && !menuOpen;
}

// The PAD_MAPS situation for the world right now (the same choice
// gamepad.js makes), so touch buttons follow what the player is doing.
export function touchContext(w, { started = true, menuOpen = false, shiftMode = 'auto' } = {}) {
  if (!started || menuOpen) return 'menu';
  if (!w) return 'foot';
  if (w.pigeonMode) return 'pigeon';
  if (w.trainDriving) return 'train';
  if (w.challenge && w.challenge.id === 'fjord') return 'foodtruck';
  if (w.activityGame === 'carillon') return 'klokken';
  if (playerBusy(w, ['padel', 'activityGame']).busy) return 'minigame';
  const v = w.player && w.player.inVehicle;
  if (v) return v.isHeli ? 'heli' : w.noLookBack ? 'skutsje' : v.gb && shiftMode !== 'auto' ? 'vehicleManual' : 'vehicle';
  return 'foot';
}
