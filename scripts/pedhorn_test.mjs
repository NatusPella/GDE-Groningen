// Passanten reageren op de claxon (game/js/pedhorn.js, 22-11).
import { makeHornState, hornTarget, hornLine, markHorned, HORN_LINES, HORN_PED_COOLDOWN_S, HORN_GLOBAL_GAP_S } from '../game/js/pedhorn.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };
const car = { x: 0, y: 0, angle: 0, horn: true };
const ped = (o = {}) => ({ x: 8, y: 0, state: 'wander', ...o });
const h = makeHornState();
ok(hornTarget(h, 10, car, ped(), 0), 'passant recht voor de auto reageert');
ok(!hornTarget(h, 10, car, ped(), 0.9), 'toeval kan nee zeggen');
ok(!hornTarget(h, 10, { ...car, horn: false }, ped(), 0), 'zonder toeter niets');
ok(!hornTarget(h, 10, { ...car, wrecked: true }, ped(), 0), 'wrak toetert niet');
ok(!hornTarget(h, 10, { ...car, isBoat: true }, ped(), 0), 'boot heeft geen claxon voor wandelaars');
ok(!hornTarget(h, 10, car, ped({ x: -8 }), 0), 'wie achter de auto loopt hoort het niet als aanjager');
ok(!hornTarget(h, 10, car, ped({ x: 8, y: 6 }), 0), 'te ver opzij');
ok(!hornTarget(h, 10, car, ped({ x: 1.5 }), 0), 'te dichtbij');
ok(!hornTarget(h, 10, car, ped({ x: 30 }), 0), 'te ver weg');
ok(hornTarget(h, 10, { ...car, angle: Math.PI / 2 }, ped({ x: 0, y: 8 }), 0), 'draait mee met de rijrichting');
for (const k of ['isCop', 'scene', 'ragdoll', 'pose']) ok(!hornTarget(h, 10, car, ped({ [k]: true }), 0), `niet bij ${k}`);
ok(!hornTarget(h, 10, car, ped({ state: 'flee' }), 0), 'niet als iemand vlucht');
{
  const p = ped(); markHorned(h, p, 10);
  ok(!hornTarget(h, 10 + HORN_GLOBAL_GAP_S - 1, car, ped(), 0), 'wereldwijd gat');
  ok(hornTarget(h, 10 + HORN_GLOBAL_GAP_S + 1, car, ped(), 0), 'daarna een andere passant');
  ok(!hornTarget(h, 10 + HORN_GLOBAL_GAP_S + 1, car, p, 0), 'dezelfde passant wacht');
  ok(hornTarget(h, 10 + HORN_PED_COOLDOWN_S + 1, car, p, 0), 'na de afkoeltijd weer');
}
for (let i = 0; i < 30; i++) ok(HORN_LINES.includes(hornLine(i / 30)), 'bekende regel');
ok(HORN_LINES.every((l) => !/de Grunn|sneeuw|winter/i.test(l)), 'constitution');
console.log(fails ? `${fails} van ${n} gefaald` : `OK: ${n} controles`);
process.exit(fails ? 1 : 0);
