// Pure test van de kart-HUD (#985): scripts/karthud_test.mjs
import assert from 'node:assert/strict';
import { kartHudModel, watNu, STAPPEN, UITLEG, tijdTekst, rondePop, boostPop } from '../game/js/kartstatus.js';
import { KART } from '../game/js/kartrace.js';
import { simHudHtml } from '../game/js/simhud.js';

assert.equal(kartHudModel(null), null);
const grid = kartHudModel({ fase: 'grid', lichten: 2, ronde: 1, plek: 3, aantal: 4, tijd: 0, kmh: 0, beste: null, uitleg: true });
assert.equal(grid.stappen.length, STAPPEN.length); assert.equal(grid.stappen.filter((s) => s.stand === 'nu').length, 1);
assert.equal(grid.stappen[0].stand, 'nu'); assert.match(grid.nu, /2 van 3/); assert.equal(grid.uitleg.length, UITLEG.length); assert.equal(grid.meter, null);
assert.equal(grid.cijfers.length, 4, 'zonder beste ronde vier cijfers');
const race = kartHudModel({ fase: 'race', ronde: 2, plek: 1, aantal: 4, tijd: 61.234, kmh: 71.6, beste: 29.5, uitleg: true });
assert.equal(race.stappen[0].stand, 'klaar'); assert.equal(race.stappen[1].stand, 'nu'); assert.equal(race.uitleg.length, 0, 'uitleg alleen bij de start');
assert.equal(race.cijfers[2].waarde, '1:01,23'); assert.equal(race.cijfers[3].waarde, '72 km/u'); assert.equal(race.cijfers.length, 5);
const drift = kartHudModel({ fase: 'race', ronde: 1, plek: 2, drift: { t: KART.charge1 + 0.05 }, uitleg: false });
assert.ok(drift.meter && drift.meter.pct > 40 && drift.meter.pct < 100); assert.match(drift.nu, /Laat Spatie los/);
assert.equal(kartHudModel({ fase: 'race', ronde: 1, drift: { t: 99 } }).meter.pct, 100, 'meter nooit boven 100');
assert.match(watNu({ fase: 'race', gras: true }), /gras/); assert.ok(kartHudModel({ fase: 'race', gras: true }).slecht);
assert.match(watNu({ fase: 'finish', plek: 2 }), /2e/);
assert.equal(kartHudModel({ fase: 'outro', ronde: 3 }).stappen[2].stand, 'nu');
assert.equal(tijdTekst(NaN), '-:--.--'); assert.match(rondePop(1, 32.4).tekst, /Ronde 1: 0:32,40/); assert.equal(boostPop(2).tekst, 'Superboost!');
const html = simHudHtml(drift);
assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(html)); assert.match(html, /role="progressbar"/); assert.equal((html.match(/<li data-stand/g) || []).length, 3);
console.log('karthud_test ok');
