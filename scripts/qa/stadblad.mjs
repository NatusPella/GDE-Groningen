// Contactbladen voor de stadsvergelijking (#90): per blad N beeldparen onder elkaar, links A (oude stad), rechts B (tegels).
//   node scripts/qa/stadblad.mjs --a=<map> --b=<map> --out=<map> [--per=4] [--filter=hoog] [--schaal=2]
// Leest shots-<naam>.png uit beide mappen (zoals stadverschil.mjs), schrijft blad-NN.png en bladen.json (welke namen op welk blad).
import fs from 'node:fs';
import path from 'node:path';
import { decodePng, encodePng } from '../lib/pngcheck.mjs';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const A = path.resolve(arg('a', '')), B = path.resolve(arg('b', '')), OUT = path.resolve(arg('out', path.join(B, '..', 'bladen')));
const PER = Number(arg('per', 4)), FILTER = arg('filter', 'hoog'), SC = Number(arg('schaal', 2));
fs.mkdirSync(OUT, { recursive: true });
const names = fs.readdirSync(A).filter((f) => /^shots-.+\.png$/.test(f) && f !== 'shots.png' && f.includes(FILTER) && fs.existsSync(path.join(B, f))).map((f) => f.slice(6, -4)).sort();
const blad = [];
for (let n = 0, page = 0; n < names.length; n += PER, page++) {
  const group = names.slice(n, n + PER);
  const imgs = group.map((nm) => [decodePng(fs.readFileSync(path.join(A, `shots-${nm}.png`))), decodePng(fs.readFileSync(path.join(B, `shots-${nm}.png`)))]);
  const w = Math.floor(imgs[0][0].w / SC), h = Math.floor(imgs[0][0].h / SC);
  // zonder de zwarte balken van de cinematic (ruwweg 11% boven en onder): alleen het midden
  const top = Math.floor(h * 0.1), hh = Math.floor(h * 0.8);
  const W = w * 2 + 4, H = hh * group.length + 2 * (group.length - 1);
  const M = new Uint8Array(W * H * 4).fill(40);
  imgs.forEach(([ia, ib], k) => {
    for (const [side, im] of [[0, ia], [1, ib]]) {
      for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
        const si = (((y + top) * SC) * im.w + x * SC) * 4, di = ((k * (hh + 2) + y) * W + side * (w + 4) + x) * 4;
        M[di] = im.rgba[si]; M[di + 1] = im.rgba[si + 1]; M[di + 2] = im.rgba[si + 2]; M[di + 3] = 255;
      }
    }
  });
  const file = `blad-${String(page + 1).padStart(2, '0')}.png`;
  fs.writeFileSync(path.join(OUT, file), encodePng(W, H, M));
  blad.push({ blad: file, namen: group });
}
fs.writeFileSync(path.join(OUT, 'bladen.json'), JSON.stringify(blad, null, 1));
console.log(`${names.length} paren op ${blad.length} bladen -> ${OUT}`);
