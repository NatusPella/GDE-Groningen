// #675: de endgame in balans. De revanche-uitdagingen betalen in verhouding tot de missies en Veroverd,
// de Fjord is een investeringslus met een kleinere, voorwaardelijke passieve opbrengst, er is één
// prestige-bord en de Fjord heeft een samen-regel. Pure constanten en regels plus broncontroles.
//   node scripts/endgame_economie_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PG_PRIZE, FJORD_DAY_PAY, FJORD_SHIFT_BONUS } from '../game/js/economy.js';
import { FJORD_DAG_BASIS, FJORD_PASSIEF_DEEL, fjordDagomzet, fjordPassief } from '../game/js/fjordcijfers.js';
import { PRESTIGE, prestigeStand, prestigeTekst } from '../game/js/prestige.js';
import * as S from '../game/js/coopstatus.js';

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };
const read = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

t('#675: de postgame-beloning staat in verhouding tot een missie en Veroverd', () => {
  assert.deepEqual(PG_PRIZE, [0, 500, 1000, 1500]);
  const missieGemiddelde = 24350 / 30;
  assert.ok(PG_PRIZE[3] >= missieGemiddelde, 'goud is minstens een gemiddelde missie');
  assert.ok(PG_PRIZE[3] >= 1000, 'de revanche voelt als een climax');
  assert.equal(PG_PRIZE[0], 0, 'zonder medaille geen geld');
  assert.ok(PG_PRIZE[1] < PG_PRIZE[2] && PG_PRIZE[2] < PG_PRIZE[3], 'de tredes lopen op');
});

t('#675: de Fjord is een investeringslus met een kleine, voorwaardelijke passieve opbrengst', () => {
  assert.equal(fjordDagomzet([]), FJORD_DAG_BASIS);
  assert.equal(fjordPassief([], { open: false }), 0, 'zonder open wagen geen passief geld');
  const kaal = fjordPassief([], { open: true });
  assert.ok(kaal > 0 && kaal < FJORD_DAY_PAY * 2, 'passief is een deel, geen geldautomaat');
  assert.ok(fjordDagomzet(['voorraad', 'avond']) > FJORD_DAG_BASIS, 'upgrades verhogen de dagomzet');
  assert.ok(fjordPassief(['voorraad', 'avond'], { open: true }) > kaal, 'meer investeren geeft meer passief');
  assert.equal(fjordPassief(['voorraad', 'avond'], { open: false }), 0, 'dicht is dicht');
  assert.equal(Math.round(fjordDagomzet(['pan']) * FJORD_PASSIEF_DEEL), fjordPassief(['pan'], { open: true }));
  assert.ok(FJORD_SHIFT_BONUS[3] >= FJORD_SHIFT_BONUS[1], 'de shiftbonus blijft oplopen');
});

t('#675: het prestige-bord telt de grote verzamelingen en zegt wat nog ontbreekt', () => {
  const leeg = prestigeStand({});
  assert.equal(leeg.klaar, false);
  assert.equal(leeg.rijen.length, 4);
  for (const r of leeg.rijen) assert.ok(r.naam && r.tekst);
  const bijna = prestigeStand({ missiesGoud: 30, missiesTotaal: 30, buurten: 66, buurtenTotaal: 66, vissen: 20, vissenTotaal: 24, eierballen: 30, eierballenTotaal: 30 });
  assert.equal(bijna.klaar, false);
  assert.equal(bijna.gedaan, 3);
  assert.match(prestigeTekst(bijna), /nog Alle vissen/);
  const klaar = prestigeStand({ missiesGoud: 30, missiesTotaal: 30, buurten: 66, buurtenTotaal: 66, vissen: 24, vissenTotaal: 24, eierballen: 30, eierballenTotaal: 30 });
  assert.equal(klaar.klaar, true);
  assert.equal(prestigeTekst(klaar), 'Grunn is van jou: alles is gedaan.');
  assert.equal(PRESTIGE.naam, 'Grunn is van jou');
});

t('#675: de Fjord heeft een samen-regel: lokaal, met een eigen wagen en eigen omzet', () => {
  assert.equal(S.samenStatus('minigame', 'pg_foodtruck'), 'deels');
  const k = S.deelsKeuzeVan('fjord');
  assert.ok(k && k.route === 'lokaal');
  assert.match(k.reden, /eigen save|eigen wagen/);
  assert.match(k.reden, /gast/i);
});

t('#675: de bedrading zit in postgame, de Fjord en Te doen', () => {
  const pg = read('postgame.js'), food = read('pg_foodtruck.js'), cijfers = read('fjordcijfers.js'), todo = read('todo.js');
  assert.match(pg, /fjordPassief\(fjordSave\(\)\.upgrades, \{ open: true \}\)/);
  assert.match(pg, /!state\.revealed/);
  assert.match(pg, /ownTruck\(w\)/);
  assert.match(food, /id: 'voorraad'/);
  assert.match(food, /id: 'avond'/);
  assert.match(cijfers, /voorraad: 40/);
  assert.match(cijfers, /FJORD_PASSIEF_DEEL = 0\.35/);
  assert.match(todo, /prestigeItem/);
  assert.match(todo, /prestigeStand\(\{/);
});

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
