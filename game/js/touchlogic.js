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
  e: { _: 'Gebruik', pannenkoek: 'Appel', klokken: 'Volgend' }, f: 'Instappen', h: 'Toeter', l: 'Sirene', q: { _: 'Achterom', pannenkoek: 'Stroop', klokken: 'Vorig' }, n: 'Radio', m: 'Kaart', o: { _: 'Overslaan', bus: 'Deuren', train: 'Deuren' }, k: { _: 'Kusje', bus: 'Knielt', train: 'Waak' },
  // #495: de twee acties die het pad erbij kreeg, zodat de knop op aanraakbediening ook een naam heeft
  i: { _: 'Hengelen', skutsje: 'Hengelen', vehicle: 'Hengelen' }, t: { _: 'Hef', train: 'Rondlopen' }, b: 'Bij de groep',
  shift: 'Rennen', tab: 'Doel', c: 'Koer', x: 'Mens', v: 'Film', r: { _: 'Lak', pannenkoek: 'Kaas' }, z: 'Zeil vieren', '[': 'Links', ']': 'Rechts', p: 'Alarm',
  backspace: 'Stop', g: 'Dienst', j: 'Koppeling', ',': 'Lager', '.': 'Hoger', s: 'Rem', w: { _: 'Gas', pannenkoek: 'Spek', train: 'Trek' },
  '@fire': 'Vuur', '@aim': 'Richt', '@gas': 'Gas', '@brake': 'Rem', '@wheel+': 'Wapen', '@wheel-': 'Wapen',
};

export function labelFor(ctx, action) {
  const l = LABELS[action];
  if (l && typeof l === 'object') return l[ctx] ?? l._ ?? '';
  return l || (/^[0-9]$/.test(action) ? action : '');
}

// The face of a touch button (#427): line icons in the HUD's own style (24x24,
// currentColor stroke, round caps), keyed by the Dutch label the button shows.
// The label stays on the button as text and as aria-label; only the numbers of
// the pancake pans have no icon, because the number is the clearest sign there.
const ICONS = {
  Spring: '<path d="M4 19c2.5-1 4-6.5 8-6.5s5.5 5.5 8 6.5"/><path d="M12 9V3"/><path d="M9 6l3-3 3 3"/>',
  Omhoog: '<path d="M12 20V4"/><path d="M6.5 9.5L12 4l5.5 5.5"/>',
  Omlaag: '<path d="M12 4v16"/><path d="M6.5 14.5L12 20l5.5-5.5"/>',
  Vlieg: '<path d="M12 21V8"/><path d="M8 12l4-4 4 4"/><path d="M4 18l4-2M20 18l-4-2"/>',
  Handrem: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/><path d="M12 4v3M12 17v3"/>',
  Rem: '<circle cx="10" cy="12" r="6"/><path d="M16 5v14"/><path d="M16 8h4M16 16h4"/>',
  Noodrem: '<path d="M8.5 3.5h7l5 5v7l-5 5h-7l-5-5v-7z"/><path d="M12 7.5v5.5M12 16.5v.5"/>',
  Stop: '<rect x="5" y="5" width="14" height="14" rx="3"/>',
  Start: '<path d="M8 4.5l11 7.5-11 7.5z"/>',
  Overslaan: '<path d="M5 5l9 7-9 7z"/><path d="M19 5v14"/>',
  Volgend: '<path d="M5 5l9 7-9 7z"/><path d="M19 5v14"/>',
  Vorig: '<path d="M19 5l-9 7 9 7z"/><path d="M5 5v14"/>',
  Vuur: '<circle cx="12" cy="12" r="7"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/><circle cx="12" cy="12" r="1.2"/>',
  Richt: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.8"/>',
  Wapen: '<path d="M3.5 8.5h14.5V12h-4.5l-2 5h-3.5l1.5-5H3.5z"/><path d="M18 9h2.5v2.5H18"/>',
  Bukken: '<path d="M4 5.5h16"/><path d="M12 9v7"/><path d="M8 12.5l4 4 4-4"/>',
  Gebruik: '<path d="M9 12V6a1.5 1.5 0 0 1 3 0v5"/><path d="M12 11V5a1.5 1.5 0 0 1 3 0v6"/><path d="M15 11V7a1.5 1.5 0 0 1 3 0v6c0 4-2.5 7-6 7h-1c-2 0-3.3-1-4.2-2.8L5 12.6a1.6 1.6 0 0 1 2.9-1.3L9 14"/>',
  Instappen: '<path d="M14 4h5v16h-5"/><path d="M4 12h9"/><path d="M9.5 8l4 4-4 4"/>',
  Rennen: '<circle cx="15" cy="4.5" r="2"/><path d="M13.5 7.5 10 12l3 4-2 5"/><path d="M10 12l4 3 2 5"/><path d="M13 8.5l-4 1-2 3"/><path d="M12.5 9l4 1 3-2.5"/>',
  Kusje: '<path d="M12 20s-7-4.5-7-9a3.5 3.5 0 0 1 7-1 3.5 3.5 0 0 1 7 1c0 4.5-7 9-7 9z"/>',
  Kaart: '<path d="M3 6.5l6-2 6 2 6-2v13l-6 2-6-2-6 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  Radio: '<circle cx="12" cy="12" r="2.5"/><path d="M7.5 7.5a6.5 6.5 0 0 0 0 9M16.5 7.5a6.5 6.5 0 0 1 0 9"/><path d="M4.5 4.5a10.5 10.5 0 0 0 0 15M19.5 4.5a10.5 10.5 0 0 1 0 15"/>',
  Lak: '<path d="M12 3.5c3.5 4.2 6 7.5 6 10.5a6 6 0 0 1-12 0c0-3 2.5-6.3 6-10.5z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  Appel: '<path d="M12 7.5c-1.2-1.8-3.2-2.2-4.3-1.2-2.2 2-1.2 6.8 1 9.9 1 1.4 2 2 3.3 2s2.3-.6 3.3-2c2.2-3.1 3.2-7.9 1-9.9-1.1-1-3.1-.6-4.3 1.2z"/><path d="M12 7.5V4"/><path d="M12 4c1-1.4 2.4-1.8 3.4-1.4"/>',
  Stroop: '<path d="M9.5 3h5v3l2 3.5V19a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V9.5L9.5 6z"/><path d="M8.5 13.5h7"/>',
  Kaas: '<path d="M3 16.5l9-8.5h9v8.5z"/><circle cx="15" cy="12.5" r="1"/><circle cx="18.5" cy="14.5" r=".9"/>',
  Spek: '<path d="M3 9c3.5-3 6.5 3 10 0s4.5-3 8 0"/><path d="M3 15c3.5-3 6.5 3 10 0s4.5-3 8 0"/>',
  Koer: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 8l9 6 9-6"/>',
  Pikken: '<path d="M8 4h8l-4 8z"/><path d="M12 12v4"/><path d="M4 20h16"/>',
  Achterom: '<path d="M8 20V10a4 4 0 0 1 8 0v3"/><path d="M12.5 13.5L16 17l3.5-3.5"/>',
  Mens: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M12 15l-3 6M12 15l3 6M7 10l5-1 5 1"/>',
  Dienst: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
  'Zeil vieren': '<path d="M4 17h16l-2 4H6z"/><path d="M12 3v14"/><path d="M12 4l6 10h-6z"/>',
  Waak: '<path d="M13 8h7l-2 4h-5z"/><circle cx="8" cy="12" r="5"/><path d="M8 7V5"/>',
  Deuren: '<rect x="5.5" y="3" width="13" height="18" rx="1"/><path d="M12 3v18"/><path d="M15 12v.5M9 12v.5"/>',
  Trek: '<path d="M5 20h14"/><path d="M8 20l7-13"/><circle cx="16" cy="5.5" r="2"/>',
  Toeter: '<path d="M4 10v4h3.5L12 18V6L7.5 10z"/><path d="M15.5 9.5a4 4 0 0 1 0 5M18.5 6.5a8 8 0 0 1 0 11"/>',
  Gas: '<path d="M3.5 17a8.5 8.5 0 0 1 17 0"/><path d="M12 17l4.5-6"/><circle cx="12" cy="17" r="1.4"/>',
  Hoger: '<path d="M6 13.5l6-6 6 6"/><path d="M6 19l6-6 6 6"/>',
  Lager: '<path d="M6 5l6 6 6-6"/><path d="M6 10.5l6 6 6-6"/>',
  Alarm: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
  Film: '<rect x="3" y="6" width="12" height="12" rx="2"/><path d="M15 10l6-3v10l-6-3z"/>',
  Links: '<path d="M20 12H4"/><path d="M9 7l-5 5 5 5"/>',
  Rechts: '<path d="M4 12h16"/><path d="M15 7l5 5-5 5"/>',
  Knielt: '<path d="M12 3.5v8"/><path d="M8.5 8L12 11.5 15.5 8"/><path d="M3 17.5h18"/><path d="M6 20.5h12"/>',
  OK: '<path d="M4.5 12.5l5 5L19.5 6.5"/>',
  Koppeling: '<path d="M9.5 14.5l5-5"/><path d="M7 12l-1.5 1.5a3.5 3.5 0 0 0 5 5L12 17"/><path d="M17 12l1.5-1.5a3.5 3.5 0 0 0-5-5L12 7"/>',
  Sirene: '<rect x="4" y="12" width="16" height="5" rx="2"/><path d="M7 12c0-3 1-5 5-5s5 2 5 5"/><path d="M2 15l2-3M22 15l-2-3"/>',
  Doel: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  Pauze: '<path d="M9 5v14M15 5v14"/>',
  Meer: '<path d="M6 6h.01M12 6h.01M18 6h.01M6 12h.01M12 12h.01M18 12h.01M6 18h.01M12 18h.01M18 18h.01"/>',
};

// The inner SVG of the icon for a button label ('' when the button keeps text).
export function iconFor(label) {
  return ICONS[label] || '';
}

export const TOUCH_ICONS = ICONS;

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
  // de wandeling neemt de speler niet over, maar de stopknop hoort er wel te zijn (net als op het pad)
  if (w.wandelingActief) return 'minigame';
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
