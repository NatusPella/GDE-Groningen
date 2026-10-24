// Controller support through the Gamepad API (Xbox, PlayStation, Steam Deck;
// anything in the browser's "standard" mapping). Polled once per animation
// frame. Buttons become the keys the game already knows (controls.js
// PAD_MAPS, per situation) and are sent as key events to the focused
// element, so every menu, minigame and cutscene that listens for keys works
// unchanged; the sticks and triggers feed input.js directly (analog walking,
// steering, the camera, the mouse buttons). The last input used decides
// which glyphs the hints show: `pad-active` on <html> plus `data-pad` with
// the controller family; any real key or mouse use switches back.
import { PAD_BUTTONS, PAD_MAPS, PAD_COOP, GAME_PAD_CTX, buttonSlots, nintendoSwap, padFamily } from './controls.js';
import { getSettings, onSettingsChange } from './settings.js';
import { sendKey } from './input.js';
import { playerBusy } from './busy.js';
import { radialDeadzone, pickPad, spatialNext, DEAD } from './padlogic.js';
import { noteDevice, onDeviceChange } from './inputdevice.js';

const TRIGGER_ON = 0.35;
const TRIGGER_OFF = 0.2;
const STICK_KEY_ON = 0.5;
const STICK_KEY_OFF = 0.35;
const REPEAT_DELAY = 380;
const REPEAT_EVERY = 110;
// the right stick at full tilt turns the camera like this many mouse px a second
const LOOK_PX_PER_S = 1100;
const WHEEL_TICK = 100;

let input = null;
let world = null;
let hooks = {};
let active = false;
let family = 'xbox';
let ctx = 'menu';
let lastT = 0;
let padIndex = -1;
// slot -> pressed last frame
const prevSlots = {};
// what each held slot sent, so its release undoes exactly that
const heldAction = {};
// stick-made keys held right now
const stickKeys = new Set();
const repeatAt = {};
let capture = null;
let captureBlock = new Set();
let slotMap = buttonSlots({});
const listeners = new Set();
let sprintLatch = false;
let lastHealth = null;
let lastSpeed = null;
let rumbleUntil = 0;

export function onPadChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// the hint source setting can pin the glyphs to keys or to the controller
function hintsOnPad() {
  const src = getSettings().hintSource;
  return src === 'pad' ? true : src === 'keys' ? false : active;
}

// Index of the pad that drives player 1 (-1: none); coop gives player 2 another.
export function activePadIndex() { return padIndex; }

export function padState() {
  return { active: hintsOnPad(), family, ctx };
}

export function isPadActive() {
  return hintsOnPad();
}

function emit() {
  for (const cb of listeners) cb(padState());
}

function layoutFor(id) {
  const pref = getSettings().padLayout;
  return pref && pref !== 'auto' ? pref : padFamily(id);
}

function setActive(on, id) {
  const fam = on ? layoutFor(id) : family;
  if (on === active && fam === family) return;
  active = on;
  if (on) noteDevice('pad');
  family = fam;
  slotMap = buttonSlots(padBinds, family);
  if (input) input.padLook = on;
  const html = document.documentElement;
  html.classList.toggle('pad-active', on);
  html.dataset.pad = family;
  if (!on) releaseAll();
  emit();
}

// Next button press goes to cb(slot as pressed physically) instead of the
// game (the remap screen). Returns a cancel function.
export function capturePadButton(cb) {
  capture = cb;
  // the button that chose the row is still down: it doesn't count
  const pad = currentPad();
  captureBlock = new Set();
  if (pad) pad.buttons.forEach((b, i) => { if (b && (b.pressed || b.value > TRIGGER_OFF)) captureBlock.add(i); });
  return () => { if (capture === cb) capture = null; };
}

// Short vibration if the controller has a motor and the player wants it.
function rumble(strong = 0.5, weak = 0.5, ms = 150) {
  if (!active || !getSettings().rumble) return;
  const now = performance.now();
  if (now < rumbleUntil - ms * 0.5) return;
  const pad = currentPad();
  const act = pad && pad.vibrationActuator;
  if (!act || !act.playEffect) return;
  rumbleUntil = now + ms;
  try {
    const p = act.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, weak) });
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* not supported */ }
}

function currentPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  if (padIndex >= 0 && pads[padIndex] && pads[padIndex].connected) return pads[padIndex];
  for (const p of pads) if (p && p.connected) return p;
  return null;
}

function started() {
  return document.body.classList.contains('game-started');
}

// Which PAD_MAPS table applies right now.
function context() {
  if (!started() || (hooks.menuOpen && hooks.menuOpen())) return 'menu';
  const w = world;
  if (!w) return 'foot';
  if (w.pigeonMode) return 'pigeon';
  if (w.trainDriving) return 'train';
  if (w.challenge && w.challenge.id === 'fjord') return 'foodtruck';
  // de vliegschool (#397) blijft de hele les een activiteit, ook als je in het lesvliegtuig zit: in de lucht
  // de gewone vliegindeling, in het lesmenu de pijlen met A en B (anders stopte B de les en kon je niet bladeren)
  if (w.activityGame === 'vliegschool') {
    const sv = w.player && w.player.inVehicle;
    if (sv && sv.isPlane) return 'plane';
    if (sv && sv.isHeli) return 'heli';
    return 'vliegschool';
  }
  if (GAME_PAD_CTX[w.activityGame]) return GAME_PAD_CTX[w.activityGame];
  if (playerBusy(w, ['padel', 'activityGame']).busy) return 'minigame';
  const v = w.player && w.player.inVehicle;
  if (v) return v.isPlane ? 'plane' : v.isHeli ? 'heli' : w.noLookBack ? 'skutsje' : v.gb && getSettings().shiftMode !== 'auto' ? 'vehicleManual' : v.isBus ? 'bus' : 'vehicle';
  return 'foot';
}


function press(slot) {
  const map = PAD_MAPS[ctx] || PAD_MAPS.foot;
  let a = map[slot];
  // Samen spelen: in een voertuig geeft D-pad omhoog het stuur (Y op het toetsenbord)
  const coop = world && world.coopNet && PAD_COOP[ctx];
  if (coop && coop[slot]) a = coop[slot];
  if (a == null) return;
  if (ctx === 'menu') a = menuKey(slot, a);
  if (a == null) return;
  heldAction[slot] = a;
  if (a === '@fire') { input.mouse.down = true; return; }
  if (a === '@aim') { input.mouse.rightDown = true; return; }
  if (a === '@wheel+' || a === '@wheel-') { input.mouse.wheel += a === '@wheel+' ? WHEEL_TICK : -WHEEL_TICK; return; }
  if (a === '@gas' || a === '@brake') return; // analog, in sticks()
  if (slot === 'ls' && a === 'shift' && map.stick === 'move') { sprintLatch = !sprintLatch; delete heldAction[slot]; return; }
  const ev = sendKey('keydown', a, 'pad');
  if (ctx === 'menu') {
    repeatAt[slot] = a.startsWith('arrow') || a === '[' || a === ']' ? performance.now() + REPEAT_DELAY : Infinity;
    menuFallback(a, ev);
  }
}

function release(slot) {
  const a = heldAction[slot];
  delete heldAction[slot];
  delete repeatAt[slot];
  if (a == null) return;
  if (a === '@fire') { input.mouse.down = false; return; }
  if (a === '@aim') { input.mouse.rightDown = false; return; }
  if (a.startsWith('@')) return;
  sendKey('keyup', a, 'pad');
}

// The menus differ a little: B goes back a level in the phone section, A is Space
// on the title screen (the attract intro skips on a held Space), and the
// triggers zoom the map.
function menuKey(slot, a) {
  const open = hooks.phoneOpen && hooks.phoneOpen();
  if (slot === 'b' && open) return 'backspace';
  if (slot === 'a' && !started()) return ' ';
  if ((slot === 'lt' || slot === 'rt') && hooks.mapOpen && hooks.mapOpen()) return slot === 'lt' ? '-' : '+';
  if ((slot === 'lb' || slot === 'rb') && !(hooks.pauseOpen && hooks.pauseOpen())) return null;
  return a;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

// A dialog that has no key handling of its own still works: arrows walk its
// buttons, A clicks the focused one.
function menuFallback(a, ev) {
  if (ev.defaultPrevented) return;
  const el = document.activeElement;
  if ((a === 'enter' || a === ' ') && el && el !== document.body) {
    if (el.matches('button, a, [role="button"], [role="tab"], [role="radio"], summary, input[type="checkbox"]')) el.click();
    return;
  }
  if (!a.startsWith('arrow')) return;
  const scope = (el && el.closest && el.closest('[role="dialog"], [role="alertdialog"]')) || document.querySelector('[role="dialog"]:not([hidden]), [role="alertdialog"]:not([hidden])') || document.body;
  const list = [...scope.querySelectorAll(FOCUSABLE)].filter((b) => b.getClientRects().length && !b.closest('[hidden]'));
  if (!list.length) return;
  const i = list.indexOf(el);
  // eerst de buur in die richting op het scherm, anders door de lijst heen
  const rects = list.map((b) => { const r = b.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  let j = spatialNext(rects, i, a.slice(5));
  if (j < 0) j = i < 0 ? 0 : (i + (a === 'arrowup' || a === 'arrowleft' ? -1 : 1) + list.length) % list.length;
  const next = list[j];
  next.focus({ preventScroll: true });
  next.scrollIntoView({ block: 'nearest' });
}

const dz = (x, y) => radialDeadzone(x, y, DEAD);

function holdStick(k, on) {
  if (on === stickKeys.has(k)) return;
  if (on) stickKeys.add(k); else stickKeys.delete(k);
  if (ctx === 'menu') {
    if (on) { sendKey('keydown', k, 'pad'); repeatAt['stick-' + k] = performance.now() + REPEAT_DELAY; } else { sendKey('keyup', k, 'pad'); delete repeatAt['stick-' + k]; }
    return;
  }
  input.padHold(k, on);
}

// hysteresis: a key goes on past STICK_KEY_ON, off below STICK_KEY_OFF
const past = (v, k) => (stickKeys.has(k) ? v > STICK_KEY_OFF : v > STICK_KEY_ON);

function sticks(pad, dt) {
  const map = PAD_MAPS[ctx] || PAD_MAPS.foot;
  const ax = pad.axes || [];
  const [lx, ly] = dz(ax[0] || 0, ax[1] || 0);
  const [rx, ry] = dz(ax[2] || 0, ax[3] || 0);
  const lt = trig(pad, 'lt'), rt = trig(pad, 'rt');
  let axis = [0, 0];
  const mode = map.stick;
  if (mode === 'move') {
    axis = [lx, ly];
    holdStick('w', past(-ly, 'w')); holdStick('s', past(ly, 's'));
    holdStick('a', past(-lx, 'a')); holdStick('d', past(lx, 'd'));
    if (sprintLatch && Math.hypot(lx, ly) < 0.3) sprintLatch = false;
    holdStick('shift', sprintLatch);
  } else if (mode === 'steer') {
    const gas = map.rt === '@gas' ? rt : 0;
    const brake = map.lt === '@brake' ? lt : 0;
    const y = (brake > 0.12 ? brake : 0) - (gas > 0.12 ? gas : 0);
    axis = [lx, Math.abs(y) > 0.05 ? y : 0];
    holdStick('w', past(gas, 'w')); holdStick('s', past(brake, 's'));
    holdStick('a', past(-lx, 'a')); holdStick('d', past(lx, 'd'));
  } else if (mode === 'arrows') {
    holdStick('arrowup', past(-ly, 'arrowup')); holdStick('arrowdown', past(ly, 'arrowdown'));
    holdStick('arrowleft', past(-lx, 'arrowleft')); holdStick('arrowright', past(lx, 'arrowright'));
  } else if (mode === 'nav') {
    // one direction at a time, the stronger one
    const horiz = Math.abs(lx) > Math.abs(ly);
    holdStick('arrowleft', horiz && past(-lx, 'arrowleft')); holdStick('arrowright', horiz && past(lx, 'arrowright'));
    holdStick('arrowup', !horiz && past(-ly, 'arrowup')); holdStick('arrowdown', !horiz && past(ly, 'arrowdown'));
  }
  input.padAxis = axis;
  if (ctx === 'menu') {
    // right stick scrolls whatever list has the focus
    if (ry) {
      let el = document.activeElement;
      while (el && el !== document.body && !(el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
      if (el && el !== document.body) el.scrollBy(0, ry * 900 * dt);
    }
    return;
  }
  if (rx || ry) {
    const k = LOOK_PX_PER_S * (getSettings().padLookSensitivity || 1) * dt;
    input.mouse.dx += rx * Math.abs(rx) * k;
    input.mouse.dy += ry * Math.abs(ry) * k * 0.7;
  }
}

function trig(pad, slot) {
  const idx = PAD_BUTTONS.indexOf(physicalOf(slot));
  const b = pad.buttons[idx];
  return b ? (typeof b.value === 'number' ? b.value : b.pressed ? 1 : 0) : 0;
}

let padBinds = {};
function physicalOf(slot) {
  const p = padBinds[slot];
  return p || slot;
}

function readSlots(pad) {
  const out = {};
  for (let i = 0; i < PAD_BUTTONS.length; i++) {
    const b = pad.buttons[i];
    if (!b) continue;
    const phys = PAD_BUTTONS[i];
    const slot = slotMap[phys] || phys;
    const v = typeof b.value === 'number' ? b.value : 0;
    const was = prevSlots[slot];
    out[slot] = phys === 'lt' || phys === 'rt' ? (was ? v > TRIGGER_OFF : v > TRIGGER_ON) || (b.pressed && v === 0) : !!b.pressed;
  }
  return out;
}

function releaseAll() {
  for (const s of Object.keys(heldAction)) release(s);
  for (const k of [...stickKeys]) holdStick(k, false);
  sprintLatch = false;
  if (input) { input.padAxis = [0, 0]; input.mouse.down = false; input.mouse.rightDown = false; }
}

function anyInput(pad) {
  for (const b of pad.buttons) if (b && (b.pressed || b.value > 0.3)) return true;
  for (const a of pad.axes) if (Math.abs(a) > 0.45) return true;
  return false;
}

function watchFeel() {
  const w = world;
  if (!w || ctx === 'menu') { lastHealth = null; lastSpeed = null; return; }
  const hp = (w.health || 0) + (w.armor || 0);
  if (lastHealth != null && hp < lastHealth - 1.5) {
    const k = Math.min(1, (lastHealth - hp) / 40);
    rumble(0.35 + k * 0.6, 0.5 + k * 0.4, 120 + k * 220);
  }
  lastHealth = hp;
  const v = w.player && w.player.inVehicle;
  const sp = v && Number.isFinite(v.speed) ? v.speed : null;
  if (sp != null && lastSpeed != null && Math.abs(sp - lastSpeed) > 4.5) {
    const k = Math.min(1, (Math.abs(sp - lastSpeed) - 4.5) / 12);
    rumble(0.5 + k * 0.5, 0.4 + k * 0.4, 160 + k * 260);
  }
  lastSpeed = sp;
}

function poll(now) {
  requestAnimationFrame(poll);
  const dt = Math.min(0.05, Math.max(0, (now - (lastT || now)) / 1000));
  lastT = now;
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  // coop: speler 1 houdt zijn pad, ook als speler 2 op de andere drukt
  padIndex = pickPad([...pads].filter(Boolean).map((p) => ({ index: p.index, connected: p.connected, active: anyInput(p) })), padIndex, { sticky: !!(world && world.coop) });
  const pad = padIndex >= 0 ? pads[padIndex] : null;
  if (!pad) { if (active) setActive(false); return; }
  if (!active) {
    if (!anyInput(pad)) return;
    setActive(true, pad.id);
  }
  const nctx = context();
  if (nctx !== ctx) {
    releaseAll();
    ctx = nctx;
    document.documentElement.dataset.padCtx = ctx;
    emit();
  }
  const slots = readSlots(pad);
  if (capture) {
    for (const i of [...captureBlock]) if (!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > TRIGGER_OFF))) captureBlock.delete(i);
    for (let i = 0; i < PAD_BUTTONS.length; i++) {
      const b = pad.buttons[i];
      if (b && (b.pressed || b.value > TRIGGER_ON) && !captureBlock.has(i)) {
        const cb = capture;
        capture = null;
        captureBlock = new Set(pad.buttons.map((x, j) => (x && (x.pressed || x.value > TRIGGER_OFF) ? j : -1)).filter((j) => j >= 0));
        cb(nintendoSwap(PAD_BUTTONS[i], family)); // opgeslagen als vóór de Nintendo-wissel
        break;
      }
    }
    for (const s of Object.keys(slots)) prevSlots[s] = slots[s];
    return;
  }
  // buttons still held from a capture do nothing until they are let go
  if (captureBlock.size) {
    for (const i of [...captureBlock]) if (!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > TRIGGER_OFF))) captureBlock.delete(i);
    for (const s of Object.keys(slots)) prevSlots[s] = slots[s];
    if (captureBlock.size) return;
  }
  for (const s of PAD_BUTTONS) {
    const on = !!slots[s];
    if (on && !prevSlots[s]) press(s);
    else if (!on && prevSlots[s]) release(s);
    else if (on && repeatAt[s] && now >= repeatAt[s] && heldAction[s]) {
      repeatAt[s] = now + REPEAT_EVERY;
      const ev = sendKey('keydown', heldAction[s], 'pad', { repeat: true });
      menuFallback(heldAction[s], ev);
    }
    prevSlots[s] = on;
  }
  for (const [k, at] of Object.entries(repeatAt)) {
    if (!k.startsWith('stick-') || now < at) continue;
    repeatAt[k] = now + REPEAT_EVERY;
    const key = k.slice(6);
    const ev = sendKey('keydown', key, 'pad', { repeat: true });
    menuFallback(key, ev);
  }
  sticks(pad, dt);
  watchFeel();
}

// hooks: { menuOpen, phoneOpen, pauseOpen, mapOpen } from main.js
export function initGamepad(inp, w, h = {}) {
  if (typeof window === 'undefined' || input) return;
  input = inp;
  world = w;
  hooks = h;
  onSettingsChange((st, key) => {
    if (!key || key === 'padBinds') { padBinds = { ...st.padBinds }; slotMap = buttonSlots(padBinds, family); }
    if (key === 'hintSource') { family = layoutFor(currentPad() && currentPad().id); slotMap = buttonSlots(padBinds, family); document.documentElement.dataset.pad = family; emit(); }
    if (key === 'padLayout' && active) { family = layoutFor(currentPad() && currentPad().id); slotMap = buttonSlots(padBinds, family); document.documentElement.dataset.pad = family; emit(); }
  });
  // real keys, clicks, mouse sweeps and touches are noticed by inputdevice.js; they hand the hints back
  onDeviceChange((d) => { if (d !== 'pad' && active) setActive(false); });
  inp.onRealKey = () => noteDevice('kb');
  window.addEventListener('gamepaddisconnected', () => { if (!currentPad()) setActive(false); });
  document.documentElement.dataset.padCtx = ctx;
  requestAnimationFrame(poll);
}
