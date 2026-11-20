// Pure test van de krantenwijk-HUD (#985): scripts/krantenhud_test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { krantHudModel, watNu, worpPop, STAPPEN, UITLEG, SNEL } from '../game/js/krantenstatus.js';
import { simHudHtml } from '../game/js/simhud.js';
import { WORP_BEREIK, WORP_LOON } from '../game/js/krantenrules.js';

const basis = { fase: 'bezorgen', wijk: 'Helpman', straat: 'Verlengde Hereweg', totaal: 6, gedaan: 2, stapel: 7, worpen: { bus: 1, mat: 1, gemist: 0 }, vijver: false, lui: false, afstand: 30, snelheid: 2, tijd: 71.2, uitleg: false };
assert.equal(krantHudModel(null), null); assert.equal(krantHudModel({ ...basis, totaal: 0 }), null);

const m = krantHudModel(basis);
assert.equal(m.stappen.length, STAPPEN.length); assert.equal(m.stappen.filter((s) => s.stand === 'nu').length, 1);
assert.equal(m.stappen[0].stand, 'klaar'); assert.equal(m.stappen[1].stand, 'nu'); assert.equal(m.stappen[2].stand, 'straks');
assert.equal(m.meter.label, '2 van 6'); assert.equal(Math.round(m.meter.pct), 33);
assert.deepEqual(m.cijfers.map((c) => c.label), ['Stapel kranten', 'Tijd over']); assert.equal(m.primair.waarde, '2/6'); assert.ok(m.cijfers.every((c) => c.icoon));
assert.equal(m.cijfers[0].waarde, '7'); assert.equal(m.cijfers[1].waarde, '72 s'); assert.equal(m.plek, 'Helpman'); assert.equal(m.uitleg.length, 0);
assert.match(m.nu, /gele kolom/);

const naar = krantHudModel({ ...basis, fase: 'naarwijk', gedaan: 0 });
assert.equal(naar.meter, null); assert.equal(naar.stappen[0].stand, 'nu'); assert.match(naar.nu, /Naar de Helpman/);
assert.equal(krantHudModel({ ...basis, fase: 'naarwijk', tijd: null }).cijfers.length, 1, 'zonder klok geen tijdcijfer');

// de zin onderin volgt de afstand en de snelheid van de speler
assert.match(watNu({ ...basis, afstand: WORP_BEREIK }), /Nu E/);
assert.match(watNu({ ...basis, afstand: WORP_BEREIK + 1 }), /gele kolom/);
assert.match(watNu({ ...basis, afstand: 5, snelheid: SNEL + 1 }), /Rustig aan/);
assert.match(watNu({ ...basis, stapel: 0 }), /stapel is op/); assert.ok(krantHudModel({ ...basis, stapel: 0 }).slecht);
assert.match(watNu({ ...basis, vijver: true, afstand: 40 }), /container/); assert.doesNotMatch(watNu({ ...basis, vijver: true, lui: true, afstand: 40 }), /container/);
assert.equal(krantHudModel({ ...basis, fase: 'klaar', gedaan: 6, stapel: 0 }).slecht, false, 'een lege stapel na de laatste brievenbus is geen probleem');

assert.equal(krantHudModel({ ...basis, uitleg: true }).uitleg.length, UITLEG.length);
assert.ok(worpPop('bus').tekst.includes('4,50') && worpPop('bus').geluid === 'ui_verzameld' && WORP_LOON.bus === 4.5);
assert.ok(worpPop('mat').tekst.includes('2,70')); assert.equal(worpPop('gemist').geluid, null);

const html = simHudHtml(m);
assert.equal((html.match(/<li data-stand/g) || []).length, 3); assert.match(html, /role="progressbar"/);
assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(html), 'geen eigen kleuren in de markup');

// de wereld en de bedrading: lichtkolom zonder diepteschrijven, vlag op de brievenbus, strook alleen voor de eigen dienst
const bron = readFileSync(new URL('../game/js/sidejob_krantenwijk.js', import.meta.url), 'utf8');
assert.match(readFileSync(new URL('../game/js/simkolom3d.js', import.meta.url), 'utf8'), /depthWrite: false/); assert.match(bron, /zetSimKolom\(/); assert.match(bron, /userData\.vlag/); assert.match(bron, /if \(c\.owner \|\|/); assert.match(bron, /simHudTik\(0, null\);\r?\n  \},/);
console.log('krantenhud_test ok');
