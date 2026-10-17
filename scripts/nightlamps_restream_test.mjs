// Lamps must come back when a road is streamed in again (its tile was dropped and rebuilt).
import './node3d.mjs';
const NL = await import('../game/js/nightlights3d.js');
const map = { buildingsNear: () => [] };
const mk = () => ({ cat: 'normal', width: 6, pts: [[0, 0], [200, 0], [400, 40]] });
let fails = 0;
const a = NL.lampsForRoadForTest(mk(), map);
const b = NL.lampsForRoadForTest(mk(), map);
const ok1 = a.length > 5;
const ok2 = b.length === a.length && b.every((l, i) => l === a[i]);
const c = NL.lampsForRoadForTest({ cat: 'normal', width: 6, pts: [[0, 3], [200, 3]] }, map);
const ok3 = c.every((l) => a.every((o) => Math.hypot(o.x - l.x, o.y - l.y) >= 12.9));
for (const [name, ok] of [['a road gets lamps', ok1], ['the same road streamed in again gets the same lamps back', ok2], ['a neighbouring road still respects the minimum gap', ok3]]) {
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
}
if (fails) process.exit(1);
