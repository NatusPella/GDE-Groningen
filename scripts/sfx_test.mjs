// Sound design (issue #173): the extra effects of sfx/fxbank.js render to
// something audible, never clip, vary per variant; the mixer plan is sane.
//   node scripts/sfx_test.mjs
import { renderData, bufferNames, variantsOf } from '../game/js/sfx/dsp.js';
import { FX_INFO } from '../game/js/sfx/fxbank.js';
import { describe } from './sfx_spectrum.mjs';
import { CATEGORIES, categoryLevel, speechDuckFactor, distanceGain, airLowpassHz, arrivalDelay, variation, plan } from '../game/js/sfx/mixplan.js';
import { FX_LIST } from '../game/js/sfx/sfxlist.js';

let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

const SR = 44100;
const stats = (d) => {
  let peak = 0, sum = 0;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; }
  return { peak, rms: Math.sqrt(sum / d.length), nan: d.some((x) => !Number.isFinite(x)) };
};
const rmsIn = (d, sr, t0, t1) => { let s = 0, c = 0; for (let i = Math.floor(t0 * sr); i < Math.min(d.length, Math.floor(t1 * sr)); i++) { s += d[i] * d[i]; c++; } return Math.sqrt(s / Math.max(1, c)); };
// energy share below 150 Hz via a one-pole low pass pair
const lowShare = (d, sr) => {
  let a = 0, b = 0, e = 0, t = 0;
  const k = 1 - Math.exp(-2 * Math.PI * 150 / sr);
  for (let i = 0; i < d.length; i++) { a += k * (d[i] - a); b += k * (a - b); e += b * b; t += d[i] * d[i]; }
  return e / (t + 1e-12);
};

// every registered effect: info, buffer, audible, not clipping, no NaN
for (const [name, info] of Object.entries(FX_INFO)) {
  ok(bufferNames().includes(name), `${name}: registered in the bank`);
  ok(typeof info.label === 'string' && info.label.length > 3, `${name}: label`);
  ok(info.cat in CATEGORIES, `${name}: known category ${info.cat}`);
  ok(info.gain > 0 && info.gain <= 1.5, `${name}: gain range`);
  ok(info.ref > 0 && info.range >= info.ref, `${name}: ref/range`);
  const r = renderData(name, SR);
  ok(!!r, `${name}: renders`);
  if (!r) continue;
  const s = stats(r.chs[0]);
  ok(!s.nan, `${name}: no NaN`);
  ok(s.rms > 0.01, `${name}: not silent`, s.rms.toFixed(4));
  ok(s.peak <= 0.99, `${name}: no clipping`, s.peak.toFixed(3));
  ok(s.peak >= 0.4, `${name}: has level`, s.peak.toFixed(3));
}

// variants of one effect differ from each other
for (const prefix of ['carbid_boom', 'explosion_boom']) {
  const names = variantsOf(prefix);
  ok(names.length >= 2, `${prefix}: has variants`);
  for (let i = 1; i < names.length; i++) {
    const a = renderData(names[0], SR).chs[0], b = renderData(names[i], SR).chs[0];
    let diff = 0;
    for (let k = 0; k < Math.min(a.length, b.length); k++) diff += Math.abs(a[k] - b[k]);
    ok(diff / a.length > 0.01, `${prefix}: ${names[i]} differs from ${names[0]}`, (diff / a.length).toFixed(4));
  }
}

// the carbid boom: sharp tik up front, heavy low end, a tail you can still hear
for (let v = 0; v < 3; v++) {
  const r = renderData(`carbid_boom_${v}`, SR), d = r.chs[0];
  ok(rmsIn(d, r.sr, 0, 0.03) > 0.15, `carbid_boom_${v}: loud attack`);
  ok(lowShare(d, r.sr) > 0.15, `carbid_boom_${v}: real low end`, lowShare(d, r.sr).toFixed(3));
  ok(rmsIn(d, r.sr, 0.4, 1.4) > 0.01, `carbid_boom_${v}: tail rings on`);
  ok(rmsIn(d, r.sr, 0, 0.03) > 2 * rmsIn(d, r.sr, 2.8, 3.6), `carbid_boom_${v}: tail dies away`);
}
// and louder than the old explosion would have been quiet: the carbid is the loudest of the game
ok(FX_INFO.carbid_boom_0.range >= FX_INFO.explosion_boom_0.range, 'carbid carries as far as an explosion');

// the bike bell (#129): two clean "ting" strikes ~0.17 s apart, bright, short; not a rattle of five hits
{
  const r = renderData('bikebell', SR), d = r.chs[0], sr = r.sr;
  const win = Math.floor(0.005 * sr), env = [];
  for (let i = 0; i + win < d.length; i += win) { let e = 0; for (let k = 0; k < win; k++) e += d[i + k] * d[i + k]; env.push(Math.sqrt(e / win)); }
  const top = Math.max(...env);
  const onsets = [];
  for (let i = 0; i < env.length; i++) if (env[i] > 0.4 * top && env[i] > 1.5 * (i ? env[i - 1] : 0) && (!onsets.length || (i - onsets[onsets.length - 1]) * 0.005 > 0.08)) onsets.push(i);
  ok(onsets.length === 2, 'bikebell: exactly two strikes', String(onsets.length));
  ok(onsets.length === 2 && Math.abs((onsets[1] - onsets[0]) * 0.005 - 0.17) < 0.03, 'bikebell: strikes about 0.17 s apart');
  ok(d.length / sr <= 1.0, 'bikebell: short (at most a second)');
  let zc = 0, i0 = Math.floor(0.002 * sr), i1 = Math.floor(0.12 * sr);
  for (let i = i0 + 1; i < i1; i++) if ((d[i] >= 0) !== (d[i - 1] >= 0)) zc++;
  const hz = zc / 2 / ((i1 - i0) / sr);
  ok(hz > 2000 && hz < 6500, 'bikebell: bright, a bell pitch and no thud', hz.toFixed(0));
  ok(rmsIn(d, sr, 0.7, 0.9) < 0.15 * rmsIn(d, sr, 0, 0.1), 'bikebell: the ring dies away');
}

// mixer plan
for (const [cat, c] of Object.entries(CATEGORIES)) {
  ok(c.level > 0 && c.level <= 1, `mix ${cat}: level`);
  ok(c.speech > 0 && c.speech <= 1, `mix ${cat}: speech keep`);
  ok(speechDuckFactor(cat, 0) === 1 && Math.abs(speechDuckFactor(cat, 1) - c.speech) < 1e-9, `mix ${cat}: ducking endpoints`);
}
ok(categoryLevel('onbekend') > 0, 'mix: unknown category has a level');
ok(speechDuckFactor('ui') === 1, 'mix: UI is never ducked by speech');
let prev = Infinity;
for (const d of [0, 5, 20, 80, 300, 1000]) { const g = distanceGain(d, 8, 0.8); ok(g <= prev && g > 0 && g <= 1, `distanceGain(${d}) monotonic`); prev = g; }
prev = Infinity;
for (const d of [0, 10, 50, 200, 800, 3000]) { const f = airLowpassHz(d); ok(f <= prev && f >= 900, `airLowpass(${d}) darkens`); prev = f; }
ok(arrivalDelay(0) === 0 && Math.abs(arrivalDelay(343) - 1) < 1e-9 && arrivalDelay(99999) <= 1.6, 'arrivalDelay: speed of sound, capped');
const v1 = variation(1), v2 = variation(2), v1b = variation(1);
ok(v1.rate === v1b.rate && v1.rate !== v2.rate, 'variation: deterministic per seed, differs between seeds');
for (let s = 0; s < 200; s++) { const v = variation(s); ok(v.rate > 0.9 && v.rate < 1.1 && v.gain > 0.9 && v.gain < 1.1, `variation(${s}) within spread`); }
const near = plan(FX_INFO.carbid_boom_0, 10, 3), far = plan(FX_INFO.carbid_boom_0, 600, 3);
ok(far.delay > near.delay && far.lp > 0 && far.lp < 3000 && near.lp === 0, 'plan: far = quieter, later, darker');

// the ?sfxtest list: every entry resolves to a bank buffer, ids are unique
const ids = new Set();
for (const e of FX_LIST) {
  ok(!ids.has(e.id), `sfxlist ${e.id}: unique`);
  ids.add(e.id);
  ok(typeof e.group === 'string' && typeof e.label === 'string', `sfxlist ${e.id}: group and label`);
  ok(e.buf ? bufferNames().includes(e.buf) : !!e.ev && typeof e.ev.kind === 'string', `sfxlist ${e.id}: buffer or event`);
}
for (const name of Object.keys(FX_INFO)) ok(FX_LIST.some((e) => e.buf === name), `sfxlist lists ${name}`);


// spectral identity (scripts/sfx_spectrum.mjs): what makes a bike bell, a firework and a crossing bell recognisable
{
  const bb = describe('bikebell');
  ok(bb.peaks[0] > 2500 && bb.peaks[0] < 3300, 'bikebell: strongest partial at a thumb-bell pitch', String(bb.peaks[0]));
  ok(bb.above1500 > 0.95, 'bikebell: all of the energy is high, nothing dull', bb.above1500.toFixed(2));
  ok(bb.peaks.filter((f) => f > 4000).length >= 2, 'bikebell: inharmonic metal overtones above 4 kHz');
  const cb = describe('crossing_bell');
  ok(cb.peaks[0] > 1300 && cb.peaks[0] < 1700 && cb.peaks.some((f) => f > 3500), 'crossing_bell: steel strike, fundamental plus bright overtone', cb.peaks.join());
  for (let v = 0; v < 3; v++) {
    const r = renderData(`firework_burst_${v}`, SR), d = r.chs[0], sr = r.sr;
    ok(rmsIn(d, sr, 0, 0.03) > 0.1, `firework_burst_${v}: hard crack up front`);
    ok(lowShare(d, sr) > 0.1, `firework_burst_${v}: thump you feel`, lowShare(d, sr).toFixed(3));
    // glitter: many separate pops after the bang, not one smooth tail
    const win = Math.floor(0.004 * sr); let pops = 0, prevHi = false;
    for (let i = Math.floor(0.4 * sr); i + win < Math.floor(2.4 * sr); i += win) {
      let e = 0; for (let k = 0; k < win; k++) e += d[i + k] * d[i + k];
      const hi = Math.sqrt(e / win) > 0.02; if (hi && !prevHi) pops++; prevHi = hi;
    }
    ok(pops >= 12, `firework_burst_${v}: glitter crackles on after the bang`, String(pops));
    ok(rmsIn(d, sr, 0, 0.05) > 3 * rmsIn(d, sr, 2.6, 2.8), `firework_burst_${v}: dies away`);
  }
  ok(FX_INFO.firework_burst_0.range >= 3000, 'firework carries as far as the Ontzet show');
}
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
