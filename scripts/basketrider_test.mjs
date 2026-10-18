// Balloon basket rider (basketrider.js, #167): the rider stands on the basket
// floor, inside the rim, and follows its heading and height - not the heli's.
//   node scripts/basketrider_test.mjs
import * as R from '../game/js/basketrider.js';

let fails = 0;
const fail = (m) => { fails++; console.log('FAIL ' + m); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

const b = { x: 100, y: 50, z: 230, yaw: 0, age: 3, burn: 0, seed: 7 };
const p0 = R.basketRiderPose(b, 0);
if (!near(p0.z, 230 + R.BASKET.floor)) fail(`height ${p0.z}, not the basket floor`);
if (!(R.BASKET.floor < R.BASKET.rim)) fail('floor above the rim');
// inside the basket box, whatever the heading
for (const yaw of [0, 0.7, 1.9, -2.4, 3.1]) for (const slot of [0, 1]) {
  const bb = { ...b, yaw };
  const p = R.basketRiderPose(bb, slot);
  const d = Math.hypot(p.x - b.x, p.y - b.y);
  if (d > Math.hypot(R.BASKET.halfX, R.BASKET.halfZ)) fail(`outside the basket: yaw ${yaw} slot ${slot} d ${d}`);
}
// the two riders do not stand in one spot
const p1 = R.basketRiderPose(b, 1);
if (Math.hypot(p0.x - p1.x, p0.y - p1.y) < 0.3) fail('both riders on one spot');
// the height follows the basket
if (!near(R.basketRiderPose({ ...b, z: 300 }, 0).z, 300 + R.BASKET.floor)) fail('does not follow the basket up');
// turning the basket turns the rider's place around its centre and the heading
const q = R.basketRiderPose({ ...b, yaw: Math.PI }, 0);
if (!near(q.x - b.x, -(p0.x - b.x), 1e-9) || !near(q.y - b.y, -(p0.y - b.y), 1e-9)) fail('half a turn does not mirror the place');
if (!near(Math.abs(R.turnTo(p0.heading, q.heading)), Math.PI, 1e-9)) fail('heading does not turn with the basket');
// the nose maps onto the game heading: mesh +X at yaw -> (cos, -sin)
const w = R.localToWorld({ x: 0, y: 0, yaw: 0.5 }, 1, 0);
if (!near(w.x, Math.cos(0.5)) || !near(w.y, -Math.sin(0.5))) fail('local to world');
if (!near(Math.atan2(w.y, w.x), R.basketHeading({ yaw: 0.5 }))) fail('heading does not match the nose');
// looking around: the rider's own look wins, the place stays
const lk = R.basketRiderPose(b, 0, 1.2);
if (lk.heading !== 1.2 || lk.x !== p0.x) fail('look direction moves the rider');
// the swing is small, alive and stronger with the burner
let max = 0, min = 0;
for (let t = 0; t < 120; t += 0.1) { const s = R.basketSway(t, 0, 7); max = Math.max(max, s); min = Math.min(min, s); }
if (!(max > 0.01 && max < 0.05 && min < -0.01)) fail(`sway range ${min}..${max}`);
if (!(Math.abs(R.basketSway(2, 1, 0)) > Math.abs(R.basketSway(2, 0, 0)))) fail('burner does not add swing');
// turnTo wraps
if (!near(R.turnTo(3, -3), 2 * Math.PI - 6)) fail('turnTo wrap');

console.log(fails ? `${fails} failure(s)` : 'basketrider: ok');
process.exit(fails ? 1 : 0);
