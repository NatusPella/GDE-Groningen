// Logic test for the control scheme (game/js/controls.js): rebinding with
// swaps, the key translation input.js uses, damaged saves, the controller
// tables and the glyph lookup.
//   node scripts/controls_test.mjs
import * as C from '../game/js/controls.js';

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

// every situation maps every game key it needs to some button
const need = { foot: [' ', 'control', 'e', 'f', 'k', 't', 'm', 'escape', 'shift', 'tab', 'o'], vehicle: [' ', 'e', 'h', 'l', 'q', 'v', 't', 'm', 'escape', 'n', 'shift', '@fire'],
  heli: ['w', 's', 'a', 'd', ' ', 'e', 'shift'], pigeon: [' ', 'control', 'f', 'e', 'c', 'q', 'x', 'shift'], menu: ['enter', 'escape', 'q', 'e'], minigame: [' ', 'backspace', 'e'], foodtruck: ['1', '2', '3', '4', '5', '6', ' ', 'backspace'] };
for (const [ctx, keys] of Object.entries(need)) {
  for (const k of keys) {
    const has = Object.values(C.PAD_MAPS[ctx]).includes(k) || (C.PAD_MAPS[ctx].stick === 'arrows' && false);
    ok(has, `${ctx} has a button for "${k}"`);
  }
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
