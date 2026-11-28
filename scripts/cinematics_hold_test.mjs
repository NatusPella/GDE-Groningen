// Overslaan met een verse toetsdruk (#1341, besluit eigenaar 28-11): één losse druk op Spatie slaat precies één scène over. Een
// vastgehouden toets (keydown met repeat:true, of herhalingen zonder keyup ertussen) doet niets, slaat nooit meerdere scènes of
// de missie over, ook niet als er een nieuwe scène begint terwijl de toets nog omlaag is: eerst loslaten, dan telt hij weer.
//   GDE_VENDOR_CACHE=<vendor-cache> node scripts/cinematics_hold_test.mjs
import './node3d.mjs';

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info !== '' ? ` (${info})` : ''}`); } };

// --- een DOM-model dat klassen en kinderen bijhoudt
const cls = () => { const s = new Set(); return { s, toggle: (c, f) => { if (f === undefined ? !s.has(c) : f) s.add(c); else s.delete(c); }, add: (...c) => c.forEach((x) => s.add(x)), remove: (...c) => c.forEach((x) => s.delete(x)), contains: (c) => s.has(c) }; };
const mkEl = () => {
  const kids = new Map();
  const el = { classList: cls(), style: { setProperty() {}, removeProperty() {} }, dataset: {}, children: [], hidden: false, textContent: '', _html: '', setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1, height: 1 }) };
  el.querySelector = (sel) => { if (!kids.has(sel)) kids.set(sel, mkEl()); return kids.get(sel); };
  el.querySelectorAll = () => [];
  Object.defineProperty(el, 'innerHTML', { get() { return this._html; }, set(v) { this._html = v; } });
  return el;
};
const body = mkEl();
const doc = globalThis.document;
doc.body = body;
doc.createElement = () => mkEl();
doc.getElementById = () => null;
const winL = { keydown: [], keyup: [], blur: [] };
globalThis.addEventListener = (t, f) => { (winL[t] || (winL[t] = [])).push(f); };
const key = (type, o = {}) => { const e = { key: ' ', repeat: false, defaultPrevented: false, preventDefault() {}, stopImmediatePropagation() {}, ...o }; for (const f of winL[type] || []) f(e); };

const C = await import('../game/js/cinematics.js');
const { default: players } = { default: null };

// --- een minimale wereld
const speler = { x: 0, y: 0, angle: 0, inVehicle: null };
const w = {
  time: 100, wanted: 0, vehicles: [], onRespawn: [], paused: false, uiPaused: false, timeScale: 1, players: [speler], player: speler,
  input: { wasPressed: () => false, isDown: () => false }, addMessage() {}, cameraOverride: null, clock: 12,
};
// hoofdspeler(w) leest het eigen lichaam; zet de gangbare velden
w.me = speler; w.localPlayer = speler; w.localId = 0; w.map = { meta: { landmarks: [] }, buildingsNear: () => [], heightAt: () => 0, surfaceAt: () => 0 }; w.districts = []; w.messages = [];

let nu = 1000;
globalThis.performance = { now: () => nu };
body.classList.add('game-started');


const eindes = new Map();

const scene = (id, extra = {}) => ({ id, priority: 2, duration: 40, skippable: true, pause: true, onEnd: (skipped) => { eindes.set(id, skipped ? 'overgeslagen' : 'klaar'); }, ...extra });
const tik = (s) => { for (let t = 0; t < s; t += 0.05) { nu += 50; C.updateCinematics(0.05, w); } };
const reset = () => { C.skipAllCinematics(); eindes.clear(); key('keyup'); key('blur'); w.paused = false; nu += 1000; C.updateCinematics(0.016, w); };
// houdt de toets `s` seconden vast: herhalingen na een halve seconde, met repeat:true (toetsenbord) of zonder (een herhaling zonder keyup)
function houd(s, { markeer = true } = {}) {
  for (let t = 0; t < s; t += 0.033) {
    nu += 33; C.updateCinematics(0.033, w);
    if (t > 0.5) key('keydown', { repeat: markeer });
  }
}
C.setOpeningDueProbe(() => true); // zonder de vlucht-in van een nieuw spel: die zou een testscène vervangen
C.updateCinematics(0.016, w);

// 1. één losse druk slaat precies één scène over, de volgende uit de wachtrij blijft staan
{
  reset();
  C.playCinematic(scene('a')); C.playCinematic(scene('b', { queue: true })); C.playCinematic(scene('c', { queue: true }));
  tik(1);
  key('keydown'); tik(0.2);
  ok(eindes.get('a') === 'overgeslagen', 'één verse druk slaat de eerste scène direct over', String(eindes.get('a')));
  ok(C.isCinematicActive('b') && !eindes.has('b'), 'de tweede scène blijft staan');
  key('keyup'); tik(1);
  ok(C.isCinematicActive('b') && !eindes.has('b'), 'ook na het loslaten');
}

// 2. een vastgehouden toets met herhalingen slaat niets over, door meerdere scènes heen
for (const markeer of [true, false]) {
  reset();
  C.playCinematic(scene('a')); C.playCinematic(scene('b', { queue: true })); C.playCinematic(scene('c', { queue: true }));
  tik(1);
  key('keydown'); tik(0.2); // de verse druk: a weg
  houd(8, { markeer }); // daarna vasthouden, met of zonder repeat-vlag
  const naam = markeer ? 'met repeat:true' : 'herhalingen zonder keyup';
  ok(eindes.get('a') === 'overgeslagen', `a is door de verse druk overgeslagen (${naam})`);
  ok(C.isCinematicActive('b') && !eindes.has('b') && !eindes.has('c'), `vasthouden slaat b en c niet over (${naam})`);
  key('keyup'); tik(0.3);
  ok(C.isCinematicActive('b'), 'na het loslaten is b er nog');
  key('keydown'); tik(0.2); key('keyup');
  ok(eindes.get('b') === 'overgeslagen' && C.isCinematicActive('c'), `een nieuwe druk slaat b over, c blijft (${naam})`);
}

// 3. een scène die begint terwijl de toets nog omlaag is wordt niet overgeslagen; eerst loslaten
{
  reset();
  C.playCinematic(scene('a')); tik(1);
  key('keydown'); tik(0.2);
  C.playCinematic(scene('b')); // los gestart terwijl de spatie nog omlaag is
  tik(1); key('keydown', { repeat: true }); houd(5);
  ok(C.isCinematicActive('b') && !eindes.has('b'), 'een scène die later begint wordt niet overgeslagen terwijl de toets omlaag is');
  key('keydown'); tik(0.3); // een tweede keydown zonder keyup ertussen (repeat-vlag kwijt) telt niet
  ok(C.isCinematicActive('b') && !eindes.has('b'), 'een tweede keydown zonder keyup telt niet als verse druk');
  key('keyup'); tik(0.2);
  key('keydown'); tik(0.2); key('keyup');
  ok(eindes.get('b') === 'overgeslagen', 'na loslaten en opnieuw drukken wel');
}

// 4. een toets van vóór de scène (handrem): hij slaat niets over, ook niet na de herhalingen
{
  reset();
  key('keydown'); // geen scène actief: gaat naar het spel
  tik(0.2);
  C.playCinematic(scene('a'));
  houd(4);
  ok(C.isCinematicActive('a') && !eindes.has('a'), 'een toets van vóór de scène slaat niets over');
  key('keyup'); tik(0.2);
  key('keydown'); tik(0.2); key('keyup');
  ok(eindes.get('a') === 'overgeslagen', 'na loslaten werkt een verse druk');
}

// 5. een vervangende scène (hogere prioriteit) onder dezelfde toets blijft staan
{
  reset();
  C.playCinematic(scene('a')); tik(1);
  key('keydown'); tik(0.2);
  C.playCinematic(scene('b', { priority: 5 }));
  houd(4);
  ok(C.isCinematicActive('b') && !eindes.has('b'), 'een vervangende scène blijft staan onder dezelfde toets');
  key('keyup');
}

// 6. een druk in de eerste kwart seconde slaat niet over (de scène moet eerst even zichtbaar zijn)
{
  reset();
  C.playCinematic(scene('a'));
  key('keydown'); tik(0.1);
  ok(C.isCinematicActive('a'), 'een druk in de eerste 0,25 s slaat niet over');
  key('keyup');
}

reset();
console.log(`cinematics_hold_test: ${n} controles, ${fails} fouten`);
process.exit(fails ? 1 : 0);
