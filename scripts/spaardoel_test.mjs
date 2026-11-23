// Test van spaardoel.js en de economie-invarianten van het verhaal na de balansronde (audit speelbaarheid 23-11).
//   node scripts/spaardoel_test.mjs
import fs from 'node:fs';
import { kiesSpaardoel, eigenTypen, teKoop } from '../game/js/spaardoel.js';
import { MACHINE_CATALOGUS } from '../game/js/percelen.js';
import { SPEC } from '../game/js/machines.js';
import { STEPS, computeMoneyTimeline, START_MONEY } from '../game/js/storyarc.js';

let n = 0, fout = 0;
const ok = (c, m) => { n++; if (!c) { fout++; console.log('FOUT: ' + m); } };

// --- het spaardoel
const ids = Object.keys(MACHINE_CATALOGUS).filter((id) => teKoop(id));
ok(ids.length >= 5, 'er is genoeg te koop om voor te sparen: ' + ids.length);
for (const id of Object.keys(MACHINE_CATALOGUS)) if (MACHINE_CATALOGUS[id].soort === 'machine' && !SPEC[id]) ok(!teKoop(id), `${id}: zonder specificatie niet te koop`);
for (const geld of [0, 500, 1499, 1500, 2100, 5000, 9000, 20000, 37999]) {
  const d = kiesSpaardoel({ geld });
  if (!d) { ok(!ids.some((id) => MACHINE_CATALOGUS[id].koop > geld), `bij €${geld}: geen doel alleen als alles betaalbaar is`); continue; }
  ok(d.prijs > geld, `bij €${geld}: het doel is nog niet betaalbaar (${d.naam}, €${d.prijs})`);
  ok(d.nog === d.prijs - geld && d.pct >= 0 && d.pct <= 99, `bij €${geld}: nog en procent kloppen`);
  ok(!ids.some((id) => MACHINE_CATALOGUS[id].koop > geld && MACHINE_CATALOGUS[id].koop < d.prijs), `bij €${geld}: het goedkoopste doel boven je saldo`);
}
ok(kiesSpaardoel({ geld: 1000, open: false }) === null, 'de boerderij nog dicht: geen spaardoel');
ok(kiesSpaardoel({ geld: NaN }) === null, 'rommel geeft niets');
ok(kiesSpaardoel({ geld: 1e9 }) === null, 'wie alles kan betalen krijgt geen rij');
const goedkoopste = ids.slice().sort((a, b) => MACHINE_CATALOGUS[a].koop - MACHINE_CATALOGUS[b].koop)[0];
ok(kiesSpaardoel({ geld: 0, eigen: [goedkoopste] }).id !== goedkoopste, 'wat je al hebt is geen spaardoel');
ok(kiesSpaardoel({ geld: 0, eigen: ids }) === null, 'alles al gekocht: geen rij');
const bd = { machinepark: { machines: [{ type: 'trekker-klein', bezit: 'gehuurd' }], werktuigen: [{ type: 'ploeg-3' }] } };
ok(JSON.stringify(eigenTypen(bd)) === '["ploeg-3"]', 'een gehuurde machine telt niet als bezit');
ok(eigenTypen(null).length === 0 && eigenTypen({}).length === 0, 'geen boerderij: niets in bezit');

// --- economie-invarianten van het verhaal
const missies = STEPS.filter((s) => s.kind === 'mission');
const beloning = (id) => STEPS.find((s) => s.id === id).reward;
ok(STEPS.filter((s) => s.cost).map((s) => s.id).join() === 'M03', 'de enige verhaalkost blijft Het Loket');
const t = computeMoneyTimeline(START_MONEY);
ok(t.low >= 0, 'het slechtste geval komt nooit onder nul: ' + t.low);
ok(computeMoneyTimeline(START_MONEY, 0.5).low >= 0, 'ook wie elke missie overslaat (50 procent) komt nooit onder nul');
for (const s of missies) if (s.id !== 'M03') ok(s.reward > 0, `${s.id} betaalt iets`);
// geen missie betaalt minder dan een derde van de missie ervoor (de finale M26 en wat erna komt uitgezonderd)
for (let i = 1; i < missies.length; i++) {
  const a = missies[i - 1], b = missies[i];
  if (a.id === 'M26' || a.id === 'M03' || b.id === 'M03') continue;
  ok(b.reward * 3 >= a.reward, `${b.id} (€${b.reward}) betaalt minder dan een derde van ${a.id} (€${a.reward})`);
}
// de balansronde: beloning naar het aantal speelbare stappen (missiebalans_audit)
ok(beloning('M06') >= 500, 'M06 (tien speelbare stappen) betaalt minstens €500');
ok(beloning('M22') >= 500, 'M22 (zeven speelbare stappen) betaalt minstens €500');
ok(beloning('M12') <= 1200, 'M12 (één heli-stap) betaalt hoogstens €1.200');
// de definitie betaalt wat de stap zegt (de volle controle met de wereld staat in storyflow_nieuw_test)
const bron = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
ok(/label: 'Het museum stond er al zo',[\s\S]{0,600}reward: 550,/.test(bron('missions.js')), 'de definitie van M06 betaalt €550');
ok(/reward: 1200, \/\/ audit speelbaarheid/.test(bron('missions_defs.js')), 'de definitie van M12 betaalt €1.200');
ok(/reward: 500, \/\/ audit speelbaarheid/.test(bron('missions_akte5.js')), 'de definitie van M22 betaalt €500');
// Te doen toont het spaardoel, alleen als de boerderij open is
ok(/kiesSpaardoel\(\{ geld: world\.money, eigen: eigenTypen\(bd\), open: revealOpen\(WORLD\.land\) \}\)/.test(bron('todo.js')), 'Te doen leest het spaardoel');

if (fout) { console.log(`spaardoel_test: ${fout} van ${n} fout`); process.exit(1); }
console.log(`spaardoel_test: ${n}/${n} ok`);
