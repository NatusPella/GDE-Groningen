// Meet tijd per tick en geheugen van de simulatiekern (simkernel.js) op de
// hoofdthread, zonder Electron of browser. Voor de coördinator, geen onderdeel
// van run_tests. Gebruik:  node scripts/sim_meet.mjs [auto's=300] [voetgangers=600] [ticks=600]
// Meet alleen de kern (volgverkeer, voetgangers, snapshot-packen), niet de
// echte AI in vehicle.js/pedestrians.js: dat vraagt de hitch/probe in het spel.
import { createSimKernel } from '../game/js/simkernel.js';
import { MSG } from '../game/js/simcontract.js';

const [nCars = 300, nPeds = 600, ticks = 600] = process.argv.slice(2).map(Number);
const roads = [];
for (let i = 0; i < 40; i++) roads.push({ id: i, pts: new Float32Array([0, i * 30, 400, i * 30, 800, i * 30 + 40]) });
const signals = roads.map((r) => ({ road: r.id, s: 300, cycle: 30, green: 15, offset: r.id }));
const k = createSimKernel();
k.handle({ type: MSG.INIT, seed: 1, roads, signals });
const agents = [];
for (let i = 0; i < nCars; i++) agents.push({ id: i, road: i % 40, s: (i * 37) % 700, speed: 8 + (i % 7), kind: 'car' });
for (let i = 0; i < nPeds; i++) agents.push({ id: nCars + i, road: i % 40, s: (i * 53) % 700, speed: 1.3, kind: 'ped' });
k.handle({ type: MSG.SPAWN, agents });

const heap0 = (global.gc && global.gc(), process.memoryUsage().heapUsed);
const tijden = [];
for (let t = 0; t < ticks; t++) {
  const a = process.hrtime.bigint();
  k.handle({ type: MSG.STEP, tick: t, dt: 1 / 60 });
  tijden.push(Number(process.hrtime.bigint() - a) / 1e6);
}
const heap1 = process.memoryUsage().heapUsed;
tijden.sort((x, y) => x - y);
const q = (p) => tijden[Math.min(tijden.length - 1, Math.floor(tijden.length * p))].toFixed(3);
console.log(JSON.stringify({ autos: nCars, voetgangers: nPeds, ticks, ms_gem: (tijden.reduce((s, x) => s + x, 0) / ticks).toFixed(3), ms_p50: q(0.5), ms_p95: q(0.95), ms_max: q(1), heap_delta_MB: ((heap1 - heap0) / 1048576).toFixed(1), rss_MB: (process.memoryUsage().rss / 1048576).toFixed(0), tip: 'node --expose-gc voor een zuivere heapmeting' }));
