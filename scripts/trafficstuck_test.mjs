// Pure test van de opruimregel voor vastzittende AI-voertuigen (game/js/vehicle/trafficstuck.js, #1050):
// uit beeld en ver weg gaat een vastzitter weg, voor de ogen van de speler pas na lange tijd.
//   node scripts/trafficstuck_test.mjs
import { stuckClearable, STUCK_S, HARD_S } from '../game/js/vehicle/trafficstuck.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const hidden = { time: 100, pedView: { inView: () => false } };
const seen = { time: 100, pedView: { inView: () => true } };
const car = (o) => ({ x: 0, y: 0, ...o });

ok(!stuckClearable(hidden, car({}), 100), 'een rijdende auto blijft');
ok(!stuckClearable(hidden, car({ stuckFor: STUCK_S - 1 }), 100), 'net niet lang genoeg vast');
ok(stuckClearable(hidden, car({ stuckFor: STUCK_S + 1 }), 100), 'uit beeld en vast: weg');
ok(!stuckClearable(seen, car({ stuckFor: STUCK_S + 1 }), 100), 'in beeld en vast: blijft (de AI heeft nog tijd)');
ok(stuckClearable(seen, car({ stuckFor: HARD_S + 1 }), 100), 'in beeld maar heel lang vast: weg');
ok(!stuckClearable(hidden, car({ stuckFor: STUCK_S + 1 }), 20), 'vlak bij de speler blijft hij, ook uit beeld');
ok(stuckClearable(hidden, car({ stuckFor: STUCK_S + 1 }), 41), 'net buiten 40 m en uit beeld: weg');
ok(stuckClearable(hidden, car({ deadEndBounces: 3 }), 100), 'drie keer op een doodlopend einde gekeerd: weg');
ok(!stuckClearable(seen, car({ deadEndBounces: 3 }), 100), 'idem maar in beeld: nog niet');
ok(!stuckClearable(hidden, car({ waitFor: 50 }), 50), 'wachten dichtbij de speler (kruispunt) blijft');
ok(stuckClearable(hidden, car({ waitFor: 50 }), 80), 'lang wachten ver weg en uit beeld: weg');
ok(!stuckClearable(hidden, car({ stuckFor: 99, wrecked: true }), 200), 'een wrak valt onder de wrakopruiming, niet onder deze regel');
ok(stuckClearable({ time: 0 }, car({ stuckFor: 60 }), 100), 'zonder camera (test, dedicated server) telt alles als uit beeld');
ok(stuckClearable({ time: 5, pedFreeSpawnUntil: 50, pedView: { inView: () => true } }, car({ stuckFor: 60 }), 100), 'pedFreeSpawnUntil (cutscene): geen beeldcheck, dus uit beeld');
console.log(`trafficstuck_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
