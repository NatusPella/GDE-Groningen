// Audiocontrole van een trailer: RMS per 100 ms, dalingen en sprongen in volume, stiltes, luidheid (EBU R128) en
// true peak, met een grafiek (PNG) en een JSON-rapport.
//   node scripts/trailer/check_audio.mjs <video of audio> [--out=<map>] [--allow=<json>] [--target=-14] [--tp=-1]
//
// Regels (opdracht van de eigenaar):
//   - geen daling van meer dan 6 dB ten opzichte van de omgeving (mediaan van 0,8 s ervoor en erna) zonder reden;
//   - geen sprong van meer dan 6 dB tussen twee opeenvolgende stukken van 100 ms zonder reden;
//   (beide op de vastgehouden omhullende: het hoogste van 3 stukken van 100 ms, zodat de gaten tussen de klappen
//   van muziek niet meetellen)
//   - geen stilte (onder -50 dBFS) langer dan 0,3 s buiten bedoelde pauzes;
//   - geïntegreerde luidheid -14 LUFS (±1), true peak ≤ -1 dBTP.
// Een "reden" staat in het allow-bestand: { "intended": [[van, tot, "omschrijving"], ...] } in seconden (de begin- en
// eindfade, een bewuste stilte vóór de titel, ...). Exit 0 als alles klopt, 1 anders.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ffmpegPath } from './lib/tools.mjs';
import { Canvas, text } from './lib/png.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
if (!file) { console.error('gebruik: check_audio.mjs <bestand> [--out=<map>] [--allow=<json>]'); process.exit(2); }
const out = path.resolve(opt('out', path.dirname(path.resolve(file))));
fs.mkdirSync(out, { recursive: true });
const base = path.basename(file).replace(/\.[^.]+$/, '');
const TARGET = Number(opt('target', -14));
const TP_MAX = Number(opt('tp', -1));
const allow = opt('allow', '') ? JSON.parse(fs.readFileSync(opt('allow', ''), 'utf8')) : { intended: [] };
const intended = (t0, t1 = t0) => (allow.intended || []).find(([a, b]) => t1 >= a - 0.15 && t0 <= b + 0.15);

const SR = 16000;
const dec = spawnSync(ffmpegPath(), ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
if (dec.status !== 0) { console.error(String(dec.stderr)); process.exit(2); }
const x = new Float32Array(dec.stdout.buffer, dec.stdout.byteOffset, Math.floor(dec.stdout.length / 4));
const dur = x.length / SR;

// RMS per 100 ms in dBFS
const W = SR / 10;
const n = Math.floor(x.length / W);
const db = new Float32Array(n);
for (let i = 0; i < n; i++) { let e = 0; for (let j = 0; j < W; j++) { const v = x[i * W + j]; e += v * v; } db[i] = 10 * Math.log10(e / W + 1e-12); }
// sample-piek op de oorspronkelijke samplefrequentie en kanalen (de mono-mix op 16 kHz hierboven kan zelf overschrijden)
const st = spawnSync(ffmpegPath(), ['-hide_banner', '-i', file, '-vn', '-af', 'astats=metadata=0:reset=0', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
const peaks = [...String(st.stderr).matchAll(/Peak level dB: (-?[\d.]+|-inf)/g)].map((m) => Number(m[1]));
const clip = peaks.length ? Math.max(...peaks) : null;

// Muziek heeft per 100 ms van nature gaten (tussen kick en snare): de bevindingen gaan over de vastgehouden
// omhullende (hoogste waarde van 3 opeenvolgende stukken, dus 300 ms), niet over elke losse klap.
const hold = new Float32Array(n);
for (let i = 0; i < n; i++) hold[i] = Math.max(db[Math.max(0, i - 1)], db[i], db[Math.min(n - 1, i + 1)]);
const median = (a) => { const s = [...a].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
const findings = { dips: [], jumps: [], silences: [] };
// dalingen: dit stuk van 100 ms is meer dan 6 dB stiller dan de mediaan van de omgeving
for (let i = 8; i < n - 8; i++) {
  const ctx = [...hold.slice(i - 8, i), ...hold.slice(i + 1, i + 9)];
  const m = median(ctx);
  if (m > -45 && hold[i] < m - 6) {
    const t = i / 10;
    const why = intended(t, t + 0.1);
    findings.dips.push({ t: +t.toFixed(1), db: +hold[i].toFixed(1), around: +m.toFixed(1), intended: why ? why[2] : null });
  }
}
// sprongen tussen twee opeenvolgende stukken
for (let i = 1; i < n; i++) {
  if (hold[i] > -50 && hold[i - 1] > -50 && Math.abs(hold[i] - hold[i - 1]) > 6) {
    const t = i / 10;
    const why = intended(t - 0.1, t + 0.1);
    findings.jumps.push({ t: +t.toFixed(1), from: +hold[i - 1].toFixed(1), to: +hold[i].toFixed(1), intended: why ? why[2] : null });
  }
}
// stiltes
for (let i = 0; i < n;) {
  if (db[i] < -50) {
    let j = i;
    while (j < n && db[j] < -50) j++;
    const len = (j - i) / 10;
    if (len > 0.3) { const why = intended(i / 10, j / 10); findings.silences.push({ from: +(i / 10).toFixed(1), to: +(j / 10).toFixed(1), len: +len.toFixed(1), intended: why ? why[2] : null }); }
    i = j;
  } else i++;
}

// luidheid en true peak via ffmpeg ebur128
const eb = spawnSync(ffmpegPath(), ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
const sum = eb.stderr.slice(eb.stderr.lastIndexOf('Summary:'));
const num = (re) => { const m = sum.match(re); return m ? Number(m[1]) : null; };
const loud = { lufs: num(/I:\s+(-?[\d.]+) LUFS/), lra: num(/LRA:\s+([\d.]+) LU/), truePeak: num(/Peak:\s+(-?[\d.]+) dBFS/) };

const bad = (arr) => arr.filter((f) => !f.intended);
const result = {
  file: path.resolve(file), duration: +dur.toFixed(2), loudness: loud, samplePeakDb: clip,
  rmsMean: +(10 * Math.log10(db.reduce((a, b) => a + 10 ** (b / 10), 0) / n)).toFixed(1),
  findings,
  verdict: {
    loudness: loud.lufs !== null && Math.abs(loud.lufs - TARGET) <= 1,
    truePeak: loud.truePeak !== null && loud.truePeak <= TP_MAX + 0.05,
    dips: bad(findings.dips).length === 0,
    jumps: bad(findings.jumps).length === 0,
    silences: bad(findings.silences).length === 0,
  },
};
result.pass = Object.values(result.verdict).every(Boolean);
fs.writeFileSync(path.join(out, `${base}_audio.json`), JSON.stringify(result, null, 1));

// grafiek: RMS per 100 ms, -60..0 dB, met de bevindingen
const GW = 1800, GH = 420, L = 56, R = 10, T = 14, B = 34;
const cv = new Canvas(GW, GH);
const px = (t) => L + (GW - L - R) * (t / dur);
const py = (d) => T + (GH - T - B) * (1 - (Math.max(-60, Math.min(0, d)) + 60) / 60);
for (let d = -60; d <= 0; d += 10) { cv.line(L, py(d), GW - R, py(d), [45, 56, 50]); text(cv, 4, py(d) - 3, d, [150, 165, 155]); }
const step = dur > 120 ? 10 : 5;
for (let t = 0; t <= dur; t += step) { cv.line(px(t), T, px(t), GH - B, [34, 44, 38]); text(cv, px(t) - 6, GH - B + 8, Math.round(t), [150, 165, 155]); }
for (const [a, b] of allow.intended || []) cv.rect(px(a), T, px(b), GH - B, [60, 90, 150], 0.18);
cv.line(L, py(TARGET), GW - R, py(TARGET), [90, 160, 110]);
for (let i = 1; i < n; i++) cv.line(px((i - 1) / 10), py(db[i - 1]), px(i / 10), py(db[i]), [60, 110, 80]);
for (let i = 1; i < n; i++) cv.line(px((i - 1) / 10), py(hold[i - 1]), px(i / 10), py(hold[i]), [110, 230, 150]);
for (const f of findings.dips) cv.rect(px(f.t) - 1, T, px(f.t) + 2, GH - B, f.intended ? [90, 130, 220] : [230, 70, 60], 0.55);
for (const f of findings.jumps) cv.rect(px(f.t) - 1, T, px(f.t) + 1, GH - B, f.intended ? [90, 130, 220] : [240, 170, 40], 0.55);
for (const f of findings.silences) cv.rect(px(f.from), T, px(f.to), GH - B, f.intended ? [90, 130, 220] : [230, 70, 60], 0.4);
cv.save(path.join(out, `${base}_audio.png`));

const lines = [
  `${path.basename(file)}: ${dur.toFixed(1)} s, ${loud.lufs} LUFS (doel ${TARGET}), LRA ${loud.lra}, true peak ${loud.truePeak} dBTP (max ${TP_MAX}), sample-piek ${clip} dBFS`,
  `dalingen >6 dB: ${bad(findings.dips).length} onverklaard van ${findings.dips.length}${bad(findings.dips).slice(0, 12).map((f) => `\n   ${f.t} s: ${f.db} dB tegen ${f.around}`).join('')}`,
  `sprongen >6 dB: ${bad(findings.jumps).length} onverklaard van ${findings.jumps.length}${bad(findings.jumps).slice(0, 12).map((f) => `\n   ${f.t} s: ${f.from} -> ${f.to} dB`).join('')}`,
  `stiltes >0,3 s: ${bad(findings.silences).length} onverklaard van ${findings.silences.length}${bad(findings.silences).slice(0, 12).map((f) => `\n   ${f.from}-${f.to} s`).join('')}`,
  `UITSLAG: ${result.pass ? 'GOED' : 'NIET GOED'} ${JSON.stringify(result.verdict)}`,
];
console.log(lines.join('\n'));
process.exit(result.pass ? 0 : 1);
