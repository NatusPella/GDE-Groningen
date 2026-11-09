// #804: per-frame budget op de eerste padopbouw na een spawngolf.
import fs from 'node:fs';
import { consumePathBudget, PATH_BUILDS_PER_FRAME, pathBudgetStats } from '../game/js/pathbudget.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + name + (info !== '' ? ' (' + info + ')' : '')); } };

ok(PATH_BUILDS_PER_FRAME === 4, 'budget 4 per frame', PATH_BUILDS_PER_FRAME);
const b = { left: PATH_BUILDS_PER_FRAME };
let allowed = 0;
for (let i = 0; i < 30; i++) if (consumePathBudget(b)) allowed++;
ok(allowed === 4, 'dertig nieuwe voertuigen: vier paden in dit frame', allowed);
ok(pathBudgetStats.deferred === 26, 'de rest schuift door', pathBudgetStats.deferred);
ok(consumePathBudget(null) === true, 'zonder budget ongewijzigd gedrag');
const bron = fs.readFileSync(new URL('../game/js/vehicle/traffic.js', import.meta.url), 'utf8');
ok(/consumePathBudget\(opts\.budget\)/.test(bron) && /v\.aiDeferred/.test(bron), 'traffic wacht op het budget');
const main = fs.readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8');
ok(/pathBudget = \{ left: PATH_BUILDS_PER_FRAME \}/.test(main) && /budget: pathBudget/.test(main), 'main geeft het budget mee');
console.log('#804 meting: padopbouw na een spawngolf hoogstens 4 per frame i.p.v. de hele golf (traffic-piek 274 ms)');
console.log(`${n - fails}/${n} pathbudget`);
process.exit(fails ? 1 : 0);
