// Een voorbeeld van de provinciepiramide in het oude en het nieuwe palet, zonder spel: leest de tegels van een gebouwde wereld, legt ze op het
// weiland en schrijft twee PNG's (oud en herkleurd met kaartkleuren.js herkleurRaster). Dit is geen beeld uit het echte spel (geen vectoren,
// labels of markers); het laat alleen zien wat de herkleuring met de gebakken tegels doet.
//   node scripts/qa/kaart_piramide_voorbeeld.mjs --world=<map met provmap/> --level=1 --out=<map> [--crop=x0,y0,w,h]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { encodePNG } from '../world/province_map.mjs';
import { herkleurRaster, kaartLand } from '../../game/js/kaartkleuren.js';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const world = path.resolve(arg('world', ''));
const level = Number(arg('level', 1));
const out = path.resolve(arg('out', '.'));
const index = JSON.parse(fs.readFileSync(path.join(world, 'index-provincie.json'), 'utf8')).global.map;
const L = index.levels.find((l) => l.z === level);

function decode(buf) { // 8-bit RGBA, niet verweven (zoals encodePNG ze schrijft)
  let o = 8, w = 0, h = 0; const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), type = buf.toString('latin1', o + 4, o + 8), data = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); } else if (type === 'IDAT') idat.push(data);
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), px = new Uint8ClampedArray(w * h * 4), stride = w * 4;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? px[y * stride + x - 4] : 0, b = y ? px[(y - 1) * stride + x] : 0, c = x >= 4 && y ? px[(y - 1) * stride + x - 4] : 0;
      let v = raw[row + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * stride + x] = v & 255;
    }
  }
  return { w, h, px };
}

const W = L.w, H = L.h;
const oud = new Uint8ClampedArray(W * H * 4), nieuw = new Uint8ClampedArray(W * H * 4);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mOud = hex('#243528'), mNieuw = hex(kaartLand().kaart.meadow);
const fill = (a, m) => { for (let i = 0; i < a.length; i += 4) { a[i] = m[0]; a[i + 1] = m[1]; a[i + 2] = m[2]; a[i + 3] = 255; } };
fill(oud, mOud); fill(nieuw, mNieuw);
const over = (dst, i, r, g, b, al) => { const a = al / 255; dst[i] = r * a + dst[i] * (1 - a); dst[i + 1] = g * a + dst[i + 1] * (1 - a); dst[i + 2] = b * a + dst[i + 2] * (1 - a); };
for (const key of L.tiles) {
  const [tx, ty] = key.split('_').map(Number);
  const t = decode(fs.readFileSync(path.join(world, index.dir, `z${level}-${key}.png`)));
  const nt = herkleurRaster(new Uint8ClampedArray(t.px));
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
    const s = (y * t.w + x) * 4, d = ((ty * index.tile + y) * W + tx * index.tile + x) * 4;
    if (!t.px[s + 3]) continue;
    over(oud, d, t.px[s], t.px[s + 1], t.px[s + 2], t.px[s + 3]);
    over(nieuw, d, nt[s], nt[s + 1], nt[s + 2], t.px[s + 3]);
  }
}
const crop = arg('crop', '').split(',').map(Number);
const cut = (a) => {
  if (crop.length !== 4 || crop.some((v) => !Number.isFinite(v))) return { w: W, h: H, px: a };
  const [cx, cy, cw, ch] = crop, o = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) o.set(a.subarray(((cy + y) * W + cx) * 4, ((cy + y) * W + cx + cw) * 4), y * cw * 4);
  return { w: cw, h: ch, px: o };
};
fs.mkdirSync(out, { recursive: true });
for (const [naam, a] of [['piramide-oud', oud], ['piramide-nieuw', nieuw]]) { const c = cut(a); fs.writeFileSync(path.join(out, `${naam}-z${level}.png`), encodePNG(c.w, c.h, c.px)); }
console.log(`geschreven in ${out} (${W}x${H}, z${level})`);
