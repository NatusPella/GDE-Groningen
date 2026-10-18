// node scripts/shadowsnap_test.mjs: texel snapping of the sun's shadow
// frustum and when the shadow pass may be skipped (game/js/shadowsnap.js).
import { snapShadowCenter, shadowPassSkipped } from '../game/js/shadowsnap.js';

let fail = 0;
const ok = (name, cond, extra = '') => { if (!cond) fail++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };

const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const norm = (v) => { const l = Math.hypot(v.x, v.y, v.z); return { x: v.x / l, y: v.y / l, z: v.z / l }; };
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const dir = norm({ x: 0.4, y: 0.8, z: 0.3 });
const right = norm(cross({ x: 0, y: 1, z: 0 }, dir));
const up = norm(cross(dir, right));
const texel = 64 / 4096;

const c = { x: 123.456, y: 0, z: -78.9 };
const s = snapShadowCenter(c, right, up, dir, texel);
const rr = dot(s, right) / texel, uu = dot(s, up) / texel;
ok('right coordinate on the texel grid', Math.abs(rr - Math.round(rr)) < 1e-6);
ok('up coordinate on the texel grid', Math.abs(uu - Math.round(uu)) < 1e-6);
ok('depth untouched', Math.abs(dot(s, dir) - dot(c, dir)) < 1e-9);
ok('moves less than a texel', Math.hypot(dot(s, right) - dot(c, right), dot(s, up) - dot(c, up)) <= texel * Math.SQRT1_2 + 1e-9);

let bad = 0;
for (let i = 0; i < 2000; i++) {
  const p = snapShadowCenter({ x: i * 0.013, y: 0, z: i * 0.007 }, right, up, dir, texel);
  const r = dot(p, right) / texel;
  if (Math.abs(r - Math.round(r)) > 1e-6) bad++;
}
ok('2000 small steps stay snapped', bad === 0);

ok('no skipping on a fast car', !shadowPassSkipped(1, 1, 20) && !shadowPassSkipped(2, 3, 12));
ok('no skipping without cpu pressure', !shadowPassSkipped(0, 1, 0));
ok('skips every other frame when standing still', shadowPassSkipped(1, 1, 0) && !shadowPassSkipped(1, 2, 0));

process.exit(fail ? 1 : 0);
