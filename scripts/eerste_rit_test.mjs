// De eerste rit (23-11, akte 1 op eindniveau): van de flat in Paddepoel naar Berend bij het Martinikerkhof praten Tammo en Tessa
// onderweg. Het script heeft pas na M04 een autogesprek; de verhaalloze praat over plekken, wijken en het weer (banterlines.js) staat
// weer in de pool van banter.js. Deze test houdt dat zo: de wijken en plekken langs de route hebben een wisseling die kan spelen
// (geen poort op een oude H-code) en die is opgenomen, en banter.js neemt ze op in de pool.
//   node scripts/eerste_rit_test.mjs
import fs from 'node:fs';
import { BANTER } from '../game/js/banterlines.js';

let bad = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };
const manifest = JSON.parse(fs.readFileSync(new URL('../game/audio/voicelines/banter/manifest.json', import.meta.url), 'utf8'));
const WIE = { T: 'Tammo', A: 'Anita' };
const opgenomen = (ex) => ex.lines.every((l) => manifest[`${WIE[l[0]]}|${l[1]}`]);
const kanSpelen = (ex) => ![].concat(ex.needs || []).some((id) => /^H\d+$/.test(id)); // een poort op een oude H-code gaat nooit open

const bron = fs.readFileSync(new URL('../game/js/banter.js', import.meta.url), 'utf8');
ok(/export const PLEK_PRAAT = BANTER\.filter\(\(ex\) => \/\^\(place\|wijk\|situation\):\/\.test\(ex\.trigger\)\)/.test(bron), 'banter.js neemt plek-, wijk- en situatiepraat uit banterlines.js');
ok(/indexPool\(\[\.\.\.banterExchanges\(\), \.\.\.PLEK_PRAAT\]\)/.test(bron), 'de pool is het script plus de plekpraat');

// de route van de eerste rit: Paddepoel, via Selwerd of de Professorenbuurt en de Noorderplantsoenbuurt de binnenstad in, langs d'Olle Grieze
const ROUTE = ['wijk:Paddepoel', 'wijk:Selwerd', 'wijk:Noorderplantsoenbuurt', 'wijk:Binnenstad', 'place:Martinitoren'];
for (const trig of ROUTE) {
  const ex = BANTER.filter((e) => e.trigger === trig && kanSpelen(e));
  ok(ex.length >= 1, `${trig}: er is praat die kan spelen`);
  ok(ex.some(opgenomen), `${trig}: en die is opgenomen`);
}
const plek = BANTER.filter((e) => /^(place|wijk|situation):/.test(e.trigger));
const regels = plek.flatMap((e) => e.lines);
const metStem = regels.filter((l) => manifest[`${WIE[l[0]]}|${l[1]}`]).length;
ok(metStem / regels.length >= 0.95, 'de plekpraat is (bijna) helemaal opgenomen', `${metStem}/${regels.length}`);
ok(plek.every((e) => e.lines.every((l) => !/\bde Grunn\b/i.test(l[1]))), 'nooit "de Grunn"');

console.log(bad ? `eerste_rit_test: ${bad} van ${n} fout` : `eerste_rit_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
