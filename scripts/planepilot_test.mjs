// De vliegtuig-autopilot van de spelbot (botlogic.planeKeys) vliegt het arcadevliegmodel: opstijgen, vier poorten op hoogte, landen en stilstaan.
//   node scripts/planepilot_test.mjs
import { makePlane, stepPlane, PLANE } from '../game/js/arcadeplane.js';
import { planeKeys } from '../game/js/botlogic.js';
import { makeStrip } from '../game/js/planecontrol.js';

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };

function fly({ heading, gates, strip, wind = 0 }) {
  const p = makePlane(strip.x + Math.cos(strip.heading) * 30, strip.y + Math.sin(strip.heading) * 30, 0, strip.heading);
  const st = { thr: 0 };
  const ground = () => 0;
  const onRunway = (x, y) => strip.contains(x, y);
  let gi = 0, t = 0, mode = 'fly', passed = [], landed = null;
  const dt = 0.1;
  while (t < 600 && !p.crashed) {
    const gate = gates[gi];
    if (!gate) mode = 'land';
    const keys = planeKeys(p, { agl: p.z, goal: gate || { x: strip.x, y: strip.y }, alt: gate ? (gate.lo + gate.hi) / 2 : 30, mode, strip });
    const k = (x) => (keys.has(x) ? 1 : 0);
    st.thr = Math.max(0, Math.min(1, st.thr + (k('w') - k('s')) * 0.45 * dt));
    stepPlane(p, { throttle: st.thr, roll: k('d') - k('a'), yaw: k('d') - k('a'), pitch: k(' ') - k('control'), brake: keys.has('shift') }, dt, ground, onRunway, PLANE);
    if (gate && Math.hypot(p.x - gate.x, p.y - gate.y) < gate.r && p.z >= gate.lo && p.z <= gate.hi) { passed.push(gi); gi++; }
    if (mode === 'land' && p.onGround && p.speed < 1 && !landed) { landed = { t, x: p.x, y: p.y, inStrip: strip.contains(p.x, p.y) }; break; }
    t += dt;
  }
  return { p, passed, landed, t, crashed: p.crashed };
}

let slowest = 0;
for (const heading of [0.4, 2.5, -1.2, 5.0]) {
  const strip = makeStrip({ x: 100, y: -50, heading, length: 520 });
  const at = (a, across = 0, lo = 3, hi = 24, r = 30) => ({ ...strip.point(a, across), lo, hi, r });
  const gates = [at(430), at(1500, 300, 15, 75, 45), at(2200, -200, 14, 48, 40), at(2900, 400, 14, 48, 40)];
  const r = fly({ gates, strip });
  slowest = Math.max(slowest, r.t);
  ok(!r.crashed, `heading ${heading}: niet neergestort`);
  ok(r.passed.length === gates.length, `heading ${heading}: alle poorten gehaald: ${r.passed.join(',')}`);
  ok(r.landed && r.landed.inStrip, `heading ${heading}: geland op de strook: ${JSON.stringify(r.landed)}`);
}
console.log(`planepilot_test: ${n - bad}/${n} ok (traagste ${Math.round(slowest)} s)`);
process.exit(bad ? 1 : 0);
