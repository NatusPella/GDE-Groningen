// The chase camera in the Ommeland: its eye-to-camera ray sees the countryside's
// own solids (farmsteads, silos, tree trunks) like the city's building rays, so a
// look-back camera (ahead of the car) and a normal one behind it never sit inside
// a barn, and vehicles and walkers stop at the same solids. The buildings of
// the tiles are meshes like the city's: their rays are the city's.
//   node scripts/country_camera_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const root = new URL('../game/', import.meta.url);
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
const map = new GameMap(data);
const F = await import('../game/js/countryfield.js');
const { ensureCountryEdge, blockPlan, pushOutOfPlan } = await import('../game/js/countryplan.js');
const { countryRayHit } = await import('../game/js/countrycam.js');
const { setTileTrunks, pushOutOfTrunks } = await import('../game/js/countrywalls.js');
const C = await import('../game/js/controls.js');
F.setCountryBounds(map.meta.bounds);
ensureCountryEdge(map);

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };

// look back works the same out here: pure state, no map in it
ok(C.lookBackActive({ inVehicle: true, qDown: true }) && C.chaseFollowLerp(1 / 30, { lookBack: true }) === 1, 'look back is rigid in a vehicle');

// farmsteads past the real data (the polder generator's): a car heading at one
let farms = 0, blocked = 0, inside = 0, clearBehind = 0;
for (let bx = 14; bx < 30 && farms < 120; bx++) {
  for (let by = 14; by < 30 && farms < 120; by++) {
    for (const f of blockPlan(bx, by).farms) {
      if (F.countryWeight(f.x, f.y) < 0.9) continue;
      const a = ((Math.round(f.x) * 2654435761) % 1000) / 1000 * Math.PI * 2;
      // stand 6 m off the first solid on the ray from the farm's middle outwards
      let r = 60;
      const probe = { x: 0, y: 0 };
      const solid = (rr) => { probe.x = f.x + Math.cos(a) * rr; probe.y = f.y + Math.sin(a) * rr; return pushOutOfPlan(probe, 0.3); };
      while (r > 0 && !solid(r)) r -= 0.5;
      if (r <= 0 || r > 50) continue;
      const ex = f.x + Math.cos(a) * (r + 6), ey = f.y + Math.sin(a) * (r + 6);
      if (solid(r + 6)) continue;
      farms++;
      const ux = -Math.cos(a), uy = -Math.sin(a);
      const hit = countryRayHit(ex, 1.8, ey, ux, 0.12, uy, 10);
      if (hit < 10) blocked++;
      const d = Math.min(10, hit === Infinity ? 10 : hit);
      probe.x = ex + ux * d; probe.y = ey + uy * d;
      if (pushOutOfPlan(probe, 0.3)) inside++;
      if (countryRayHit(ex, 1.8, ey, -ux, 0.12, -uy, 6) === Infinity) clearBehind++;
    }
  }
}
console.log(`${farms} cars facing a farmstead: ${blocked} cameras pulled in, ${inside} still inside, ${clearBehind} clear behind`);
ok(farms > 30, 'enough farmsteads sampled');
ok(blocked > farms * 0.9, 'the look-back camera is pulled in by farm solids');
ok(inside === 0, 'no camera inside a farm solid');
ok(clearBehind > farms * 0.8, 'the camera behind the car is left alone');
ok(countryRayHit(map.meta.bounds[0] + 100, 1.8, map.meta.bounds[1] + 100, 1, 0, 0, 8) === Infinity, 'inside the city the ray is left to the building meshes');

// a tree trunk stops a walker
setTileTrunks(0, 0, [60, 60, 60, 60, 99, 0.3]);
{
  const probe = (r) => { const o = { x: 59.9, y: 60 }; return [pushOutOfTrunks(o, r), o]; };
  const [hit, o] = probe(0.35);
  ok(hit && Math.hypot(o.x - 60, o.y - 60) >= 0.64, 'a trunk pushes a walker out');
}
setTileTrunks(0, 0, null);

console.log(fails ? `${fails} FAIL` : 'country camera ok');
process.exit(fails ? 1 : 0);
