// Ruggengraat (#1123): elk deel heeft een kort "waar het om draait" (WHY), elke stap een lead die het doel noemt, het
// ruggengraatdoc heeft een blad per akte, en de frietwagen is in de eerste en de laatste akte te vinden.
// node scripts/story_spine_test.mjs
import fs from 'node:fs';
import { STEPS, PARTS, WHY } from '../game/js/storyarc.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const doc = fs.readFileSync(new URL('../docs/verhaal/RUGGENGRAAT.md', import.meta.url), 'utf8');

for (const p of Object.keys(PARTS)) {
  ok(typeof WHY[p] === 'string' && words(WHY[p]) >= 8 && words(WHY[p]) <= 30, `${p}: waar het om draait is 8 tot 30 woorden`, words(WHY[p]));
}
ok(/Tammo/.test(WHY.kop) && /Tessa/.test(WHY.kop) && /elkaar/.test(WHY.kop) && !/wagen/i.test(WHY.kop), 'akte 1 draait om Tammo en Tessa die elkaar niet willen kwijtraken; de snackwagen is nog geen doel (kern 21-11)');
// de eerste akte (H1 tot en met H3) noemt hem niet: de speler leert zijn naam pas op de brief van H2 (bijbel 01 3.1 A4)
ok(!/Jelle/.test(WHY.kop) && /Jelle/.test(WHY.romp) && /Jelle/.test(WHY.staart) && /Jelle/.test(WHY.zuid) && /Jelle/.test(WHY.ontzet), 'Jelle staat in elke akte na de eerste als tegenstander; de eerste noemt hem niet voor zijn brief');
ok(/wagen/.test(WHY.ontzet) && /wagen/.test(WHY.nazomer) && !/wagen/i.test(WHY.romp + WHY.staart + WHY.zuid), 'de wagen duikt pas in akte 5 op (verhaaltwist), niet in akte 1 tot en met 4');

for (const s of STEPS) {
  if (s.id === 'M00' || s.id === 'E') continue;
  ok(Array.isArray(s.lead) && s.lead.length === 2 && words(s.lead[1]) >= 5, `${s.id}: lead met een afzender en een doel`);
  if (s.lead) ok(words(s.lead[1]) <= 45, `${s.id}: lead niet langer dan 45 woorden`, words(s.lead[1]));
}
const heads = { kop: 'Akte 1', romp: 'Akte 2', staart: 'Akte 3', zuid: 'Akte 4', ontzet: 'Akte 5', nazomer: 'Deel 4' };
for (const [p, h] of Object.entries(heads)) ok(new RegExp(`^## ${h}`, 'm').test(doc), `RUGGENGRAAT.md heeft een blad voor ${p}`);
ok(/## De kern/.test(doc) && /plekje in de wereld/.test(doc), 'RUGGENGRAAT.md heeft de kern (een plek in de wereld)');

console.log(`story_spine_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
