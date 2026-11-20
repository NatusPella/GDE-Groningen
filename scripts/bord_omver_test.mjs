// Plaatsnaamborden en wegwijzers zijn geen onverwoestbare palen meer: een auto boven de
// breeksnelheid van de prop 'bord' rijdt ze omver (de paal valt, de collider verdwijnt,
// de schade is klein); eronder stopt de auto er gewoon tegen. Dekt:
//  - furnitureColliders geeft voor placesign en wegwijzer een breekbare 'bord'-collider (niet static);
//  - snelheid boven de drempel: bord kapot (isPropBroken), geen collider meer, auto rijdt door;
//  - snelheid onder de drempel: de auto wordt gestopt en het bord blijft staan;
//  - de schade bij het omrijden is klein;
//  - een tweede auto rijdt door de plek van het omgevallen bord (geen onzichtbare collision);
//  - de kapotmelding (Samen spelen) kent de bordsoorten.
//   node scripts/bord_omver_test.mjs
import './node3d.mjs';

const B = await import('../game/js/breakables.js');
const { furnitureColliders } = await import('../game/js/streetfurniture.js');
const { Vehicle } = await import('../game/js/vehicle.js');
const { KAPOT_SOORTEN } = await import('../game/js/coopextra.js');

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// 1. de colliders
for (const k of ['placesign', 'wegwijzer']) {
  const cs = furnitureColliders([{ k, x: 5, y: 5, a: 0, key: `${k}@50,50` }]);
  ok(cs.length === 1 && cs[0].kind === 'bord' && !cs[0].static, `${k}: een breekbare bord-collider`, JSON.stringify(cs));
  ok(KAPOT_SOORTEN.includes(k), `${k}: staat in de kapotlijst van Samen spelen`);
}
ok(!!B.PROP_DEFAULTS.bord && B.PROP_DEFAULTS.bord.topple === true, 'het bord klapt om (topple)');

const model = { name: 'auto', len: 4.2, wid: 1.8, maxSpeed: 50, accel: 10, brake: 20, turnRate: 2.5 };
// een auto op x = -3 die in +x rijdt, de paal staat op x = 0 (y = `y`)
function rij(speed, tag, y = 0) {
  const key = `${tag}@0,${y * 10}`;
  const p = B.makeProp('bord', 0, y, { key });
  B.addProp(p);
  const v = new Vehicle(-3, y, 0, model);
  v.speed = speed;
  const world = { player: { x: 0, y }, time: 1, vehicles: [v], particles: [], audioEvents: [], addMessage() {} };
  const hp0 = v.health;
  for (let i = 0; i < 40; i++) {
    v.x += Math.cos(v.angle) * v.speed * 0.05;
    B.resolvePropCollisions([v], world);
  }
  return { v, p, key, world, hp0 };
}
// 2. hard: omver
const snel = rij(9, 'placesign');
ok(B.isPropBroken(snel.key), 'op 9 m/s klapt het bord om');
ok(snel.v.x > 1, 'de auto rijdt door', `x=${snel.v.x.toFixed(2)}`);
ok(!snel.p.cell, 'de collider van het omgevallen bord is weg');
ok(snel.world.audioEvents.some((e) => e.kind === 'prop_hit' && e.material === 'metal'), 'een metalen tik');
const schade = Number.isFinite(snel.hp0) && Number.isFinite(snel.v.health) ? snel.hp0 - snel.v.health : 0;
ok(schade < 0.2 * (snel.hp0 || 100), 'de schade is klein', `${schade}`);

// 3. zacht: de auto stopt
const zacht = rij(2, 'wegwijzer', 20);
ok(!B.isPropBroken(zacht.key), 'op 2 m/s blijft het bord staan');
ok(zacht.v.x < 0, 'en de auto wordt gestopt voor de paal', `x=${zacht.v.x.toFixed(2)}`);
ok(!!zacht.p.cell, 'de collider blijft zolang het bord staat');

// 4. geen onzichtbare muur: weer een auto over dezelfde plek
{
  const v = new Vehicle(-3, 0, 0, model);
  v.speed = 4;
  const world = { player: { x: 0, y: 0 }, time: 2, vehicles: [v], particles: [], audioEvents: [], addMessage() {} };
  for (let i = 0; i < 40; i++) { v.x += v.speed * 0.05; B.resolvePropCollisions([v], world); }
  ok(v.x > 1, 'over een omgevallen bord rijdt een tweede auto gewoon door', `x=${v.x.toFixed(2)}`);
}
console.log(bad ? `${bad} van ${n} FOUT` : `bord_omver_test: ${n} controles OK`);
process.exit(bad ? 1 : 0);
