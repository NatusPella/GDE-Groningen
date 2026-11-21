// Pure test van het ruis-einde-patroon en de staarttrimmer (scripts/audio/staart_trimmer.mjs, ruisachtig_scan.mjs eindBurst).
//   node scripts/audio/staart_trimmer_test.mjs
import { trimRuisEinde, FADE_S } from './staart_trimmer.mjs';
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

console.log(`staart_trimmer_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
