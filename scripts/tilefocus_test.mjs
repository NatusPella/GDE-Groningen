// Tile streaming focus (game/js/tilefocus.js): node scripts/tilefocus_test.mjs
import { tileFocus, cameraFocus, LOOK_MAX, MAX_SPEED } from '../game/js/tilefocus.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const near = (a, b) => Math.abs(a - b) < 1e-6;

// no override: the player, with its speed
let st = {};
let r = tileFocus({ x: 100, y: 200 }, null, st, 0.1);
ok(r && r.x === 100 && r.y === 200 && r.opts.vx === 0, 'player first frame');
r = tileFocus({ x: 101, y: 200 }, null, st, 0.1);
ok(near(r.opts.vx, 10) && near(r.opts.vy, 0), 'player speed');
r = tileFocus({ x: 121, y: 200 }, null, st, 0.1);
ok(r.opts.vx === MAX_SPEED, 'speed capped');

// override: the look target, not the player
st = {};
const far = { x: 5000, y: 5000 };
const o = { position: { x: 0, y: 0, z: 5 }, lookAt: { x: 30, y: 40, z: 1 } };
r = tileFocus(far, o, st, 0.016);
ok(near(r.x, 30) && near(r.y, 40), 'override: look target');
// far look target is cut off at LOOK_MAX from the eye
const o2 = { position: { x: 10, y: 10, z: 5 }, lookAt: { x: 10 + 1000, y: 10, z: 1 } };
const c = cameraFocus(o2);
ok(near(c.x, 10 + LOOK_MAX) && near(c.y, 10), 'look cap');

// a cut is a jump: no heading prefetch
st = {};
tileFocus({ x: 0, y: 0 }, null, st, 0.016);
r = tileFocus({ x: 0, y: 0 }, { position: { x: 3000, y: 0 }, lookAt: { x: 3010, y: 0 } }, st, 0.016);
ok(r.x === 3010 && Object.keys(r.opts).length === 0, 'cut has no speed');
// and back to the player after the scene
r = tileFocus({ x: 0, y: 0 }, null, st, 0.016);
ok(r.x === 0 && Object.keys(r.opts).length === 0, 'return is a jump too');

// bad poses fall back to the player; no player and no pose gives null
r = tileFocus({ x: 7, y: 8 }, { position: { x: NaN, y: 0 }, lookAt: { x: 1, y: 1 } }, {}, 0.016);
ok(r.x === 7 && r.y === 8, 'NaN pose falls back');
ok(cameraFocus({ position: { x: 1, y: 1 } }) === null && cameraFocus(null) === null, 'incomplete pose');
ok(tileFocus({}, null, {}, 0.016) === null, 'nothing to follow');
// the old bug: an override ({position, lookAt}, no x/y) must still give a focus
ok(tileFocus({ x: 1, y: 1 }, o, {}, 0.016) !== null, 'override with no x/y still follows');

console.log(fails ? `${fails} of ${n} FAILED` : `ok: ${n} checks`);
process.exit(fails ? 1 : 0);
