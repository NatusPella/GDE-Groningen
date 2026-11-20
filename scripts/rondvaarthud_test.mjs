// Pure test van de rondvaart-HUD (#985): scripts/rondvaarthud_test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rondvaartHudModel, watNu, verhaalPop, gemistPop, tochtPop, STAPPEN, UITLEG, SLOW } from '../game/js/rondvaartstatus.js';
import { simHudHtml } from '../game/js/simhud.js';

const bron = readFileSync(new URL('../game/js/sidejob_rondvaart.js', import.meta.url), 'utf8');
assert.equal(SLOW, 3.6); assert.match(bron, /const SLOW = 3\.6;/, 'dezelfde drempel als de baan zelf');

const basis = { fase: 'varen', steiger: 'Steiger Groninger Museum', naar: 'Steiger Oosterhaven', verhalen: 1, verhalenTotaal: 3, tevreden: 92, snelheid: 2.4, tijd: 95.3, doelNaam: 'Herebrug', doelAfstand: 140.6, bijBezienswaardigheid: false, praat: 0, instap: 0, uitleg: false };
assert.equal(rondvaartHudModel(null), null); assert.equal(rondvaartHudModel({}), null);

const m = rondvaartHudModel(basis);
assert.equal(m.stappen.length, STAPPEN.length); assert.deepEqual(m.stappen.map((s) => s.stand), ['klaar', 'nu', 'straks']);
assert.equal(m.meter.label, '1 van 3 verhalen'); assert.equal(Math.round(m.meter.pct), 33);
assert.deepEqual(m.cijfers.map((c) => c.label), ['Verhalen', 'Tevreden', 'Tempo', 'Tijd']);
assert.equal(m.cijfers[0].waarde, '1/3'); assert.equal(m.cijfers[1].waarde, '92%'); assert.equal(m.cijfers[2].waarde, '9 km/u'); assert.equal(m.cijfers[3].waarde, '96 s');
assert.match(m.nu, /Vaar naar Herebrug \(141 m\)/); assert.equal(m.slecht, false); assert.equal(m.plek, 'Steiger Oosterhaven');

// bij een bezienswaardigheid: te snel is een waarschuwing, rustig is vertellen met een verhaalbalk
const snel = rondvaartHudModel({ ...basis, bijBezienswaardigheid: true, snelheid: SLOW + 0.5 });
assert.match(snel.nu, /Gas eraf bij Herebrug/); assert.ok(snel.slecht);
const praat = rondvaartHudModel({ ...basis, bijBezienswaardigheid: true, snelheid: 1, praat: 0.4 });
assert.match(praat.nu, /Je vertelt over Herebrug/); assert.equal(praat.meter.pct, 40); assert.equal(praat.meter.label, 'verhaal 40%'); assert.equal(praat.slecht, false);

const instap = rondvaartHudModel({ ...basis, fase: 'instappen', verhalen: 0, instap: 0.5 });
assert.equal(instap.stappen[0].stand, 'nu'); assert.equal(instap.meter.pct, 50); assert.match(instap.nu, /stil bij Steiger Groninger Museum/); assert.equal(instap.plek, 'Steiger Groninger Museum');
const aan = rondvaartHudModel({ ...basis, fase: 'aanleggen', verhalen: 3 });
assert.equal(aan.meter, null); assert.deepEqual(aan.stappen.map((s) => s.stand), ['klaar', 'klaar', 'nu']); assert.match(aan.nu, /leg stil bij de steiger/);
assert.ok(rondvaartHudModel({ ...basis, tevreden: 40 }).slecht, 'boze toeristen zijn een waarschuwing');
assert.equal(rondvaartHudModel({ ...basis, tijd: null }).cijfers.length, 3, 'zonder klok geen tijdcijfer');
assert.equal(rondvaartHudModel({ ...basis, verhalenTotaal: 0, verhalen: 5 }).cijfers[0].waarde, '0/0');
assert.equal(rondvaartHudModel({ ...basis, uitleg: true }).uitleg.length, UITLEG.length);
assert.doesNotMatch(watNu({ ...basis, bijBezienswaardigheid: false }), /Gas eraf/);

assert.equal(verhaalPop('Herebrug').tekst, 'Verhaal verteld: Herebrug'); assert.equal(gemistPop('Herebrug').geluid, null);
assert.equal(tochtPop(true, 3, 3).tekst, 'Applaus aan boord!'); assert.equal(tochtPop(false, 2, 3).tekst, 'Tocht klaar · 2 van 3 verhalen');

const html = simHudHtml(m);
assert.equal((html.match(/<li data-stand/g) || []).length, 3); assert.match(html, /role="progressbar"/);
assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(html), 'geen eigen kleuren in de markup');

// bedrading: de strook alleen voor de eigen dienst, de kolom op het waterniveau, opruimen bij het einde
assert.match(bron, /zetRondvaartStrook\(c, onBoat, speed\)/); assert.match(bron, /if \(c\.owner \|\|/); assert.match(bron, /maakSimKolom\('rondvaartkolom'\)/); assert.match(bron, /WATER_Y/); assert.match(bron, /simHudTik\(0, null\)/);
console.log('rondvaarthud_test ok');
