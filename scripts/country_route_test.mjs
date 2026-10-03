// The story's routes to places outside the city map (routing.js +
// countryroute.js): to carbid at boer Roelf's and Rotor Roelf on Eelde from
// the centre, and from the carbid field back to a padel court in town.
//   node scripts/country_route_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const R = await import('../game/js/routing.js');
const root = new URL('../game/', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);
const om = JSON.parse(fs.readFileSync(new URL('ommeland.json', root)));
const pairs = (p) => { const o = []; for (let i = 0; i < p.length; i += 2) o.push([p[i], p[i + 1]]); return o; };
// the bits of countryreal.js REAL that routing reads
map.ommeland = { ready: true, roads: om.roads.map((r) => ({ pts: pairs(r.p), cycle: !!r.c })) };

const padel = map.meta.padel[0];
const CASES = [
  ['centre -> carbid (Beijumerweg)', [0, 0], [1748, -3972]],
  ['centre -> Rotor Roelf, Eelde', [0, 0], [1606, 9909]],
  ['carbid -> padel in town', [1748, -3972], [padel.x, padel.y]],
  ['Eelde -> Martinitoren', [1599, 9914], [0, 0]],
];
let fails = 0;
for (const [name, [px, py], [tx, ty]] of CASES) {
  for (const inVehicle of [null, { isBike: false, isBoat: false }]) {
    const world = { map, time: 0, health: 100, player: { x: px, y: py, inVehicle }, storyGuide: { x: tx, y: ty, name, step: 'x' }, addMessage: () => {} };
    const t0 = performance.now();
    R.updateRouting(0.1, world);
    const r = R.getActiveRoute();
    const ok = !!r && r.pts.length > 2 && Math.hypot(r.pts.at(-1)[0] - tx, r.pts.at(-1)[1] - ty) < 150 && r.length < Math.hypot(tx - px, ty - py) * 2.2;
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} (${inVehicle ? 'drive' : 'walk'}): ${r ? r.pts.length + ' pts, ' + Math.round(r.length) + ' m' : 'no route'} in ${Math.round(performance.now() - t0)} ms`);
  }
}
process.exit(fails ? 1 : 0);
