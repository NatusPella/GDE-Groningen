// Controle van een opgenomen trailer (docs/youtube/pakket.md): maakt contactbladen met een beeld per
// seconde (met tijdstempel) om met het oog door te lopen, meldt zwarte stukken, stille stukken en het
// geluidsniveau, en geeft de duur, het formaat en de bitrate. Alleen ffmpeg/ffprobe, niets wordt geüpload.
//
//   node scripts/video_check.mjs <video.mp4> --out=<map> [--step=1] [--tile=4x3] [--from=0] [--to=<s>]
//
// Schrijft <out>/<naam>_blad_01.jpg, ... en <out>/<naam>_controle.txt. Geen automaat vervangt het
// bekijken van de bladen: zwart beeld, rare camera, ontbrekende stad (lage LOD) zie je alleen zo.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
if (!file || !fs.existsSync(file)) { console.error('gebruik: node scripts/video_check.mjs <video.mp4> --out=<map>'); process.exit(1); }
const name = path.basename(file).replace(/\.[^.]+$/, '');
const out = path.resolve(opt('out', path.join(path.dirname(file), 'controle')));
const step = Number(opt('step', 1));
const [tx, ty] = opt('tile', '4x3').split('x').map(Number);
fs.mkdirSync(out, { recursive: true });
const ff = process.env.FFMPEG || 'ffmpeg';
const fp = process.env.FFPROBE || 'ffprobe';
const sh = (cmd, a) => spawnSync(cmd, a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const probe = JSON.parse(sh(fp, ['-v', 'error', '-show_entries', 'format=duration,bit_rate,size:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels', '-of', 'json', file]).stdout);
const dur = Number(probe.format.duration);
const from = Number(opt('from', 0)), to = Math.min(Number(opt('to', dur)), dur);
const report = [];
report.push(`bestand: ${file}`, `duur: ${dur.toFixed(2)} s, ${(probe.format.size / 1e6).toFixed(1)} MB, ${Math.round(probe.format.bit_rate / 1000)} kbit/s`);
for (const s of probe.streams) report.push(s.codec_type === 'video' ? `video: ${s.codec_name} ${s.width}x${s.height} ${s.r_frame_rate} fps` : `audio: ${s.codec_name} ${s.sample_rate} Hz, ${s.channels} kanalen`);
if (!probe.streams.some((s) => s.codec_type === 'audio')) report.push('LET OP: geen audiospoor');

// zwart beeld en stilte
const bl = sh(ff, ['-hide_banner', '-i', file, '-vf', 'blackdetect=d=0.15:pix_th=0.06', '-an', '-f', 'null', '-']).stderr;
report.push('', 'zwarte stukken (blackdetect, >0,15 s):');
const blacks = [...bl.matchAll(/black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)/g)];
report.push(...(blacks.length ? blacks.map((m) => `  ${Number(m[1]).toFixed(2)} - ${Number(m[2]).toFixed(2)} s (${Number(m[3]).toFixed(2)} s)`) : ['  geen']));
const sl = sh(ff, ['-hide_banner', '-i', file, '-vn', '-af', 'silencedetect=n=-50dB:d=0.5', '-f', 'null', '-']).stderr;
report.push('', 'stille stukken (silencedetect, <-50 dB, >0,5 s):');
const sil = [...sl.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)];
report.push(...(sil.length ? sil.map((m) => `  ${Number(m[1]).toFixed(2)} - ${Number(m[2]).toFixed(2)} s (${Number(m[3]).toFixed(2)} s)`) : ['  geen']));
const vd = sh(ff, ['-hide_banner', '-i', file, '-vn', '-af', 'volumedetect', '-f', 'null', '-']).stderr;
const mv = /mean_volume: (-?[\d.]+) dB/.exec(vd), mx = /max_volume: (-?[\d.]+) dB/.exec(vd);
report.push('', `geluid: gemiddeld ${mv ? mv[1] : '?'} dB, piek ${mx ? mx[1] : '?'} dB`);
const el = sh(ff, ['-hide_banner', '-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr;
const lu = /I:\s+(-?[\d.]+) LUFS/.exec(el.slice(el.lastIndexOf('Summary')));
if (lu) report.push(`luidheid: ${lu[1]} LUFS (YouTube normaliseert rond -14; een trailer mag tussen -20 en -12 liggen)`);

// geluidsniveau per seconde, als regel met streepjes
const ast = sh(ff, ['-hide_banner', '-i', file, '-vn', '-af', 'astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-', '-f', 'null', '-']).stdout;
const levels = [...ast.matchAll(/pts_time:([\d.]+)\s+lavfi\.astats\.Overall\.RMS_level=(-?[\d.inf]+)/g)].map((m) => [Number(m[1]), m[2] === '-inf' ? -99 : Number(m[2])]);
if (levels.length) {
  const bins = new Map();
  for (const [t, v] of levels) { const k = Math.floor(t); bins.set(k, Math.max(bins.get(k) ?? -99, v)); }
  report.push('', 'RMS per seconde (dB; ▁ stil … █ luid):');
  let line = '', row = '';
  for (let s = 0; s < Math.floor(dur); s++) {
    const v = bins.get(s) ?? -99;
    row += '▁▂▃▄▅▆▇█'[Math.max(0, Math.min(7, Math.round((v + 60) / 7.5)))];
    if ((s + 1) % 10 === 0) { line += `  ${String(s - 9).padStart(3)}s ${row}\n`; row = ''; }
  }
  if (row) line += `  ${String(Math.floor(dur) - row.length + 1).padStart(3)}s ${row}\n`;
  report.push(line.trimEnd());
}

// contactbladen
const per = tx * ty;
const font = process.platform === 'win32' ? 'C\\:/Windows/Fonts/arial.ttf' : '/System/Library/Fonts/Supplemental/Arial.ttf';
const w = Math.floor(1920 / tx);
let sheets = 0;
for (let t0 = from; t0 < to - 1e-6; t0 += per * step) {
  const n = ++sheets;
  const dest = path.join(out, `${name}_blad_${String(n).padStart(2, '0')}.jpg`);
  const vf = `fps=1/${step},setpts=PTS+${t0}/TB,scale=${w}:-1,drawtext=fontfile='${font}':text='%{pts\\:hms}':x=6:y=h-th-6:fontcolor=white:fontsize=22:box=1:boxcolor=black@0.6,tile=${tx}x${ty}:padding=4:color=black`;
  const r = sh(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(t0), '-t', String(per * step), '-i', file, '-vf', vf, '-frames:v', '1', '-q:v', '3', dest]);
  if (r.status !== 0) { report.push(`blad ${n}: mislukt ${String(r.stderr).slice(0, 200)}`); break; }
}
report.push('', `${sheets} contactbladen in ${out}`);
fs.writeFileSync(path.join(out, `${name}_controle.txt`), report.join('\n') + '\n');
console.log(report.join('\n'));
