// Een politiepaard (#331) is geen muur: een auto die er op rijdt gooit de ruiter eraf en het paard slaat op hol,
// zonder dat het paard kapotgaat of de auto er stuk op loopt.
//   node scripts/politiepaard_test.mjs
import './node3d.mjs';

const V = await import('../game/js/vehicle.js');
const PM = await import('../game/js/policemounts.js');
let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };

const hatch = { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 42, accel: 9, brake: 23, turnRate: 3.0, color: '#c7c9cc' };
const HORSE = { name: 'horse', len: 2.4, wid: 0.75, maxSpeed: 7.4, accel: 3.2, brake: 6, turnRate: 3.2, color: '#6b3f22', rider: '#1c3fae', coat: 0 };
const DT = 1 / 60;

function stage(speed, { held = false, driverIsPlayer = true } = {}) {
  const car = new V.Vehicle(0, 0, 0, hatch);
  car.driver = driverIsPlayer ? 'player' : null;
  car.speed = speed;
  const h = new V.Vehicle(12, 0, Math.PI, HORSE);
  h.isBike = true; h._mount = 'horse'; h.isPolice = true; h._baseTop = HORSE.maxSpeed;
  h.speed = held ? 0 : 3;
  const msgs = [];
  const map = { roads: [], roadsNear: () => [], buildingsNear: () => [], waterNear: () => [], inWater: () => false, inWaterRaw: () => false };
  const world = { time: 0, player: { x: 0, y: 0, inVehicle: car }, vehicles: [car, h], pedestrians: [], props: [], particles: [], stats: {}, wanted: 2, map, addMessage: (t) => msgs.push(t), audioEvents: [], flitspaalen: [] };
  return { car, h, world, msgs };
}

function botsing(speed, opts) {
  const S = stage(speed, opts);
  const state = { strays: [], crewUnits: [] };
  let bolted = false, hardest = 0;
  for (let i = 0; i < 360; i++) {
    S.car.applyControls(DT, 0, 0, 0);
    if (!S.h._bolting) S.h.applyControls(DT, opts && opts.held ? 0 : 0.3, 0, opts && opts.held ? 1 : 0);
    V.resolveVehicleVehicleCollisions(S.world.vehicles, S.world);
    if (!bolted && PM.maybeBolt(S.h, S.world, state)) bolted = true;
    if (bolted) PM.updateBolting(S.h, DT, S.world);
    S.world.time += DT;
    hardest = Math.max(hardest, S.car.health < 100 ? 100 - S.car.health : 0);
  }
  return { ...S, bolted, state };
}

// een stapvoets duwtje doet het paard niets
{
  const r = botsing(2, { held: true });
  ok(!r.bolted && r.h.health > 90 && !r.h.wrecked, 'stapvoets: het paard blijft staan', `hp ${r.h.health}`);
}
// vanaf een flinke klap: de ruiter eraf, het paard op hol, nooit een wrak
for (const sp of [8, 12, 18, 25]) for (const held of [false, true]) {
  const r = botsing(sp, { held });
  const t = `${sp} m/s, paard ${held ? 'stilstaand' : 'stappend'}: `;
  ok(r.bolted, t + 'het paard slaat op hol', `hp ${r.h.health.toFixed(1)}`);
  ok(!r.h.wrecked && !r.h.disabled && r.h.health >= 1, t + 'het paard gaat niet kapot', `hp ${r.h.health}`);
  ok(r.h._riderAway === true, t + 'de ruiter is eraf');
  ok(r.car.health > 100 - (sp * 1.6), t + 'de auto loopt er niet stuk op', `autoschade ${(100 - r.car.health).toFixed(1)}`);
  ok(!r.car.wrecked && !r.car.disabled, t + 'de auto blijft heel genoeg');
  ok(r.msgs.some((m) => /politiepaard/i.test(m)), t + 'een melding in het Nederlands');
  ok(Math.hypot(r.h.x - r.car.x, r.h.y - r.car.y) > 8, t + 'het paard is uit de weg gegaan', String(Math.hypot(r.h.x - r.car.x, r.h.y - r.car.y)));
}
// herhaalde klappen maken geen wrak van het paard
{
  const S = stage(0, { held: true });
  for (let k = 0; k < 20; k++) { S.h.speed = 0; S.car.x = S.h.x - 4; S.car.y = S.h.y; S.car.angle = 0; S.car.speed = 22; for (let i = 0; i < 40; i++) { S.car.applyControls(DT, 0, 0, 0); V.resolveVehicleVehicleCollisions(S.world.vehicles, S.world); } }
  ok(!S.h.wrecked && S.h.health >= 1, 'twintig keer raken maakt geen wrak', `hp ${S.h.health}`);
}
// een paard waar de speler zelf op zit, blijft een gewoon voertuig
{
  const S = stage(14, { held: true });
  S.h.driver = 'player';
  S.car.driver = null;
  for (let i = 0; i < 120; i++) { S.car.applyControls(DT, 0, 0, 0); V.resolveVehicleVehicleCollisions(S.world.vehicles, S.world); }
  ok(S.h.health < 100, 'het paard van de speler zelf krijgt gewoon schade', `hp ${S.h.health}`);
}

console.log(`politiepaard_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
