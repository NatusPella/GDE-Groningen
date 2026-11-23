// Lijnbussen in het verkeer halteren op de echte kaart (wens eigenaar 23-11): de bus-AI rijdt een stuk van een echte
// lijn (game/world, provincie-bus.json), remt bij elke halte af, staat stil aan de stoeprand met open deuren en de
// wachttijd, knippert rechts erheen en links weer weg, en rijdt door. Een auto erachter haalt de staande bus in of
// wacht. Deterministisch (vaste rng, virtuele klok). Zonder game/world: SKIP.
//   node scripts/halteren_wereld_test.mjs [--lijnen=N] [--verbose]
import './node3d.mjs';
import fs from 'node:fs';
let seed = 4242;
Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
await import('../game/js/player.js');
const { loadGameWorld } = await import('./worldload.mjs');
const T = await loadGameWorld();
const busFile = new URL('../game/world/provincie-bus.json', import.meta.url);
if (!T || !fs.existsSync(busFile)) { console.log('SKIP halteren_wereld_test: geen game/world'); process.exit(0); }
const map = T.world;
const B = await import('../game/js/busroutes.js');
const V = await import('../game/js/vehicle.js');
const TL = await import('../game/js/trafficlights.js');
const { stilstandDeurOpen } = await import('../game/js/vehicledoors.js');
const { HALTE } = await import('../game/js/halteren.js');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? +a.slice(k.length + 3) : d; };
const VERBOSE = process.argv.includes('--verbose');
const MAX_LIJNEN = arg('lijnen', 6);
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const lines = B.prepareLines(JSON.parse(fs.readFileSync(busFile, 'utf8')).bus);
const DT = 1 / 20;
const world = { map, flitspaalen: [], player: { x: 0, y: 0 }, vehicles: [], props: [], particles: [], stats: {}, time: 0, clock: 12, addMessage() {}, audioEvents: [], haltefx: [] };
TL.initTrafficLights(world);

const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
// een stuk weg onder een punt van de lijn, in de richting van de lijn, waar een bus mag rijden
function spawnBus(l, s) {
  const at = B.startAt(l, s, 1);
  for (const r of map.roadsNear(at.x, at.y, 8)) {
    if (B.busWegFout(r)) continue;
    const v = V.spawnVehicleOnRoad(map, r, false, Math.random, false, true, { x: at.x, y: at.y });
    if (v && angDiff(v.angle, at.angle) < Math.PI / 3 && Math.hypot(v.x - at.x, v.y - at.y) < 8) return v;
  }
  return null;
}

let ritten = 0, aankomsten = 0, gemist = 0;
const standtijden = [], stopAfstanden = [];
let knipperRechts = 0, knipperLinks = 0, stoepBijAankomst = 0, deurOpenBijHalte = 0, deurDichtElders = 0, deurElders = 0;
for (const l of lines) {
  if (ritten >= MAX_LIJNEN) break;
  // een halte op de stadskaart met een rechte aanloop van 150 m langs de lijn
  const st = l.stops.find((q) => q.s > 200 && q.s < l.length - 200 && map.roadsNear(q.x, q.y, 10).length);
  if (!st) continue;
  const v = spawnBus(l, st.s - 150);
  if (!v) continue;
  v.busRun = B.makeRunner(l, B.project(l, v.x, v.y).s, 1);
  world.vehicles = [v];
  world.haltefx.length = 0;
  ritten++;
  let t = 0, sawRight = false, sawLeftAfter = false, aan = null, staan = 0, wasStaan = false;
  while (t < 90) {
    world.time += DT; t += DT;
    world.player.x = v.x; world.player.y = v.y;
    TL.updateTrafficLights(DT, world);
    V.updateTrafficAI(v, DT, map, world, Math.random);
    if (!v.road) break;
    const hs = v.halteStaat;
    if (!hs) continue;
    if (hs.knipper === 'right' && !aan) sawRight = true;
    if (hs.aankomst) {
      aan = { t, x: v.x, y: v.y, stop: hs.stop };
      stopAfstanden.push(Math.abs(B.project(l, v.x, v.y).s - (hs.stop.s + HALTE.VOORUIT)));
      if (v.laneMode === 'halte') stoepBijAankomst++;
      if (stilstandDeurOpen(v)) deurOpenBijHalte++;
    }
    if (hs.gemist && VERBOSE) console.log(`  lijn ${l.ref}: halte gemist bij s=${v.busRun.s.toFixed(0)}`);
    if (hs.gemist) gemist++;
    if (hs.fase === 'staan') { staan += DT; wasStaan = true; }
    if (wasStaan && hs.knipper === 'left') sawLeftAfter = true;
    if (hs.fase !== 'staan' && Math.abs(v.speed) < 0.3) { deurElders++; if (!stilstandDeurOpen(v)) deurDichtElders++; }
    if (aan && hs.fase === 'rijden' && Math.abs(v.speed) > 5) break;
  }
  if (VERBOSE) console.log(`  lijn ${l.ref}: aankomst ${aan ? aan.t.toFixed(1) + ' s' : 'geen'}, ${staan.toFixed(1)} s gestaan, uitwisselingen ${world.haltefx.length}`);
  if (aan) { aankomsten++; standtijden.push(staan); }
  if (sawRight) knipperRechts++;
  if (sawLeftAfter) knipperLinks++;
}
console.log(`halteren_wereld: ${ritten} ritten, ${aankomsten} keer gehalteerd, ${gemist} gemist`);
ok(ritten >= 3, 'genoeg lijnen om te rijden', ritten);
ok(aankomsten >= Math.ceil(ritten * 0.6), 'de meeste bussen halteren bij hun halte', `${aankomsten}/${ritten}`);
ok(stopAfstanden.every((d) => d < 12), 'stilstand bij het stoppunt (langs de lijn)', stopAfstanden.map((d) => d.toFixed(1)).join(' '));
ok(standtijden.every((s) => s >= 8 && s <= 11), 'de wachttijd bij de halte', standtijden.map((s) => s.toFixed(1)).join(' '));
ok(stoepBijAankomst === aankomsten, 'aan de stoeprand bij aankomst', `${stoepBijAankomst}/${aankomsten}`);
ok(deurOpenBijHalte === aankomsten, 'deuren open bij de halte', `${deurOpenBijHalte}/${aankomsten}`);
ok(deurDichtElders === deurElders, 'deuren dicht bij stilstand elders (rood licht, file)', `${deurDichtElders}/${deurElders}`);
ok(knipperRechts >= aankomsten, 'knippert rechts naar de halte', `${knipperRechts}/${aankomsten}`);
ok(knipperLinks >= aankomsten, 'knippert links bij het invoegen', `${knipperLinks}/${aankomsten}`);
ok(world.haltefx.length <= 16, 'de wachtrij van uitwisselingen blijft begrensd zonder beeld', world.haltefx.length);

// Ander verkeer: een auto achter een staande bus wacht niet de hele haltetijd als hij erlangs kan (of wacht netjes).
{
  let l = null, bus = null;
  for (const q of lines) {
    const st = q.stops.find((x) => x.s > 200 && x.s < q.length - 200 && map.roadsNear(x.x, x.y, 10).length);
    bus = st && spawnBus(q, st.s - 60);
    if (bus) { l = q; break; }
  }
  ok(!!bus, 'een bus voor de inhaaltoets');
  if (bus) {
    bus.busRun = B.makeRunner(l, B.project(l, bus.x, bus.y).s, 1);
    world.vehicles = [bus];
    let t = 0;
    while (t < 30 && !(bus.halteStaat && bus.halteStaat.fase === 'staan')) { world.time += DT; t += DT; world.player.x = bus.x; world.player.y = bus.y; V.updateTrafficAI(bus, DT, map, world, Math.random); }
    ok(bus.halteStaat && bus.halteStaat.fase === 'staan', 'bus staat bij de halte voor de inhaaltoets');
    const car = V.spawnVehicleOnRoad(map, bus.road, false, Math.random, false, false, { x: bus.x - Math.cos(bus.angle) * 16, y: bus.y - Math.sin(bus.angle) * 16 });
    if (car && angDiff(car.angle, bus.angle) < Math.PI / 3) {
      world.vehicles = [bus, car];
      let botsing = false, voorbij = false;
      for (let i = 0; i < 12 / DT; i++) {
        world.time += DT; world.player.x = bus.x; world.player.y = bus.y;
        V.updateTrafficAI(bus, DT, map, world, Math.random);
        V.updateTrafficAI(car, DT, map, world, Math.random);
        if (Math.hypot(car.x - bus.x, car.y - bus.y) < 2) botsing = true;
        const voor = (car.x - bus.x) * Math.cos(bus.angle) + (car.y - bus.y) * Math.sin(bus.angle);
        if (voor > bus.halfLen + car.halfLen) voorbij = true;
      }
      ok(!botsing, 'auto rijdt niet in de staande bus');
      console.log(`  auto achter de staande bus: ${voorbij ? 'haalt in' : 'wacht erachter'}`);
    } else console.log('  (geen auto achter de bus te plaatsen: inhaaltoets overgeslagen)');
  }
}

console.log(fails ? `halteren_wereld_test: ${fails} van ${n} mislukt` : `halteren_wereld_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
