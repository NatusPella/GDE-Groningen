// Lekke band (#41): een harde klap kan een band lek slaan; trager en scheef, de garage repareert.
//   node scripts/flat_tire_test.mjs
import './node3d.mjs';
const { Vehicle, resolveVehicleVehicleCollisions } = await import('../game/js/vehicle.js');
const { repairVehicle } = await import('../game/js/garages.js');

let bad = 0;
const check = (name, ok) => { if (!ok) { bad++; console.log('FAIL', name); } };
const model = { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 40, accel: 9, brake: 23, turnRate: 3, color: '#c7c9cc' };
const drive = (v, s) => { for (let i = 0; i < s * 60; i++) v.applyControls(1 / 60, 1, 0, false); };

const a = new Vehicle(0, 0, 0, model); a.driver = 'player'; drive(a, 30);
const b = new Vehicle(0, 0, 0, model); b.driver = 'player'; b.flat = true; drive(b, 30);
check('lekke band is trager', b.speed < a.speed * 0.8);
check('lekke band trekt scheef', Math.abs(b.steer) > 0.05 && Math.abs(a.steer) < 1e-6);

const realRandom = Math.random;
const crash = (driver) => {
  const p = new Vehicle(0, 0, 0, model); p.driver = driver; p.speed = 25;
  const o = new Vehicle(3.0, 0, Math.PI, model); o.driver = 'ai'; o.speed = 15;
  Math.random = () => 0;
  resolveVehicleVehicleCollisions([p, o], { addMessage() {}, vehicles: [p, o], particles: [], audioEvents: [], time: 0, cameraShake: 0, player: { x: 999, y: 999 }, props: [], map: null });
  Math.random = realRandom;
  return [p, o];
};
const [c, co] = crash('player');
check('harde klap slaat een band van de speler lek', c.flat === true);
check('de andere auto slaat niet lek', !co.flat);
const [, d] = crash('ai');
// vehicleHitBody telt niet als speler-klap; test de repair en de vlag zelf
b.health = 80; repairVehicle(b);
check('garage repareert de band', b.flat === false && b.health === 100);
check('AI-auto blijft heel', !d.flat);
if (bad) process.exit(1);
console.log('flat tire: all passed');
