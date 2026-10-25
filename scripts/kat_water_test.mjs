// Een kat in het water (#436): hij scharrelt naar de kant in plaats van op
// het water te blijven staan.
//   node scripts/kat_water_test.mjs
import './node3d.mjs';
const W = await import('../game/js/wildlife.js');

let n = 0, bad = 0;
const ok = (name, c, extra = '') => { n++; if (!c) { bad++; console.log('FAIL', name, extra); } };

const water = { pts: [[-30, -30], [0, -30], [0, 30], [-30, 30]] };
const map = new Proxy({ meta: {}, _bridgeRails: new Map(), waterNear: () => [water], isOnBridge: () => false, onCarriageway: () => false, roadsNear: () => [], buildingsNear: () => [], greenNear: () => [] }, {
  get: (t, k) => (k in t ? t[k] : () => []),
});
const a = { kind: 'cat', variant: 0, x: -10, y: 0, angle: 0, speed: 0, state: 'sit', stateTimer: 5, bobSeed: 1, wanderTarget: { x: -10, y: 0 }, tam: false };

ok('op het droge doet de redding niets', W.stepKatUitWater({ ...a, x: 5 }, 1 / 30, map) === false);
let inWater = true;
for (let i = 0; i < 400 && inWater; i++) inWater = W.stepKatUitWater(a, 1 / 30, map, () => 0.99);
ok('de kat is uit het water', a.x > 0 && !inWater, String(a.x));
ok('hij zit weer rustig op de kant', a.state === 'sit' && a.speed === 0, a.state);
ok('de redding is begrensd en wordt niet NaN', Number.isFinite(a.x) && Number.isFinite(a.y));
console.log(`kat_water_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
