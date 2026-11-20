// Hulp voor het knippen van losse stappen uit langere opnames: gedeelde functies (decoderen, aanzet zoeken, knippen, niveau)
// voor scripts/audio/master_sfx_stappen.mjs. Alles hier is zuivere signaalbewerking op Float32Array (mono, 44,1 kHz).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const SR = 44100;

export function vindBron(inboxen, id) {
  for (const m of inboxen) {
    const dirs = [m, ...fs.readdirSync(m, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(m, d.name))];
    for (const d of dirs) for (const e of ['.ogg', '.mp3', '.wav', '.flac']) { const f = path.join(d, `${id}${e}`); if (fs.existsSync(f)) return { bestand: f, meta: path.join(d, `${id}.json`) }; }
  }
  throw new Error(`bron ${id} niet in de inbox`);
}

// decodeert naar mono f32 met een hoogdoorlaat (rommel onder hp weg) en optioneel een tijdvenster [van, tot] in s
export function decodeer(bestand, { hp = 70, van = 0, tot = 0 } = {}) {
  const f = [`highpass=f=${hp}`];
  const args = ['-v', 'error'];
  if (van) args.push('-ss', String(van));
  if (tot) args.push('-t', String(tot - van));
  args.push('-i', bestand, '-af', f.join(','), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-');
  const buf = execFileSync('ffmpeg', args, { maxBuffer: 1 << 28 });
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
}

// gladde omhullende (afgeronde gelijkgerichte waarde, venster in s)
export function omhullende(x, venster = 0.004) {
  const w = Math.max(1, Math.round(venster * SR)), e = new Float32Array(x.length);
  let acc = 0;
  for (let i = 0; i < x.length; i++) { acc += Math.abs(x[i]); if (i >= w) acc -= Math.abs(x[i - w]); e[i] = acc / w; }
  return e;
}

// aanzetten: pieken boven drempel (aandeel van de 95e percentiel), met een rusttijd; start = waar de omhullende onder 15% van de piek zakt
export function aanzetten(x, { drempel = 0.3, rust = 0.22 } = {}) {
  const e = omhullende(x);
  const s = Float32Array.from(e).sort();
  const p95 = s[Math.floor(s.length * 0.95)] || 1e-6;
  const thr = p95 * drempel;
  const out = [];
  let i = 0;
  const gap = Math.round(rust * SR);
  while (i < e.length) {
    if (e[i] > thr) {
      let j = i, pk = i;
      const eind = Math.min(e.length, i + Math.round(0.06 * SR));
      for (; j < eind; j++) if (e[j] > e[pk]) pk = j;
      let st = pk;
      const min = Math.max(0, pk - Math.round(0.04 * SR));
      while (st > min && e[st] > e[pk] * 0.15) st--;
      out.push({ start: st, piek: pk, hoogte: e[pk] });
      i = pk + gap;
    } else i++;
  }
  return out;
}

export function rms(x, a = 0, b = x.length) { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a) + 1e-20); }
export const db = (v) => 20 * Math.log10(v + 1e-12);

// knipt een stap: net voor de aanzet tot len s erna, korte fade-in, cosinus-fade-out; geeft ook een zuiverheidsscore terug
export function knipStap(x, ev, volgende, len, { fadeIn = 0.002, fadeUit = 0.05 } = {}) {
  const a = Math.max(0, ev.start - Math.round(0.004 * SR));
  const maxEind = volgende != null ? volgende.start - Math.round(0.01 * SR) : x.length;
  const b = Math.min(x.length, a + Math.round(len * SR), maxEind);
  if (b - a < Math.round(0.15 * SR)) return null;
  const y = Float32Array.from(x.subarray(a, b));
  const ni = Math.round(fadeIn * SR), nu = Math.min(y.length, Math.round(fadeUit * SR));
  for (let i = 0; i < ni && i < y.length; i++) y[i] *= i / ni;
  for (let i = 0; i < nu; i++) y[y.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / nu);
  return y;
}

// gelijk niveau: RMS over de eerste 150 ms op doel (dB), met piekgrens
export function niveauer(y, doelDb = -23, piekDb = -1.5) {
  const n = Math.min(y.length, Math.round(0.15 * SR));
  let g = Math.pow(10, (doelDb - db(rms(y, 0, n))) / 20);
  let pk = 0; for (const v of y) pk = Math.max(pk, Math.abs(v));
  g = Math.min(g, Math.pow(10, piekDb / 20) / (pk + 1e-12));
  for (let i = 0; i < y.length; i++) y[i] *= g;
  return { rmsDb: db(rms(y, 0, n)), piekDb: db(pk * g) };
}

// zuiverheid: hoe schoon sterft de stap uit na 0,5 len (lage staartruis ten opzichte van de piek is goed)
export function staartRatio(y) {
  const h = Math.floor(y.length * 0.6);
  return db(rms(y, 0, Math.min(y.length, Math.round(0.08 * SR)))) - db(rms(y, h, y.length));
}

export function schrijfOgg(y, dst, q = 3) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', '-', '-c:a', 'libvorbis', '-q:a', String(q), dst], { input: Buffer.from(y.buffer, y.byteOffset, y.byteLength) });
}
