// Logic test for the control scheme (game/js/controls.js): rebinding with
// swaps, the key translation input.js uses, damaged saves, the controller
// tables and the glyph lookup.
//   node scripts/controls_test.mjs
import * as C from '../game/js/controls.js';
import { BELL_KEYS } from '../game/js/carillonrules.js';

let fails = 0, n = 0;
const ok = (c, name, extra) => { n++; if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

// keyboard
let r = C.bindKey({}, 'e', 'g');
ok(r.binds.e === 'g' && !r.swapped, 'bind e to a free key', r);
let t = C.keyTranslation(r.binds);
ok(t.get('g') === 'e', 'g now sends e');
ok(t.has('e') && t.get('e') === null, 'e itself does nothing now');
r = C.bindKey({}, 'e', 'f');
ok(r.swapped === 'f' && r.binds.e === 'f' && r.binds.f === 'e', 'binding e to f swaps them', r);
t = C.keyTranslation(r.binds);
ok(t.get('f') === 'e' && t.get('e') === 'f', 'swap translates both ways');
r = C.bindKey(r.binds, 'e', 'e');
ok(!('e' in r.binds) && !('f' in r.binds), 'binding back to the default clears both', r.binds);
ok(C.keyTranslation({}).size === 0, 'no binds, no translation');
ok(!C.isBindableKey('escape') && !C.isBindableKey('enter') && !C.isBindableKey('arrowup') && !C.isBindableKey('f5'), 'fixed keys cannot be bound');
ok(C.isBindableKey('g') && C.isBindableKey(' ') && C.isBindableKey('shift') && C.isBindableKey(';'), 'normal keys can');
r = C.bindKey({}, 'nonsense', 'g');
ok(Object.keys(r.binds).length === 0, 'unknown action ignored');
// three-way: w->x (x was coo), then x(coo)->w
r = C.bindKey({}, 'w', 'x');
ok(r.binds.w === 'x' && r.binds.x === 'w', 'w takes x, coo key goes to w', r.binds);
const phys = C.KEY_ACTIONS.map(([k]) => C.physicalKey(r.binds, k));
ok(new Set(phys).size === phys.length, 'never two actions on one key');

// damaged saves
ok(Object.keys(C.normalizeKeyBinds({ e: 'f' })).length === 0, 'a duplicate (e and f both on f) falls back to defaults');
ok(JSON.stringify(C.normalizeKeyBinds({ e: 'g', zz: 'q', w: 5, a: 'escape' })) === '{"e":"g"}', 'unknown, non-string and fixed entries are dropped');
ok(JSON.stringify(C.normalizeKeyBinds(null)) === '{}', 'null is empty');

// controller remap
let p = C.bindButton({}, 'a', 'b');
ok(p.binds.a === 'b' && p.binds.b === 'a' && p.swapped === 'b', 'A and B swap', p);
const slots = C.buttonSlots(p.binds);
ok(slots.b === 'a' && slots.a === 'b', 'pressing B plays the A slot');
ok(Object.keys(C.bindButton({}, 'start', 'a').binds).length === 0, 'start is not remappable');
ok(Object.keys(C.normalizePadBinds({ a: 'b' })).length === 0, 'a broken pad permutation resets');

// glyph lookup
ok(C.padSlotFor('E', 'foot') === 'y', 'E on foot is Y');
ok(C.padSlotFor('SPACE', 'vehicle') === 'a', 'Space in a car is A (handbrake)');
ok(C.padSlotFor('LMB', 'foot') === 'rt' && C.padSlotFor('RMB', 'foot') === 'lt', 'mouse buttons are the triggers');
ok(C.padSlotFor('W', 'vehicle') === 'rt' && C.padSlotFor('S', 'vehicle') === 'lt', 'gas and brake on the triggers');
ok(C.padSlotFor('WASD', 'foot') === 'lstick' && C.padSlotFor('MOUSE', 'foot') === 'rstick', 'sticks');
ok(C.padSlotFor('ESC', 'menu') === 'b' && C.padSlotFor('Enter', 'menu') === 'a', 'menu back and ok');
ok(C.padSlotFor('K', 'foot') === 'down', 'the kiss is on the D-pad');
ok(C.padSlotFor('F', 'vehicle') === 'y', 'F falls back to what E does');
ok(C.padSlotFor('1', 'foodtruck') === 'up' && C.padSlotFor('6', 'foodtruck') === 'rb', 'the frituur menu on the D-pad and bumpers');
ok(C.padSlotFor('Q', 'skutsje') === 'rb' && C.padSlotFor('Z', 'skutsje') === 'lb', 'sail trim on the bumpers');
ok(C.padFamily('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)') === 'ps', 'DualSense is ps');
ok(C.padFamily('Steam Deck Controller (Vendor: 28de)') === 'deck', 'Steam Deck');
ok(C.padFamily('Xbox Wireless Controller') === 'xbox', 'Xbox');

// the helicopter: WASD flies (stick), Space up, Ctrl down, Shift faster
ok(C.PAD_MAPS.heli.stick === 'move', 'heli: the left stick flies forward/back and turns');
ok(C.padSlotFor('W', 'heli') === 'lstick' && C.padSlotFor('A', 'heli') === 'lstick', 'heli: W and A are the left stick');
ok(C.padSlotFor('SPACE', 'heli') === 'a' && C.padSlotFor('CTRL', 'heli') === 'b', 'heli: up on A, down on B');
ok(C.PAD_MAPS.heli.rt === ' ' && C.PAD_MAPS.heli.lt === 'control', 'heli: RT up, LT down');
ok(C.padSlotFor('SHIFT', 'heli') === 'rb', 'heli: faster on RB');
ok(C.KEY_ACTIONS.some(([k, d]) => k === 'control' && /heli/.test(d)) && C.KEY_ACTIONS.some(([k, d]) => k === ' ' && /heli/.test(d)), 'heli up/down named in the rebind list');

// the radio: one station, so one on/off key (N) and LB in a vehicle; no station switching on B
ok(C.KEY_ACTIONS.some(([k, d]) => k === 'n' && /radio aan of uit/i.test(d)), 'N turns the radio on or off');
ok(!C.KEY_ACTIONS.some(([k]) => k === 'b') && !C.KEY_ACTIONS.some(([, d]) => /zender/i.test(d)), 'no previous/next station keys left');
ok(C.padSlotFor('N', 'vehicle') === 'lb' && /radio aan of uit/i.test(C.slotUses('lb')), 'LB in a vehicle is the radio switch, and Besturing says so', C.slotUses('lb'));
ok(JSON.stringify(C.normalizeKeyBinds({ b: 'i', n: 'i' })) === '{"n":"i"}', 'a saved bind for the old B action is dropped, N keeps its own');

// every situation maps every game key it needs to some button
const need = { foot: [' ', 'control', 'e', 'f', 'k', 'm', 'escape', 'shift', 'tab', 'o'], vehicle: [' ', 'e', 'h', 'l', 'q', 'v', 'm', 'escape', 'n', 'shift', '@fire'],
  heli: [' ', 'control', 'e', 'shift'], pigeon: [' ', 'control', 'f', 'e', 'c', 'q', 'x', 'shift'], menu: ['enter', 'escape', 'q', 'e'], minigame: [' ', 'backspace', 'e'], foodtruck: ['1', '2', '3', '4', '5', '6', ' ', 'backspace'],
  pannenkoek: ['q', 'w', 'e', 'r', '1', '2', '3', 'backspace', 'escape'],
  klokken: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';', ' ', 'backspace', 'q', 'e', 'escape'] };
for (const [ctx, keys] of Object.entries(need)) {
  for (const k of keys) {
    const has = Object.values(C.PAD_MAPS[ctx]).includes(k) || (C.PAD_MAPS[ctx].stick === 'arrows' && false);
    ok(has, `${ctx} has a button for "${k}"`);
  }
}

// the phone is the pause menu (Esc): T is no longer a phone key, on the keyboard or the pad
ok(!C.KEY_ACTIONS.some(([k]) => k === 't') && !C.KEY_ACTIONS.some(([, d]) => /^telefoon$/i.test(d)), 'no T phone action left');
ok(Object.values(C.PAD_MAPS).every((m) => !Object.values(m).includes('t')), 'no controller button sends T');
ok(JSON.stringify(C.normalizeKeyBinds({ t: 'j', m: 'g' })) === '{"m":"g"}', 'a saved bind for the old T phone key is dropped, others stay');
ok(C.padSlotFor('ESC', 'foot') === 'start' && C.padSlotFor('ESC', 'vehicle') === 'start', 'Esc (the phone) is Start on the pad');
ok(C.padSlotFor('T', 'menu') === null, 'T means nothing in the menu any more');

// browser defaults: Ctrl+W closes the tab, so Ctrl's action starts on C
ok(C.physicalKey({}, 'control') === 'control' && C.keyWord({}, 'control') === 'Ctrl', 'desktop keeps Ctrl');
C.setKeyPlatform('browser');
ok(C.physicalKey({}, 'control') === 'c' && C.physicalKey({}, 'c') === 'g', 'browser: crouch/down on C, coo on G');
ok(C.keyWord({}, 'control') === 'C' && C.keyWord({}, ' ') === 'Spatie', 'keyWord for running text');
t = C.keyTranslation({});
ok(t.get('control') === null && t.get('c') === 'control' && t.get('g') === 'c', 'browser: Ctrl does nothing, C sends control, G sends c');
r = C.bindKey({}, 'control', 'control');
ok(r.binds.control === 'control' && C.physicalKey(r.binds, 'control') === 'control', 'browser: Ctrl can be chosen back', r.binds);
ok(C.keyTranslation(r.binds).get('control') === undefined, 'and then Ctrl is not remapped');
r = C.bindKey(r.binds, 'control', 'c');
ok(!('control' in r.binds), 'binding back to the browser default clears it', r.binds);
const bphys = C.KEY_ACTIONS.map(([k]) => C.physicalKey({}, k));
ok(new Set(bphys).size === bphys.length, 'browser defaults: never two actions on one key');
ok(JSON.stringify(C.normalizeKeyBinds({})) === '{}', 'browser: empty binds stay empty');
C.setKeyPlatform('desktop');

// look back in a vehicle: Q / right stick / middle mouse, any speed
ok(C.lookBackActive({ inVehicle: true, qDown: true }), 'Q looks back in a vehicle');
ok(C.lookBackActive({ inVehicle: true, middleDown: true, noLookBack: true }), 'middle mouse looks back even when a minigame owns Q');
ok(!C.lookBackActive({ inVehicle: true, qDown: true, noLookBack: true }), 'skutsje: Q trims the sail');
ok(!C.lookBackActive({ inVehicle: false, qDown: true }) && !C.lookBackActive({ inVehicle: true, qDown: true, override: true }), 'not on foot or in a cutscene');
for (const speed of [5, 20, 40, 60]) {
  // car drives +x; looking back the camera wants to sit 5 m ahead of it
  let carX = 0, camX = -5;
  const dt = 1 / 60;
  for (let i = 0; i < 120; i++) {
    carX += speed * dt;
    camX += (carX + 5 - camX) * C.chaseFollowLerp(dt, { lookBack: true, cut: i === 0 });
  }
  ok(camX - carX > 4.9, `looking back at ${speed} m/s the camera stays ahead of the car`, camX - carX);
}
ok(C.chaseFollowLerp(1 / 60) < 1, 'normal chase camera still eases');

// manual shifting: keys, clutch and the bumpers
ok(['.', ',', 'j'].every((k) => C.KEY_ACTIONS.some(([c]) => c === k)), 'shift up, shift down and the clutch are rebindable keys');
ok(C.PAD_MAPS.vehicleManual.rb === '.' && C.PAD_MAPS.vehicleManual.lb === ',' && C.PAD_MAPS.vehicleManual.ls === 'j', 'bumpers shift and L3 is the clutch in the manual vehicle map');
ok(C.PAD_MAPS.vehicleManual.rt === '@gas' && C.PAD_MAPS.vehicleManual.lt === '@brake' && C.PAD_MAPS.vehicleManual.stick === 'steer', 'gas, brake and steering stay as in the automatic vehicle map');
ok(C.PAD_MAPS.vehicleManual.up === 'n', 'the radio moves to the D-pad when the bumpers shift');
ok(new Set(C.KEY_ACTIONS.map(([k]) => C.physicalKey({}, k))).size === C.KEY_ACTIONS.length, 'no two actions share a default key');

// the carillon: all eight bell keys sit on the pad, each on its own button
ok(BELL_KEYS.every((k) => Object.values(C.PAD_MAPS.klokken).includes(k)), 'klokken: every bell key has a button');
ok(new Set(BELL_KEYS.map((k) => C.padSlotFor(k, 'klokken'))).size === BELL_KEYS.length, 'klokken: each bell is its own button');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
