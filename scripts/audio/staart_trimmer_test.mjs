// Pure test van het ruis-einde-patroon en de staarttrimmer (scripts/audio/staart_trimmer.mjs, ruisachtig_scan.mjs eindBurst).
//   node scripts/audio/staart_trimmer_test.mjs
import { trimRuisEinde, trimPopBegin, trimClip, FADE_S } from './staart_trimmer.mjs';
import { popBegin } from './pop_begin.mjs';
import { eindBurst } from './ruisachtig_scan.mjs';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };
const SR = 24000;
let seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };

// stem: toon met een omhullende; stilte: -70 dB ruis; burst: harde ruis (-10 dB); daarna digitale stilte
function maak({ stem = 0.6, stilte = 0.3, burst = 0.2, sis = 0, nul = 0.05 }) {
  const parts = [];
  const t = (s, f) => { for (let i = 0; i < Math.round(s * SR); i++) parts.push(f(i)); };
  t(stem, (i) => 0.15 * Math.sin(i * 0.07) * Math.sin(i * 0.011) + 0.05 * Math.sin(i * 0.19));
  if (sis) t(sis, () => 0.1 * rnd());               // een sis aan het eind van een woord: geen stilte ervoor
  t(stilte, () => 0.0003 * rnd());
  t(burst, () => 0.3 * rnd());
  t(nul, () => 0);
  return Float32Array.from(parts);
}

// 1. het bekende patroon wordt gevonden
const slecht = maak({});
const e = eindBurst(slecht, SR);
ok(e.burst && e.ms >= 150 && e.ms <= 260 && e.piekDb > -15 && e.vanafS > 0.8 && e.vanafS < 1.0, 'burst na bijna-stilte gevonden', JSON.stringify(e));
// 2. een schone clip en een sis aan het eind (geen stilte ervoor) zijn geen ruis-einde
ok(!eindBurst(maak({ burst: 0, stilte: 0.01 }), SR).burst, 'schone clip: geen burst');
ok(!eindBurst(maak({ burst: 0.2, stilte: 0.0, sis: 0.2 }), SR).burst, 'sis zonder stilte ervoor: geen burst');
ok(!eindBurst(maak({ burst: 0.02 }), SR).burst, 'een tik van 20 ms is geen ruis-einde');
// 3. de trimmer knipt de burst weg, houdt de stem en maakt een fade
const r = trimRuisEinde(slecht, SR);
ok(r.geknipt > 0.2 * SR && r.samples.length < slecht.length, 'getrimd', String(r.geknipt));
ok(!eindBurst(r.samples, SR).burst, 'na het trimmen geen ruis-einde meer');
const stemEind = Math.round(0.6 * SR);
ok(r.samples.length >= stemEind, 'de stem blijft heel', String(r.samples.length));
let piekStaart = 0; for (let i = Math.max(0, r.samples.length - Math.round(0.005 * SR)); i < r.samples.length; i++) piekStaart = Math.max(piekStaart, Math.abs(r.samples[i]));
ok(piekStaart < 0.02 && FADE_S > 0, 'het einde loopt uit naar nul (fade)', String(piekStaart));
// 4. een schone clip blijft onaangeroerd (zelfde buffer)
const schoon = maak({ burst: 0, stilte: 0.01 });
ok(trimRuisEinde(schoon, SR).samples === schoon && trimRuisEinde(schoon, SR).geknipt === 0, 'schone clip ongewijzigd');
// 5. ook bij een andere samplefrequentie
const lo = Float32Array.from(slecht.filter((_, i) => i % 2 === 0));
ok(eindBurst(lo, SR / 2).burst, 'werkt bij een andere samplefrequentie');

// 6. pop-begin: digitale stilte, een klik van 5 ms op 40 ms (-6 dB), dan zachte stem
{
  const x = new Float32Array(SR);
  for (let i = Math.round(0.04 * SR); i < Math.round(0.045 * SR); i++) x[i] = 0.5 * Math.sin(i * 1.3);
  for (let i = Math.round(0.1 * SR); i < SR; i++) x[i] = 0.01 * Math.sin(i * 0.07);
  ok(popBegin(x, SR).pop, 'pop-begin gevonden', JSON.stringify(popBegin(x, SR)));
  const t = trimPopBegin(x, SR);
  ok(!popBegin(t.samples, SR).pop && Math.abs(t.samples[Math.round(0.042 * SR)]) === 0, 'de klik is weg');
  ok(t.samples[Math.round(0.5 * SR)] === x[Math.round(0.5 * SR)], 'de stem erna blijft ongemoeid');
  // een gewone luide inzet is geen pop
  const y = new Float32Array(SR);
  for (let i = Math.round(0.04 * SR); i < SR; i++) y[i] = 0.3 * Math.sin(i * 0.07);
  ok(!popBegin(y, SR).pop, 'een gewone luide inzet is geen pop');
  const z = new Float32Array(SR);   // een zachte inzet
  for (let i = Math.round(0.04 * SR); i < SR; i++) z[i] = 0.02 * Math.sin(i * 0.07) * Math.min(1, (i - 0.04 * SR) / (0.05 * SR));
  ok(!popBegin(z, SR).pop, 'een zachte inzet is geen pop');
  const c = trimClip(Float32Array.from([...x.subarray(0, Math.round(0.6 * SR)), ...new Float32Array(Math.round(0.3 * SR)).map(() => 0.0003 * rnd()), ...new Float32Array(Math.round(0.2 * SR)).map(() => 0.3 * rnd()), ...new Float32Array(1200)]), SR);
  ok(c.popWeg && c.ruisEindeWeg, 'trimClip herkent en verwijdert beide', JSON.stringify([c.popWeg, c.ruisEindeWeg]));
}

console.log(`staart_trimmer_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
