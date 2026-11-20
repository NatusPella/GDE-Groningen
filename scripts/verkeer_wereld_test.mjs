// Verkeersaudit op de echte tegels (#1047): de AI-auto's van het spel (updateTrafficAI, populatiebeheer, stoplichten)
// rijden op een virtuele klok door een paar echte plekken; strikte controles per auto en per stap:
//   - geen AI-auto met het lichaam in een gebouw (resolveVehicleBuildingCollision raakt een voetafdruk),
//   - geen AI-auto in het water (midden of een hoek op open water, behalve op een brug/dek),
//   - geen AI-auto ver naast zijn weg (verder dan de halve breedte plus een trottoirmarge),
//   - geen auto die lang vastzit zonder rood licht of file (stuckFor / waitFor),
//   - geen blijvende overlap tussen twee AI-auto's.
//   node scripts/verkeer_wereld_test.mjs [--verbose] [--secs=240]   (STRICT=1: elke afwijking is een fout)
// Slaat over zonder game/world (desktop stage).
import './node3d.mjs';
const verbose = process.argv.includes('--verbose');
const secsArg = process.argv.find((a) => a.startsWith('--secs='));
const TT = secsArg ? +secsArg.slice(7) : 240;
let seed = +(process.env.SEED || 777);
Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
let virtueleMs = 0;
try { performance.now = () => virtueleMs; } catch (e) { /* oudere Node */ }
await import('../game/js/player.js');
const { loadGameWorld, loadArea } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) { console.log('SKIP verkeer_wereld_test: geen game/world'); process.exit(0); }
const map = T.world;
const V = await import('../game/js/vehicle.js');
const { pointInPolygon } = await import('../game/js/util.js');
const { inPassage } = await import('../game/js/passages.js');
const TL = await import('../game/js/trafficlights.js');
const { pureOverlap } = await import('./lib/voertuigoverlap.mjs');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log('FAIL', m, info); } };

// (naam, RD-punt in spelcoordinaten): het centrum, een buitenwijk, een dorp en een stuk ringweg
const SPOTS = [
  ['centrum', 191.86, 138.11],
  ['oostwijk', 1500, 400],
  ['dorp Wildeplaats', 25435, 21226],
  ['zuidring', 300, -2600],
];
const DT = 1 / 30;
// waar staat de auto ten opzichte van zijn weg en de dichtstbijzijnde voetafdruk (voor het rapport)
function wallInfo(v) {
  let lat = 99, bd = 99, bt = '';
  const P = v.road.pts;
  for (let i = 0; i < P.length - 1; i++) {
    const ax = P[i][0], ay = P[i][1], ex = P[i + 1][0] - ax, ey = P[i + 1][1] - ay, L2 = ex * ex + ey * ey || 1;
    const u = Math.max(0, Math.min(1, ((v.x - ax) * ex + (v.y - ay) * ey) / L2));
    lat = Math.min(lat, Math.hypot(ax + ex * u - v.x, ay + ey * u - v.y));
  }
  for (const b of map.buildingsNear(v.x, v.y, 8)) for (let i = 0; i < b.pts.length - 1; i++) {
    const ax = b.pts[i][0], ay = b.pts[i][1], ex = b.pts[i + 1][0] - ax, ey = b.pts[i + 1][1] - ay, L2 = ex * ex + ey * ey || 1;
    const u = Math.max(0, Math.min(1, ((v.x - ax) * ex + (v.y - ay) * ey) / L2));
    const d = Math.hypot(ax + ex * u - v.x, ay + ey * u - v.y);
    if (d < bd) { bd = d; bt = b.type || ''; }
  }
  return `afw ${lat.toFixed(1)} gebouw ${bd.toFixed(1)} ${bt} half ${v.halfLen} ${v.tightTurn ? 'draai' : ''}`;
}
const total = { inside: 0, wall: 0, water: 0, offroad: 0, stuck: 0, overlapLong: 0 };
const report = [];

for (const [name, sx, sy] of SPOTS) {
  await loadArea(T, [sx - 600, sy - 600, sx + 600, sy + 600]);
  const q = map.nearestRoadPoint(sx, sy, 400, true);
  if (!q) { console.log(`(geen weg bij ${name}, overgeslagen)`); continue; }
  const cx = q.x, cy = q.y;
  const world = { map, vehicles: [], pedestrians: [], bullets: [], particles: [], time: 0, wanted: 0, player: { x: cx, y: cy, inVehicle: {}, radius: 0.35 }, addMessage() {}, stats: {}, props: [] };
  TL.initTrafficLights(world);
  const seen = { inside: new Map(), wall: new Map(), water: new Map(), offroad: new Map(), stuck: new Map() };
  const note = (kind, v, t, extra = '') => {
    if (seen[kind].has(v.id)) return;
    seen[kind].set(v.id, `${t.toFixed(0)}s ${v.model && v.model.name} op ${v.road && (v.road.name || v.road.type)} bij ${v.x.toFixed(0)},${v.y.toFixed(0)} ${extra}`);
  };
  const lastPair = new Map();
  let longOverlap = 0;
  for (let t = 0, f = 0; t < TT; t += DT, f++) {
    virtueleMs = t * 1000;
    world.time = t;
    if (f % 30 === 0) V.manageTrafficPopulation(world, { target: 30, spawnMin: 30, spawnMax: 200, despawnDist: 260 });
    TL.updateTrafficLights(DT, world);
    for (const v of world.vehicles) {
      if (v.isBoat || v.parked || v.driver === 'player') continue;
      V.updateTrafficAI(v, DT, map, world, Math.random);
      if (v.road && !v.wrecked && !v.isHeroCar) {
        // het midden van de auto in een voetafdruk (voor het wegduwen): de AI-baan loopt dan door het gebouw
        if (!(v.z > 3) && map.buildingsNear(v.x, v.y, 3).some((b) => pointInPolygon(v.x, v.y, b.pts) && !inPassage(map, b, v.x, v.y, 0.35, 'car'))) note('inside', v, t, `v ${v.speed.toFixed(1)} cat ${v.road.cat}`);
        if (V.resolveVehicleBuildingCollision(v, map, DT) && Math.abs(v.speed) > 1.5) note('wall', v, t, `v ${v.speed.toFixed(1)} cat ${v.road.cat} w ${v.road.width} ${wallInfo(v)}`);
      }
    }
    V.resolveVehicleVehicleCollisions(world.vehicles, world);
    if (world.particles.length > 200) world.particles.length = 0;
    if (f % 6) continue;
    const live = world.vehicles.filter((v) => !v.parked && !v.isBoat && !v.wrecked && v.road && Math.hypot(v.x - cx, v.y - cy) < 200);
    for (const v of live) {
      if (!(v.z > 3) && map.inWaterRaw(v.x, v.y)) note('water', v, t);
      const half = (v.road.width || 6) / 2;
      let d = 99;
      for (const R of map.roadsNear(v.x, v.y, 14)) {
        if (R.cat === 'foot' || R.cat === 'cycle' || R.busOnly) continue;
        const P = R.pts;
        for (let i = 0; i < P.length - 1; i++) {
          const ax = P[i][0], ay = P[i][1], ex = P[i + 1][0] - ax, ey = P[i + 1][1] - ay, L2 = ex * ex + ey * ey || 1;
          const u = Math.max(0, Math.min(1, ((v.x - ax) * ex + (v.y - ay) * ey) / L2));
          d = Math.min(d, Math.hypot(ax + ex * u - v.x, ay + ey * u - v.y) - (R.width || 6) / 2);
        }
      }
      const rd = 0;
      if (d > rd + 3.5) note('offroad', v, t, `${d.toFixed(1)} m naast het wegdek`);
      if ((v.stuckFor || 0) > 20 || ((v.waitFor || 0) > 40 && !v._atLight)) note('stuck', v, t, `stuck ${Math.round(v.stuckFor || 0)} wait ${Math.round(v.waitFor || 0)} ${v._why || ''}`);
    }
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j], k = a.id * 100000 + b.id;
      if (pureOverlap(a, b)) { const s = (lastPair.get(k) || t) ; lastPair.set(k, s); if (t - s > 20) { longOverlap++; lastPair.set(k, t + 1e6); } }
      else lastPair.delete(k);
    }
  }
  for (const k of ['inside', 'wall', 'water', 'offroad', 'stuck']) { total[k] += seen[k].size; for (const [, s] of [...seen[k]].slice(0, 4)) report.push(`${name} ${k}: ${s}`); }
  total.overlapLong += longOverlap;
  console.log(`${name}: ${world.vehicles.length} voertuigen aan het eind; in gebouw ${seen.inside.size}, schaaf ${seen.wall.size}, water ${seen.water.size}, naast weg ${seen.offroad.size}, vast ${seen.stuck.size}, blijvende overlap ${longOverlap}`);
}
for (const r of report) console.log('  ' + r);
// De streefwaarde is overal 0 (STRICT=1); de standaardgrenzen zijn de gemeten stand na de wegtoets van #1047 (zie docs/VERKEER-AUDIT-21-11.md),
// zodat een verslechtering de test laat falen terwijl de restpunten (hoekensnijden bij kruispunten, doodlopende landpaden aan de sloot) open staan.
const strict = !!process.env.STRICT;
const lim = (k, v) => (strict ? 0 : v);
ok(total.water <= lim('water', 3), 'geen (of bijna geen) AI-auto in het water', String(total.water));
ok(total.inside <= lim('inside', 3), 'geen AI-auto met het midden in een gebouw', String(total.inside));
ok(total.wall <= lim('wall', 55), 'AI-autos schaven zelden langs een gevel', String(total.wall));
ok(total.offroad <= lim('offroad', 14), 'geen AI-auto ver van zijn weg', String(total.offroad));
ok(total.stuck <= lim('stuck', 4), 'geen AI-auto die lang vastzit zonder reden', String(total.stuck));
ok(total.overlapLong === 0, 'geen blijvende overlap tussen AI-autos', String(total.overlapLong));
console.log(`verkeer_wereld_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
