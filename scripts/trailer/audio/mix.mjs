// Mixt het geluid van een trailer volgens een plan: Gemini-muziek (game/audio/gmusic) met nette in- en uitfades,
// stemmen uit de bestaande opnames (game/audio/voicelines, geen nieuwe TTS), eigen effecten (gesynthetiseerd in
// ffmpeg, geen samples), de muziek zakt onder de stemmen (ducking met vloeiende flanken) en daarna wordt alles
// op -14 LUFS gebracht met een true peak van ten hoogste -1 dBTP (twee ronden: meten, dan rechte versterking).
//
//   node scripts/trailer/audio/mix.mjs <plan.json> --out=<mix.wav> [--game=<map met audio/>] [--report=<json>]
//
// plan.json:
//   { "duration": 85.7,
//     "music":  [ { "file": "Vismarkt_Sprint.mp3", "from": 14.194, "at": 0, "dur": 85.7, "fadeIn": 0.05, "fadeOut": 3, "gain": -3 } ],
//     "voices": [ { "src": "audio/voicelines/story/....mp3", "at": 12.0, "gain": 0, "target": -16 } ],
//     "sfx":    [ { "kind": "impact", "at": 3.2, "gain": -4 } ],
//     "duck":   { "depth": 9, "attack": 0.18, "release": 0.5, "pad": 0.12 } }
// De muziek (en alleen de muziek) zakt `depth` dB onder elke stem. Alle tijden in seconden van de trailer.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ffmpegPath, run } from '../lib/tools.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const SR = 48000;

// Eigen effecten: expressie (aevalsrc) of ruisbron met filters; t = lengte in s. Alles mono, daarna naar stereo.
export const SFX = {
  // lage dreun voor een titel of een harde snede: dalende sinus + korte ruisklap
  impact: { t: 1.6, expr: '0.9*sin(2*PI*(46+90*exp(-t*18))*t)*exp(-t*3.2)+0.35*(random(0)*2-1)*exp(-t*40)' },
  // zachtere dreun
  thud: { t: 0.9, expr: '0.8*sin(2*PI*(55+70*exp(-t*22))*t)*exp(-t*6.5)' },
  // zoevende ruis die opkomt en weer wegzakt (snede, camera die langs een gebouw schiet)
  whoosh: { t: 0.9, noise: 'pink', fx: 'bandpass=f=1500:width_type=q:w=0.45,volume=eval=frame:volume=\'pow(sin(PI*min(1,t/0.9)),2.2)*2.2\'' },
  // snelle zoef voor een korte snede
  swish: { t: 0.45, noise: 'white', fx: 'bandpass=f=3200:width_type=q:w=0.7,volume=eval=frame:volume=\'pow(sin(PI*min(1,t/0.45)),1.8)*1.6\'' },
  // opbouw: ruis en stijgende toon die naar een moment toe zwelt (t seconden lang, stopt abrupt)
  riser: { t: 3.0, expr: '(0.5*(random(0)*2-1)+0.45*sin(2*PI*(180+1900*pow(t/3,2.2))*t))*pow(t/3,2.4)' },
  riserLong: { t: 6.0, expr: '(0.45*(random(0)*2-1)+0.4*sin(2*PI*(160+2400*pow(t/6,2.3))*t))*pow(t/6,2.6)' },
  // korte klik van een knop in het menu
  click: { t: 0.09, expr: '0.55*sin(2*PI*1500*t)*exp(-t*70)+0.25*sin(2*PI*2700*t)*exp(-t*90)' },
  // zachte tik bij het wisselen van tabblad
  tick: { t: 0.06, expr: '0.4*sin(2*PI*2100*t)*exp(-t*110)' },
  // fietsbel
  bel: { t: 1.3, expr: '0.5*sin(2*PI*2350*t)*exp(-t*3.2)+0.35*sin(2*PI*3520*t)*exp(-t*4.2)+0.2*sin(2*PI*5300*t)*exp(-t*6)' },
  // kerkklok / torenklok: lage klok
  klok: { t: 3.5, expr: '0.55*sin(2*PI*196*t)*exp(-t*0.9)+0.35*sin(2*PI*392*t)*exp(-t*1.4)+0.22*sin(2*PI*588*t)*exp(-t*2)+0.14*sin(2*PI*790*t)*exp(-t*2.6)' },
  // sirene (politie): twee tonen
  sirene: { t: 2.6, expr: '0.28*sin(2*PI*(820+140*sgn(sin(2*PI*1.35*t)))*t)*min(1,t*8)*min(1,(2.6-t)*8)' },
  // optrekkende motor: laag brommen dat in toerental stijgt
  motor: { t: 2.2, expr: '(0.34*sin(2*PI*(38+95*t/2.2)*t)+0.22*sin(2*PI*(76+190*t/2.2)*t)+0.12*sin(2*PI*(114+285*t/2.2)*t)+0.1*(random(0)*2-1)*0.4)*min(1,t*6)*min(1,(2.2-t)*4)' },
  // motorgeluid dat voorbijgaat (kort brullen)
  langs: { t: 1.4, noise: 'brown', fx: 'lowpass=f=900,volume=eval=frame:volume=\'pow(sin(PI*min(1,t/1.4)),2)*3\'' },
  // plons water
  plons: { t: 1.0, noise: 'white', fx: 'bandpass=f=1100:width_type=q:w=0.5,volume=eval=frame:volume=\'exp(-t*5)*2.4\'' },
  // geldrinkel (muntjes)
  munt: { t: 0.7, expr: '0.35*sin(2*PI*2640*t)*exp(-t*9)+0.3*sin(2*PI*3520*t)*exp(-t*13)+0.2*sin(2*PI*4180*t)*exp(-t*18)' },
  // trein/lichtbaken: korte hoge dubbele toon
  ding: { t: 1.1, expr: '0.45*sin(2*PI*1175*t)*exp(-t*4)+0.3*sin(2*PI*1760*t)*exp(-t*5)' },
  // lage hartslag voor een stille spanningsmoment
  hart: { t: 1.2, expr: '0.9*sin(2*PI*52*t)*exp(-t*14)+0.7*sin(2*PI*52*(t-0.28))*exp(-(t-0.28)*14)*gte(t,0.28)' },
  // sfeer: wind over de daken en een zacht stadsgeruis (lange stukken die in en uit faden); de montage legt ze onder de opening
  wind: { t: 8, noise: 'brown', fx: "lowpass=f=520,highpass=f=35,volume=eval=frame:volume='(0.35+0.25*sin(2*PI*0.23*t))*min(1,t/1.2)*min(1,(8-t)/1.5)*5'" },
  stad: { t: 8, noise: 'pink', fx: "bandpass=f=900:width_type=q:w=0.35,volume=eval=frame:volume='(0.5+0.3*sin(2*PI*0.4*t))*min(1,t/1.0)*min(1,(8-t)/1.5)*2.2'" },
  // meeuw: twee dalende uithalen
  meeuw: { t: 1.3, expr: "0.3*sin(2*PI*(2300-1000*min(t,0.55)/0.55)*t)*exp(-t*2.2)*min(1,t*40)+0.22*sin(2*PI*(2000-800*min(max(t-0.65,0),0.5)/0.5)*t)*gte(t,0.65)*exp(-(t-0.65)*3)" },
  // doorlopende geluiden onder een shot (8 s, zachte in- en uitloop; de montage legt ze achter elkaar)
  motorloop: { t: 8, expr: "(0.30*sin(2*PI*58*t+0.5*sin(2*PI*6*t))+0.18*sin(2*PI*116*t+0.7*sin(2*PI*6*t))+0.10*sin(2*PI*174*t)+0.06*(random(0)*2-1))*min(1,t/0.6)*min(1,(8-t)/0.8)" },
  regen: { t: 8, noise: 'pink', fx: "highpass=f=1200,lowpass=f=9000,volume=eval=frame:volume='min(1,t/0.8)*min(1,(8-t)/1.0)*1.1'" },
  water: { t: 8, noise: 'pink', fx: "bandpass=f=700:width_type=q:w=0.5,volume=eval=frame:volume='(0.6+0.4*sin(2*PI*0.7*t))*min(1,t/0.8)*min(1,(8-t)/1.0)*2.2'" },
  rotor: { t: 8, expr: "(0.55*sin(2*PI*38*t)*(0.55+0.45*sin(2*PI*10.5*t))+0.20*(random(0)*2-1)*(0.5+0.5*sin(2*PI*10.5*t)))*min(1,t/0.8)*min(1,(8-t)/0.8)" },
  mensen: { t: 8, noise: 'pink', fx: "bandpass=f=1100:width_type=q:w=0.25,volume=eval=frame:volume='(0.55+0.35*sin(2*PI*0.37*t)+0.1*sin(2*PI*1.3*t))*min(1,t/1.0)*min(1,(8-t)/1.0)*3'" },
  // menu: zachte opening van een scherm
  scherm: { t: 0.5, noise: 'pink', fx: "bandpass=f=2400:width_type=q:w=0.6,volume=eval=frame:volume='pow(sin(PI*min(1,t/0.5)),2)*1.2'" },
  // camera-sluiter (fotomodus)
  sluiter: { t: 0.22, noise: 'white', fx: 'highpass=f=1800,volume=eval=frame:volume=\'exp(-t*28)*2\'' },
};

function sfxInput(kind, i) {
  const s = SFX[kind];
  if (!s) throw new Error(`onbekend effect: ${kind}`);
  const src = s.expr ? `aevalsrc='${s.expr}':s=${SR}:d=${s.t}` : `anoisesrc=c=${s.noise}:a=0.9:r=${SR}:d=${s.t}`;
  return { src, fx: s.fx || '', dur: s.t };
}

const db = (x) => 10 ** (x / 20);
const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

// stemduur en luidheid van een bestand (ffmpeg ebur128), voor de niveaus en de ducking
export function measure(file) {
  const r = run(ffmpegPath(), ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { allowFail: true });
  const t = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  const g = (re) => { const m = t.match(re); return m ? Number(m[1]) : null; };
  const dur = (r.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/) || []).slice(1).map(Number);
  return { lufs: g(/I:\s+(-?[\d.]+) LUFS/), peak: g(/Peak:\s+(-?[\d.]+) dBFS/), dur: dur.length ? dur[0] * 3600 + dur[1] * 60 + dur[2] : null };
}

// ducking-omhullende van de muziek: 1 = vol, onder een stem 10^(-depth/20); trapezium per stem (aanloop, vlak, uitloop)
function duckExpr(voices, { depth = 9, attack = 0.18, release = 0.5, pad = 0.12 } = {}) {
  if (!voices.length) return '1';
  const lo = db(-depth);
  // taper van 0 (geen duck) tot 1 (vol duck)
  const traps = voices.map(({ at, dur }) => {
    const a0 = at - pad - attack, a1 = at - pad, b0 = at + dur + pad, b1 = at + dur + pad + release;
    return `min(clip((t-${a0.toFixed(3)})/${attack},0,1),clip((${b1.toFixed(3)}-t)/${release},0,1))`;
  });
  let m = traps[0];
  for (let i = 1; i < traps.length; i++) m = `max(${m},${traps[i]})`;
  return `(1-(1-${lo.toFixed(4)})*${m})`;
}

export function buildMix(plan, gameDir, { masterGain = 0 } = {}) {
  const inputs = [];
  const chains = [];
  const labels = [];
  const dur = plan.duration;
  const add = (spec) => { inputs.push(...spec); return inputs.filter((x) => x === '-i').length - 1; };
  const voiceInfo = [];
  // stemmen
  (plan.voices || []).forEach((v, i) => {
    const file = path.join(gameDir, v.src);
    if (!fs.existsSync(file)) throw new Error(`stemopname ontbreekt: ${v.src}`);
    const m = measure(file);
    const target = v.target ?? -17;
    const g = (target - (m.lufs ?? target)) + num(v.gain);
    voiceInfo.push({ at: v.at, dur: m.dur ?? 3, src: v.src, lufs: m.lufs, gain: +g.toFixed(1) });
    const n = add(['-i', file]);
    chains.push(`[${n}:a]aformat=sample_rates=${SR}:channel_layouts=stereo,volume=${g.toFixed(2)}dB,adelay=${Math.round(v.at * 1000)}:all=1,apad=whole_dur=${dur}[v${i}]`);
    labels.push(`[v${i}]`);
  });
  const duck = duckExpr(voiceInfo.filter((v, i) => (plan.voices[i].duck ?? true)), plan.duck || {});
  // muziek
  (plan.music || []).forEach((m, i) => {
    const file = path.join(ROOT, 'game', 'audio', 'gmusic', m.file);
    if (!fs.existsSync(file)) throw new Error(`muziek ontbreekt: ${m.file}`);
    const n = add(['-i', file]);
    const d = m.dur ?? dur - (m.at || 0);
    const fi = m.fadeIn ?? 0.05, fo = m.fadeOut ?? 2.5;
    const f = [`atrim=start=${m.from}:duration=${d}`, 'asetpts=PTS-STARTPTS', `aformat=sample_rates=${SR}:channel_layouts=stereo`, `volume=${num(m.gain, -3)}dB`,
      `afade=t=in:st=0:d=${fi}:curve=qsin`, `afade=t=out:st=${Math.max(0, d - fo).toFixed(3)}:d=${fo}:curve=qsin`];
    // ducking alleen op de muziek (tijden zijn trailertijd; de muziek begint op m.at)
    if (m.duck !== false) f.push(`volume='${duck.replace(/\bt\b/g, `(t+${(m.at || 0).toFixed(3)})`)}':eval=frame`);
    if (m.lowpass) f.push(`lowpass=f=${m.lowpass}`);
    f.push(`adelay=${Math.round((m.at || 0) * 1000)}:all=1`, `apad=whole_dur=${dur}`);
    chains.push(`[${n}:a]${f.join(',')}[m${i}]`);
    labels.push(`[m${i}]`);
  });
  // effecten
  (plan.sfx || []).forEach((e, i) => {
    const s = sfxInput(e.kind, i);
    const n = add(['-f', 'lavfi', '-i', s.src]);
    const f = [s.fx, `aformat=sample_rates=${SR}:channel_layouts=stereo`, `volume=${num(e.gain, -6)}dB`];
    if (e.fadeOut) f.push(`afade=t=out:st=${Math.max(0, s.dur - e.fadeOut)}:d=${e.fadeOut}`);
    f.push(`adelay=${Math.round(e.at * 1000)}:all=1`, `apad=whole_dur=${dur}`);
    chains.push(`[${n}:a]${f.filter(Boolean).join(',')}[x${i}]`);
    labels.push(`[x${i}]`);
  });
  chains.push(`${labels.join('')}amix=inputs=${labels.length}:duration=longest:normalize=0:dropout_transition=0,volume=${masterGain}dB[mix]`);
  return { inputs, filter: chains.join(';'), voiceInfo };
}

export function renderMix(plan, outWav, { game = path.join(ROOT, 'game'), report = null } = {}) {
  const base = buildMix(plan, game);
  const tmp = outWav.replace(/\.wav$/, '.pre.wav');
  const ff = (extra, out) => run(ffmpegPath(), ['-hide_banner', '-loglevel', 'error', '-y', ...base.inputs, '-filter_complex', base.filter, '-map', '[mix]', '-t', plan.duration.toFixed(3), ...extra, '-ar', String(SR), '-c:a', 'pcm_f32le', out]);
  ff([], tmp);
  // ronde 1: meten (geïntegreerde luidheid en piek van de ruwe mix)
  const m = measure(tmp);
  const target = plan.targetLufs ?? -14;
  const tpMax = plan.truePeak ?? -1.2;
  let gain = target - m.lufs;
  // ronde 2: rechte versterking, dan de true peak begrenzen (limiter op 4x oversampling via aresample)
  const lim = Math.min(0.97, db(tpMax - 0.4));
  const norm = run(ffmpegPath(), ['-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-af', `volume=${gain.toFixed(3)}dB,aresample=${SR * 4},alimiter=limit=${lim.toFixed(3)}:attack=2:release=40:level=disabled,aresample=${SR}`, '-c:a', 'pcm_s24le', outWav]);
  fs.unlinkSync(tmp);
  const fin = measure(outWav);
  const out = { mixLufsBefore: m.lufs, gainApplied: +gain.toFixed(2), final: fin, voices: base.voiceInfo };
  if (report) fs.writeFileSync(report, JSON.stringify(out, null, 1));
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
  const planFile = args.find((a) => !a.startsWith('--'));
  if (!planFile || !opt('out')) { console.error('gebruik: mix.mjs <plan.json> --out=<mix.wav> [--game=<map>] [--report=<json>]'); process.exit(2); }
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  const r = renderMix(plan, path.resolve(opt('out')), { game: opt('game', path.join(ROOT, 'game')), report: opt('report', null) });
  console.log(JSON.stringify({ lufs: r.final.lufs, peak: r.final.peak, gain: r.gainApplied }));
}
