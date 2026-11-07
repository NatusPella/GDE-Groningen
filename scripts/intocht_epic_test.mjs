// Epic #704 (intocht) afgerond: de code, de acht scènes, de replay/preview en de docs
// horen bij elkaar en de sub-issues zijn gesloten. Pure broncontrole; de echte
// gedragstests staan in wijkintocht_test, gebieden_test en cutpreview_test.
//   node scripts/intocht_epic_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0;
const ok = (c, m, extra = '') => { n++; if (!c) { console.log('FAIL ' + m + (extra ? ' (' + extra + ')' : '')); process.exitCode = 1; } };

const doc = lees('docs/INTOCHT.md');
ok(/Epic \*\*#704\*\* is afgerond/.test(doc), 'docs/INTOCHT.md is de epic-afronding');
for (const sub of ['#705', '#706', '#707', '#708', '#709', '#710', '#716', '#723', '#724']) ok(doc.includes(sub), `de afronding noemt ${sub}`);
ok(/host-only/.test(doc) && /COOP-GAST/.test(doc), 'de samen-spelen-regel staat erin');
ok(/Bekijk de intocht/.test(doc) && /preview/.test(doc), 'terugkijken en preview staan erin');

const intochten = lees('game/js/intochten.js');
ok(/export function bekijkIntocht\(/.test(intochten), 'de replay-functie bestaat');
ok(/export function probeerIntocht\(/.test(intochten), 'de wachtrij-tick bestaat');
const W = await import('../game/js/wijkintocht.js');
ok(W.INTOCHTEN.length >= 8, 'minstens acht handgeschreven scènes', String(W.INTOCHTEN.length));
const gebieden = lees('docs/GEBIEDEN.md');
ok(/INTOCHT\.md/.test(gebieden) && /Acht eigen scènes/.test(gebieden), 'GEBIEDEN verwijst naar de afronding');
ok(/bestaan sinds #708\/#723/.test(gebieden), 'de oude "nog niet gebouwd"-regel is rechtgezet');
const coop = lees('docs/COOP-GAST.md');
ok(/Veroveren en intochten/.test(coop), 'COOP-GAST heeft de veroveren/intohten-sectie');
ok(/Besloten \(#450/.test(coop), 'de host-only-beslissing is bijgewerkt');

console.log(process.exitCode ? 'intocht_epic_test: FAIL' : `intocht_epic_test: ${n} controles ok`);
