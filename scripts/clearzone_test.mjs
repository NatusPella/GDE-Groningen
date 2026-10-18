// Clear zones (clearzone.js, issue #176): the kart track corridor keeps
// people, traffic and props off the track.
//   node scripts/clearzone_test.mjs
import { addClearZone, removeClearZone, clearZoneAt, inClearZone, pushOutOfClearZone, corridorPoints, clearZones } from '../game/js/clearzone.js';
import { buildTrack, TRACK_W, RUNOFF } from '../game/js/kartrace.js';

let bad = 0;
const check = (n, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', n, info); } };

// a straight zone
addClearZone('a', [[0, 0], [100, 0]], 5, false);
check('on the line: inside', inClearZone(50, 0));
check('4 m beside it: inside', inClearZone(50, 4));
check('6 m beside it: outside', !inClearZone(50, 6));
check('margin widens it', inClearZone(50, 6, 2));
check('past the open end: outside beyond the radius', !inClearZone(110, 0) && inClearZone(103, 0));
const o = pushOutOfClearZone(50, 2);
check('push out leaves the zone, on the same side', !inClearZone(o.x, o.y) && o.y > 5 && Math.abs(o.x - 50) < 1e-6, JSON.stringify(o));
check('outside points are unchanged', pushOutOfClearZone(50, 20).y === 20);
removeClearZone('a');
check('removed zone is gone', !inClearZone(50, 0) && clearZones().length === 0);

// the kart track: world frame as kartbaan.js builds it (a rotation and offset)
const T = buildTrack();
const rot = 0.45, ox = 1000, oy = -400;
const toW = (u, v) => ({ x: ox + u * Math.cos(rot) - v * Math.sin(rot), y: oy + u * Math.sin(rot) + v * Math.cos(rot) });
addClearZone('kartbaan', corridorPoints(T, toW), TRACK_W / 2 + RUNOFF + 3);
let allOn = true, wallIn = true;
for (let i = 0; i < T.N; i++) {
  const c = toW(T.u[i], T.v[i]);
  if (!inClearZone(c.x, c.y)) allOn = false;
  const a = T.ang[i], nx = -Math.sin(a), ny = Math.cos(a);
  for (const s of [-1, 1]) { const w = toW(T.u[i] + nx * s * (T.hw + RUNOFF + 0.35), T.v[i] + ny * s * (T.hw + RUNOFF + 0.35)); if (!inClearZone(w.x, w.y)) wallIn = false; }
}
check('every track point is inside the zone', allOn);
check('the tyre wall is inside the zone', wallIn);
const mid = toW(17, 40);
check('the infield is not part of the corridor far from the track', clearZones().length === 1);
const far = toW(T.u[0] + 80, T.v[0] + 200);
check('a point 200 m away is outside', !inClearZone(far.x, far.y));
const c0 = toW(T.u[0], T.v[0]);
const a0 = T.ang[0];
check('a point 25 m off the track is outside', !inClearZone(c0.x + 25 * -Math.sin(a0 + rot), c0.y + 25 * Math.cos(a0 + rot)) );
const spot = pushOutOfClearZone(c0.x, c0.y);
check('a walker on the track is led off it', !inClearZone(spot.x, spot.y, -0.01));
console.log(bad ? `${bad} failed` : 'all passed');
process.exit(bad ? 1 : 0);
