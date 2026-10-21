// Contactbladen van een video voor de beeldcontrole met het oog: één beeld per seconde (of --every=s), met tijdstempel,
// 12 per blad (4 x 3), plus losse close-ups op verzoek.
//   node scripts/trailer/contact_video.mjs <video.mp4> --out=<map> [--every=1] [--w=480] [--cols=4] [--rows=3]
//   node scripts/trailer/contact_video.mjs <video.mp4> --out=<map> --at=12.5,13,40 [--w=1280]     (losse beelden)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ffmpegPath, probe, fontFile } from './lib/tools.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
if (!file) { console.error('gebruik: contact_video.mjs <video> --out=<map> [--every=1] [--at=t1,t2]'); process.exit(2); }
const out = path.resolve(opt('out', '.'));
fs.mkdirSync(out, { recursive: true });
const base = path.basename(file).replace(/\.[^.]+$/, '');
const dur = Number(probe(file).format.duration);
const W = Number(opt('w', 480)), H = Math.round(W * 9 / 16);
const font = fontFile();
const stamp = (s) => `${Math.floor(s / 60)}m${(s % 60).toFixed(1).padStart(4, '0')}s`;
const label = (x, y, text, size) => `drawtext=fontfile='${font}':text='${text}':x=${x}:y=${y}:fontsize=${size}:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=3`;

if (opt('at', '')) {
  for (const t of opt('at', '').split(',').map(Number)) {
    const f = path.join(out, `${base}_${t.toFixed(2).replace('.', '_')}.png`);
    const r = spawnSync(ffmpegPath(), ['-v', 'error', '-y', '-ss', String(t), '-i', file, '-frames:v', '1', '-vf', `scale=${W}:${H},${label(8, 8, stamp(t), Math.round(W / 40))}`, f], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
    console.log(f);
  }
  process.exit(0);
}
const every = Number(opt('every', 1)), cols = Number(opt('cols', 4)), rows = Number(opt('rows', 3));
const per = cols * rows;
const times = [];
for (let t = 0; t < dur - 0.05; t += every) times.push(t);
for (let b = 0; b * per < times.length; b++) {
  const set = times.slice(b * per, (b + 1) * per);
  // één ffmpeg per blad: de beelden op hun tijd selecteren
  const inputs = set.flatMap((t) => ['-ss', String(t), '-i', file]);
  const parts = set.map((t, i) => `[${i}:v]trim=end_frame=1,scale=${W}:${H},${label(6, 6, stamp(t), Math.round(W / 24))}[v${i}]`);
  const layout = set.map((t, i) => `${(i % cols) * W}_${Math.floor(i / cols) * H}`).join('|');
  const fc = `${parts.join(';')};${set.map((t, i) => `[v${i}]`).join('')}xstack=inputs=${set.length}:layout=${layout}:fill=black[o]`;
  const f = path.join(out, `${base}_blad_${String(b + 1).padStart(2, '0')}.jpg`);
  const r = spawnSync(ffmpegPath(), ['-v', 'error', '-y', ...inputs, '-filter_complex', fc, '-map', '[o]', '-frames:v', '1', '-q:v', '3', f], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
}
console.log(`${Math.ceil(times.length / per)} bladen in ${out} (${times.length} beelden, elke ${every} s)`);
