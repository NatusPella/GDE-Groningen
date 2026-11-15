// #934: de impactbalans. De pure regels (impactbalance.js) zijn de bron voor
// vehicle.js en breakables.js; deze test legt de drempels vast en speelt daarna
// een echte kop-staart- en frontale botsing na met de voertuigphysics.
//   node scripts/impactbalance_test.mjs
import './node3d.mjs';
import { IMPACT, vehicleImpactDamage, wallImpactDamage, landingImpactDamage, propImpactDamage, propBreakDamage, flatTirePossible } from '../game/js/impactbalance.js';

let n = 0, bad = 0;
const ok = (name, c, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };
const near = (a, b, m = 1e-6) => Math.abs(a - b) <= m;

// --- lage snelheid doet niets -------------------------------------------------
ok('onder de aanrijdrempel geen schade', vehicleImpactDamage(0) === 0 && vehicleImpactDamage(3) === 0 && vehicleImpactDamage(IMPACT.hardSpeed) === 0);
ok('een tik van 10 km/u (2,8 m/s) doet niets', vehicleImpactDamage(2.8) === 0);
ok('een muur onder 9 m/s doet niets', wallImpactDamage(0) === 0 && wallImpactDamage(5) === 0 && wallImpactDamage(IMPACT.wallSpeed) === 0);
ok('een landing onder 9 m/s doet niets', landingImpactDamage(4) === 0 && landingImpactDamage(IMPACT.landSpeed) === 0);
ok('straatmeubilair onder 6 m/s doet niets', propImpactDamage(2) === 0 && propImpactDamage(5.9) === 0);

// --- een gewone stadsbotsing blijft klein -------------------------------------
// 30 km/u (8,3 m/s) kop-staart: ruw 6,6, dus ~2,1 gezondheidspunt na de demper.
ok('een kop-staart van 30 km/u geeft ongeveer 6,6 ruwe schade', near(vehicleImpactDamage(8.3), 6.6, 0.05), String(vehicleImpactDamage(8.3)));
ok('een kop-staart van 30 km/u kost maar een paar gezondheidspunten', vehicleImpactDamage(8.3) * 0.32 < 3, String(vehicleImpactDamage(8.3) * 0.32));
ok('een zijdelingse tik van 20 km/u (5,6 m/s) doet bijna niets', vehicleImpactDamage(5.6) < 2, String(vehicleImpactDamage(5.6)));

// --- een echte klap blijft voelen ---------------------------------------------
ok('een frontale klap van 72 km/u raakt het plafond', vehicleImpactDamage(20) === IMPACT.max, String(vehicleImpactDamage(20)));
ok('nog harder dan het plafond wordt niet meer', vehicleImpactDamage(50) === IMPACT.max && vehicleImpactDamage(120) === IMPACT.max);
ok('de zwaarste autoklap is ongeveer 5 gezondheidspunten', near(IMPACT.max * 0.32, 5.12, 0.01), String(IMPACT.max * 0.32));
ok('de zwaarste muurklap is minder dan de zwaarste autoklap', IMPACT.wallMax < IMPACT.max);

// --- muur, landing en prop lopen netjes op ------------------------------------
ok('een muur op 20 m/s geeft 16,5 ruw, gecapt op 12', wallImpactDamage(20) === IMPACT.wallMax, String(wallImpactDamage(20)));
ok('een landing op 14 m/s geeft 20 ruw', near(landingImpactDamage(14), 20, 0.01), String(landingImpactDamage(14)));
ok('een landing van 4 m valt binnen het plafond', landingImpactDamage(9.5) < IMPACT.landMax);
ok('een boom is harder dan een bankje', propImpactDamage(10, { tree: true }) > propImpactDamage(10), `${propImpactDamage(10, { tree: true })} vs ${propImpactDamage(10)}`);
ok('een paaltje op 20 km/u geeft bijna geen schade', propImpactDamage(5.6) < 1, String(propImpactDamage(5.6)));
ok('een zware prop die breekt blijft begrensd', propBreakDamage(30, 5000) === IMPACT.breakMax);
ok('een licht paaltje dat breekt voelt nauwelijks', propBreakDamage(10, 30) < 1, String(propBreakDamage(10, 30)));

// --- lekke band: alleen bij een echte klap ------------------------------------
ok('onder de lekdrempel geen lekke band', !flatTirePossible(5.9) && flatTirePossible(6));
ok('een kop-staart van 30 km/u kan een band lek slaan', flatTirePossible(vehicleImpactDamage(8.3)));

// --- de echte botsing: dezelfde auto, drie snelheden ---------------------------
const V = await import('../game/js/vehicle.js');
const MODEL = { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 40, accel: 9, brake: 23, turnRate: 3, color: '#c7c9cc' };
function crash(pSpeed, oSpeed) {
  const p = new V.Vehicle(0, 0, 0, MODEL); p.driver = 'player'; p.speed = pSpeed;
  const o = new V.Vehicle(3.0, 0, Math.PI, MODEL); o.driver = 'ai'; o.speed = oSpeed;
  const world = { addMessage() {}, vehicles: [p, o], particles: [], audioEvents: [], time: 0, cameraShake: 0, player: { x: 999, y: 999 }, props: [], map: null };
  V.resolveVehicleVehicleCollisions([p, o], world);
  return { p, o };
}
const zacht = crash(1, 1); // 2 m/s: onder de drempel
ok('een botsing van 2 m/s kost geen gezondheid', zacht.p.health === 100 && zacht.o.health === 100, `${zacht.p.health}/${zacht.o.health}`);
const stads = crash(5, 5); // kop-op-kop: 10 m/s
ok('een stadsaanrijding van 10 m/s kost minder dan 4 punten', 100 - stads.p.health < 4 && 100 - stads.p.health > 0, String(100 - stads.p.health));
const hard = crash(25, 15); // kop-op-kop: 40 m/s
ok('een harde klap van 40 m/s kost meer dan een stadsaanrijding', 100 - hard.p.health > 100 - stads.p.health, `${100 - hard.p.health} vs ${100 - stads.p.health}`);
ok('ook een harde klap sloopt de auto niet in één keer', hard.p.health > 90, String(hard.p.health));

console.log(`impactbalance_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
