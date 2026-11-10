// #800: de laatste categorieën op de moeilijkheidsstand — regatta, vrij hengelen, CTP-discgolf,
// de vliegschool-noodlanding, de diensten (bord/marge/machinist) en de PvP-rondetijd.
// Standaard houdt exact het oude gedrag; records zijn per stand gescheiden.
//   node scripts/difficulty_activiteiten3_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cleanDifficulty, difficultyRecordKey, scaleTimeLimit } from '../game/js/difficulty.js';
import { CTP_MEDAL_AT, ctpMedalAt, ctpRound } from '../game/js/discgolfext.js';
import { REGATTA, regattaMedaille, regattaMedailleFactoren } from '../game/js/zeilrules.js';
import { beoordeel } from '../game/js/vliegschoolrules.js';
import { MEDAILLE_AT, margeVoorDienst, scaledMedalAt as dienstMedalAt } from '../game/js/simdienst.js';
import { scaledMedalAt as machinistMedalAt, scaledStopTol, scaledPlatformWindow, dienstMedaille } from '../game/js/machinistrules.js';
import { ARENA, arenaStart, arenaTik } from '../game/js/pvparena.js';
import { medailleTeksten } from '../game/js/difficulty_medals.js';

const ROOT = new URL('../', import.meta.url);
const lees = (p) => fs.readFileSync(new URL(p, ROOT), 'utf8');
let n = 0, bad = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { bad++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 4).join('\n   ')); } };
const MODES = ['ontspannen', 'standaard', 'uitdagend'];

t('CTP-discgolf: de puntenmedaille schuift mee, standaard gelijk', () => {
  assert.deepEqual(ctpMedalAt('standaard'), CTP_MEDAL_AT);
  assert.ok(ctpMedalAt('ontspannen')[0] < CTP_MEDAL_AT[0], 'ontspannen: minder punten voor brons');
  assert.ok(ctpMedalAt('uitdagend')[0] > CTP_MEDAL_AT[0], 'uitdagend: meer punten voor brons');
  const std = ctpRound([10, 20, 30]);
  assert.deepEqual(ctpRound([10, 20, 30], 'standaard'), std, 'standaard: dezelfde uitslag');
  assert.ok(ctpRound([10, 20, 30], 'ontspannen').medal >= std.medal, 'ontspannen is niet strenger');
  assert.match(lees('game/js/discgolf.js'), /difficultyRecordKey\(stand, 'discgolf-dichtbij'\)/, 'CTP-record per stand');
});

t('regatta: medaillefactoren op de richttijd schuiven mee, standaard gelijk', () => {
  assert.deepEqual(regattaMedailleFactoren('standaard'), REGATTA.medaille);
  const makkelijk = regattaMedailleFactoren('ontspannen'), streng = regattaMedailleFactoren('uitdagend');
  for (let i = 0; i < makkelijk.length; i++) {
    assert.ok(makkelijk[i] > REGATTA.medaille[i], `ontspannen factor ${i} ruimer`);
    assert.ok(streng[i] < REGATTA.medaille[i], `uitdagend factor ${i} strenger`);
  }
  const reg = { klaar: true, tijd: 260, richttijd: 240 };
  assert.equal(regattaMedaille(reg), regattaMedaille(reg, 'standaard'), 'standaard: dezelfde medaille');
  assert.ok(regattaMedaille(reg, 'ontspannen') <= regattaMedaille(reg, 'standaard'), 'ontspannen is niet strenger (1 = goud)');
  assert.match(lees('game/js/regatta.js'), /difficultyRecordKey\(stand, plas \? PLAS\.record : 'regatta'\)/, 'regattarecord per stand');
});

t('CTP en regatta: records per stand, standaard de oude sleutel', () => {
  for (const id of ['discgolf-dichtbij', 'regatta', 'regatta-plas']) {
    assert.equal(difficultyRecordKey('standaard', id), id);
    assert.notEqual(difficultyRecordKey('ontspannen', id), id);
    assert.notEqual(difficultyRecordKey('uitdagend', id), id);
  }
});

t('vliegschool-noodlanding: de merkradius schaalt mee', () => {
  const les = { id: 'test-nood', grenzen: [1, 2, 3] };
  const baan = { soort: 'nood', kist: 'heli', merk: { r: 10 } };
  const st = (d, zacht = true) => ({ geland: true, inVeld: true, tdKwaliteit: zacht ? 'zacht' : 'hard', tdAfstand: d });
  assert.equal(beoordeel(les, baan, st(10), 'standaard').medaille, 3, 'standaard: binnen de merkradius is goud');
  assert.equal(beoordeel(les, baan, st(12), 'standaard').medaille, 2, 'standaard: 12 m is zilver');
  assert.equal(beoordeel(les, baan, st(12), 'ontspannen').medaille, 3, 'ontspannen: 12 m haalt nog goud');
  assert.equal(beoordeel(les, baan, st(10), 'uitdagend').medaille, 2, 'uitdagend: 10 m is geen goud meer');
});

t('diensten: medailledrempels, marge en machinistvensters per stand', () => {
  assert.deepEqual(dienstMedalAt('standaard'), MEDAILLE_AT);
  assert.ok(dienstMedalAt('ontspannen')[0] < MEDAILLE_AT[0]);
  assert.ok(dienstMedalAt('uitdagend')[0] > MEDAILLE_AT[0]);
  const d = { halten: [{ due: 10 }, { due: 20 }, { due: 30 }] };
  const std = margeVoorDienst(structuredClone(d), 10, 'standaard');
  const makkelijk = margeVoorDienst(structuredClone(d), 10, 'ontspannen');
  const streng = margeVoorDienst(structuredClone(d), 10, 'uitdagend');
  assert.deepEqual(std.halten.map((h) => h.due), [20, 40, 60]);
  assert.ok(makkelijk.halten[2].due > std.halten[2].due, 'ontspannen: meer marge');
  assert.ok(streng.halten[2].due < std.halten[2].due, 'uitdagend: minder marge');
  assert.deepEqual(machinistMedalAt('standaard'), [50, 70, 88]);
  assert.ok(scaledStopTol('ontspannen')[0] > scaledStopTol('standaard')[0], 'ontspannen: ruimere stop');
  assert.ok(scaledPlatformWindow('uitdagend') < scaledPlatformWindow('standaard'), 'uitdagend: korter perronvenster');
  const stdDm = dienstMedaille({ gemiddelde: 70, halten: 10, opTijd: 70, veilig: 70 });
  assert.equal(dienstMedaille({ gemiddelde: 70, halten: 10, opTijd: 70, veilig: 70 }, 'standaard').index, stdDm.index);
  assert.ok(dienstMedaille({ gemiddelde: 70, halten: 10, opTijd: 70, veilig: 70 }, 'ontspannen').index >= stdDm.index);
});

t('vrij hengelen: een record per stand (geen klok/medaille in de vrije modus)', () => {
  const src = lees('game/js/hengelen.js');
  assert.match(src, /difficultyRecordKey\(vrijMode, 'hengelen-vrij'\)/, 'vrij hengelen: record per stand');
  assert.equal(difficultyRecordKey('standaard', 'hengelen-vrij'), 'hengelen-vrij');
  assert.notEqual(difficultyRecordKey('ontspannen', 'hengelen-vrij'), 'hengelen-vrij');
});

t('PvP-arena: de rondetijd schaalt, standaard blijft 150 s', () => {
  assert.equal(scaleTimeLimit(ARENA.rondeS, 'standaard'), 150);
  assert.ok(scaleTimeLimit(ARENA.rondeS, 'ontspannen') > 150);
  assert.ok(scaleTimeLimit(ARENA.rondeS, 'uitdagend') < 150);
  const ar = { zones: [], spawns: [[], []], deeln: [{ slot: 0 }, { slot: 1 }], score: [0, 0], zoneS: [0, 0], fase: 'wacht', t: 0, n: 0, klaarTot: 0, reden: null, r: 20, x: 0, y: 0, rot: 0 };
  assert.equal(arenaStart(ar, 0, 'standaard').ok, true);
  assert.equal(ar.rondeS, 150, 'standaard: de oude ronde');
  ar.t = 149;
  arenaTik(ar, 2, [], 0);
  assert.equal(ar.fase !== 'bezig', true, 'standaard: na 150 s is de ronde klaar');
});

t('de startkaart laat qualitative gevallen met rust', () => {
  for (const id of ['regatta', 'vliegschool', 'machinist', 'hengelen-vrij', 'discgolf-dichtbij']) {
    assert.equal(medailleTeksten(id, 'uitdagend'), null, `${id}: geen numerieke bron, dus vaste tekst`);
  }
});

console.log(bad ? `difficulty_activiteiten3_test: ${n - bad}/${n} ok` : `difficulty_activiteiten3_test: ${n}/${n} ok`);
process.exitCode = bad ? 1 : 0;


