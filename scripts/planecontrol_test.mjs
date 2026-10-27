import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachPlane, flyPlaneVehicle, planeInput, planeExitBlock, makeStrip, idlePlane, planeStatus } from '../game/js/planecontrol.js';
import { makePlane, stepPlane, PLANE, veldBaan } from '../game/js/arcadeplane.js';

const keys = new Set();
const isDown = (k) => keys.has(k);
const flat = () => 5;
const strip = makeStrip({ x: 0, y: 0, heading: 0, length: 900 });
assert.ok(strip.contains(100, 3) && !strip.contains(100, 40) && !strip.contains(1200, 0));

// gas blijft staan na loslaten
const st = { thr: 0 };
keys.add('w'); planeInput(isDown, st, 1); keys.delete('w');
assert.ok(st.thr > 0.4 && planeInput(isDown, st, 1).throttle === st.thr);

const v = { x: 0, y: 0, model: {}, health: 100 };
attachPlane(v, 0, 0, 5, 0);
assert.strictEqual(planeExitBlock(v), '', 'stilstaand mag uitstappen');
// opstijgen met alleen toetsen
const dt = 1 / 60;
keys.add('w');
for (let i = 0; i < 60 * 14 && v.onGround; i++) {
  if (v.speed > 31) keys.add(' ');
  flyPlaneVehicle(v, dt, isDown, flat, (x, y) => strip.contains(x, y));
}
assert.ok(!v.onGround && v.speed > 30 && v.x < 900, 'opgestegen binnen de baan');
assert.ok(planeExitBlock(v).startsWith('Eerst landen'));
assert.ok(v.z > 5 && v.airborne);
keys.delete(' ');
// bocht met D
const a0 = v.angle;
keys.add('d');
for (let i = 0; i < 240; i++) flyPlaneVehicle(v, dt, isDown, flat, () => false);
assert.ok(Math.abs(v.angle - a0) > 0.3);
keys.clear();
// motorstoring: geen gas, landt of crasht, wordt wrak
v.disabled = true;
for (let i = 0; i < 60 * 120 && !v.wrecked && !v.onGround; i++) flyPlaneVehicle(v, dt, isDown, flat, () => false);
assert.ok(v.wrecked && v.health === 0, 'zonder baan wordt het een wrak');
assert.strictEqual(planeStatus(v).state, 'Neergestort');
// geparkeerd rolt uit
const w = { x: 0, y: 0, model: {} }; attachPlane(w, 0, 0, 5, 0); w.plane.speed = 10;
for (let i = 0; i < 200; i++) idlePlane(w, dt, flat);
assert.strictEqual(w.speed, 0);

// --- landen op een tweede veld (#492): de gemeten baan uit game/vliegplekken.json ------------
const hier = path.dirname(fileURLToPath(import.meta.url));
const plekken = JSON.parse(readFileSync(path.join(hier, '../game/vliegplekken.json'), 'utf8'));
const veld = plekken.velden[0];
const baan = veldBaan(veld);
assert.ok(baan.contains(veld.x, veld.y), 'de baan van het tweede veld ligt op de gemeten plek');
const begin = baan.point(10);
const p2 = makePlane(begin.x, begin.y, 15, veld.heading);
p2.onGround = false; p2.speed = 30; p2.vz = -1;
for (let i = 0; i < 8000 && !p2.onGround && !p2.crashed; i++) stepPlane(p2, { throttle: 0.3, pitch: -0.5 }, dt, () => 0, (x, y) => baan.contains(x, y));
assert.ok(p2.onGround && !p2.crashed, 'landt op het tweede veld');
assert.ok(p2.landing === 'zacht' || p2.landing === 'hard', 'de landing op het tweede veld telt: ' + p2.landing);
// en ernaast is het nog steeds geen baan
const p3 = makePlane(begin.x, begin.y, 15, veld.heading);
p3.onGround = false; p3.speed = 30; p3.vz = -1;
for (let i = 0; i < 8000 && !p3.onGround && !p3.crashed; i++) stepPlane(p3, { throttle: 0.3, pitch: -0.5 }, dt, () => 0, () => false);
assert.ok(p3.crashed, 'naast het tweede veld crasht het nog steeds');

// --- de bediening: pijltjes voor de neus, het roer apart van het rollen ------------------------
// De speler vroeg: omhoog/omlaag hoort op de plek die je zoekt, en rollen is iets anders dan het
// roer. Spatie/Ctrl blijven werken, de pijltjes doen hetzelfde, en Q/E geven een eigen roeras.
const enkel = (key) => planeInput((k) => k === key, {}, dt);
assert.strictEqual(enkel('arrowup').pitch, 1, 'pijltje omhoog: neus omhoog');
assert.strictEqual(enkel('arrowdown').pitch, -1, 'pijltje omlaag: neus omlaag');
assert.strictEqual(enkel(' ').pitch, 1, 'Spatie doet het nog steeds');
assert.strictEqual(enkel('control').pitch, -1, 'Ctrl doet het nog steeds');
const samen = planeInput((k) => k === ' ' || k === 'arrowup', {}, dt);
assert.strictEqual(samen.pitch, 1, 'twee toetsen voor hetzelfde geven geen dubbele uitslag');

const q = enkel('q'), e = enkel('e'), d = enkel('d'), a = enkel('a');
assert.strictEqual(q.yaw, -1, 'Q is het roer links');
assert.strictEqual(e.yaw, 1, 'E is het roer rechts');
assert.strictEqual(q.roll, 0, 'Q rolt niet');
assert.strictEqual(e.roll, 0, 'E rolt niet');
assert.strictEqual(d.roll, 1, 'D rolt rechts');
assert.strictEqual(a.roll, -1, 'A rolt links');
assert.strictEqual(d.yaw, 0, 'D roert niet meer mee (dat was de kopie van rollen)');
assert.strictEqual(a.yaw, 0, 'A roert niet meer mee');
assert.notStrictEqual(d.yaw, d.roll, 'roer en rollen zijn geen kopie meer van elkaar');

// In de lucht: het roer draait de koers een klein stukje en laat de rolhoek met rust.
function inDeLucht(toetsen, keren = 240) {
  const b = { x: 0, y: 0, model: {} };
  attachPlane(b, 0, 0, 100, 0);
  b.plane.onGround = false; b.plane.speed = 45; b.plane.vz = 0;
  const set = new Set(toetsen);
  const h0 = b.angle;
  for (let i = 0; i < keren; i++) flyPlaneVehicle(b, dt, (k) => set.has(k), () => 0, () => false);
  return { v: b, koers: b.angle - h0 };
}
const metRoer = inDeLucht(['q']);
const metRol = inDeLucht(['d']);
assert.ok(metRoer.koers < -0.2, 'Q stuurt in de lucht naar links: ' + metRoer.koers.toFixed(3));
assert.ok(Math.abs(metRoer.v.roll) < 0.02, 'Q rolt de kist niet');
assert.ok(Math.abs(metRol.koers) > 1.5 * Math.abs(metRoer.koers), 'rollen draait duidelijk meer dan het roer');
assert.ok(Math.abs(PLANE.rudderRate * 4 - PLANE.turnRate) < 1e-9, 'het roer is een kwart van de rolroerstand in het model');

// De D-bocht moet precies uitkomen zoals voor de nieuwe bediening (de standaardwaarden van het
// vliegmodel liggen vast): 240 beelden, 45 m/s, geen gas. Dit is de koers van de oude indeling.
const GOUDE_D_BOCHT = 1.6644257949819394;
assert.ok(Math.abs(metRol.koers - GOUDE_D_BOCHT) < 1e-9, 'de D-bocht komt hetzelfde uit: ' + metRol.koers);
// en D geeft het model precies de invoer van vroeger: alleen rol, het roer in de middenstand
const ref = makePlane(0, 0, 100, 0);
ref.onGround = false; ref.speed = 45;
for (let i = 0; i < 240; i++) stepPlane(ref, { throttle: 0, roll: 1, yaw: 0, pitch: 0, brake: false }, dt, () => 0, () => false);
assert.ok(Math.abs(ref.heading - metRol.koers) < 1e-12, 'de D-bocht volgt exact het oude model');

// Op de baan blijft A/D het neuswiel (taxien verandert niet) en werkt het roer er ook.
function taxiMet(toetsen, keren = 360) {
  const b = { x: 0, y: 0, model: {} };
  attachPlane(b, 0, 0, 5, 0);
  b.plane.speed = 12;
  const set = new Set(toetsen);
  const h0 = b.angle;
  for (let i = 0; i < keren; i++) flyPlaneVehicle(b, dt, (k) => set.has(k), flat, () => true);
  return b.angle - h0;
}
const GOUDE_TAXI_D = 1.7932880228519101;
assert.ok(Math.abs(taxiMet(['d']) - GOUDE_TAXI_D) < 1e-9, 'taxien met D stuurt nog precies zo: ' + taxiMet(['d']));
assert.ok(taxiMet(['q']) < -1, 'Q stuurt ook op de baan naar links');

console.log('planecontrol_test ok');
