// Een filmauto rijdt niemand omver (#1020, beeldcheck 21-11: 'de taxi van de rit heeft een deukerig model met een rode vlek op de neus').
// De taxi van de rit (reisrit3d.js) is een echt voertuig met driver 'cine': op snelheid gooide hij een voetganger omver (met bloed,
// in een filmscene) en het verkeer botste ertegen. Nu duwt een filmauto een voetganger opzij zoals een langzame auto, en botst het
// verkeer niet met de taxi van de rit (ghost).
//   node scripts/filmauto_voetganger_test.mjs
import './node3d.mjs';
import { readFileSync } from 'node:fs';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const { vehicleKnocksPed } = await import('../game/js/pedestrians.js');

ok(vehicleKnocksPed({ speed: 14, driver: null }), 'een AI-auto op 14 m/s rijdt een voetganger omver (zoals altijd)');
ok(vehicleKnocksPed({ speed: -9, driver: 'player' }), 'de speler achteruit op 9 m/s ook');
ok(!vehicleKnocksPed({ speed: 2, driver: null }), 'langzaam duwt alleen opzij');
ok(!vehicleKnocksPed({ speed: 14, driver: null, wrecked: true }), 'een wrak duwt alleen opzij');
ok(!vehicleKnocksPed({ speed: 14, driver: 'cine' }), 'een filmauto (taxirit, intro, respawn) op 14 m/s duwt alleen opzij');
ok(!vehicleKnocksPed({ speed: 30, driver: 'cine' }), 'ook op 30 m/s');

// de taxi van de rit: driver 'cine' en ghost, zodat het verkeer er niet tegenaan botst (vehicle.js resolveVehicleVehicleCollisions)
const rit = readFileSync(new URL('../game/js/reisrit3d.js', import.meta.url), 'utf8');
ok(/driver: 'cine'[^}]*ghost: true/.test(rit), 'reisrit3d.js zet de taxi van de rit op driver cine en ghost');
const veh = readFileSync(new URL('../game/js/vehicle.js', import.meta.url), 'utf8');
ok(/if \(a\.ghost \|\| b\.ghost\) continue;/.test(veh), 'vehicle.js slaat een ghost over bij botsingen tussen voertuigen');
const peds = readFileSync(new URL('../game/js/pedestrians.js', import.meta.url), 'utf8');
ok(/if \(!vehicleKnocksPed\(v\)\)/.test(peds), 'checkVehicleImpact gebruikt vehicleKnocksPed');

console.log(`filmauto_voetganger_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
