import { createSimKernel } from './simkernel.js';

// The simulation worker (simhost.js): one kernel, one message in, at most one
// message out. Snapshot buffers go back as transferables.
const kernel = createSimKernel();
self.onmessage = (e) => {
  try {
    const reply = kernel.handle(e.data);
    if (reply) self.postMessage(reply, reply.data ? [reply.data.buffer] : []);
  } catch (err) {
    self.postMessage({ type: 'error', error: String((err && err.stack) || err) });
  }
};
