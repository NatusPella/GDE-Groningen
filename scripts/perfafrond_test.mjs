// Afronding: politie-scans op 6 Hz (#653) en Ommeland-solids per beeld (#794,
// was 4 Hz in #654; nieuwe propjes moeten meteen botsbaar zijn).
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
const pol = tel(160);
ok(pol >= 5 && pol <= 7, 'politie-scans ~6x/s (was 60x/s)', pol);
const t = makeTick(100);
ok(t(0), 'de eerste keer meteen');
ok(!t(50) && t(101), 'binnen het interval niet, erna wel');
console.log(`#653 meting: politie-scans 60 -> ${pol}/s`);

const police = fs.readFileSync(new URL('../game/js/police.js', import.meta.url), 'utf8');
ok(/policeSlowTick\(performance\.now\(\)\)/.test(police), 'de politie gebruikt de tijdpoort');
ok(/if \(slowDue\) despawnFarPolice/.test(police) && /if \(slowDue\) updateRoadblocks/.test(police), 'drie scans achter de poort');
// #785: een lege LOS-pot kost alleen de lijncontrole, niet de achtervolging
const chase = police.slice(police.indexOf('function updateChase'), police.indexOf('function pursuitCruise'));
ok(/if \(!polLosBudget\(performance\.now\(\)\)\) v\._losTimer = 0\.05;/.test(chase), 'een lege LOS-pot slaat alleen de lijncontrole over');
ok(!/v\._sees\); return;/.test(chase), 'geen early return meer vóór het pursuit-/bewegingsblok');
const omm = fs.readFileSync(new URL('../game/js/ommelandfun.js', import.meta.url), 'utf8');
ok(!/solidsTick/.test(omm) && /updateEdgeGuard\(dt, w\);\s*refreshSolids\(\);/.test(omm), 'de Ommeland-solids verversen elk beeld (#794)');
console.log(`${n - fails}/${n} perfafrond`);
process.exit(fails ? 1 : 0);
