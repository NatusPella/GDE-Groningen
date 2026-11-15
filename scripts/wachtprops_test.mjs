// #963: wachten in een cirkel krijgt aankleding. De keuze van de spullen is
// puur (wachtprops.js) en de missielus zet de kring bij een hold-stap neer en
// haalt hem bij de volgende stap of het einde weer weg.
//   node scripts/wachtprops_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const { waitDressingFor, propSpots } = await import('../game/js/wachtprops.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

ok(waitDressingFor({ label: 'Wacht in de rij tot je nummer komt' }) === 'plant', 'de wachtrij bij het loket krijgt een plant');
ok(waitDressingFor({ label: 'Plant de vlag op het eerste bolwerk', say: 'Blijf op de wal staan' }) === 'ton', 'de wal van Bourtange krijgt tonnen');
ok(waitDressingFor({ label: 'Zet de tafels op het erf' }) === 'baal', 'het erf krijgt balen');
ok(waitDressingFor({ label: 'Leg aan bij de kade' }) === 'kist', 'de kade krijgt kisten');
ok(waitDressingFor({ label: 'Wacht op het perron' }) === 'bank', 'het perron krijgt een bank');
ok(waitDressingFor({}) === 'bank', 'zonder aanwijzing een bank');
ok(waitDressingFor({ label: 'Iets anders' }) === 'bank', 'een onbekende plek valt terug op de bank');
ok(waitDressingFor(null) === 'bank', 'zelfs zonder stap geen crash');

const spots = propSpots(3, 6);
ok(spots.length === 3, 'drie spullen');
ok(spots.every((p) => Math.abs(Math.hypot(p.x, p.y) - 6) < 1e-9), 'alles staat op de kring om het doel');
ok(spots.every((p, i) => spots.every((q, j) => i === j || Math.hypot(p.x - q.x, p.y - q.y) > 2)), 'de spullen staan niet op elkaar');
ok(propSpots(4, 5).length === 4, 'het aantal is instelbaar');

const src = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
ok(/buildWaitDressing\(st, S\.target/.test(src), 'de missielus bouwt de kring bij een hold-stap');
ok(/updateWaitDressing\(S\.wait, st\.time \? Math\.min\(1, S\.hold \/ st\.time\)/.test(src), 'de ring vult met de wachttijd');
ok(/disposeStageDressing\(\)/.test(src), 'de kring wordt opgeruimd');
const wp = fs.readFileSync(new URL('../game/js/wachtprops.js', import.meta.url), 'utf8');
ok(/export function buildWaitDressing/.test(wp) && /export function disposeWaitDressing/.test(wp), 'bouwen en opruimen staan in de module');

console.log(`${n - fails}/${n} wachtprops`);
process.exit(fails ? 1 : 0);
