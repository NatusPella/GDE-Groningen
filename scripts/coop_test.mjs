// Mini-coöp (#95): spelerslots, invoer-toewijzing, band en camera (game/js/coop.js).
import assert from 'node:assert/strict';
import { assignDevices, keyAxis, padAxis, readP2, velocityFor, leash, cameraFocus, stepSlot2, remoteP2, sharedCamera, SHARE_MAX_DIST, P2_WALK, P2_RUN, LEASH_DIST, CAM_ZOOM_MAX } from '../game/js/coop.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} ≉ ${b}`);

t('toewijzing: zonder pads toetsenbord', () => {
  const d = assignDevices([], null);
  assert.equal(d.p2.kind, 'keys'); assert.equal(d.p1.kind, 'keys');
});
t('toewijzing: pad van P1 gaat nooit naar P2', () => {
  assert.equal(assignDevices([0], 0).p2.kind, 'keys');
  const d = assignDevices([0, 1, 2], 1);
  assert.deepEqual(d.p2, { kind: 'pad', pad: 0 });
  assert.equal(d.p1.pad, 1);
});
t('toetsen IJKL en diagonaal genormaliseerd', () => {
  assert.deepEqual(keyAxis(() => false), [0, 0]);
  assert.deepEqual(keyAxis((k) => k === 'l'), [1, 0]);
  assert.deepEqual(keyAxis((k) => k === 'i'), [0, -1]);
  const [x, y] = keyAxis((k) => k === 'i' || k === 'l');
  near(Math.hypot(x, y), 1);
  assert.deepEqual(keyAxis((k) => k === 'i' || k === 'k'), [0, 0]);
});
t('WASD van speler 1 telt niet voor P2', () => {
  assert.deepEqual(keyAxis((k) => 'wasd'.includes(k)), [0, 0]);
});
t('pad: dode zone en bereik', () => {
  assert.deepEqual(padAxis([0.1, 0.1]), [0, 0]);
  assert.deepEqual(padAxis(null), [0, 0]);
  const [x] = padAxis([1, 0]); near(x, 1);
  const [a, b] = padAxis([0.9, 0.9]); assert.ok(Math.hypot(a, b) <= 1 + 1e-9);
});
t('readP2: pad wint van toetsen, rennen', () => {
  const r = readP2({ padAxes: [1, 0], isDown: (k) => k === 'j' });
  assert.ok(r.x > 0.9 && r.active);
  const k = readP2({ isDown: (key) => key === 'l' || key === 'u' });
  assert.equal(k.run, true); assert.equal(k.x, 1);
  assert.equal(readP2(null).active, false);
});
t('snelheid', () => {
  assert.deepEqual(velocityFor({ x: 1, y: 0, run: false }), [P2_WALK, 0]);
  assert.deepEqual(velocityFor({ x: 0, y: 1, run: true }), [0, P2_RUN]);
});
t('band: binnen blijft, buiten wordt teruggeleid', () => {
  assert.equal(leash({ x: 0, y: 0 }, { x: 5, y: 5 }).clamped, false);
  const l = leash({ x: 10, y: 0 }, { x: 10 + 100, y: 0 });
  assert.equal(l.clamped, true); near(l.x, 10 + LEASH_DIST); near(l.y, 0);
  assert.equal(leash({ x: 1, y: 1 }, { x: 1, y: 1 }).clamped, false);
});
t('camera: midden en zoom begrensd', () => {
  const c = cameraFocus({ x: 0, y: 0 }, { x: 4, y: 0 });
  near(c.x, 2); near(c.zoom, 1);
  assert.ok(cameraFocus({ x: 0, y: 0 }, { x: 30, y: 0 }).zoom > 1);
  near(cameraFocus({ x: 0, y: 0 }, { x: 900, y: 0 }).zoom, CAM_ZOOM_MAX);
});
t('stepSlot2: versnelt, draait mee, remt af', () => {
  const s = { x: 0, y: 0, angle: 0, vx: 0, vy: 0 };
  const inp = { x: 0, y: 1, run: false, active: true };
  for (let i = 0; i < 30; i++) stepSlot2(s, inp, 0.05, null);
  near(s.vy, P2_WALK, 0.01); near(s.angle, Math.PI / 2);
  for (let i = 0; i < 60; i++) stepSlot2(s, { x: 0, y: 0, run: false, active: false }, 0.05, null);
  assert.ok(Math.hypot(s.vx, s.vy) < 0.01);
});
t('online: invoer van de gast wordt P2-invoer, genormaliseerd en begrensd', () => {
  assert.deepEqual(remoteP2(null), { x: 0, y: 0, run: false, active: false });
  const r = remoteP2({ mx: 1, my: 1, buttons: 1 });
  near(Math.hypot(r.x, r.y), 1); assert.equal(r.run, true);
  assert.deepEqual(remoteP2({ mx: NaN, my: 0.5, buttons: 0 }), { x: 0, y: 0.5, run: false, active: true });
});
t('gedeelde camera: midden tussen twee spelers te voet en dichtbij; anders eigen camera', () => {
  const c = sharedCamera({ x: 0, y: 0 }, { x: 20, y: 10 });
  assert.deepEqual([c.x, c.y], [10, 5]); assert.ok(c.zoom > 1 && c.zoom <= CAM_ZOOM_MAX);
  assert.equal(sharedCamera({ x: 0, y: 0 }, { x: SHARE_MAX_DIST + 1, y: 0 }), null, 'te ver uit elkaar');
  assert.equal(sharedCamera({ x: 0, y: 0, inVehicle: {} }, { x: 1, y: 1 }), null, 'in een voertuig');
  assert.equal(sharedCamera(null, { x: 1, y: 1 }), null); assert.equal(sharedCamera({ x: NaN, y: 0 }, { x: 1, y: 1 }), null);
});
console.log(`coop_test: ${n}/${n} ok`);
