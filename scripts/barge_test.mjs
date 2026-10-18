// Inland barges on the city's shipping canals (#7): they spawn on class 4
// water and the wander AI keeps them from sailing under a fixed bridge they
// do not clear (the 1.8 m city bridges), also with a bridge across the canal.
//   node scripts/barge_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
import { loadCityWorld } from './lib/loadworld.mjs';
const V = await import('../game/js/vehicle.js');
const B = await import('../game/js/boattypes.js');
const L = await import('../game/js/waterlevels.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

const root = new URL('../game/', import.meta.url);
const map = (await loadCityWorld()).map;
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
// several at a time near the player's broad canal, among the everyday boats
{
  const wide = canals.filter((w) => w.bounds[2] - w.bounds[0] > 150 || w.bounds[3] - w.bounds[1] > 150);
  let best = 0, tourFree = true, busy = 0;
  for (const p of wide.slice(0, 6)) {
    const ch = (await import('../game/js/waterindex.js')).waterChannelPoints(map, p, Infinity);
    if (!ch.pts.length) continue;
    const q = ch.pts[Math.floor(ch.pts.length / 2)];
    const w2 = { map, player: { x: q.x, y: q.y }, vehicles: [], time: 0, wanted: 0 };
    for (let k = 0; k < 60; k++) V.manageBoatPopulation(w2, { target: 5 });
    const barges = w2.vehicles.filter((v) => v.model.kind === 'binnenvaart');
    best = Math.max(best, barges.length);
    for (let i = 0; i < barges.length; i++) for (let j = i + 1; j < barges.length; j++) if (Math.hypot(barges[i].x - barges[j].x, barges[i].y - barges[j].y) < 50) tourFree = false;
    for (const v of w2.vehicles) if (v.model.kind !== 'binnenvaart' && barges.some((b) => Math.hypot(b.x - v.x, b.y - v.y) < 30)) tourFree = false;
    busy++;
  }
  ok(busy > 0, 'the population manager runs on the broad canals', busy);
  console.log('barges at once near a broad canal:', best);
  ok(best >= 2, 'several barges at once near a broad canal', best);
  ok(best <= 4, 'at most four barges at a time', best);
  ok(tourFree, 'barges start clear of each other and of the other boats');
}
ok(spawned >= 2, 'barges spawn on the shipping canals', spawned);
ok(sailed >= spawned * 0.5, 'most barges keep sailing (150 m in 6 minutes)', `${sailed} of ${spawned}`);
ok(bad === 0, 'no NaN positions');
ok(under === 0, 'a barge never sits under a bridge it does not clear', `${under} of ${steps} steps`);
console.log(`${n - fails}/${n} barge checks passed (${spawned} barges, ${steps} steps)`);
process.exit(fails ? 1 : 0);
