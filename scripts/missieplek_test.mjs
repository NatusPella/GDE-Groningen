// #950 en #951: staan de missiepunten van akte 4 op een echte plek? Het gesprek
// met de accountmanager hoort in een kantoor (niet in een weiland) en de trein
// van mevrouw Hoving moet op het perron staan, niet 300 m verderop.
//   node scripts/missieplek_test.mjs
// Zonder game/world (de provinciebouw) slaat het werelddeel zichzelf over.
import './node3d.mjs';
import fs from 'node:fs';
import { PLACES } from '../game/js/missions_akte4.js';
import { wgsToWorld } from '../game/js/rdnew.js';
// office3d.js haalt three.js binnen: pas na node3d.mjs laden.
const { OFFICE } = await import('../game/js/office3d.js');

let n = 0, bad = 0;
const ok = (name, c, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };

// --- het kantoorset ----------------------------------------------------------
ok('office3d heeft een kamer met echte maten', OFFICE.w >= 6 && OFFICE.d >= 4.5 && OFFICE.h >= 2.6, JSON.stringify(OFFICE));
const officeSrc = fs.readFileSync(new URL('../game/js/office3d.js', import.meta.url), 'utf8');
ok('office3d bouwt bureau, scherm, whiteboard en glas', /export function buildOffice/.test(officeSrc) && /deskU/.test(officeSrc) && /signTex/.test(officeSrc) && /glassTex/.test(officeSrc));
{
  const { buildOffice } = await import('../game/js/office3d.js');
  const set = buildOffice(0, 0, 0);
  ok('het kantoorset bouwt echt (geen placeholder)', set.group.children.length > 10, String(set.group.children.length));
  set.dispose();
  ok('het kantoorset ruimt zijn eigen materiaal op', typeof set.dispose === 'function');
}
// de vijf M18-scènes spelen in dat kantoor, niet in de buitenlucht
await import('../game/js/cutscenes_akte4.js');
const MORE = (await import('../game/js/cutscenes_akte1.js')).MORE_SPECS;
for (const id of ['M18.intro', 'M18.outro', 'M18.2', 'M18.6', 'M18.7']) ok(`${id} speelt in het kantoorset`, MORE[id] && MORE[id].set === 'kantoor', String(MORE[id] && MORE[id].set));
const cut1 = fs.readFileSync(new URL('../game/js/cutscenes_akte1.js', import.meta.url), 'utf8');
ok('missionScene geeft de set door aan de scène', /spec\.set \? \{ set: spec\.set \}/.test(cut1));
ok('cutscenehost kent de kantoor-set', /buildOffice/.test(fs.readFileSync(new URL('../game/js/cutscenehost.js', import.meta.url), 'utf8')) && /officeEnv/.test(fs.readFileSync(new URL('../game/js/cutscenehost.js', import.meta.url), 'utf8')));

// --- de treinrit -------------------------------------------------------------
ok('de perronplek is een gemeten punt, geen schatting', Array.isArray(PLACES.veendamPerron) && PLACES.veendamPerronStart, JSON.stringify(PLACES.veendamPerron));
const ritSrc = fs.readFileSync(new URL('../game/js/stagerit.js', import.meta.url), 'utf8');
ok('de rit maakt de museumtrein (st.train) aan', /st\.train \|\| route\.train/.test(ritSrc));
ok('zonder lijn speelt de rit zichzelf niet meer af', !/S\.t > FALLBACK_S \? 'done'/.test(ritSrc) && /wasPressed\('e'\)/.test(ritSrc));
ok('de museumtrein bestaat als treintype', /stoom: \{/.test(fs.readFileSync(new URL('../game/js/railway.js', import.meta.url), 'utf8')));

// --- #1035: de grensgevallen van de missieprop-audit schuiven naar de vrije plek ---------------------------------------
{
  const { applyPlekFix, PLEK_FIX } = await import('../game/js/missionplace.js');
  const f = PLEK_FIX[0];
  const def = { start: { x: f.van[0] + 0.5, y: f.van[1], road: null }, stages: [{ target: { x: 1, y: 1 } }] };
  ok('applyPlekFix verschuift een punt op de grensplek', applyPlekFix([def]) === 1 && def.start.x === f.naar[0] && def.start.y === f.naar[1]);
  const snap = { start: { x: f.van[0], y: f.van[1], road: 'snap' } };
  ok('een punt dat de runner snapt blijft staan', applyPlekFix([snap]) === 0 && snap.start.x === f.van[0]);
  ok('elke fix is een kleine, eindige verschuiving', PLEK_FIX.every((q) => Math.hypot(q.naar[0] - q.van[0], q.naar[1] - q.van[1]) <= 15));
}

// --- de echte wereld ---------------------------------------------------------
const { loadGameWorld, loadArea } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) {
  console.log('SKIP missieplek_test werelddeel: geen game/world met de provincie');
  console.log(`missieplek_test: ${n - bad}/${n} ok`);
  process.exit(bad ? 1 : 0);
}
const map = T.world;
const [wx, wy] = wgsToWorld(PLACES.wiebelwerk[0], PLACES.wiebelwerk[1]);
const [sx, sy] = wgsToWorld(PLACES.veendamPerron[0], PLACES.veendamPerron[1]);
const [px, py] = wgsToWorld(PLACES.veendamPerronStart[0], PLACES.veendamPerronStart[1]);
await loadArea(T, [Math.min(wx, sx) - 900, Math.min(wy, sy) - 900, Math.max(wx, sx) + 900, Math.max(wy, sy) + 900]);

// M18: de ingang van een pand, geen weiland
{
  let best = Infinity, type = '';
  for (const b of map.buildingsNear(wx, wy, 40)) {
    for (let i = 0; i < b.pts.length - 1; i++) {
      const [ax, ay] = b.pts[i], [bx, by] = b.pts[i + 1];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((wx - ax) * dx + (wy - ay) * dy) / l2));
      const d = Math.hypot(ax + dx * t - wx, ay + dy * t - wy);
      if (d < best) { best = d; type = b.type; }
    }
  }
  ok('M18 staat bij een echt pand, niet in het open veld', best < 12, `${best.toFixed(1)} m van een ${type || '?'}-pand`);
  ok('M18 staat op begaanbare, droge grond', map.isOpenSpot(wx, wy) && !map.inWaterRaw(wx, wy), `${map.isOpenSpot(wx, wy)}/${map.inWaterRaw(wx, wy)}`);
  const [dx, dy] = wgsToWorld(PLACES.wiebelwerkServers[0], PLACES.wiebelwerkServers[1]);
  ok('de serverkamer is bereikbaar vanaf de ingang', map.isOpenSpot(dx, dy) && Math.hypot(dx - wx, dy - wy) > 10 && Math.hypot(dx - wx, dy - wy) < 60, `${Math.hypot(dx - wx, dy - wy).toFixed(0)} m`);
  const [ux, uy] = wgsToWorld(PLACES.wiebelwerkUit[0], PLACES.wiebelwerkUit[1]);
  ok('de uitgang ligt op loopafstand van de serverkamer', map.isOpenSpot(ux, uy) && Math.hypot(ux - dx, uy - dy) < 45, `${Math.hypot(ux - dx, uy - dy).toFixed(0)} m`);
}

// M19: de halte van de Stoptrein Veendam
{
  const { applyCityRoutes } = await import('../game/js/corridorrail.js');
  const R = await import('../game/js/railway.js');
  if (T.land) applyCityRoutes(map, T.land);
  R.initRailway({ map });
  const route = R.getRoutes().find((r) => r.name === 'Stoptrein Veendam');
  ok('de lijn naar Veendam bestaat in deze wereld', !!route, String(R.getRoutes().length));
  if (route) {
    let best = Infinity;
    for (let s = 0; s <= route.len; s += 5) {
      const [x, y] = R.routePoint(route, s);
      best = Math.min(best, Math.hypot(x - sx, y - sy));
    }
    ok('M19 staat op het perron (binnen 15 m van het spoor)', best < 15, `${best.toFixed(1)} m`);
  }
  ok('de startplek van M19 is droog en begaanbaar', map.isOpenSpot(px, py) && !map.inWaterRaw(px, py), `${map.isOpenSpot(px, py)}/${px.toFixed(1)},${py.toFixed(1)}`);
  // de rit zelf: de trein wordt aangemaakt en staat bij het perron (geen fallback)
  if (route) {
    const { enterRit } = await import('../game/js/stagerit.js');
    const world = { map, vehicles: [], pedestrians: [], time: 0, clock: 10 };
    const S = { target: { x: sx, y: sy } };
    enterRit(world, { kind: 'rit', length: 2300, radius: 45, train: 'stoom' }, S);
    ok('de rit vindt de lijn (geen automatische afloop)', S.rit.fallback === false, JSON.stringify(S.rit && S.rit.fallback));
    ok('de museumstoomtrein is aangemaakt', !!S.rit.train, JSON.stringify(S.rit && S.rit.train && S.rit.train.cfg.label));
    ok('de trein is een museumtrein met wagens', S.rit.train && S.rit.train.cfg.label === 'Museumstoomtrein' && S.rit.train.cars.length >= 2);
    const mid = S.rit.train && S.rit.train.cars[S.rit.train.cars.length >> 1];
    ok('de trein staat bij het perron', mid && Math.hypot(mid.x - sx, mid.y - sy) < 40, mid ? `${Math.hypot(mid.x - sx, mid.y - sy).toFixed(1)} m` : 'geen trein');
    ok('er is een perron aan het eind van de rit', !!S.rit.platform && Number.isFinite(S.rit.platform.x), JSON.stringify(S.rit.platform));
    // Een gewone stoptrein op dezelfde plek zou de speler per ongeluk kunnen laten
    // instappen; die is weggestuurd (#951).
    const andere = R.getTrains().filter((t) => t !== S.rit.train && t.cars.some((c) => Math.hypot(c.x - sx, c.y - sy) < 90));
    ok('er staat geen tweede trein op het perron', andere.length === 0, andere.map((t) => t.type).join());
    // de oude klacht: stilstaan bij de start haalde de missie. De rit mag niet
    // vanzelf 'done' worden zonder in te stappen en te rijden.
    const { updateRit } = await import('../game/js/stagerit.js');
    const wacht = {
      map, vehicles: [], pedestrians: [], time: 0, clock: 10,
      player: { x: px, y: py }, input: { wasPressed: () => false }, addMessage() {},
    };
    const S2 = { t: 60, target: { x: sx, y: sy }, rit: S.rit };
    ok('stil blijven staan bij de start haalt de rit niet', updateRit(1 / 60, wacht, { kind: 'rit', radius: 45 }, S2, () => {}) === null);
  }
}

console.log(`missieplek_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
