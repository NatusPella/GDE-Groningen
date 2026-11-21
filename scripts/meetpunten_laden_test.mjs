// De meetpuntenlijst voor de eindsweep (docs/PERF-MEETPUNTEN-21-11.md) wijst naar echte commando's, schakelaars en meetingangen.
//   node scripts/meetpunten_laden_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const doc = fs.readFileSync(path.join(ROOT, 'docs/PERF-MEETPUNTEN-21-11.md'), 'utf8');
const js = fs.readdirSync(path.join(ROOT, 'game/js')).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(ROOT, 'game/js', f), 'utf8')).join('\n');
let n = 0, fails = 0;
const ok = (fn, name) => { n++; try { fn(); } catch (e) { fails++; console.log(`FAIL ${name}: ${e.message}`); } };

const scripts = new Set([...doc.matchAll(/(scripts\/[\w./-]+\.(?:mjs|js))/g)].map((m) => m[1]));
ok(() => assert.ok(scripts.size >= 8, 'minstens acht scripts'), 'scripts gevonden');
for (const s of scripts) ok(() => assert.ok(fs.existsSync(path.join(ROOT, s)), `${s} bestaat`), `script ${s}`);

const flags = new Set([...doc.matchAll(/\?perfoff=([a-z]+)/g)].map((m) => m[1]));
ok(() => assert.ok(flags.size >= 8, 'minstens acht schakelaars'), 'schakelaars gevonden');
for (const f of flags) ok(() => assert.ok(js.includes(`perfOff('${f}')`), `perfOff('${f}') staat in de code`), `schakelaar ${f}`);

const globals = new Set([...doc.matchAll(/window\.(__\w+)/g)].map((m) => m[1]));
ok(() => assert.ok(globals.size >= 4, 'minstens vier meetingangen'), 'ingangen gevonden');
for (const g of globals) ok(() => assert.ok(js.includes(`window.${g}`), `window.${g} wordt gezet of gelezen`), `ingang ${g}`);

ok(() => assert.match(doc, /## Samen spelen/), 'de Samen-regel staat erin');

console.log(`${n - fails}/${n} geslaagd`);
process.exit(fails ? 1 : 0);
