// Pure side of the simulation worker (#58): contract, kernel, host fallback.
import assert from 'node:assert/strict';
import { packSnapshot, unpackSnapshot, validateMessage, SNAP_STRIDE, MSG } from '../game/js/simcontract.js';
import { createSimKernel } from '../game/js/simkernel.js';
import { createSimHost } from '../game/js/simhost.js';

const roads = [{ id: 1, pts: new Float32Array([0, 0, 10, 0, 10, 10]) }]; // 20 m, loops
const agents = [{ id: 7, road: 1, s: 0, speed: 5 }, { id: 8, road: 99, s: 0, speed: 1 }];

// contract
const snap = packSnapshot([{ id: 3, x: 1, y: 2, angle: 0.5, speed: 4 }], 9);
assert.equal(snap.data.length, SNAP_STRIDE);
assert.deepEqual(unpackSnapshot(snap).get(3), { id: 3, x: 1, y: 2, angle: 0.5, speed: 4, road: -1, s: 0 });
assert.ok(validateMessage({ type: 'step', tick: 1, dt: 0.016 }, 'toWorker') === null);
assert.ok(validateMessage({ type: 'step', tick: 1 }, 'toWorker'));
assert.ok(validateMessage({ type: 'snapshot' }, 'toWorker'));
assert.ok(validateMessage({ type: 'snapshot', n: 2, data: new Float32Array(3) }, 'fromWorker'));
assert.ok(validateMessage(null, 'toWorker'));

// kernel: moves along the polyline, loops, ignores unknown roads, clamps dt
const k = createSimKernel();
assert.equal(k.handle({ type: MSG.INIT, seed: 1, roads }).type, MSG.READY);
k.handle({ type: MSG.SPAWN, agents });
assert.equal(k.size(), 1);
let s = k.handle({ type: MSG.STEP, tick: 1, dt: 1 }); // clamped to 0.1 s => 0.5 m
let a = unpackSnapshot(s).get(7);
assert.ok(Math.abs(a.x - 0.5) < 1e-5 && a.y === 0 && a.angle === 0);
for (let i = 0; i < 20; i++) s = k.handle({ type: MSG.STEP, tick: 2 + i, dt: 0.1 }); // 10 m more => corner
a = unpackSnapshot(s).get(7);
assert.ok(Math.abs(a.x - 10) < 1e-3 && Math.abs(a.y) < 1e-3 || a.y > 0);
for (let i = 0; i < 400; i++) s = k.handle({ type: MSG.STEP, tick: 100 + i, dt: 0.1 });
a = unpackSnapshot(s).get(7);
assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y) && a.x >= -1e-3 && a.x <= 10.001 && a.y >= -1e-3 && a.y <= 10.001);
k.handle({ type: MSG.DESPAWN, ids: [7] });
assert.equal(k.size(), 0);

// host without Worker: synchronous fallback, same numbers as the kernel
const h = createSimHost({ useWorker: false });
h.init(roads); h.spawn(agents);
assert.equal(h.mode(), 'main');
assert.ok(h.step(1, 0.1));
assert.ok(Math.abs(h.positions().get(7).x - 0.5) < 1e-5);

// host with a fake worker: back-pressure, then failure falls back and replays
let posted = [];
const fake = { postMessage(m) { posted.push(m); }, terminate() { fake.dead = true; } };
const hw = createSimHost({ workerFactory: () => fake });
hw.init(roads); hw.spawn(agents);
assert.equal(hw.mode(), 'worker');
assert.ok(hw.step(1, 0.1));
assert.equal(hw.step(2, 0.1), false); // first still in flight
assert.equal(hw.stats.dropped, 1);
fake.onmessage({ data: packSnapshot([{ id: 7, x: 3, y: 0, angle: 0, speed: 5 }], 1) });
assert.equal(hw.positions().get(7).x, 3);
assert.ok(hw.step(3, 0.1)); // free again
fake.onmessage({ data: { type: 'error', error: 'boem' } });
assert.equal(hw.mode(), 'main');
assert.ok(fake.dead);
assert.ok(hw.step(4, 0.1)); // runs on the main thread with replayed state
assert.ok(Math.abs(hw.positions().get(7).x - 0.5) < 1e-5);

// a factory that throws falls back too
const hf = createSimHost({ workerFactory: () => { throw new Error('geen worker'); } });
hf.init(roads); hf.spawn(agents);
assert.equal(hf.mode(), 'main');

// cars: follow the car ahead, never overlap, stop at red, go on at green
import { signalGreen, safeSpeed, MIN_GAP } from '../game/js/simkernel.js';
import { handoverPlan, workerId, isWorkerId } from '../game/js/simhandover.js';
const long = [{ id: 2, pts: new Float32Array([0, 0, 1000, 0]) }];
const kf = createSimKernel();
kf.handle({ type: MSG.INIT, seed: 1, roads: long });
kf.handle({ type: MSG.SPAWN, agents: [{ id: 1, road: 2, s: 40, speed: 2 }, { id: 2, road: 2, s: 0, speed: 14 }] });
let snapF;
for (let i = 0; i < 600; i++) snapF = unpackSnapshot(kf.handle({ type: MSG.STEP, tick: i, dt: 0.05 }));
const lead = snapF.get(1), tail = snapF.get(2);
assert.ok(lead.x > 40 && tail.x < lead.x - MIN_GAP + 0.5, 'volger botst niet');
assert.ok(tail.speed <= 2.2, 'volger past zijn snelheid aan');
assert.ok(safeSpeed(0) === 0 && safeSpeed(100) > safeSpeed(20));

// signal: red 0-10 s of each 20 s cycle means green from 10; pure function
const sig = { road: 2, s: 100, cycle: 20, green: 10, offset: 10 };
assert.equal(signalGreen(sig, 0), false);
assert.equal(signalGreen(sig, 10), true);
assert.equal(signalGreen(sig, 25), false);
const ks = createSimKernel();
ks.handle({ type: MSG.INIT, seed: 1, roads: long, signals: [sig] });
ks.handle({ type: MSG.SPAWN, agents: [{ id: 5, road: 2, s: 50, speed: 12 }] });
let maxX = 0, snapS;
for (let i = 0; i < 160; i++) { snapS = unpackSnapshot(ks.handle({ type: MSG.STEP, tick: i, dt: 0.05 })); maxX = Math.max(maxX, snapS.get(5).x); } // 8 s, red
assert.ok(maxX < 101 && snapS.get(5).x > 90, 'stopt voor rood');
for (let i = 0; i < 200; i++) snapS = unpackSnapshot(ks.handle({ type: MSG.STEP, tick: 200 + i, dt: 0.05 })); // green at 10 s
assert.ok(snapS.get(5).x > 130, 'rijdt door bij groen');

// walkers ignore cars and signals; determinism: same input, same bytes
const run = () => {
  const kk = createSimKernel();
  kk.handle({ type: MSG.INIT, seed: 3, roads: long, signals: [sig] });
  kk.handle({ type: MSG.SPAWN, agents: [{ id: 1, road: 2, s: 99, speed: 1.4, kind: 'ped' }, { id: 2, road: 2, s: 10, speed: 10 }, { id: 3, road: 2, s: 30, speed: 8 }] });
  let r; for (let i = 0; i < 300; i++) r = kk.handle({ type: MSG.STEP, tick: i, dt: 0.033 });
  return Array.from(r.data).join(',');
};
assert.equal(run(), run());
const kp = createSimKernel();
kp.handle({ type: MSG.INIT, seed: 1, roads: long, signals: [sig] });
kp.handle({ type: MSG.SPAWN, agents: [{ id: 1, road: 2, s: 99, speed: 1.4, kind: 'ped' }] });
let sp; for (let i = 0; i < 20; i++) sp = unpackSnapshot(kp.handle({ type: MSG.STEP, tick: i, dt: 0.1 }));
assert.ok(Math.abs(sp.get(1).x - (99 + 1.4 * 2)) < 1e-3, 'voetganger loopt door rood');

// handover: near worker agents come over, far real ones go back, with hysteresis
const wa = new Map([[workerId(1), { id: workerId(1), x: 50, y: 0 }], [workerId(2), { id: workerId(2), x: 130, y: 0 }], [workerId(3), { id: workerId(3), x: 400, y: 0 }]]);
const real = [{ id: 1, x: 300, y: 0, road: 4, s: 1, ambient: true }, { id: 2, x: 300, y: 0, road: 4, s: 1, ambient: false }, { id: 3, x: 140, y: 0, road: 4, s: 1, ambient: true }, { id: 4, x: 300, y: 0, road: -1, s: 0, ambient: true }];
const plan = handoverPlan(wa, real, { x: 0, y: 0 });
assert.deepEqual(plan.takeOver.map((a) => a.id), [workerId(1)]);
assert.deepEqual(plan.giveBack.map((r) => r.id), [1]);
assert.ok(isWorkerId(workerId(0)) && !isWorkerId(999999));
assert.equal(handoverPlan(wa, real, { x: 0, y: 0 }, { max: 0 }).takeOver.length, 0);

console.log('simworker_test ok');

// static world data
import { buildSimRoads, projectOnRoad } from '../game/js/simworld.js';
import { SpatialGrid } from '../game/js/spatialgrid.js';
const fakeRoads = [
  { cat: 'major', pts: [[0, 0], [100, 0]] }, { cat: 'foot', pts: [[0, 0], [50, 0]] },
  { cat: 'minor', pts: [[0, 0], [5, 0]] }, { cat: 'normal', pts: [[0, 0]] }, { cat: 'minor', pts: [[0, 10], [0, 60]] }];
const fakeGrid = new SpatialGrid(64);
for (const r of fakeRoads) {
  const xs = r.pts.map((p) => p[0]), ys = r.pts.map((p) => p[1]);
  fakeGrid.insert(r, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
}
const fakeMap = { roads: fakeRoads, roadGrid: fakeGrid };
assert.deepEqual(buildSimRoads(fakeMap, 'car').map((r) => r.id), [0, 1]);
assert.deepEqual(buildSimRoads(fakeMap, 'ped').map((r) => r.id), [0]);
const pr = projectOnRoad(buildSimRoads(fakeMap)[0].pts, 40, 3);
assert.ok(Math.abs(pr.s - 40) < 1e-4 && Math.abs(pr.d - 3) < 1e-4);
console.log('simworld ok');
