// De spotmissie van de duif toont zijn doelen in de wereld (playtest 0.64.0): elk doel heeft een plek en een naam,
// het dichtstbijzijnde nog niet gespotte is het hoofddoel, de voortgang staat in woorden, de pijl blijft aan de rand.
//   node scripts/pigeonguide_test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { guideModel, edgeIndicator, directionWord, distText, relBearing, progressText, targetsHaveWorldMarks, GUIDE_INTRO } from '../game/js/pigeonguidelogic.js';

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('MISLUKT: ' + m); } };
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js');

// 1. elk doel van elke spotstage in de missies heeft een plek en een naam (brontest: missions_defs.js haalt geen three binnen)
const defsSrc = readFileSync(path.join(root, 'missions_defs.js'), 'utf8');
// de stages uit de bron lezen: de modulegrafiek van missions_defs.js trekt three binnen
const blocks = defsSrc.split("kind: 'pigeon'").slice(1).map((q) => q.slice(0, q.indexOf('targets: [') + 2500));
ok(blocks.length >= 2, `minstens twee spotstages gevonden (${blocks.length})`);
for (const blk of blocks) {
  const NL = String.fromCharCode(10);
  const lijst = blk.slice(blk.indexOf('targets: [') + 10, blk.indexOf(NL + '          ],'));
  const regels = lijst.split(NL).map((r) => r.trim()).filter((r) => r.startsWith('{'));
  const doelen = regels.map((r) => ({ label: (/label: '([^']+)'/.exec(r) || [])[1], landmark: r.includes('landmark:'), at: r.includes('at: [') }));
  ok(doelen.length >= 3, 'spotstage met doelen');
  ok(targetsHaveWorldMarks({ targets: doelen }), 'elk doel van een spotstage heeft een plek en een naam: ' + JSON.stringify(doelen.map((d) => d.label)));
}
ok(defsSrc.includes("label: 'Spot het museum van boven', place: { landmark: 'Groninger Museum', label: 'Het Groninger Museum' }"), 'het museum krijgt zijn naam boven het gebouw');
ok(defsSrc.includes("place: { landmark: 'Martinitoren', label: 'De Martinitoren' }"), 'de Martinitoren krijgt zijn naam');

// 2. het dichtstbijzijnde nog niet gespotte doel is het hoofddoel; de voortgang telt
const targets = [{ x: 100, y: 0, label: 'A' }, { x: 30, y: 0, label: 'B' }, null, { x: -300, y: 0, label: 'C' }];
let m = guideModel({ targets, spotted: new Set(), flight: { x: 0, y: 0, yaw: 0 } });
ok(m.items.length === 3 && m.total === 3, 'null-doelen tellen niet mee');
ok(m.nearest && m.nearest.label === 'B', 'B is het dichtstbijzijnde');
ok(m.progress === 'Gespot 0 van 3', 'voortgang aan het begin: ' + m.progress);
m = guideModel({ targets, spotted: new Set([1]), flight: { x: 0, y: 0, yaw: 0 } });
ok(m.nearest.label === 'A' && m.progress === 'Gespot 1 van 3', 'na B is A het hoofddoel: ' + m.nearest.label + ' / ' + m.progress);
ok(m.items.filter((i) => i.nearest).length === 1, 'precies één hoofddoel');
m = guideModel({ targets, spotted: new Set([0, 1, 3]), flight: { x: 0, y: 0, yaw: 0 } });
ok(m.nearest === null && m.line === 'Alles gespot', 'alles gespot: geen hoofddoel meer');

// 3. vasthouden: de balk loopt van 0 tot 1
m = guideModel({ targets, spotted: new Set(), holds: [0, 0.4], spotTime: 0.8, flight: { x: 30, y: 0, yaw: 0 } });
ok(m.items[1].near && Math.abs(m.items[1].hold - 0.5) < 1e-9, 'bij B hangen geeft een halve balk');
ok(!m.items[0].near, 'A ligt buiten de spotstraal');

// 4. richting in woorden en in hoek
ok(Math.abs(relBearing(0, 0, 0, 10, 0)) < 1e-9, 'recht vooruit is 0');
ok(relBearing(0, 0, 0, 0, 10) > 1.5 && directionWord(relBearing(0, 0, 0, 0, 10)) === 'rechts', 'doel op +y bij yaw 0 is rechts');
ok(directionWord(-1.57) === 'links' && directionWord(3) === 'achter je' && directionWord(0.1) === 'recht voor je', 'richtingswoorden');
ok(/schuin rechts voor je/.test(directionWord(0.8)), 'schuin rechts voor');
ok(m.line.includes('m') && /recht voor je|rechts|links|achter je/.test(guideModel({ targets, spotted: new Set(), flight: { x: 0, y: 0, yaw: 0 } }).line), 'de regel heeft afstand en richting');
ok(distText(47) === '45 m' && distText(240) === '240 m' && distText(1500) === '1,5 km', 'afstanden: ' + distText(47) + ' ' + distText(240) + ' ' + distText(1500));
ok(progressText(2, 5) === 'Gespot 2 van 5', 'voortgangsregel');

// 5. de pijl blijft aan de rand en wijst naar het doel
let e = edgeIndicator(0.2, 0.1, false);
ok(e.onScreen, 'een doel in beeld krijgt de pijl erboven');
e = edgeIndicator(3, 0, false);
ok(!e.onScreen && Math.abs(e.x) <= 0.86 + 1e-9 && Math.abs(e.angle - Math.PI / 2) < 1e-9, 'doel ver rechts: pijl rechts, wijst naar rechts');
e = edgeIndicator(0, 0, true);
ok(!e.onScreen && e.y < 0, 'recht achter je: de pijl onderaan');
e = edgeIndicator(0.5, 0.5, true);
ok(e.x < 0 && e.y < 0 && !e.onScreen, 'achter de camera wordt gespiegeld');

// 6. de uitleg noemt de besturing met tokens, geen losse toetsnamen; geen verboden woorden
ok(GUIDE_INTRO.controls.every(([t]) => /^[A-Z]+$/.test(t)), 'toetsen als token');
const srcGuide = readFileSync(path.join(root, 'pigeonguide.js'), 'utf8');
ok(/glyphHtml/.test(srcGuide) && /reducedMotion/.test(srcGuide), 'toetsplaatjes via keycap.js en Rustig drukwerk/verminderde beweging gerespecteerd');
ok(!/\b(host|iedereen)\b/i.test(GUIDE_INTRO.goal + GUIDE_INTRO.title), 'geen host of iedereen in spelertekst');

console.log(bad ? `${bad} MISLUKT` : 'pigeonguide: alles ok');
process.exit(bad ? 1 : 0);
