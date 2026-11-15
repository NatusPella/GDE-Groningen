// #968: de skûtsje-sprint is eerlijk. Jelle vaart nooit harder dan zijn eigen
// zeil (geen magische 4% bij een voorsprong), wacht bij een brug die nog niet
// open is in plaats van erdoorheen te varen, en is een spookschip dat de speler
// niet van de kant duwt. De pure regels staan in pg_skutsje.js (bridgeBefore,
// bridgeWaits, jelleSpeed) en vehicle.js (ghost).
//   node scripts/skutsje_fair_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const { Vehicle, resolveVehicleVehicleCollisions } = await import('../game/js/vehicle.js');
const MB = await import('../game/js/movablebridges.js');
const { bridgeBefore, bridgeWaits, bridgeInTime, jelleSpeed, sailSpeed, sailPolar } = await import('../game/js/pg_skutsje.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// --- een brug op de route: span langs x, water langs y; de boot komt van +y ---
const brug = {
  x: 0, y: 0, ax: -5, ay: 0, bx: 5, by: 0, len: 10, ux: 1, uy: 0, half: 5,
  name: 'Testbrug', state: 'closed', boats: new Map(), still: new Map(), open: 0, boom: 0, t: 0,
};
MB._setBridgesForTest([brug]);
const boot = (y, state) => {
  brug.state = state;
  const v = new Vehicle(0, y, -Math.PI / 2, { kind: 'skutsje', len: 12, wid: 4 });
  v.isBoat = true;
  v.speed = 5;
  return v;
};

const voor = bridgeBefore(boot(10, 'closed'));
ok(voor && voor.w === 5, 'de boot ziet de brug 5 m voor zich', JSON.stringify(voor && voor.w));
ok(bridgeBefore(boot(10, 'open')) !== null, 'ook een open brug blijft een brug op de route');
{
  const v = boot(-10, 'closed'); v.angle = Math.PI / 2; // van de andere kant, naar de brug toe
  ok(bridgeBefore(v) !== null, 'de andere kant op telt ook');
}
ok(bridgeBefore(boot(400, 'closed')) === null, 'ver weg telt niet');
{
  const v = boot(10, 'closed'); v.speed = -5; // achteruit, van de brug af
  ok(bridgeBefore(v) === null, 'wegvarend vraagt hij niets');
}
{
  const v = boot(10, 'closed'); v.x = 40; // naast de vaargeul
  ok(bridgeBefore(v) === null, 'naast de brug vraagt hij niets');
}

// wachten: dichtbij en niet open is wachten; open of ver weg is doorvaren
ok(bridgeWaits('closed', 5) && bridgeWaits('opening', 5) && bridgeWaits('booms', 5), 'dichtbij een dichte of bewegende brug wacht hij');
ok(!bridgeWaits('open', 5), 'een open brug laat hem door');
ok(!bridgeWaits('closed', 40), 'ver van de brug wacht hij niet');
// De aanvraag komt op tijd (binnen de openingstijd) en niet al van 300 m.
ok(bridgeInTime({ w: 100 }, 5) === true, 'op 100 m bij 5 m/s vraagt hij de brug open');
ok(bridgeInTime({ w: 250 }, 5) === false, 'op 250 m vraagt hij nog niets');
ok(bridgeInTime({ w: 40 }, 0) === true, 'stil voor de brug vraagt hij hem alsnog');
ok(bridgeInTime(null, 5) === false, 'zonder brug geen aanvraag');

// --- Jelle's snelheid: nooit boven zijn eigen zeil, en niet omhoog van een gat ---
const DEG = Math.PI / 180;
for (const graad of [20, 50, 90, 130, 170]) {
  const theta = graad * DEG;
  const top = sailSpeed(sailPolar(theta) * 0.85, 0);
  for (const gap of [-200, -40, -25, 0, 20, 41, 200]) {
    ok(jelleSpeed(theta, 0, gap) <= top + 1e-9, `Jelle vaart bij ${graad}° en gat ${gap} niet boven zijn eigen zeil`, String(jelleSpeed(theta, 0, gap)));
  }
  ok(jelleSpeed(theta, 0, -100) >= jelleSpeed(theta, 0, -25), 'een groot gat maakt hem niet sneller dan zijn zeil');
  ok(jelleSpeed(theta, 0, 100) < jelleSpeed(theta, 0, 0), 'ver voor liggen laat hem inhouden');
}

// --- het spookschip: geen contactimpuls, dus geen duw tegen de kant ---
function pair(ghost) {
  const a = new Vehicle(0, 0, 0, { name: 'skutsje', kind: 'skutsje', len: 12, wid: 4, halfLen: 6, halfWid: 2, maxSpeed: 10, accel: 4, brake: 8 });
  const b = new Vehicle(0.5, 0, 0, { name: 'sloep', kind: 'sloep', len: 6, wid: 2, halfLen: 3, halfWid: 1, maxSpeed: 10, accel: 4, brake: 8 });
  a.isBoat = b.isBoat = true;
  a.ghost = ghost;
  a.driver = b.driver = null;
  a.speed = b.speed = 0;
  return [a, b];
}
const gewoon = pair(false);
resolveVehicleVehicleCollisions(gewoon, null);
const geduwd = Math.abs(gewoon[0].x) + Math.abs(gewoon[1].x);
ok(geduwd > 0.01, 'twee boten op dezelfde plek duwen elkaar normaal uit elkaar', String(geduwd));
const spoken = pair(true);
resolveVehicleVehicleCollisions(spoken, null);
ok(spoken[0].x === 0 && spoken[1].x === 0.5 && spoken[0].y === 0 && spoken[1].y === 0, 'een spookschip duwt niemand', JSON.stringify([spoken[0].x, spoken[1].x]));

// --- de race zelf: Jelle's boot is een spookschip ---
const src = fs.readFileSync(new URL('../game/js/pg_skutsje.js', import.meta.url), 'utf8');
ok(/jv\.ghost = true/.test(src), 'Jelle\'s skûtsje is een spookschip');
ok(/bridgeWaits\(voor\.b\.state, voor\.w\)/.test(src), 'Jelle wacht bij een dichte brug');
ok(/requestOpening\(voor\.b, boat\)/.test(src), 'de speler vraagt de brug op tijd open');

console.log(`${n - fails}/${n} skutsje_fair`);
process.exit(fails ? 1 : 0);
