// #800-voorstel: één pure bron voor moeilijkheidsstanden. Nog niet aangesloten
// op missies/UI; deze test legt de factoren en de scheiding van records vast.
//   node scripts/difficulty_test.mjs
import {
  DIFFICULTY_MODES, DIFFICULTY_DEFAULT, difficultyFactors, cleanDifficulty,
  scaleTimeLimit, scaleTarget, difficultyRecordKey, combinedTimeFactor,
} from '../game/js/difficulty.js';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

ok(DIFFICULTY_MODES.join() === 'ontspannen,standaard,uitdagend', 'drie standen in vaste orde');
ok(DIFFICULTY_DEFAULT === 'standaard', 'standaard is de veilige stand');
ok(cleanDifficulty('onzin') === 'standaard' && cleanDifficulty(undefined) === 'standaard', 'onzin valt terug op standaard');

const standaard = difficultyFactors('standaard');
ok(standaard.time === 1 && standaard.target === 1 && standaard.damage === 1, 'standaard is exact het huidige gedrag');
ok(difficultyFactors('ontspannen').time > 1 && difficultyFactors('uitdagend').time < 1, 'ontspannen geeft meer tijd, uitdagend minder');
ok(difficultyFactors('ontspannen').target > 1 && difficultyFactors('uitdagend').target < 1, 'de medailledrempel schuift mee');

ok(scaleTimeLimit(60, 'standaard') === 60, 'standaard laat een tijdslimiet staan');
ok(scaleTimeLimit(60, 'ontspannen') > 60, 'ontspannen maakt de limiet ruimer');
ok(scaleTimeLimit(60, 'uitdagend') < 60, 'uitdagend maakt de limiet krapper');
ok(scaleTimeLimit(null, 'uitdagend') === null && scaleTimeLimit(Infinity, 'uitdagend') === Infinity, 'geen limiet blijft geen limiet');

ok(scaleTarget(38, 'standaard') === 38, 'standaard laat een drempel staan');
ok(scaleTarget(38, 'ontspannen', true) > 38, 'een tijddoel wordt makkelijker (hoger)');
ok(scaleTarget(38, 'uitdagend', true) < 38, 'een tijddoel wordt moeilijker (lager)');
ok(scaleTarget(1200, 'ontspannen', false) < 1200, 'een puntendoel wordt makkelijker (lager)');
ok(scaleTarget(1200, 'uitdagend', false) > 1200, 'een puntendoel wordt moeilijker (hoger)');

const keys = DIFFICULTY_MODES.map((m) => difficultyRecordKey(m, 'discgolf'));
ok(new Set(keys).size === 3, 'records zijn per stand gescheiden', keys);
ok(difficultyRecordKey('standaard', 'discgolf') === 'discgolf', 'standaard houdt de bestaande recordsleutel');
ok(difficultyRecordKey('uitdagend', 'discgolf') === 'difficulty:uitdagend:discgolf', 'de andere standen krijgen een prefix');

ok(combinedTimeFactor('standaard', {}) === 1, 'zonder hulp en standaard is de factor 1');
ok(combinedTimeFactor('uitdagend', { helpTime: 'ruim' }) === 0.85 * 1.5, 'hulp stapelt op de stand');

console.log(fails ? `${fails} FAIL` : 'difficulty_test ok');
process.exit(fails ? 1 : 0);
