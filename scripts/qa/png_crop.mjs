// Snijdt een stuk uit een PNG en vergroot het (voor het bekijken van details met de Read-tool).
//   node scripts/qa/png_crop.mjs <in.png> <x> <y> <b> <h> [schaal=3] [uit.png]
import fs from 'node:fs';
import { decodePng, encodePng } from '../lib/pngcheck.mjs';

const [inp, X, Y, W, H, S = '3', uit] = process.argv.slice(2);
const im = decodePng(fs.readFileSync(inp));
const x0 = +X, y0 = +Y, w = +W, h = +H, s = +S;
const out = new Uint8Array(w * s * h * s * 4);
for (let y = 0; y < h * s; y++) for (let x = 0; x < w * s; x++) {
  const sx = Math.min(im.w - 1, x0 + Math.floor(x / s)), sy = Math.min(im.h - 1, y0 + Math.floor(y / s));
  const i = (sy * im.w + sx) * 4, o = (y * w * s + x) * 4;
  out[o] = im.rgba[i]; out[o + 1] = im.rgba[i + 1]; out[o + 2] = im.rgba[i + 2]; out[o + 3] = 255;
}
const dest = uit || inp.replace(/\.png$/, `-crop-${x0}-${y0}.png`);
fs.writeFileSync(dest, encodePng(w * s, h * s, out));
console.log(dest);
