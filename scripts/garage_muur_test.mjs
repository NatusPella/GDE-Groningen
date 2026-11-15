// #970: politieauto's en mensen hoorden door garagemuren te gaan. De garagemuren zijn
// vaste colliders (breakables.addStaticCollider, breakSpeed Infinity). Voor een voetganger
// golden ze al; voor een voertuig alleen binnen 60 m van de speler, zodat een politieauto
// die van verre op de garage af reed er dwars doorheen ging. Deze test dekt:
//  - een voetganger wordt door de garagemuur tegengehouden;
//  - een politieauto ver van de speler wordt er ook door tegengehouden (de nieuwe regel);
//  - een losse prop ver van de speler blijft buiten de toets (de snelheidsregel).
//   node scripts/garage_muur_test.mjs
import './node3d.mjs';

const { addStaticCollider, makeProp, addProp, resolvePropCollisions } = await import('../game/js/breakables.js');
const { resolveWalker } = await import('../game/js/collision.js');
const { Vehicle } = await import('../game/js/vehicle.js');

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

const map = {
  buildingsNear: () => [], roadsNear: () => [], greenNear: () => [], waterNear: () => [],
  meta: {}, isOpenSpot: () => true,
};

// De garage: een muur van 8 m langs de x-as op y = 0 (dikte 0,4 m).
addStaticCollider('garagewall', 0, 0, 0.2, 4, 0);

// 1. een voetganger die er dwars op loopt
const [wx, wy] = resolveWalker(0, 0.2, 0.35, map, 0, -2, null, 0, 0);
ok(Math.abs(wx) < 1e-6, 'de voetganger blijft op zijn plek langs de muur', `${wx}`);
ok(wy >= 0.5, 'de voetganger wordt door de garagemuur tegengehouden', `y=${wy.toFixed(2)}`);

// 2. een politieauto ver van de speler (200 m) rijdt op de muur af
const auto = () => {
  const v = new Vehicle(0, 1.0, 0, { name: 'police', len: 4.4, wid: 1.8, maxSpeed: 50, accel: 10, brake: 20, turnRate: 2.5 });
  v.speed = 8;
  return v;
};
{
  const v = auto();
  const world = { player: { x: 200, y: 0 }, time: 0, vehicles: [v], particles: [], addMessage() {} };
  resolvePropCollisions([v], world);
  ok(v.y > 0.5 + 0.05, 'de politieauto ver van de speler wordt door de garagemuur gestopt', `y=${v.y.toFixed(2)}`);
}
// 3. dicht bij de speler geldt de muur natuurlijk ook
{
  const v = auto();
  const world = { player: { x: 3, y: 3 }, time: 0, vehicles: [v], particles: [], addMessage() {} };
  resolvePropCollisions([v], world);
  ok(v.y > 0.5 + 0.05, 'dichtbij stopt de auto ook', `y=${v.y.toFixed(2)}`);
}
// 4. kop op de muur: de neus mag er niet in blijven steken (de capsule-N was hier
//    de rijrichting zelf en duwde de auto juist naar binnen)
{
  const v = new Vehicle(0, -1.8, Math.PI / 2, { name: 'police', len: 4.4, wid: 1.8, maxSpeed: 50, accel: 10, brake: 20, turnRate: 2.5 });
  v.speed = 8;
  const world = { player: { x: 3, y: 3 }, time: 0, vehicles: [v], particles: [], addMessage() {} };
  resolvePropCollisions([v], world);
  ok(v.y < -2.1, 'kop op de muur: de auto wordt teruggezet, de neus blijft er voor', `y=${v.y.toFixed(2)}`);
}
// 5. een losse prop (bank) ver van de speler doet nog steeds niets: dat is de bestaande
//    snelheidsregel en die willen we niet stilzwijgend verruimen
{
  addProp(makeProp('bench', 20, 5, { angle: 0 }));
  const v = new Vehicle(20, 4.6, -Math.PI / 2, { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 42, accel: 9, brake: 23, turnRate: 3 });
  v.speed = 8;
  const world = { player: { x: 400, y: 400 }, time: 0, vehicles: [v], particles: [], addMessage() {} };
  resolvePropCollisions([v], world);
  ok(Math.abs(v.y - 4.6) < 1e-6, 'een losse prop ver van de speler blijft buiten de toets', `y=${v.y.toFixed(2)}`);
}

console.log(bad ? `${bad} van ${n} mislukt` : `garage_muur_test: ok (${n} controles)`);
process.exit(bad ? 1 : 0);

