// Pitch & putt in de speellus (#453), echt gedraaid in node met een eigen THREE-scene en een nep-DOM: de rollende bal met events en
// geluiden, het water met strafslag, het bord met scorebord en iconen, en pass-and-play met meer spelers. Zonder de gevendorde three.js (cd desktop && npm run stage) slaat de test zichzelf over.
//   node scripts/pitchputt_run_test.mjs        (GDE_NODE3D=<pad naar node3d.mjs> voor een andere kopie van de lader)
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

let THREE = null;
try {
  await import(process.env.GDE_NODE3D || './node3d.mjs');
  THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
} catch (e) {
  console.log('SKIP pitchputt_run_test.mjs:', String(e.message).split('\n')[0]);
  process.exit(0);
}

// scene3d.js maakt zijn scène pas bij init3D (WebGL): de test zet er een eigen neer
registerHooks({
  load(url, ctx, next) {
    const r = next(url, ctx);
    if (/\/game\/js\/scene3d\.js$/.test(url)) return { ...r, source: String(r.source) + '\nexport function __zetScene(s) { scene = s; }\n', shortCircuit: true };
    return r;
  },
});

// een nep-DOM waarin het bord zijn tekst kwijt kan en de test hem terug kan lezen
const noop = () => {};
const nepEl = () => {
  const e = {
    style: { setProperty: noop }, hidden: false, innerHTML: '', textContent: '', dataset: {}, children: [], _q: {},
    classList: { toggle: noop, add: noop, remove: noop, contains: () => false },
    appendChild: noop, addEventListener: noop, removeEventListener: noop, remove: noop, setAttribute: noop, querySelectorAll: () => [],
    querySelector(sel) { return this._q[sel] || (this._q[sel] = nepEl()); },
  };
  return e;
};
const origCreate = document.createElement;
document.createElement = (tag) => (tag === 'canvas' ? origCreate(tag) : nepEl());
document.body = nepEl();
document.getElementById = () => null;
let boards = [];
const origDiv = document.createElement;
document.createElement = (tag) => { const e = origDiv(tag); if (tag === 'div') boards.push(e); return e; };

const root = new URL('../game/js/', import.meta.url).href;
const sc = await import(root + 'scene3d.js');
sc.__zetScene(new THREE.Scene());
const PP = await import(root + 'puttinglogic.js');
const { PITCHPUTT } = await import(root + 'pitchputt.js');

let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };

// --- een nep-wereld ---
const keys = new Set(), was = new Set();
const input = { keys, padKeys: new Set(), stil: 0, isDown: (k) => keys.has(k), wasPressed: (k) => was.has(k), consume: (k) => was.delete(k), blocked: false };
const msgs = [];
function maakWereld(extra = {}) {
  return {
    player: { x: 0, y: 0, angle: 0, speed: 0, moving: false, vx: 0, vy: 0, z: 0, inVehicle: null, swimming: false, exitVehicle: noop },
    map: { surfaceAt: () => ({ z: 0 }) }, input, addMessage: (m) => msgs.push(m), time: 0, audioEvents: [], extraSpeakers: [], companionHold: null,
    cameraOverride: null, pigeonMode: false, heliRun: false, ...extra,
  };
}
let w = maakWereld();
PITCHPUTT.init(w);
const dbg = window.__pitchputt;
const frame = (dt = 1 / 60, k = 1) => { for (let i = 0; i < k; i++) { w.time += dt; was.clear(); PITCHPUTT.update(dt, w); PITCHPUTT.tick(dt, w); } };
const bordTekst = () => { const b = boards.find((x) => x._q['.mg-row']); return b ? { row: b._q['.mg-row'].innerHTML, extra: b._q['.mg-extra'].innerHTML, flash: b._q['.mg-flash'].textContent, help: b._q['.mg-help'].innerHTML, meterT: b._q['.mg-meter-t'].textContent, cells: b._q['.mg-cells'].innerHTML } : null; };
const wachtOp = (f, max = 60 * 90) => { let i = 0; while (!f() && i++ < max) frame(); return i < max; };
const golfSubs = () => w.audioEvents.filter((e) => e.kind === 'golf').map((e) => e.sub);
const schiet = (frames) => { keys.add(' '); frame(1 / 60, frames); keys.delete(' '); frame(); };

// --- eenspeler: een slag rolt met geluiden ---
{
  ok(dbg.start(true), 'de ronde start');
  frame(1 / 60, 3);
  let b = bordTekst();
  ok(b && /Baan <b>1<\/b>\/6/.test(b.row) && /gf-ic/.test(b.row) && /Wedge/.test(b.row), 'het bord toont baan, iconen en stok: ' + (b && b.row));
  const bordRoot = boards.find((x) => x._q['.mg-row']);
  ok(bordRoot && /mg-ic/.test(bordRoot.innerHTML) && /PITCH &amp; PUTT|PITCH & PUTT/.test(bordRoot.innerHTML) && bordRoot.dataset.mg === 'pitchputt', 'het bord draagt het thema van pitch & putt (#453)');
  ok(/mg-cells|<i/.test(b.cells) || b.cells !== '', 'één speler: de cellen van de scorekaart');
  ok(b.extra === '', 'één speler: geen scorebord per speler');
  ok(dbg.state().phase === 'aim' && dbg.state().mode === 'pitch', 'richten, met de wedge');
  keys.add(' '); frame(1 / 60, 20);
  b = bordTekst();
  ok(/^\d+%$/.test(b.meterT) && +b.meterT.replace('%', '') > 10, `de krachtbalk toont een getal: ${b.meterT}`);
  const pv = w.audioEvents.length;
  keys.delete(' '); frame();
  ok(dbg.state().phase === 'ball', 'loslaten slaat de bal');
  ok(wachtOp(() => dbg.state() && dbg.state().phase !== 'ball'), 'de bal komt tot rust');
  const subs = golfSubs();
  ok(subs.includes('slag') && subs.includes('stuiter'), `slag en stuiter klinken: ${subs.slice(0, 8)}`);
  ok(w.audioEvents.every((e) => e.kind !== 'golf' || (Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.strength))), 'de events zijn eindig');
  void pv;
  ok(dbg.state().strokes === 1, 'één slag geteld');
  // op de green: een putt rolt (rol-geluid) en kan vallen
  wachtOp(() => dbg.state().phase === 'aim', 600);
  dbg.quit();
  ok(dbg.state() === null, 'stoppen ruimt op');
}

// --- water: strafslag en de bal gaat terug ---
{
  w.audioEvents.length = 0;
  dbg.start(true); frame(1 / 60, 3);
  dbg.goto(3);
  const h = dbg.holes()[3], vijver = h.water[0];
  const cup = h.cup, hd = Math.atan2(cup.y - h.tee.y, cup.x - h.tee.x);
  const van = { x: vijver.x - Math.cos(hd) * 40, y: vijver.y - Math.sin(hd) * 40 };
  frame(); ok(dbg.zet(van.x, van.y), 'de bal ligt 40 m voor de vijver');
  const yaw = Math.atan2(vijver.y - van.y, vijver.x - van.x);
  ok(dbg.shoot(PP.powerForCarry(40), { yaw }), 'slag naar de vijver');
  ok(wachtOp(() => dbg.state().phase !== 'ball'), 'de bal komt tot rust');
  ok(golfSubs().includes('plons'), 'plons klinkt');
  const st = dbg.state();
  ok(st.strokes === 2, `slag plus strafslag: ${st.strokes}`);
  ok(Math.hypot(st.lie.x - van.x, st.lie.y - van.y) < 1e-6, 'de bal ligt weer waar je sloeg');
  const b = bordTekst();
  ok(/Plons/.test(b.flash), 'het bord zegt het: ' + b.flash);
  wachtOp(() => dbg.state().phase === 'aim', 600);
  ok(dbg.state().phase === 'aim' && /Slag <b>3<\/b>/.test(bordTekst().row), 'daarna slag 3');
  dbg.quit();
}

// --- pass-and-play: [2] maakt er twee spelers van, om de beurt op dit scherm (zonder gasten, #453) ---
{
  w = maakWereld();
  PITCHPUTT.init(w);
  ok(window.__pitchputt.start(true), 'de ronde start');
  frame(1 / 60, 3);
  was.add('2'); PITCHPUTT.update(1 / 60, w); was.clear(); frame(1 / 60, 2);
  let b = bordTekst();
  ok(/gf-score/.test(b.extra) && /Speler 1/.test(b.extra) && /Speler 2/.test(b.extra), 'het scorebord toont beide spelers: ' + b.extra.slice(0, 80));
  ok(/gf-wie/.test(b.row) && /Speler 1/.test(b.row), 'de rij toont wie aan de beurt is');
  ok(b.cells === '' || b.cells === undefined || b.cells === null, 'met meer spelers geen losse cellen');
  schiet(40);
  ok(window.__pitchputt.state().phase === 'ball', 'speler 1 slaat');
  ok(wachtOp(() => window.__pitchputt.state().phase === 'aim', 60 * 60), 'de bal ligt en de volgende is aan de beurt');
  ok(/gf-wie/.test(bordTekst().row), 'de rij blijft de speler noemen');
  window.__pitchputt.quit();
  ok(window.__pitchputt.state() === null, 'stoppen ruimt op');
}

console.log(`pitchputt_run_test ok (${n} controles)`);
