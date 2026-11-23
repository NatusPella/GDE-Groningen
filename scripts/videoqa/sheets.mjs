// Contactvellen voor het oog uit een video-QA-opname: een dichte steekproef (--step=<s>) plus de beelden rond elke kandidaat
// uit analyse.json, 3 kolommen x 4 rijen per vel (640x360 per cel, JPEG kwaliteit ~85), met beeldnummer en tijd erin.
//
//   node scripts/videoqa/sheets.mjs <opnamemap> [--step=2] [--out=<map>/sheets] [--cap=25] [--list]
//   node scripts/videoqa/sheets.mjs <opnamemap> --frames=120,480,900 --name=extra     (alleen deze beelden)
//   node scripts/videoqa/sheets.mjs <opnamemap> --full=120,480 --out=<map> [--w=960]   (losse beelden op leesbare grootte)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ffmpegPath, ffprobePath, fontFile } from '../trailer/lib/tools.mjs';

const args = process.argv.slice(2);
const dir = path.resolve(args.find((a) => !a.startsWith('--')) || '.');
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const FPS = 30;
const out = path.resolve(opt('out', path.join(dir, 'sheets')));
fs.mkdirSync(out, { recursive: true });
const segs = fs.readdirSync(dir).filter((f) => /^seg\d+\.mp4$/.test(f)).sort().slice(0, Number(opt('upto', 999)));
const counts = segs.map((s) => { const r = spawnSync(ffprobePath(), ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=nb_frames', '-of', 'csv=p=0', path.join(dir, s)], { encoding: 'utf8' }); return Number(r.stdout.trim()); });
const starts = counts.map((_, i) => counts.slice(0, i).reduce((a, b) => a + b, 0));
const total = counts.reduce((a, b) => a + b, 0);
const tstr = (i) => { const t = i / FPS; return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}.${Math.round((t % 1) * 10)}`; };

function extract(frames, w, q, dest, prefix) {
  // frames: oplopend, uniek; geeft { frame -> bestand }
  const map = {};
  segs.forEach((s, si) => {
    const local = frames.filter((f) => f >= starts[si] && f < starts[si] + counts[si]).map((f) => f - starts[si]);
    if (!local.length) return;
    for (let off = 0; off < local.length; off += 120) {
      const part = local.slice(off, off + 120);
      const sel = part.map((n) => `eq(n\\,${n})`).join('+');
      const tmp = path.join(dest, `_x${si}_${off}_%04d.jpg`);
      const filt = path.join(dest, '_filter.txt');
      fs.writeFileSync(filt, `select='${sel}',scale=${w}:-2:flags=bicubic`);
      const r = spawnSync(ffmpegPath(), ['-v', 'error', '-y', '-i', path.join(dir, s), '-/filter:v', filt, '-fps_mode', 'passthrough', '-q:v', String(q), tmp]);
      if (r.status !== 0) throw new Error(String(r.stderr).slice(0, 300));
      part.forEach((n, k) => { const f = path.join(dest, `_x${si}_${off}_${String(k + 1).padStart(4, '0')}.jpg`); const g = path.join(dest, `${prefix}${starts[si] + n}.jpg`); if (fs.existsSync(f)) { fs.renameSync(f, g); map[starts[si] + n] = g; } });
    }
  });
  try { fs.unlinkSync(path.join(dest, '_filter.txt')); } catch { /* weg */ }
  return map;
}

if (opt('full', '')) {
  const fr = [...new Set(opt('full').split(',').map(Number))].sort((a, b) => a - b);
  const m = extract(fr, Number(opt('w', 960)), 4, out, 'f');
  console.log(Object.values(m).join('\n'));
  process.exit(0);
}

let frames = new Set();
if (opt('frames', '')) opt('frames').split(',').map(Number).forEach((f) => frames.add(f));
else {
  const step = Math.round(Number(opt('step', 2)) * FPS);
  for (let f = 0; f < total; f += step) frames.add(f);
  const A = JSON.parse(fs.readFileSync(path.join(dir, 'analyse.json'), 'utf8')).kandidaten;
  const cap = Number(opt('cap', 25));
  const kinds = [...new Set(A.map((c) => c.kind))];
  for (const k of kinds) {
    const list = A.filter((c) => c.kind === k && !(k === 'stilstaand-beeld' && c.verwacht));
    // de hoogste scores, maar verspreid: niet twee binnen 1 s van elkaar
    const pick = [];
    for (const c of [...list].sort((a, b) => b.score - a.score)) { if (pick.length >= cap) break; if (pick.every((p) => Math.abs(p.frame - c.frame) > FPS)) pick.push(c); }
    for (const c of pick) {
      const base = c.frame;
      const offs = k === 'pop-in' || k.startsWith('flikker') || k === 'snede' ? [-1, 0, 1] : [0, Math.min(15, (c.len || 1) >> 1)];
      for (const o of offs) if (base + o >= 0 && base + o < total) frames.add(base + o);
    }
  }
}
const sorted = [...frames].filter((f) => f >= 0 && f < total).sort((a, b) => a - b);
if (flag()) { console.log(sorted.length + ' beelden'); }
function flag() { return args.includes('--list'); }
const tmp = path.join(out, '_tmp'); fs.mkdirSync(tmp, { recursive: true });
const files = extract(sorted, 640, 4, tmp, 'c');
const name = opt('name', 'vel');
const font = fontFile();
let n = 0;
for (let i = 0; i < sorted.length; i += 12) {
  const group = sorted.slice(i, i + 12).filter((f) => files[f]);
  if (!group.length) continue;
  const inputs = group.flatMap((f) => ['-i', files[f]]);
  const lab = group.map((f, k) => `[${k}:v]drawtext=fontfile='${font}':text='${f}  ${(f / FPS).toFixed(1)}s':x=8:y=8:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=4[l${k}]`);
  while (group.length < 12) group.push(-1);
  const real = group.filter((f) => f >= 0).length;
  const layout = Array.from({ length: real }, (_, k) => `${(k % 3) * 640}_${Math.floor(k / 3) * 360}`).join('|');
  const fc = `${lab.join(';')};${Array.from({ length: real }, (_, k) => `[l${k}]`).join('')}xstack=inputs=${real}:layout=${layout}[o]`;
  const file = path.join(out, `${name}-${String(++n).padStart(3, '0')}-${sorted[i]}.jpg`);
  const r = spawnSync(ffmpegPath(), ['-v', 'error', '-y', ...inputs.slice(0, real * 2), '-filter_complex', fc, '-map', '[o]', '-frames:v', '1', '-q:v', '4', file]);
  if (r.status !== 0) throw new Error(String(r.stderr).slice(0, 300));
}
for (const f of Object.values(files)) { try { fs.unlinkSync(f); } catch { /* weg */ } }
try { fs.rmdirSync(tmp); } catch { /* niet leeg */ }
console.log(`${sorted.length} beelden in ${n} vellen in ${out}`);
