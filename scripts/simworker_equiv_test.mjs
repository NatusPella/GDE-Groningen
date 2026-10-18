// Equivalentie: dezelfde berichten via een echte worker-thread en via de
// hoofdthread-terugval geven bit-gelijke snapshots (issue #58).
//   node scripts/simworker_equiv_test.mjs
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { createSimHost } from '../game/js/simhost.js';

const shim = fileURLToPath(new URL('./sim_node_worker.mjs', import.meta.url));
const mkWorker = () => {
  const w = new Worker(shim);
  const api = { onmessage: null, onerror: null, postMessage: (m) => w.postMessage(m, m.data ? [m.data.buffer] : []), terminate: () => w.terminate() };
  w.on('message', (data) => api.onmessage && api.onmessage({ data }));
  w.on('error', (e) => api.onerror && api.onerror(e));
  return api;
};

const roads = [];
for (let i = 0; i < 6; i++) roads.push({ id: i, pts: new Float32Array([0, i * 30, 300, i * 30, 500, i * 30 + 40]) });
const agents = [];
for (let i = 0; i < 30; i++) agents.push({ id: i, road: i % 6, s: (i * 17) % 400, speed: 6 + (i % 5), kind: i % 3 ? 'car' : 'ped' });

async function run(host) {
  const out = [];
  host.init(roads, 7);
  host.spawn(agents);
  for (let t = 0; t < 200; t++) {
    // wacht tot de stap is geaccepteerd (worker: vorige snapshot binnen)
    for (let spin = 0; !host.step(t, 1 / 60); spin++) { await new Promise((r) => setTimeout(r, 1)); assert.ok(spin < 5000, 'worker antwoordt niet'); }
    if (host.mode() === 'worker') for (let spin = 0; host.snapshot() === null || host.snapshot().tick !== t; spin++) { await new Promise((r) => setTimeout(r, 1)); assert.ok(spin < 5000, 'snapshot blijft uit'); }
    if (t % 20 === 0) out.push([...host.snapshot().data]);
  }
  host.dispose();
  return out;
}

const viaMain = await run(createSimHost({ useWorker: false }));
const hostW = createSimHost({ workerFactory: mkWorker });
const viaWorker = await run(hostW);
assert.equal(hostW.stats.mode, 'worker', 'moest echt via de worker lopen');
assert.equal(viaMain.length, viaWorker.length);
for (let i = 0; i < viaMain.length; i++) assert.deepEqual(viaWorker[i], viaMain[i], `snapshot ${i} verschilt`);
console.log('simworker_equiv_test: ok (%d snapshots gelijk)', viaMain.length);
