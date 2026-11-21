// De heli-missie als bot (#heli-logica): de echte helirun.js met de echte vliegfysica (heliflight.js)
// op een vlakke proefkaart, stap voor stap doorlopen met de debug-autopilot (pilotKeys). Bewijst
//  - elke variant (ballonjacht, traumaduif, rooster) is van start tot einde afrondbaar,
//  - na afronden, afbreken (elke fase), falen en laden staat alles weer terug: de HUD van het spel
//    (body-klassen, #heli-hud, camera, spelerverbergers), de speler te voet en de heli weg,
//  - een fout in de onFinish-haak of in de opruiming laat het spel niet in de heli-stand hangen.
//   node scripts/heli_missie_test.mjs
// Geen echte opslag: de test raakt localStorage niet; geen wereldgegevens nodig (vlakke proefkaart).
import './node3d.mjs';
import { registerHooks } from 'node:module';

let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// --- scene3d voor helirun.js: een lege scène (de echte heeft WebGL nodig) --------------------------
const SCENE_STUB = 'data:text/javascript,' + encodeURIComponent('export const getScene = () => globalThis.__stubScene; export const prewarmStreamAt = () => {};');
globalThis.__stubScene = { add() {}, remove() {} };
registerHooks({
  resolve(spec, ctx, next) {
    if (spec === './scene3d.js' && /helirun\.js$/.test(ctx.parentURL || '')) return { url: SCENE_STUB, shortCircuit: true };
    return next(spec, ctx);
  },
});

// --- een dun DOM: body-klassen en elementen met hidden/classList/style ---------------------------------
const noop = () => {};
function makeEl() {
  const cls = new Set();
  const kids = new Map();
  const el = {
    hidden: false, style: { setProperty: noop, removeProperty: noop }, dataset: {}, className: '', textContent: '', innerHTML: '', children: [],
    classList: { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), contains: (c) => cls.has(c), toggle: (c, on) => { if (on === undefined ? !cls.has(c) : on) cls.add(c); else cls.delete(c); } },
    appendChild: noop, removeChild: noop, remove: noop, addEventListener: noop, setAttribute: noop,
    getContext: () => new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : noop), set: () => true }),
    querySelector: (sel) => { if (!kids.has(sel)) kids.set(sel, makeEl()); return kids.get(sel); },
    querySelectorAll: (sel) => (sel === '[data-k]' ? ['time', 'speed', 'rings', 'dist', 'score'].map((k) => { const e = el.querySelector(`[data-k="${k}"]`); e.dataset.k = k; return e; }) : []),
    cls,
  };
  return el;
}
const body = makeEl();
body.classList.add('game-started');
const nodeDoc = globalThis.document;
globalThis.document = { createElement: (tag) => (tag === 'canvas' ? nodeDoc.createElement(tag) : makeEl()), createElementNS: () => makeEl(), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, removeEventListener: noop, body, head: nodeDoc.head, documentElement: nodeDoc.documentElement, fonts: { check: () => true } };

let H, R;
try {
  H = await import('../game/js/heliflight.js');
  R = await import('../game/js/helirun.js');
} catch (e) {
  // zonder gevendorde three (cd desktop && npm run stage) is dit een SKIP, geen fout
  if (/not vendored|ERR_MODULE_NOT_FOUND/.test(String(e && (e.message || e.code)))) { console.log('SKIP heli_missie_test: three is niet gevendord (draai eerst: cd desktop && npm run stage)'); process.exit(0); }
  throw e;
}
const P = await import('../game/js/heliplan.js');
const { helipadInfo } = await import('../game/js/skyprops.js');

// --- de proefwereld: een vlakke kaart met het UMCG-dek, Eelde en Lauwersoog --------------------------
const UMCG = { x: 420, y: -310, r: 6, angle: -Math.PI / 2 };
const EELDE = { x: 1767.87, y: 9950.93 };
const carrier = { bounds: [UMCG.x - 30, UMCG.y - 30, UMCG.x + 30, UMCG.y + 30], pts: [[UMCG.x - 30, UMCG.y - 30], [UMCG.x + 30, UMCG.y - 30], [UMCG.x + 30, UMCG.y + 30], [UMCG.x - 30, UMCG.y + 30]], h: 8 };
const map = {
  meta: { helipad: UMCG, bounds: [-1e6, -1e6, 1e6, 1e6] },
  buildingsNear: (x, y, r) => (Math.abs(x - UMCG.x) < 40 + r && Math.abs(y - UMCG.y) < 40 + r ? [carrier] : []),
  groundHeightAt: () => 0, escapeBuilding: (x, y) => [x, y], findOpenSpawn: (x, y) => ({ x, y }), openSpotNear: (x, y) => ({ x, y }),
  waterNear: () => [], roadsNear: () => [], isOnBridge: () => false, coveredAt: () => false,
};
const u = helipadInfo(map);
ok(!!u && u.deck > 10, 'het proefdek bestaat', JSON.stringify(u));
H.registerHelipad({ id: 'umcg', x: u.x, y: u.y, r: u.r, z: u.deck, name: 'UMCG-helidek', exit: false });
H.registerHelipad({ id: 'eelde', x: EELDE.x, y: EELDE.y, r: 6, z: 0, name: 'Eelde', exit: true });

function newWorld({ companion = false } = {}) {
  const keys = new Set();
  const pressed = new Set();
  const input = { isDown: (k) => keys.has(k), wasPressed: (k) => pressed.has(k), consume: (k) => pressed.delete(k), lookActive: () => false, mouse: { dx: 0, dy: 0 }, reset: () => { keys.clear(); pressed.clear(); }, press: (k) => pressed.add(k) };
  const messages = [];
  const w = {
    map, time: 0, paused: false, vehicles: [], balloons: [], particles: [], audioEvents: [], wanted: 0, camYaw: 0, health: 100,
    input, addMessage: (t) => messages.push(t), messages,
    player: { x: 0, y: 0, z: 0, angle: 0, vx: 0, vy: 0, inVehicle: null, water: null, swimming: false, climb: null },
    companion: companion ? { state: 'alive', x: 0, y: 0, inVehicle: null } : null,
    cinematicHidePlayers: false, cinematicHideNav: false, cameraOverride: null,
  };
  w._skyInit = true;
  return w;
}

// De toestand die "de UI onzichtbaar" maakt als hij blijft hangen: klassen en vlaggen die het gewone
// HUD verbergen, een camera die vastgezet blijft, spelers die verborgen blijven.
const HUD_HIDERS = ['heli-run', 'cine-hide-hud', 'intro-montage', 'pigeon-mode', 'trailer-on', 'foto-actief'];
function hudStand(w) {
  const root = globalThis.document.body;
  const heliHud = globalThis.__heliHudRoot;
  return {
    klassen: HUD_HIDERS.filter((c) => root.classList.contains(c)),
    heliHudZichtbaar: !!heliHud && !heliHud.hidden,
    heliRun: !!w.heliRun, camera: !!w.cameraOverride, spelersVerborgen: !!w.cinematicHidePlayers, navVerborgen: !!w.cinematicHideNav,
    inVoertuig: !!w.player.inVehicle, heliInWereld: w.vehicles.some((v) => v.isHeli), doel: !!w.heliRunTarget,
  };
}
const schoon = (s) => s.klassen.length === 0 && !s.heliHudZichtbaar && !s.heliRun && !s.camera && !s.spelersVerborgen && !s.navVerborgen && !s.inVoertuig && !s.heliInWereld && !s.doel;

// Het HUD-element van de run: initHeliRun maakt hem via document.createElement('div') aan; de eerste
// aangemaakte div met id 'heli-hud' is het. Vang hem door createElement te omwikkelen.
const origCreate = globalThis.document.createElement;
const divs = [];
globalThis.document.createElement = (tag) => { const e = origCreate(tag); if (tag === 'div') divs.push(e); return e; };
Object.defineProperty(globalThis, '__heliHudRoot', { get: () => divs.findLast((d) => d.id === 'heli-hud') });

const DT = 1 / 30;
// Eén run tot het eind (of tot `stopAt` zegt dat we hier afbreken). Geeft het resultaat en wat we zagen.
function speel(variant, { stopAt = null, companion = false, throwInFinish = false, maxS = 900, vliegZelf = false } = {}) {
  const w = newWorld({ companion });
  R.initHeliRun(w);
  const start = variant === 'traumaduif' ? { x: EELDE.x - 7, y: EELDE.y + 5 } : variant === 'rooster' ? { x: P.ROOSTER.lauwersoog.x - 7, y: P.ROOSTER.lauwersoog.y + 5 } : { x: UMCG.x + 3, y: UMCG.y + 8 };
  Object.assign(w.player, { x: start.x, y: start.y, angle: 1.1 });
  let result = null, finishes = 0;
  const started = R.startHeliRun({ variant, onFinish: (r) => { finishes++; result = r; if (throwInFinish) throw new Error('boem in onFinish'); } });
  const seen = { started, phases: [], legs: [], hudDuring: null, maxAlt: 0 };
  if (!started) return { w, seen, result, finishes };
  seen.hudDuring = hudStand(w);
  globalThis.window.__heliRun.autopilot = !vliegZelf;
  let t = 0, lastPhase = '', lastLeg = '';
  while (t < maxS && R.isHeliRunActive()) {
    w.time += DT;
    R.updateHeliRun(DT, w);
    H.updateHelis && 0;
    t += DT;
    const s = globalThis.window.__heliRun.state();
    if (!s) break;
    if (s.phase !== lastPhase) {
      lastPhase = s.phase; seen.phases.push(s.phase);
      if (s.phase === 'result') { const v = w.vehicles.find((q) => q.isHeli); seen.resultInfo = { health: v && v.health, wrecked: v && v.wrecked, onGround: v && v.onGround, x: Math.round(s.x), y: Math.round(s.y), z: Math.round(s.z), leg: s.leg, text: globalThis.__heliHudRoot.querySelector('.hh-card').querySelector('.sub').textContent, msgs: w.messages.slice(-3) }; }
    }
    const lk = `${s.legIndex}:${s.leg}`;
    if (lk !== lastLeg) { lastLeg = lk; seen.legs.push(s.leg); }
    seen.maxAlt = Math.max(seen.maxAlt, s.z);
    if (stopAt && stopAt(s, t) && !seen.stopped) { seen.stopped = { phase: s.phase, leg: s.leg, t }; R.abortHeliRun(); break; }
  }
  seen.t = t;
  return { w, seen, result, finishes };
}

// --- 1. elke variant van begin tot eind ----------------------------------------------------------
for (const variant of ['ballonjacht', 'traumaduif', 'rooster']) {
  const { w, seen, result, finishes } = speel(variant);
  ok(seen.started, `${variant}: de run start`);
  ok(seen.hudDuring && seen.hudDuring.klassen.includes('heli-run') && seen.hudDuring.heliHudZichtbaar && seen.hudDuring.heliRun, `${variant}: tijdens de run staat de heli-HUD aan`, JSON.stringify(seen.hudDuring));
  ok(!R.isHeliRunActive(), `${variant}: de run is binnen ${seen.t.toFixed(0)} s afgerond`);
  ok(finishes === 1 && result && result.success && !result.aborted, `${variant}: precies één onFinish met succes`, JSON.stringify({ finishes, result, info: seen.resultInfo }));
  const s = hudStand(w);
  ok(schoon(s), `${variant}: na afloop staat alles terug (HUD, camera, speler te voet, heli weg)`, JSON.stringify(s));
  ok(w.vehicles.length === 0, `${variant}: de demoheli is opgeruimd`);
  ok(Number.isFinite(w.player.x) && Number.isFinite(w.player.y), `${variant}: de speler heeft een geldige plek`);
  if (variant === 'rooster') ok(seen.legs.join() === 'cruise,pad,pickup,cruise,catch,' || seen.legs.join().startsWith('cruise,pad,pickup,cruise,catch'), 'rooster: de stappen komen in volgorde', seen.legs.join());
  if (variant === 'traumaduif') ok(seen.legs.slice(0, 6).join() === 'cruise,pad,pickup,rings,catch,pad', 'traumaduif: de stappen komen in volgorde', seen.legs.join());
  if (variant === 'ballonjacht') ok(seen.legs.slice(0, 3).join() === 'rings,catch,pad', 'ballonjacht: de stappen komen in volgorde', seen.legs.join());
}

// --- 2. afbreken in elke fase en na elke stap ----------------------------------------------------
for (const variant of ['ballonjacht', 'traumaduif', 'rooster']) {
  const fases = new Set();
  for (const fase of ['intro', 'cruise', 'pickup', 'fly', 'result']) {
    for (const leg of ['rings', 'catch', 'pad', null]) {
      const key = `${fase}/${leg}`;
      const { w, seen, result, finishes } = speel(variant, { stopAt: (s) => s.phase === fase && (leg === null || s.leg === leg) });
      if (!seen.stopped) continue;
      fases.add(key);
      const s = hudStand(w);
      ok(schoon(s), `${variant}: afbreken in ${key} zet alles terug`, JSON.stringify(s));
      // in de resultaatkaart is de vlucht al geslaagd: afbreken (laden) laat dat succes staan en meldt alleen dat het afgebroken werd
      ok(finishes === 1 && result && result.aborted && (fase === 'result' ? result.success : !result.success), `${variant}: afbreken in ${key} meldt precies één keer 'afgebroken'`, JSON.stringify({ finishes, result }));
    }
  }
  ok(fases.size >= 4, `${variant}: er is in meerdere fasen afgebroken`, [...fases].join());
}

// --- 3. laden midden in de run (savegame.applySave roept abortHeliRun) ---------------------------------
{
  const { w, result, finishes } = speel('rooster', { stopAt: (s) => s.leg === 'pad' && s.phase === 'fly' });
  ok(schoon(hudStand(w)) && finishes === 1 && result.aborted, 'laden in de landingsstap: alles terug en één keer afgebroken');
  const again = R.abortHeliRun();
  ok(again === false, 'een tweede abort doet niets');
}

// --- 4. een fout in de onFinish-haak laat het spel niet in de heli-stand hangen -------------------------
{
  const stil = console.error; console.error = () => {};
  const { w, finishes } = speel('ballonjacht', { throwInFinish: true });
  console.error = stil;
  ok(finishes === 1 && schoon(hudStand(w)), 'een gooiende onFinish: de HUD en de vlaggen staan toch terug', JSON.stringify(hudStand(w)));
}

// --- 4b. een worp in de tweede helft van de opruiming slaat onFinish niet meer over ----------------------
{
  const stil = console.error; console.error = () => {};
  const w = newWorld({ companion: false });
  R.initHeliRun(w);
  Object.assign(w.player, { x: UMCG.x + 3, y: UMCG.y + 8, angle: 1.1 });
  let fin = 0, res = null;
  R.startHeliRun({ variant: 'ballonjacht', onFinish: (r) => { fin++; res = r; } });
  w.input.reset = () => { throw new Error('boem in de opruiming'); };
  R.abortHeliRun();
  console.error = stil;
  ok(fin === 1 && res && res.aborted === true, 'een worp in de tweede helft van cleanup: onFinish komt toch (precies een keer)', JSON.stringify({ fin, res }));
  ok(!R.isHeliRunActive() && w.heliRun === false, 'en de run staat uit');
}

// --- 5. een tweede run direct na de eerste, en met een metgezel ------------------------------------
{
  const a = speel('traumaduif', { companion: true });
  ok(a.result && a.result.success, 'met een metgezel: de run slaagt');
  ok(!a.w.companion.inVehicle, 'de metgezel zit na afloop niet meer in de verdwenen heli');
  ok(schoon(hudStand(a.w)), 'met een metgezel: alles terug');
  const b = speel('ballonjacht');
  ok(b.result && b.result.success, 'een nieuwe run na de vorige slaagt weer');
}

// --- 6. de heli stort neer: de run faalt netjes -----------------------------------------------------
{
  let kapot = false;
  // handmatig: start, sloop de heli en loop door tot het eind
  const w2 = newWorld();
  R.initHeliRun(w2);
  Object.assign(w2.player, { x: UMCG.x + 3, y: UMCG.y + 8 });
  let res = null;
  R.startHeliRun({ variant: 'ballonjacht', onFinish: (r) => { res = r; } });
  globalThis.window.__heliRun.autopilot = true;
  let t = 0;
  while (t < 60 && R.isHeliRunActive()) {
    w2.time += DT; t += DT;
    const v = w2.vehicles.find((q) => q.isHeli);
    if (t > 8 && v && !kapot) { kapot = true; v.health = 0; v.wrecked = true; }
    R.updateHeliRun(DT, w2);
  }
  ok(res && res.success === false && !res.aborted, 'een neergestorte heli: de run faalt (niet afgebroken)', JSON.stringify(res));
  ok(schoon(hudStand(w2)), 'na een crash staat alles terug', JSON.stringify(hudStand(w2)));
}

// --- 7. een fout in één frame van de run: de run wordt opgegeven, het spel hangt niet in de heli-stand ---------
{
  const err = console.error;
  const gevangen = [];
  console.error = (...a) => gevangen.push(a.map(String).join(' '));
  try {
    for (const [naam, saboteer] of [
      ['een gooiende invoer', (w) => { w.input.wasPressed = () => { throw new Error('invoer stuk'); }; }],
      ['een gooiende scène bij het opruimen', (w) => { w.input.wasPressed = () => { throw new Error('invoer stuk'); }; globalThis.__stubScene.remove = () => { throw new Error('scene stuk'); }; }],
    ]) {
      const w = newWorld();
      R.initHeliRun(w);
      Object.assign(w.player, { x: UMCG.x + 3, y: UMCG.y + 8 });
      let res = null;
      R.startHeliRun({ variant: 'ballonjacht', onFinish: (r) => { res = r; } });
      for (let i = 0; i < 30; i++) { w.time += DT; R.updateHeliRun(DT, w); }
      saboteer(w);
      let gegooid = false;
      try { w.time += DT; R.updateHeliRun(DT, w); } catch (e) { gegooid = true; }
      globalThis.__stubScene.remove = () => {};
      ok(!gegooid, `${naam}: updateHeliRun gooit niet door naar het spelframe`);
      ok(!R.isHeliRunActive() && schoon(hudStand(w)), `${naam}: de run is opgegeven en alles staat terug`, JSON.stringify(hudStand(w)));
      ok(!res || res.aborted, `${naam}: de missie hoort 'afgebroken' te horen, niet 'gelukt'`, JSON.stringify(res));
    }
  } finally { console.error = err; globalThis.__stubScene.remove = () => {}; }
  ok(gevangen.length >= 2, 'de fouten zijn gelogd, niet ingeslikt', String(gevangen.length));
}

// --- 8. Samen spelen: een gast vliegt (actor), de host blijft ongemoeid; na afloop zit de gast niet meer in de heli ------
{
  const w = newWorld();
  R.initHeliRun(w);
  const gast = { x: UMCG.x + 3, y: UMCG.y + 8, z: 0, angle: 0, vx: 0, vy: 0, inVehicle: null };
  Object.assign(w.player, { x: 5000, y: 5000 });
  let res = null;
  R.startHeliRun({ variant: 'ballonjacht', actor: gast, onFinish: (r) => { res = r; } });
  ok(gast.inVehicle && gast.inVehicle.isHeli, 'de gast zit in de heli');
  globalThis.window.__heliRun.autopilot = true;
  let t = 0;
  while (t < 900 && R.isHeliRunActive()) { w.time += DT; R.updateHeliRun(DT, w); t += DT; }
  ok(res && res.success, 'de gast rondt de vlucht af');
  ok(gast.inVehicle === null, 'de gast zit na afloop niet meer in de verdwenen heli', String(gast.inVehicle));
  ok(w.player.x === 5000 && w.player.y === 5000, 'de plek van de host is niet verschoven door de vlucht van de gast', `${w.player.x},${w.player.y}`);
}

console.log(`heli_missie_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
