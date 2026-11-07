// Afronding: politie-scans op 6 Hz (#653) en Ommeland-solids op 4 Hz (#654).
import fs from 'node:fs';
import { makeTick } from '../game/js/tickbudget.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const tel = (intervalMs) => {
  const tick = makeTick(intervalMs);
  let calls = 0, now = 0;
  for (let f = 0; f < 60; f++) { now += 1000 / 60; if (tick(now)) calls++; }
  return calls;
};
const pol = tel(160), sol = tel(250);
ok(pol >= 5 && pol <= 7, 'politie-scans ~6x/s (was 60x/s)', pol);
ok(sol >= 3 && sol <= 5, 'Ommeland-solids ~4x/s (was 60x/s)', sol);
const t = makeTick(100);
ok(t(0), 'de eerste keer meteen');
ok(!t(50) && t(101), 'binnen het interval niet, erna wel');
console.log(`#653/#654 meting: politie-scans 60 -> ${pol}/s, Ommeland-solids 60 -> ${sol}/s`);

const police = fs.readFileSync(new URL('../game/js/police.js', import.meta.url), 'utf8');
ok(/policeSlowTick\(performance\.now\(\)\)/.test(police), 'de politie gebruikt de tijdpoort');
ok(/if \(slowDue\) despawnFarPolice/.test(police) && /if \(slowDue\) updateRoadblocks/.test(police), 'drie scans achter de poort');
const omm = fs.readFileSync(new URL('../game/js/ommelandfun.js', import.meta.url), 'utf8');
ok(/if \(solidsTick\(performance\.now\(\)\)\) refreshSolids\(\)/.test(omm), 'de Ommeland-solids achter de poort');
console.log(`${n - fails}/${n} perfafrond`);
process.exit(fails ? 1 : 0);
