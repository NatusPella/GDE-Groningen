// Test van de achtervolgers (game/js/chaserlook.js): rol -> uiterlijk, gedrag en kaartmarkering, en dat ze niet ontdekbaar zijn.
import { CHASER_ROLES, roleOfModelName, eerlijkeCruise, CRUISE_MAX, markChaser, isChaser, ontdekbaar, chaserMarkers, GEVAAR_ROL } from '../game/js/chaserlook.js';
import { stockKeyOf } from '../game/js/garageknown.js';
import { buildMissionLayer, ROLES } from '../game/js/missionmap.js';
import { VOERTUIG_MODELLEN } from '../game/js/coopworld.js';
import fs from 'node:fs';

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL ' + m); } };

// uiterlijk: elke rol met een eigen model gebruikt een model dat een eigen mesh heeft en de gast kent (geen los 'limo')
for (const [role, spec] of Object.entries(CHASER_ROLES)) {
  if (!spec.model) continue;
  ok(spec.model.name === 'trekkerlimo', role + ': model is de trekker-limo');
  ok(VOERTUIG_MODELLEN.includes(spec.model.name), role + ': de gast kent het model');
  ok(/^#[0-9a-f]{6}$/i.test(spec.model.color), role + ': vaste donkere kleur');
}
ok(!fs.readFileSync(new URL('../game/js/convoy.js', import.meta.url), 'utf8').includes("name: 'limo'"), 'convoy.js gebruikt geen model "limo" meer');
ok(roleOfModelName('trekkerlimo') === 'limoVlucht' && roleOfModelName('truck') === 'tankwagen' && roleOfModelName('escort') === 'escapade' && roleOfModelName('sedan') === null, 'rol uit modelnaam');

// gedrag: eerlijk, geen onmogelijke snelheid
ok(eerlijkeCruise(99, 100) === CRUISE_MAX, 'cruise begrensd op CRUISE_MAX');
ok(eerlijkeCruise(17, 15) <= 15 * 0.85 + 1e-9, 'cruise onder het deel van de topsnelheid');
ok(eerlijkeCruise(NaN, 40) === 14 && eerlijkeCruise(1, 40) === 6, 'terugval en ondergrens');
for (const [role, spec] of Object.entries(CHASER_ROLES)) ok(eerlijkeCruise(spec.cruise, spec.model && spec.model.maxSpeed) <= CRUISE_MAX, role + ': cruise redelijk');

// markeren: rol en cruise op het voertuig; niet ontdekbaar en geen winkelsleutel
const limo = { x: 10, y: 20, model: { name: 'trekkerlimo', maxSpeed: 30 }, aiOpts: { chase: true, cruise: 40 } };
markChaser(limo, 'limoColonne');
ok(isChaser(limo) && limo.aiOpts.cruise <= CRUISE_MAX, 'markChaser zet rol en begrenst cruise');
ok(!ontdekbaar(limo), 'achtervolger is niet ontdekbaar');
ok(stockKeyOf(limo) === null, 'achtervolger heeft geen winkelsleutel (telt niet voor garage-ontdekt)');
const gewoon = { x: 0, y: 0, model: { name: 'hatch' } };
ok(ontdekbaar(gewoon) && !isChaser(gewoon), 'gewoon verkeer blijft ontdekbaar');
markChaser(gewoon, 'bestaatniet');
ok(!isChaser(gewoon), 'onbekende rol doet niets');

// kaart: alleen gevaarlijke achtervolgers, als bedreiging (gevaarkleur)
const vloot = [
  limo,
  { x: 1, y: 1, chaserRole: 'limoVlucht', model: {} },
  { x: 2, y: 2, chaserRole: 'limoAchter', wrecked: true, model: {} },
  { x: 3, y: 3, chaserRole: 'limoAchter', model: {} },
  gewoon,
];
const marks = chaserMarkers(vloot);
ok(marks.length === 2 && marks.every((m) => m.role === GEVAAR_ROL), 'twee gevaarlijke achtervolgers op de kaart, niet de gewonde en niet het vluchtdoel');
ok(ROLES[GEVAAR_ROL].kind === 'mm-gevaar', 'de bedreigingsrol is het gevaaricoon');
const laag = buildMissionLayer({ player: { x: 0, y: 0, angle: 0 }, mission: { type: 'goto', label: 'Test', phase: 'active', marker: { x: 100, y: 0 } }, chasers: marks });
ok(laag && laag.items.some((i) => i.role === 'threat' && i.sub === 'Achtervolger'), 'de laag toont de achtervolger als bedreiging');

console.log(`chaserlook_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
