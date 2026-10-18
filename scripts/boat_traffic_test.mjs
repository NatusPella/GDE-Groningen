// Boats among boats on a synthetic canal (#155): two tour boats meeting head-on,
// a tour boat behind a barge, a boat wedged in a dead end (the watchdog backs it
// out and finally flags it for removal), and the player's boat in the way.
//   node scripts/boat_traffic_test.mjs
import './node3d.mjs';

const V = await import('../game/js/vehicle.js');
const B = await import('../game/js/boattypes.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// a straight canal, x 0..L, y -W/2..W/2, optional closed end (the dead end)
function canal(L, W) {
  const pts = [[0, -W / 2], [L, -W / 2], [L, W / 2], [0, W / 2]];
  const poly = { pts, bounds: [0, -W / 2, L, W / 2], kind: 'kanaal', lv: -2.3, dp: 3, nav: 3, body: 1 };
  // the channel points the boats wander between, scanned up front (the game scans them over frames: not deterministic)
  const ch = { pts: [], done: true };
  for (let x = 8; x < L - 8; x += 9) for (let y = -W / 2 + 4; y <= W / 2 - 4; y += 4) ch.pts.push({ x, y, d: Math.min(W / 2 - Math.abs(y), 12), a: 0 });
  poly._channel = ch;
  return {
    water: [poly], poly,
    waterNear: () => [poly], isOnBridge: () => false, roadsNear: () => [], buildingsNear: () => [], coveredAt: () => false,
  };
}
const boat = (map, kind, x, y, angle) => {
  const v = new V.Vehicle(x, y, angle, B.BOAT_KINDS[kind]);
  v.isBoat = true; v.waterPoly = map.poly;
  return v;
};
function run(map, vehicles, seconds, rng, each) {
  const world = { player: { x: 1e6, y: 1e6 }, wanted: 0, vehicles, time: 0, particles: [] };
  const dt = 0.1;
  for (let i = 0; i < seconds / dt; i++) {
    world.time += dt;
    for (const v of vehicles) if (v.driver !== 'player' && !v.moored) V.updateBoatAI(v, dt, map, world, rng);
    V.resolveVehicleVehicleCollisions(vehicles, world);
    world.particles.length = 0;
    if (each) each(world, i);
  }
  return world;
}

// 1. head-on: both pass and keep sailing
{
  const map = canal(500, 22), rng = seeded(3);
  const a = boat(map, 'rondvaart', 60, -3, 0), b = boat(map, 'rondvaart', 440, 3, Math.PI);
  let stillMax = 0, still = 0, last = [a.x, a.y, b.x, b.y], pathA = 0, passed = false;
  run(map, [a, b], 240, rng, (w, i) => {
    if (i % 10 === 0) {
      const m = Math.hypot(a.x - last[0], a.y - last[1]) + Math.hypot(b.x - last[2], b.y - last[3]);
      pathA += Math.hypot(a.x - last[0], a.y - last[1]);
      const meeting = Math.hypot(a.x - b.x, a.y - b.y) < 120;   // not the closed ends of the canal
      still = m < 0.5 && meeting ? still + 1 : 0; stillMax = Math.max(stillMax, still);
      last = [a.x, a.y, b.x, b.y];
    }
    if (a.x > b.x) passed = true;
  });
  ok(Number.isFinite(a.x) && Number.isFinite(b.x), 'head-on: no NaN');
  ok(pathA > 250, 'head-on: the boats keep sailing', pathA.toFixed(0));
  ok(stillMax < 8, 'head-on: never both standing still for 8 s while they meet', stillMax);
}

// 2. a tour boat behind a slow barge keeps its distance and does not stop for good
{
  const map = canal(900, 26), rng = seeded(5);
  const barge = boat(map, 'spits', 300, 0, 0), tour = boat(map, 'rondvaart', 150, 0, 0);
  barge.speed = 1;
  let minGap = Infinity;
  run(map, [barge, tour], 120, rng, () => { if (Math.abs(tour.y - barge.y) < barge.halfWid + tour.halfWid) minGap = Math.min(minGap, Math.abs(barge.x - tour.x) - barge.halfLen - tour.halfLen); });
  ok(minGap > -0.3, 'behind a barge: no overlap', minGap.toFixed(2));
  ok(tour.x > 200 || Math.hypot(tour.x - 150, tour.y) > 60, 'behind a barge: it still gets somewhere', tour.x.toFixed(0));
}

// 3. the watchdog: a boat jammed in a dead end backs out; one that cannot is flagged
{
  const map = canal(60, 9), rng = seeded(9);
  const v = boat(map, 'rondvaart', 20, 0, 0);
  let backed = false;
  run(map, [v], 90, rng, () => { if (v._backT > 0) backed = true; });
  ok(backed, 'watchdog: a standing boat backs out');
  ok((v.stuckCount || 0) >= 1, 'watchdog: counts the tries', v.stuckCount);
  const wedged = boat(map, 'kempenaar', 30, 0, 0);   // 50 m barge in a 9 m, 60 m long cul-de-sac: no way out
  const world = run(map, [wedged], 120, rng);
  ok(wedged.stuckAway === true, 'watchdog: a boat that cannot get free is flagged', `stuck ${wedged.stuckCount}`);
  const w2 = { map, player: { x: 500, y: 0 }, vehicles: [wedged], time: 0 };
  V.manageBoatPopulation(w2, { target: 0 });
  ok(!w2.vehicles.includes(wedged), 'watchdog: removed once the player is far enough away');
  const w3 = { map, player: { x: 30, y: 20 }, vehicles: [wedged], time: 0 };
  V.manageBoatPopulation(w3, { target: 0 });
  ok(w3.vehicles.includes(wedged), 'watchdog: kept while the player can see it');
}

// 4. the player's boat is right of way: a tour boat slows down and goes around
{
  const map = canal(400, 26), rng = seeded(21);
  const me = boat(map, 'sloep', 250, 0, 0); me.driver = 'player';
  const t = boat(map, 'rondvaart', 150, 0, 0);
  let minD = Infinity;
  run(map, [me, t], 60, rng, () => { minD = Math.min(minD, Math.hypot(me.x - t.x, me.y - t.y)); });
  ok(minD > (me.halfLen + t.halfLen) * 0.5, 'the player\'s boat: not rammed', minD.toFixed(1));
}

console.log(`${n - fails}/${n} boat traffic checks passed`);
process.exit(fails ? 1 : 0);
