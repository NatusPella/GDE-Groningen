// #1297: de echte gamepad.js tegen een nep-controller (zelfde nepbrowser als gamepad_live_test):
// 1. valt de controller weg terwijl een knop is ingedrukt, dan werkt de eerste druk op die knop na opnieuw aansluiten;
// 2. na focusverlies (Alt-Tab) met de stick nog naar voren komt de looptoets terug zodra het venster weer pollt.
//   node scripts/pad_wegval_test.mjs
import assert from 'node:assert/strict';

class ClassList {
  constructor() { this.s = new Set(); }
  add(c) { this.s.add(c); }
  remove(c) { this.s.delete(c); }
  toggle(c, on) { (on === undefined ? !this.s.has(c) : on) ? this.s.add(c) : this.s.delete(c); }
  contains(c) { return this.s.has(c); }
}
const el = () => ({ classList: new ClassList(), dataset: {}, querySelector: () => null, querySelectorAll: () => [], appendChild() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) });
class KeyboardEvent extends Event {
  constructor(type, init = {}) { super(type, init); Object.assign(this, { key: init.key, code: init.code, repeat: !!init.repeat }); }
}
const win = new EventTarget();
globalThis.KeyboardEvent = KeyboardEvent;
globalThis.window = win;
globalThis.document = Object.assign(new EventTarget(), { documentElement: el(), body: el(), activeElement: null, hidden: false, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, pointerLockElement: null });
let rafCb = null;
globalThis.requestAnimationFrame = (f) => { rafCb = f; return 1; };
const pads = [];
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => pads, userAgent: 'node' } });

const { Input } = await import('../game/js/input.js');
const { initGamepad, padState } = await import('../game/js/gamepad.js');
const { PAD_BUTTONS } = await import('../game/js/controls.js');

const input = new Input(win);
const world = { player: { inVehicle: null }, coop: false };
initGamepad(input, world, { menuOpen: () => false, phoneOpen: () => false, pauseOpen: () => false, mapOpen: () => false });
const seen = [];
win.addEventListener('keydown', (e) => seen.push(['down', e.key]));
win.addEventListener('keyup', (e) => seen.push(['up', e.key]));

let now = 1000;
const frame = (n = 1) => { for (let i = 0; i < n; i++) { now += 16; rafCb(now); } };
const mk = () => ({ id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: PAD_BUTTONS.map(() => ({ pressed: false, value: 0 })) });
let pad = mk(); pads[0] = pad;
const press = (slot, on = true) => { const b = pad.buttons[PAD_BUTTONS.indexOf(slot)]; b.pressed = on; b.value = on ? 1 : 0; };
const keyUps = [];
win.addEventListener('keyup', (e) => keyUps.push(e.key)); // AGENTS.md: elke synthetische keydown krijgt een keyup

document.body.classList.add('game-started');
frame(2); press('a'); frame(2); press('a', false); frame(2);
assert.ok(padState().active, 'het pad is actief');

let n = 0;
// 1. wegvallen met een ingedrukte knop
seen.length = 0;
press('a'); frame(2);
const downsA = seen.filter((s) => s[0] === 'down').length;
assert.ok(downsA >= 1, 'A geeft een toets');
pads.length = 0; win.dispatchEvent(new Event('gamepaddisconnected')); frame(2);
assert.equal(padState().active, false, 'het pad is weg');
assert.ok(seen.some((s) => s[0] === 'up'), 'de ingedrukte knop is losgelaten');
pad = mk(); pads[0] = pad; seen.length = 0;
press('a'); frame(2);
assert.ok(seen.filter((s) => s[0] === 'down').length >= 1, 'de eerste druk op A na opnieuw aansluiten werkt (niet ingeslikt)');
press('a', false); frame(2); n++;

// 2. focusverlies met de stick naar voren
pad.axes = [0, -1, 0, 0]; frame(3);
assert.ok(input.isDown('w'), 'stick naar voren houdt W ingedrukt');
win.dispatchEvent(new Event('blur'));
assert.equal(input.isDown('w'), false, 'na focusverlies is alles los');
frame(3);
assert.ok(input.isDown('w'), 'met de stick nog naar voren komt W terug na het volgende pollbeeld');
pad.axes = [0, 0, 0, 0]; frame(3);
assert.equal(input.isDown('w'), false, 'stick los, W los'); n++;

// 3. verborgen venster doet hetzelfde
pad.axes = [0, -1, 0, 0]; frame(3);
document.hidden = true; document.dispatchEvent(new Event('visibilitychange'));
assert.equal(input.isDown('w'), false);
document.hidden = false; frame(3);
assert.ok(input.isDown('w'), 'na een verborgen venster komt W ook terug');
pad.axes = [0, 0, 0, 0]; frame(3); n++;

console.log(`pad_wegval_test: ${n} gevallen geslaagd`);
