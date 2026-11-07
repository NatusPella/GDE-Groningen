// #679: de vier attracties hebben een meetbaar doel en een teller in "Te doen"; het reuzenrad
// kondigt zijn avonduren aan. De tellers komen uit wat de speler al heeft (zijn keten, zijn
// profiel, zijn eigen evenementenlijst, zijn statistiek), dus per speler.
//   node scripts/attractiedoelen_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { standaardTodo } from '../game/js/activitytodo.js';

let n = 0, fails = 0;
const ok = (c, naam) => { n++; if (!c) { fails++; console.log('FAIL', naam); } };
const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

// De standaardregel van "Te doen" neemt het doel en de teller over.
const rij = standaardTodo({ id: 'x', label: 'Uitje', doel: () => ({ tekst: '2 van 5' }) }, { name: 'Ergens', x: 0, y: 0 });
ok(rij && rij.detail.rows.some(([k, v]) => k === 'Doel' && v === '2 van 5'), 'Te doen: doelregel met teller');
ok(rij && /2 van 5/.test(rij.meta), 'Te doen: teller staat ook in de regel');

// De vier attracties leveren een doel met een teller.
const snack = lees('snackketen.js');
ok(/doel: \(\) => \(\{ tekst: `\$\{outletCount\(chain\)\} van 5 vestigingen` \}\)/.test(snack), 'snackketen: teller van de vestigingen');
const veilig = lees('safehuizen.js');
ok(/doel: \(\) => \(\{ tekst: `\$\{huizen\.filter\(\(h\) => heeftHuisLive\(h\.id\)\)\.length\} van 3 veilige huizen` \}\)/.test(veilig), 'veilige huizen: teller uit het eigen profiel');
const even = lees('evenementenact.js');
ok(/3 evenementen bezocht/.test(even) && /loadSeen\(/.test(even), 'evenementen: teller uit de eigen gezien-lijst');
const rad = lees('reuzenrad.js');
ok(/getStat\('reuzenradRides'\)/.test(rad) && /\[.Doel., `\$\{ritten\} van 5 ritjes/.test(rad), 'reuzenrad: teller van de ritjes en een doel');

// Het reuzenrad kondigt de avonduren aan (Te doen en één melding).
ok(/vanavond 19:00-01:00/.test(rad), 'reuzenrad: avonduren in Te doen');
ok(/draait vanavond vanaf 19:00/.test(rad) && /announced/.test(rad), 'reuzenrad: één aankondiging als je overdag voor een dichte attractie staat');

// De tellers zijn per speler: geen wereldstand, maar de eigen keten, het eigen profiel, de eigen lijst en de eigen statistiek.
ok(/chain/.test(snack) && /heeftHuisLive/.test(veilig) && /localStorage/.test(even) && /getStat/.test(rad), 'de tellers komen uit per-speler bronnen');

console.log(fails ? `${fails} of ${n} attractiedoelen checks failed` : `attractiedoelen_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
