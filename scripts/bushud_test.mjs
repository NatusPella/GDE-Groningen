// Pure test van de bus-HUD (#985): scripts/bushud_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { busHudModel, watNu, schemaTekst, STAPPEN, UITLEG, EARLY_OK, LATE_OK, NABIJ, haltePop } from '../game/js/busstatus.js';
import { simHudHtml } from '../game/js/simhud.js';

assert.equal(busHudModel(null), null);
assert.equal(schemaTekst(3), 'Op tijd'); assert.equal(schemaTekst(-5), 'Op tijd'); assert.equal(schemaTekst(LATE_OK + 20), `${LATE_OK + 20} s te laat`); assert.equal(schemaTekst(-(EARLY_OK + 8)), `${EARLY_OK + 8} s vroeg`);
const basis = { fase: 'rijden', halte: 'Oosterpoort', gedaan: 0, totaal: 8, afwijking: 0, comfort: 100, afstand: 400, snelheid: 8, wacht: null, deuren: null, uitleg: true };
const rij = busHudModel(basis);
assert.equal(rij.stappen.length, STAPPEN.length); assert.equal(rij.stappen.filter((s) => s.stand === 'nu').length, 1); assert.equal(rij.stappen[0].stand, 'nu');
assert.equal(rij.meter.naam, 'Haltes gehaald'); assert.equal(rij.meter.pct, 0); assert.equal(rij.meter.label, '0 van 8'); assert.equal(rij.plek, 'Oosterpoort');
assert.deepEqual(rij.cijfers.map((c) => c.label), ['Schema', 'Comfort']); assert.equal(rij.cijfers[0].waarde, 'Op tijd'); assert.equal(rij.cijfers[1].waarde, '100%');
assert.ok(rij.cijfers.every((c) => c.icoon) && rij.cijfers.filter((c) => c.primair).length === 1 && rij.cijfers[0].primair, 'elk getal een pictogram, het schema is primair');
assert.equal(rij.uitleg.length, UITLEG.length); assert.match(rij.nu, /Rij naar Oosterpoort \(gele kolom\)/);
assert.equal(busHudModel({ ...basis, gedaan: 3, uitleg: true }).uitleg.length, 0, 'uitleg alleen voor de eerste halte'); assert.equal(busHudModel({ ...basis, gedaan: 4 }).meter.pct, 50);
assert.match(watNu({ ...basis, afstand: NABIJ - 10, snelheid: 6 }), /Rem af/); assert.match(watNu({ ...basis, afstand: 4, snelheid: 0.2 }), /Sta stil/);
const laat = busHudModel({ ...basis, afwijking: 41 });
assert.ok(laat.slecht); assert.match(laat.nu, /41 s te laat/); assert.equal(laat.cijfers[0].waarde, '41 s te laat');
const klagen = busHudModel({ ...basis, comfort: 40 }); assert.ok(klagen.slecht); assert.match(klagen.nu, /klagen/);
const halte = busHudModel({ ...basis, fase: 'halte', deuren: 1.4 });
assert.equal(halte.stappen[1].stand, 'nu'); assert.equal(halte.stappen[0].stand, 'klaar'); assert.match(halte.nu, /Deuren open: nog 2 s/);
const wacht = busHudModel({ ...basis, fase: 'vertrek', wacht: 12.2, afwijking: -20 });
assert.equal(wacht.stappen[2].stand, 'nu'); assert.match(wacht.nu, /wacht nog 13 s/); assert.equal(wacht.cijfers[0].waarde, '20 s vroeg'); assert.ok(!wacht.slecht);
assert.match(watNu({ ...basis, fase: 'vertrek', wacht: null }), /rijden maar/);
assert.equal(haltePop('Forum', 3).geluid, 'ui_verzameld'); assert.match(haltePop('Forum', 3).tekst, /op tijd/); assert.equal(haltePop('Forum', 25).geluid, null); assert.match(haltePop('Forum', 25).tekst, /25 s te laat/);
// de drempels staan gelijk aan de baan
const baan = fs.readFileSync(new URL('../game/js/sidejob_bus.js', import.meta.url), 'utf8');
assert.ok(new RegExp(`export const EARLY_OK = ${EARLY_OK};`).test(baan) && new RegExp(`export const LATE_OK = ${LATE_OK};`).test(baan), 'EARLY_OK en LATE_OK komen overeen met de baan');
assert.ok(/simHudTik\(0, busHudModel/.test(baan) && /simHudPop\(pp\.tekst, pp\.geluid\)/.test(baan) && /c\.owner/.test(baan), 'de baan roept de strook, de pop en de eigen-dienst-controle aan');
const html = simHudHtml(halte);
assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(html)); assert.match(html, /role="progressbar"/); assert.equal((html.match(/<li data-stand/g) || []).length, 3); assert.match(html, /sh-primair__badge/);
console.log('bushud_test ok');
