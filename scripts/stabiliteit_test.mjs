// Stabiliteit en lekken (#1065): de opruimer van niet-eindige waarden en de bedrading van de reparaties (bronchecks voor wat in Node niet
// draait: scene3d.js, main.js, desktop/main.js).
//   node scripts/stabiliteit_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import { sweepNonFinite } from '../game/js/finitesweep.js';

let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const src = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// --- sweepNonFinite ---
const w = {
  vehicles: [
    { id: 1, x: 1, y: 2, angle: 0, speed: 3 },
    { id: 2, x: NaN, y: 2, angle: 0, speed: 0 },
    { id: 3, x: 5, y: Infinity, angle: 0 },
    { id: 4, x: 5, y: 5, speed: NaN },
    { id: 5, x: NaN, y: NaN, driver: 'player' },
    { id: 6, x: 1, y: 1, angle: NaN },
    { id: 7, x: 1, y: 1 }, // een voertuigsoort zonder hoek blijft staan
  ],
  pedestrians: [{ x: 1, y: 1 }, { x: NaN, y: 0 }, { x: 0, y: -Infinity }, null],
};
const r = sweepNonFinite(w);
ok(r.voertuigen === 3 && r.voetgangers === 2 && r.snelheid === 1, 'telt wat is opgeruimd', JSON.stringify(r));
ok(w.vehicles.map((v) => v.id).join() === '1,4,5,7', 'de speler, gezonde en hoekloze voertuigen blijven', w.vehicles.map((v) => v.id).join());
ok(w.vehicles.find((v) => v.id === 4).speed === 0, 'een niet-eindige snelheid wordt nul');
ok(w.pedestrians.length === 2, 'de gezonde voetganger blijft');
ok(sweepNonFinite({}).voertuigen === 0, 'een wereld zonder lijsten geeft geen fout');
const t0 = process.hrtime.bigint();
const groot = { vehicles: Array.from({ length: 400 }, (_, i) => ({ x: i, y: i, angle: 0, speed: 1 })), pedestrians: Array.from({ length: 200 }, (_, i) => ({ x: i, y: i })) };
for (let i = 0; i < 1000; i++) sweepNonFinite(groot);
const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 1000;
ok(ms < 0.2, 'een opruimronde kost minder dan 0,2 ms bij 400 auto\'s en 200 voetgangers', ms.toFixed(3) + ' ms');


// --- haltebordjes (waymarkers3d.js trimSigns) ---
{
  const { trimSigns, SIGN_KEEP } = await import('../game/js/waymarkers3d.js');
  let weg = 0;
  const maak = () => ({ traverse(f) { f({ geometry: { dispose() { weg++; } }, material: { map: { dispose() { weg++; } }, dispose() { weg++; } } }); } });
  const signs = new Map(); const root = { removed: 0, remove() { this.removed++; } };
  for (let i = 0; i < 30; i++) signs.set('h' + i, maak());
  const live = new Set(['h0', 'h1', 'h29']);
  const n2 = trimSigns(root, signs, live);
  ok(signs.size === SIGN_KEEP && n2 === 30 - SIGN_KEEP, 'trimSigns houdt hoogstens SIGN_KEEP borden', String(signs.size));
  ok(live.has('h0') && signs.has('h0') && signs.has('h1') && signs.has('h29'), 'borden van de lopende rit blijven altijd');
  ok(weg === n2 * 3 && root.removed === n2, 'geometrie, textuur en materiaal van elk weggegooid bord zijn vrijgegeven', String(weg));
  ok(trimSigns(root, signs, live) === 0, 'een tweede ronde doet niets');
  const allLive = new Map(); for (let i = 0; i < 12; i++) allLive.set('k' + i, maak());
  ok(trimSigns(root, allLive, new Set([...allLive.keys()])) === 0 && allLive.size === 12, 'borden die allemaal nodig zijn blijven staan');
}
// --- bedrading ---
const scene = src('game/js/scene3d.js');
ok(/for \(const k of \['_geoStruct', '_geoOverDeck', '_geoBridgeCore'\]\)/.test(scene), 'freeRoadGeometry geeft ook _geoBridgeCore vrij');
ok(/setPartsInUse\(\(b\) => buildingMeshes\.has\(b\) \|\| prefetchedBuildings\.has\(b\)\)/.test(scene), 'scene3d.js meldt welke gebouwen nog getekend worden');
const main = src('game/js/main.js');
for (const nm of ['updateGameplay', 'updateSafety', 'update3D', 'updateHud']) ok(main.includes(`frameGuard.run('${nm}'`), `main.js draait ${nm} veilig`);
ok(/sweepNonFinite\(world\)/.test(main), 'main.js ruimt niet-eindige waarden op');
ok(!/^\s+frameGuard\./m.test(main.slice(main.indexOf('function waitForStart'), main.indexOf('function beginOnlineStartQuestion'))), 'de menu-tick (waitForStart) gebruikt frameGuard niet: hij staat buiten zijn bereik');
const bus = src('game/js/buslive.js');
ok(/finally \{ st\.bezig = false; \}/.test(bus), 'buslive.js zet bezig altijd terug');
const cut = src('game/js/coopcut.js');
ok(/try \{\s*ok = m\.playScript/.test(cut), 'coopcut.js vangt een fout van playScript op');
const desk = src('desktop/main.js');
ok(/gde-coop-reset/.test(desk) && /app\.emit\('gde-coop-reset'\)/.test(desk), 'desktop: na een herlaad stopt de coöp-server');
ok(/removeListener\('child-process-gone'/.test(desk), 'desktop: de child-process-gone-luisteraar gaat weg met het venster');
ok(/win\.on\('unresponsive'/.test(desk), 'desktop: een vastgelopen venster wordt gelogd');
ok(/262144/.test(desk), 'desktop: gpu-events.log heeft een grens');

// --- #1074: restpunten van de lekkenronde (bronchecks; de soak in Electron is nog niet gedraaid)
ok(/gde:save-text[\s\S]{0,700}try \{ await fs\.writeFile[\s\S]{0,120}catch/.test(desk), 'desktop: gde:save-text vangt een schrijffout af');
const dorp = src('game/js/dorpsuitjes.js');
ok(/async function placeSoon[\s\S]{0,600}catch \(e\) \{ v\.placeFails/.test(dorp) && /PLACE_MAX_FAILS/.test(dorp), 'dorpsuitjes: placeSoon vangt een afgewezen withTiles af en geeft na drie pogingen op');
const busInt = src('game/js/businterieur3d.js');
ok(/REIZIGERS_MAX = 64/.test(busInt) && /reizigersSleutels\.shift\(\)/.test(busInt), 'businterieur3d: de reizigersgeometrie heeft een grens');
const pm = src('game/js/provincemap.js');
ok(/IMGS_MAX = 256/.test(pm) && /imgs\.delete\(imgs\.keys\(\)\.next\(\)\.value\)/.test(pm), 'provincemap: de kaartbladen zijn een LRU');

console.log(`stabiliteit_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
