// De ballon in het spel (#1377, L3b): manden bij de lanceerplekken, instappen met E, de rit (brander, klep, camera, HUD), uitstappen op de grond, de beloning per echte
// vlucht, landen op water, en de piloot die wegvalt. Pure test: een nepwereld, geen THREE, geen Electron, nooit echte opslag.
//   node scripts/balloonride_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import * as R from '../game/js/balloonride.js';
import * as VB from '../game/js/vehicle_balloon.js';
import { isAirCraft } from '../game/js/airguide.js';
import { playerBusy } from '../game/js/busy.js';

let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };
const eq = (a, b, m) => { n++; assert.deepEqual(a, b, m); };

const A = VB.EELDE_SITE;
function nepWereld({ x = A.x + 2, y = A.y, water = null } = {}) {
  const keys = new Set(), pressed = new Set();
  const w = {
    time: 0, money: 0, msgs: [], decor: { x: 1, y: 2, z: 250, scripted: false },
    weather: { windAngle: 0.3, windSpeed: 4, active: false, intensity: 0 }, dayNight: { sunElevation: 30, hour: 9 },
    player: { x, y, z: 0, vx: 0, vy: 0, character: 'tammo', inVehicle: null }, companion: { x: x + 1, y, vx: 0, vy: 0, inVehicle: null },
    map: { groundHeightAt: () => 0.5, openSpotNear: (px, py) => ({ x: px, y: py }), waterNear: () => (water ? [water] : []) },
    cinematicHidePlayers: false, cameraOverride: null,
    input: { isDown: (k) => keys.has(k), wasPressed: (k) => pressed.has(k), consume: (k) => pressed.delete(k) },
    addMessage(t) { this.msgs.push(t); },
    hold: (k, on = true) => (on ? keys.add(k) : keys.delete(k)), tap: (k) => pressed.add(k), nieuwFrame: () => pressed.clear(),
  };
  w.balloons = [w.decor];
  return w;
}
const betalingen = [];
const verdien = (w, vak, basis, o) => { betalingen.push({ vak, basis, ...o }); w.money += basis; return basis; };
const start = (w) => { R.initBalloonRide(w, { parkSites: () => [], verdien }); R.ensureCrafts(w); return w; };
const tik = (w, secs, dt = 0.1) => { for (let t = 0; t < secs; t += dt) { w.time += dt; if (w.balloonRide) R.updateBalloonRide(dt, w); else R.updateBalloonCrafts(dt, w); w.nieuwFrame(); } }; // een toets geldt voor één frame, zoals in input.js
const boardAt = (w) => { w.tap('e'); return R.tryBalloonBoard(w); };

// 1) manden bij de lanceerplekken; het decor blijft ongemoeid
{
  const w = start(nepWereld());
  eq(w.balloonCrafts.map((c) => c.siteKey), ['eelde'], 'alleen Eelde ligt binnen bereik');
  const c = w.balloonCrafts[0];
  ok(c.visual && c.visual.scripted && c.visual.playerCraft && w.balloons.includes(c.visual), 'een scripted ingang die skyprops3d tekent');
  ok(w.balloons.includes(w.decor) && w.decor.scripted === false && w.decor.z === 250, 'het decor is niet aangeraakt');
  R.ensureCrafts(w);
  eq(w.balloonCrafts.length, 1, 'een tweede aanroep maakt geen tweede mand');
  w.player.x = VB.DOLLARD_SITE.x; w.player.y = VB.DOLLARD_SITE.y;
  R.ensureCrafts(w);
  eq(w.balloonCrafts.map((c) => c.siteKey), ['dollard'], 'bij de Dollard komt die mand en verdwijnt de lege mand van Eelde, ver weg');
  w.player.x = 0; w.player.y = 0;
  R.ensureCrafts(w);
  eq(w.balloonCrafts.length, 0, 'ver weg: lege manden op de grond verdwijnen');
  ok(w.balloons.length === 1 && w.balloons[0] === w.decor, 'en hun tekening ook');
  const w2 = nepWereld(); R.initBalloonRide(w2, { parkSites: () => [{ x: A.x + 100, y: A.y }, { x: A.x + 5000, y: A.y }], verdien }); R.ensureCrafts(w2);
  eq(w2.balloonCrafts.map((c) => c.siteKey).sort(), ['eelde', 'park0'], 'een open veld uit skyprops.js krijgt ook een mand, een ver veld niet');
}

// 2) de prompt en het instappen
{
  const w = start(nepWereld());
  const p = R.balloonPrompt(w);
  ok(p && p.key === 'E' && p.label === 'Ballon' && !p.dim, 'dichtbij: E, Ballon');
  w.player.x = A.x + 11;
  ok(R.balloonPrompt(w) && R.balloonPrompt(w).dim === false, 'op 11 m nog zichtbaar');
  eq(boardAt(w), false, 'op 11 m is E nog niet voor de ballon (instapafstand 6 m)');
  ok(!w.balloonRide, 'geen rit');
  w.player.x = A.x + 40;
  ok(R.balloonPrompt(w) === null, 'op 40 m geen prompt');
  w.player.x = A.x + 2;
  w.weather.active = true; w.weather.kind = 'storm';
  ok(R.balloonPrompt(w).dim === true, 'bij storm staat de prompt gedimd met een reden');
  eq(boardAt(w), true, 'E bij storm wordt verwerkt');
  ok(!w.balloonRide && w.msgs.some((m) => /weer/.test(m)), 'maar je stapt niet in en leest waarom');
  w.weather.active = false;
  w.mission = { phase: 'active' };
  eq(boardAt(w), true, 'tijdens een missie wordt E ook verwerkt');
  ok(!w.balloonRide && w.msgs.some((m) => /Niet nu/.test(m)), 'maar je stapt niet in');
  w.mission = null;
  eq(boardAt(w), true);
  ok(w.balloonRide && w.balloonRide.craft.driver && w.cinematicHidePlayers === true, 'zonder bezwaar: je zit erin, de speler is verborgen');
  ok(w.balloonRide.craft.driver.slot === 0 && w.balloonRide.craft.passengers.length === 0, 'als piloot');
  ok(playerBusy(w).busy && playerBusy(w).why === 'balloon', 'de speler is bezet voor de rest van het spel (missies en minigames starten niet)');
  ok(isAirCraft(w, { inVehicle: null }), 'de navigatie telt de ballonrit als luchtvaartuig');
  ok(R.balloonPrompt(w) === null, 'in de mand geen prompt');
}

// 3) de rit: brander, klep, camera, lichaam onder de mand, HUD, uitstappen alleen op de grond
{
  const w = start(nepWereld());
  boardAt(w);
  const c = w.balloonRide.craft;
  tik(w, 3);
  ok(c.onGround && c.flight.z === 0, 'zonder brander blijft hij staan');
  w.hold(' ');
  tik(w, 30);
  ok(!c.onGround && c.flight.z > 20, `de brander laat hem stijgen (${c.flight.z.toFixed(0)} m)`);
  ok(Math.hypot(c.x - (A.x + 2 - 2), c.y - A.y) > 10 || c.flight.vx !== 0, 'en de wind voert hem mee');
  ok(w.player.x === c.x && w.player.y === c.y && w.companion.x === c.x, 'het lichaam van de speler en zijn metgezel hangt onder de mand');
  const v = c.visual;
  ok(Math.abs(v.z - (0.5 + c.flight.z)) < 1e-9 && v.x === c.x && v.burn > 0.5 && v.phase === 'float', 'de tekening volgt de mand (grondhoogte erbij), de vlam brandt');
  const cam = w.cameraOverride;
  ok(cam && cam.bron === 'ballon' && cam.cut && cam.position.z > v.z + 5 && Math.hypot(cam.position.x - c.x, cam.position.y - c.y) > 15, 'de camera hangt achter en boven de ballon');
  ok(cam.lookAt.x === c.x && cam.lookAt.z > v.z, 'en kijkt naar de mand');
  const h = R.rideHud(w);
  ok(/stijgend|zwevend/.test(h.regel) && /m ·/.test(h.regel) && !h.toetsen.some((t) => t.wat === 'uitstappen'), 'de HUD zegt hoogte en stand, en uitstappen staat er niet in de lucht');
  w.tap('e'); tik(w, 0.1);
  ok(w.balloonRide, 'E in de lucht stapt niet uit');
  w.hold(' ', false); w.hold('shift');
  tik(w, 120, 0.1);
  ok(c.onGround, 'met de klep open landt hij');
  ok(w.msgs.some((m) => /landing/i.test(m)), 'en je leest hoe de landing was');
  w.hold('shift', false);
  ok(R.rideHud(w).toetsen.some((t) => t.wat === 'uitstappen' && t.k === 'e'), 'op de grond staat uitstappen in de HUD');
  w.tap('e'); tik(w, 0.1);
  ok(!w.balloonRide && w.cinematicHidePlayers === false && w.cameraOverride === null, 'E op de grond stapt uit: speler zichtbaar, camera terug');
  ok(Math.hypot(w.player.x - c.x, w.player.y - c.y) > 1 && w.player.z === 0 && !c.driver && c.passengers.length === 0, 'naast de mand, de mand is vrij');
  ok(!playerBusy(w).busy, 'het spel is weer vrij');
}

// 4) de beloning: een echte vlucht betaalt één keer, een sprongetje niet, een harde landing niet
{
  betalingen.length = 0;
  const w = start(nepWereld());
  boardAt(w);
  const c = w.balloonRide.craft;
  const klim = (m) => { w.hold(' '); for (let t = 0; t < 400 && c.flight.z < m; t += 0.1) tik(w, 0.1); w.hold(' ', false); };
  const zweef = (secs) => { for (let t = 0; t < secs; t += 0.1) { w.hold(' ', c.flight.vz < 0.1 && c.flight.z < 85); tik(w, 0.1); } w.hold(' ', false); };
  const zachtDalen = () => { for (let t = 0; t < 2000 && !c.onGround; t += 0.1) { const f = c.flight; w.hold(' ', f.z <= 40 && f.vz < -1.2); w.hold('shift', f.z > 40 || (f.vz > -0.6 && f.z > 4)); tik(w, 0.1); } w.hold(' ', false); w.hold('shift', false); };
  w.hold(' '); tik(w, 8); w.hold(' ', false); w.hold('shift'); tik(w, 90); w.hold('shift', false);
  ok(c.onGround, 'het hupje is geland');
  eq(betalingen.length, 0, 'een kort hupje (te laag, te kort) betaalt niet');
  // klimmen en dan met de klep open vallen: een harde landing, dus geen loon
  klim(90); zweef(40); w.hold('shift'); for (let t = 0; t < 600 && !c.onGround; t += 0.1) tik(w, 0.1); w.hold('shift', false);
  ok(c.onGround && c.flight.hard >= 1, 'met de klep open uit 90 m is een harde landing');
  eq(betalingen.length, 0, 'een harde landing betaalt niet, ook na een lange vlucht');
  ok(w.msgs.some((m) => /Harde landing/.test(m)), 'en de speler leest het');
  // een echte vlucht: hoog genoeg, lang genoeg, ver genoeg, zacht geland
  klim(90); zweef(40); zachtDalen();
  ok(c.onGround && w.msgs.some((m) => /Zachte landing/.test(m)), 'zacht geland');
  eq(betalingen.length, 1, 'de vlucht is beloond');
  ok(betalingen[0].vak === 'lucht' && betalingen[0].basis === R.REWARD.basis && betalingen[0].xp === R.REWARD.xp && betalingen[0].uniek === 'ballon:eelde', 'in het vak Lucht, met een unieke plek');
  ok(w.msgs.some((m) => /beloond/.test(m)), 'en de speler leest het');
  tik(w, 2);
  eq(betalingen.length, 1, 'staan en wachten betaalt niet nog een keer');
}

// 5) een landing op water: niet uitstappen, wel weer opstijgen
{
  const water = { pts: [[-1e5, -1e5], [1e5, -1e5], [1e5, 1e5], [-1e5, 1e5]] };
  const w = start(nepWereld({ water: null }));
  boardAt(w);
  const c = w.balloonRide.craft;
  w.hold(' '); tik(w, 20); w.hold(' ', false);
  w.map.waterNear = () => [water]; // de wind voert hem boven het water
  w.hold('shift'); for (let t = 0; t < 400 && !c.onGround; t += 0.1) tik(w, 0.1);
  w.hold('shift', false);
  ok(c.onGround && c.opWater, 'geland op water');
  ok(/water/.test(R.rideHud(w).waarschuwing) && !R.rideHud(w).toetsen.some((t) => t.wat === 'uitstappen'), 'de HUD waarschuwt en biedt geen uitstappen aan');
  w.tap('e'); tik(w, 0.1);
  ok(w.balloonRide, 'E doet op het water niets');
  w.hold(' '); tik(w, 20);
  ok(!c.onGround && !c.opWater, 'opnieuw branden tilt hem weer op');
}

// 6) Samen spelen: een gast zit als passagier mee, de piloot valt weg
{
  const w = start(nepWereld());
  boardAt(w);
  const c = w.balloonRide.craft;
  eq(VB.stapIn(c, { x: c.x, y: c.y, slot: 1, gast: true }, w), { ok: true, rol: 'passagier', plaats: 1 }, 'de gast stapt in als passagier');
  w.hold(' '); tik(w, 20); w.hold(' ', false);
  ok(!c.onGround, 'in de lucht');
  eq(R.balloonPilotLeft(w), true, 'de piloot valt weg');
  ok(!w.balloonRide && c.passengers.length === 1 && !c.driver, 'de gast blijft aan boord');
  const z0 = c.flight.z;
  for (let t = 0; t < 600 && !c.onGround; t += 0.1) { w.time += 0.1; R.updateBalloonCrafts(0.1, w); }
  ok(c.onGround, 'en de ballon landt zacht zonder piloot');
  ok(c.flight.hard === 0 && z0 > 0, 'zonder harde landing');
  ok(w.cinematicHidePlayers === false && w.cameraOverride === null, 'het gewone spel krijgt de camera terug');
}

// 7) onbekende of kapotte invoer geeft geen crash
{
  R.updateBalloonCrafts(0.1, null); R.updateBalloonRide(0.1, { balloonRide: null }); R.ensureCrafts(null);
  eq(R.stopBalloonRide({ balloonRide: null }), false);
  eq(R.balloonPrompt({ balloonCrafts: [] }), null);
  eq(R.rideHud({}), null);
  ok(true, 'geen crash');
}

console.log(`balloonride_test: ${n} controles ok`);
