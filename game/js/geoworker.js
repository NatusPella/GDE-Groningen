import { KERNELS } from './geokernels.js';

// The geometry worker (geojobs.js): runs a kernel per message and sends the
// typed arrays back as transferables.
self.onmessage = (e) => {
  const { id, kind, data } = e.data;
  try {
    const { result, transfer } = KERNELS[kind](data);
    self.postMessage({ id, result }, transfer);
  } catch (err) {
    self.postMessage({ id, error: String((err && err.stack) || err) });
  }
};
