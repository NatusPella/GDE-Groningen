// The chase camera in the Ommeland: its eye-to-camera ray sees the countryside's
// solids (real buildings, farms, tree trunks) like the city's building rays, so a
// look-back camera (ahead of the car) and a normal one behind it never sit inside
// a barn, and vehicles and walkers stop at the same solids.
//   node scripts/country_camera_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';

const root = new URL('../game/', import.meta.url);
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);
const F = await import('../game/js/countryfield.js');
const { initReal, buildingAt, REAL } = await import('../game/js/countryreal.js');
const { ensureCountryEdge, pushOutOfPlan } = await import('../game/js/countryplan.js');
const { countryRayHit } = await import('../game/js/countrycam.js');
const { setTileTrunks, pushOutOfTrunks } = await import('../game/js/countrywalls.js');
const C = await import('../game/js/controls.js');
F.setCountryBounds(map.meta.bounds);
const om = JSON.parse(fs.readFileSync(new URL('ommeland.json', root)));
const bin = zlib.gunzipSync(fs.readFileSync(new URL('ommeland.bin', root)));
initReal(map, { ...om, bin: bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) });
ensureCountryEdge(map);

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };

// look back works the same out here: pure state, no map in it
ok(C.lookBackActive({ inVehicle: true, qDown: true }) && C.chaseFollowLerp(1 / 30, { lookBack: true }) === 1, 'look back is rigid in a vehicle');

// buildings away from the city: a car 9 m from a wall heading at it
let n = 0, blocked = 0, inside = 0, clearBehind = 0, behind = 0;
for (let i = 0; i < REAL.bx.length && n < 300; i += 7) {
  const bx = REAL.bx[i], by = REAL.by[i];
  if (F.countryWeight(bx, by) < 0.9) continue;
  const a = ((i * 2654435761) % 1000) / 1000 * Math.PI * 2;
  // stand 5 m off the wall on the ray from the building's centre outwards
  let r = 80;
  while (r > 0 && buildingAt(bx + Math.cos(a) * r, by + Math.sin(a) * r, 0) < 0) r -= 0.5;
  if (r <= 0 || r > 70) continue;
  const ex = bx + Math.cos(a) * (r + 5), ey = by + Math.sin(a) * (r + 5);
  if (buildingAt(ex, ey, 1) >= 0 || F.realWater(ex, ey) > -1) continue;
  n++;
  // the look-back camera ahead of the car: 8 m along the heading, 3.2 m up
  const ux = -Math.cos(a), uy = -Math.sin(a);
  const hit = countryRayHit(ex, 1.8, ey, ux, 0.12, uy, 8);
  if (hit < 8) blocked++;
  const d = Math.min(8, hit === Infinity ? 8 : hit);
  const cx = ex + ux * d, cy = ey + uy * d;
  if (buildingAt(cx, cy, 0) >= 0) inside++;
  // the camera behind the car (away from the building) is clear
  if (countryRayHit(ex, 1.8, ey, -ux, 0.12, -uy, 8) === Infinity) clearBehind++;
  behind++;
}
console.log(`${n} cars facing a real building: ${blocked} cameras pulled in, ${inside} still inside, ${clearBehind}/${behind} clear behind`);
ok(n > 100, 'enough buildings sampled');
ok(blocked > n * 0.9, 'the look-back camera is pulled in by buildings');
ok(inside === 0, 'no camera inside a building');
ok(clearBehind > behind * 0.8, 'the camera behind the car is left alone');
ok(countryRayHit(map.meta.bounds[0] + 100, 1.8, map.meta.bounds[1] + 100, 1, 0, 0, 8) === Infinity, 'inside the city the ray is left to the building meshes');

// a camera above the roofs is not blocked
{
  const i = REAL.bx.findIndex((x, k) => F.countryWeight(x, REAL.by[k]) > 0.9);
  const bx = REAL.bx[i], by = REAL.by[i];
  ok(countryRayHit(bx - 12, 14, by, 1, 0, 0, 24) === Infinity, 'a ray over the roofs is clear');
  ok(countryRayHit(bx - 12, 1.8, by, 1, 0, 0, 24) < 24, 'a low ray through the building is blocked');
}

// a tree trunk stops the ray, a car and a walker alike
setTileTrunks(0, 0, [60, 60, 60, 60, 99, 0.3]);
{
  const probe = (r) => { const o = { x: 59.9, y: 60 }; return [pushOutOfTrunks(o, r), o]; };
  const [hit, o] = probe(0.35);
  ok(hit && Math.hypot(o.x - 60, o.y - 60) >= 0.64, 'a trunk pushes a walker out');
}
setTileTrunks(0, 0, null);

console.log(fails ? `${fails} FAIL` : 'country camera ok');
process.exit(fails ? 1 : 0);
