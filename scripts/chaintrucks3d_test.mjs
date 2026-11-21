// De THREE-kant van de ketenwagens (chaintrucks3d.js) als bronregels, zoals snackvans3d_test: pool en dispose, geen Math.random of fetch, hergebruik van het vrachtwagenmodel en de
// persoonsfiguur, hoogstens vier, planning tweemaal per seconde, reducedMotion, niets voor een gast, de haak in main.js naast updateSnackVans.   node scripts/chaintrucks3d_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from '../game/js/chaintrucks.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const src = read('../game/js/chaintrucks3d.js');
const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const pure = read('../game/js/chaintrucks.js').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

t('THREE-kant: geen Math.random, geen fetch; wat wegvalt gaat via disposeObject en uit de scene', () => {
  assert.ok(!/Math\.random|fetch\(/.test(code));
  assert.match(code, /disposeObject\(a\.group\)/); assert.match(code, /parent\.remove/);
  assert.match(code, /S\.actors\.clear\(\)/);
});
t('THREE-kant: hergebruikt het vrachtwagenmodel en de persoonsfiguur; hoogstens MAX_TRUCKS; planning tweemaal per seconde', () => {
  assert.match(code, /name: 'truck'/); assert.match(code, /buildVehicleMesh/); assert.match(code, /buildPersonMesh/);
  assert.match(code, /planChainTrucks\(/); assert.match(code, /MAX_TRUCKS/); assert.match(code, /PLAN_EVERY_S/);
  assert.equal(C.PLAN_EVERY_S, 0.5); assert.equal(C.MAX_TRUCKS, 4); assert.equal(C.SPAWN_R, 230);
});
t('THREE-kant: reducedMotion laat de wagen springen, een gast ziet niets (zijn bezit is van hem)', () => {
  assert.match(code, /reducedMotion\(\)/); assert.match(code, /slide\(a\.cur, a\.target, dt, reduced\)/);
  assert.match(code, /workersVisible\(w\)/); assert.match(read('../game/js/farmworkers.js'), /coopRole !== 'client'/);
});
t('THREE-kant: de ritten worden gelezen met een rem (niet elk beeld de hele keten) en de route via het wegennet als dat er is', () => {
  assert.match(code, /TRIPS_EVERY_S/); assert.match(code, /nearestRoadPoint/); assert.match(code, /chainTruckInput\(\)/);
});
t('het pure deel: geen THREE, geen DOM, geen klok, geen Math.random', () => {
  assert.ok(!/THREE|document\.|window\.|Date\.now|performance\.now|Math\.random|fetch\(/.test(pure));
});
t('main.js roept updateChainTrucks aan naast updateSnackVans', () => {
  assert.match(read('../game/js/main.js'), /updateSnackVans\(world, dt\); updateChainTrucks\(world, dt\)/);
});
console.log(`chaintrucks3d_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
