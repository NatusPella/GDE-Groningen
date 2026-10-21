// Pixel comparison of PNG screenshots (8 bit, not interlaced, as Electron writes them):
//   node scripts/perf/pngdiff.mjs a.png b.png [c.png ...]   -> a against each of the others
// Prints the share of pixels whose largest channel difference is above 8 and the mean difference per channel (0..255),
// and the bounding box of the differing pixels. Two runs of the same build give the noise level (traffic and people move).
import fs from 'node:fs';
import zlib from 'node:zlib';

function decode(file) {
  const b = fs.readFileSync(file);
  let o = 8, W = 0, H = 0, ch = 4; const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), type = b.toString('latin1', o + 4, o + 8);
    if (type === 'IHDR') { W = b.readUInt32BE(o + 8); H = b.readUInt32BE(o + 12); const ct = b[o + 17]; ch = ct === 6 ? 4 : ct === 2 ? 3 : 0; if (b[o + 16] !== 8 || b[o + 20] !== 0 || !ch) throw new Error('unsupported png ' + file); }
    if (type === 'IDAT') idat.push(b.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = W * ch, out = Buffer.alloc(H * stride);
  for (let y = 0; y < H; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? out[dst + x - ch] : 0, up = y ? out[dst - stride + x] : 0, c = x >= ch && y ? out[dst - stride + x - ch] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      out[dst + x] = v & 255;
    }
  }
  return { W, H, ch, data: out };
}

const [first, ...rest] = process.argv.slice(2);
const A = decode(first);
for (const f of rest) {
  const B = decode(f);
  if (A.W !== B.W || A.H !== B.H) { console.log(f, 'size differs'); continue; }
  let n = 0, sum = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
    let m = 0;
    for (let c = 0; c < 3; c++) { const d = Math.abs(A.data[(y * A.W + x) * A.ch + c] - B.data[(y * B.W + x) * B.ch + c]); sum += d; if (d > m) m = d; }
    if (m > 8) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  console.log(`${f}: ${(100 * n / (A.W * A.H)).toFixed(2)}% pixels differ >8, mean ${(sum / (A.W * A.H * 3)).toFixed(2)}${n ? `, box ${x0},${y0}-${x1},${y1}` : ''}`);
}
