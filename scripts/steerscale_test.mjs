// Stuurgevoeligheid (game/js/steerscale.js, #801):  node scripts/steerscale_test.mjs
import { steerScale, STEER_MIN, STEER_MAX } from '../game/js/steerscale.js';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

ok(steerScale(0.5, 1) === 0.5, 'standaard laat de invoer staan');
ok(steerScale(-1, 1) === -1 && steerScale(1, 1) === 1, 'volle invoer blijft vol');
ok(steerScale(0.5, 0.5) === 0.25, 'zachter stuurt minder ver');
ok(steerScale(1, 1.5) === 1, 'nooit boven volle invoer');
ok(steerScale(1, 5) === 1 && steerScale(1, 0) === 0.5, 'de instelling blijft binnen zijn bereik', [steerScale(1, 9), steerScale(1, -3)]);
ok(steerScale(NaN, 1) === 0 && steerScale(0.5, NaN) === 0.5, 'onzin valt terug op veilige waarden');
ok(steerScale(-0.5, 0.5) === -0.25, 'links stuurt ook zachter');
ok(STEER_MIN === 0.5 && STEER_MAX === 1.5, 'het bereik is 0,5 tot 1,5');

console.log(fails ? `${fails} FAIL` : 'steerscale_test ok');
process.exit(fails ? 1 : 0);
