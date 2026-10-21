// Contactblad van losse beelden: node scripts/trailer/contact.mjs --out=blad.jpg [--cols=2] [--w=960] beeld1.png beeld2.png ...
// (labels: de bestandsnaam zonder map en extensie, linksboven)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ffmpegPath, fontFile } from './lib/tools.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const files = args.filter((a) => !a.startsWith('--'));
const cols = Number(opt('cols', 2)), w = Number(opt('w', 960)), h = Math.round(w * 9 / 16);
const rows = Math.ceil(files.length / cols);
const inputs = files.flatMap((f) => ['-i', f]);
const parts = files.map((f, i) => `[${i}:v]scale=${w}:${h},drawtext=fontfile='${fontFile()}':text='${path.basename(f).replace(/\.[^.]+$/, '').replace(/'/g, '')}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=4[v${i}]`);
const layout = files.map((f, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|');
const fc = `${parts.join(';')};${files.map((f, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=black[o]`;
const r = spawnSync(ffmpegPath(), ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', fc, '-map', '[o]', '-frames:v', '1', '-q:v', '3', opt('out', 'blad.jpg')], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
console.log(`${opt('out', 'blad.jpg')}: ${files.length} beelden, ${cols * w}x${rows * h}`);
