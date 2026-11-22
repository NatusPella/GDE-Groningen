// De aanhanger van een gelede bus rijdt met de bus mee. De botsing rekende hem als een STILSTAANDE muur:
// wie achter een rijdende bus aan reed en de aanhanger met een halve meter per seconde verschil aantikte,
// kreeg een frontale klap op volle rijsnelheid (schade, stilstand), terwijl de bus gewoon doorreed.
// De botssnelheid hoort het verschil met de bus te zijn.
//   node scripts/bus_aanhanger_botsing_test.mjs
import './node3d.mjs';
const { Vehicle, resolveVehicleVehicleCollisions } = await import('../game/js/vehicle.js');

let n = 0, fout = 0;
const check = (naam, ok, info = '') => { n++; if (!ok) { fout++; console.log('FAIL', naam, info); } };

const busModel = { name: 'bus', len: 11.2, wid: 2.55, trailer: 6.8, maxSpeed: 20, accel: 4.5, brake: 12, turnRate: 1.1 };
const carModel = { name: 'hatch', len: 4.3, wid: 1.8, maxSpeed: 50, accel: 10, brake: 24, turnRate: 2.6 };
const world = { time: 1, vehicles: [], particles: [], audioEvents: [], addMessage() {}, player: { x: 500, y: 500, inVehicle: null } };

// staart van de aanhanger: x = -5.6 - 6.8 = -12.4; de neus van de auto steekt er 10 cm in
function scene(busSpeed, carSpeed) {
  const bus = Object.assign(new Vehicle(0, 0, 0, busModel), { isBus: true, speed: busSpeed, trailerAngle: 0 });
  const car = Object.assign(new Vehicle(-12.4 - 2.15 + 0.1, 0, 0, carModel), { speed: carSpeed });
  world.vehicles = [bus, car];
  resolveVehicleVehicleCollisions(world.vehicles, world);
  return { bus, car };
}

// 1. Beide rijden 12 m/s, de auto een half metertje sneller: een tikje, geen klap.
{
  const { car } = scene(12, 12.5);
  check('aantikken achter een rijdende bus kost geen gezondheid', car.health === 100, 'health ' + car.health);
  check('aantikken achter een rijdende bus zet de auto niet stil', car.speed > 11, 'speed ' + car.speed.toFixed(2));
  check('aantikken achter een rijdende bus is geen harde klap', !car.hitThisFrame);
}

// 2. Een stilstaande bus blijft een muur: met 12 m/s achterop de aanhanger is een echte klap.
{
  const { car } = scene(0, 12);
  check('achterop een stilstaande aanhanger is nog steeds een klap', car.health < 100 && car.speed < 2, `health ${car.health} speed ${car.speed.toFixed(2)}`);
}

// 3. Een bus die wegrijdt van een stilstaande auto trekt die auto niet mee en beschadigt hem niet.
{
  const { car } = scene(12, 0);
  check('een wegrijdende bus laat de auto erachter staan', car.health === 100 && Math.abs(car.speed) < 0.01, `health ${car.health} speed ${car.speed.toFixed(2)}`);
}

// 4. Een bus die achteruit tegen een stilstaande auto rijdt, geeft die auto een zet (eerst: niets).
{
  const { car } = scene(-4, 0);
  check('een achteruitrijdende aanhanger duwt de auto weg', car.speed < -1, 'speed ' + car.speed.toFixed(2));
}

console.log(`bus_aanhanger_botsing_test: ${n - fout}/${n}`);
process.exit(fout ? 1 : 0);
