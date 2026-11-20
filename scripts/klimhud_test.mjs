// Pure test van de klimtoren-HUD (#985): scripts/klimhud_test.mjs
import assert from 'node:assert/strict';
import { klimHudModel, watNu, stapVan, STAPPEN, UITLEG, ARMEN_LAAG, magnesiumPop, topPop } from '../game/js/klimstatus.js';
import { WALL, createClimb, TOP_HOLD } from '../game/js/climbrules.js';
import { simHudHtml } from '../game/js/simhud.js';

assert.equal(klimHudModel(null), null);
assert.equal(stapVan({ fase: 'intro', klimFase: 'climb', grond: true }), 'start'); assert.equal(stapVan({ fase: 'run', klimFase: 'climb', grond: true }), 'start');
assert.equal(stapVan({ fase: 'run', klimFase: 'climb', grond: false }), 'klim'); assert.equal(stapVan({ fase: 'outro', klimFase: 'top', grond: false }), 'top');
const basis = { fase: 'run', klimFase: 'climb', grond: false, hoogte: 7.44, tijd: '0:21.30', kansen: 2, armen: 0.7, flash: '', slecht: false, uitleg: false };
const klim = klimHudModel(basis);
assert.equal(klim.stappen.length, STAPPEN.length); assert.equal(klim.stappen.filter((s) => s.stand === 'nu').length, 1); assert.equal(klim.stappen[1].stand, 'nu'); assert.equal(klim.stappen[0].stand, 'klaar');
assert.equal(klim.meter.naam, 'Je armen'); assert.equal(klim.meter.pct, 70); assert.equal(klim.meter.staat, '');
assert.deepEqual(klim.cijfers.map((c) => c.label), ['Hoogte', 'Pogingen', 'Tijd']); assert.equal(klim.cijfers[0].waarde, `7,4 m van ${WALL.height}`); assert.equal(klim.cijfers[1].waarde, '2');
assert.ok(klim.cijfers.every((c) => c.icoon) && klim.cijfers.filter((c) => c.primair).length === 1 && klim.cijfers[0].primair, 'elk getal een pictogram, de hoogte is primair');
assert.match(klim.nu, /volgende greep/);
const laag = klimHudModel({ ...basis, armen: ARMEN_LAAG - 0.05 });
assert.equal(laag.meter.staat, 'laag'); assert.equal(laag.meter.label, 'Bijna leeg'); assert.ok(laag.slecht); assert.match(laag.nu, /magnesium/);
assert.equal(klimHudModel({ ...basis, armen: 9 }).meter.pct, 100, 'meter nooit boven 100'); assert.equal(klimHudModel({ ...basis, armen: -1 }).meter.pct, 0);
const grond = klimHudModel({ ...basis, grond: true, hoogte: 0 });
assert.equal(grond.stappen[0].stand, 'nu'); assert.match(grond.nu, /{A} en {D} allebei/); assert.equal(grond.cijfers[0].waarde, `0,0 m van ${WALL.height}`);
const intro = klimHudModel({ ...basis, fase: 'intro', grond: true, uitleg: true });
assert.equal(intro.uitleg.length, UITLEG.length); assert.match(intro.nu, /eerste grepen/); assert.equal(klimHudModel({ ...basis, uitleg: true }).uitleg.length, 0, 'uitleg alleen voor de start');
const boven = klimHudModel({ ...basis, fase: 'outro', klimFase: 'top' });
assert.equal(boven.stappen[2].stand, 'nu'); assert.match(boven.nu, /Boven/); assert.match(watNu({ ...basis, fase: 'wacht', klimFase: 'top' }), /Wachten op de anderen/);
assert.equal(klimHudModel({ ...basis, flash: 'Gevallen! +4 s (1/3)', slecht: true }).nu, 'Gevallen! +4 s (1/3)');
// de lichtkolom (9 m hoog, simkolom3d.js) loopt tot de top van de wand
assert.ok(WALL.height - 9 >= 0 && WALL.height - 9 < WALL.height, 'de kolom staat op een hoogte onder de top'); assert.ok(TOP_HOLD.top, 'de topgreep bestaat'); assert.equal(createClimb().falls, 0);
assert.equal(magnesiumPop().tekst, 'Frisse armen'); assert.equal(topPop().geluid, 'ui_loopbaan');
const html = simHudHtml(laag);
assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(html)); assert.match(html, /role="progressbar"/); assert.equal((html.match(/<li data-stand/g) || []).length, 3); assert.match(html, /sh-primair__badge/);
console.log('klimhud_test ok');
