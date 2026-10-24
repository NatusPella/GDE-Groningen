// De camera's van de kermis (kermis.js: de botsauto's) en het reuzenrad (reuzenrad.js) rekken per seconde in
// plaats van per beeld (#436, dezelfde klasse als de treincamera): de rit ruimt netjes op, de camera volgt de
// auto of de gondel, en met een toets die het mikpunt laat bewegen (het rondkijken in het rad) is de stand na
// dezelfde verstreken tijd gelijk op 30 en op 120 beelden per seconde.
//   node scripts/kermis_camera_test.mjs     (zonder de gevendorde three.js slaat de test zichzelf over)
import './node3d.mjs';
import fs from 'node:fs';
import { registerHooks } from 'node:module';

let THREE = null;
try {
  THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
} catch (e) {
  console.log('SKIP kermis_camera_test.mjs:', String(e.message).split('\n')[0]);
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

// een nep-DOM waarin het bord zijn tekst kwijt kan
const noop = () => {};
const nepEl = () => {
  const e = {
    style: { setProperty: noop }, hidden: false, innerHTML: '', textContent: '', dataset: {}, children: [], _q: {},
    classList: { list: new Set(), toggle(c) { this.list.has(c) ? this.list.delete(c) : this.list.add(c); }, add(...c) { c.forEach((x) => this.list.add(x)); }, remove(...c) { c.forEach((x) => this.list.delete(x)); }, contains(c) { return this.list.has(c); } },
    appendChild: noop, addEventListener: noop, removeEventListener: noop, remove: noop, setAttribute: noop, querySelectorAll: () => [],
    querySelector(sel) { return this._q[sel] || (this._q[sel] = nepEl()); },
  };
  return e;
};
const origCreate = document.createElement;
document.createElement = (tag) => (tag === 'canvas' ? origCreate(tag) : nepEl());
document.body = nepEl();
document.head = nepEl();
document.getElementById = () => null;

const root = new URL('../game/js/', import.meta.url).href;
const sc = await import(root + 'scene3d.js');
const scene = new THREE.Scene();
sc.__zetScene(scene);
const K = await import(root + 'kermis.js');
const H = await import(root + 'reuzenrad.js');
const W = await import(root + 'reuzenradrules.js');

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
const near = (a, b, e) => Math.abs(a - b) <= e;

const keys = new Set(), was = new Set();
const input = { keys, isDown: (k) => keys.has(k), wasPressed: (k) => was.has(k), consume: (k) => was.delete(k), mouse: { dx: 0, dy: 0 } };
const berichten = [];
function wereld() {
  return {
    time: 0, clock: 21.5, money: 100, input, extraSpeakers: [], audioEvents: [], berichten,
    player: { x: 0, y: 0, z: 0, angle: 0, speed: 0, moving: false, inVehicle: null, swimming: false, character: 'tammo', dead: false, exitVehicle: noop },
    map: { reservedAt: null }, dayNight: { night: 0.8 }, flavour: { day: 3 },
    addMessage(t) { berichten.push(t); }, exitVehicle() {},
    pendingRespawn: false, cameraOverride: null, cinematicHidePlayers: false, minigameUntil: 0,
  };
}
// één beeld van de kermis, zoals main.js het doet: eerst de wereld (tick), dan de rit (update), dan de camera
const beeld = (w, dt, toetsen = []) => {
  w.time += dt; was.clear();
  for (const k of toetsen) { was.add(k); keys.add(k); }
  K.KERMIS.tick(dt, w);
  K.KERMIS.update(dt, w);
  K.KERMIS.camera(w);
  for (const k of toetsen) keys.delete(k);
};
// de kermis er helemaal neerzetten (tent, rad en de hele menigte) met de speler al op zijn plek
const bouwKermis = (w, x, y) => {
  K.KERMIS.init(w);
  H.HOOGVLIEGER.init(w);
  w.player.x = x; w.player.y = y;
  for (let i = 0; i < 40; i++) K.KERMIS.tick(0.6, w);
};

// --- de botsauto's: betalen, rijden, en met Backspace eruit; daarna is alles weer schoon ---
{
  const w = wereld();
  const stand = K.KERMIS.spots()[0];
  bouwKermis(w, stand.x, stand.y);
  const kinderen = scene.children.length;
  ok(K.KERMIS.interact(w), 'je kunt een kaartje kopen');
  ok(w.money === 97, 'één keer betaald: ' + w.money);
  for (let i = 0; i < 60; i++) beeld(w, 1 / 60);
  ok(scene.children.length > kinderen, 'de auto\'s met rijders staan in de scène');
  const cam = w.cameraOverride;
  ok(!!cam && cam.position.z > 3, 'de camera hangt boven de tent');
  const me = window.__kermis.state().me, mp = K.kermisFrame.toW(me.u, me.v);
  ok(Math.hypot(cam.lookAt.x - mp.x, cam.lookAt.y - mp.y) < 4, 'de camera kijkt naar je auto');
  beeld(w, 1 / 60, ['backspace']);
  ok(!K.KERMIS.active(), 'Backspace stopt de rit meteen');
  ok(scene.children.length === kinderen, 'na de rit staat de scène weer zoals ervoor: ' + scene.children.length + ' vs ' + kinderen);
  ok(w.cameraOverride === null && !w.cinematicHidePlayers, 'geen cameraklem of verstopte spelers meer');
  ok(!document.body.classList.contains('kermis-on'), 'de kermis-klasse is weg');
  ok(w.extraSpeakers.length === 0, 'de kermisbaas praat niet meer');
  ok(w.player.x === stand.x && w.player.y === stand.y, 'je staat weer bij de kassa');
  K.KERMIS.interact(w);
  ok(K.KERMIS.active() && w.money === 94, 'een tweede ritje kan en kost weer €3');
  K.KERMIS.quit(w);
  ok(!K.KERMIS.active(), 'de tweede rit stopt ook');
}

// --- het reuzenrad: instappen, rondkijken, en de camera rekent per seconde ---
// De twee metingen starten op een ander punt van het rad (de module houdt één rad bij), dus vergelijken we de
// *afstand tot het ideale beeld*: die is van de plek van het rad af te trekken en hoort op 30 en 120 fps gelijk
// te zijn na dezelfde verstreken tijd.
const rad = (fps, secs) => {
  const w = wereld();
  const load = H.HOOGVLIEGER.spots()[0];
  bouwKermis(w, load.x, load.y);
  // het rad draait in de tick: eerst naar een instapbare stand, daarna stil (de tick doet niets meer)
  let wacht = 0;
  while (!H.HOOGVLIEGER.prompt(w) && wacht++ < 400) K.KERMIS.tick(1 / 30, w);
  ok(wacht < 400, 'er komt een gondel langs de instap');
  ok(window.__hoogvlieger.board(), 'je stapt in het rad');
  H.HOOGVLIEGER.update(1 / fps, w); // de gondelpose
  H.HOOGVLIEGER.camera(w);
  const start = w.cameraOverride;
  // rondkijken met de pijltjes: het mikpunt beweegt, het rad staat stil -> alleen het rekenschuifje telt
  keys.add('arrowright');
  for (let i = 0; i < Math.round(fps * secs); i++) {
    w.time += 1 / fps;
    was.clear();
    H.HOOGVLIEGER.update(1 / fps, w);
    H.HOOGVLIEGER.camera(w);
  }
  keys.delete('arrowright');
  const cam = w.cameraOverride;
  // het ideale beeld volgens de regels (reuzenradrules.js), om de afstand tot de camera te meten
  const st = window.__hoogvlieger.state(), rot = K.kermisWheel().rot;
  const s = W.seatPose(st.index, rot), d = W.lookDir(st.look);
  const ver = K.kermisFrame.toW(s.u + d.u * 12, s.v + W.CAM_OUT + d.v * 12);
  const ideaal = { pos: { ...K.kermisFrame.toW(s.u, s.v + W.CAM_OUT), z: s.h + 1.0 }, at: { x: ver.x, y: ver.y, z: s.h + 1.0 + d.h * 12 } };
  H.HOOGVLIEGER.quit(w);
  return { w, start, cam, ideaal };
};
{
  const secs = 0.2;
  const a = rad(30, secs), b = rad(120, secs);
  ok(!!a.start && !!b.start, 'het rad heeft meteen een camera');
  ok(!!a.cam && !!b.cam, 'het rad heeft na een seconde nog een camera');
  const lag = (r, key, ideaalKey) => Math.hypot(r.cam[key].x - r.ideaal[ideaalKey].x, r.cam[key].y - r.ideaal[ideaalKey].y, (r.cam[key].z || 0) - (r.ideaal[ideaalKey].z || 0));
  // (een bewegend doel geeft altijd een klein verschil per beeld: het doel schuift tijdens het beeld door.
  //  Een kwart is ruim genoeg; per beeld rekenen gaf ruim drie keer zoveel achterstand op 30 fps.)
  const bijna = (a1, b1, marge = 0.25) => Math.abs(a1 - b1) <= Math.max(0.02, marge * Math.max(a1, b1));
  ok(bijna(lag(a, 'position', 'pos'), lag(b, 'position', 'pos')), `reuzenrad: de camera staat na ${secs} s even ver van het ideale beeld op 30 en 120 fps (${lag(a, 'position', 'pos').toFixed(3)} vs ${lag(b, 'position', 'pos').toFixed(3)} m)`);
  ok(bijna(lag(a, 'lookAt', 'at'), lag(b, 'lookAt', 'at')), `reuzenrad: het mikpunt loopt na ${secs} s ongeveer even ver achter (${lag(a, 'lookAt', 'at').toFixed(3)} vs ${lag(b, 'lookAt', 'at').toFixed(3)} m)`);
  // het rondkijken werkt: het mikpunt is opgeschoven ten opzichte van de eerste stand
  ok(Math.hypot(a.cam.lookAt.x - a.start.lookAt.x, a.cam.lookAt.y - a.start.lookAt.y) > 0.3, 'het rondkijken verschuift het mikpunt');
}

// --- het rad gaat vanzelf uit na twee rondes en zet je bij de instap neer ---
{
  const w = wereld();
  const load = H.HOOGVLIEGER.spots()[0];
  bouwKermis(w, load.x, load.y);
  let wacht = 0;
  while (!H.HOOGVLIEGER.prompt(w) && wacht++ < 400) K.KERMIS.tick(1 / 30, w);
  const geld = w.money;
  ok(window.__hoogvlieger.board(), 'instappen voor de tweede meting');
  let t = 0;
  while (H.HOOGVLIEGER.active() && t < 300) { t += 1 / 60; beeld(w, 1 / 60); H.HOOGVLIEGER.update(1 / 60, w); }
  ok(!H.HOOGVLIEGER.active(), 'na de rit stopt het rad vanzelf');
  ok(t > 90 && t < 130, 'twee rondes duren ongeveer twee minuten: ' + t.toFixed(0) + ' s');
  ok(w.money === geld - 2, 'een ritje kost €2');
  ok(w.cameraOverride === null && !w.cinematicHidePlayers, 'na het rad geen cameraklem meer');
  ok(w.player.x === load.x && w.player.y === load.y, 'je staat weer bij de instap');
}

// --- de twee camera's halen hun stap uit de ene helper, met de beeldtijd erbij (#436) ---
{
  const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
  ok(/easeStep\(/.test(lees('kermis.js')), 'de botsautocamera schaalt de stap met de beeldtijd (easeStep)');
  ok(/easeStep\(/.test(lees('reuzenrad.js')), 'de radcamera schaalt de stap met de beeldtijd (easeStep)');
  ok(/easeStep/.test(lees('minigamekit.js')), 'de helper staat in minigamekit.js');
}

console.log(bad ? `${bad} van ${n} mislukt` : `kermis_camera_test: ${n}/${n} ok`);
process.exit(bad ? 1 : 0);
