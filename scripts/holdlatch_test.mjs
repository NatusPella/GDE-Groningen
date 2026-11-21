// Tik in plaats van ingedrukt houden (game/js/holdlatch.js en de aanhaking in input.js, 21-11):
//   node scripts/holdlatch_test.mjs
// Pure logica (standen, schakelaar, stilstand) en de echte Input-klasse met een nagebootst window; schrijft nooit naar opslag.
import assert from 'node:assert/strict';
import { TAP_MODES, TAP_DEFAULT, cleanTap, tapActions, makeLatch, IDLE_FRAMES } from '../game/js/holdlatch.js';

let n = 0;
const ok = (c, naam) => { n++; assert.ok(c, naam); };

// standen
ok(TAP_DEFAULT === 'uit' && TAP_MODES.join() === 'uit,rennen,richten,beide', 'vier standen, standaard uit');
ok(cleanTap('kapot') === 'uit' && cleanTap(undefined) === 'uit' && cleanTap('beide') === 'beide', 'een onbekende stand valt terug op uit');
ok(!tapActions('uit').rennen && !tapActions('uit').richten, 'uit neemt niets over');
ok(tapActions('rennen').rennen && !tapActions('rennen').richten, 'rennen');
ok(!tapActions('richten').rennen && tapActions('richten').richten, 'richten');
ok(tapActions('beide').rennen && tapActions('beide').richten, 'beide');

// de schakelaar: tik aan, tik uit
const l = makeLatch();
ok(l.on === false, 'begint uit');
ok(l.press() === true && l.on, 'een tik zet aan');
ok(l.press() === false && !l.on, 'een tweede tik zet uit');
l.press();
ok(l.step({ allowed: true, moving: true }) === false && l.on, 'blijft aan zolang het mag');
ok(l.step({ allowed: false }) === true && !l.on, 'een voertuig, menu of pauze wist hem');
ok(l.step({ allowed: false }) === false, 'een uitstaande schakelaar meldt niets');

// stilstand laat het rennen los, bewegen houdt hem vast
const r = makeLatch(); r.press();
for (let i = 0; i < IDLE_FRAMES - 1; i++) r.step({ moving: false, idleReleases: true });
ok(r.on, 'net onder de stilstandsgrens blijft hij aan');
r.step({ moving: true, idleReleases: true });
for (let i = 0; i < IDLE_FRAMES - 1; i++) r.step({ moving: false, idleReleases: true });
ok(r.on, 'bewegen zet de teller terug');
ok(r.step({ moving: false, idleReleases: true }) === true && !r.on, 'een poos stilstaan laat het rennen los');
const a = makeLatch(); a.press();
for (let i = 0; i < IDLE_FRAMES * 3; i++) a.step({ moving: false });
ok(a.on, 'het richten komt niet los door stilstaan');

// de echte Input met een nagebootst window
const winL = {}, docL = {};
globalThis.localStorage = { getItem: () => null, setItem: () => { throw new Error('test schreef naar opslag'); }, removeItem() {} };
globalThis.window = { addEventListener: (t, f) => { (winL[t] ||= []).push(f); }, requestAnimationFrame() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
globalThis.document = { getElementById: () => null, addEventListener: (t, f) => { (docL[t] ||= []).push(f); }, hidden: false, activeElement: null, body: { classList: { contains: () => false, toggle() {} } }, documentElement: { classList: { toggle() {}, contains: () => false }, style: { setProperty() {} } } };
globalThis.KeyboardEvent = class { constructor(t, i) { this.type = t; Object.assign(this, i); } };
const { Input } = await import('../game/js/input.js');
const S = await import('../game/js/settings.js');
const inp = new Input(globalThis.window);
const toets = (type, key) => { const e = { type, key, code: key === 'Shift' ? 'ShiftLeft' : '', preventDefault() {}, stopImmediatePropagation() {}, target: null }; for (const f of winL[type] || []) f(e); };
const muis = (type, button) => { for (const f of winL[type] || []) f({ type, button, target: null, preventDefault() {} }); };

// uit: gewoon ingedrukt houden
toets('keydown', 'Shift'); ok(inp.isDown('shift'), 'uit: Shift ingedrukt telt'); toets('keyup', 'Shift'); ok(!inp.isDown('shift'), 'uit: loslaten stopt het rennen');
muis('mousedown', 2); ok(inp.mouse.rightDown, 'uit: richten ingedrukt'); muis('mouseup', 2); ok(!inp.mouse.rightDown, 'uit: loslaten stopt het richten');

// rennen
S.setSetting('tikStand', 'rennen');
toets('keydown', 'Shift'); toets('keyup', 'Shift');
ok(inp.isDown('shift'), 'rennen: na een tik en loslaten blijft het rennen aan');
inp.endFrame(); ok(inp.isDown('shift'), 'rennen: blijft over beelden heen aan');
toets('keydown', 'Shift'); ok(!inp.isDown('shift'), 'rennen: een tweede tik zet uit');
toets('keyup', 'Shift');
toets('keydown', 'Shift'); toets('keyup', 'Shift'); ok(inp.isDown('shift'), 'rennen: opnieuw aan');
inp.latchOk = () => false; inp.endFrame();
ok(!inp.isDown('shift'), 'rennen: een voertuig of menu wist de stand');
toets('keydown', 'Shift'); ok(inp.isDown('shift'), 'in een voertuig geldt gewoon ingedrukt houden (handrem)'); toets('keyup', 'Shift'); ok(!inp.isDown('shift'), 'en loslaten stopt het');
muis('mousedown', 2); muis('mouseup', 2); ok(!inp.mouse.rightDown, 'rennen laat het richten ongemoeid (uit)');
inp.latchOk = () => true; inp.endFrame();

// richten
S.setSetting('tikStand', 'richten');
muis('mousedown', 2); muis('mouseup', 2);
ok(inp.mouse.rightDown, 'richten: een tik houdt het richten vast');
inp.setAim(true); ok(!inp.mouse.rightDown, 'richten: een tweede tik (ook van de controller) zet uit'); inp.setAim(false);
inp.setAim(true); inp.setAim(false); ok(inp.mouse.rightDown, 'richten: opnieuw aan');
inp.latchOk = () => false; inp.endFrame(); ok(!inp.mouse.rightDown, 'richten: een menu of voertuig wist de stand');
inp.latchOk = () => true; inp.endFrame();
toets('keydown', 'Shift'); toets('keyup', 'Shift'); ok(!inp.isDown('shift'), 'richten laat het rennen ongemoeid (uit)');

// terug naar uit wist wat aan stond
inp.setAim(true); ok(inp.mouse.rightDown, 'weer aan');
S.setSetting('tikStand', 'uit'); ok(!inp.mouse.rightDown, 'de optie uitzetten wist het vastgehouden richten');
S.setSetting('tikStand', 'beide');
toets('keydown', 'Shift'); toets('keyup', 'Shift'); muis('mousedown', 2); muis('mouseup', 2);
ok(inp.isDown('shift') && inp.mouse.rightDown, 'beide: rennen en richten blijven aan');
inp.reset(); // het venster verliest de focus
S.setSetting('tikStand', 'uit'); ok(!inp.isDown('shift') && !inp.mouse.rightDown, 'uit na beide: alles los');

console.log(`holdlatch_test: ${n} controles ok`);
process.exit(0);
