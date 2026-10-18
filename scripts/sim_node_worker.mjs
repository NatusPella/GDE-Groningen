// Hulp voor simworker_equiv_test.mjs: draait game/js/simworker.js als echte
// node-worker (worker_threads) door `self` te laten wijzen naar parentPort.
import { parentPort } from 'node:worker_threads';
globalThis.self = { postMessage: (m, t) => parentPort.postMessage(m, t), onmessage: null };
parentPort.on('message', (data) => globalThis.self.onmessage({ data }));
await import('../game/js/simworker.js');
