import { renderData } from './dsp.js';

self.onmessage = (e) => {
  const { name, rate } = e.data;
  const r = renderData(name, rate);
  if (!r) { self.postMessage({ name }); return; }
  self.postMessage({ name, sr: r.sr, chs: r.chs }, r.chs.map((c) => c.buffer));
};
