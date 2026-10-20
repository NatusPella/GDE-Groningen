// Vergelijkt twee mappen met schermafdrukken (shots-<naam>.png) beeld voor beeld (#90):
//   node scripts/qa/stadverschil.mjs --a=<map> --b=<map> --out=<map> [--min=0]
// Per paar: gemiddeld verschil in helderheid (md), aandeel pixels dat meer dan 24 (van 765) afwijkt (px), aandeel van de
// 32x32-blokken waarvan de gemiddelde afwijking boven 18 ligt (bl), en het verschil in randen (rd: aandeel pixels dat in
// de ene afbeelding een rand heeft en in de andere niet, na lichte vervaging). Schrijft per paar een montage
// (A | B | verschil) en samenvatting.json / samenvatting.md (gesorteerd op verschil). Alleen lezen en schrijven in --out.
import fs from 'node:fs';
import path from 'node:path';
import { decodePng, encodePng } from '../lib/pngcheck.mjs';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const A = path.resolve(arg('a', '')), B = path.resolve(arg('b', '')), OUT = path.resolve(arg('out', path.join(B, '..', 'verschil')));
fs.mkdirSync(OUT, { recursive: true });
const shots = (d) => new Map(fs.readdirSync(d).filter((f) => /^shots-.+\.png$/.test(f) && f !== 'shots.png').map((f) => [f.slice(6, -4), path.join(d, f)]));
const sa = shots(A), sb = shots(B);

const lumOf = (img) => { const n = img.w * img.h, o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = 0.299 * img.rgba[i * 4] + 0.587 * img.rgba[i * 4 + 1] + 0.114 * img.rgba[i * 4 + 2]; return o; };
function blur(l, w, h) { // 3x3 gemiddelde
  const o = new Float32Array(l.length);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += l[(y + dy) * w + x + dx]; o[y * w + x] = s / 9; }
  return o;
}
function edges(l, w, h) { // sobel-grootte
  const o = new Float32Array(l.length);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = -l[i - w - 1] - 2 * l[i - 1] - l[i + w - 1] + l[i - w + 1] + 2 * l[i + 1] + l[i + w + 1];
    const gy = -l[i - w - 1] - 2 * l[i - w] - l[i - w + 1] + l[i + w - 1] + 2 * l[i + w] + l[i + w + 1];
    o[i] = Math.hypot(gx, gy);
  }
  return o;
}
const rows = [];
for (const [naam, fa] of sa) {
  const fb = sb.get(naam);
  if (!fb) { rows.push({ naam, ontbreekt: 'B' }); continue; }
  let ia, ib;
  try { ia = decodePng(fs.readFileSync(fa)); ib = decodePng(fs.readFileSync(fb)); } catch (e) { rows.push({ naam, fout: e.message }); continue; }
  if (ia.w !== ib.w || ia.h !== ib.h) { rows.push({ naam, fout: `afmetingen ${ia.w}x${ia.h} / ${ib.w}x${ib.h}` }); continue; }
  const { w, h } = ia, n = w * h;
  let sum = 0, big = 0;
  const diff = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const d = Math.abs(ia.rgba[i * 4] - ib.rgba[i * 4]) + Math.abs(ia.rgba[i * 4 + 1] - ib.rgba[i * 4 + 1]) + Math.abs(ia.rgba[i * 4 + 2] - ib.rgba[i * 4 + 2]);
    diff[i] = d; sum += d; if (d > 24) big++;
  }
  const la = blur(lumOf(ia), w, h), lb = blur(lumOf(ib), w, h);
  const ea = edges(la, w, h), eb = edges(lb, w, h);
  let ed = 0, ecount = 0;
  for (let i = 0; i < n; i++) { const x = ea[i] > 60, y = eb[i] > 60; if (x || y) { ecount++; if (x !== y) ed++; } }
  const BS = 32; let blocks = 0, hot = 0;
  for (let by = 0; by + BS <= h; by += BS) for (let bx = 0; bx + BS <= w; bx += BS) {
    let s = 0; for (let y = by; y < by + BS; y++) for (let x = bx; x < bx + BS; x++) s += diff[y * w + x];
    blocks++; if (s / (BS * BS) > 18) hot++;
  }
  const row = { naam, md: +(sum / n / 3).toFixed(2), px: +(big / n).toFixed(4), bl: +(hot / blocks).toFixed(3), rd: +(ecount ? ed / ecount : 0).toFixed(3) };
  rows.push(row);
  // montage: A | B | verschil, op de halve grootte
  const mw = Math.floor(w / 2), mh = Math.floor(h / 2), M = new Uint8Array(mw * 3 * mh * 4);
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const si = ((y * 2) * w + x * 2) * 4;
    for (let k = 0; k < 3; k++) { M[(y * mw * 3 + x) * 4 + k] = ia.rgba[si + k]; M[(y * mw * 3 + mw + x) * 4 + k] = ib.rgba[si + k]; }
    const d = Math.min(255, diff[(y * 2) * w + x * 2] * 3);
    const o = (y * mw * 3 + 2 * mw + x) * 4; M[o] = d; M[o + 1] = d * 0.25; M[o + 2] = 255 - d; // blauw = gelijk, rood = verschil
    M[(y * mw * 3 + x) * 4 + 3] = 255; M[(y * mw * 3 + mw + x) * 4 + 3] = 255; M[o + 3] = 255;
  }
  fs.writeFileSync(path.join(OUT, `paar-${naam}.png`), encodePng(mw * 3, mh, M));
}
const ok = rows.filter((r) => r.md !== undefined).sort((a, b) => b.md - a.md);
const mean = (k) => (ok.length ? ok.reduce((s, r) => s + r[k], 0) / ok.length : 0);
const median = (k) => { const v = ok.map((r) => r[k]).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 0; };
const summary = { a: A, b: B, paren: ok.length, ontbreekt: rows.filter((r) => r.ontbreekt || r.fout), gemiddeld: { md: +mean('md').toFixed(2), px: +mean('px').toFixed(4), bl: +mean('bl').toFixed(3), rd: +mean('rd').toFixed(3) }, mediaan: { md: median('md'), px: median('px'), bl: median('bl'), rd: median('rd') }, rows: ok };
fs.writeFileSync(path.join(OUT, 'samenvatting.json'), JSON.stringify(summary, null, 1));
const md = [`# Verschil ${path.basename(A)} -> ${path.basename(B)}`, '', `Paren: ${ok.length}. Gemiddeld md ${summary.gemiddeld.md}, px ${summary.gemiddeld.px}, bl ${summary.gemiddeld.bl}, rd ${summary.gemiddeld.rd}; mediaan md ${summary.mediaan.md}, px ${summary.mediaan.px}, bl ${summary.mediaan.bl}, rd ${summary.mediaan.rd}.`, '', '| beeld | md | px | bl | rd |', '|---|---|---|---|---|', ...ok.map((r) => `| ${r.naam} | ${r.md} | ${r.px} | ${r.bl} | ${r.rd} |`)];
fs.writeFileSync(path.join(OUT, 'samenvatting.md'), md.join('\n') + '\n');
console.log(`${ok.length} paren; gemiddeld md ${summary.gemiddeld.md} px ${summary.gemiddeld.px} bl ${summary.gemiddeld.bl} rd ${summary.gemiddeld.rd}; mediaan md ${summary.mediaan.md} px ${summary.mediaan.px}; uitvoer ${OUT}`);
