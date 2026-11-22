// Passanten groeten de speler te voet (game/js/pedgreet.js, 22-11).
import { makeGreetState, canGreet, greetOutcome, markGreeted, GREET_LINES, GREET_PED_COOLDOWN_S, GREET_GLOBAL_GAP_S, GREET_MAX_PLAYER_SPEED } from '../game/js/pedgreet.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };
const player = { x: 0, y: 0, speed: 1.5, inVehicle: null };
const ped = (o = {}) => ({ x: 4, y: 0, state: 'wander', ...o });
const g = makeGreetState();
ok(canGreet(g, 10, ped(), player, { roll: 0 }), 'rustige passant op 4 m groet');
ok(!canGreet(g, 10, ped(), player, { roll: 0.9 }), 'toeval bepaalt: hoge worp geen groet');
ok(!canGreet(g, 10, ped({ x: 1 }), player, { roll: 0 }), 'te dichtbij');
ok(!canGreet(g, 10, ped({ x: 20 }), player, { roll: 0 }), 'te ver');
ok(!canGreet(g, 10, ped(), { ...player, inVehicle: {} }, { roll: 0 }), 'niet als de speler rijdt');
ok(!canGreet(g, 10, ped(), { ...player, speed: GREET_MAX_PLAYER_SPEED + 1 }, { roll: 0 }), 'niet bij sprinten');
ok(!canGreet(g, 10, ped(), player, { roll: 0, wanted: 1 }), 'niet bij wanted');
ok(!canGreet(g, 10, ped(), player, { roll: 0, armed: true }), 'niet bij getrokken wapen');
for (const k of ['isCop', 'scene', 'ragdoll', 'pose', 'carry']) ok(!canGreet(g, 10, ped({ [k]: true }), player, { roll: 0 }), `niet bij ${k}`);
ok(!canGreet(g, 10, ped({ state: 'flee' }), player, { roll: 0 }), 'niet terwijl iemand vlucht');
ok(!canGreet(g, 10, ped({ speechUntil: 12 }), player, { roll: 0 }), 'niet midden in een zin');
{
  const p = ped(); markGreeted(g, p, 10);
  ok(!canGreet(g, 10 + GREET_GLOBAL_GAP_S - 1, ped(), player, { roll: 0 }), 'wereldwijd gat: geen koor');
  ok(canGreet(g, 10 + GREET_GLOBAL_GAP_S + 1, ped(), player, { roll: 0 }), 'daarna weer een andere passant');
  ok(!canGreet(g, 10 + GREET_GLOBAL_GAP_S + 1, p, player, { roll: 0 }), 'dezelfde passant wacht');
  ok(canGreet(g, 10 + GREET_PED_COOLDOWN_S + 1, p, player, { roll: 0 }), 'na de afkoeltijd mag dezelfde weer');
}
{
  const a = greetOutcome(5, 0.1, 0.5), b = greetOutcome(5, 0.9, 0.5);
  ok(a.until > 5 && GREET_LINES.includes(a.line), 'zwaai met regel');
  ok(b.line === null && b.until === a.until, 'soms alleen zwaaien');
  for (let i = 0; i < 40; i++) { const o = greetOutcome(0, 0, i / 40); ok(GREET_LINES.includes(o.line), 'regel is bekend'); }
}
ok(GREET_LINES.every((l) => !/de Grunn|sneeuw|winter/i.test(l)), 'regels volgen de constitution');
console.log(fails ? `${fails} van ${n} gefaald` : `OK: ${n} controles`);
process.exit(fails ? 1 : 0);
