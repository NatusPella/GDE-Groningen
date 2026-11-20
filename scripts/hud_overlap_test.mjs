// Test van de overlapdetector zonder Electron (scripts/qa/overlap.page.js, #985): de pure helpers en de vorm van het paginascript.
//   node scripts/hud_overlap_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + m + (info ? ' (' + info + ')' : '')); } };

const lib = fs.readFileSync(path.join(ROOT, 'scripts/qa/overlap.page.js'), 'utf8');
const scenes = fs.readFileSync(path.join(ROOT, 'scripts/qa/overlap_scenes.page.js'), 'utf8');
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
let parse = true;
try { new AsyncFn(lib + '\n' + scenes); } catch (e) { parse = false; ok(false, 'paginascript parseert', e.message); }
ok(parse, 'bibliotheek en scènes parsen samen als async functietekst (perf-script)');
const { rectSnijding, ovParen, ovTekstUit } = new Function(lib + '\nreturn { rectSnijding, ovParen, ovTekstUit };')();

const R = (l, t, r, b) => ({ l, t, r, b });
ok(rectSnijding(R(0, 0, 10, 10), R(5, 5, 20, 20)).w === 5, 'snijding: breedte 5');
ok(rectSnijding(R(0, 0, 10, 10), R(10, 0, 20, 10)).w === 0, 'snijding: aan elkaar grenzen is geen snijding');
ok(rectSnijding(R(0, 0, 10, 10), R(30, 30, 40, 40)).h === 0, 'snijding: los van elkaar is 0');

const v = (id, wortel, l, t, r, b) => ({ id, wortel, l, t, r, b });
let paren = ovParen([v('a', 'a', 0, 0, 100, 50), v('b', 'b', 90, 40, 200, 100)], 4);
ok(paren.length === 1 && paren[0].w === 10 && paren[0].h === 10, 'twee vlakken met 10 x 10 px snijding worden gemeld');
paren = ovParen([v('a', 'a', 0, 0, 100, 50), v('b', 'b', 98, 0, 200, 50)], 4);
ok(paren.length === 0, 'een snijding van 2 px (onder de marge) telt niet');
paren = ovParen([v('a', 'a', 0, 0, 100, 50), v('b', 'a', 10, 10, 50, 30)], 4);
ok(paren.length === 0, 'vlakken met dezelfde wortel zijn één geheel');
paren = ovParen([v('a', 'a', 0, 0, 100, 50), v('b', 'b', 10, 10, 50, 30)], 4, (x, y) => x.id === 'a' && y.id === 'b');
ok(paren.length === 0, 'een vlak in een ander vlak (ouder) telt niet');
paren = ovParen([v('a', 'a', 0, 0, 100, 100), v('b', 'b', 50, 50, 150, 150), v('c', 'c', 60, 60, 70, 70)], 4);
ok(paren.length === 3, 'drie onderling snijdende vlakken geven drie paren', String(paren.length));

ok(ovTekstUit(R(0, 0, 120, 20), R(0, 0, 100, 20)) === true, 'tekst 20 px breder dan zijn vlak steekt uit');
ok(ovTekstUit(R(0, 0, 102, 20), R(0, 0, 100, 20)) === false, 'tekst 2 px breder valt binnen de marge');
ok(ovTekstUit(R(5, 5, 95, 15), R(0, 0, 100, 20)) === false, 'tekst binnen het vlak steekt niet uit');

for (const k of ['overlap', 'buitenBeeld', 'afgekapt', 'ellips', 'tekstUit', 'filmHud']) ok(lib.includes(k), `bevinding ${k} staat in de bibliotheek`);
ok(/localStorage/.test(lib) === false && /localStorage/.test(scenes) === false, 'de detector raakt geen echte opslag');
// elke scène sluit zijn toestand af (anders vervuilt hij de volgende) en elke synthetische keydown heeft een keyup
ok(/const tap = .*keydown.*keyup/s.test(scenes), 'tap geeft keydown en keyup');
console.log(`hud_overlap_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
