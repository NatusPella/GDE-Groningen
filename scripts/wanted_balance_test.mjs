// Balans van het wanted-systeem (#43 stap 7): boetes en de arrestatiekosten blijven klein
// tegenover wat je verdient, en de zwaarte loopt op met de sterren.
//   node scripts/wanted_balance_test.mjs
import { OFFENCE_FINE } from '../game/js/offences.js';
import { bustFine, bustFineIn, isBorrowedMissionCar, SPEED_FINE, platesCost, klusloon } from '../game/js/economy.js';
import { levelOf } from '../game/js/wantedlevels.js';

let bad = 0;
const check = (n, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', n, info); } };
const MEDIAN_REWARD = 550; // de middelste missiebeloning (missions.js)
const sidejob = klusloon(MEDIAN_REWARD);

for (const [k, v] of Object.entries(OFFENCE_FINE)) check(`boete ${k} (€${v}) is minder dan een achtste van een gemiddelde missie`, v <= MEDIAN_REWARD / 8);
check('de boetes lopen niet door elkaar: tegen het verkeer in is de zwaarste', OFFENCE_FINE.tegenVerkeer >= OFFENCE_FINE.roodLicht && OFFENCE_FINE.roodLicht >= OFFENCE_FINE.teHard);
check('de flitspaal is niet duurder dan een agent-boete', Math.max(...SPEED_FINE) <= OFFENCE_FINE.teHard);

// arrestatie: een ster kost €60, nooit meer dan een vijfde van je geld
check('arrestatie kost per ster €60', bustFine(1, 1000) === 60 && bustFine(5, 10000) === 300);
check('arrestatie nooit meer dan een vijfde van je geld', [0, 10, 100, 500].every((m) => bustFine(5, m) <= Math.floor(m * 0.2)));
check('arrestatie op vijf sterren is minder dan een gemiddelde missie', bustFine(5, 1e6) < MEDIAN_REWARD);
// geleende missie-auto: gepakt worden kost geen boete (#306); eigen auto of te voet wel
check('opgepakt in een geleende missie-auto kost niets', bustFineIn(4, 1000, { missionCar: true }) === 0);
check('opgepakt in een eigen of gewone auto of te voet kost de boete', bustFineIn(4, 1000, { missionCar: true, playerOwned: true }) === 200 && bustFineIn(4, 1000, { missionCar: true, isHeroCar: true }) === 200 && bustFineIn(4, 1000, {}) === 200 && bustFineIn(4, 1000, null) === 200 && !isBorrowedMissionCar(null));
check('de nummerborden-kosten blijven onder een gemiddelde missie', platesCost(5) < MEDIAN_REWARD);
check('de klusloon-rekenregel geeft een positief bedrag', sidejob > 0);

// zwaarte loopt op met de sterren
let prev = null;
for (let s = 1; s <= 5; s++) {
  const l = levelOf(s);
  if (prev) check(`${s} sterren is zwaarder dan ${s - 1}`, l.searchRadius > prev.searchRadius && l.cooldown > prev.cooldown && l.copPeds >= prev.copPeds);
  prev = l;
}
check('de afkoeling van één ster is hooguit twintig seconden', levelOf(5).cooldown <= 20);
check('vijf sterren kwijtraken duurt minder dan vier minuten schuilen', (() => { let t = 0; for (let s = 5; s >= 1; s--) t += levelOf(s).loseAfter + levelOf(s).cooldown; return t < 240; })());

console.log(bad ? `${bad} mislukt` : 'wanted_balance: ok');
process.exit(bad ? 1 : 0);
