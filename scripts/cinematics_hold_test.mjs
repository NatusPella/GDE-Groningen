// Vastgehouden spatie bij cutscenes (#1341): een speler die de spatie VASTHOUDT (één verse keydown, na een halve seconde elke
// ~33 ms een keydown met repeat:true) slaat precies de scène over waarop hij begon te drukken, nooit een volgende scène
// (wachtrij, een scène die later begint terwijl de toets nog omlaag is) en nooit meer dan één stap van een missie.
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
// houdt de spatie `s` seconden vast zoals het toetsenbord het doet: één keydown, na 0,5 s herhalingen
function houd(s, { alsEerste = true } = {}) {
  if (alsEerste) key('keydown');
  for (let t = 0; t < s; t += 0.033) {
    nu += 33; C.updateCinematics(0.033, w);
    if (t > 0.5) key('keydown', { repeat: true });
  }
}

C.setOpeningDueProbe(() => true); // zonder de vlucht-in van een nieuw spel: die zou een testscène vervangen
C.updateCinematics(0.016, w);

// 1. wachtrij: de hold slaat de eerste over, de tweede en derde blijven staan zolang de toets omlaag is
{
  reset();
  C.playCinematic(scene('a')); C.playCinematic(scene('b', { queue: true })); C.playCinematic(scene('c', { queue: true }));
  tik(1);
  houd(6);
  ok(eindes.get('a') === 'overgeslagen', 'de eerste scène is overgeslagen', String(eindes.get('a')));
  ok(!eindes.has('b') && C.isCinematicActive('b'), 'de tweede scène speelt door onder dezelfde hold', JSON.stringify([...eindes]) + ' actief=' + (C.cinematicState() && C.cinematicState().id));
  key('keyup');
  tik(1);
  ok(C.isCinematicActive('b') && !eindes.has('b'), 'na het loslaten speelt de tweede scène nog steeds');
}

// 2. een scène die begint terwijl de toets nog omlaag is wordt niet overgeslagen door de herhalingen
{
  reset();
  C.playCinematic(scene('a')); tik(1);
  key('keydown');
  houd(2, { alsEerste: false }); // 1,7 s: a is al overgeslagen
  ok(eindes.get('a') === 'overgeslagen', 'a is overgeslagen');
  C.playCinematic(scene('b')); // los gestart, geen wachtrij, terwijl de spatie nog omlaag is
  houd(5, { alsEerste: false });
  ok(C.isCinematicActive('b') && !eindes.has('b'), 'een scène die later begint wordt niet door dezelfde hold overgeslagen');
  key('keyup');
  tik(0.5);
  // een tweede, verse druk slaat b wel over
  key('keydown'); houd(2, { alsEerste: false }); key('keyup');
  ok(eindes.get('b') === 'overgeslagen', 'een nieuwe druk slaat de tweede scène wel over');
}

// 3. de toets was al omlaag vóór de scène (handrem): de herhalingen slaan niets over en worden niet doorgeslikt als skip
{
  reset();
  key('keydown'); // geen scène actief: gaat naar het spel
  tik(0.2);
  C.playCinematic(scene('a'));
  houd(4, { alsEerste: false });
  ok(C.isCinematicActive('a') && !eindes.has('a'), 'herhalingen van een toets van vóór de scène slaan niets over');
  key('keyup');
}

// 4. de hold slaat precies één scène over, ook als de volgende scène een hogere prioriteit heeft en de eerste vervangt
{
  reset();
  C.playCinematic(scene('a')); tik(1);
  key('keydown');
  houd(0.7, { alsEerste: false });
  C.playCinematic(scene('b', { priority: 5 })); // vervangt a
  houd(4, { alsEerste: false });
  ok(C.isCinematicActive('b') && !eindes.has('b'), 'een vervangende scène blijft staan onder dezelfde hold');
  key('keyup');
}

reset();
console.log(`cinematics_hold_test: ${n} controles, ${fails} fouten`);
process.exit(fails ? 1 : 0);
