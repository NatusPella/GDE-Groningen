// Een trein raakt niemand die op het perron staat (#436), wel wie op het spoor staat:
//   node scripts/perron_trein_test.mjs
// Op het echte perron van Groningen Europapark (laag) en Groningen Noord (op de dijk): de speler staat aan de rand van de strook,
// het dichtst bij het spoor, terwijl de trein er met 12 m/s langs rijdt: hij wordt niet geraakt. Staat hij op het spoor zelf, dan wel.
import './node3d.mjs';
const { GameMap } = await import('../game/js/mapdata.js');
const { loadStadData } = await import('./lib/loadworld.mjs');
const data = await loadStadData({ extras: true });
const map = new GameMap(data);
const F = await import('../game/js/countryfield.js');
F.setCountryBounds(map.meta.bounds);
const { applyCityRoutes } = await import('../game/js/corridorrail.js');
const { loadCityRouteSource } = await import('./world/cityroutes.mjs');
applyCityRoutes(map, loadCityRouteSource());
const RW = await import('../game/js/railway.js');
const world = {
  map, vehicles: [], pedestrians: [], player: { x: 0, y: 0, angle: 0, vx: 0, vy: 0, z: 0, gz: 0, radius: 0.35 }, companion: null, time: 0, clock: 10, money: 200,
  wanted: 0, input: { isDown: () => false, wasPressed: () => false, consume() {}, reset() {} }, onRespawn: [], audioEvents: [], particles: [],
  addMessage() {}, health: 100, armor: 0,
};
RW.initRailway(world);
let n = 0, fails = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${i ? ' (' + i + ')' : ''}`); } };
ok((map.perrons || []).length >= 10, 'de kaart kent de perrons', String((map.perrons || []).length));

// de route en de plek op de route die het dichtst bij (x, y) ligt
function nearRoute(x, y) {
  let best = null;
  for (const route of RW.getRoutes()) for (let s = 0; s <= route.len; s += 2) {
    const q = RW.routePoint(route, s), d = Math.hypot(q[0] - x, q[1] - y);
    if (!best || d < best.d) best = { route, s, d, q };
  }
  return best;
}

async function check(id) {
  const row = map.perrons.find((r) => r.id === id);
  ok(!!row, `perron ${id} bestaat`);
  if (!row) return;
  // het punt van de strook (aan de rand, 0,4 m naar binnen) dat het dichtst bij het spoor ligt
  let best = null;
  for (let i = 0; i < row.p.length; i++) {
    const a = row.p[Math.max(0, i - 1)], b = row.p[Math.min(row.p.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, hs = row.p[i][2] - 0.4;
    for (const sg of [1, -1]) {
      const x = row.p[i][0] + nx * hs * sg, y = row.p[i][1] + ny * hs * sg;
      const r = nearRoute(x, y);
      if (!best || r.d < best.r.d) best = { x, y, z: row.p[i][3], r };
    }
  }
  ok(best.r.d >= 1.5, `${id}: het perron ligt buiten de baan van de trein`, best.r.d.toFixed(2));
  const t = RW.getTrains().find((q) => q.route === best.r.route);
  const p = world.player;
  const run = (px, py, z) => {
    Object.assign(p, { x: px, y: py, gz: z, z: 0 });
    world.health = 100; world.time = 100;
    t.state = 'run'; t.v = 12; t.dir = 1; t.c = best.r.s; t.target = t.route.stops.length - 1;
    delete p._trainHitAt;
    for (let k = 0; k < 6; k++) { RW.updateRailway(1 / 60, world); world.time += 1 / 60; }
    return world.health;
  };
  const h1 = run(best.x, best.y, best.z);
  ok(h1 === 100, `${id}: op het perron (${best.r.d.toFixed(1)} m van de hartlijn) wordt de speler niet geraakt`, String(h1));
  const q = best.r.q, zr = RW.railZ(q[0], q[1]);
  const h2 = run(q[0], q[1], zr);
  ok(h2 < 100, `${id}: op het spoor wordt de speler wel geraakt`, String(h2));
}

await check('europapark-1');
await check('noord-1');
console.log(`${n - fails}/${n} perron-trein-controles gehaald`);
process.exit(fails ? 1 : 0);
