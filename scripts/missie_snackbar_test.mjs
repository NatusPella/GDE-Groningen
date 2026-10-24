// Overlast bij de snackbar (#400): de regels (missie_snackbar.js) en het sidejob-contract (sidejob_snackbar.js).
//   node scripts/missie_snackbar_test.mjs
import fs from 'node:fs';
import { ACTIES, DOEL_PUNTEN, MAX_POGINGEN, BASIS, kiesActies, maakRonde, kies, rondeResultaat, voortgang, SNACKBAR } from '../game/js/missie_snackbar.js';
const read = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');

let n = 0, bad = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

check('negen acties, uniek, vier soorten', new Set(ACTIES.map((a) => a.id)).size === ACTIES.length && new Set(ACTIES.map((a) => a.soort)).size === 4);
const tekst = ACTIES.flatMap((a) => [a.label, a.note, a.reactie, a.slot]).join(' ') + Object.values(SNACKBAR).join(' ');
check('geen echte merken of personen in de tekst', !/mcdonald|burger king|febo|kfc|subway|domino/i.test(tekst));
check('de klassieke muziek is alleen tekst', ACTIES.some((a) => a.id === 'klassiek' && /geen opname/.test(a.note)));
for (let s = 1; s <= 60; s++) {
  const a = kiesActies([], seeded(s));
  check(`seed ${s}: drie verschillende acties met een sterke en een zwakke`, a.length === 3 && new Set(a.map((x) => x.id)).size === 3 && a.some((x) => x.kracht >= 2) && a.some((x) => x.kracht <= 1));
}
// de beste route: sterk, ander soort sterk: weg in twee pogingen
{
  const r = maakRonde(seeded(3));
  const i = r.acties.findIndex((a) => a.id === 'klassiek' || a.kracht === 3);
  const kiesBeste = () => r.acties.reduce((b, a, j) => (a.kracht > r.acties[b].kracht ? j : b), 0);
  let uit = kies(r, kiesBeste());
  while (!uit.klaar) uit = kies(r, kiesBeste());
  check('de sterkste keuzes sturen de groep weg', uit.uitkomst === 'weg' && r.poging <= MAX_POGINGEN && r.score >= DOEL_PUNTEN, JSON.stringify([uit.uitkomst, r.poging, r.score, i]));
  const res = rondeResultaat(r);
  check('snel weg betaalt het meest', r.poging > 2 || res.base === BASIS.snel);
}
// altijd de zwakste: na drie pogingen vertrekken ze vanzelf, en het betaalt nog steeds
{
  const r = maakRonde(seeded(5));
  const zwakste = () => r.acties.reduce((b, a, j) => (a.kracht < r.acties[b].kracht ? j : b), 0);
  let uit = kies(r, zwakste());
  while (!uit.klaar) uit = kies(r, zwakste());
  check('na drie pogingen is de ronde klaar', r.poging === MAX_POGINGEN && r.klaar);
  const res = rondeResultaat(r);
  check('geld blokkeert nooit', res.base > 0 && /dankt/.test(res.text) || r.uitkomst === 'weg');
  check('voortgang blijft tussen 0 en 1', voortgang(r) >= 0 && voortgang(r) <= 1);
}
// wisselen van soort geeft een bonus, hetzelfde soort niet; een actie kan niet dubbel
{
  const r = maakRonde(seeded(9));
  r.acties = [ACTIES.find((a) => a.id === 'bord'), ACTIES.find((a) => a.id === 'quiz'), ACTIES.find((a) => a.id === 'klassiek')];
  const een = kies(r, 0);
  check('de eerste actie heeft geen bonus', een.bonus === 0 && een.punten === 2);
  r.acties = [ACTIES.find((a) => a.id === 'quiz'), ACTIES.find((a) => a.id === 'klassiek'), ACTIES.find((a) => a.id === 'toeter')];
  const twee = kies(r, 0);
  check('dezelfde soort geeft geen bonus', twee.bonus === 0);
  check('na een keuze komen er nieuwe acties zonder de gebruikte', r.klaar || r.acties.every((a) => !r.gebruikt.includes(a.id)));
  check('kracht 0 telt niets, ook niet met een bonus', (() => { const q = maakRonde(seeded(1)); q.laatste = 'bord'; q.acties = [ACTIES.find((a) => a.id === 'toeter')]; return kies(q, 0).punten === 0; })());
}
// het contract van sidejobs.js (bronnen lezen: sidejobs.js haalt THREE van een URL die Node niet laadt)
const jobs = read('sidejobs.js'), adapter = read('sidejob_snackbar.js');
check('de bijbaan staat in SIDE_JOBS', /from '\.\/sidejob_snackbar\.js'/.test(jobs) && /boerderij, snackoverlast\]/.test(jobs));
check('de bijbaan heeft het contract', /id: 'snackoverlast'/.test(adapter) && ['anchor(map)', 'start(c)', 'round(c)', 'update(dt, c)', 'view(c)', 'stop(c)'].every((k) => adapter.includes(k)) && /intro: \[/.test(adapter));
check('eigen kaarticoon, getekend in sidejobs.js', /glyph: 'snackbar'/.test(adapter) && /case 'snackbar':/.test(jobs));
check('uitbetaling en vak staan erbij', /snackoverlast: \[44, 78\]/.test(jobs) && /snackoverlast: 'horeca'/.test(read('loopbaan.js')));
console.log(`missie_snackbar_test: ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
