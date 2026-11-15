// #955: een race krijgt aankleding: finishboog, pylonen, hekken en publiek.
// De opstelling is puur (racedecor.js) en de missielus zet hem bij een
// race-stap neer en ruimt hem bij de volgende stap of het einde op.
//   node scripts/racedecor_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const { raceDecorPlan } = await import('../game/js/racedecor.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const plan = raceDecorPlan();
ok(plan.poles.length === 2, 'twee palen voor de finishboog');
ok(plan.poles.every((p) => p.side === 0), 'de palen staan op de finishlijn');
ok(plan.poles[0].along < 0 && plan.poles[1].along > 0, 'aan weerszijden van het midden');
ok(plan.cones.length >= 8, 'pylonen langs de baan', String(plan.cones.length));
ok(plan.cones.some((c) => c.side < 0) && plan.cones.some((c) => c.side > 0), 'pylonen aan beide kanten');
ok(plan.people.length >= 6, 'er staat publiek', String(plan.people.length));
ok(plan.people.every((p) => Math.abs(p.side) > 8), 'het publiek staat achter de hekken, niet op de baan');
ok(new Set(plan.people.map((p) => p.along.toFixed(1))).size >= 6, 'het publiek staat verspreid');
ok(plan.barriers.length === 2, 'twee hekken');
ok(raceDecorPlan({ count: 2 }).cones.length === 4 && raceDecorPlan({ count: 99 }).cones.length === 20, 'het aantal pylonen is begrensd');

// De afstanden zijn in meters en passen bij een weg van twee rijstroken.
ok(Math.max(...plan.people.map((p) => p.side)) < 14 && Math.min(...plan.people.map((p) => p.side)) > 8, 'het publiek staat dichtbij maar veilig');

const mj = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
const rd = fs.readFileSync(new URL('../game/js/racedecor.js', import.meta.url), 'utf8');
ok(/buildRaceDecor\(world, \{ \.\.\.S\.finish/.test(mj), 'de finish krijgt decor in de missielus');
ok(/buildRaceDecor\(world, \{ \.\.\.def\.start/.test(mj), 'de start krijgt een startdoek');
ok(/disposeRaceDecor\(g\)/.test(mj), 'het decor wordt opgeruimd');
ok(/export function buildRaceDecor/.test(rd) && /export function disposeRaceDecor/.test(rd), 'bouwen en opruimen staan in de module');

console.log(`${n - fails}/${n} racedecor`);
process.exit(fails ? 1 : 0);
