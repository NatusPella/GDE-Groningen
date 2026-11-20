// Pure test van de hengel-HUD (#985): scripts/hengelhud_test.mjs
import assert from 'node:assert/strict';
import { hengelHudModel, stapVan, STAPPEN, UITLEG } from '../game/js/hengelstatus.js';
import { simHudHtml } from '../game/js/simhud.js';

assert.equal(stapVan('idle', false), 'uit'); assert.equal(stapVan('cast', false), 'uit'); assert.equal(stapVan('scare', false), 'uit');
assert.equal(stapVan('wait', false), 'wacht'); assert.equal(stapVan('bite', false), 'beet'); assert.equal(stapVan('idle', true), 'haal');
assert.equal(hengelHudModel(null), null);

const basis = { mode: 'vrij', fase: 'idle', haal: false, bijt: 0, beetTotaal: 0, vangsten: 2, soorten: 2, kg: 1.25, kas: 3.4, plek: 'Reitdiep', tuig: { hengel: 'Basishengel', aas: 'geen aas' }, flash: null, uitleg: false };
const idle = hengelHudModel(basis);
assert.equal(idle.stappen.length, STAPPEN.length);
assert.equal(idle.stappen.filter((s) => s.stand === 'nu').length, 1, 'precies één stap heeft nadruk');
assert.equal(idle.stappen[0].stand, 'nu'); assert.equal(idle.meter, null);
assert.match(idle.nu, /{SPATIE}/); assert.equal(idle.uitleg.length, 0);
assert.deepEqual(idle.cijfers.map((c) => c.label), ['Vangsten', 'Visboer'], 'minder getallen: twee secundaire waarden');
assert.equal(idle.primair.waarde, '1,3 kg'); assert.ok(idle.primair.icoon, 'de primaire waarde heeft een pictogram'); assert.equal(idle.cijfers[1].waarde, '€3');
assert.ok(idle.cijfers.every((c) => c.icoon), 'elk getal heeft een pictogram');

const wacht = hengelHudModel({ ...basis, fase: 'wait' });
assert.equal(wacht.stappen[0].stand, 'klaar'); assert.equal(wacht.stappen[1].stand, 'nu'); assert.match(wacht.nu, /Nog niet trekken/);

const beet = hengelHudModel({ ...basis, fase: 'bite', bijt: 0.3, beetTotaal: 1 });
assert.equal(beet.stappen[2].stand, 'nu'); assert.ok(beet.meter && beet.meter.pct === 30 && beet.meter.staat === 'laag', 'de beetmeter loopt leeg en wordt laag');
assert.match(beet.nu, /Nu {SPATIE}/);
assert.equal(hengelHudModel({ ...basis, fase: 'bite', bijt: 0.9, beetTotaal: 1 }).meter.staat, '');
assert.equal(hengelHudModel({ ...basis, fase: 'bite', bijt: -1, beetTotaal: 1 }).meter.pct, 0, 'nooit onder nul');

const schrik = hengelHudModel({ ...basis, fase: 'scare', flash: { text: 'Te vroeg! De vis schrikt', bad: true } });
assert.ok(schrik.slecht); assert.match(schrik.nu, /gevlucht/);
const haal = hengelHudModel({ ...basis, haal: true, flash: { text: 'Baars van 0,60 kg!', bad: false } });
assert.equal(haal.stappen[3].stand, 'nu'); assert.match(haal.nu, /Baars van 0,60 kg!/);

const eerste = hengelHudModel({ ...basis, uitleg: true });
assert.equal(eerste.uitleg.length, UITLEG.length); assert.ok(eerste.uitleg.every((u) => u.icoon && u.tekst));
const wed = hengelHudModel({ ...basis, mode: 'wedstrijd', left: 61.2, vangsten: 3 });
assert.equal(wed.titel, 'Hengelwedstrijd'); assert.equal(wed.cijfers[0].waarde, '62 s'); assert.equal(wed.cijfers.length, 2); assert.equal(wed.primair.naam, 'Gewicht');
assert.equal(hengelHudModel({ ...basis, mode: 'wedstrijd', left: 9 }).cijfers[0].staat, 'let-op', 'de laatste seconden zijn geel');

// de markup: geen eigen kleuren, elke stap een woord en een icoon, de meter is een voortgangsbalk
const html = simHudHtml(beet);
assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(html), 'geen eigen kleuren in de markup');
assert.equal((html.match(/<li data-stand/g) || []).length, 4);
assert.match(html, /role="progressbar"/); assert.match(html, /aria-current="step"/); assert.match(html, /aria-live="polite"/);
assert.equal(simHudHtml(null), '');
assert.ok(!/<script/i.test(simHudHtml({ ...beet, titel: '<script>x</script>' })), 'titel wordt ontsnapt');
console.log('hengelhud_test ok');
