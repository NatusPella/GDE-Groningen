// Pure test van de botsauto-HUD op de kermis (#985): scripts/kermishud_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { kermisHudModel, watNu, STAPPEN, UITLEG, REEKS_TIJD, botsPop } from '../game/js/kermisstatus.js';
import { simHudHtml } from '../game/js/simhud.js';

assert.equal(kermisHudModel(null), null);
const basis = { fase: 'ride', links: 51.2, duur: 75, score: 18, reeks: 0, flash: '', slecht: false, uitleg: true };
const ride = kermisHudModel(basis);
assert.equal(ride.stappen.length, STAPPEN.length); assert.equal(ride.stappen.filter((s) => s.stand === 'nu').length, 1); assert.equal(ride.stappen[1].stand, 'nu'); assert.equal(ride.stappen[0].stand, 'klaar');
assert.equal(ride.meter.naam, 'Tijd van het ritje'); assert.equal(ride.meter.label, '0:52'); assert.equal(Math.round(ride.meter.pct), 68); assert.equal(ride.meter.staat, '');
assert.deepEqual(ride.cijfers.map((c) => c.label), ['Punten'], 'zonder reeks alleen de punten'); assert.equal(ride.cijfers[0].waarde, '18');
assert.ok(ride.cijfers.every((c) => c.icoon) && ride.cijfers.filter((c) => c.primair).length === 1 && ride.cijfers[0].primair, 'elk getal een pictogram, de punten zijn primair');
assert.equal(ride.uitleg.length, UITLEG.length); assert.match(ride.nu, /gele kolom/); assert.equal(kermisHudModel({ ...basis, uitleg: false }).uitleg.length, 0);
const reeks = kermisHudModel({ ...basis, reeks: 3 });
assert.deepEqual(reeks.cijfers.map((c) => c.label), ['Punten', 'Reeks']); assert.equal(reeks.cijfers[1].waarde, '3'); assert.ok(reeks.cijfers.every((c) => c.icoon)); assert.match(reeks.nu, /Reeks 3/);
assert.equal(kermisHudModel({ ...basis, reeks: 1 }).cijfers.length, 1, 'een reeks van één is geen reeks');
assert.equal(kermisHudModel({ ...basis, links: 8 }).meter.staat, 'laag', 'de laatste seconden'); assert.equal(kermisHudModel({ ...basis, links: 400 }).meter.pct, 100, 'meter nooit boven 100');
const intro = kermisHudModel({ ...basis, fase: 'intro', links: 75 });
assert.equal(intro.stappen[0].stand, 'nu'); assert.match(intro.nu, /bel/); assert.equal(intro.meter.pct, 100);
const uit = kermisHudModel({ ...basis, fase: 'outro', links: 0 });
assert.equal(uit.stappen[2].stand, 'nu'); assert.equal(uit.nu, 'Afstappen!'); assert.equal(uit.meter.pct, 0); assert.equal(watNu({ fase: 'ride', reeks: 0 }).startsWith('Bots'), true);
assert.equal(botsPop('flank', 6, 1).tekst, 'In de flank! +6'); assert.equal(botsPop('kont', 4, 3).tekst, 'Van achteren! +4 · reeks 3'); assert.equal(botsPop('kop', 1, 1).geluid, null); assert.equal(botsPop('flank', 6, 1).geluid, 'ui_verzameld');
// de reekstijd staat gelijk aan de baan
const baan = fs.readFileSync(new URL('../game/js/kermis.js', import.meta.url), 'utf8');
assert.ok(new RegExp(`g\\.t - g\\.comboT < ${REEKS_TIJD}`).test(baan), 'REEKS_TIJD komt overeen met kermis.js');
assert.ok(/simHudTik\(0, kermisHudModel/.test(baan) && /simHudPop\(pp\.tekst, pp\.geluid\)/.test(baan) && /zetSimKolom\(built\.kolom/.test(baan), 'de kermis roept de strook, de pop en de lichtkolom aan');
const html = simHudHtml(reeks);
assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(html)); assert.match(html, /role="progressbar"/); assert.equal((html.match(/<li data-stand/g) || []).length, 3); assert.match(html, /sh-cijfer--primair/);
console.log('kermishud_test ok');
