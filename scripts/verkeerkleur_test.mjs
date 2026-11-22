// Kleurvariatie van het verkeer (trafficfleet.js): een wijkpalet is geen grijze rij. Gemeten op de paletten zelf en op een steekproef met een vast zaad.
//   node scripts/verkeerkleur_test.mjs
import { TRAFFIC_PROFILES, carModel } from '../game/js/trafficfleet.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };
const hsl = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
};
const familie = (hex) => { const { h, s } = hsl(hex); if (s < 0.2) return 'grijs'; return h < 20 || h >= 340 ? 'rood' : h < 70 ? 'geel-bruin' : h < 170 ? 'groen' : h < 260 ? 'blauw' : 'paars'; };
const sets = new Map();
for (const [naam, p] of Object.entries(TRAFFIC_PROFILES)) sets.set(p.colors, (sets.get(p.colors) || []).concat(naam));
for (const [colors, namen] of sets) {
  const wie = namen.join('/');
  ok(colors.every((c) => /^#[0-9a-f]{6}$/i.test(c)), `${wie}: geldige kleuren`);
  const uniek = new Set(colors.map((c) => c.toLowerCase()));
  const standaard = namen.includes('standaard');   // het deftige palet (chic) en de bedrijfsbusjes (industrie) zijn bewust klein
  ok(uniek.size >= (standaard ? 9 : 5), `${wie}: genoeg verschillende kleuren`, uniek.size);
  const fam = new Set(colors.map(familie));
  ok(fam.size >= (standaard ? 3 : 2), `${wie}: meerdere kleurfamilies`, [...fam].join());
}
// het standaardpalet (ook gebruikt door bakfiets en centrum): grijs blijft de helft of meer, maar een derde of meer is kleur, met een echt blauw, rood en groen
const P = TRAFFIC_PROFILES.standaard.colors;
ok(TRAFFIC_PROFILES.bakfiets.colors === P && TRAFFIC_PROFILES.centrum.colors === P, 'standaard, bakfiets en centrum delen een palet');
const kleur = P.filter((c) => familie(c) !== 'grijs').length / P.length;
ok(kleur >= 0.33 && kleur <= 0.5, 'standaardpalet: een derde tot de helft kleur, de rest grijs, zwart en wit', kleur.toFixed(2));
for (const f of ['blauw', 'rood', 'groen']) ok(P.some((c) => familie(c) === f && hsl(c).s >= 0.3), `standaardpalet: een duidelijk ${f}`);
// steekproef: 4000 auto's met een vast zaad geven alle families en alle kleuren van het palet
let z = 12345; const rng = () => { z = (z * 1664525 + 1013904223) >>> 0; return z / 4294967296; };
const tel = new Map();
for (let i = 0; i < 4000; i++) { const c = carModel('sedan', rng, P).color; tel.set(c, (tel.get(c) || 0) + 1); }
ok([...tel.keys()].length >= new Set(P).size - 1, 'de steekproef gebruikt (bijna) elke kleur', tel.size);
const grijsShare = [...tel].filter(([c]) => familie(c) === 'grijs').reduce((a, [, k]) => a + k, 0) / 4000;
ok(grijsShare > 0.5 && grijsShare < 0.8, 'grijs, zwart en wit blijven de meerderheid in beeld', grijsShare.toFixed(2));
console.log(`${n - fails}/${n} verkeerkleur`);
process.exit(fails ? 1 : 0);
