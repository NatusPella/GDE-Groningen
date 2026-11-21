// De tussenstand van een minigame met meer deelnemers (#1000): wie wegvalt blijft staan met het woord "weg"; puur.
//   node scripts/standtabel_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { standTabel } from '../game/js/minigamekit.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const rd = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

const t = standTabel(['#', 'Speler', 'Ronde', 'Tijd'], [
  { naam: 'Tammo', eigen: true, cellen: ['2/3', '-'] },
  { naam: 'Tessa <b>', weg: false, cellen: ['3/3', '1:02,4'] },
  { naam: 'Jelle', weg: true, cellen: ['1/3', '-'] },
]);
const rijen = t.split('<tr').slice(2);
ok(rijen.length === 3, 'een rij per deelnemer');
ok(/class="on"/.test(rijen[0]) && !/weg/.test(rijen[0]), 'de eigen rij is gemarkeerd');
ok(/class=""/.test(rijen[1]) && /Tessa &lt;b&gt;/.test(rijen[1]), 'namen worden geëscaped');
ok(/class="weg"/.test(rijen[2]) && /<td>weg<\/td><\/tr>/.test(rijen[2]), 'wie wegvalt krijgt het woord weg in de laatste cel');
ok(/<td>-<\/td><td>weg/.test(rijen[2]), 'de cellen ervoor zijn leeg (geen verouderde stand)');
ok(/<th scope="col">#<\/th>/.test(t) && /<th scope="row">Jelle/.test(t), 'kop en rijkop zijn echte tabelkoppen');
ok(standTabel(['#', 'Naam'], []).includes('<tbody></tbody>'), 'zonder deelnemers een lege tabel');

// bedrading: de borden met meer deelnemers gebruiken de gedeelde tabel; pitch & putt zegt "weg" in woorden
ok(/standTabel\(\['#', 'Speler', 'Ronde', 'Tijd'\]/.test(rd('game/js/kartbaan.js')), 'kartbaan gebruikt standTabel');
ok(/standTabel\(\['#', 'Klimmer', 'Tijd', 'Stand'\]/.test(rd('game/js/klimtoren.js')), 'klimtoren gebruikt standTabel');
ok(/<\/s> weg/.test(rd('game/js/pitchputt.js')), 'pitch & putt zet het woord weg achter een weggevallen speler');
ok(/tr\.weg/.test(rd('game/js/minigamekit.js')), 'de CSS kent de weg-rij');
console.log(`standtabel_test: ${n} controles ok`);
