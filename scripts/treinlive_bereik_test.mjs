// Live treinen vragen alleen op als het ook gebruikt wordt (review 22-11): niet in Samen spelen (coopRole) en niet ver van elk station.
//   node scripts/treinlive_bereik_test.mjs
import * as S from '../game/js/stationlife.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const stations = [{ name: 'Alpha', x: 0, y: 0, lijnen: [] }, { name: 'Beta', x: 12000, y: 0, lijnen: [] }];
const mag = S.shouldPollLiveTrains;
check('functie bestaat', typeof mag === 'function');
if (typeof mag === 'function') {
  check('alleen spelen, bij een station: opvragen', mag({}, stations, 100, 0) === true);
  check('alleen spelen, ver van elk station: niet opvragen', mag({}, stations, 6000, 0) === false);
  check('Samen spelen (host): nooit opvragen', mag({ coopRole: 'host' }, stations, 10, 0) === false);
  check('Samen spelen (gast): nooit opvragen', mag({ coopRole: 'guest' }, stations, 10, 0) === false);
  check('nog geen stations bekend: niet opvragen', mag({}, null, 0, 0) === false && mag({}, [], 0, 0) === false);
  check('rand: net binnen en net buiten het bereik', mag({}, stations, S.LIVE_R - 1, 0) === true && mag({}, stations, S.LIVE_R + 1, 0) === false);
}
console.log(bad ? `${bad} van ${n} controles mislukt` : `ok: ${n} controles`);
process.exit(bad ? 1 : 0);
