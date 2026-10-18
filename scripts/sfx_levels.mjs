// Levels of every synthesized sample (#173): peak, RMS over the audible part,
// and the level it gets in the mix (RMS x effect gain x category level).
// Flags the silent, the clipping and the ones far from the median.
//   node scripts/sfx_levels.mjs [--json]
import { renderData, bufferNames } from '../game/js/sfx/dsp.js';
import { FX_INFO } from '../game/js/sfx/fxbank.js';
import { categoryLevel } from '../game/js/sfx/mixplan.js';

const db = (x) => 20 * Math.log10(Math.max(1e-6, x));
const rows = [];
for (const name of bufferNames()) {
  const r = renderData(name, 44100);
  if (!r) { rows.push({ name, err: 'render' }); continue; }
  const d = r.chs[0];
  let peak = 0, sum = 0, act = 0;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (a > 0.01) { sum += d[i] * d[i]; act++; } }
  const rms = act ? Math.sqrt(sum / act) : 0;
  const info = FX_INFO[name] || FX_INFO[name.replace(/_\d+$/, '_0')];
  const mix = rms * (info ? info.gain * categoryLevel(info.cat) : 1);
  rows.push({ name, peak, rms, secs: d.length / 44100, active: act / 44100, mixDb: db(mix), peakDb: db(peak), nan: d.some((x) => !Number.isFinite(x)), hasInfo: !!info });
}
const good = rows.filter((r) => !r.err && r.rms > 0);
const med = good.map((r) => r.mixDb).sort((a, b) => a - b)[Math.floor(good.length / 2)];
const flags = [];
for (const r of rows) {
  if (r.err) flags.push([r.name, 'rendert niet']);
  else if (r.nan) flags.push([r.name, 'NaN']);
  else if (r.rms === 0 || r.active < 0.03) flags.push([r.name, 'stil (bijna geen hoorbaar deel)']);
  else if (r.peak >= 0.99) flags.push([r.name, `clipt (piek ${r.peak.toFixed(2)})`]);
  else if (r.mixDb - med > 9) flags.push([r.name, `te hard: ${r.mixDb.toFixed(1)} dB, mediaan ${med.toFixed(1)} dB`]);
  else if (r.mixDb - med < -14) flags.push([r.name, `te zacht: ${r.mixDb.toFixed(1)} dB, mediaan ${med.toFixed(1)} dB`]);
}
if (process.argv.includes('--json')) console.log(JSON.stringify({ median: med, rows, flags }, null, 1));
else {
  console.log(`${rows.length} samples, mediaan mixniveau ${med.toFixed(1)} dBFS (RMS x gain x categorie)`);
  for (const r of rows.filter((x) => !x.err).sort((a, b) => a.mixDb - b.mixDb)) console.log(r.name.padEnd(22), 'mix', r.mixDb.toFixed(1).padStart(6), 'piek', r.peakDb.toFixed(1).padStart(6), 'actief', r.active.toFixed(2) + 's');
  console.log('\nGEMARKEERD:'); for (const [n, w] of flags) console.log(' ', n, '-', w);
}
