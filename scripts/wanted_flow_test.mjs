// State flow of #43: offence -> sight -> star -> chase -> searching -> lost.
//   node scripts/wanted_flow_test.mjs
import { updateOffences, resetOffences, OFFENCE_FINE } from '../game/js/offences.js';
import { reportCrime } from '../game/js/crime.js';
import { profileOf, fitsProfile, decayFactor } from '../game/js/signalement.js';
import { wantedPhase } from '../game/js/wantedstate.js';
let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };
const road = { oneway: true, type: 'primary', speed: 13.9, width: 6, pts: [[-50, 0], [250, 0]] };
const car = { speed: 28, x: 30, y: 0, angle: 0, color: '#7a1f1f', model: { name: 'sedan' } };
const cop = { isPolice: true, x: 30, y: 8, _sees: true, vehicle: true };
const w = {
  time: 100, money: 500, health: 100, wanted: 0, addMessage() {}, police: { searching: false },
  map: { roadsNear: () => [road] }, player: { x: 30, y: 0, inVehicle: car }, vehicles: [car, cop], pedestrians: [],
};
resetOffences();
ok(wantedPhase(w) === 'rustig', 'calm at the start');
let paid = 0;
for (let i = 0; i < 30; i++) { paid += updateOffences(0.1, w, {}); w.time += 0.1; }
ok(paid === OFFENCE_FINE.teHard && w.wanted === 0 && wantedPhase(w) === 'rustig', 'speeding in sight: a fine, no star');
reportCrime(w, 'pedHit', { seen: true });
ok(reportCrime(w, 'pedHit', { seen: true }) && w.wanted === 1, 'a seen crime: a star');
w.wantedProfile = profileOf(w);
ok(wantedPhase(w) === 'achtervolging', 'star and in sight: chase');
w.police.searching = true;
ok(wantedPhase(w) === 'zoeken', 'out of sight: searching');
ok(decayFactor(w.wantedProfile, w) === 1, 'same car: normal decay');
w.player.inVehicle = { speed: 5, color: '#2f3a52', model: { name: 'sedan' } };
ok(!fitsProfile(w.wantedProfile, w) && decayFactor(w.wantedProfile, w) > 1, 'swapped car: faster decay');
w.wanted = 0; w.police.searching = false;
ok(wantedPhase(w) === 'rustig', 'lost: calm again');
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
