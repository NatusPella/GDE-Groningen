// "Laten afleveren" out in the Ommelanden: ownedvehicles.js findParkingSpot
// must find a verge spot on a country road (real roads, polder roads) that
// is clear of buildings, farms and water, near the player.
//   node scripts/country_delivery_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';

const root = new URL('../game/', import.meta.url);
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);
const F = await import('../game/js/countryfield.js');
const { initReal, buildingAt } = await import('../game/js/countryreal.js');
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
  ['carbid field (Beijumerweg)', 1748, -3972],
  ['Eelde', 1606, 9909],
  ['open polder NE', 5700, -11600],
  ['west, Ommeland', -9000, -2000],
  ['past the real data', 16000, 15000],
];
let fails = 0;

for (const [name, x, y] of CASES) {
  const t0 = performance.now();
  const s = findParkingSpot(world, x, y, model);
  const ms = Math.round(performance.now() - t0);
  const ok = !!s && Math.hypot(s.x - x, s.y - y) < 700 && buildingAt(s.x, s.y, 1) < 0 && roadGap(s.x, s.y, 6) > -0.5;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${s ? `${Math.round(Math.hypot(s.x - x, s.y - y))} m away, '${s.street}', road gap ${roadGap(s.x, s.y, 6).toFixed(1)} m` : 'no spot'} in ${ms} ms`);
}
process.exit(fails ? 1 : 0);
