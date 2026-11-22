// De mutantenlijst van scripts/mutatie_check.mjs blijft bruikbaar:  node scripts/mutatie_lijst_test.mjs
// Elk "van" komt precies een keer voor in zijn bestand (anders slaat de mutatiecontrole die regel over als
// ongeldig), is echt anders dan "naar", en elk bestand heeft minstens een test die het importeert.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MUTANTEN } from './mutatie_lijst.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };
const tests = fs.readdirSync(path.join(ROOT, 'scripts')).filter((f) => /_test\.mjs$/.test(f));
ok(MUTANTEN.length >= 30, 'minstens 30 mutanten (' + MUTANTEN.length + ')');
const wat = new Set();
for (const [f, van, naar, uitleg] of MUTANTEN) {
  const src = fs.readFileSync(path.join(ROOT, 'game', 'js', f), 'utf8');
  ok(src.split(van).length - 1 === 1, f + ': patroon komt precies een keer voor: ' + uitleg);
  ok(van !== naar, f + ': mutant verschilt van het origineel: ' + uitleg);
  ok(!wat.has(f + uitleg), f + ': uitleg is uniek: ' + uitleg); wat.add(f + uitleg);
  const needle = 'game/js/' + f;
  ok(tests.some((t) => t !== 'mutatie_lijst_test.mjs' && fs.readFileSync(path.join(ROOT, 'scripts', t), 'utf8').includes(needle)), f + ': heeft een test die hem importeert');
}
console.log('mutatie_lijst_test: ' + n + ' controles, ' + fails + ' mislukt');
process.exit(fails ? 1 : 0);
