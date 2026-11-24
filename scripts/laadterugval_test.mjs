// #1073: een mislukte lading laat de wereld niet half geladen en de autosave schrijft niets over.
// laadMetTerugval is puur; de bedrading in savegame.js (three via CDN, niet in Node te laden) toetsen we op de bron.
//   node scripts/laadterugval_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { laadMetTerugval, BEWAREN_UIT_TEKST } from '../game/js/loadrollback.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sg = fs.readFileSync(path.join(ROOT, 'game/js/savegame.js'), 'utf8');
let n = 0, fails = 0;
const ok = (fn, name) => { n++; try { fn(); } catch (e) { fails++; console.log(`FAIL ${name}: ${e.message}`); } };

// Een nepwereld met stappen zoals applySave: geld, missies, winkels (die laat in de rij kan falen).
const nepApply = (w, kapotVeld) => (d) => {
  w.money = d.money;
  w.missie = d.missie;
  if (kapotVeld && d.winkels === 'kapot') throw new Error('applyShopSave');
  w.winkels = d.winkels;
  if (d.thuis === 'kapot' && kapotVeld) throw new Error('applyHomeOnLoad');
  w.thuis = d.thuis;
};
const oud = { money: 500, missie: 3, winkels: 'oud', thuis: 'oud' };
const stil = () => {};

ok(() => {
  const w = {}; nepApply(w, true)(oud);
  const r = laadMetTerugval(nepApply(w, true), { money: 99999, missie: 40, winkels: 'nieuw', thuis: 'nieuw' }, { ...oud }, stil);
  assert.deepEqual([r.ok, r.teruggezet, r.kapot], [true, false, false]);
  assert.equal(w.money, 99999);
}, 'een goede lading wordt toegepast');

ok(() => {
  const w = {}; nepApply(w, true)(oud);
  const r = laadMetTerugval(nepApply(w, true), { money: 99999, missie: 40, winkels: 'kapot', thuis: 'nieuw' }, { ...oud }, stil);
  assert.deepEqual([r.ok, r.teruggezet, r.kapot], [false, true, false]);
  // de late fout liet geld en missie al toegepast: de terugval zet ze weer op de oude stand
  assert.deepEqual({ ...w }, oud);
}, 'een fout in een late stap zet de oude stand terug (geen gemengde wereld)');

ok(() => {
  const w = {}; nepApply(w, true)(oud);
  // de terugval faalt ook (de oude stand zelf is kapot): dan is de wereld gemengd en bewaren hoort uit
  const r = laadMetTerugval(nepApply(w, true), { money: 1, missie: 1, winkels: 'kapot' }, { ...oud, winkels: 'kapot' }, stil);
  assert.deepEqual([r.ok, r.teruggezet, r.kapot], [false, false, true]);
}, 'faalt ook de terugval, dan is de wereld kapot');

ok(() => {
  const r = laadMetTerugval(() => { throw new Error('x'); }, {}, null, stil);
  assert.equal(r.kapot, true);
}, 'zonder stand van voor de lading is een mislukte lading kapot');

ok(() => {
  const logs = [];
  laadMetTerugval(() => { throw new Error('x'); }, {}, null, (t) => logs.push(t));
  assert.ok(logs.length >= 1 && /mislukt/.test(logs[0]), 'de fout wordt gelogd');
}, 'de fout komt in het log');

ok(() => assert.match(BEWAREN_UIT_TEKST, /Er wordt niets bewaard/), 'de melding is Nederlands en zegt wat er gebeurt');

// bedrading in savegame.js (#1298: bronregex nodig; pure logica hierboven gedekt)
ok(() => assert.match(sg, /laadMetTerugval\(\(x\) => applySaveRaw\(w, x\), d, voor/), 'applySave laadt via laadMetTerugval met een snapshot van vóór de lading');
ok(() => assert.match(sg, /try \{ voor = serialize\(w\); \} catch/), 'de snapshot mag zelf falen zonder de lading te blokkeren');
ok(() => assert.match(sg, /boundSlot = was\.boundSlot;/), 'de schrijfplek gaat terug naar die van vóór de poging (de terugval bindt anders de nieuwe slot)');
ok(() => assert.match(sg, /if \(r\.kapot\) \{\s*bewarenUit = true;/), 'bij een kapotte terugval staat bewaren uit');
ok(() => assert.match(sg, /if \(r\.ok\) \{ bewarenUit = false; (?:clearSafe\(\); )?noteRestore\(\); return true; \}/), 'een geslaagde lading zet bewaren weer aan'); // logica-bugs 24-11 (#1295): clearSafe wist de laatste goede velden van het vorige spel
ok(() => assert.match(sg, /export function saveGame\([^)]*\) \{\s*if \(!w\) return false;\s*\/\/[^\n]*\n\s*if \(bewarenUit\)/), 'saveGame schrijft niets zolang bewaren uit staat (autosave, sluiten en gast)');
ok(() => assert.doesNotMatch(sg, /console\.error\('Save laden mislukt', e\);\s*return false;/), 'de oude catch die de gemengde stand liet staan is weg');
ok(() => assert.match(sg, /if \(!applySave\(w, info\.data\)\) \{ setActive\(null, was\); return false; \}/), 'loadSlot zet bij een mislukte lading de actieve slot terug');

console.log(`${n - fails}/${n} geslaagd`);
process.exit(fails ? 1 : 0);
