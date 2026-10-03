import { KERNELS } from './geokernels.js';

// The geometry worker (geojobs.js): runs a kernel per message and sends the
// typed arrays back as transferables.
self.onmessage = async (e) => {
  const { id, kind, data } = e.data;
  try {
    const { result, transfer } = await KERNELS[kind](data);
    self.postMessage({ id, result }, [...new Set(transfer)]);
  } catch (err) {
    self.postMessage({ id, error: String((err && err.stack) || err) });
  }
};
