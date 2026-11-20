// Pure test van de bezorger-HUD en de gedeelde lichtkolom (#985): scripts/bezorghud_test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bezorgHudModel, watNu, pickupPop, afleverPop, STAPPEN, UITLEG, KOUD, WARM } from '../game/js/bezorgstatus.js';
import { simHudHtml } from '../game/js/simhud.js';

const bron = (f) => readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const basis = { fase: 'deliver', zaak: 'Pizzeria Mamma Grunn', dish: 'pizza shoarma', n: 2, straat: 'Hereweg', nr: 41, wie: 'Oma Geertje van driehoog', warmte: 82, afstand: 312.4, tijd: 48.2, bestelling: 3, regen: false, wind: { bft: 5, along: -0.8 }, uitleg: false };
assert.equal(bezorgHudModel(null), null); assert.equal(bezorgHudModel({}), null);

const m = bezorgHudModel(basis);
assert.equal(m.stappen.length, STAPPEN.length); assert.equal(m.stappen.filter((s) => s.stand === 'nu').length, 1);
assert.deepEqual(m.stappen.map((s) => s.stand), ['klaar', 'nu', 'straks']);
assert.equal(m.meter.pct, 82); assert.equal(m.meter.label, '82% warm'); assert.equal(m.meter.staat, '');
assert.deepEqual(m.cijfers.map((c) => c.label), ['Afstand naar de klant', 'Tijd over', 'Tegenwind']); assert.ok(m.cijfers.every((c) => c.icoon), 'elk getal heeft een pictogram');
assert.equal(m.primair.waarde, '82%'); assert.equal(m.primair.naam, 'warm');
assert.equal(m.cijfers[0].waarde, '312 m'); assert.equal(m.cijfers[1].waarde, '49 s'); assert.equal(m.cijfers[2].waarde, '5'); assert.equal(m.cijfers[2].staat, 'let-op');
assert.equal(m.plek, 'Hereweg 41'); assert.match(m.nu, /Bezorg bij Hereweg 41: Oma Geertje/); assert.equal(m.slecht, false);

const koud = bezorgHudModel({ ...basis, warmte: KOUD - 1 });
assert.equal(koud.meter.staat, 'laag'); assert.ok(koud.slecht); assert.match(koud.nu, /koud/);
assert.equal(bezorgHudModel({ ...basis, warmte: -5 }).meter.pct, 0); assert.equal(bezorgHudModel({ ...basis, warmte: 140 }).meter.pct, 100);

const ophalen = bezorgHudModel({ ...basis, fase: 'pickup', warmte: 100 });
assert.equal(ophalen.meter, null); assert.equal(ophalen.stappen[0].stand, 'nu'); assert.equal(ophalen.plek, 'Pizzeria Mamma Grunn');
assert.match(ophalen.nu, /Haal 2x pizza shoarma op bij Pizzeria Mamma Grunn/);
assert.equal(bezorgHudModel({ ...basis, tijd: null }).cijfers.length, 2, 'zonder klok geen tijdcijfer');
assert.equal(bezorgHudModel({ ...basis, wind: null }).cijfers.length, 2, 'geen tegenwind: geen windcijfer'); assert.equal(bezorgHudModel({ ...basis, wind: { bft: 4, along: 0.9 } }).cijfers.length, 2, 'wind mee is geen nieuws');
assert.match(watNu({ ...basis, regen: true }), /regen/); assert.doesNotMatch(watNu(basis), /regen/);
assert.equal(bezorgHudModel({ ...basis, uitleg: true }).uitleg.length, UITLEG.length);

assert.equal(pickupPop().tekst, 'Opgehaald');
assert.equal(afleverPop(WARM + 1, 8.4).tekst, 'Warm bezorgd · fooi €8'); assert.equal(afleverPop(WARM + 1, 8.4).geluid, 'ui_verzameld');
assert.equal(afleverPop(50, 0).tekst, 'Bezorgd'); assert.equal(afleverPop(50, 0).geluid, 'ui_loopbaan');

const html = simHudHtml(m);
assert.equal((html.match(/<li data-stand/g) || []).length, 3); assert.match(html, /role="progressbar"/); assert.match(html, /class="sh-primair"/); assert.match(html, /sh-groot[^>]*>82%/); assert.equal((html.match(/class="sh-cijfers"/g) || []).length, 1);
assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(html), 'geen eigen kleuren in de markup');

// bedrading: de strook alleen voor de eigen dienst, de kolom is gedeeld met de krantenwijk en schrijft geen diepte
const b = bron('sidejob_bezorger.js');
assert.match(b, /zetBezorgStrook\(c, p\)/); assert.match(b, /if \(c\.owner \|\|/); assert.match(b, /simHudTik\(0, null\)/); assert.match(b, /maakSimKolom\('bezorgkolom'\)/);
assert.match(bron('simkolom3d.js'), /depthWrite: false/); assert.match(bron('sidejob_krantenwijk.js'), /maakSimKolom\('krantkolom'\)/);
console.log('bezorghud_test ok');
