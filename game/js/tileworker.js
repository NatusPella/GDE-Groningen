import { decodeCompressed } from './tilestore.js';

// Tile decoding off the main thread (tilestore.js makeWorkerDecoder):
// inflate + decode, the decoded tile goes back as a clone.
self.onmessage = async (e) => {
  const { id, bytes, aside } = e.data;
  try {
    self.postMessage({ id, tile: await decodeCompressed(bytes, aside) });
  } catch (err) {
    self.postMessage({ id, error: String((err && err.stack) || err) });
  }
};
