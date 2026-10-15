// Motorbikes and the geared moped: models, meshes, lean, wheelie, gears, shop stock and names.
//   node scripts/motorbike_test.mjs
import './node3d.mjs';

const { Vehicle, MOTORBIKE_MODELS, GEARED_MOPED_MODEL, MOPED_LEGAL_SPEED, playerTopSpeed } = await import('../game/js/vehicle.js');
const { buildVehicleMesh, riderSeatFor } = await import('../game/js/models3d_vehicles.js');
const { shift, PROFILES } = await import('../game/js/gearbox.js');
const { vehicleDisplayName } = await import('../game/js/vehiclenames.js');
const { VEHICLE_STOCK, upgradeListForStock, MOTO_UPGRADES } = await import('../game/js/shops.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const DT = 1 / 60;

function bike(model, mode = 'auto', extra = {}) {
  const v = new Vehicle(0, 0, 0, { ...model });
  v.isScooter = true;
  v.driver = 'player';
  v.shiftMode = mode;
  Object.assign(v, extra);
  return v;
}

// --- models and meshes ---
for (const [k, m] of Object.entries(MOTORBIKE_MODELS)) {
  check(k + ' is a motorbike model', m.name === 'motor' && m.motorbike === k);
  const v = bike(m);
  const mesh = buildVehicleMesh(v);
  check(k + ' mesh has two wheels', mesh.userData.wheels && mesh.userData.wheels.length === 2);
  const rider = mesh.children.find((c) => c.userData && c.userData.legL);
  check(k + ' has a rider with a helmet', !!rider && !!rider.userData.helmet);
  check(k + ' has a seat pose', !!riderSeatFor(m));
  let minX = Infinity, maxX = -Infinity;
  for (const w of mesh.userData.wheels) { minX = Math.min(minX, w.position.x - m.len * 0.15); maxX = Math.max(maxX, w.position.x + m.len * 0.15); }
  check(k + ' wheelbase fits the model length', maxX - minX > m.len * 0.7 && maxX - minX < m.len * 1.4, maxX - minX);
}
{
  const m = GEARED_MOPED_MODEL;
  const mesh = buildVehicleMesh(bike(m));
  const rider = mesh.children.find((c) => c.userData && c.userData.legL);
  check('geared moped mesh: wheels and helmet', mesh.userData.wheels.length === 2 && !!rider && !!rider.userData.helmet);
  check('geared moped is a moped at 45 km/h', m.moped && m.geared && Math.abs(m.maxSpeed * 3.6 - 45) < 0.5 && MOPED_LEGAL_SPEED === 12.5);
}

// --- names and shop ---
{
  const names = Object.values(MOTORBIKE_MODELS).map((m) => vehicleDisplayName(bike(m)));
  check('three distinct motorbike names', new Set(names.map((n) => n.make + n.model)).size === 3, JSON.stringify(names));
  check('geared moped has its own name', vehicleDisplayName(bike(GEARED_MOPED_MODEL)).model === 'Pruttelaar');
  for (const id of ['stormvogel', 'knetter', 'klassieker', 'pruttelaar']) {
    const s = VEHICLE_STOCK[id];
    check(id + ' is sold at the bike shop', s && s.shop === 'fietsen' && s.kind === 'scooter' && s.price > 0);
    check(id + ' gets the motor upgrades', s && upgradeListForStock(s) === MOTO_UPGRADES);
  }
  check('stock names are not real brands', !/honda|yamaha|suzuki|kawasaki|ducati|vespa|piaggio|harley|bmw|ktm|puch|kreidler/i.test(JSON.stringify(Object.values(VEHICLE_STOCK).map((s) => [s.label, s.desc]))));
}

// --- speed, gears ---
{
  const v = bike(MOTORBIKE_MODELS.sport);
  let t = 0;
  while (v.speed < 27.78 && t < 20) { v.applyControls(DT, 1, 0, false); t += DT; }
  console.log('sport 0-100', t.toFixed(2), 's');
  check('sport bike 0-100 in 2.5-5 s', t > 2.5 && t < 5, t);
  for (let i = 0; i < 60 * 40; i++) v.applyControls(DT, 1, 0, false);
  check('sport bike reaches about its top', v.speed > 58 && v.speed <= 62.01, v.speed);
  check('the bike has the six-speed sport gearbox', v.gb && v.gb.id === 'motorSport' && v.gb.p.tops.length === 6);
  check('top gear at the top', v.gb.gear === 6);
}
{
  const v = bike(MOTORBIKE_MODELS.naked, 'manual');
  v.applyControls(DT, 0, 0, false);
  check('manual bike starts in first', v.gb.gear === 1);
  for (let i = 0; i < 60 * 3; i++) v.applyControls(DT, 1, 0, false);
  const topFirst = 0.11 / 0.93 * 52;
  check('stuck in first it stops at the limiter', v.speed < topFirst * 1.1 && v.speed > topFirst * 0.6, v.speed);
  check('first -> N -> second', shift(v.gb, 1, 0) === 'ok' && v.gb.gear === 0 && shift(v.gb, 1, 0.1) === 'ok' && v.gb.gear === 2);
}
{
  const v = bike(GEARED_MOPED_MODEL, 'manual');
  v.applyControls(DT, 0, 0, false);
  check('moped has four gears', v.gb && v.gb.id === 'moped' && v.gb.p.tops.length === 4);
  let t = 0, g = 1;
  for (let i = 0; i < 60 * 40; i++) {
    if (v.gb.rpm > v.gb.p.red * 0.9 && v.gb.gear < 4) shift(v.gb, 1, v.speed / 12.5);
    v.applyControls(DT, 1, 0, false); t += DT;
  }
  check('moped tops out at 45 km/h', v.speed > 11.5 && v.speed <= 12.51, v.speed * 3.6);
  const tuned = bike({ ...GEARED_MOPED_MODEL, maxSpeed: 12.5 * 1.1, accel: 3.8 * 1.15 }, 'auto', { _baseModel: GEARED_MOPED_MODEL });
  for (let i = 0; i < 60 * 30; i++) tuned.applyControls(DT, 1, 0, false);
  check('a tuned moped passes the legal speed', tuned.speed > MOPED_LEGAL_SPEED * 1.04, tuned.speed);
  check('playerTopSpeed knows the motorbikes', Math.abs(playerTopSpeed(MOTORBIKE_MODELS.sport) - 62) < 0.01);
}

// --- lean ---
function lean(assist, speed, secs = 3) {
  const v = bike(MOTORBIKE_MODELS.sport, 'auto', { bikeAssist: assist });
  v.speed = speed;
  let maxRoll = 0;
  for (let i = 0; i < secs * 60; i++) {
    v.applyControls(DT, 1, 1, false);
    maxRoll = Math.max(maxRoll, Math.abs(v.roll));
  }
  return { v, maxRoll };
}
{
  const a = lean(true, 30);
  check('the bike leans into a turn', a.maxRoll > 0.2, a.maxRoll);
  check('with assist the lean is capped at 0.8 rad', a.maxRoll <= 0.801, a.maxRoll);
  check('with assist it never crashes', !a.v.crashed);
  const left = bike(MOTORBIKE_MODELS.sport); left.speed = 30;
  const right = bike(MOTORBIKE_MODELS.sport); right.speed = 30;
  for (let i = 0; i < 60; i++) { left.applyControls(DT, 1, 1, false); right.applyControls(DT, 1, -1, false); }
  check('lean goes the other way for the other turn', left.roll * right.roll < 0, left.roll + ' ' + right.roll);
  const b = lean(false, 60);
  check('without assist it can lean further', b.maxRoll >= a.maxRoll, b.maxRoll);
  check('without assist a hard turn at 60 m/s is a low-side', b.v.crashed === true || b.maxRoll > 0.7);
}

// --- wheelie and stoppie ---
{
  const w = bike(MOTORBIKE_MODELS.sport, 'auto', { bikeAssist: true });
  w.speed = 4;
  w.applyControls(DT, 1, 0, false);
  w.trick = true;
  let maxPitch = 0;
  for (let i = 0; i < 120; i++) { w.applyControls(DT, 1, 0, false); maxPitch = Math.max(maxPitch, w.pitch); }
  check('wheelie lifts the front wheel in the low gears', maxPitch > 0.3, maxPitch);
  check('the assist levels the wheelie off', maxPitch < 0.8, maxPitch);
  w.trick = false;
  for (let i = 0; i < 120; i++) w.applyControls(DT, 0, 0, false);
  check('and it comes back down', Math.abs(w.pitch) < 0.05, w.pitch);
  const hi = bike(MOTORBIKE_MODELS.sport, 'auto');
  hi.speed = 45;
  hi.trick = true;
  for (let i = 0; i < 60; i++) hi.applyControls(DT, 1, 0, false);
  check('no wheelie at speed', hi.pitch < 0.05, hi.pitch);
  const s = bike(MOTORBIKE_MODELS.sport, 'auto');
  s.speed = 25;
  s.applyControls(DT, 0, 0, false);
  s.trick = true;
  for (let i = 0; i < 40; i++) s.applyControls(DT, -1, 0, false);
  check('stoppie drops the nose on the brake', s.pitch < -0.1 && !s.wheelie, s.pitch);
  const loop = bike(MOTORBIKE_MODELS.sport, 'auto', { bikeAssist: false });
  loop.speed = 4;
  loop.applyControls(DT, 1, 0, false);
  loop.trick = true;
  for (let i = 0; i < 60 * 6 && !loop.crashed; i++) { loop.speed = Math.min(loop.speed, 8); loop.applyControls(DT, 1, 0, false); }
  check('without assist a long wheelie loops out', loop.crashed === true);
}

// a car is unaffected: no lean, no trick
{
  const c = new Vehicle(0, 0, 0, { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 42, accel: 9, brake: 23, turnRate: 3, color: '#ccc' });
  c.driver = 'player';
  c.trick = true;
  for (let i = 0; i < 60; i++) c.applyControls(DT, 1, 1, false);
  check('a car does not lean or wheelie', c.roll === 0 && !c.pitch);
}

if (bad) process.exit(1);
console.log('motorbikes: all passed');
