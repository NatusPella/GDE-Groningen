import { KERNELS } from './geokernels.js';

// The geometry worker (geojobs.js): runs a kernel per message and sends the
// typed arrays back as transferables.
self.onmessage = async (e) => {
  const { id, kind, data } = e.data;
  const t0 = performance.now();
  try {
    const { result, transfer } = await KERNELS[kind](data);
    // ms: the kernel's own run time, so the main thread can tell a long job from a long wait (geoStats.byKind, #247)
    self.postMessage({ id, result, ms: performance.now() - t0 }, [...new Set(transfer)]);
  } catch (err) {
    self.postMessage({ id, error: String((err && err.stack) || err) });
  }
};
