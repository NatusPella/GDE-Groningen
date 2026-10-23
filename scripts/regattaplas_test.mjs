// De zeilwedstrijd op de Hoornse Plas (#399, regattaplas.js): de baan, de richttijd, de beloning en de keuze van de plek. Puur.
//   node scripts/regattaplas_test.mjs
import { PLAS, plasBaan, baanLengte, plasBeloning, kiesPlek } from '../game/js/regattaplas.js';
import { richtTijd, kiesBaan } from '../game/js/regattabaan.js';
import { createRegatta, stepRegatta, regattaMedaille, REGATTA } from '../game/js/zeilrules.js';
import { maakBots, stepBots } from '../game/js/regattabots.js';

let n = 0, bad = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const baan = plasBaan();
check('vijf tonnen op een cirkel van 130 m', baan.length === 5 && baan.every((t) => Math.abs(Math.hypot(t.x - PLAS.x, t.y - PLAS.y) - PLAS.straal) < 0.1));
check('de baan ligt vast (twee keer dezelfde)', JSON.stringify(baan) === JSON.stringify(plasBaan()));
check('de eerste ton ligt aan de zuidkant', baan[0].y < PLAS.y - 100 && Math.abs(baan[0].x - PLAS.x) < 1);
let kortste = 1e9;
for (let i = 0; i < baan.length; i++) { const a = baan[i], b = baan[(i + 1) % baan.length]; kortste = Math.min(kortste, Math.hypot(a.x - b.x, a.y - b.y)); }
check('de tonnen liggen ver genoeg uit elkaar om ze te ronden (ronde straal 20 m)', kortste > 100, kortste.toFixed(0));

// de lengte en de tijd
const omtrek = baanLengte(baan), totaal = baanLengte(baan, PLAS.rondes);
const stad = kiesBaan(0, 0, () => true), stadTotaal = baanLengte(stad.tonnen, REGATTA.rondes);
check('de baan is 2 tot 3 keer zo lang als die van de stad', totaal / stadTotaal > 2 && totaal / stadTotaal < 3, (totaal / stadTotaal).toFixed(2));
const richt = richtTijd(baan, PLAS.rondes, PLAS.snelheid);
check('de richttijd is 5 tot 10 minuten', richt > 300 && richt < 600, String(richt));
check('de richttijd rekent met de snelheid en de ronden', richt === Math.round((omtrek * PLAS.rondes) / PLAS.snelheid));

// de beloning is eerlijk: oplopend met de medaille, niets zonder, per meter hooguit twee keer die van de stad
const bel = [0, 1, 2, 3].map((m) => plasBeloning(m));
check('geen medaille geen geld', bel[0].geld === 0);
check('de beloning loopt op met de medaille', bel[1].geld > 0 && bel[2].geld > bel[1].geld && bel[3].geld > bel[2].geld);
check('en de loopbaanpunten ook', bel[1].xp > bel[0].xp && bel[3].xp > bel[2].xp);
const stadGoud = 40;
check('goud betaalt meer dan goud in de stad, maar niet meer dan het evenredige deel', bel[3].geld > stadGoud && bel[3].geld <= stadGoud * (totaal / stadTotaal) * 1.1, `${bel[3].geld} tegenover ${stadGoud} bij ${(totaal / stadTotaal).toFixed(1)} keer de lengte`);
check('de beloning van een medaille buiten het bereik valt terug op goud of niets', plasBeloning(9).geld === bel[3].geld && plasBeloning(-1).geld === 0);

// de plek kiezen
const havens = [{ id: 0, name: 'Jachthaven Test', x: 0, y: 0 }, { id: 1, name: 'Tweede haven', x: 5000, y: 5000 }];
check('bij een haven kiest hij de haven', kiesPlek(havens, 30, 40).m.name === 'Jachthaven Test');
check('midden op de plas kiest hij de plas', kiesPlek(havens, PLAS.x, PLAS.y).m.plas === true);
check('op de rand van de baan nog de plas', !!kiesPlek(havens, PLAS.x + PLAS.reik - 5, PLAS.y));
check('buiten het bereik niets', kiesPlek(havens, PLAS.x + PLAS.reik + 5, PLAS.y) === null);
check('zonder havens werkt de plas ook', kiesPlek(null, PLAS.x, PLAS.y + 10).m.plas === true);
check('een haven die dichterbij is wint', kiesPlek([{ id: 9, name: 'Steiger', x: PLAS.x + 20, y: PLAS.y }], PLAS.x + 20, PLAS.y).m.name === 'Steiger');

// een hele wedstrijd met de regels van het spel: de baan is te varen, de medaille hangt aan de tijd
const reg = createRegatta(baan, { rondes: PLAS.rondes, richttijd: richt });
let t = 0;
for (let ronde = 0; ronde < PLAS.rondes; ronde++) for (const ton of baan) { stepRegatta(reg, ton.x, ton.y, richt / (PLAS.rondes * baan.length)); t += richt / (PLAS.rondes * baan.length); }
check('twee ronden langs vijf tonnen op de richttijd geeft goud', reg.klaar && reg.gerond === 10 && regattaMedaille(reg) === 1, JSON.stringify([reg.klaar, reg.gerond, regattaMedaille(reg)]));
const traag = createRegatta(baan, { rondes: PLAS.rondes, richttijd: richt });
for (let ronde = 0; ronde < PLAS.rondes; ronde++) for (const ton of baan) stepRegatta(traag, ton.x, ton.y, richt * 1.3 / 10);
check('1,3 keer de richttijd geeft zilver, 1,7 keer niets', regattaMedaille(traag) === 3 && (() => { const z = createRegatta(baan, { rondes: PLAS.rondes, richttijd: richt }); for (let r = 0; r < PLAS.rondes; r++) for (const ton of baan) stepRegatta(z, ton.x, ton.y, richt * 1.7 / 10); return regattaMedaille(z) === 0; })());

// de bots varen de baan ook uit (zij volgen dezelfde tonnen en rondes)
const bots = maakBots(baan, PLAS.bots);
check('vier bots', bots.length === PLAS.bots);
const wind = { dir: 1.0, speed: 5 };
for (let s = 0; s < 3000 && !bots.every((b) => b.klaar); s += 0.1) stepBots(bots, baan, wind, 0.1, s, PLAS.rondes);
check('de bots komen binnen een redelijke tijd (hooguit 25 minuten) over de finish', bots.every((b) => b.klaar && b.tijd < 1500) , JSON.stringify(bots.map((b) => b.tijd && Math.round(b.tijd))));

console.log(bad ? `${bad} van ${n} mislukt` : `regattaplas_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
