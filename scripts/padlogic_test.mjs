// Logic test for the pure controller code (game/js/padlogic.js and the
// controller tables in controls.js): dead zone, which pad is player 1,
// spatial menu navigation, layouts per family, the input overview. (#151)
//   node scripts/padlogic_test.mjs
import * as L from '../game/js/padlogic.js';
import * as C from '../game/js/controls.js';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

// dead zone
ok(L.radialDeadzone(0.1, 0.1)[0] === 0, 'inside the dead zone is nothing');
ok(L.radialDeadzone(NaN, 0).every((v) => v === 0), 'NaN is nothing');
const full = L.radialDeadzone(1, 0);
ok(Math.abs(full[0] - 1) < 1e-9 && full[1] === 0, 'full tilt is 1');
const edge = L.radialDeadzone(0.21, 0);
ok(edge[0] > 0 && edge[0] < 0.05, 'just past the edge starts near 0', edge);
const diag = L.radialDeadzone(1, 1);
ok(Math.hypot(...diag) <= 1 + 1e-9, 'a diagonal corner never exceeds 1', diag);

// which pad is player 1
const P = (index, active, connected = true) => ({ index, connected, active });
ok(L.pickPad([], -1) === -1, 'no pads: -1');
ok(L.pickPad([P(0, false)], -1) === 0, 'one idle pad is picked');
ok(L.pickPad([P(0, false), P(1, true)], 0) === 1, 'normally the pad in use takes over');
ok(L.pickPad([P(0, false), P(1, true)], 0, { sticky: true }) === 0, 'coop: player 2 pressing does not steal player 1');
ok(L.pickPad([P(0, false, false), P(1, true)], 0, { sticky: true }) === 1, 'coop: when player 1 pad drops out, the other one takes over');
ok(L.pickPad([P(0, true), P(1, true)], 1) === 1, 'both active: keep the current one');
ok(L.pickPad([null, P(2, false)], -1) === 2, 'null slots are skipped');

// spatial navigation
const grid = [{ x: 0, y: 0, w: 100, h: 30 }, { x: 110, y: 0, w: 100, h: 30 }, { x: 0, y: 40, w: 100, h: 30 }, { x: 110, y: 40, w: 100, h: 30 }];
ok(L.spatialNext(grid, 0, 'right') === 1 && L.spatialNext(grid, 0, 'down') === 2, 'grid: right and down');
ok(L.spatialNext(grid, 3, 'left') === 2 && L.spatialNext(grid, 3, 'up') === 1, 'grid: left and up');
ok(L.spatialNext(grid, 0, 'left') === -1 && L.spatialNext(grid, 0, 'up') === -1, 'edge: nothing, the caller wraps');
ok(L.spatialNext(grid, -1, 'down') === 0, 'no focus: the top left one');
ok(L.spatialNext([], 0, 'down') === -1, 'empty list');
const col = [{ x: 0, y: 0, w: 200, h: 30 }, { x: 0, y: 40, w: 60, h: 30 }, { x: 150, y: 40, w: 60, h: 30 }];
ok(L.spatialNext(col, 0, 'down') !== -1, 'a wide button above two small ones reaches one');
ok(L.spatialNext(col, 1, 'right') === 2, 'right along a row');

// layouts and families
ok(C.padFamily('Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)') === 'switch', 'Pro Controller is Switch');
ok(C.padFamily('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)') === 'ps', 'DualShock is PS');
ok(C.padFamily('Xbox 360 Controller (XInput STANDARD GAMEPAD)') === 'xbox', 'Xbox');
ok(C.padFamily('Steam Deck Controller (STANDARD GAMEPAD Vendor: 28de)') === 'deck', 'Deck');
ok(C.padFamily('') === 'xbox', 'unknown falls back to Xbox');
const slots = Object.keys(C.PAD_LAYOUTS.xbox);
for (const f of Object.keys(C.PAD_LAYOUTS)) ok(slots.every((s) => C.PAD_LAYOUTS[f][s]), `layout ${f} labels every slot`);
ok(C.PAD_LAYOUTS.switch.a === 'B' && C.PAD_LAYOUTS.switch.b === 'A', 'Switch: the bottom button is B');

// overview
const ov = C.inputOverview();
ok(Object.keys(ov).length === Object.keys(C.PAD_MAPS).length, 'overview covers every situation');
ok(ov.foot.rows.some((r) => r.slot === 'a' && r.action === ' '), 'foot: A jumps');
// duplicates are allowed only where meant (heli and plane, the same flying layout as the heli with flaps on LB and gear on X (#444): up on A and RT, down on B and LT, faster on RB and L3; foot/vehicle: none)
ok(C.PAD_MAPS.foot.up === 'n', 'on foot the D-pad up is the radio');
const allowedDup = { heli: [' ', 'control', 'shift'], plane: [' ', 'control', 'shift'], train: ['o', 'k'], pigeon: ['shift'], foodtruck: ['backspace'], menu: ['escape'] };
for (const [ctx, o] of Object.entries(ov)) for (const d of o.duplicates) ok((allowedDup[ctx] || []).includes(d.action), `${ctx}: ${d.action} on ${d.slots.join('+')} is not meant`, d);
// every button action must be something the game can read: a key, a mouse stand-in or null
for (const [ctx, map] of Object.entries(C.PAD_MAPS)) for (const s of C.PAD_BUTTONS) {
  const v = map[s];
  ok(v === null || typeof v === 'string', `${ctx}.${s} is a string or null`);
}
// padInfo per id-tekst (#151): soort, indeling en standaardmapping
const I = C.padInfo;
ok(I('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', 'standard').family === 'xbox', 'info: Xbox');
ok(I('Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)', 'standard').name === 'Controller met wisselende letters', 'info: Pro Controller');
ok(I('Joy-Con (L) (Vendor: 057e Product: 2006)', '').name === 'Losse controllerhelft' && I('Joy-Con (L) (Vendor: 057e Product: 2006)', '').note !== '', 'info: Joy-Con without standard mapping warns');
ok(I('Steam Controller (Vendor: 28de Product: 1102)', '').name === 'Controller met trackpads' && !I('Steam Controller (Vendor: 28de Product: 1102)', '').standard, 'info: old Steam Controller, no standard mapping');
ok(I('Steam Deck Controller (STANDARD GAMEPAD Vendor: 28de Product: 1205)', 'standard').name === 'Handheld', 'info: Deck');
ok(I('Xbox 360 Controller (XInput STANDARD GAMEPAD)', 'standard').standard, 'info: Steam Input shows up as XInput');
ok(I('', '').name === '' && I('', '').note !== '', 'info: no pad');
// de Switch-indeling zet de onderste knop op B
ok(C.PAD_LAYOUTS.switch.a === 'B' && C.PAD_LAYOUTS.switch.b === 'A' && C.PAD_LAYOUTS.switch.x === 'Y' && C.PAD_LAYOUTS.switch.y === 'X', 'switch layout swaps A/B and X/Y labels');
// Nintendo-indeling: de vier gezichtsknoppen wisselen, de rest en andere indelingen niet
{
  const nin = C.buttonSlots({}, 'switch');
  ok(nin.b === 'a' && nin.a === 'b' && nin.y === 'x' && nin.x === 'y' && nin.lb === 'lb' && nin.up === 'up', 'Nintendo: a/b en x/y wisselen, de rest niet', nin);
  const std = C.buttonSlots({});
  ok(std.a === 'a' && std.b === 'b' && C.buttonSlots({}, 'ps').a === 'a' && C.buttonSlots({}, 'auto').x === 'x', 'andere indelingen wisselen niet');
  const bound = C.buttonSlots(C.bindButton({}, 'a', 'x').binds, 'switch');
  ok(Object.keys(bound).length === Object.keys(nin).length && new Set(Object.values(bound)).size === Object.keys(bound).length, 'Nintendo met eigen herbinding blijft een wisseling zonder dubbelen');
  ok(C.nintendoSwap('a', 'switch') === 'b' && C.nintendoSwap('a', 'xbox') === 'a' && C.nintendoSwap('lt', 'switch') === 'lt', 'nintendoSwap');
  // de hint voor de bevestigknop (a) toont bij Nintendo het label van de rechterknop: A
  const lab = (fam) => C.PAD_LAYOUTS[fam][C.glyphFaceSlot('a', fam)];
  ok(lab('switch') === 'A' && lab('xbox') === 'A' && lab('ps') === 'cross', 'hint voor bevestigen: A bij letter- en Nintendo-indeling, kruis bij vormknoppen');
}
// controllertest: knoplabels per indeling
const T = await import('../game/js/padtest.js');
ok(T.padTestLabel(0, 'xbox') === 'A' && T.padTestLabel(0, 'switch') === 'B' && T.padTestLabel(0, 'ps') === 'cross', 'padtest: bottom button label per layout');
ok(T.padTestLabel(12, 'xbox') === 'D-pad omhoog' || T.padTestLabel(12, 'xbox') === 'Omhoog' || T.padTestLabel(12, 'xbox').length > 0, 'padtest: d-pad has a label');
ok(T.padTestLabel(40, 'xbox') === 'Knop 40', 'padtest: unknown index');
console.log(fails ? `${fails} FAILED` : 'padlogic_test: all ok');
process.exit(fails ? 1 : 0);
