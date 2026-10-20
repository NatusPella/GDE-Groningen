// Analyse van de beelden van brug_beeld.mjs (#235): per stand (a, b = 4 cm verschoven, c = a) telt het hoeveel pixels in
// vlakke delen van het beeld (geen rand) verschillen tussen a en b (flikkering: z-fighting of een LOD-wissel) en tussen a en
// c (ruis van water en verkeer). Een stand scoort a-b min a-c. Schrijft <map>/heat/<stand>.png (rood = verschil a-b)
// voor de standen boven de drempel en brug_beeld_analyse.json; het oordeel over de beelden zelf blijft aan degene die ze ziet.
//   node scripts/qa/brug_beeld_analyse.mjs <map met shots-bb-*-a.png> [--drempel=60] [--min=40]
import fs from 'node:fs';
import path from 'node:path';
import { decodePng, encodePng } from '../lib/pngcheck.mjs';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const dir = path.resolve(process.argv[2] || '.');
const DREMPEL = Number(arg('drempel', 60)), MIN = Number(arg('min', 40));
const names = fs.readdirSync(dir).filter((f) => /^shots-bb-.+-a\.png$/.test(f)).map((f) => f.replace(/^shots-/, '').replace(/-a\.png$/, '')).sort();
const lum = (im) => { const o = new Uint8Array(im.w * im.h); for (let i = 0; i < o.length; i++) o[i] = (im.rgba[i * 4] * 77 + im.rgba[i * 4 + 1] * 150 + im.rgba[i * 4 + 2] * 29) >> 8; return o; };
const flat = (L, w, h) => { const f = new Uint8Array(w * h); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, c = L[i]; f[i] = Math.max(Math.abs(c - L[i - 1]), Math.abs(c - L[i + 1]), Math.abs(c - L[i - w]), Math.abs(c - L[i + w])) < 20 ? 1 : 0; } return f; };
const uit = [];
fs.mkdirSync(path.join(dir, 'heat'), { recursive: true });
for (const n of names) {
  const fa = path.join(dir, `shots-${n}-a.png`), fb = path.join(dir, `shots-${n}-b.png`), fc = path.join(dir, `shots-${n}-c.png`);
  if (!fs.existsSync(fb) || !fs.existsSync(fc)) continue;
  const A = decodePng(fs.readFileSync(fa)), B = decodePng(fs.readFileSync(fb)), C = decodePng(fs.readFileSync(fc));
  if (A.w !== B.w || A.w !== C.w || A.h !== B.h) continue;
  const La = lum(A), Lb = lum(B), Lc = lum(C), Fa = flat(La, A.w, A.h), Fb = flat(Lb, A.w, A.h);
  let ab = 0, ac = 0; const heat = new Uint8Array(A.w * A.h * 4);
  for (let i = 0; i < La.length; i++) {
    const dab = Math.abs(La[i] - Lb[i]), dac = Math.abs(La[i] - Lc[i]);
    const okab = Fa[i] && Fb[i];
    if (okab && dab > DREMPEL / 3) ab++;
    if (Fa[i] && dac > DREMPEL / 3) ac++;
    const g = La[i] >> 2;
    heat[i * 4] = okab && dab > DREMPEL / 3 ? 255 : g; heat[i * 4 + 1] = g; heat[i * 4 + 2] = g; heat[i * 4 + 3] = 255;
  }
  const score = Math.max(0, ab - ac);
  uit.push({ stand: n, ab, ac, score });
  if (score >= MIN) fs.writeFileSync(path.join(dir, 'heat', `${n}.png`), encodePng(A.w, A.h, heat));
}
uit.sort((x, y) => y.score - x.score);
fs.writeFileSync(path.join(dir, 'brug_beeld_analyse.json'), JSON.stringify(uit, null, 1));
console.log(`${uit.length} standen, ${uit.filter((u) => u.score >= MIN).length} boven de drempel (${MIN} pixels)`);
for (const u of uit.slice(0, 25)) console.log(`${String(u.score).padStart(7)}  a-b ${String(u.ab).padStart(7)}  a-c ${String(u.ac).padStart(7)}  ${u.stand}`);
