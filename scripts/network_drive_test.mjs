// The network drive (docs/PROVINCIE-PLAN.md 2.11, punt 8) as a test:
//   node scripts/network_drive_test.mjs
// every main road (secondary and up, and their slip roads) and every road
// with a height profile driven both ways at its speed with the player's car
// (ringcheck.js driveAcross, 25 m on into the ways that carry on): no knock,
// no jump, no fall off a deck, no sinking, no push off the road; and the
// water crossings of the ring with the strict deck check
// (ringcheck.js driveWaterCrossings). The whole network, minor streets and
// the solids on every lane included, is scripts/world/drive_audit.mjs.
import './node3d.mjs';
import fs from 'node:fs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const RC = await import('../game/js/ringcheck.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const root = new URL('../game/', import.meta.url);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
const map = new GameMap(data);
const world = { map, flitspaalen: [], player: { x: 0, y: 0 }, vehicles: [], props: [], particles: [], stats: {}, time: 0, addMessage() {}, audioEvents: [] };
// the signal poles stand in the world as in the game (they are props a car can hit)
(await import('../game/js/trafficlights.js')).initTrafficLights(world);
const len = (P) => P.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - P[i][0], q[1] - P[i][1]), 0);

const roads = map.roads.filter((r) => r.cat !== 'foot' && r.cat !== 'cycle' && !r.busOnly && (r.cat === 'major' || r.z) && len(r.pts) >= 8);
const bad = [];
let drives = 0;
for (const r of roads) {
  const full = RC.crossingPath(map, { road: r, s0: 0, s1: len(r.pts) }, 25);
  if (full.length < 12) continue;
  const speed = Math.max(6, Math.min(r.speed || 11, 30));
  for (let a = 0; a < full.length - 12; a += 400) {
    const piece = full.slice(a, Math.min(full.length, a + 425));
    if (piece.length < 12) continue;
    for (const dir of [1, -1]) {
      drives++;
      const res = await RC.driveAcross(world, dir > 0 ? piece : piece.slice().reverse(), speed, { jump: true, maxT: 60 });
      if (res) bad.push(`${res.what} ${r.ref || ''} ${r.name || r.type} (${dir > 0 ? 'mee' : 'tegen'}) at ${res.x}, ${res.y} z ${res.z}`);
    }
  }
}
console.log(`     ${roads.length} main and profiled roads, ${drives} drives`);
ok(drives > 1000 && !bad.length, 'main and profiled roads driven both ways at speed', `${bad.length} failed: ${bad.slice(0, 5).join('; ')}`);

const wet = await RC.driveWaterCrossings(world);
ok(wet.drives > 200 && !wet.fails.length, 'the ring\'s water crossings, every lane both ways, strict deck check', `${wet.fails.length} of ${wet.drives}: ${JSON.stringify(wet.fails.slice(0, 2))}`);

console.log(`${n - fails}/${n} network drive checks passed`);
process.exit(fails ? 1 : 0);
