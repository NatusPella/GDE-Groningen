// De ballon als voertuig (#1377, L3b): instappen, vliegen, uitstappen, gast als passagier, piloot valt weg.
//   node scripts/ballonrit_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import * as V from '../game/js/vehicle_balloon.js';
import { isAirCraft } from '../game/js/airguide.js';
import { weigerReden, magBesturen, BESTUUR_TEKST } from '../game/js/coopbestuur.js';
import { kanUitstappen } from '../game/js/coopgast.js';
import { SLOTS } from '../game/js/basketrider.js';

let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };
const eq = (a, b, m) => { n++; assert.deepEqual(a, b, m); };
const world = (extra = {}) => ({ weather: { windAngle: 0, windSpeed: 4, active: false, intensity: 0 }, dayNight: { sunElevation: 30, hour: 9 }, ...extra });
const site = { id: 'park0', x: 500, y: -300 };
const naast = (extra = {}) => ({ x: 502, y: -300, slot: 0, ...extra });
const vlieg = (c, input, secs, w) => { for (let t = 0; t < secs; t += 0.1) V.stepBalloonCraft(c, input, 0.1, w); };

// 1) de ballon is een luchtvaartuig voor de navigatie, het decor blijft ongemoeid
{
  const c = V.makeBalloonCraft(site);
  ok(isAirCraft({}, { inVehicle: c }), 'isAirCraft herkent de ballon');
  ok(!isAirCraft({}, { inVehicle: { isBoat: true } }), 'een boot nog steeds niet');
  const w = world({ balloons: [{ x: 1, y: 2, z: 200 }] });
  V.stepBalloonCraft(c, { burn: true }, 0.1, w);
  eq(w.balloons, [{ x: 1, y: 2, z: 200 }], 'world.balloons (decor) is niet aangeraakt');
  ok(c.model.name === 'ballon' && c.onGround && c.z === 0, 'staat op de grond');
}

// 2) instappen: dichtbij, op de grond, goed weer, daglicht
{
  const c = V.makeBalloonCraft(site);
  eq(V.kanInstappen(c, naast(), world()), { ok: true, rol: 'piloot' }, 'eerste speler wordt piloot');
  ok(V.kanInstappen(c, { x: 560, y: -300 }, world()).reden === 'ver', 'te ver');
  ok(V.kanInstappen(c, naast(), world({ weather: { active: true, kind: 'storm' } })).reden === 'weer', 'onweer: niet op');
  ok(V.kanInstappen(c, naast(), world({ weather: { active: true, intensity: 0.5 } })).reden === 'weer', 'harde regen: niet op');
  ok(V.kanInstappen(c, naast(), world({ dayNight: { sunElevation: -5 } })).reden === 'nacht', 'in het donker: niet op');
  ok(V.kanInstappen(c, naast(), { }).ok, 'zonder weerdata mag het');
  ok(V.kanInstappen(null, naast(), world()).ok === false, 'geen ballon: geen instap');
}

// 3) vliegen: de brander stijgt, de wind voert hem mee, het voertuig volgt het model
{
  const c = V.makeBalloonCraft(site);
  ok(V.stapIn(c, naast(), world()).rol === 'piloot', 'piloot aan boord');
  ok(V.kanInstappen(c, naast({ slot: 3 }), world()).ok, 'plaats 2 is vrij');
  vlieg(c, { burn: true }, 25, world());
  ok(c.z > 20 && !c.onGround, 'stijgt');
  ok(V.kanInstappen(c, naast({ slot: 3 }), world()).reden === 'lucht', 'in de lucht stap je niet in');
  vlieg(c, {}, 20, world());
  ok(c.x > 500 + 20, 'oostwind: de mand drijft oost op');
  ok(c.speed > 1 && c.angle < 1 && c.angle > -1, 'snelheid en koers uit de drift');
  ok(V.ballonHud(c).tekst.includes('m') && /brandstof/.test(V.ballonHud(c).tekst), 'HUD-regel');
}

// 4) twee plaatsen: piloot en één passagier; een derde past niet
{
  const c = V.makeBalloonCraft(site);
  V.stapIn(c, naast(), world());
  eq(V.stapIn(c, naast({ slot: 1, gast: true }), world()).rol, 'passagier', 'gast stapt in als passagier');
  ok(V.kanInstappen(c, naast({ slot: 2 }), world()).reden === 'vol', 'de mand zit vol');
  eq(SLOTS.length, 2, 'de mand heeft twee plaatsen');
  const pos = V.inzittendePosities(c, 0, 1);
  ok(pos.length === 2 && pos[0].rol === 'piloot' && pos[1].rol === 'passagier', 'beide staan in de mand');
  ok(pos.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z)) && (pos[0].x !== pos[1].x || pos[0].y !== pos[1].y), 'eindig en niet op dezelfde plek');
}

// 5) een gast is nooit piloot: zonder piloot stapt hij niet in, met piloot als passagier
{
  const c = V.makeBalloonCraft(site);
  eq(V.kanInstappen(c, naast({ slot: 1, gast: true }), world()).reden, 'geenPiloot', 'gast zonder piloot: niet');
  ok(!magBesturen(c, 1) && weigerReden(c, 1) === 'niet', 'coopbestuur: een gast bestuurt de ballon niet');
  ok(weigerReden(c, 0) === 'niet', 'ook niet als gewoon voertuig (de brander is geen stuur)');
  ok(/ballon/.test(BESTUUR_TEKST.ballon) && /gast/.test(BESTUUR_TEKST.ballon), 'er is een eigen melding in het Nederlands');
}

// 6) uitstappen alleen op de grond, voor iedereen
{
  const c = V.makeBalloonCraft(site);
  V.stapIn(c, naast(), world()); V.stapIn(c, naast({ slot: 1, gast: true }), world());
  ok(kanUitstappen(c) && c.onGround, 'op de grond kan uitstappen (coopgast.kanUitstappen)');
  vlieg(c, { burn: true }, 20, world());
  ok(!c.onGround && c.speed < 2 + 10, 'in de lucht');
  c.speed = 0; // zweeft stil: toch blijft de gast aan boord
  ok(!kanUitstappen(c), 'in de lucht blijft de gast aan boord, ook bij stilstand');
  eq(V.stapUit(c, 1).reden, 'uitLucht', 'stapUit weigert in de lucht');
  ok(c.passengers.length === 1, 'de passagier zit er nog');
}

// 7) de piloot stapt uit op de grond: een eigen medespeler neemt de brander, een los gast gaat mee uit
{
  const c = V.makeBalloonCraft(site);
  V.stapIn(c, naast(), world()); V.stapIn(c, naast({ slot: 2 }), world());
  ok(V.stapUit(c, 0).ok && c.driver && c.driver.slot === 2 && c.passengers.length === 0, 'de volgende speler wordt piloot');
  const d = V.makeBalloonCraft(site);
  V.stapIn(d, naast(), world()); V.stapIn(d, naast({ slot: 1, gast: true }), world());
  V.stapUit(d, 0);
  ok(d.driver === null && d.passengers.length === 0, 'alleen een gast over: iedereen stapt uit');
  ok(V.stapUit(d, 9).ok === false, 'wie er niet zit kan niet uitstappen');
}

// 8) de piloot valt weg in de lucht: de gast blijft aan boord en de ballon landt zacht
{
  const c = V.makeBalloonCraft(site);
  V.stapIn(c, naast(), world()); V.stapIn(c, naast({ slot: 1, gast: true }), world());
  vlieg(c, { burn: true }, 30, world());
  vlieg(c, {}, 5, world());
  ok(!c.onGround && c.z > 15, 'hij hangt in de lucht');
  V.pilootWeg(c);
  ok(c.driver === null && c.passengers.length === 1, 'de gast blijft aan boord');
  const harde = [];
  for (let t = 0; t < 900 && !c.onGround; t += 0.1) { for (const e of V.stepBalloonCraft(c, { burn: true }, 0.1, world())) if (e.type === 'geland' && e.hard) harde.push(e); }
  ok(c.onGround, 'hij is geland zonder piloot (invoer van de piloot telt niet meer)');
  ok(harde.length === 0 && c.flight.hard === 0, 'een zachte landing');
  ok(V.stapUit(c, 1).ok && c.passengers.length === 0, 'daarna stapt de gast uit');
}

// 9) de piloot valt weg op de grond: iedereen stapt uit
{
  const c = V.makeBalloonCraft(site);
  V.stapIn(c, naast(), world()); V.stapIn(c, naast({ slot: 1, gast: true }), world());
  V.pilootWeg(c);
  ok(!c.driver && c.passengers.length === 0, 'op de grond: leeg');
}

// 10) later aansluiten: wie na de start komt stapt niet in de lucht in, wel na de landing
{
  const c = V.makeBalloonCraft(site);
  V.stapIn(c, naast(), world());
  vlieg(c, { burn: true }, 20, world());
  ok(V.kanInstappen(c, naast({ slot: 1, gast: true }), world()).reden === 'lucht', 'te laat: hij is al weg');
  vlieg(c, {}, 600, world());
  c.x = 500; c.y = -300; // de mand staat weer bij de plek (de test verplaatst hem, de regel kijkt naar afstand)
  ok(c.onGround, 'geland');
  ok(V.kanInstappen(c, naast({ slot: 1, gast: true }), world()).ok, 'na de landing kan een gast aansluiten als passagier');
}

// 11) brandstof: tanken alleen aan de grond
{
  const c = V.makeBalloonCraft(site, { fuel: 0.5 });
  ok(V.tankOp(c) && c.flight.fuel === 1, 'op de grond tanken');
  V.stapIn(c, naast(), world()); vlieg(c, { burn: true }, 20, world());
  ok(V.tankOp(c) === false, 'in de lucht niet');
  ok(V.ballonHud(V.makeBalloonCraft(site, { fuel: 0.05 })).waarschuwing.length > 0, 'waarschuwing bij weinig brandstof');
}

// 12) lanceerplekken: de Dollard is er altijd bij, de parken komen van de kaart
{
  const lijst = V.lanceerPlekken([{ x: 10, y: 20 }]);
  ok(lijst.length === 2 && lijst[1].id === 'dollard' && Number.isFinite(lijst[1].x), 'park en Dollard');
  ok(V.makeBalloonCraft(lijst[1]).x === lijst[1].x, 'een ballon op de Dollard');
}

// 13) een kapotte of onbekende invoer geeft geen crash
{
  const c = V.makeBalloonCraft(site);
  eq(V.stepBalloonCraft(null, {}, 0.1, world()), [], 'geen ballon');
  c.wrecked = true; eq(V.stepBalloonCraft(c, { burn: true }, 0.1, world()), [], 'kapotte ballon doet niets');
  const d = V.makeBalloonCraft(site); V.stapIn(d, naast(), world());
  V.stepBalloonCraft(d, undefined, 0.1, undefined);
  ok(Number.isFinite(d.x), 'zonder invoer en weer');
}

console.log(`ballonrit_test: ${n} controles ok`);
