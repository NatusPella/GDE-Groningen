// Travel time per beat (game/js/reistijd.js, #97):  node scripts/reistijd_test.mjs
import * as Z from '../game/js/reistijd.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

ok(Z.travelSeconds(1000, 'auto') === 1000 / 22 && Math.round(Z.travelSeconds(1000)) === 45, '1 km = 45 s');
ok(Z.classOf(1500).id === 'dichtbij' && Z.classOf(1501).id === 'rit', 'dichtbij/rit edge');
ok(Z.classOf(4000).id === 'rit' && Z.classOf(4001).id === 'etappe', 'rit/etappe edge');
ok(Z.classOf(6500).id === 'etappe' && Z.classOf(6501).id === 'sprong', 'etappe/sprong edge');
ok(Z.classOf(-5).id === 'dichtbij' && Z.classOf(NaN).id === 'dichtbij', 'garbage in is dichtbij');
ok(!Z.needsBeat(6500) && Z.needsBeat(17000), 'only sprong needs a beat');
// the numbers from the design: Grunn - Winsum 17 km ~ 13 min, 65 km ~ 50 min, tractor 65 km ~ 2 u 15
ok(Math.round(Z.travelSeconds(17000) / 60) === 13, 'Winsum 13 min', Z.travelSeconds(17000) / 60);
ok(Math.round(Z.travelSeconds(65000) / 60) === 49, '65 km ~ 50 min');
ok(Math.round(Z.travelSeconds(65000, 'trekker') / 60) === 135, 'tractor 2 u 15');
ok(Z.travelSeconds(1000, 'onbekend') === Z.travelSeconds(1000, 'auto'), 'unknown mode falls back to car');
const b = Z.beatTimes(30000, ['auto', 'bus']);
ok(b.beat && b.klasse === 'sprong' && b.t.auto === 1364 && b.t.bus > b.t.auto, 'beatTimes', JSON.stringify(b));
ok(Z.piecesFor(300) === 1 && Z.piecesFor(480) === 1 && Z.piecesFor(481) === 2, 'piecesFor');
// colonne 20 km: 15 min, over the ceiling, so 2 pieces
ok(Z.piecesFor(Z.travelSeconds(20000)) === 2, 'colonne in pieces');
ok(!Z.actBudget(1, [{ length: 9000 }]).over && Z.actBudget(1, [{ length: 30000 }]).over, 'act budget');
ok(Z.actBudget(9, []).max === Infinity, 'unknown act has no limit');
console.log(`${n - fails}/${n} reistijd`);
process.exit(fails ? 1 : 0);
