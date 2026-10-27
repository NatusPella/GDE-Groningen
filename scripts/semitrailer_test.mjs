import assert from 'node:assert';
import { newTrailer, canCouple, couple, stepTrailer, fifthWheel, hitchAngle, offtracking, uncouple, JACKKNIFE_ANGLE, loadedHandling } from '../game/js/semitrailer.js';

const tractor = { x: 0, y: 0, angle: 0 };
const fw = fifthWheel(tractor);
const far = newTrailer('koel', fw.x - 10, 0, 0);
assert.strictEqual(canCouple(tractor, far), false, 'te ver weg');
const crooked = newTrailer('koel', fw.x, fw.y, 1.2);
assert.strictEqual(canCouple(tractor, crooked), false, 'te scheef');
const tr = newTrailer('koel', fw.x + 0.5, fw.y, 0.1);
assert.ok(couple(tractor, tr), 'koppelt');
assert.ok(!canCouple(tractor, tr), 'al gekoppeld');

// Rechtuit rijden: oplegger blijft recht.
const dt = 1 / 60;
for (let i = 0; i < 300; i++) { tractor.x += 10 * dt; stepTrailer(tr, tractor, dt); }
assert.ok(Math.abs(hitchAngle(tractor, tr)) < 0.02, 'rechtuit blijft recht');

// Bocht: oplegger volgt binnenin (kleiner draaicirkel dan de trekker).
const t2 = { x: 0, y: 0, angle: 0 };
const o = newTrailer('zeil', fifthWheel(t2).x, 0, 0); couple(t2, o);
for (let i = 0; i < 600; i++) {
  t2.angle += (10 / 25) * dt;
  t2.x += Math.cos(t2.angle) * 10 * dt; t2.y += Math.sin(t2.angle) * 10 * dt;
  stepTrailer(o, t2, dt);
}
assert.ok(hitchAngle(t2, o) > 0.1 && hitchAngle(t2, o) < JACKKNIFE_ANGLE, 'oplegger zwaait uit in bocht');
assert.ok(!o.jackknifed);

// Achteruit met scherp stuur geeft een inklapper.
const t3 = { x: 0, y: 0, angle: 0 };
const j = newTrailer('koel', fifthWheel(t3).x, 0, 0); couple(t3, j);
for (let i = 0; i < 600 && !j.jackknifed; i++) {
  t3.angle -= 0.9 * dt;
  t3.x -= Math.cos(t3.angle) * 4 * dt; t3.y -= Math.sin(t3.angle) * 4 * dt;
  stepTrailer(j, t3, dt);
}
assert.ok(j.jackknifed, 'achteruit scherp = inklapper');
assert.ok(Math.abs(hitchAngle(t3, j)) <= JACKKNIFE_ANGLE + 1e-9, 'hoek begrensd');

uncouple(j);
assert.ok(!j.coupled && !j.jackknifed);
assert.ok(offtracking(12, 9) > offtracking(40, 9));
const h = loadedHandling({ coupled: true, load: 1, spec: { mass: 1.2 } }, { maxSpeed: 20, accel: 6, brake: 10, turnRate: 2 });
assert.ok(h.accel < 6 && h.maxSpeed < 20);
console.log('semitrailer_test ok');

// koppelhulp
{
  const { koppelHulp } = await import('../game/js/semitrailer.js');
  const t = { x: 0, y: 0, angle: 0 };
  const f = fifthWheel(t);
  const rechtAchter = koppelHulp(t, newTrailer('koel', f.x - 6, f.y, 0));
  assert.ok(rechtAchter.achter > 5 && Math.abs(rechtAchter.opzij) < 1e-9 && !rechtAchter.ok, 'ligt erachter');
  assert.strictEqual(koppelHulp(t, newTrailer('koel', f.x - 6, f.y + 3, 0)).opzij > 0, true, 'links');
  assert.ok(/links/.test(koppelHulp(t, newTrailer('koel', f.x - 6, f.y + 3, 0)).tip), 'tip links');
  assert.ok(koppelHulp(t, newTrailer('koel', f.x - 0.4, f.y, 0.1)).ok, 'koppelklaar');
  assert.ok(/voorbij/.test(koppelHulp(t, newTrailer('koel', f.x + 4, f.y, 0)).tip), 'voorbij');
  assert.ok(/recht/.test(koppelHulp(t, newTrailer('koel', f.x - 3, f.y, 1.0)).tip), 'scheef');
}
console.log('koppelhulp ok');

// Eigen truck (#492): de baan kan de truck van de speler lenen in plaats van de
// leen-truck. De oplegger rekent met het hulpstuk, de as en de last, niet met het
// model van de leen-truck; de eigen maten en prestaties gaan gewoon mee.
{
  const eigen = { x: 0, y: 0, angle: 0, model: { maxSpeed: 31, accel: 5, brake: 13, turnRate: 1.5 } };
  const f = fifthWheel(eigen);
  const bak = newTrailer('bak', f.x, f.y, 0);
  assert.ok(couple(eigen, bak), 'de eigen truck koppelt dezelfde oplegger');
  const h = loadedHandling(bak, { maxSpeed: eigen.model.maxSpeed, accel: eigen.model.accel, brake: eigen.model.brake, turnRate: eigen.model.turnRate });
  assert.ok(h.accel > 0 && h.accel < eigen.model.accel, 'de last remt de eigen truck ook af');
  for (let i = 0; i < 120; i++) { eigen.x += 8 * dt; stepTrailer(bak, eigen, dt); }
  assert.ok(Math.abs(hitchAngle(eigen, bak)) < 0.02, 'rechtuit blijft de oplegger achter de eigen truck recht');
}
console.log('eigen truck ok');
