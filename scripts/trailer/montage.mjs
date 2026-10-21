// Monteert een trailer uit opgenomen clips (scripts/trailer/run.mjs) en een geluidsplan (audio/mix.mjs) tot één
// MP4 (H.264 + AAC, 1080p60): knippen op de maat, fades, flitsen, mix van muziek, stemmen en effecten op -14 LUFS.
//
//   node scripts/trailer/montage.mjs <plan.json> --out=<map> [--game=<game-map>] [--keep]
//
// plan.json:
//   { "name": "GDE-Groningen-gameplaytrailer-1080p60", "clipsDir": "C:/.../clips",
//     "clips": [ { "src": "g01.mp4", "in": 0, "dur": 2.57, "speed": 1, "label": "..." }, ... ],   // achter elkaar
//     "fadeIn": 0.4, "fadeOut": 1.2,                    // van/naar zwart
//     "flash": [ { "at": 12.0, "dur": 0.12 } ],        // witte flits (tijd in de trailer)
//     "audio": { ...zie audio/mix.mjs... } }
// De duur van het geluid wordt automatisch de duur van het beeld. Schrijft <out>/<name>.mp4, <out>/<name>.mix.wav,
// <out>/<name>.plan.resolved.json (met de tijden van elke snede, voor de controle).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ffmpegPath, run, probe } from './lib/tools.mjs';
import { renderMix } from './audio/mix.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const args = process.argv.slice(2);
const planFile = args.find((a) => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
if (!planFile) { console.error('gebruik: montage.mjs <plan.json> --out=<map> [--game=<map>]'); process.exit(2); }
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const out = path.resolve(opt('out', '.'));
fs.mkdirSync(out, { recursive: true });
const FPS = plan.fps || 60;
const frames = (s) => Math.round(s * FPS);
const snap = (s) => frames(s) / FPS;

// tijden per clip, op hele beelden
let t = 0;
const cuts = [];
const clips = plan.clips.map((c, i) => {
  const dur = snap(c.dur);
  const f = path.isAbsolute(c.src) ? c.src : path.join(plan.clipsDir || '.', c.src);
  if (!fs.existsSync(f)) throw new Error(`clip ontbreekt: ${f}`);
  const info = probe(f);
  const have = Number(info.format.duration);
  const speed = c.speed || 1;
  if ((c.in || 0) + dur * speed > have + 0.02) throw new Error(`clip ${c.src}: ${((c.in || 0) + dur * speed).toFixed(2)} s gevraagd, ${have.toFixed(2)} s opgenomen`);
  cuts.push({ i, label: c.label || c.src, at: +t.toFixed(4), dur });
  t += dur;
  return { ...c, file: f, dur, speed };
});
const total = snap(t);
const resolved = { ...plan, total, cuts };
const name = plan.name || path.basename(planFile, '.json');
fs.writeFileSync(path.join(out, `${name}.plan.resolved.json`), JSON.stringify(resolved, null, 1));
console.log(`beeld: ${clips.length} clips, ${total.toFixed(2)} s`);

// geluid
const audioPlan = { ...plan.audio, duration: total };
const wav = path.join(out, `${name}.mix.wav`);
const mixRep = renderMix(audioPlan, wav, { game: opt('game', path.join(ROOT, 'game')), report: path.join(out, `${name}.mix.json`) });
console.log(`geluid: ${mixRep.final.lufs} LUFS, piek ${mixRep.final.peak} dBFS (versterking ${mixRep.gainApplied} dB)`);

// de bedoelde sprongen en pauzes voor check_audio.mjs: begin, binnenkomst van de muziek, uitfade, en de stemmen (pauzes tussen woorden onder de ducking)
const allow = { intended: [[0, 0.4, 'begin van de trailer']] };
for (const m of audioPlan.music || []) { allow.intended.push([m.at - 0.3, m.at + 0.5, 'de muziek komt binnen (de drop)']); allow.intended.push([m.at + (m.dur ?? total - m.at) - (m.fadeOut ?? 2.5) - 0.3, total, 'uitfade van de muziek']); }
for (const v of mixRep.voices) allow.intended.push([v.at - 0.4, v.at + v.dur + 0.9, 'stem: ducking van de muziek en pauzes tussen woorden']);
for (const s of audioPlan.sfx || []) if (s.kind === 'impact') allow.intended.push([s.at - 0.1, s.at + 0.6, 'bewuste klap (impact) op de titel of de drop']);
allow.intended.push([total - 1.6, total, 'uitfade naar zwart']);
fs.writeFileSync(path.join(out, `${name}.allow.json`), JSON.stringify(allow, null, 1));

// beeld
const inputs = [];
const chains = [];
clips.forEach((c, i) => {
  inputs.push('-i', c.file);
  const s = c.in || 0;
  const sp = c.speed !== 1 ? `,setpts=PTS/${c.speed}` : '';
  chains.push(`[${i}:v]trim=start=${s}:duration=${(c.dur * c.speed).toFixed(5)},setpts=PTS-STARTPTS${sp},fps=${FPS},scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p[v${i}]`);
});
let vf = `${clips.map((c, i) => `[v${i}]`).join('')}concat=n=${clips.length}:v=1:a=0[cat0]`;
// bijschriftensporen (shots/captions.page.js): schaduw met multiply, tekst met screen; beide op de lengte van de trailer
let capIn = 0;
if (plan.captions) {
  const sh = inputs.length / 2, tx = sh + 1;
  inputs.push('-i', plan.captions.shadow, '-i', plan.captions.text);
  // blend per kleurvlak: dus in RGB (anders worden ook de kleurvlakken vermenigvuldigd en kleurt het beeld paars)
  const RGB = 'scale=in_color_matrix=bt709:in_range=tv,format=gbrp';
  vf += `;[${sh}:v]trim=duration=${total.toFixed(4)},setpts=PTS-STARTPTS,fps=${FPS},${RGB}[csh];[${tx}:v]trim=duration=${total.toFixed(4)},setpts=PTS-STARTPTS,fps=${FPS},${RGB}[ctx];[cat0]${RGB}[crgb]`;
  vf += ';[crgb][csh]blend=all_mode=multiply:shortest=1[cm];[cm][ctx]blend=all_mode=screen:shortest=1[cbl];[cbl]scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[cat]';
  capIn = 2;
} else vf = vf.replace('[cat0]', '[cat]');
let last = 'cat';
const post = [];
if (plan.fadeIn) post.push(`fade=t=in:st=0:d=${plan.fadeIn}`);
if (plan.fadeOut) post.push(`fade=t=out:st=${(total - plan.fadeOut).toFixed(3)}:d=${plan.fadeOut}`);
for (const f of plan.flash || []) post.push(`eq=brightness='min(0.85,1.6*max(0,1-abs(t-${f.at})/${f.dur}))':eval=frame`);
if (post.length) { vf += `;[cat]${post.join(',')}[vout]`; last = 'vout'; }
const mp4 = path.join(out, `${name}.mp4`);
inputs.push('-i', wav);
const ff = ['-hide_banner', '-loglevel', 'error', '-nostats', '-y', ...inputs, '-filter_complex', `${chains.join(';')};${vf}`, '-map', `[${last}]`, '-map', `${clips.length + capIn}:a`,
  '-c:v', 'libx264', '-preset', plan.preset || 'slow', '-crf', String(plan.crf ?? 16), '-profile:v', 'high', '-level', '4.2', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-g', String(FPS * 2), '-bf', '2',
  '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-t', total.toFixed(4), '-movflags', '+faststart', mp4];
console.log('beeld coderen...');
run(ffmpegPath(), ff, { stdio: ['ignore', 'inherit', 'inherit'], encoding: undefined });
const info = probe(mp4);
console.log(`klaar: ${mp4} (${(Number(info.format.size) / 1e6).toFixed(1)} MB, ${Number(info.format.duration).toFixed(2)} s)`);
