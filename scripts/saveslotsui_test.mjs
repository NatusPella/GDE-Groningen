// Het scherm Opgeslagen spellen (#564, #565, #579, #606): de kaarten, het '…'-menu en wat de speler ziet.
// De wereldkant (savegame.js) haalt three.js binnen en is in Node niet te laden; daarom toetsen we de
// bedrading in de bron, net als savegame_test.mjs en coopladen_test.mjs doen. Waar het kan, draaien we de
// echte pure functie (saveslots.js) in plaats van alleen de vorm van een regel.
//   node scripts/saveslotsui_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(ROOT, 'game/js', f), 'utf8');
let n = 0, fails = 0;
const ok = (fn, name) => { n++; try { fn(); } catch (e) { fails++; console.log(`FAIL ${name}: ${e.message}`); } };
const ui = src('saveslotsui.js'), css = src('saveslots.css'), sg = src('savegame.js');

// --- #564: het spel dat je nu speelt kan je niet verwijderen; de autosave maakt het anders weer aan ---
ok(() => {
  const m = ui.match(/const NU_SPEL_NIET_WEG = '([^']+)'/);
  assert.ok(m, 'er is een Nederlandse melding');
  assert.match(m[1], /Dit is het spel dat je nu speelt\./);
  assert.match(m[1], /verwijderen/i);
}, 'verwijderen van het huidige spel: de melding zegt waarom (#564)');
ok(() => {
  assert.match(ui, /const spelDatNuLoopt = \(s\) => mode === 'game' && !opts\.pick && !!s && s\.n === currentSlot\(\);/,
    'het spel dat nu loopt is de plek waaraan deze sessie gebonden is');
  const del = ui.slice(ui.indexOf("if (act === 'delete' && cur)"), ui.indexOf('file.addEventListener'));
  assert.match(del, /if \(spelDatNuLoopt\(cur\)\) \{ over = null; message = NU_SPEL_NIET_WEG; render\(\{ more: cur\.n \}\); return; \}/,
    'de vraag om te verwijderen komt er niet eens');
  assert.match(del, /act === 'delete-ok' && cur\) \{\s*over = null;\s*if \(spelDatNuLoopt\(cur\)\) \{ message = NU_SPEL_NIET_WEG; render\(\); return; \}/,
    'ook een oude bevestiging verwijdert het spel niet');
  assert.match(del, /S\.deleteSlot\(null, cur\.n\)/, 'een ander opgeslagen spel verwijderen kan gewoon');
}, 'verwijderen van het huidige spel is geblokkeerd in het slotpaneel (#564)');
ok(() => {
  // De autosave schrijft naar de gebonden plek; zolang die plek bestaat komt een verwijderd spel dus terug.
  // De blokkade hangt daarom aan currentSlot() (de gebonden plek) en niet aan de index alleen.
  assert.match(sg, /export function currentSlot\(\) \{\s*return saveTarget\(\);\s*\}/, 'currentSlot is de schrijfplek van deze sessie');
  assert.match(sg, /const saveTarget = \(\) => boundSlot \|\| activeSlot\(\);/);
}, 'de schrijfplek van de autosave is de gebonden plek (#564)');

// --- #565: een gast kan geen lege plek vullen; die wordt een dode schrijfplek ---
ok(() => {
  const m = ui.match(/const GAST_LEGE_PLEK_TEKST = '([^']+)'/);
  assert.ok(m, 'er is een Nederlandse melding');
  assert.match(m[1], /eigen opgeslagen spel/);
  assert.match(ui, /const gastInSessie = \(\) => !!\(world && world\.coopRole === 'client' && coopSessieLoopt\(world\)\);/,
    'een gast is een meespelende speler in een echte sessie');
  const nieuw = ui.slice(ui.indexOf("if (act === 'new') {"), ui.indexOf("if (act === 'import') {"));
  const blok = nieuw.indexOf('if (gastInSessie()) { say(GAST_LEGE_PLEK_TEKST); return; }');
  const maak = nieuw.indexOf('S.createSlot(null');
  assert.ok(blok >= 0 && maak > blok, 'de gast wordt geblokkeerd vóór er een plek wordt gemaakt');
  assert.match(nieuw, /S\.deleteSlot\(null, m\);\s*S\.setActive\(null, was\);\s*bindSlot\(\);/, 'mislukt opslaan, dan gaat de nieuwe plek weg en komt de eigen schrijfplek terug');
  assert.match(ui, /let emptyShown = solo \|\| gastInSessie\(\);/, 'een gast ziet de lege kaart niet');
}, 'een gast op een lege kaart wordt tegengehouden (#565)');
ok(() => {
  // De gast-save routeert in savegame.js naar saveGuestEarnings; die kan alleen samenvoegen in een
  // bestaande save. Zonder de blokkade zou elke checkpoint op een lege plek mislukken.
  assert.match(sg, /if \(w\.coopRole === 'client'\) return saveGuestEarnings\(w\);/);
  assert.match(sg, /const ok = r\.state === 'ok' \|\| r\.state === 'hersteld';/);
}, 'de gast-schrijfweg kan alleen in een bestaande save werken (#565)');

console.log(`saveslotsui_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
