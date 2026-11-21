// Snelle scan van alle spraakclips op de twee gemelde TTS-fouten (21-11): een ruis-einde (harde burst van ca. 0,2 s vlak voor het
// einde, na bijna-stilte) en een pop-begin (losse klik van 5 ms op ca. 40 ms zonder fade-in), plus het aandeel ruisframes. Zes
// ffmpeg-decoders tegelijk. Schrijft docs/witte-ruis-scan.json (veld spraak_lijst, gerangschikt: beide fouten, ruis-einde,
// pop-begin, dan ruisaandeel vanaf 8 procent); `node scripts/audio/witte_ruis_rapport.mjs` maakt daar het rapport en het paneel van.
//   node scripts/audio/spraak_fouten_scan.mjs [--map=a,b] [--max=n]
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scoreClip, GROEPEN } from './ruisachtig_scan.mjs';
import { popBegin } from './pop_begin.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SR = 22050, PARALLEL = 6;
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };

function* bestanden(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* bestanden(p);
    else if (/\.(mp3|wav|ogg)$/i.test(e.name)) yield p;
  }
}
const decodeer = (f) => new Promise((res) => execFile('ffmpeg', ['-v', 'error', '-i', f, '-t', '40', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { encoding: 'buffer', maxBuffer: 1 << 28 }, (err, out) => (err ? res(null) : res(new Float32Array(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength - (out.byteLength % 4)))))));

const dirs = arg('map', '') ? arg('map', '').split(',') : GROEPEN.spraak;
let lijst = [];
for (const d of dirs) for (const f of bestanden(path.join(ROOT, d))) lijst.push(f);
lijst.sort((a, b) => /anita/i.test(b) - /anita/i.test(a));   // eerst alle Anita-clips
const MAX = Number(arg('max', '0')); if (MAX) lijst = lijst.slice(0, MAX);
const rijen = [];
let i = 0;
async function werker() {
  while (i < lijst.length) {
    const f = lijst[i++];
    const x = await decodeer(f);
    if (!x || x.length < 1024 * 4) continue;
    const s = scoreClip(x);
    rijen.push({ f: path.relative(ROOT, f).replace(/\\/g, '/'), sec: +s.sec.toFixed(2), aandeel: +s.aandeel.toFixed(3), staart: s.staart, eind: s.eind, pop: popBegin(x, SR) });
  }
}
await Promise.all(Array.from({ length: PARALLEL }, werker));
const rang = (r) => (r.eind.burst && r.pop.pop ? 3 : r.eind.burst ? 2 : r.pop.pop ? 1 : 0);
const uitvoer = rijen.filter((r) => rang(r) || r.aandeel >= 0.08).sort((a, b) => rang(b) - rang(a) || b.aandeel - a.aandeel);
const jp = path.join(ROOT, 'docs', 'witte-ruis-scan.json');
let scan = {};
try { scan = JSON.parse(fs.readFileSync(jp, 'utf8')); } catch (e) { /* nieuw */ }
scan.spraak_lijst = uitvoer;
scan.spraak_gemeten = rijen.length;
fs.writeFileSync(jp, JSON.stringify(scan, null, 1));
const n = (fn) => rijen.filter(fn).length;
console.log(`spraak_fouten_scan: ${rijen.length} clips; ruis-einde ${n((r) => r.eind.burst)}, pop-begin ${n((r) => r.pop.pop)}, beide ${n((r) => r.eind.burst && r.pop.pop)}, alleen ruis-einde ${n((r) => r.eind.burst && !r.pop.pop)}, alleen pop ${n((r) => !r.eind.burst && r.pop.pop)}; ruisaandeel >= 8% zonder een van beide ${n((r) => !rang(r) && r.aandeel >= 0.08)}`);
