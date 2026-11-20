// Pure test van de taxi-HUD (#985): scripts/taxihud_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { taxiHudModel, watNu, STAPPEN, UITLEG, STOP, NABIJ, COMFORT_LAAG, ritPop } from '../game/js/taxistatus.js';
import { simHudHtml } from '../game/js/simhud.js';

assert.equal(taxiHudModel(null), null);
const basis = { fase: 'ophalen', rit: 3, klant: 'Drie studenten na het stappen', naar: 'de Poelestraat', afstand: 420, snelheid: 8, limiet: null, comfort: 100, tijd: null, instap: false, inTaxi: true, uitleg: true };
const op = taxiHudModel(basis);
assert.equal(op.stappen.length, STAPPEN.length); assert.equal(op.stappen.filter((s) => s.stand === 'nu').length, 1); assert.equal(op.stappen[0].stand, 'nu');
assert.equal(op.meter, null, 'geen comfortmeter voor de klant is ingestapt'); assert.equal(op.uitleg.length, UITLEG.length); assert.equal(op.plek, 'Drie studenten na het stappen');
assert.deepEqual(op.cijfers.map((c) => c.label), ['Afstand', 'Rit']); assert.equal(op.cijfers[0].waarde, '420 m'); assert.equal(op.cijfers[1].waarde, '3');
assert.ok(op.cijfers.every((c) => c.icoon) && op.cijfers.filter((c) => c.primair).length === 1 && op.cijfers[0].primair, 'elk getal een pictogram, de afstand is primair');
assert.match(op.nu, /Rij naar de Poelestraat \(gele kolom\)/);
assert.match(watNu({ ...basis, afstand: NABIJ - 5, snelheid: STOP + 3 }), /Stop naast de klant/); assert.match(watNu({ ...basis, afstand: 3, snelheid: 0 }), /Blijf stilstaan/); assert.equal(watNu({ ...basis, instap: true }), 'De klant stapt in');
assert.equal(taxiHudModel({ ...basis, afstand: 2400 }).cijfers[0].waarde, '2,4 km'); assert.equal(taxiHudModel({ ...basis, afstand: null }).cijfers[0].waarde, '-');
const rit = taxiHudModel({ ...basis, fase: 'meerijden', naar: 'het Forum', afstand: 900, comfort: 74, limiet: 22, snelheid: 12, tijd: 61.2, uitleg: true });
assert.equal(rit.stappen[0].stand, 'klaar'); assert.equal(rit.stappen[1].stand, 'nu'); assert.equal(rit.uitleg.length, 0, 'uitleg alleen bij het ophalen');
assert.equal(rit.meter.naam, 'Comfort van je klant'); assert.equal(rit.meter.pct, 74); assert.equal(rit.meter.staat, ''); assert.equal(rit.cijfers[2].waarde, '62 s'); assert.match(rit.nu, /Naar het Forum/);
assert.ok(rit.cijfers.every((c) => c.icoon));
assert.match(watNu({ ...basis, fase: 'meerijden', comfort: 80, limiet: 22, snelheid: 30 }), /Rustig aan/); assert.equal(taxiHudModel({ ...basis, fase: 'meerijden', afstand: 10 }).stappen[2].stand, 'nu');
assert.match(watNu({ ...basis, fase: 'meerijden', afstand: 5, snelheid: 0 }), /staat goed/); assert.match(watNu({ ...basis, fase: 'meerijden', afstand: 5, snelheid: 4 }), /Stop bij de bestemming/);
const boos = taxiHudModel({ ...basis, fase: 'meerijden', comfort: COMFORT_LAAG - 10 });
assert.equal(boos.meter.staat, 'laag'); assert.equal(boos.meter.label, 'Klant is boos'); assert.ok(boos.slecht); assert.match(boos.nu, /boos/);
assert.equal(taxiHudModel({ ...basis, fase: 'meerijden', comfort: 400 }).meter.pct, 100, 'meter nooit boven 100'); assert.equal(taxiHudModel({ ...basis, fase: 'meerijden', comfort: -5 }).meter.pct, 0);
assert.equal(ritPop(12.5).tekst, 'Fooi €12,50'); assert.equal(ritPop(12.5).geluid, 'ui_verzameld'); assert.equal(ritPop(0).geluid, null);
// de drempels staan gelijk aan de baan
const baan = fs.readFileSync(new URL('../game/js/sidejob_taxi.js', import.meta.url), 'utf8');
assert.ok(new RegExp(`const STOP_SPEED = ${STOP};`).test(baan), 'STOP komt overeen met STOP_SPEED in de baan'); assert.ok(/d\.comfort >= 50 \? rand\(2, 6\)/.test(baan) && COMFORT_LAAG === 50, 'COMFORT_LAAG is de drempel voor fooi');
assert.ok(/simHudTik\(0, taxiHudModel/.test(baan) && /simHudPop\(pp\.tekst, pp\.geluid\)/.test(baan) && /c\.owner/.test(baan), 'de baan roept de strook, de pop en de eigen-dienst-controle aan');
const html = simHudHtml(rit);
assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(html)); assert.match(html, /role="progressbar"/); assert.equal((html.match(/<li data-stand/g) || []).length, 3); assert.match(html, /sh-cijfer--primair/);
console.log('taxihud_test ok');
