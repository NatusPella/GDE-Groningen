// #804: de rAF-planning van de spellus. Het volgende beeld wordt vóór al het werk van dit beeld
// aangevraagd, zodat een lange staart (of een fout in de staart) de cadans niet kan laten stoppen; de
// oude plek achteraan de callback is weg. Broncheck, want de loop zelf draait alleen in Electron.
//   node scripts/frame_loop_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';

const src = fs.readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8');
const start = src.indexOf('function frame(now) {');
const eind = src.indexOf('function blackFrameState()', start);
assert.ok(start > 0 && eind > start, 'de spellus staat in main.js');
const body = src.slice(start, eind);

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ' (' + info + ')' : ''}`); } };

ok((body.match(/requestAnimationFrame\(frame\);/g) || []).length === 1, 'precies één rAF-aanvraag in de frame-functie');
const raf = body.indexOf('requestAnimationFrame(frame);');
ok(raf >= 0 && raf < body.indexOf('const zuinig'), 'het volgende beeld wordt vóór de zuinige-modus-check aangevraagd');
ok(raf < body.indexOf('frameBody(dt)'), 'en vóór al het frame-werk');
ok(!/requestAnimationFrame\(frame\);\s*\}\s*$/.test(body.slice(0, body.lastIndexOf('requestAnimationFrame(frame);'))), 'geen tweede aanvraag achteraan de callback');
ok(/const dt = Math\.min\(0\.05, frameMs \/ 1000\);/.test(body), 'de dt-cap blijft staan');
ok(/if \(zuinig && skipFrame\(now - last\)\) return;/.test(body), 'een overgeslagen zuinig beeld plant geen tweede rAF');
ok(/probe\.mark\('frame'\)/.test(body) && body.indexOf("probe.mark('frame')") > body.indexOf('probe.begin(now)'), 'de frame-mark volgt op begin');
ok(/frameStats\.frameMs = frameMs;/.test(body), 'de frame-statistiek blijft gevuld');

console.log(fails ? `${fails} van ${n} frame-loop-checks mislukt` : `frame_loop_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
