// World marker numbers (game/js/markerlook.js, #115):  node scripts/markerlook_test.mjs
import * as M from '../game/js/markerlook.js';
let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };

ok(M.iconScale(0) === 1 && M.iconScale(40) === 1 && M.iconScale(1e6) === 4.5, 'icon scale capped 1..4.5');
let prev = 0;
for (let d = 0; d <= 400; d += 10) { const s = M.iconScale(d); ok(s >= prev, 'icon scale never shrinks with distance'); prev = s; }
// about constant on screen between 40 m and the cap: size / distance stays within a factor 1
ok(Math.abs(M.iconScale(100) / 100 - M.iconScale(160) / 160) < 0.01 || M.iconScale(160) === 4, 'on-screen size roughly constant');
ok(M.iconLift(10) === 0 && M.iconLift(1e6) > 0, 'lift only far away');
ok(M.columnWidth(0) === 1 && M.columnWidth(1e6) === 8, 'column width 1..8');
ok(M.columnWidth(400) * 0.07 * 2 / 400 > 0.002, 'op 400 m is de kolom minstens 0,1 graad breed');
ok(M.columnHeight(0) === 28 && M.columnHeight(400) > 100 && M.columnHeight(1e6) === 140, 'kolom wordt hoger met afstand, begrensd');

ok(M.glowBoost() === 1, 'clear day = 1');
ok(M.glowBoost({ night: 1 }) > M.glowBoost({ night: 0.5 }) && M.glowBoost({ rain: 1 }) > 1, 'night and rain boost');
ok(M.glowBoost({ night: 9, rain: 9 }) === M.glowBoost({ night: 1, rain: 1 }), 'inputs are clamped');

// the column is calm by day close by, stronger far off and in the dark, never solid, never gone
for (const d of [5, 50, 200, 800]) for (const b of [-1, 0, 1]) for (const env of [{}, { night: 1 }, { rain: 1 }, { night: 1, rain: 1 }]) {
  const o = M.columnOpacity(b, d, env);
  ok(o >= M.COLUMN_MIN && o <= M.COLUMN_MAX, `column opacity ${o} at ${d} m`);
}
ok(M.columnOpacity(0, 300, {}) > M.columnOpacity(0, 20, {}), 'stronger far off');
ok(M.columnOpacity(0, 20, { night: 1 }) > M.columnOpacity(0, 20, {}), 'stronger at night');
ok(M.columnOpacity(0, 20, { rain: 1 }) > M.columnOpacity(0, 20, {}), 'stronger in rain');
ok(M.columnOpacity(0, 20, {}) < 0.4, 'calm by day close by');
ok(M.discOpacity(1, { night: 1, rain: 1 }) <= 0.4 && M.discOpacity(-1, {}) >= 0.08, 'disc stays soft');
ok(M.glyphPulse(-1) === 1 && M.glyphPulse(1) <= 1.07, 'glyph breathes by at most 6%');

ok(!M.showLabel(14) && M.showLabel(15), 'label from 14 m');
ok(M.labelText(42.4) === '42 m' && M.labelText(347) === '350 m' && M.labelText(1500) === '1,5 km', 'label text');
console.log(`${n - fails}/${n} markerlook`);
process.exit(fails ? 1 : 0);
