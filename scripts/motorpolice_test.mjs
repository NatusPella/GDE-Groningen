// Logic test for motorpolice.js: police notice a tuned AI brommer, once, no star.
//   node scripts/motorpolice_test.mjs
import assert from 'node:assert/strict';
import { isTunedSpeeder, spottedTunedMoped, updateMotorPolice, resetMotorPolice, NOTICE_COOLDOWN_S } from '../game/js/motorpolice.js';
import { MOPED_LEGAL_SPEED } from '../game/js/motomodels.js';

const moped = (o = {}) => ({ isMotor: true, tunedMoped: true, speed: 16, x: 10, y: 0, ...o });
const cop = (o = {}) => ({ isPolice: true, x: 0, y: 0, ...o });

assert(isTunedSpeeder(moped()));
assert(!isTunedSpeeder(moped({ tunedMoped: false })));
assert(!isTunedSpeeder(moped({ speed: MOPED_LEGAL_SPEED })));
assert(!isTunedSpeeder(moped({ wrecked: true })));
assert(!isTunedSpeeder(null));

const m = moped();
assert.equal(spottedTunedMoped([cop(), m]), m);
assert.equal(spottedTunedMoped([m]), null, 'no cop, no notice');
assert.equal(spottedTunedMoped([cop({ disabled: true }), m]), null);
assert.equal(spottedTunedMoped([cop(), moped({ x: 200 })]), null, 'too far');

resetMotorPolice();
const msgs = [];
const world = { vehicles: [cop(), m, moped({ x: -8 })], addMessage: (t, s, o) => msgs.push([t, o]) };
assert(updateMotorPolice(0.1, world));
assert.equal(msgs.length, 1);
assert.equal(msgs[0][1].kind, 'politie');
assert.equal(updateMotorPolice(0.1, world), '', 'cooldown');
assert.equal(updateMotorPolice(NOTICE_COOLDOWN_S, world), '');
assert(updateMotorPolice(0.1, world), 'second rider noticed after the pause');
assert.equal(updateMotorPolice(NOTICE_COOLDOWN_S + 1, world), '');
assert.equal(updateMotorPolice(0.1, world), '', 'each rider only once');
assert.equal(world.stars, undefined, 'no star');
console.log('motorpolice_test ok');
