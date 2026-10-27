// De aanhanger van de gelede bus (#523): de achterkant is geen star deel van de bus maar
// hangt aan een scharnier en heeft daarom een eigen koers (v.trailerAngle). Deze test haalt
// het blok met de markers uit vehicle.js en draait het zoals het daar staat; vehicle.js zelf
// is een browsermodule (three.js via een https-import) en laadt niet in node.
//   node scripts/bus_aanhanger_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../game/js/vehicle.js', import.meta.url), 'utf8');
const BEGIN = '// --- aanhangerhoek begin ---';
const EIND = '// --- aanhangerhoek eind ---';
const van = src.indexOf(BEGIN), tot = src.indexOf(EIND);
assert.ok(van >= 0 && tot > van, 'vehicle.js heeft het aanhangerblok met markers');
const blok = src.slice(van + BEGIN.length, tot).replace(/^export /gm, '');

// clamp, lerp en normalizeAngle komen in vehicle.js uit util.js; hier staan ze lokaal zodat
// de test geen three.js of andere module hoeft te laden.
function laad() {
  return new Function(`
    const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
    const lerp = (a, b, t) => a + (b - a) * t;
    const normalizeAngle = (a) => { a = a % (Math.PI * 2); if (a > Math.PI) a -= Math.PI * 2; if (a < -Math.PI) a += Math.PI * 2; return a; };
    ${blok}
    return { pushBusTrail, sampleBusTrail, stepBusTrailerAngle, busTrailerPose, TRAILER_MAX_ANGLE };
  `)();
}

// de gelede bus: 11,2 m voorunit met een achterunit van 6,8 m (BUS_TRAILER in vehicle.js)
const MODEL = { name: 'bus', len: 11.2, wid: 2.55, trailer: 6.8, maxSpeed: 20 };
function bus() {
  return { x: 0, y: 0, angle: 0, speed: 0, model: MODEL, halfWid: MODEL.wid / 2 };
}
const DT = 1 / 60;

// dezelfde volgorde als applyControls: eerst de positie, dan de trail en de aanhangerhoek
function rit(A, b, seconden, yawRate = 0) {
  for (let i = 0, n = Math.round(seconden / DT); i < n; i++) {
    b.angle += yawRate * DT;
    b.x += Math.cos(b.angle) * b.speed * DT;
    b.y += Math.sin(b.angle) * b.speed * DT;
    A.pushBusTrail(b);
    A.stepBusTrailerAngle(b, DT);
  }
}
function verschil(b) {
  let d = (b.trailerAngle - b.angle) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// 1. Een kwart bocht op 12 m/s (43 km/h) met de yaw die de bus daar maximaal haalt
//    (lateralGrip 4,5 m/s2 / 12 m/s = 0,375 rad/s): de aanhanger zwaait uit en blijft
//    achter de bus aan lopen, ruim boven de drempel.
const A = laad();
const b = bus();
b.speed = 12;
rit(A, b, 1);
assert.ok(Math.abs(verschil(b)) < 0.01, 'rechtuit staat de aanhanger recht achter de bus');
const kwart = Math.PI / 2 / 0.375;
rit(A, b, kwart, 0.375);
assert.ok(Math.abs(verschil(b)) > 0.05, `na een kwart bocht loopt de aanhanger uit (${verschil(b).toFixed(3)} rad)`);
assert.ok(verschil(b) < 0, 'de aanhanger blijft achter: hij loopt niet voor de bus uit');
const pose = A.busTrailerPose(b);
assert.ok(Math.abs(pose.angle - b.trailerAngle) < 1e-9, 'busTrailerPose tekent precies de bijgehouden hoek');
assert.ok(Math.abs(pose.jx - (b.x - Math.cos(b.angle) * MODEL.len / 2)) < 1e-9, 'het koppelpunt zit op de achterkant van de voorunit');

// 2. Daarna 2 s rechtuit: de aanhanger trekt weer naar de bushoek toe, zonder sprong.
rit(A, b, 2);
assert.ok(Math.abs(verschil(b)) < 0.02, `na 2 s rechtuit loopt hij weer recht (${verschil(b).toFixed(3)} rad)`);

// 3. Achteruit draait het teken om: dezelfde scheve stand klapt achteruit verder uit
//    en trekt vooruit juist recht.
{
  const A2 = laad();
  const vooruit = bus();
  vooruit.trailerAngle = -0.2;
  vooruit.speed = 4;
  rit(A2, vooruit, 0.5);
  assert.ok(Math.abs(verschil(vooruit)) < 0.18, `vooruit trekt de hoek recht (${verschil(vooruit).toFixed(3)} rad)`);

  const A3 = laad();
  const achteruit = bus();
  achteruit.trailerAngle = -0.2;
  achteruit.speed = -4;
  rit(A3, achteruit, 0.5);
  assert.ok(verschil(achteruit) < -0.25, `achteruit klapt de hoek verder uit (${verschil(achteruit).toFixed(3)} rad)`);
  assert.ok(Math.abs(verschil(achteruit)) > Math.abs(verschil(vooruit)) + 0.05, 'achteruit draait het teken dus om');
}

// 4. Stilstand: geen harde sprong naar recht, maar een rustige beweging naar de bushoek.
{
  const A4 = laad();
  const stil = bus();
  stil.speed = 0;
  stil.trailerAngle = -0.4;
  A4.stepBusTrailerAngle(stil, DT);
  assert.ok(Math.abs(verschil(stil)) > 0.35, 'stilstaan zet de aanhanger niet in één beeld recht');
  for (let i = 0; i < 4 / DT; i++) A4.stepBusTrailerAngle(stil, DT);
  assert.ok(Math.abs(verschil(stil)) < 0.03, `stilstaan zakt hij rustig naar de bushoek (${verschil(stil).toFixed(3)} rad)`);
}

// 5. Het scharnier klemt op ±1,1 rad in plaats van ±0,75 rad: een krappe bocht wordt niet
//    meer afgekapt, en een onmogelijke stand wordt nog steeds begrensd.
{
  const A5 = laad();
  assert.equal(A5.TRAILER_MAX_ANGLE, 1.1, 'het scharnier staat op 1,1 rad');
  const krap = bus();
  krap.trailerAngle = 2.4;
  const p = A5.busTrailerPose(krap);
  assert.ok(Math.abs(p.angle - krap.angle) <= 1.1 + 1e-9, 'een onmogelijke stand blijft begrensd');
  assert.ok(Math.abs(p.angle - krap.angle) > 0.75, 'een krappe bocht wordt niet meer op 0,75 rad afgekapt');
  const lengte = Math.hypot(p.cap.bx - p.jx, p.cap.by - p.jy);
  assert.ok(lengte > 4 && lengte < MODEL.trailer, 'de capsule van de aanhanger hangt aan het koppelpunt');
}

// 6. De tekeningen: de midibus zet zijn voorwielen in userData.frontWheels (anders sturen ze
//    niet mee, updateVehicleWheelSpin), en het scharnier in models3d_vehicles.js klemt op
//    dezelfde 1,1 rad als vehicle.js. scene3d.js tekent de achterkant vanuit busTrailerPose.
{
  const mod = fs.readFileSync(new URL('../game/js/models3d_vehicles.js', import.meta.url), 'utf8');
  function body(naam) {
    const i = mod.indexOf(naam);
    assert.ok(i >= 0, `${naam} staat in models3d_vehicles.js`);
    const j = mod.indexOf('\n}', i);
    assert.ok(j > i, `${naam} is af te bakenen`);
    return mod.slice(i, j);
  }
  const midi = body('function buildMidiBusMesh(');
  assert.ok(/group\.userData\.frontWheels = wheels\.slice\(0, 2\)/.test(midi), 'de midibus heeft sturende voorwielen');
  assert.ok(/for \(const x of \[fwX, rwX\]\)/.test(midi), 'de wielen staan per as (vooras eerst) in de lijst');
  const rear = body('export function setBusRearAngle(');
  assert.ok(/BUS_JOINT_MAX_ANGLE = 1\.1/.test(mod), 'het scharnier in models3d_vehicles.js staat op 1,1 rad');
  assert.ok(/BUS_JOINT_MAX_ANGLE/.test(rear), 'setBusRearAngle gebruikt die klem');
  assert.ok(!/0\.75/.test(rear), 'de oude klem van 0,75 rad is weg');

  const scene = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
  assert.ok(/v\.model\.trailer\s*\?\s*busTrailerPose\(v\)\.angle/.test(scene), 'scene3d.js tekent de achterkant vanuit busTrailerPose');
}

// 7. Een bus zonder trailer (midibus) houdt geen aanhangerhoek bij.
{
  const A6 = laad();
  const midi = { x: 0, y: 0, angle: 0.3, speed: 5, model: { name: 'midibus', len: 8.4, wid: 2.3 }, halfWid: 1.15 };
  A6.stepBusTrailerAngle(midi, DT);
  assert.equal(midi.trailerAngle, undefined, 'zonder trailer geen aanhangerhoek');
}

console.log('bus_aanhanger_test ok');
