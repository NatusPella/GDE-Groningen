// De toren bij de rondvlucht (#492) in luchtverkeer.js: precies één vertrekregel en één
// naderingsregel per veld, deterministisch per veldnaam, zonder echte luchtvaartnamen of merken
// en met een veilige regel voor een onbekend veld. Puur: geen THREE, geen wereld, geen DOM.
//   node scripts/luchtverkeer_test.mjs
import assert from 'node:assert';
import { departure, approach, STANDAARD_VERTREK, STANDAARD_NADERING } from '../game/js/luchtverkeer.js';
import { checkText } from './text_audit.mjs';

// Eén regel, niet te lang voor een bordrij, en nooit leeg.
function eenRegel(tekst, wat) {
  assert.strictEqual(typeof tekst, 'string', wat + ': een tekst');
  const schoon = tekst.trim();
  assert.ok(schoon, wat + ': niet leeg');
  assert.strictEqual(schoon.split('\n').length, 1, wat + ': precies één regel: ' + tekst);
  assert.ok(tekst.length <= 80, wat + ': kort genoeg voor het bord (' + tekst.length + '): ' + tekst);
  assert.strictEqual((tekst.match(/Toren:/g) || []).length, 1, wat + ': één keer de toren: ' + tekst);
}

// Geen echt merk, bedrijf of persoon in een torenregel.
function geenMerk(tekst, wat) {
  const hits = checkText(tekst).filter((f) => ['merk', 'persoon', 'naam', 'winter'].includes(f.rule));
  assert.strictEqual(hits.length, 0, wat + ': ' + JSON.stringify(hits) + ' in ' + tekst);
}

const VELDEN = ['Rondvlucht Eelde', 'Eelde', 'Veld Noord', 'de hoek van de polder', 'Vliegveld Zuid', 'Het Kleine Veld', 'Vliegveld Noord', 'Groningen', 'West', 'Oost'];

// --- determinisme: dezelfde veldnaam geeft altijd dezelfde regel -----------------------------
for (const veld of VELDEN) {
  eenRegel(departure(veld), 'vertrek ' + veld);
  eenRegel(approach(veld), 'nadering ' + veld);
  geenMerk(departure(veld), 'vertrek ' + veld);
  geenMerk(approach(veld), 'nadering ' + veld);
  for (let i = 0; i < 3; i++) {
    assert.strictEqual(departure(veld), departure(veld), 'vertrek is deterministisch: ' + veld);
    assert.strictEqual(approach(veld), approach(veld), 'nadering is deterministisch: ' + veld);
  }
  // spaties en hoofdletters horen niet uit te maken: het is dezelfde veldnaam
  assert.strictEqual(departure(veld), departure('  ' + veld.toUpperCase() + ' '), 'hoofdletters en spaties tellen niet mee: ' + veld);
  assert.notStrictEqual(departure(veld), approach(veld), 'vertrek en nadering zijn twee verschillende regels: ' + veld);
  // een bekend veld valt niet terug op de standaardregel, ook niet bij een naam met een hoge hash
  assert.notStrictEqual(departure(veld), STANDAARD_VERTREK, 'een bekend veld heeft een eigen vertrekregel: ' + veld);
  assert.notStrictEqual(approach(veld), STANDAARD_NADERING, 'een bekend veld heeft een eigen naderingsregel: ' + veld);
}

// --- één departure en één approach per dienst, en niet altijd dezelfde zin --------------------
const vertrekken = new Set(VELDEN.map((v) => departure(v)));
const naderingen = new Set(VELDEN.map((v) => approach(v)));
assert.ok(vertrekken.size >= 2, 'de toren zegt niet bij elk veld hetzelfde: ' + [...vertrekken].length);
assert.ok(naderingen.size >= 2, 'de nadering wisselt per veld: ' + [...naderingen].length);
assert.strictEqual(VELDEN.map((v) => departure(v)).length, VELDEN.length, 'één vertrekregel per veld');
assert.strictEqual(VELDEN.map((v) => approach(v)).length, VELDEN.length, 'één naderingsregel per veld');

// --- een onbekend of leeg veld geeft een veilige standaardregel -------------------------------
for (const leeg of ['', '   ', null, undefined, 42, {}, []]) {
  eenRegel(departure(leeg), 'leeg vertrek');
  eenRegel(approach(leeg), 'lege nadering');
  assert.strictEqual(departure(leeg), STANDAARD_VERTREK, 'een leeg veld geeft de standaard vertrekregel');
  assert.strictEqual(approach(leeg), STANDAARD_NADERING, 'een leeg veld geeft de standaard naderingsregel');
}

// --- geen echte luchtvaartnamen of merken in de regels ---------------------------------------
const ECHT = /KLM|Schiphol|Boeing|Airbus|Fokker|Ryanair|Transavia|EasyJet|Lufthansa|Cessna|Piper|Beechcraft|Groningen Airport/i;
for (const veld of VELDEN) {
  for (const regel of [departure(veld), approach(veld)]) {
    assert.ok(!ECHT.test(regel), 'geen echte naam in: ' + regel);
  }
}
for (const regel of [STANDAARD_VERTREK, STANDAARD_NADERING]) assert.ok(!ECHT.test(regel), 'geen echte naam in de standaardregel');

console.log('luchtverkeer_test ok');
