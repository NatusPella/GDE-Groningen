// Fuzz op de cinematics-toestandsmachine (QA, regie-verfijning 22-11): willekeurige reeksen van starten,
// vervangen, wachtrij, tikken, pauzeren, spatie vasthouden en overslaan; na elke stap gelden de
// invarianten die de speler voelt: geen vastgelopen pauze, geen blijvende HUD-verberging, geen tweede
// scène overgeslagen door dezelfde spatie, elke onEnd precies één keer.
//   GDE_VENDOR_CACHE=<vendor-cache> node scripts/cinematics_fuzz_test.mjs
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

const eindes = new Map(); // id -> aantal onEnd's
const tel = { natuurlijk: 0, overgeslagen: 0, vervangen: 0 };
let seq = 0;
function spec(rng) {
  const id = 'f' + (seq++);
  const dur = rng() < 0.06 ? (rng() < 0.5 ? undefined : NaN) : 0.4 + rng() * 14;
  const d0 = Number.isFinite(dur) ? dur : 3;
  const lines = rng() < 0.7 ? Array.from({ length: 1 + Math.floor(rng() * 4) }, (_, i) => ({ speaker: 'tammo', text: 'Regel ' + i, at: i * (d0 / 5), dur: d0 / 6 })) : null;
  const s = {
    id, priority: 1 + Math.floor(rng() * 5), duration: dur, pause: rng() < 0.6, hideHud: rng() < 0.6, skippable: rng() < 0.85, letterbox: rng() < 0.7,
    timeScale: rng() < 0.2 ? [0.3, 0, -1, NaN, 2][Math.floor(rng() * 5)] : 1, hidePlayers: rng() < 0.3, queue: rng() < 0.4, lines,
    onEnd: (skipped, replaced) => { eindes.set(id, (eindes.get(id) || 0) + 1); tel[replaced ? 'vervangen' : skipped ? 'overgeslagen' : 'natuurlijk']++; },
  };
  if (rng() < 0.08 && s.lines) s.lines.push({ speaker: 'tammo', text: undefined, at: NaN, dur: NaN }, null);
  if (rng() < 0.1) s.shot = () => { throw new Error('kapotte shot'); };
  else if (rng() < 0.08) s.shot = () => ({ position: { x: NaN, y: 5, z: 3 }, lookAt: { x: 0, y: 0, z: 1 }, fov: 50 });
  else if (rng() < 0.5) s.shot = (u, t) => ({ position: { x: 10 + t, y: 5, z: 3 }, lookAt: { x: 0, y: 0, z: 1 }, fov: 50 });
  return s;
}

// kleine deterministische RNG
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const origErr = console.error, origWarn = console.warn;
console.error = () => {}; console.warn = () => {};

C.updateCinematics(0.016, w); // initialiseert de UI
const holds = []; // spatie-stand voor de F8-controle
let spaceDown = false;

function invarianten(stap) {
  const actief = C.isCinematicActive();
  if (!actief) {
    ok(w.uiPaused === false, 'zonder scène staat de wereld niet op pauze', stap);
    ok(w.cinematicPause === false || w.cinematicPause === undefined, 'zonder scène is de eigen pauzevlag uit', stap);
    ok(!body.classList.contains('cine-hide-hud'), 'zonder scène is de HUD terug', stap);
  }
  ok(Number.isFinite(w.timeScale) && w.timeScale > 0 && w.timeScale <= 1, 'timeScale blijft geldig', String(w.timeScale));
  for (const [id, k] of eindes) ok(k === 1, 'elke scène meldt zich precies één keer klaar', `${id} x${k}`);
}

for (let seed = 1; seed <= 60; seed++) {
  const rng = mulberry(seed * 7919);
  C.skipAllCinematics(); eindes.clear();
  spaceDown = false; key('keyup');
  w.paused = false; w.uiPaused = false;
  for (let i = 0; i < 160; i++) {
    const r = rng();
    const stap = `seed ${seed} stap ${i}`;
    if (r < 0.16) C.playCinematic(spec(rng));
    else if (r < 0.62) { const dt = rng() * 0.2; nu += dt * 1000; C.updateCinematics(dt, w); }
    else if (r < 0.72) { if (!spaceDown) { key('keydown'); spaceDown = true; } else key('keydown', { repeat: true }); }
    else if (r < 0.82) { if (spaceDown) { key('keyup'); spaceDown = false; } }
    else if (r < 0.86) C.skipCinematic();
    else if (r < 0.88) { C.skipAllCinematics(); }
    else if (r < 0.92) { w.paused = !w.paused; }
    else if (r < 0.94) key('blur');
    else { const dt = 0.5 + rng() * 1.5; nu += dt * 1000; for (let k = 0; k < 4; k++) C.updateCinematics(dt / 4, w); }
    invarianten(stap);
  }
  C.skipAllCinematics();
  w.paused = false;
  C.updateCinematics(0.016, w);
  invarianten(`seed ${seed} einde`);
}

// --- één spatiehold slaat nooit twee scènes over (F8)
{
  C.skipAllCinematics(); eindes.clear(); w.paused = false; spaceDown = false; key('keyup');
  const a = { id: 'hold-a', priority: 2, duration: 30, skippable: true, pause: true, queue: true, onEnd: (s) => { eindes.set('hold-a', (eindes.get('hold-a') || 0) + 1); } };
  const b = { id: 'hold-b', priority: 2, duration: 30, skippable: true, pause: true, queue: true, onEnd: (s) => { eindes.set('hold-b', (eindes.get('hold-b') || 0) + 1); } };
  C.playCinematic(a); C.playCinematic(b);
  nu += 500; C.updateCinematics(0.5, w);
  key('keydown');
  for (let i = 0; i < 40; i++) { nu += 100; C.updateCinematics(0.1, w); }
  ok(eindes.get('hold-a') === 1, 'een vastgehouden spatie slaat de eerste scène over');
  ok(!eindes.get('hold-b') && C.isCinematicActive('hold-b'), 'dezelfde hold slaat de tweede scène niet over');
  key('keyup');
}

// een scène zonder geldige duur eindigt vanzelf (geen eeuwige pauze)
{
  C.skipAllCinematics(); eindes.clear(); w.paused = false;
  C.playCinematic({ id: 'zonder-duur', priority: 2, duration: undefined, pause: true, onEnd: () => { eindes.set('zonder-duur', 1); } });
  for (let i = 0; i < 80; i++) { nu += 100; C.updateCinematics(0.1, w); }
  ok(!C.isCinematicActive('zonder-duur') && eindes.get('zonder-duur') === 1 && w.uiPaused === false, 'een scène zonder duur loopt na de standaardduur af en geeft de wereld terug');
}

// een kapot tempo- of tijdbericht van de gastheer (NaN) laat de scène van de gast niet eeuwig staan
{
  C.skipAllCinematics(); eindes.clear(); w.paused = false;
  C.playCinematic({ id: 'nan-tempo', priority: 2, duration: 2, pause: true, onEnd: () => { eindes.set('nan-tempo', 1); } });
  C.setCinematicRate(NaN); C.setCinematicTime(NaN); C.setCinematicRate(Infinity);
  for (let i = 0; i < 60; i++) { nu += 100; C.updateCinematics(0.1, w); }
  ok(!C.isCinematicActive('nan-tempo') && eindes.get('nan-tempo') === 1, 'NaN-tempo of NaN-tijd houdt de scène niet vast');
}

console.error = origErr; console.warn = origWarn;
ok(tel.natuurlijk > 20 && tel.overgeslagen > 50 && tel.vervangen > 10, 'de fuzz raakt alle drie de eindes', JSON.stringify(tel));
console.log(`cinematics_fuzz_test: ${n} controles, ${fails} fouten`);
process.exit(fails ? 1 : 0);
