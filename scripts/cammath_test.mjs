// #497: de pure camera-meetkunde die uit scene3d.js is getild (cammath.js). De ray- en ellipsoïdetoetsen
// zijn meetkunde; camClearOfVehicle houdt de volgcam buiten de wagen. Daarnaast bewaakt de test de split:
// scene3d.js houdt geen tweede kopie en is korter geworden.
//   node scripts/cammath_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from '../game/js/cammath.js';

const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

t('#497: rayCylinder raakt de cilinder op de juiste afstand en mist ernaast', () => {
  // van (0,1,5) recht naar -z, cilinder om (0,0) met straal 1: het raakvlak ligt op z = 1, dus t = 4
  assert.equal(C.rayCylinder(0, 1, 5, 0, 0, -1, 50, 0, 0, 1, 0, 3), 4);
  assert.equal(C.rayCylinder(0, 1, 5, 0, 0, -1, 2, 0, 0, 1, 0, 3), Infinity, 'verder dan de straal');
  assert.equal(C.rayCylinder(5, 1, 5, 0, 0, -1, 50, 0, 0, 1, 0, 3), Infinity, 'naast de cilinder');
  assert.equal(C.rayCylinder(0, 9, 5, 0, 0, -1, 50, 0, 0, 1, 0, 3), Infinity, 'boven de cilinder');
});

t('#497: segHitsEllipsoid ziet binnen, door en mis', () => {
  assert.equal(C.segHitsEllipsoid(0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1), true, 'start erin');
  assert.equal(C.segHitsEllipsoid(0, 0, -5, 0, 0, 10, 0, 0, 0, 1, 1), true, 'er dwars door');
  assert.equal(C.segHitsEllipsoid(0, 5, -5, 0, 0, 10, 0, 0, 0, 1, 1), false, 'erlangs');
  assert.equal(C.segHitsEllipsoid(0, 0, -5, 1, 0, 0, 0, 0, 0, 1, 1), false, 'weg van de ellipsoïde');
});

t('#497: camClearOfVehicle houdt de camera buiten de wagen, boven het dak', () => {
  const v = { x: 0, y: 0, z: 0, angle: 0, model: { name: 'sedan', len: 4, wid: 2 } };
  const hoog = C.camClearOfVehicle(0, 1.2, 0.6, v);
  assert.ok(hoog[1] > 1.2, 'de camera wijkt uit boven het dak: ' + hoog[1]);
  assert.deepEqual(C.camClearOfVehicle(20, 1.2, 20, v), [20, 1.2, 20], 'buiten de wagen blijft hij staan');
  assert.deepEqual(C.camClearOfVehicle(0, 1.2, 0.6, null), [0, 1.2, 0.6], 'zonder voertuig niets');
  assert.ok(C.camClearOfVehicle(0, 2.5, 0.6, v)[1] > 1.2, 'boven het dak blijft hij');
});

t('#497: scene3d.js gebruikt de eigen module en is korter dan voor de split', () => {
  const scene = bron('scene3d.js');
  assert.match(scene, /from '\.\/cammath\.js'/);
  assert.doesNotMatch(scene, /function camClearOfVehicle/);
  assert.doesNotMatch(scene, /function rayCylinder/);
  assert.doesNotMatch(scene, /function segHitsEllipsoid/);
  const regels = scene.split('\n').length;
  assert.ok(regels < 4360, 'scene3d.js is nu ' + regels + ' regels (was 4299)');
  const m = bron('cammath.js');
  assert.match(m, /export function camClearOfVehicle/);
  assert.match(m, /export function rayCylinder/);
  assert.match(m, /export function segHitsEllipsoid/);
});

console.log(`cammath_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
