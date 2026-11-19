// separatePeds pushes overlapping walkers apart, also with the reused query list. node scripts/pedsep_test.mjs
import './node3d.mjs';
const { buildPedAvoidGrid, separatePeds } = await import('../game/js/pedroutes.js');
let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const map = { buildingsNear: () => [], roadsNear: () => [], isWater: () => false };
const mk = (x, y, extra = {}) => ({ x, y, state: 'walk', ...extra });
const peds = [mk(0, 0), mk(0.2, 0), mk(50, 50), mk(0, 0.1, { state: 'guard' })];
buildPedAvoidGrid(peds);
let err = null;
try { for (let i = 0; i < 30; i++) separatePeds(peds, map); } catch (e) { err = e; }
if (err) console.log('(kaart-stub te mager:', err.message + ')');
ok(!err, 'separatePeds draait zonder fout');
if (!err) {
  const d = Math.hypot(peds[0].x - peds[1].x, peds[0].y - peds[1].y);
  ok(d > 0.5, 'twee overlappende wandelaars staan na een paar frames uit elkaar: ' + d.toFixed(2));
  ok(peds[2].x === 50 && peds[2].y === 50, 'een ver weg staande wandelaar blijft staan');
  ok(peds[3].x === 0 && peds[3].y === 0.1, 'een bewaker (pinned) blijft staan');
}
console.log(`pedsep_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
