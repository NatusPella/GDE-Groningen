// Pure test van de pitch-&-putt-HUD (#985): scripts/pitchhud_test.mjs
import assert from 'node:assert/strict';
import { pitchHudModel, watNu, stapVan, STAPPEN, UITLEG, baanPop } from '../game/js/pitchstatus.js';
import { simHudHtml } from '../game/js/simhud.js';

assert.equal(pitchHudModel(null), null);
assert.equal(stapVan('aim', false), 'richten'); assert.equal(stapVan('aim', true), 'slaan'); assert.equal(stapVan('ball', false), 'slaan'); assert.equal(stapVan('landed', false), 'uitkomst'); assert.equal(stapVan('holeDone', false), 'uitkomst');
const basis = { fase: 'aim', laden: false, putten: false, baan: 3, banen: 6, par: 3, slag: 1, vlag: 42.4, club: 'Wedge', zand: false, lading: 0, doel: 0.55, totaal: '0', flash: '', slecht: false, helling: '', uitleg: true };
const aim = pitchHudModel(basis);
assert.equal(aim.stappen.length, STAPPEN.length); assert.equal(aim.stappen.filter((s) => s.stand === 'nu').length, 1); assert.equal(aim.stappen[0].stand, 'nu');
assert.equal(aim.titel, 'Pitch & putt'); assert.ok(aim.meter && aim.meter.label === 'Doel 55%' && aim.meter.pct === 0);
assert.deepEqual(aim.cijfers.map((c) => c.label), ['Vlag', 'Slag', 'Par']); assert.equal(aim.cijfers[0].waarde, '42 m'); assert.equal(aim.plek, 'Baan 3/6 · Wedge');
assert.ok(aim.cijfers.every((c) => c.icoon) && aim.cijfers.filter((c) => c.primair).length === 1, 'elk getal een pictogram, één primaire waarde');

assert.equal(aim.uitleg.length, UITLEG.length); assert.match(aim.nu, /kolom/);
assert.equal(pitchHudModel({ ...basis, vlag: 3.46 }).cijfers[0].waarde, '3,5 m', 'dichtbij met een decimaal');
const laden = pitchHudModel({ ...basis, laden: true, lading: 0.3 });
assert.equal(laden.stappen[1].stand, 'nu'); assert.equal(laden.meter.pct, 30); assert.match(laden.nu, /55%/); assert.equal(laden.meter.staat, '');
const hard = pitchHudModel({ ...basis, laden: true, lading: 0.8 });
assert.equal(hard.meter.staat, 'laag'); assert.match(hard.nu, /Te hard/);
assert.equal(pitchHudModel({ ...basis, lading: 5 }).meter.pct, 100);
const put = pitchHudModel({ ...basis, putten: true, club: 'Putter', helling: 'Green valt naar links 1,2%' });
assert.equal(put.titel, 'Putten'); assert.match(put.nu, /Green valt naar links/); assert.match(watNu({ fase: 'aim', putten: true }), /vlag/);
assert.match(pitchHudModel({ ...basis, zand: true }).plek, /zand/); assert.match(watNu({ fase: 'aim', zand: true }), /zand/);
const rol = pitchHudModel({ ...basis, fase: 'ball' });
assert.equal(rol.meter, null); assert.equal(rol.uitleg.length, 0); assert.match(rol.nu, /rolt/); assert.equal(rol.stappen[1].stand, 'nu');
const uit = pitchHudModel({ ...basis, fase: 'landed', flash: 'Op de green, nog 4,2 m', slecht: true });
assert.equal(uit.nu, 'Op de green, nog 4,2 m'); assert.ok(uit.slecht); assert.equal(uit.stappen[2].stand, 'nu'); assert.match(watNu({ fase: 'wacht' }), /wachten/);
assert.equal(baanPop('Birdie', 2, 3).geluid, 'ui_loopbaan'); assert.equal(baanPop('Par', 3, 3).geluid, 'ui_verzameld'); assert.equal(baanPop('Bogey', 4, 3).geluid, null); assert.match(baanPop('Hole in one', 1, 3).tekst, /1 slag$/);
const html = simHudHtml(laden);
assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(html)); assert.match(html, /role="progressbar"/); assert.equal((html.match(/<li data-stand/g) || []).length, 3);
console.log('pitchhud_test ok');
