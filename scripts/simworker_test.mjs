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
assert.deepEqual(unpackSnapshot(snap).get(3), { id: 3, x: 1, y: 2, angle: 0.5, speed: 4 });
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

console.log('simworker_test ok');
