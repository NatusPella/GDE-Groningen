// Pure test van de discgolf-HUD (#985): scripts/discgolfhud_test.mjs
import assert from 'node:assert/strict';
import { discgolfHudModel, watNu, stapVan, STAPPEN, UITLEG, baanPop, ctpPop } from '../game/js/discgolfstatus.js';
import { simHudHtml } from '../game/js/simhud.js';

assert.equal(discgolfHudModel(null), null);
assert.equal(stapVan('aim', false), 'richten'); assert.equal(stapVan('aim', true), 'gooien'); assert.equal(stapVan('flight', false), 'gooien');
assert.equal(stapVan('landed', false), 'uitkomst'); assert.equal(stapVan('holeDone', false), 'uitkomst'); assert.equal(stapVan('wacht', false), 'uitkomst');
const basis = { modus: 'ronde', fase: 'aim', laden: false, baan: 2, banen: 9, par: 3, worp: 1, mand: 61.4, wind: 'wind 2 m/s ↗', schijf: 'Driver', release: 'Rechtshandig', hoek: 8.6, lading: 0, doel: 0.62, cirkel: false, totaal: '+1', flash: '', slecht: false, uitleg: true };
const aim = discgolfHudModel(basis);
assert.equal(aim.stappen.length, STAPPEN.length); assert.equal(aim.stappen.filter((s) => s.stand === 'nu').length, 1); assert.equal(aim.stappen[0].stand, 'nu');
assert.ok(aim.meter && aim.meter.pct === 0 && aim.meter.label === 'Doel 62%', 'de laadmeter noemt de kracht die de mand haalt');
assert.deepEqual(aim.cijfers.map((c) => c.label), ['Mand', 'Worp', 'Par', 'Wind']); assert.equal(aim.cijfers[0].waarde, '61 m'); assert.equal(aim.plek, 'Baan 2/9');
assert.ok(aim.cijfers.every((c) => c.icoon) && aim.cijfers.filter((c) => c.primair).length === 1, 'elk getal een pictogram, één primaire waarde');

assert.equal(aim.uitleg.length, UITLEG.length); assert.match(aim.nu, /kolom/); assert.match(aim.hulp, /hoek 9°/);
const laden = discgolfHudModel({ ...basis, laden: true, lading: 0.4 });
assert.equal(laden.stappen[1].stand, 'nu'); assert.equal(laden.meter.pct, 40); assert.match(laden.nu, /62%/);
assert.equal(discgolfHudModel({ ...basis, lading: 3 }).meter.pct, 100, 'meter nooit boven 100'); assert.equal(discgolfHudModel({ ...basis, doel: null }).meter.label, 'Kracht');
const vlucht = discgolfHudModel({ ...basis, fase: 'flight' });
assert.equal(vlucht.meter, null); assert.equal(vlucht.uitleg.length, 0); assert.match(vlucht.nu, /vliegt/); assert.equal(vlucht.stappen[0].stand, 'klaar');
const uit = discgolfHudModel({ ...basis, fase: 'landed', flash: 'Tegen de boom', slecht: true });
assert.equal(uit.nu, 'Tegen de boom'); assert.ok(uit.slecht); assert.equal(uit.stappen[2].stand, 'nu');
assert.match(discgolfHudModel({ ...basis, cirkel: true }).plek, /in de cirkel/); assert.match(watNu({ fase: 'aim', cirkel: true }), /cirkel/); assert.match(watNu({ fase: 'wacht' }), /wachten/);
const ctp = discgolfHudModel({ ...basis, modus: 'ctp', ctpWorp: 2, ctpTotaal: 3, afstanden: '4,2 m' });
assert.equal(ctp.titel, 'Dichtst bij de mand'); assert.deepEqual(ctp.cijfers.map((c) => c.label), ['Mand', 'Worp', 'Wind']); assert.equal(ctp.cijfers[1].waarde, '2/3');
assert.ok(ctp.cijfers.every((c) => c.icoon) && ctp.cijfers.filter((c) => c.primair).length === 1, 'elk getal een pictogram, één primaire waarde');

const kies = discgolfHudModel({ modus: 'kies', kiesNaam: 'Negen banen', kiesNote: 'Negen banen: een hele ronde', uitleg: true });
assert.equal(kies.stappen.length, 0); assert.match(kies.nu, /Negen banen/); assert.equal(kies.uitleg.length, UITLEG.length);
// wat opspringt
assert.equal(baanPop('Birdie', 2, 3).geluid, 'ui_loopbaan'); assert.equal(baanPop('Par', 3, 3).geluid, 'ui_verzameld'); assert.equal(baanPop('Bogey', 4, 3).geluid, null); assert.match(baanPop('Ace', 1, 3).tekst, /1 worp, ace!$/);
assert.match(ctpPop(4.25, 80).tekst, /4,3 m: 80 punten|4,2 m: 80 punten/); assert.match(ctpPop(0, 100).tekst, /In de mand/); assert.equal(ctpPop(null, 0).geluid, null);
const html = simHudHtml(aim);
assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(html)); assert.match(html, /role="progressbar"/); assert.equal((html.match(/<li data-stand/g) || []).length, 3);
console.log('discgolfhud_test ok');
