// Beeldcontrole van een opname of montage: dubbele beelden (haperingen), zwarte beelden, harde sneden en
// "pop-in": een stukje beeld dat in één beeld ineens verandert terwijl de rest rustig doorloopt (een tegel,
// gebouw of boom die inlaadt, een LOD-wissel). Het verschil tussen opeenvolgende beelden wordt in 32x18 blokken
// bekeken (ffmpeg tblend + schaal naar grijs), dus het kost een paar seconden per minuut video.
//   node scripts/trailer/check_video.mjs <video.mp4> [--out=<map>] [--cuts=1.5,4.2,...] [--pop=14]
// --cuts: tijden (s) van bedoelde sneden, die niet als fout tellen. Schrijft <naam>_beeld.json; exit 1 bij pop-in/dubbele beelden.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ffmpegPath, probe } from './lib/tools.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
if (!file) { console.error('gebruik: check_video.mjs <video> [--out=<map>] [--cuts=a,b] [--pop=14]'); process.exit(2); }
const out = path.resolve(opt('out', path.dirname(path.resolve(file))));
fs.mkdirSync(out, { recursive: true });
const base = path.basename(file).replace(/\.[^.]+$/, '');
const POP = Number(opt('pop', 14));
const cuts = opt('cuts', '').split(',').filter(Boolean).map(Number);
const info = probe(file);
const vs = info.streams.find((s) => s.codec_type === 'video');
const [fn, fd] = vs.r_frame_rate.split('/').map(Number);
const fps = fn / fd;
const TW = 32, TH = 18, TN = TW * TH;

function raw(vf) {
  const r = spawnSync(ffmpegPath(), ['-v', 'error', '-i', file, '-an', '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(String(r.stderr));
  return r.stdout;
}
// verschil met het vorige beeld per blok (tblend: het eerste beeld wordt niet uitgevoerd, dus beeld i hoort bij index i-1)
const diff = raw(`tblend=all_mode=difference,scale=${TW}:${TH}:flags=area,format=gray`);
const luma = raw('scale=16:9:flags=area,format=gray');
const nd = Math.floor(diff.length / TN);
const nl = Math.floor(luma.length / (16 * 9));
const D = (i) => diff.subarray(i * TN, (i + 1) * TN); // verschil tussen beeld i+1 en i
const mean = (a) => { let s = 0; for (let k = 0; k < a.length; k++) s += a[k]; return s / a.length; };

const res = { file: path.resolve(file), fps, frames: nl, duration: +(nl / fps).toFixed(2), duplicates: [], cuts: [], blacks: [], pops: [] };
const intendedCut = (t) => cuts.some((c) => Math.abs(c - t) < 0.12);

// verschil per beeld (gemiddelde over blokken)
const avg = new Float32Array(nd);
for (let i = 0; i < nd; i++) avg[i] = mean(D(i));
// een snede is een beeld dat veel meer verschilt dan de beelden eromheen (snelle camera's verschillen overal veel)
const localMed = (i) => { const w = []; for (let k = Math.max(0, i - 6); k <= Math.min(nd - 1, i + 6); k++) if (k !== i) w.push(avg[k]); w.sort((a, b) => a - b); return w[Math.floor(w.length / 2)]; };
const isCut = new Uint8Array(nd);
for (let i = 0; i < nd; i++) {
  const t = (i + 1) / fps;
  if (avg[i] < 0.02) res.duplicates.push(+t.toFixed(3));
  else if (avg[i] > 12 && avg[i] > 2.5 * localMed(i)) { isCut[i] = 1; res.cuts.push({ t: +t.toFixed(3), diff: +avg[i].toFixed(1), intended: intendedCut(t) }); }
}
// zwart
for (let i = 0; i < nl;) {
  const m = mean(luma.subarray(i * 144, (i + 1) * 144));
  if (m < 6) { let j = i; while (j < nl && mean(luma.subarray(j * 144, (j + 1) * 144)) < 6) j++; res.blacks.push([+(i / fps).toFixed(2), +(j / fps).toFixed(2)]); i = j; } else i++;
}
// pop-in: een blok springt in één beeld hoog en valt weer terug, terwijl de rest van het beeld niet snijdt
for (let i = 2; i < nd - 2; i++) {
  if (isCut[i] || isCut[i - 1] || isCut[i + 1]) continue;
  const t = (i + 1) / fps;
  const a = D(i), p = D(i - 1), n = D(i + 1), p2 = D(i - 2), n2 = D(i + 2);
  const blocks = [];
  for (let k = 0; k < TN; k++) {
    const nb = Math.max(p[k], n[k], p2[k] * 0.8, n2[k] * 0.8);
    if (a[k] >= POP && a[k] > nb * 3 + 6) blocks.push(k);
  }
  if (blocks.length && blocks.length <= 40) res.pops.push({ t: +t.toFixed(3), blocks: blocks.length, at: blocks.slice(0, 4).map((k) => [k % TW, Math.floor(k / TW)]), peak: Math.max(...blocks.map((k) => a[k])) });
}
// opeenvolgende pops in aangrenzende beelden samenvoegen
const merged = [];
for (const p of res.pops) { const l = merged[merged.length - 1]; if (l && p.t - l.t < 0.1) l.blocks = Math.max(l.blocks, p.blocks); else merged.push({ ...p }); }
res.pops = merged;
fs.writeFileSync(path.join(out, `${base}_beeld.json`), JSON.stringify(res, null, 1));

const badCuts = res.cuts.filter((c) => !c.intended);
console.log(`${path.basename(file)}: ${res.duration} s, ${nl} beelden @${fps} fps`);
console.log(`dubbele beelden: ${res.duplicates.length}${res.duplicates.length ? ' bij ' + res.duplicates.slice(0, 15).join(', ') + ' s' : ''}`);
console.log(`harde sneden: ${res.cuts.length} (onbedoeld: ${badCuts.length}${badCuts.length ? ' bij ' + badCuts.slice(0, 15).map((c) => c.t).join(', ') + ' s' : ''})`);
console.log(`zwart: ${res.blacks.length ? res.blacks.map((b) => b.join('-')).join(', ') + ' s' : 'geen'}`);
console.log(`pop-in verdacht: ${res.pops.length}${res.pops.length ? ' bij ' + res.pops.slice(0, 25).map((p) => `${p.t}(${p.at[0].join(',')}, ${p.blocks}bl, ${Math.round(p.peak)})`).join('; ') : ''}`);
process.exit(res.pops.length || res.duplicates.length || badCuts.length ? 1 : 0);
