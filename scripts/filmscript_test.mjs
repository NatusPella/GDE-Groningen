// Filmscript (docs/verhaal/FILMSCRIPT-21-11.md): gegenereerd uit script.json; elke scène en elke stap staat erin, de scène-id's
// komen overeen met de bron, en het bestand is niet verouderd. node scripts/filmscript_test.mjs
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { STEPS } from '../game/js/storyarc.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const doc = read('docs/verhaal/FILMSCRIPT-21-11.md');
const data = JSON.parse(read('game/storydata/script.json'));

ok(/## Logline/.test(doc) && /## Synopsis/.test(doc) && /## Beat sheet per akte/.test(doc) && /## Muziekmomenten/.test(doc) && /## Scènebord/.test(doc), 'logline, synopsis, beat sheet, muziek en scènebord staan erin');
ok(/Samen spelen/.test(doc) && /speler-protagonist/i.test(doc), 'de rolverdeling voor Samen spelen staat erin (speler-protagonist en partner-NPC)');
for (const sc of data.scenes) ok(doc.includes(`**${sc.id}**`), `scène ${sc.id} staat in het filmscript`);
for (const st of STEPS) ok(doc.includes(`Sequentie ${st.id}:`), `sequentie ${st.id} staat in het filmscript`);
ok(/BINNEN – /.test(doc) && /BUITEN – /.test(doc) && /NACHT/.test(doc), 'sluglines met BINNEN of BUITEN en een tijd van de dag');
let current = true;
try { execFileSync(process.execPath, ['scripts/filmscript_export.mjs', '--check'], { cwd: new URL('..', import.meta.url), stdio: 'pipe' }); } catch (e) { current = false; }
ok(current, 'het filmscript is niet verouderd (node scripts/filmscript_export.mjs)');

console.log(`filmscript_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
