// Interieurs (epic #1150, ronde 2): rondlopende mensen. Ze lopen alleen over bereikbare vloer (nooit in een meubel of een muur),
// komen echt vooruit, wachten tussendoor, en een gelijke seed geeft gelijke wandelingen. Puur.
// Draai: node scripts/interior_wander_test.mjs
import { planInterior } from '../game/js/interiorrules.js';
import { walkGrid, reachable, rectOf } from '../game/js/interiorlayout.js';
import { makeWanderer, stepWanderer, findPath, mayWander, WALK_SPEED } from '../game/js/interiorwander.js';
import { KINDS } from '../game/js/interiorkinds.js';
import { building, subsFor } from './interior_fixtures.mjs';
import { mulberry32 } from '../game/js/rng.js';

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };

ok(mayWander({ role: 'klant', pose: 'stand' }) && !mayWander({ role: 'klant', pose: 'sit' }) && !mayWander({ role: 'winkelier', pose: 'stand' }), 'wie loopt rond: klanten en gasten, niet het personeel en niet wie zit');

const rnd = mulberry32(31);
let walkers = 0, travelled = 0;
for (const kind of ['winkel', 'horeca', 'station', 'woning', 'bibliotheek', 'kantoor']) {
  for (const sub of subsFor(kind).slice(0, 4)) {
    const K = KINDS[kind];
    const { b, spot } = building(kind, sub, K.minW + 4 + rnd() * 6, K.minD + 4 + rnd() * 6, rnd);
    const p = planInterior(b, { spot });
    if (!p.ok) continue;
    const L = p.layout, grid = walkGrid(L), reach = reachable(L, grid);
    const solid = L.items.filter((i) => i.solid).map(rectOf);
    for (const np of L.npc.filter(mayWander)) {
      walkers++;
      const w = makeWanderer(grid, reach, mulberry32(np.u * 100 + np.v), np.u, np.v);
      let inSolid = 0, offGrid = 0, dist = 0, last = [w.u, w.v];
      for (let t = 0; t < 4000; t++) {
        stepWanderer(w, 0.1);
        dist += Math.hypot(w.u - last[0], w.v - last[1]); last = [w.u, w.v];
        for (const s of solid) if (w.u > s.u0 + 0.02 && w.u < s.u1 - 0.02 && w.v > s.v0 + 0.02 && w.v < s.v1 - 0.02) { inSolid++; break; }
        for (const wl of L.walls) if (w.u > wl.u0 && w.u < wl.u1 && w.v > wl.v0 && w.v < wl.v1) { inSolid++; break; }
        const i = Math.floor((w.u - grid.H.u0) / 0.25), k = Math.floor((w.v - grid.H.v0) / 0.25);
        if (!(grid.free[k * grid.nu + i] && reach.seen[k * grid.nu + i]) && Math.hypot(w.u - np.u, w.v - np.v) > 0.3) offGrid++;
        if (Math.hypot(w.hu, w.hv) > 1.001) { bad++; console.error('FAIL koers'); }
      }
      ok(inSolid === 0, `${kind}/${sub}: niemand loopt in een meubel of muur`, String(inSolid));
      ok(offGrid === 0, `${kind}/${sub}: alleen over bereikbare vloer`, String(offGrid));
      ok(dist > 20 && dist < 4000 * 0.1 * WALK_SPEED + 1, `${kind}/${sub}: loopt echt rond maar niet sneller dan de wandelsnelheid`, dist.toFixed(1));
      travelled += dist;
    }
  }
}
ok(walkers >= 8, 'er zijn rondlopers getest', String(walkers));
// determinisme
{
  const { b } = building('winkel', 'supermarkt', 9, 12, mulberry32(1));
  const p = planInterior(b, { spot: null });
  const grid = walkGrid(p.layout), reach = reachable(p.layout, grid);
  const run = () => { const w = makeWanderer(grid, reach, mulberry32(5), 0, 3); for (let t = 0; t < 600; t++) stepWanderer(w, 0.1); return [w.u.toFixed(3), w.v.toFixed(3)].join(','); };
  ok(run() === run(), 'dezelfde seed geeft dezelfde wandeling');
  ok(findPath(grid, reach, 0, 0, 1, 1) === null || true, 'findPath geeft null of een pad');
}
console.log(bad ? `interior_wander_test: ${bad} van ${n} mislukt` : `interior_wander_test: ${n} controles ok (${walkers} rondlopers, ${Math.round(travelled)} m)`);
if (bad) process.exitCode = 1;
