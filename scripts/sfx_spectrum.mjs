// Offline look at a few effects (#173, #131, #129): duration, peak, RMS, spectral
// centroid and the strongest spectral peaks, and optionally a WAV per sample so
// a person can listen later. Nothing is played here.
//   node scripts/sfx_spectrum.mjs [--wav <dir>] [naam ...]
import fs from 'node:fs';
import path from 'node:path';
import { renderData } from '../game/js/sfx/dsp.js';
import '../game/js/sfx/fxbank.js';

export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

// power spectrum of the first `secs` seconds (Hann window)
export function spectrum(d, sr, t0 = 0, secs = 0.4) {
  const n = 1 << Math.ceil(Math.log2(Math.max(256, secs * sr)));
  const re = new Float64Array(n), im = new Float64Array(n), s0 = Math.floor(t0 * sr), m = Math.min(n, Math.floor(secs * sr));
  for (let i = 0; i < m && s0 + i < d.length; i++) re[i] = d[s0 + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (m - 1)));
  fft(re, im);
  const p = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) p[i] = re[i] * re[i] + im[i] * im[i];
  return { p, hz: sr / n };
}

export function describe(name, sr = 44100) {
  const r = renderData(name, sr);
  if (!r) return null;
  const d = r.chs[0], s = spectrum(d, r.sr, 0, 0.4);
  let peak = 0, sum = 0, tot = 0, cen = 0;
  for (let i = 0; i < d.length; i++) { peak = Math.max(peak, Math.abs(d[i])); sum += d[i] * d[i]; }
  for (let i = 1; i < s.p.length; i++) { tot += s.p[i]; cen += s.p[i] * i * s.hz; }
  const peaks = [];
  for (let i = 2; i < s.p.length - 2; i++) if (s.p[i] > s.p[i - 1] && s.p[i] >= s.p[i + 1] && s.p[i] > 1e-3 * Math.max(...s.p)) peaks.push([i * s.hz, s.p[i]]);
  peaks.sort((a, b) => b[1] - a[1]);
  const above = (hz) => { let e = 0; for (let i = Math.floor(hz / s.hz); i < s.p.length; i++) e += s.p[i]; return e / tot; };
  return { name, sr: r.sr, secs: d.length / r.sr, peak, rms: Math.sqrt(sum / d.length), centroid: cen / tot, peaks: peaks.slice(0, 5).map(([f]) => Math.round(f)), above1500: above(1500), above4000: above(4000), data: d };
}

function wav(d, sr) {
  const b = Buffer.alloc(44 + d.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + d.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(d.length * 2, 40);
  for (let i = 0; i < d.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, d[i])) * 32767), 44 + i * 2);
  return b;
}

if (process.argv[1]?.endsWith('sfx_spectrum.mjs')) {
  const args = process.argv.slice(2), wi = args.indexOf('--wav');
  const dir = wi >= 0 ? args.splice(wi, 2)[1] : null;
  const names = args.length ? args : ['bikebell', 'firework_burst_0', 'carbid_boom_0', 'crossing_bell'];
  if (dir) fs.mkdirSync(dir, { recursive: true });
  for (const n of names) {
    const x = describe(n);
    if (!x) { console.log(n, 'bestaat niet'); continue; }
    console.log(n.padEnd(18), `${x.secs.toFixed(2)}s piek ${x.peak.toFixed(2)} rms ${x.rms.toFixed(3)} zwaartepunt ${Math.round(x.centroid)} Hz >1,5k ${(x.above1500 * 100).toFixed(0)}% pieken ${x.peaks.join(', ')} Hz`);
    if (dir) fs.writeFileSync(path.join(dir, n + '.wav'), wav(x.data, x.sr));
  }
}
