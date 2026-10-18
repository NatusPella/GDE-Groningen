// Inland barges on the city's shipping canals (#7): they spawn on class 4
// water and the wander AI keeps them from sailing under a fixed bridge they
// do not clear (the 1.8 m city bridges), also with a bridge across the canal.
//   node scripts/barge_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const V = await import('../game/js/vehicle.js');
const B = await import('../game/js/boattypes.js');
const L = await import('../game/js/waterlevels.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

const root = new URL('../game/', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);
const canals = map.water.filter((w) => w.nav >= 4);
ok(canals.length > 0, 'the city has class 4 water', canals.length);

let spawned = 0, under = 0, steps = 0, bad = 0, sailed = 0;
const rng = seeded(11);
const world = { player: { x: 1e6, y: 1e6 }, wanted: 0, vehicles: [], time: 0 };
for (const poly of canals.slice(0, 8)) {
  for (const kind of ['spits', 'kempenaar']) {
    const v = V.spawnBoatOnWater(map, poly, rng, { model: B.BOAT_KINDS[kind] });
    if (!v) continue;
    spawned++;
    let path = 0; 
    for (let i = 0; i < 4000; i++) {   // ~ 6.5 minutes at 0.1 s
      V.updateBoatAI(v, 0.1, map, world, rng);
      steps++;
      path += Math.abs(v.speed) * 0.1;
      if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) { bad++; break; }
      const w = L.waterAt(map, v.x, v.y);
      if (w && !L.passesUnder(L.airDraftOf(v), w.clearanceAbove)) under++;
    }
    if (path > 150) sailed++;
  }
}
ok(spawned >= 2, 'barges spawn on the shipping canals', spawned);
ok(sailed >= spawned * 0.5, 'most barges keep sailing (150 m in 6 minutes)', `${sailed} of ${spawned}`);
ok(bad === 0, 'no NaN positions');
ok(under === 0, 'a barge never sits under a bridge it does not clear', `${under} of ${steps} steps`);
console.log(`${n - fails}/${n} barge checks passed (${spawned} barges, ${steps} steps)`);
process.exit(fails ? 1 : 0);
