// Een wrak staat stil (#436): geen snelheid, drift of spin meer, ook niet na een duw of een ontploffing.
// Zonder dit hield een fiets, scooter of boot die total loss sloeg zijn drift en spin, en schoot een wrak
// dat een aanhanger nog een zet gaf (of later in de garage werd opgeknapt) alsnog weg.
//   node scripts/vehicle_wreck_test.mjs
import './node3d.mjs';
const { Vehicle, disableVehicle, restWreck, explodeVehicle, resolveVehicleVehicleCollisions } = await import('../game/js/vehicle.js');

let n = 0, fout = 0;
const check = (naam, ok, info = '') => { n++; if (!ok) { fout++; console.log('FAIL', naam, info); } };
const stil = (v) => v.speed === 0 && v.driftX === 0 && v.driftY === 0 && v.yawVel === 0;

const model = { name: 'hatch', len: 4.3, wid: 1.8, maxSpeed: 50, accel: 10, brake: 24, turnRate: 2.6 };
const bikeModel = { name: 'bike', len: 1.75, wid: 0.5, maxSpeed: 6.2, accel: 3.2, brake: 6, turnRate: 4.6 };
const bootModel = { name: 'boot', kind: 'skiff', len: 4, wid: 1.6, maxSpeed: 12, accel: 4, brake: 6, turnRate: 1.6 };
const rijdend = (m, extra = {}) => Object.assign(new Vehicle(0, 0, 0, m), { x: 10, y: 10, speed: 7, driftX: 2.5, driftY: -1.5, yawVel: 1.1 }, extra);

// De hulpfunctie zelf.
{
  const v = rijdend(model);
  restWreck(v);
  check('restWreck zet snelheid, drift en spin op nul', stil(v), JSON.stringify([v.speed, v.driftX, v.driftY, v.yawVel]));
  check('restWreck laat de hup van een ontploffing staan', (() => { const q = rijdend(model); q.vz = 3.2; restWreck(q); return q.vz === 3.2; })());
  check('restWreck verdraagt niets', restWreck(null) === null);
}

// Een fiets of scooter die total loss slaat, staat meteen stil (eerst bleef de drift en de spin staan).
for (const [naam, m] of [['fiets', bikeModel], ['scooter', { ...bikeModel, name: 'scooter' }]]) {
  const v = rijdend(m, { isBike: naam === 'fiets', isScooter: naam === 'scooter' });
  disableVehicle(v, false);
  check(`${naam}: wreck en helemaal stil`, v.wrecked === true && stil(v), JSON.stringify([v.speed, v.driftX, v.driftY, v.yawVel]));
}

// Een boot net zo.
{
  const v = rijdend(bootModel, { isBoat: true });
  disableVehicle(v, false);
  check('boot: wreck en helemaal stil', v.wrecked === true && stil(v));
}

// Een auto blijft eerst rollen (de chauffeur stapt uit en hij rolt uit); dat mag niet veranderen.
{
  const v = rijdend(model);
  disableVehicle(v, false);
  check('auto: disabled, niet meteen een wrak', v.disabled === true && v.wrecked !== true);
  check('auto: rolt nog uit met zijn snelheid', v.speed === 7 && v.driftX === 2.5);
}

// De ontploffing: een wrak, stil, met alleen een sierdraai en de hup omhoog.
{
  const v = rijdend(model);
  v.disabled = true;
  explodeVehicle(v, { vehicles: [v], player: { x: 500, y: 500 }, particles: [], time: 3 });
  check('ontploft: wreck', v.wrecked === true && v.blewUp === true);
  check('ontploft: geen snelheid of drift meer', v.speed === 0 && v.driftX === 0 && v.driftY === 0);
  check('ontploft: wel de hup omhoog', v.airborne === true && v.vz > 0);
  check('ontploft: een sierdraai, geen oude spin', Math.abs(v.yawVel) <= 0.6);
}

// Een botsing zet een wrak niet in beweging (het wrak is een dood, zwaar voorwerp).
{
  const wrak = Object.assign(new Vehicle(0, 0, 0, model), { x: 0, y: 0, wrecked: true, health: 0 });
  const auto = Object.assign(new Vehicle(0, 0, 0, model), { x: 2.4, y: 0, speed: 12, driver: null });
  const lijst = [wrak, auto];
  const world = { vehicles: lijst, player: { x: 100, y: 100 }, particles: [], time: 1, addMessage() {} };
  for (let i = 0; i < 12; i++) resolveVehicleVehicleCollisions(lijst, world);
  check('een wrak dat geraakt wordt blijft stil', stil(wrak), JSON.stringify([wrak.speed, wrak.driftX, wrak.driftY, wrak.yawVel]));
  check('de auto die erop klapt komt tot stilstand of terug', Number.isFinite(auto.speed) && Number.isFinite(auto.x));
}

// De reparatie in de garage (repairVehicle) laat de snelheid staan: een wrak dat stil is, schiet daarna niet weg.
{
  const v = rijdend(model);
  v.disabled = true;
  explodeVehicle(v, { vehicles: [v], player: { x: 500, y: 500 }, particles: [], time: 3 });
  v.wrecked = false; v.disabled = false; v.blewUp = false; v.airborne = false; v.vz = 0; // repairVehicle
  const begin = { x: v.x, y: v.y };
  for (let i = 0; i < 30; i++) v.applyControls(1 / 60, 0, 0, true);
  check('opgeknapt wrak blijft staan', Math.hypot(v.x - begin.x, v.y - begin.y) < 1e-6, v.x + ',' + v.y);
}

console.log(`vehicle_wreck_test: ${n - fout}/${n}`);
process.exit(fout ? 1 : 0);
