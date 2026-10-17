// "Laten afleveren" out in the Ommelanden: ownedvehicles.js findParkingSpot
// must find a verge spot on a country road (the tiles' roads, polder roads) that
// is clear of buildings, farms and water, near the player.
//   node scripts/country_delivery_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';

const root = new URL('../game/', import.meta.url);
await import('../game/js/player.js');
const { loadGameWorld } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) { console.log('SKIP no game/world with the province layer'); process.exit(0); }
const map = T.world;
const F = await import('../game/js/countryfield.js');
const { initReal } = await import('../game/js/countryreal.js');
const { buildingAt: tileBuildingAt } = await import('../game/js/tileplace.js');
const buildingAt = (x, y, m) => (tileBuildingAt(map, x, y, m) ? 1 : -1);
const { ensureCountryEdge } = await import('../game/js/countryplan.js');
const { roadGap } = await import('../game/js/countryedge.js');
const { findParkingSpot } = await import('../game/js/ownedvehicles.js');
F.setCountryBounds(map.meta.bounds);
const om = JSON.parse(fs.readFileSync(new URL('ommeland.json', root)));
const bin = zlib.gunzipSync(fs.readFileSync(new URL('ommeland.bin', root)));
initReal(map, { ...om, bin: bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) });
ensureCountryEdge(map);

const model = { name: 'car', len: 4.3, wid: 1.8 };
const world = { map, vehicles: [], time: 0 };
const CASES = [
  ['carbid field (Beijumerweg)', 1683.9, -4025.98],
  ['Eelde', 1774.82, 9945.78],
  ['open polder NE', 5505.95, -11770.51],
  ['west, Ommeland', -9048.54, -1873.44],
  ['past the real data', 16328.69, 14806.14],
];
let fails = 0;

for (const [name, x, y] of CASES) {
  await map.prefetchPoints([[x, y]], { radius: 900 });
  const t0 = performance.now();
  const s = findParkingSpot(world, x, y, model);
  const ms = Math.round(performance.now() - t0);
  const ok = !!s && Math.hypot(s.x - x, s.y - y) < 700 && buildingAt(s.x, s.y, 1) < 0 && roadGap(s.x, s.y, 6) > -0.5;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${s ? `${Math.round(Math.hypot(s.x - x, s.y - y))} m away, '${s.street}', road gap ${roadGap(s.x, s.y, 6).toFixed(1)} m` : 'no spot'} in ${ms} ms`);
}

// the cheat's delivery (Voertuig hier) shares the placement: right beside you, off buildings and water
{
  const { deliverOwnedVehicle } = await import('../game/js/ownedvehicles.js');
  const HERE = [['Eelde', 1774.82, 9945.78, 'hero'], ['open polder NE', 5505.95, -11770.51, 'stadsfiets'], ['west, Ommeland', -9048.54, -1873.44, 'wervelwind']];
  for (const [name, x, y, id] of HERE) {
    await map.prefetchPoints([[x, y]], { radius: 300 });
    const w = { map, vehicles: [], time: 0, money: 0, wanted: 0, messages: [], addMessage() {}, player: { x, y, angle: 0.7, gz: 0, swimming: false, inVehicle: null } };
    const res = deliverOwnedVehicle(w, id, { here: true });
    const v = w.vehicles[0];
    const ok = res.ok && !!v && Math.hypot(v.x - x, v.y - y) < 80 && buildingAt(v.x, v.y, 1) < 0 && !map.isInWater?.(v.x, v.y);
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} here ${id} at ${name}: ${res.ok && v ? Math.round(Math.hypot(v.x - x, v.y - y)) + ' m away' : res.text}`);
  }
}
process.exit(fails ? 1 : 0);
