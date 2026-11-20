// Geparkeerde auto's op de echte tegels (#1050): de stoepparkeerplekken en parkeervakken die parkedcars.js maakt
// staan niet in elkaar, niet in een gebouw, niet in het water en niet in een rijbaan.
//   node scripts/geparkeerd_wereld_test.mjs [--verbose]
// Slaat over zonder game/world (desktop stage).
import './node3d.mjs';
const verbose = process.argv.includes('--verbose');
await import('../game/js/player.js');
const { loadGameWorld, loadArea } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) { console.log('SKIP geparkeerd_wereld_test: geen game/world'); process.exit(0); }
const map = T.world;
const PC = await import('../game/js/parkedcars.js');
const { pointInPolygon, inMapWater } = await import('../game/js/util.js');
const { inPassage } = await import('../game/js/passages.js');
const { pureOverlap } = await import('./lib/voertuigoverlap.mjs');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log('FAIL', m, info); } };

const SPOTS = [['centrum', 192, 138], ['Oosterpoort', 900, 100], ['Helpman', 100, -1100], ['dorp Wildeplaats', 25435, 21226]];
const tot = { cars: 0, overlap: 0, building: 0, water: 0, lane: 0 };
const ex = [];
for (const [name, sx, sy] of SPOTS) {
  await loadArea(T, [sx - 300, sy - 300, sx + 300, sy + 300]);
  const world = { map, vehicles: [], pedestrians: [], bullets: [], particles: [], time: 0, wanted: 0, player: { x: sx, y: sy, inVehicle: null, radius: 0.35 }, addMessage() {}, stats: {}, props: [] };
  const q = map.nearestRoadPoint(sx, sy, 300, true);
  if (q) { world.player.x = q.x; world.player.y = q.y; }
  PC.manageParkedCars(world);
  for (let i = 0; i < 4000 && (world.time += 0.05) >= 0; i++) { PC.tickParkedCars(world); if (i % 60 === 0) PC.manageParkedCars(world); }
  const cars = [...PC.sleepingParkedCars(world), ...world.vehicles.filter((v) => v.parked)];
  const mine = { cars: cars.length, overlap: 0, building: 0, water: 0, lane: 0 };
  for (let i = 0; i < cars.length; i++) {
    const v = cars[i];
    for (let j = i + 1; j < cars.length; j++) if (pureOverlap(v, cars[j], 1)) { mine.overlap++; if (ex.length < 8) ex.push(`${name} overlap ${v.x.toFixed(0)},${v.y.toFixed(0)}`); }
    const c = Math.cos(v.angle), s = Math.sin(v.angle), hl = v.halfLen, hw = (v.model.wid || 1.8) / 2;
    let inB = false, inW = false;
    for (const [lx, ly] of [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw]]) {
      const px = v.x + lx * c - ly * s, py = v.y + lx * s + ly * c;
      if (map.buildingsNear(px, py, 1).some((b) => pointInPolygon(px, py, b.pts) && !inPassage(map, b, px, py, 0, 'car'))) inB = true;
      if (inMapWater(map, px, py)) inW = true;
    }
    if (inB) { mine.building++; if (ex.length < 8) ex.push(`${name} gebouw ${v.x.toFixed(0)},${v.y.toFixed(0)}`); }
    if (inW) mine.water++;
    // in de rijbaan van een weg: het midden van de auto dichter bij de hartlijn dan de halve breedte min de halve autobreedte
    for (const R of map.roadsNear(v.x, v.y, 10)) {
      if (R.cat === 'foot' || R.cat === 'cycle' || R.busOnly || R.z || (R.width || 0) < 3) continue;
      let d = 99;
      for (let k = 0; k < R.pts.length - 1; k++) {
        const ax = R.pts[k][0], ay = R.pts[k][1], ex2 = R.pts[k + 1][0] - ax, ey2 = R.pts[k + 1][1] - ay, L2 = ex2 * ex2 + ey2 * ey2 || 1;
        const u = Math.max(0, Math.min(1, ((v.x - ax) * ex2 + (v.y - ay) * ey2) / L2));
        d = Math.min(d, Math.hypot(ax + ex2 * u - v.x, ay + ey2 * u - v.y));
      }
      if (d < R.width / 2 - hw + 0.1) { mine.lane++; if (ex.length < 8) ex.push(`${name} rijbaan ${R.name || R.type} ${v.x.toFixed(0)},${v.y.toFixed(0)} d ${d.toFixed(1)} w ${R.width}`); break; }
    }
  }
  for (const k of Object.keys(tot)) tot[k] += mine[k];
  console.log(`${name}: ${mine.cars} geparkeerd, overlap ${mine.overlap}, in gebouw ${mine.building}, in water ${mine.water}, in rijbaan ${mine.lane}`);
}
for (const e of ex) console.log('  ' + e);
const strict = !!process.env.STRICT;
ok(tot.cars > 40, 'er staan auto\'s geparkeerd', String(tot.cars));
ok(tot.overlap <= (strict ? 0 : Math.ceil(tot.cars * 0.01)), 'geparkeerde auto\'s staan niet in elkaar', String(tot.overlap));
ok(tot.building <= (strict ? 0 : Math.ceil(tot.cars * 0.01)), 'geen geparkeerde auto in een gebouw', String(tot.building));
ok(tot.water === 0, 'geen geparkeerde auto in het water', String(tot.water));
ok(tot.lane <= (strict ? 0 : Math.ceil(tot.cars * 0.02)), 'geen geparkeerde auto in een rijbaan', String(tot.lane));
console.log(`geparkeerd_wereld_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
