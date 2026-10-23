// Stotterende treinen (#436): elke dienstregeltrein moet zonder haperingen rijden. Meet per frame (60 Hz) hoeveel de
// voorste wagon opschuift, draait en op/neer gaat; die stappen horen glad te volgen op de snelheid.
//   node scripts/train_smooth_test.mjs [seconden]
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
  map, vehicles: [], pedestrians: [], player: { x: 0, y: 0, angle: 0, vx: 0, vy: 0, z: 0 }, companion: null, time: 0, clock: 10, money: 200,
  wanted: 0, input: { isDown: () => false, wasPressed: () => false, consume() {}, reset() {} }, onRespawn: [], audioEvents: [], particles: [],
  addMessage() {}, health: 100,
};
RW.initRailway(world);
const trains = RW.getTrains();
let fails = 0;
const DT = 1 / 60, SECS = +(process.argv[2] || 900);
const prev = trains.map((t) => ({ x: t.cars[0].x, y: t.cars[0].y, z: t.cars[0].z, a: t.cars[0].angle, p: t.cars[0].pitch, v: t.v }));
const worst = trains.map(() => ({ dz: 0, da: 0, dp: 0, dstep: 0, dv: 0, at: 0 }));
for (let f = 0; f < SECS / DT; f++) {
  world.time += DT;
  RW.updateRailway(DT, world);
  trains.forEach((t, i) => {
    const c = t.cars[0], p = prev[i], w = worst[i];
    const step = Math.hypot(c.x - p.x, c.y - p.y);
    const err = Math.abs(step - Math.abs(t.v) * DT);
    if (t.state !== 'dwell' && err > w.dstep) { w.dstep = err; w.at = world.time; }
    const da = Math.abs(Math.atan2(Math.sin(c.angle - p.a), Math.cos(c.angle - p.a)));
    if (da > w.da && !RW.isOffMap(c.x, c.y)) { w.da = da; w.daAt = [world.time.toFixed(1), c.x.toFixed(0), c.y.toFixed(0), t.state, t.v.toFixed(1), t.c.toFixed(0)].join(' '); }
    w.dz = Math.max(w.dz, Math.abs(c.z - p.z));
    w.dp = Math.max(w.dp, Math.abs(c.pitch - p.p));
    w.dv = Math.max(w.dv, Math.abs(t.v - p.v));
    Object.assign(p, { x: c.x, y: c.y, z: c.z, a: c.angle, p: c.pitch, v: t.v });
  });
}
trains.forEach((t, i) => {
  const w = worst[i];
  const bad = w.dstep > 0.25 || w.dz > 0.08 || w.da > 0.05 || w.dp > 0.02 || w.dv > 0.5;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${t.route.name} stapfout ${w.dstep.toFixed(3)} m (t=${w.at.toFixed(0)})  dz ${w.dz.toFixed(3)}  hoek ${w.da.toFixed(4)} (${w.daAt})  helling ${w.dp.toFixed(4)}  dv ${w.dv.toFixed(3)}`);
  if (bad) fails++;
});
console.log(fails ? `${fails} routes haperen` : 'alle treinen rijden glad');
process.exit(fails ? 1 : 0);
