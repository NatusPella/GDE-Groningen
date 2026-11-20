// Pure test van de reuzenrad-HUD (#985): scripts/reuzenradhud_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reuzenradHudModel, watNu, stapVan, STAPPEN, UITLEG, TOP_VANAF, topPop } from '../game/js/reuzenradstatus.js';
import { LAPS, AX, R, SEAT_DROP, seatPose, gondolaAngle, ridePlan, rideFraction, rideSecondsLeft, mayExit } from '../game/js/reuzenradrules.js';
import { simHudHtml } from '../game/js/simhud.js';

assert.equal(reuzenradHudModel(null), null);
const maxH = AX + R - SEAT_DROP;
const basis = { hoogte: 6, maxHoogte: maxH, stijgt: true, voortgang: 0.2, links: 83.4, ronde: 1, uitstap: false, mag: false, uitleg: true };
assert.equal(stapVan(basis), 'omhoog'); assert.equal(stapVan({ ...basis, stijgt: false }), 'omlaag'); assert.equal(stapVan({ ...basis, hoogte: maxH }), 'top'); assert.equal(stapVan({ ...basis, hoogte: TOP_VANAF * maxH }), 'top');
const omhoog = reuzenradHudModel(basis);
assert.equal(omhoog.stappen.length, STAPPEN.length); assert.equal(omhoog.stappen.filter((s) => s.stand === 'nu').length, 1); assert.equal(omhoog.stappen[0].stand, 'nu');
assert.equal(omhoog.meter.naam, 'Je ritje'); assert.equal(omhoog.meter.pct, 20); assert.equal(omhoog.meter.label, `Ronde 1 van ${LAPS}`);
assert.deepEqual(omhoog.cijfers.map((c) => c.label), ['Hoogte', 'Nog']); assert.equal(omhoog.cijfers[0].waarde, '6 m'); assert.equal(omhoog.cijfers[1].waarde, '1:24');
assert.ok(omhoog.cijfers.every((c) => c.icoon) && omhoog.cijfers.filter((c) => c.primair).length === 1 && omhoog.cijfers[0].primair, 'elk getal een pictogram, de hoogte is primair');
assert.equal(omhoog.uitleg.length, UITLEG.length); assert.match(omhoog.nu, /omhoog/); assert.ok(!omhoog.slecht);
assert.equal(reuzenradHudModel({ ...basis, uitleg: false }).uitleg.length, 0);
const top = reuzenradHudModel({ ...basis, hoogte: maxH });
assert.equal(top.stappen[1].stand, 'nu'); assert.match(top.nu, /Op de top/);
const omlaag = reuzenradHudModel({ ...basis, stijgt: false, hoogte: 5, voortgang: 0.9, ronde: 2, mag: true });
assert.equal(omlaag.stappen[2].stand, 'nu'); assert.match(omlaag.nu, /Je bent beneden: Backspace/); assert.equal(omlaag.meter.label, `Ronde 2 van ${LAPS}`); assert.match(watNu({ ...basis, stijgt: false }), /weer omlaag/);
assert.match(watNu({ ...basis, uitstap: true }), /zodra je beneden bent/); assert.match(watNu({ ...basis, uitstap: true, mag: true }), /stapt nu uit/);
assert.equal(reuzenradHudModel({ ...basis, voortgang: 7 }).meter.pct, 100, 'meter nooit boven 100'); assert.equal(reuzenradHudModel({ ...basis, ronde: 9 }).meter.label, `Ronde ${LAPS} van ${LAPS}`);
assert.equal(topPop(17.4, 1).tekst, 'Op de top: 17 m'); assert.equal(topPop(17, 1).geluid, 'ui_verzameld'); assert.equal(topPop(17, LAPS).geluid, 'ui_loopbaan');
// de hoogte en de stijgrichting volgen de regels van het rad
const plan = ridePlan(0, 3);
assert.ok(rideFraction(plan, plan.startRot) === 0 && rideSecondsLeft(plan, plan.startRot) > 0 && typeof mayExit(plan, plan.endRot) === 'boolean');
const hoog = seatPose(3, 0).h; assert.ok(hoog <= maxH + 1e-9 && hoog >= AX - R - SEAT_DROP - 1e-9, 'de zitting blijft binnen de hoogtes die het model aanneemt');
assert.ok(Number.isFinite(Math.cos(gondolaAngle(3, 0))));
const baan = fs.readFileSync(new URL('../game/js/reuzenrad.js', import.meta.url), 'utf8');
assert.ok(/simHudTik\(0, reuzenradHudModel/.test(baan) && /simHudPop\(pp\.tekst, pp\.geluid\)/.test(baan) && /zetSimKolom\(kolom/.test(baan), 'het rad roept de strook, de pop en de lichtkolom aan');
const html = simHudHtml(omlaag);
assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(html)); assert.match(html, /role="progressbar"/); assert.equal((html.match(/<li data-stand/g) || []).length, 3); assert.match(html, /sh-cijfer--primair/);
console.log('reuzenradhud_test ok');
