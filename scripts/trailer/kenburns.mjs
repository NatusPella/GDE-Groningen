// Langzame zoom/beweging over een stilstaand beeld (bijvoorbeeld een kaart op hoge resolutie) tot een clip van 1920x1080 @60.
//   node scripts/trailer/kenburns.mjs <beeld.png> <uit.mp4> --dur=3.54 [--z0=1.0 --z1=1.35] [--x0=0.5 --y0=0.5 --x1=0.6 --y1=0.45]
// x/y zijn het midden van het beeld in 0..1; zoom 1 = hele beeld. Het bronbeeld wordt eerst 2x opgeschaald (lanczos), zodat de beweging soepel blijft.
import { spawnSync } from 'node:child_process';
import { ffmpegPath } from './lib/tools.mjs';

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? Number(a.slice(k.length + 3)) : d; };
const [src, out] = pos;
if (!src || !out) { console.error('gebruik: kenburns.mjs <beeld> <uit.mp4> --dur=3.54'); process.exit(2); }
const dur = opt('dur', 3.54), fps = 60, n = Math.round(dur * fps);
const z0 = opt('z0', 1), z1 = opt('z1', 1.3), x0 = opt('x0', 0.5), y0 = opt('y0', 0.5), x1 = opt('x1', 0.5), y1 = opt('y1', 0.5);
const k = `(on/${n - 1})`, ease = `(${k}*${k}*(3-2*${k}))`;
const z = `(${z0}+(${z1}-${z0})*${ease})`;
const cx = `(${x0}+(${x1}-${x0})*${ease})`, cy = `(${y0}+(${y1}-${y0})*${ease})`;
const vf = `scale=3840:2160:flags=lanczos,zoompan=z='${z}':x='iw*${cx}-iw/zoom/2':y='ih*${cy}-ih/zoom/2':d=1:s=1920x1080:fps=${fps},format=yuv420p`;
const r = spawnSync(ffmpegPath(), ['-v', 'error', '-y', '-loop', '1', '-framerate', String(fps), '-i', src, '-frames:v', String(n), '-vf', vf, '-c:v', 'libx264', '-crf', '10', '-preset', 'veryfast', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', out], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
console.log(`${out}: ${n} beelden`);
