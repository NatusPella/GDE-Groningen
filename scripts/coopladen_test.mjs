// Samen spelen (#452 punt 4): laden, nieuw spel en slot verwijderen zijn geblokkeerd zolang world.coopNet bestaat.
//   node scripts/coopladen_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(ROOT, 'game/js', f), 'utf8');
let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL ' + name); } };
const sg = src('savegame.js'), ui = src('saveslotsui.js'), pm = src('pausemenu.js');

ok(/export const coopSessieLoopt = \(w\) => !!\(w && w\.coopNet\)/.test(sg), 'coopSessieLoopt kijkt naar world.coopNet');
ok(/export function applySave\(w, d\) \{\s*if \(!w \|\| !d\) return false;\s*if \(coopSessieLoopt\(w\)\) return false;/.test(sg), 'applySave weigert tijdens een sessie');
ok(/export function loadSlot\(w, n\) \{\s*if \(coopSessieLoopt\(w\)\) return false;/.test(sg), 'loadSlot weigert voor het slot te wisselen');
for (const t of ['COOP_LADEN_TEKST', 'COOP_NIEUW_TEKST', 'COOP_WISSEN_TEKST']) {
  const m = sg.match(new RegExp(t + " = '([^']+)'"));
  ok(m && /^Samen spelen loopt nog\. Stop eerst de sessie/.test(m[1]), t + ' is Nederlands en wijst naar stoppen');
}
ok(/act === 'load' && cur\) \{\s*if \(coopSessieLoopt\(world\)\)/.test(ui), 'slotpaneel: laden geblokkeerd');
ok(/act === 'delete' && cur\) \{\s*if \(cur\.active && coopSessieLoopt\(world\)\)/.test(ui), 'slotpaneel: verwijderen van het actieve slot geblokkeerd');
ok(/act === 'delete-ok' && cur\) \{\s*over = null;\s*if \(cur\.active && coopSessieLoopt\(world\)\)/.test(ui), 'slotpaneel: bevestiging van verwijderen ook geblokkeerd');
ok(/act === 'newfull-ok'/.test(ui) && /coopSessieLoopt\(world\)\) \{ say\(COOP_NIEUW_TEKST\)/.test(ui), 'slotpaneel: nieuw spel geblokkeerd');
ok(/a === 'load'\) \{\s*if \(coopSessieLoopt\(world\)\)/.test(pm), 'pauzemenu: laden geblokkeerd');
ok(/a === 'new'\) \{\s*if \(coopSessieLoopt\(world\)\)/.test(pm), 'pauzemenu: nieuw spel geblokkeerd');

console.log(`coopladen_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
