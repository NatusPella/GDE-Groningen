// #824: de eierrit is eerlijk: de tractor mag vol gas (top ~40 km/u), de
// breekregel ligt daarboven en de HUD waarschuwt twee km/u eerder.
//   node scripts/eggspeed_test.mjs
import { readFileSync } from 'node:fs';
import { EGG_KMH, eggSpeedKmh, eggLimitKmh, eggSpeedLoss, eggSpeedWarning } from '../game/js/eggspeed.js';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };
const def = { eggs: { rough: { speed: 11.2, per: 0.35 } } };
const limit = eggLimitKmh(def);

ok(limit === 40, 'de breekgrens is 40 km/u', limit);
ok(eggSpeedKmh(11.2) === 40.32, '11,2 m/s is ruim 40 km/u');
ok(eggSpeedLoss(11.2, def.eggs.rough, 1) === 0, 'vol gas op de tractor (11,2 m/s) breekt niets');
ok(eggSpeedLoss(10, def.eggs.rough, 1) === 0, 'onder de grens breekt niets');
ok(eggSpeedLoss(12.2, def.eggs.rough, 1) > 0, 'boven de grens breekt wel');
ok(eggSpeedLoss(12.2, def.eggs.rough, 0) === 0 && eggSpeedLoss(12.2, null, 1) === 0, 'geen tijd of geen ruwe weg: geen verlies');
ok(eggSpeedWarning(38, 40) === true, 'waarschuwt op 38 km/u, vóór de grens');
ok(eggSpeedWarning(37.9, 40) === false, 'onder de waarschuwingsmarge niet');
ok(eggSpeedWarning(40, 40) === true && eggSpeedWarning(45, 40) === true, 'op en boven de grens blijft de waarschuwing');
ok(eggSpeedWarning(10, 0) === false, 'zonder limiet geen waarschuwing');
ok(eggLimitKmh({ eggs: {} }) === 0 && eggLimitKmh(null) === 0, 'zonder eierdefinitie geen limiet');

const src = readFileSync(new URL('../game/js/missions_akte2.js', import.meta.url), 'utf8');
ok(/eggs: \{[^}]*rough: \{ speed: 11\.2/.test(src), 'M09 gebruikt de nieuwe grens');
const mi = readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
ok(/eggSpeedWarning/.test(mi) && /eggKmh/.test(mi) && /rem rustig/.test(mi), 'de missie-HUD waarschuwt en noemt de snelheid');
const pr = readFileSync(new URL('../game/js/prompts.js', import.meta.url), 'utf8');
ok(/egg-speed/.test(pr) && /permanent: true/.test(pr), 'de rij- en remhint blijven permanent zichtbaar');

console.log(fails ? `${fails} FAIL` : 'eggspeed_test ok');
process.exit(fails ? 1 : 0);
