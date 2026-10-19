// Het actieve invoerapparaat (#151, #200).  node scripts/inputdevice_test.mjs
import * as D from '../game/js/inputdevice.js';
let fails = 0;
const ok = (c, n, x) => { if (!c) { fails++; console.log('FAIL', n, x !== undefined ? JSON.stringify(x) : ''); } };

// beslisregel
ok(D.deviceFor({ type: 'key', trusted: true }) === 'kb', 'echte toets = toetsenbord');
ok(D.deviceFor({ type: 'key', trusted: true, synthetic: true }) === null, 'toets van het pad telt niet als toetsenbord');
ok(D.deviceFor({ type: 'key', trusted: false }) === null, 'niet-vertrouwde toets telt niet');
ok(D.deviceFor({ type: 'move', trusted: true, dist: 2 }) === null, 'muisrimpel telt niet');
ok(D.deviceFor({ type: 'move', trusted: true, dist: 30 }) === 'kb', 'echte muisbeweging');
ok(D.deviceFor({ type: 'mouse', trusted: true, pointerType: 'touch' }) === 'touch', 'aanraking als muisklik is aanraking');
ok(D.deviceFor({ type: 'pad' }) === 'pad' && D.deviceFor({ type: 'touch' }) === 'touch', 'pad en touch');
ok(D.deviceFor(null) === null && D.deviceFor({ type: 'onbekend', trusted: true }) === null, 'onbekend');

// glue met een nepvenster
class Target extends EventTarget {}
const win = new Target();
const classes = new Set();
const doc = { documentElement: { dataset: {}, classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) } } };
D._resetForTest();
D.initInputDevice(win, doc);
const fire = (type, props = {}) => { const e = new Event(type); Object.defineProperty(e, 'isTrusted', { value: props.trusted !== false }); Object.assign(e, props); win.dispatchEvent(e); };
const seen = [];
D.onDeviceChange((d) => seen.push(d));
ok(D.getDevice() === 'kb' && classes.has('dev-kb') && doc.documentElement.dataset.device === 'kb', 'begint met toetsenbord');
D.noteDevice('pad');
ok(D.getDevice() === 'pad' && classes.has('dev-pad') && !classes.has('dev-kb'), 'controller zet dev-pad');
// het pad stuurt zelf synthetische toetsen: die brengen de hints niet terug
fire('keydown', { trusted: false, __gde: 'pad' });
fire('keydown', { __gde: 'pad' });
ok(D.getDevice() === 'pad', 'padtoets blijft pad');
fire('mousemove', { movementX: 1, movementY: 1 });
ok(D.getDevice() === 'pad', 'muisrimpel blijft pad');
fire('mousemove', { movementX: 20, movementY: 0 });
ok(D.getDevice() === 'kb' && classes.has('dev-kb'), 'echte muisbeweging wisselt naar toetsenbord');
D.noteDevice('pad');
fire('keydown');
ok(D.getDevice() === 'kb', 'echte toets wisselt naar toetsenbord');
fire('pointerdown', { pointerType: 'touch' });
ok(D.getDevice() === 'touch', 'tik wisselt naar aanraking');
fire('wheel');
ok(D.getDevice() === 'kb', 'scrollwiel is muis');
ok(seen.join() === 'pad,kb,pad,kb,touch,kb', 'meldingen in volgorde', seen);
ok(D.noteDevice('kb') === false, 'zelfde apparaat meldt niets');
ok(D.noteDevice('stuurwiel') === false, 'onbekend apparaat genegeerd');
if (fails) { console.log(fails + ' mislukt'); process.exit(1); }
console.log('inputdevice_test: ok');
