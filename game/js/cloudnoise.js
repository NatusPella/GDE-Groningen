// Wolkenruis (AAA-wereld 23-11): een kleine, naadloos herhalende ruistextuur die de hemelshader
// (sky3d.js) en het water (water3d.js) bemonsteren om echte, zachte wolken te tekenen in plaats
// van witte blokjes. Puur, zonder THREE, met een vast zaad: elke start dezelfde lucht, en
// scripts/cloudnoise_test.mjs kan het toetsen. Alles gebeurt eenmalig bij het opstarten.

// RGBA-bytes, size x size. R: grote bollen (vijf lagen); G: fijnere kuiffjes (vier lagen);
// B en A: nog twee onafhankelijke velden voor latere lagen. Elk kanaal is uitgerekt naar 0..255.
export function makeCloudNoise(size = 256, seed = 11) {
  const out = new Uint8Array(size * size * 4);
  const chans = [
    { base: 4, oct: 5, seed },
    { base: 11, oct: 4, seed: seed + 101 },
    { base: 6, oct: 4, seed: seed + 202 },
    { base: 17, oct: 3, seed: seed + 303 },
  ];
  chans.forEach((c, ci) => {
    const f = new Float32Array(size * size);
    let lo = Infinity, hi = -Infinity;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let v = 0, amp = 1, sum = 0, freq = c.base;
        for (let o = 0; o < c.oct; o++) {
          v += amp * tileNoise(x / size * freq, y / size * freq, freq, c.seed + o * 17);
          sum += amp; amp *= 0.5; freq *= 2;
        }
        v /= sum;
        f[y * size + x] = v;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    const k = 255 / Math.max(1e-6, hi - lo);
    for (let i = 0; i < f.length; i++) out[i * 4 + ci] = Math.round((f[i] - lo) * k);
  });
  return out;
}

// Waardenruis op een rooster van `period` cellen dat zichzelf herhaalt (naadloos), zacht geinterpoleerd.
function tileNoise(x, y, period, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const x0 = mod(xi, period), x1 = mod(xi + 1, period), y0 = mod(yi, period), y1 = mod(yi + 1, period);
  const a = lattice(x0, y0, seed), b = lattice(x1, y0, seed), c = lattice(x0, y1, seed), d = lattice(x1, y1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const mod = (n, m) => ((n % m) + m) % m;
function lattice(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
