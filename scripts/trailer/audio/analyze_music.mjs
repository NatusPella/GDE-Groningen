// Analyseert de Gemini-nummers in game/audio/gmusic: tempo (BPM), eerste tel, luidheid per stuk en een
// energieverloop per 2 s, zodat de montage op de maat en op de opbouw van een nummer kan knippen.
//   node scripts/trailer/audio/analyze_music.mjs [--out=<json>] [--only=<deel van bestandsnaam>]
// Alleen ffmpeg (decoderen naar 22,05 kHz mono f32) en wat rekenwerk in node; geen extra pakketten.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ffmpegPath } from '../lib/tools.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const DIR = path.join(ROOT, 'game', 'audio', 'gmusic');
const SR = 22050;

function decode(file) {
  const r = spawnSync(ffmpegPath(), ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(String(r.stderr));
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4));
}

// onset-sterkte per hop (spectrale flux op een simpele band-energie)
function onsetEnvelope(x, hop = 512, win = 1024) {
  const n = Math.floor((x.length - win) / hop);
  const env = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    let e = 0;
    for (let j = 0; j < win; j++) { const v = x[i * hop + j]; e += v * v; }
    e = Math.sqrt(e / win);
    env[i] = Math.max(0, e - prev);
    prev = e * 0.6 + prev * 0.4;
  }
  return { env, hopS: hop / SR };
}

function tempo(env, hopS) {
  // autocorrelatie van de onset-envelop over BPM 70..180, met een lichte voorkeur voor 90..150
  let best = { bpm: 0, score: -1 };
  const mean = env.reduce((a, b) => a + b, 0) / env.length;
  const e = env.map((v) => v - mean);
  for (let bpm = 70; bpm <= 180; bpm += 0.5) {
    const lag = 60 / bpm / hopS;
    let s = 0, cnt = 0;
    for (let i = 0; i + Math.ceil(lag * 4) < e.length; i++) {
      const a = e[i];
      const b = e[Math.round(i + lag)];
      const c = e[Math.round(i + lag * 2)];
      const d = e[Math.round(i + lag * 4)];
      s += a * (b + 0.7 * c + 0.5 * d); cnt++;
    }
    s /= cnt;
    const prior = bpm >= 90 && bpm <= 150 ? 1 : 0.85;
    if (s * prior > best.score) best = { bpm, score: s * prior };
  }
  return best.bpm;
}

function firstBeat(env, hopS, bpm) {
  const period = 60 / bpm / hopS;
  let best = { off: 0, score: -1 };
  for (let off = 0; off < period; off += 0.5) {
    let s = 0;
    for (let t = off; t < env.length - 1; t += period) s += env[Math.round(t)];
    if (s > best.score) best = { off, score: s };
  }
  return best.off * hopS;
}

// "schone" stukken: aaneengesloten delen waarin de vastgehouden omhullende (300 ms) nergens meer dan 6 dB onder de
// omgeving zakt of springt; alleen daar mag de montage een nummer onder beeld leggen (check_audio.mjs gebruikt dezelfde regel)
function cleanSegments(x, minLen = 8) {
  const W = SR / 10;
  const n = Math.floor(x.length / W);
  const db = new Float32Array(n);
  for (let i = 0; i < n; i++) { let e = 0; for (let j = 0; j < W; j++) { const v = x[i * W + j]; e += v * v; } db[i] = 10 * Math.log10(e / W + 1e-12); }
  const hold = new Float32Array(n);
  for (let i = 0; i < n; i++) hold[i] = Math.max(db[Math.max(0, i - 1)], db[i], db[Math.min(n - 1, i + 1)]);
  const med = (a) => { const t = [...a].sort((p, q) => p - q); return t[Math.floor(t.length / 2)]; };
  const bad = new Uint8Array(n);
  for (let i = 8; i < n - 8; i++) {
    const m = med([...hold.slice(i - 8, i), ...hold.slice(i + 1, i + 9)]);
    if (m > -45 && hold[i] < m - 6) bad[i] = 1;
    if (i > 0 && Math.abs(hold[i] - hold[i - 1]) > 6 && hold[i] > -50 && hold[i - 1] > -50) bad[i] = 1;
  }
  for (let i = 0; i < 8; i++) bad[i] = 1;
  for (let i = n - 8; i < n; i++) bad[i] = 1;
  const segs = [];
  for (let i = 0; i < n;) {
    if (bad[i]) { i++; continue; }
    let j = i;
    while (j < n && !bad[j]) j++;
    if ((j - i) / 10 >= minLen) {
      const mean = 10 * Math.log10(Array.from(db.slice(i, j)).reduce((a, b) => a + 10 ** (b / 10), 0) / (j - i));
      segs.push([+(i / 10).toFixed(1), +(j / 10).toFixed(1), +mean.toFixed(1)]);
    }
    i = j;
  }
  return segs;
}

function loudness(file) {
  const r = spawnSync(ffmpegPath(), ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const t = r.stderr;
  const num = (re) => { const m = [...t.matchAll(re)].pop(); return m ? Number(m[1]) : null; };
  return { lufs: num(/I:\s+(-?[\d.]+) LUFS/g), lra: num(/LRA:\s+(-?[\d.]+) LU/g), peak: num(/Peak:\s+(-?[\d.]+) dBFS/g) };
}

const only = arg('only', '');
const out = {};
for (const f of fs.readdirSync(DIR).filter((n) => n.endsWith('.mp3') && n.includes(only)).sort()) {
  const file = path.join(DIR, f);
  const x = decode(file);
  const { env, hopS } = onsetEnvelope(x);
  const bpm = tempo(env, hopS);
  const start = firstBeat(env, hopS, bpm);
  // energie per 2 s (rms in dB), voor de opbouw
  const seg = 2 * SR;
  const energy = [];
  for (let i = 0; i + seg <= x.length; i += seg) { let e = 0; for (let j = 0; j < seg; j++) e += x[i + j] * x[i + j]; energy.push(+(10 * Math.log10(e / seg + 1e-12)).toFixed(1)); }
  out[f] = { dur: +(x.length / SR).toFixed(1), bpm, firstBeat: +start.toFixed(2), ...loudness(file), clean: cleanSegments(x), energy2s: energy };
  console.log(`${f.padEnd(40)} ${out[f].dur.toString().padStart(6)} s  ${String(bpm).padStart(6)} bpm  eerste tel ${start.toFixed(2)}  ${out[f].lufs} LUFS  piek ${out[f].peak}  schoon: ${out[f].clean.map((c) => `${c[0]}-${c[1]}`).join(' ')}`);
}
if (arg('out', '')) fs.writeFileSync(arg('out', ''), JSON.stringify(out, null, 1));
