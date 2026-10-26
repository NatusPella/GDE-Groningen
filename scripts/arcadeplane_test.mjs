import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makePlane, stepPlane, PLANE, veldBaan, dichtstbijVeld, puntOpStrip, kiesBestemming, veldRoute, vluchtTussenVelden } from '../game/js/arcadeplane.js';

const flat = () => 0;
const dt = 1 / 60;
const p = makePlane(0, 0, 0, 0);
// gas, rennen, dan neus omhoog
let t = 0;
while (!(!p.onGround) && t < 60) { stepPlane(p, { throttle: 1, pitch: p.speed > PLANE.liftoff ? 1 : 0 }, dt, flat); t += dt; }
assert.ok(!p.onGround && p.x > 20, 'komt van de baan');
for (let i = 0; i < 600; i++) stepPlane(p, { throttle: 1, pitch: 0.6 }, dt, flat);
assert.ok(p.z > 50 && !p.crashed, 'klimt');

// bocht: rollen verandert de koers
const h0 = p.heading;
for (let i = 0; i < 180; i++) stepPlane(p, { throttle: 0.7, roll: 1 }, dt, flat);
assert.ok(Math.abs(p.heading - h0) > 0.3, 'bocht maakt koers');

// overtrek: gas dicht en neus op, snelheid zakt onder stall en hij zakt weg
const s = makePlane(0, 0, 300, 0); s.onGround = false; s.speed = 40;
for (let i = 0; i < 1500 && !s.crashed; i++) stepPlane(s, { throttle: 0, pitch: 1 }, dt, flat);
assert.ok(s.crashed || s.z < 300, 'overtrek zakt');

// zachte landing op de baan
const l = makePlane(0, 0, 40, 0); l.onGround = false; l.speed = 30; l.vz = -2;
for (let i = 0; i < 6000 && !l.onGround && !l.crashed; i++) stepPlane(l, { throttle: 0.3, pitch: -0.05 }, dt, flat);
assert.ok(l.onGround && !l.crashed, 'landt');

// naast de baan = crash
const c = makePlane(0, 0, 10, 0); c.onGround = false; c.speed = 30; c.vz = -2;
for (let i = 0; i < 600 && !c.crashed; i++) stepPlane(c, { throttle: 0.3, pitch: -0.3 }, dt, flat, () => false);
assert.ok(c.crashed, 'crasht naast de baan');
// duiken
const d = makePlane(0, 0, 100, 0); d.onGround = false; d.speed = 40; d.vz = -20;
for (let i = 0; i < 600 && !d.crashed && !d.onGround; i++) stepPlane(d, { throttle: 0.5, pitch: -1 }, dt, flat);
assert.ok(d.crashed, 'duikvlucht crasht');

// --- de velden en de etappe (#492): een tweede veld met een echte baan ------------------------
const hier = path.dirname(fileURLToPath(import.meta.url));
const plekken = JSON.parse(readFileSync(path.join(hier, '../game/vliegplekken.json'), 'utf8'));
assert.ok(Array.isArray(plekken.velden) && plekken.velden.length >= 2, 'het veldenbestand heeft een tweede veld');
const VELDEN = [{ id: 'eelde', naam: 'Eelde', x: plekken.eelde.x, y: plekken.eelde.y, thuis: true }, ...plekken.velden];

// een echte baan per veld: het midden ligt op de baan, ernaast niet
for (const veld of plekken.velden) {
  const baan = veldBaan(veld);
  assert.ok(baan, 'elk veld heeft een baan: ' + veld.naam);
  assert.ok(baan.contains(veld.x, veld.y), 'het midden van de baan telt: ' + veld.naam);
  assert.ok(!baan.contains(veld.x + 2000, veld.y + 2000), 'naast de baan telt niet: ' + veld.naam);
  assert.strictEqual(Math.round(baan.length), veld.lengte);
  assert.strictEqual(Math.round(baan.width), veld.breedte);
  const rand = baan.point(10, 10);
  assert.ok(baan.contains(rand.x, rand.y), 'de eigen punten liggen op de baan');
  const q = puntOpStrip(baan, veld.x, veld.y);
  assert.ok(Math.hypot(q.x - veld.x, q.y - veld.y) < 1, 'het midden blijft het midden');
}
assert.strictEqual(veldBaan({ x: NaN, y: 0 }), null, 'zonder plek geen baan');
assert.strictEqual(puntOpStrip(null, 0, 0), null, 'zonder baan geen punt');

// de etappe vanaf Eelde: naar het dichtstbijzijnde andere veld, met twee poorten op de lijn
const thuis = dichtstbijVeld(VELDEN, plekken.eelde.x, plekken.eelde.y);
assert.strictEqual(thuis.id, 'eelde', 'de kist staat op Eelde');
const bestemming = kiesBestemming(VELDEN, thuis, { thuis: 'eelde' });
assert.ok(bestemming && bestemming.id !== 'eelde', 'de bestemming is een tweede veld');
const rit = vluchtTussenVelden(VELDEN, plekken.eelde.x, plekken.eelde.y, { thuis: 'eelde' });
assert.ok(rit, 'de etappe is uit te zetten');
assert.strictEqual(rit.van.naam, 'Eelde');
assert.strictEqual(rit.naar.id, bestemming.id, 'dezelfde bestemming als de keuze');
assert.strictEqual(rit.route.length, 2, 'twee poorten');
const dx = rit.naar.x - rit.van.x, dy = rit.naar.y - rit.van.y;
for (const poort of rit.route) {
  assert.strictEqual(poort.z, 120, 'de poorten liggen op één hoogte');
  const kruis = (poort.x - rit.van.x) * dy - (poort.y - rit.van.y) * dx;
  assert.ok(Math.abs(kruis) < 1e-6, 'de poort ligt op de lijn naar de bestemming');
  assert.ok(Math.hypot(poort.x - rit.van.x, poort.y - rit.van.y) > 100, 'de poort ligt niet op het veld');
  assert.ok(Math.hypot(poort.x - rit.naar.x, poort.y - rit.naar.y) > 100, 'de poort ligt niet op de bestemming');
}

// terugvliegen is een nieuwe dienst: vanaf een veld gaat het naar Eelde, nooit naar jezelf
const terug = vluchtTussenVelden(VELDEN, bestemming.x, bestemming.y, { thuis: 'eelde' });
assert.ok(terug && terug.van.id === bestemming.id, 'je vertrekt vanaf het tweede veld');
assert.strictEqual(terug.naar.id, 'eelde', 'terug naar Eelde');
assert.ok(!vluchtTussenVelden([VELDEN[0]], plekken.eelde.x, plekken.eelde.y, { thuis: 'eelde' }), 'zonder tweede veld geen etappe');
assert.strictEqual(veldRoute({ x: 0, y: 0 }, null), null, 'zonder bestemming geen route');

console.log('arcadeplane_test ok');
