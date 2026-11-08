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

// --- #780: de nieuw-spel-vraag belooft niets wat deleteSlot niet doet -------------------------------
ok(() => {
  const nieuw = ui.slice(ui.indexOf('const newCard = (n, active)'), ui.indexOf('// the game played last'));
  assert.match(nieuw, /Dat spel wordt gewist, inclusief de herstelkopie\./, 'de vraag zegt dat de herstelkopie ook weggaat');
  assert.match(nieuw, /Dat kan niet ongedaan worden gemaakt\./);
  assert.doesNotMatch(ui, /alleen de herstelkopie blijft bewaard/, 'de oude, onjuiste belofte staat er niet meer');
  assert.match(ui.slice(ui.indexOf("if (act === 'newfull-ok') {"), ui.indexOf("if (act === 'new') {")), /S\.deleteSlot\(null, active\.n\)/, 'en het nieuwe spel wist de actieve plek echt');
  // het gedrag waar de tekst bij hoort: deleteSlot wist de hoofdsleutel én de herstelkopie
  const sl = src('saveslots.js');
  assert.match(sl, /removeItem\(slotKey\(n\)\); s\.removeItem\(slotRecoveryKey\(n\)\)/, 'deleteSlot wist de herstelkopie ook');
}, 'nieuw spel: de tekst klopt met het wissen van de herstelkopie (#780)');

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

// --- #606: het scherm Opgeslagen spellen zelf -------------------------------------------------------
const start = src('startscreen.js'), pm = src('pausemenu.js');

ok(() => {
  // 3. "Autosave" was Engels en stond alleen in een tooltip; nu een Nederlandse chip plus een schermregel.
  assert.match(ui, /chips\.push\('<span class="ssl-chip on">Bewaard vanzelf<\/span>'\)/);
  assert.doesNotMatch(ui, />Autosave</, 'het Engelse woord staat niet meer op het scherm');
  assert.match(ui, /class="ssl-note">Het spel bewaart vanzelf na een aankoop, een missie of als je stopt; je kunt altijd zelf opslaan\.</, 'de uitleg staat als gewone regel op het scherm');
  assert.ok(ui.indexOf('ssl-note') > ui.indexOf("role=\"list\" aria-label=\"Opgeslagen spellen\""), 'de regel staat onder het raster, bij de spelers zichtbaar');
  assert.match(css, /#saveslots \.ssl-note \{[^}]*font-size: 17px;[^}]*color: var\(--mut\);/);
}, 'autosave-uitleg is Nederlands en leesbaar voor pad en touch (#606 punt 3)');

ok(() => {
  // 2. Op 1280x720 paste het '…'-menu met vijf rijen niet in een kaart; het is daar compacter en scrollbaar.
  assert.match(css, /@media \(max-height: 820px\) \{[\s\S]{0,200}#saveslots \.ssl-mi \{ height: 40px; font-size: 22px;/);
  assert.match(css, /#saveslots \.ssl-over \{[^}]*overflow-y: auto;/);
}, 'het kaartmenu past op een laag venster (#606 punt 2)');

ok(() => {
  // 5. Een gast ziet dezelfde bevestiging als de opener terwijl er alleen verdiensten worden bijgeschreven.
  const m = sg.match(/export const GAST_BEWAARD_TEKST = '([^']+)'/);
  assert.ok(m, 'de gasttekst staat in savegame.js');
  assert.match(m[1], /Je verdiensten zijn bewaard/);
  assert.match(m[1], /het verhaal van de sessie staat in het opgeslagen spel van wie het spel opende/);
  assert.match(sg, /export const GAST_BEWAARD_TEKST =/);
  assert.match(pm, /else if \(world && world\.coopRole === 'client'\) status\(GAST_BEWAARD_TEKST\)/, 'de pauzemenu zegt het bij Spel opslaan');
  assert.match(ui, /const saveMelding = \(ok, normaal\) => \(ok \? \(gastInSessie\(\) \? GAST_BEWAARD_TEKST : normaal\) : 'Opslaan mislukt\.'\)/);
  assert.match(ui, /saveMelding\(saveGame\(world, \{ toast: false, manual: true \}\), 'Opgeslagen\.'\)/);
  assert.match(ui, /saveMelding\(saveGame\(world, \{ toast: false, manual: true \}\), 'Overschreven\.'\)/);
  assert.doesNotMatch(pm, /Opslaan mislukt'\)[^;]*Opgeslagen om/, 'geen algemene bevestiging meer in het gastpad');
}, 'een gast hoort wat zijn opslag wel en niet bevat (#606 punt 5)');

ok(() => {
  // 4. Een kapotte save zonder laadbare plek leidt naar dit scherm met een melding, niet naar het oude titelscherm.
  assert.match(start, /if \(!slot \|\| \(!fresh && !hasSave\(\) && listSlots\(null\)\.length\)\) \{/);
  assert.match(start, /return runBootSaveScreen\(world, opts\);/, 'de boot opent Opgeslagen spellen');
  assert.doesNotMatch(start, /\(!fresh && !hasSave\(\) && listSlots\(null\)\.length\)\) return runMenuScreen/, 'het oude titelscherm is uit dit pad');
  const boot = start.slice(start.indexOf('function runBootSaveScreen('), start.indexOf('// Title screen over the live city'));
  assert.match(boot, /openSaveSlots\(\{[\s\S]{0,300}mode: 'start', solo: true, noBack: true/, 'de speler kiest een spel en kan niet terug naar een scherm dat er niet is');
  assert.match(boot, /hint: BOOT_SAVE_TEKST/);
  assert.match(start, /const BOOT_SAVE_TEKST = 'We konden je opgeslagen spel niet automatisch openen\. Kies een opgeslagen spel om verder te gaan of begin een nieuw spel\.'/);
  assert.match(boot, /openSaveSlots/);
  const noBack = ui.slice(ui.indexOf('const noBack'), ui.indexOf('const primaryLabel'));
  assert.match(noBack, /const noBack = !!opts\.noBack;/);
  assert.match(ui, /\$\{noBack \? '' : `<button type="button" class="ssl-fb" data-grp="foot" data-do="close">/, 'Terug valt weg als er niets is om naar terug te gaan');
  assert.match(ui, /if \(over\) doAction\('back'\);\s*else if \(!noBack\) close\(\);/, 'Escape sluit dat scherm niet');
  assert.match(start, /if \(pending && pending\.mode === 'benchmark'\) return runMenuScreen\(world, opts, pending\);/, 'een benchmark-herlaad houdt zijn eigen route');
}, 'een kapotte save leidt naar Opgeslagen spellen met een melding (#606 punt 4)');

console.log(`saveslotsui_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
