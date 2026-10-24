// Touch controls, the pure part (touch.js has the DOM): detecting a touch
// device, the virtual stick, camera swipes and which on-screen buttons a
// situation gets. The buttons are the controller's slots (controls.js
// PAD_MAPS), so touch drives exactly the actions the gamepad and keyboard do.
import { PAD_MAPS, GAME_PAD_CTX, tokenKey } from './controls.js';
import { playerBusy } from './busy.js';
import { uiScaleFor } from './hudlook.js';

// A phone or tablet: a coarse primary pointer that can't hover, or touch
// points without a fine pointer. A laptop with a touchscreen keeps a mouse.
export function detectTouch({ maxTouchPoints = 0, coarse = false, fine = false, hover = false, forced = null } = {}) {
  if (forced === true || forced === false) return forced;
  if (coarse && !hover) return true;
  return maxTouchPoints > 0 && !fine;
}

const STICK_DEAD = 0.15;
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
  ' ': { foot: 'Spring', minigame: 'Spring', vehicle: 'Handrem', vehicleManual: 'Handrem', skutsje: 'Handrem', heli: 'Omhoog', pigeon: 'Vlieg', train: 'Noodrem', foodtruck: 'OK', klokken: 'Start', cutscene: 'Overslaan' },
  control: { heli: 'Omlaag', pigeon: 'Pikken', foot: 'Bukken', minigame: 'Bukken' },
  e: { _: 'Gebruik', pannenkoek: 'Appel', klokken: 'Volgend' }, f: 'Instappen', h: 'Toeter', l: 'Sirene', q: { _: 'Achterom', pannenkoek: 'Stroop', klokken: 'Vorig' }, n: 'Radio', m: 'Kaart', o: { _: 'Overslaan', bus: 'Deuren', train: 'Deuren' }, k: { _: 'Kusje', bus: 'Kneel', train: 'Waak' },
  shift: 'Rennen', tab: 'Doel', c: 'Koer', x: 'Mens', v: 'Film', r: { _: 'Lak', pannenkoek: 'Kaas' }, z: 'Zeil vieren', '[': 'Links', ']': 'Rechts', p: 'Alarm',
  backspace: 'Stop', g: 'Dienst', j: 'Koppeling', ',': 'Lager', '.': 'Hoger', s: 'Rem', w: { _: 'Gas', pannenkoek: 'Spek', train: 'Trek' },
  '@fire': 'Vuur', '@aim': 'Richt', '@gas': 'Gas', '@brake': 'Rem', '@wheel+': 'Wapen', '@wheel-': 'Wapen',
};

export function labelFor(ctx, action) {
  const l = LABELS[action];
  if (l && typeof l === 'object') return l[ctx] ?? l._ ?? '';
  return l || (/^[0-9]$/.test(action) ? action : '');
}

// The right thumb gets the actions, the left thumb (next to the stick) the
// sprint and brake extras.
const RIGHT = ['a', 'b', 'x', 'y', 'rt'];
const LEFT = ['lt', 'ls', 'lb'];
const TOUCH_SLOTS = [...RIGHT, ...LEFT, 'rb'];

// [{ slot, action, label, side }] for a situation; slots without a Dutch
// label (or no action) are left out so the screen stays quiet.
// Situations where the stick must send no keys (W/S/A/D are game keys there).
export const stickless = (ctx) => (PAD_MAPS[ctx] || {}).stick === 'none';

export function touchPlan(ctx) {
  // a cutscene: one button, held (Space) like the hold-to-skip of the keyboard
  if (ctx === 'cutscene') return [{ slot: 'a', action: ' ', label: 'Overslaan', side: 'right' }];
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

// Button spots from the bottom corner they sit in, in px before the layout
// scale: [offset from the side, from the bottom]. Right: a diamond for the four
// face buttons and one high up for the gas; left: a 2x2 block next to the stick.
export const SPOTS_RIGHT = [[24, 110], [104, 40], [104, 180], [184, 110], [30, 240]];
export const SPOTS_LEFT = [[24, 40], [24, 120], [124, 40], [124, 120]];
export const BTN_H = 64;
export const BTN_MIN_W = 64;
// pause and "Meer" share the top row at the right edge: [offset from the side, size]
export const PAUSE_BTN = { right: 10, top: 10, size: 60 };
export const MORE_BTN = { right: 74, top: 10, size: 60 };

// Where each button of a situation goes: [{ b, spot, side }]. A situation with
// more buttons on a side than that side has spots gets none for the surplus
// (touch_test.mjs checks that no plan runs out).
export function touchPlacement(ctx) {
  const out = [];
  let r = 0, l = 0;
  for (const b of touchPlan(ctx)) {
    const spot = b.side === 'right' ? SPOTS_RIGHT[r++] : SPOTS_LEFT[l++];
    if (spot) out.push({ b, spot, side: b.side });
  }
  return out;
}

// Where the HUD puts the minimap (hud_panel.css zone F: --hud-edge and --mm-size
// by screen size, bottom 46, all times the HUD scale) in screen px. The left
// buttons stay clear of it: beside it on a wide screen, above it on a portrait one.
export function hudMinimap({ width, height }) {
  const small = height <= 640 || width <= 760;
  const mm = small ? 190 : 250, edge = small ? 24 : 46;
  const ui = uiScaleFor(width, height, 1, true);
  return { x: edge * ui, y: height - (46 + mm) * ui, w: mm * ui, h: mm * ui };
}

// How far the left buttons move, in button units (before the layout scale):
// right: past the minimap; up: over it (portrait).
export function leftOffset({ width, height }) {
  const m = hudMinimap({ width, height });
  const s = touchLayout({ width, height }).scale;
  if (height > width) return { right: 0, up: Math.max(0, Math.ceil((height - m.y + 8) / s - SPOTS_LEFT[0][1])) };
  return { right: Math.max(0, Math.ceil((m.x + m.w + 8) / s - SPOTS_LEFT[0][0])), up: 0 };
}

// Screen rectangles (px) of everything in the touch layer for a situation on a
// screen of width x height: buttons (zoomed by the layout scale, like btnHost),
// pause and, when the situation has extras, "Meer".
export function touchRects(ctx, { width, height }) {
  const s = touchLayout({ width, height }).scale;
  const off = leftOffset({ width, height });
  const rects = touchPlacement(ctx).map(({ b, spot, side }) => {
    const w = Math.max(BTN_MIN_W, Math.round(b.label.length * 8.5 + 20));
    const x = side === 'right' ? width - (spot[0] + w) * s : (spot[0] + off.right) * s;
    return { name: b.label, x, y: height - (spot[1] + (side === 'left' ? off.up : 0) + BTN_H) * s, w: w * s, h: BTN_H * s };
  });
  const top = (o, name) => ({ name, x: width - (o.right + o.size) * s, y: o.top * s, w: o.size * s, h: o.size * s });
  rects.push(top(PAUSE_BTN, 'II'));
  if (touchMore(ctx).length) rects.push(top(MORE_BTN, 'Meer'));
  return rects;
}

// Whether on-screen touches count as game input at all: taps on menus and
// the phone must stay plain clicks.
export function touchUiActive({ started, menuOpen }) {
  return !!started && !menuOpen;
}

// The PAD_MAPS situation for the world right now (the same choice
// gamepad.js makes), so touch buttons follow what the player is doing.
export function touchContext(w, { started = true, menuOpen = false, shiftMode = 'auto', cine = false } = {}) {
  if (!started || menuOpen) return 'menu';
  if (cine) return 'cutscene';
  if (!w) return 'foot';
  if (w.pigeonMode) return 'pigeon';
  if (w.trainDriving) return 'train';
  if (w.challenge && w.challenge.id === 'fjord') return 'foodtruck';
  if (GAME_PAD_CTX[w.activityGame]) return GAME_PAD_CTX[w.activityGame];
  if (playerBusy(w, ['padel', 'activityGame']).busy) return 'minigame';
  const v = w.player && w.player.inVehicle;
  if (v) return v.isHeli ? 'heli' : w.noLookBack ? 'skutsje' : v.gb && shiftMode !== 'auto' ? 'vehicleManual' : 'vehicle';
  return 'foot';
}

// Setting touchControls: 'auto' follows the device, 'aan' and 'uit' force it.
export const TOUCH_CHOICES = ['auto', 'aan', 'uit'];
export function touchMode(setting, detected) {
  return setting === 'aan' ? true : setting === 'uit' ? false : !!detected;
}

// Screen class and orientation: buttons scale with the short side so a thumb
// reaches them on a phone and they don't float far apart on a tablet. The
// game is played landscape; portrait gets a hint to turn the device.
export function touchLayout({ width = 800, height = 400 } = {}) {
  const short = Math.min(width, height), long = Math.max(width, height);
  const cls = short >= 600 && long >= 900 ? 'tablet' : 'phone';
  const base = cls === 'tablet' ? 1.15 : short < 360 ? 0.8 : 0.9;
  const portrait = height > width;
  return {
    cls, portrait, orientation: portrait ? 'portrait' : 'landscape',
    // the left block (176 px) and the right diamond (about 250 px) must fit side by side, also on a narrow portrait screen
    scale: Math.round(Math.max(0.7, Math.min(1.3, base * (short / (cls === 'tablet' ? 768 : 400) > 1.3 ? 1.1 : 1), width / 480)) * 100) / 100,
    hint: portrait ? 'Draai je toestel voor de beste besturing' : '',
    // the stick zone gets less of the screen on a narrow phone so the look zone stays big enough
    leftShare: cls === 'tablet' ? 0.4 : 0.45,
  };
}

// The extra actions (D-pad and view slots: radio, map, weapons, ...) that
// have no button of their own; they sit behind one "Meer" button.
const MORE_SLOTS = ['up', 'down', 'left', 'right', 'view'];
export function touchMore(ctx) {
  if (ctx === 'cutscene') return [];
  const map = PAD_MAPS[ctx] || PAD_MAPS.foot;
  const direct = new Set(touchPlan(ctx).map((b) => b.action));
  const out = [];
  const seen = new Set();
  for (const slot of MORE_SLOTS) {
    const action = map[slot];
    if (action == null || action === 'escape' || action === 'steer' || direct.has(action)) continue;
    const label = labelFor(ctx, action);
    const id = action.startsWith('@wheel') ? '@wheel' : action;
    if (!label || seen.has(id)) continue;
    seen.add(id);
    out.push({ slot, action, label });
  }
  return out;
}

// What a key hint (the token a keycap shows, 'E', 'Spatie') says on touch:
// the label of the on-screen button for it, or '' when there is none.
export function touchLabelForToken(token, ctx) {
  const key = tokenKey(token);
  for (const b of [...touchPlan(ctx), ...touchMore(ctx)]) if (b.action === key) return b.label;
  return '';
}

// Two fingers on the map: the zoom factor since the last step and the
// midpoint the zoom turns around. A zero distance changes nothing.
export function pinchStep(prev, cur) {
  const d0 = Math.hypot(prev[0].x - prev[1].x, prev[0].y - prev[1].y);
  const d1 = Math.hypot(cur[0].x - cur[1].x, cur[0].y - cur[1].y);
  return {
    factor: d0 > 1 && d1 > 1 ? d1 / d0 : 1,
    mid: { x: (cur[0].x + cur[1].x) / 2, y: (cur[0].y + cur[1].y) / 2 },
  };
}

// The left thumb's extra buttons sit in the bottom left corner, where the HUD's minimap is: they
// start to the right of it. minimapRight: its right edge in screen px (0 when it is not shown),
// scale: the buttons' zoom (touchLayout), base: where the cluster starts without a minimap.
export function leftButtonX({ minimapRight = 0, scale = 1, base = 24, gap = 10 } = {}) {
  return minimapRight > 0 ? Math.max(base, Math.ceil((minimapRight + gap) / (scale || 1))) : base;
}
