// Een sloot is een val, geen lijn waar een snelle auto overheen springt: de gezwaaide (swept) toets van
// vehicle/ditchsweep.js in offroadDrag. Testsloot van 1,5 en 2,5 m breed, snelheden 5/15/30 m/s, op 60 en
// 20 beelden per seconde, met een brug (weg over de sloot) als controle.
//   node scripts/ditchsweep_test.mjs
import './node3d.mjs';
const L = await import('../game/js/waterlevels.js');
const V = await import('../game/js/vehicle.js');
const S = await import('../game/js/vehicle/ditchsweep.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// pure delen
ok(S.ditchEntrySpeed(2) === 2 && S.ditchEntrySpeed(-2) === -2, 'langzaam: onaangetast');
ok(S.ditchEntrySpeed(30) === 6 && S.ditchEntrySpeed(-30) === -6, '30 m/s: houdt een vijfde over, ook achteruit');
ok(S.ditchEntrySpeed(8) === S.DITCH.top, 'nooit onder de kruipsnelheid');
ok(S.ditchDragSpeed(10, 0.1) < 10 && S.ditchDragSpeed(3.1, 1) === S.DITCH.top, 'remmen tot de kruipsnelheid, niet erdoorheen');
{
  // alleen het gezwaaide pad raakt de sloot (y 10 tot 11,5); begin- en eindpunt liggen erbuiten
  const g = (x, y) => (y >= 10 && y <= 11.5 ? 'ditch' : null);
  ok(g(0, 9.5) === null && g(0, 12) === null, 'begin en eind zijn droog');
  const r = S.sweepGround(0, 9.5, 0, 12, 1, g);
  ok(r.ditch && r.end === null, 'de zwaai ziet de sloot tussen twee punten door');
  ok(!S.sweepGround(0, 5, 0, 9, 1, g).ditch, 'een stuk voor de sloot: niets');
  ok(S.sweepGround(0, 9.5, 0, 12, 0, g).ditch, 'ook zonder lichaamsbreedte');
}

// de sloot in de wereld: lint langs x (x van -50 tot 50), dwars op de rijrichting (y)
const K = L.WATER_KINDS.sloot;
const ribbon = (w) => ({ pts: [[-50, 10], [50, 10], [50, 10 + w], [-50, 10 + w]], bounds: [-50, 10, 50, 10 + w], kind: 'sloot', lv: K.level ?? L.BOEZEM_Y, dp: K.depth, nav: K.nav, bank: 'oever' });
const bridge = { pts: [[0, -40], [0, 60]], width: 6, cat: 'normal', type: 'unclassified', bridge: true };
const mkMap = (w, roads = []) => ({ waterNear: () => [ribbon(w)], isOnBridge: () => false, roadsNear: () => roads, water: [], waterGrid: null, buildings: [], greenNear: () => [] });
const car = (x, speed) => ({ x, y: 0, speed, angle: Math.PI / 2, driftX: 0, driftY: 0, halfWid: 0.9, model: { maxSpeed: 40, offroad: 0 }, airborne: false, ground: undefined });

// rijdt de auto in +y over de sloot; geeft { seen, vOut }: of hij erin zat en zijn snelheid erna
function drive(map, x, speed, dt, seed = 0) {
  V.setGroundMap(map);
  const v = car(x, speed);
  v.y = seed * 0.07; // een andere fase tegenover het 0,6 m-bemonsteren
  let seen = false, vOut = null;
  for (let t = 0; t < 12 / dt && v.y < 30; t += dt) {
    v.y += v.speed * dt;
    V.offroadDrag(v, dt);
    if (v._inDitch) seen = true;
    if (v.y > 10 + 3 + 6 && vOut === null) vOut = v.speed; // ruim voorbij de sloot
  }
  return { seen, vOut };
}

for (const w of [1.5, 2.5]) {
  for (const speed of [5, 15, 30]) {
    for (const dt of [1 / 60, 1 / 20]) {
      // alle bemonsteringsfasen: geen enkele auto mag eroverheen
      let allSeen = true, worst = 0;
      for (let seed = 0; seed < 12; seed++) {
        const r = drive(mkMap(w), 20, speed, dt, seed);
        if (!r.seen) allSeen = false;
        worst = Math.max(worst, r.vOut ?? 99);
      }
      ok(allSeen, `sloot ${w} m, ${speed} m/s, dt ${dt.toFixed(3)}: de auto zit er altijd in`);
      ok(worst <= 6.01, `sloot ${w} m, ${speed} m/s, dt ${dt.toFixed(3)}: na de sloot hooguit 6 m/s`, `${worst.toFixed(2)}`);
    }
  }
}
{
  // langzaam (2 m/s) is ongemoeid: de kruipsnelheid is zijn eigen tempo
  const r = drive(mkMap(1.5), 20, 2, 1 / 60);
  ok(r.vOut !== null && Math.abs(r.vOut - 2) < 1e-6, 'op 2 m/s remt de sloot niet');
}
{
  // controle: een brug (weg over de sloot) blijft droog, de snelheid blijft
  for (const speed of [5, 15, 30]) {
    const r = drive(mkMap(2.5, [bridge]), 0, speed, 1 / 60);
    ok(!r.seen && Math.abs(r.vOut - speed) < 1e-6, `brug over de sloot, ${speed} m/s: geen sloot, geen rem`, JSON.stringify(r));
  }
}
{
  // in de lucht (van een schans) is er geen sloot om in te vallen
  V.setGroundMap(mkMap(2.5));
  const v = car(20, 20); v.airborne = true; v.y = 9.4;
  v.y += 4; V.offroadDrag(v, 1 / 60);
  ok(!v._inDitch && v.speed === 20, 'in de lucht: geen rem');
}
{
  // een teleport (sprong van meer dan 12 m) is geen rit door de sloot
  V.setGroundMap(mkMap(2.5));
  const v = car(20, 20); v.y = -5; V.offroadDrag(v, 1 / 60);
  v.y = 25; V.offroadDrag(v, 1 / 60);
  ok(!v._inDitch && v.speed === 20, 'teleport: niet gezwaaid');
}

console.log(fails ? `${fails} of ${n} FAILED` : `${n} ditchsweep checks passed`);
process.exit(fails ? 1 : 0);
