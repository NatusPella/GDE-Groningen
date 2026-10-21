// Voorbeeldblad van clips: per clip een rij van de 6 stills (pv-<clip>-NNNN.png) uit repl_shot --preview, 6 clips per blad (1920x1080).
//   node scripts/trailer/pv.mjs --out=<repl-map> --sheet=<naam> clip1 clip2 clip3 clip4
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ffmpegPath, fontFile } from './lib/tools.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const out = path.resolve(opt('out', '.'));
const clips = args.filter((a) => !a.startsWith('--'));
const rows = [];
for (const c of clips) {
  const files = fs.readdirSync(out).filter((f) => f.startsWith(`pv-${c}-`) && f.endsWith('.png')).sort();
  if (files.length) rows.push({ c, files: files.map((f) => path.join(out, f)) });
  else console.error(`geen stills voor ${c}`);
}
const W = 240, H = 135;
const inputs = rows.flatMap((r) => r.files.flatMap((f) => ['-i', f]));
let n = 0;
const parts = [], layout = [];
rows.forEach((r, ri) => r.files.forEach((f, ci) => {
  parts.push(`[${n}:v]scale=${W}:${H}${ci === 0 ? `,drawtext=fontfile='${fontFile()}':text='${r.c}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=3` : ''}[v${n}]`);
  layout.push(`${ci * W}_${ri * H}`);
  n++;
}));
const fc = `${parts.join(';')};${Array.from({ length: n }, (_, i) => `[v${i}]`).join('')}xstack=inputs=${n}:layout=${layout.join('|')}:fill=black[o]`;
const f = path.join(out, `${opt('sheet', 'pv')}.jpg`);
const r = spawnSync(ffmpegPath(), ['-v', 'error', '-y', ...inputs, '-filter_complex', fc, '-map', '[o]', '-frames:v', '1', '-q:v', '3', f], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
console.log(f);
