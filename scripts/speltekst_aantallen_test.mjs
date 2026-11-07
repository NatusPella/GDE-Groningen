// Spelerstekst en aantallen (#682): de vliegschool-regel zei "Zes lessen met het
// vliegtuig en zeven met de helikopter" (13) terwijl dezelfde regel erboven "twintig
// lessen" zei en vliegschoolrules.js er 20 heeft. De aantallen komen nu uit LESSEN; deze
// test bewaakt dat en de andere tellingen die al uit hun bron kwamen.
//   node scripts/speltekst_aantallen_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const V = await import(pathToFileURL(path.join(ROOT, 'game/js/vliegschoolrules.js')).href);

let n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { console.log('FAIL ' + m + (info ? ' (' + info + ')' : '')); process.exitCode = 1; } };

// 1. de vliegschool: de bron telt 20 lessen, 11 vliegtuig en 9 helikopter
ok(Array.isArray(V.LESSEN) && V.LESSEN.length === 20, 'LESSEN heeft twintig lessen', String(V.LESSEN && V.LESSEN.length));
const vt = V.LESSEN.filter((l) => l.kist === 'vliegtuig').length;
const heli = V.LESSEN.filter((l) => l.kist === 'heli' || l.kist === 'helikopter').length;
ok(vt === 11 && heli === 9, 'elf met het vliegtuig en negen met de helikopter', `${vt}/${heli}`);
ok(V.LES_IDS.length === V.LESSEN.length, 'LES_IDS en LESSEN lopen gelijk');

// 2. todo.js schrijft die aantallen niet meer met de hand: het zijn dezelfde LESSEN
const todo = lees('game/js/todo.js');
ok(/vliegtuigLessen = LESSEN\.filter\(\(l\) => l\.kist === 'vliegtuig'\)\.length/.test(todo), 'todo telt de vliegtuiglessen uit LESSEN');
ok(/\$\{vliegtuigLessen\} lessen met het vliegtuig en \$\{heliLessen\} met de helikopter/.test(todo), 'de detailtekst gebruikt die tellingen');
ok(/\$\{LESSEN\.length\} lessen/.test(todo), 'de meta-regel gebruikt het aantal uit LESSEN');
ok(!/Zes lessen met het vliegtuig/.test(todo), 'de oude vaste regel (13) staat er niet meer');
ok(!/Eelde · twintig lessen/.test(todo), 'geen handgeschreven twintig lessen meer in de meta-regel');

// 3. de andere tellingen die al uit een bron kwamen blijven dat doen
ok(/EIERBAL_TOTAL/.test(todo), 'eierballen komen uit EIERBAL_TOTAL');
ok(/SECRETS_TOTAL/.test(todo), 'geheimen komen uit SECRETS_TOTAL');
ok(/const total = Object\.keys\(VILLAGES\)\.length/.test(todo), 'het aantal dorpen komt uit VILLAGES');
ok(/p\.klaar} van \$\{p\.totaal} dorpen/.test(lees('game/js/todoui.js')), 'de dorpenstand in de UI komt uit de berekende totalen');

// 4. de woordenlijst is de plek voor de termen (activiteit/minigame/bijbaan/ronde)
const wl = lees('docs/WOORDENLIJST.md');
for (const term of ['minigame', 'bijbaan', 'activiteit', 'ronde']) ok(new RegExp(term, 'i').test(wl), `de woordenlijst noemt "${term}"`);
ok(/Activiteiten/.test(lees('game/js/pausemenu.js')), 'de pauzemenu-rail heet "Activiteiten"');
ok(/'Minigames'/.test(todo), 'de groep minigames heet in de lijst "Minigames" (spelletje, geen schermnaam)');

console.log(process.exitCode ? 'speltekst_aantallen_test: FAIL' : `speltekst_aantallen_test: ${n} controles ok`);
