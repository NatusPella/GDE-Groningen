// Pure test van de padel-HUD (#985): scripts/padelhud_test.mjs
import assert from 'node:assert/strict';
import { padelHudModel, watNu, stapVan, STAPPEN, UITLEG, puntPop, SERVE_TIJD } from '../game/js/padelstatus.js';
import { SET_GAMES } from '../game/js/padelrules.js';
import { simHudHtml } from '../game/js/simhud.js';

assert.equal(padelHudModel(null), null);
assert.equal(stapVan('intro'), 'serve'); assert.equal(stapVan('serve'), 'serve'); assert.equal(stapVan('rally'), 'rally'); assert.equal(stapVan('point'), 'punt'); assert.equal(stapVan('outro'), 'punt');
const basis = { fase: 'serve', serveer: true, phaseT: 4.2, games: [1, 0], punten: ['15', '0'], rally: 0, beste: 0, winnaar: -1, capped: false, gp: false, inBereik: false, uitleg: true };
const serve = padelHudModel(basis);
assert.equal(serve.stappen.length, STAPPEN.length); assert.equal(serve.stappen.filter((s) => s.stand === 'nu').length, 1); assert.equal(serve.stappen[0].stand, 'nu');
assert.ok(serve.meter && serve.meter.pct === Math.round(4.2 / SERVE_TIJD * 1000) / 10 || Math.abs(serve.meter.pct - 70) < 0.01, 'de servemeter loopt leeg');
assert.equal(serve.meter.label, '5 s'); assert.match(serve.nu, /Spatie/); assert.equal(serve.uitleg.length, UITLEG.length);
assert.equal(serve.cijfers[0].waarde, '1-0'); assert.equal(serve.cijfers[1].waarde, '15-0'); assert.equal(serve.cijfers.length, 3, 'geen langste rally voor de eerste slag');
assert.equal(padelHudModel({ ...basis, phaseT: 1 }).meter.staat, 'laag');
assert.equal(padelHudModel({ ...basis, serveer: false }).meter, null, 'de meter is er alleen als jij serveert');
assert.match(watNu({ fase: 'serve', serveer: false }), /Zij serveren/);
const rally = padelHudModel({ ...basis, fase: 'rally', rally: 4, beste: 7, inBereik: true });
assert.equal(rally.stappen[1].stand, 'nu'); assert.equal(rally.stappen[0].stand, 'klaar'); assert.equal(rally.uitleg.length, 0); assert.match(rally.nu, /ring is groen/);
assert.equal(rally.cijfers.find((c) => c.label === 'Langste').waarde, '7');
assert.match(padelHudModel({ ...basis, fase: 'rally' }).nu, /Loop naar de bal/);
const verloren = padelHudModel({ ...basis, fase: 'point', winnaar: 1 });
assert.ok(verloren.slecht); assert.match(verloren.nu, /voor hen/); assert.equal(verloren.stappen[2].stand, 'nu');
assert.match(watNu({ fase: 'rally', gp: true }), /Gouden punt/); assert.equal(padelHudModel({ ...basis, capped: true }).plek, 'Beslissend punt');
assert.match(UITLEG[3].tekst, new RegExp(`${SET_GAMES} games`), 'de uitleg noemt het aantal games van de regels');
// wat opspringt: alleen punten van jullie
assert.equal(puntPop({ team: 1, punten: ['0', '15'] }), null);
assert.match(puntPop({ team: 0, rally: 2, punten: ['15', '0'] }).tekst, /Punt: 15-0/);
assert.match(puntPop({ team: 0, rally: 9, punten: ['15', '0'] }).tekst, /9 slagen/);
assert.match(puntPop({ team: 0, gameWon: true, punten: ['0', '0'] }).tekst, /Game voor jullie/); assert.match(puntPop({ team: 0, over: true, gameWon: true, punten: ['0', '0'] }).tekst, /Set voor jullie/);
const html = simHudHtml(serve);
assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(html)); assert.match(html, /role="progressbar"/); assert.equal((html.match(/<li data-stand/g) || []).length, 3);
console.log('padelhud_test ok');
