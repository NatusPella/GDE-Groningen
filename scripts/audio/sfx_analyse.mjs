// Meet een geluidsbestand per venster (ffmpeg naar mono 22,05 kHz): RMS in dB, piek en het aandeel energie onder 300 Hz en boven 2 kHz.
// Gebruik: node scripts/audio/sfx_analyse.mjs <bestand> [--w=1] [--van=0] [--duur=0]. Geen menselijk oor: het zegt waar het stil of vlak is.
import { execFileSync } from 'node:child_process';
const f = process.argv[2];
const arg = (n, d) => Number((process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || d);
const SR = 22050, W = arg('w', 1), van = arg('van', 0), duur = arg('duur', 0);
const a = ['-v', 'error', '-ss', String(van), ...(duur ? ['-t', String(duur)] : []), '-i', f, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'];
const buf = execFileSync('ffmpeg', a, { maxBuffer: 1 << 28 });
const x = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
const lp = (c) => { const k = Math.exp(-2 * Math.PI * c / SR); let y = 0; return (s) => (y = (1 - k) * s + k * y); };
const l1 = lp(300), l2 = lp(2000);
const n = Math.floor(SR * W);
const rows = [];
for (let i = 0; i + n <= x.length; i += n) {
  let e = 0, pk = 0, el = 0, eh = 0;
  for (let j = i; j < i + n; j++) { const s = x[j], lo = l1(s), mid = l2(s); e += s * s; pk = Math.max(pk, Math.abs(s)); el += lo * lo; eh += (s - mid) * (s - mid); }
  rows.push(`${(van + i / SR).toFixed(1).padStart(6)}s rms ${(10 * Math.log10(e / n + 1e-12)).toFixed(1).padStart(6)} dB  pk ${(20 * Math.log10(pk + 1e-9)).toFixed(1).padStart(6)}  <300Hz ${(100 * el / (e + 1e-12)).toFixed(0).padStart(3)}%  >2k ${(100 * eh / (e + 1e-12)).toFixed(0).padStart(3)}%`);
}
console.log(rows.join('\n'));
