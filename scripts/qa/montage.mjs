// Contactbladen van sweepbeelden: 2x2 (of --kol=3 --rij=2) verkleinde beelden per PNG, met de
// bestandsnamen in de volgorde van het blad, zodat een beoordelaar er sneller doorheen is.
//   node scripts/qa/montage.mjs <map> [--filter=<regex>] [--kol=2] [--rij=2] [--breedte=1600]
// Uitvoer: <map>/bladen/blad-NN.png en bladen/bladen.txt (welke beelden op welk blad staan).
import fs from 'node:fs';
import path from 'node:path';
import { decodePng, encodePng } from '../lib/pngcheck.mjs';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const dir = path.resolve(process.argv[2] || '.');
const KOL = Number(arg('kol', 2)), RIJ = Number(arg('rij', 2)), BREEDTE = Number(arg('breedte', 1600));
const re = new RegExp(arg('filter', '.'));
const files = fs.readdirSync(dir).filter((f) => /^shots-.+\.png$/.test(f) && f !== 'shots.png' && re.test(f)).sort();
const out = path.join(dir, 'bladen');
fs.mkdirSync(out, { recursive: true });
const tw = Math.floor(BREEDTE / KOL);
const lijst = [];
for (let b = 0; b * KOL * RIJ < files.length; b++) {
  const groep = files.slice(b * KOL * RIJ, (b + 1) * KOL * RIJ);
  const imgs = groep.map((f) => decodePng(fs.readFileSync(path.join(dir, f))));
  const th = Math.round(tw * imgs[0].h / imgs[0].w);
  const W = tw * KOL, H = th * RIJ;
  const rgba = new Uint8Array(W * H * 4);
  imgs.forEach((im, k) => {
    const ox = (k % KOL) * tw, oy = Math.floor(k / KOL) * th;
    const sx = im.w / tw, sy = im.h / th;
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx)), y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
      let r = 0, g = 0, bl = 0, n = 0;
      for (let yy = y0; yy < y1 && yy < im.h; yy++) for (let xx = x0; xx < x1 && xx < im.w; xx++) { const i = (yy * im.w + xx) * 4; r += im.rgba[i]; g += im.rgba[i + 1]; bl += im.rgba[i + 2]; n++; }
      const o = ((oy + y) * W + ox + x) * 4;
      rgba[o] = r / n; rgba[o + 1] = g / n; rgba[o + 2] = bl / n; rgba[o + 3] = 255;
    }
  });
  const naam = `blad-${String(b + 1).padStart(2, '0')}.png`;
  fs.writeFileSync(path.join(out, naam), encodePng(W, H, rgba));
  lijst.push(`${naam}: ${groep.map((f) => f.replace(/^shots-|\.png$/g, '')).join(', ')}`);
}
fs.writeFileSync(path.join(out, 'bladen.txt'), lijst.join('\n') + '\n');
console.log(`${files.length} beelden op ${lijst.length} bladen in ${out}`);
