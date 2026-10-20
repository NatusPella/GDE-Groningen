// What is fixed in the Ommelanden on the tiles round it (docs/PROVINCIE-PLAN.md 2.28):
//  - De Koe van Ome Jan: pg_koe.js prepareKoeSites loads the tiles round Ten Boer,
//    picks the farm and the twins' barn from their barns and sheds, on open
//    ground off the roads, and is the same twice;
//  - the doors of the shops and cafés (facilities.js placeWithTiles) are placed
//    on tiles that were not in before and land on open ground.
// Needs game/world (desktop stage, or pack_tiles + build_corridor + build_province).
//   node scripts/ommelandplace_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const { loadGameWorld } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) { console.log('SKIP no game/world with the province layer'); process.exit(0); }
const map = T.world;
const root = new URL('../game/', import.meta.url);
await import('../game/js/player.js');
const F = await import('../game/js/countryfield.js');
const { ensureCountryEdge } = await import('../game/js/countryplan.js');
F.setCountryBounds(map.meta.bounds);
ensureCountryEdge(map);
const TP = await import('../game/js/tileplace.js');
const Koe = await import('../game/js/pg_koe.js');
const Fac = await import('../game/js/facilities.js');
const { isInWater } = await import('../game/js/util.js');
Fac.initFacilities(map, JSON.parse(fs.readFileSync(new URL('facilities.json', root))));

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };

// --- De Koe
ok(Koe.getKoeSites(map) === null, 'the sites are not there before they are prepared');
const t0 = performance.now();
const s = await Koe.prepareKoeSites(map);
const ms = Math.round(performance.now() - t0);
ok(!!s, 'the sites are found on the tiles round Ten Boer');
if (s) {
  ok(Koe.getKoeSites(map) === s, 'getKoeSites returns them now');
  for (const [name, q] of [['the farm', s.farm], ['the barn', s.hide]]) {
    ok(!TP.buildingAt(map, q.x, q.y, 1) && !isInWater(map, q.x, q.y), `${name} stands on open ground`);
  }
  const d = Math.hypot(s.hide.x - s.farm.x, s.hide.y - s.farm.y);
  ok(d > 200 && d < 1100, `the barn is a minute's drive from the farm (${Math.round(d)} m)`);
  const tb = (await import('../game/js/worldplaces.js')).worldPlaceNamed('Ten Boer');
  const df = Math.hypot(s.farm.x - tb.x, s.farm.y - tb.y);
  ok(df > 300 && df < 1800, `the farm lies out of Ten Boer (${Math.round(df)} m)`);
  console.log(`koe: farm ${Math.round(df)} m out of Ten Boer, barn ${Math.round(d)} m on (${ms} ms)`);
}
ok((await Koe.prepareKoeSites(map)) === s, 'preparing twice gives the same sites');

// --- doors out in the Ommelanden, on tiles that are loaded for the moment
const world = { map, vehicles: [] };
const country = Fac.countryFacilities(['horeca', 'supermarket', 'snack']);
ok(country.length > 20, `there are real facilities out in the Ommelanden (${country.length})`);
const far = country.filter((f) => !TP.tilesIn(map, [[f.x, f.y]], 160)).slice(0, 40);
ok(far.length >= 5, `most of them lie on tiles that are not in (${far.length} tested)`);
const t1 = performance.now();
const doors = await TP.withTiles(map, far.map((f) => [f.x, f.y]), () => far.map((f) => Fac.countryDoor(map, f.x, f.y)), { radius: 160 });
const got = doors.filter(Boolean);
ok(got.length >= far.length * 0.6, `most get a door (${got.length}/${far.length}, ${Math.round(performance.now() - t1)} ms)`);
for (const d of got) {
  ok(!TP.buildingAt(map, d.x, d.y, 0.2) && !isInWater(map, d.x, d.y), `a door at (${Math.round(d.x)}, ${Math.round(d.y)}) is on open ground`);
}
const ntiles = T.store.residentKeys.length;
console.log(`ommelandplace: ${n} checks, ${fails} failed (${ntiles} tiles resident)`);
process.exit(fails ? 1 : 0);
