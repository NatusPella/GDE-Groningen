// Near-verschil van de z-fight-meting (#917): per plek vergelijkt het beeld a van elke near-variant met dat van near 0,5 (zelfde
// camera, bewegende dingen staan uit) en telt de pixels die verschillen (vlakke delen, geen randen). Zo'n pixel kiest zijn winnaar
// op de dieptestap: bij een ander near wint een ander vlak. Dat is precisie; wat bij elk near gelijk blijft, is geen precisie (en
// bij een echte coplanaire dubbele wand ook niet te verhelpen met near). Schrijft <map>/verschil/<plek>-<variant>.png (rood = verschil).
//   node scripts/qa/zfight_nearverschil.mjs <map met shots-bb-<plek>-n<near>-a.png> [--drempel=60]
import fs from 'node:fs';
import path from 'node:path';
import { decodePng, encodePng } from '../lib/pngcheck.mjs';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const dir = path.resolve(process.argv[2] || '.');
const T = Number(arg('drempel', 60)) / 3;
const lum = (im) => { const o = new Uint8Array(im.w * im.h); for (let i = 0; i < o.length; i++) o[i] = (im.rgba[i * 4] * 77 + im.rgba[i * 4 + 1] * 150 + im.rgba[i * 4 + 2] * 29) >> 8; return o; };
const flat = (L, w, h) => { const f = new Uint8Array(w * h); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, c = L[i]; f[i] = Math.max(Math.abs(c - L[i - 1]), Math.abs(c - L[i + 1]), Math.abs(c - L[i - w]), Math.abs(c - L[i + w])) < 20 ? 1 : 0; } return f; };
const stands = new Map();
for (const f of fs.readdirSync(dir)) {
  const m = f.match(/^shots-bb-(.+)-(n(?:auto|[\d.]+)(?:f\d+)?)-a\.png$/);
  if (m) { if (!stands.has(m[1])) stands.set(m[1], {}); stands.get(m[1])[m[2]] = path.join(dir, f); }
}
fs.mkdirSync(path.join(dir, 'verschil'), { recursive: true });
const uit = [];
for (const [plek, per] of stands) {
  const basis = per['n0.5'];
  if (!basis) continue;
  const A = decodePng(fs.readFileSync(basis)), La = lum(A), Fa = flat(La, A.w, A.h);
  for (const [v, file] of Object.entries(per)) {
    if (v === 'n0.5') continue;
    const B = decodePng(fs.readFileSync(file));
    if (B.w !== A.w || B.h !== A.h) continue;
    const Lb = lum(B), Fb = flat(Lb, A.w, A.h), heat = new Uint8Array(A.w * A.h * 4);
    let n = 0;
    for (let i = 0; i < La.length; i++) {
      const d = Fa[i] && Fb[i] && Math.abs(La[i] - Lb[i]) > T;
      if (d) n++;
      const g = La[i] >> 2;
      heat[i * 4] = d ? 255 : g; heat[i * 4 + 1] = g; heat[i * 4 + 2] = g; heat[i * 4 + 3] = 255;
    }
    uit.push({ plek, variant: v, verschil: n });
    if (n >= 40) fs.writeFileSync(path.join(dir, 'verschil', `${plek}-${v}.png`), encodePng(A.w, A.h, heat));
  }
}
fs.writeFileSync(path.join(dir, 'zfight_nearverschil.json'), JSON.stringify(uit, null, 1));
const varianten = [...new Set(uit.map((u) => u.variant))].sort((a, b) => (a === 'nauto' ? 1e9 : parseFloat(a.slice(1))) - (b === 'nauto' ? 1e9 : parseFloat(b.slice(1))));
console.log(`| plek | ${varianten.map((v) => `${v === 'nauto' ? 'auto' : v.slice(1).replace('.', ',')} t.o.v. 0,5`).join(' | ')} |`);
console.log(`|---|${varianten.map(() => '---:').join('|')}|`);
for (const plek of stands.keys()) console.log(`| ${plek} | ${varianten.map((v) => { const u = uit.find((x) => x.plek === plek && x.variant === v); return u ? u.verschil : '-'; }).join(' | ')} |`);
