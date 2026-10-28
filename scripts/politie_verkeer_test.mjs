// #502: twee regels uit de playtest van 27-10 vastleggen.
//  1. Een schot van een agent eindigt op de auto van de speler in plaats van
//     erdoorheen te vliegen, en de loop zit bij het raam (niet bij de bumper).
//  2. Verkeer binnen de sireneradius gaat aan de kant voor een jagende
//     politicauto, ook zonder dat die sirenOn zet.
//   node scripts/politie_verkeer_test.mjs
import './node3d.mjs';

const V = await import('../game/js/vehicle.js');
const P = await import('../game/js/police.js');
const C = await import('../game/js/combat.js');
const { activeSirens, sirenYield } = await import('../game/js/trafficyield.js');

let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };

const HATCH = { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 42, accel: 9, brake: 23, turnRate: 3.0, color: '#c7c9cc' };
const MAP = { roads: [], roadsNear: () => [], buildingsNear: () => [], waterNear: () => [], inWater: () => false, inWaterRaw: () => false, offStreetLevel: () => 0 };

// --- 1. de kogel -------------------------------------------------------------

// Een politieauto 15 m achter de auto van de speler, allebei op hoogte z
// (z = 3 is een brug of viaduct: daar ging de kogel eerst onderdoor).
function schietpartij(z) {
  const car = new V.Vehicle(0, 0, 0, HATCH);
  car.driver = 'player';
  car.z = z;
  const pol = new V.Vehicle(-15, 0, 0, HATCH);
  pol.isPolice = true;
  pol.z = z;
  const player = { x: 0, y: 0, radius: 0.35, inVehicle: car, z: 0, gz: 0 };
  const world = {
    time: 0, map: MAP, player, vehicles: [car, pol], pedestrians: [], props: [], bullets: [], particles: [],
    stats: {}, wanted: 3, armor: 0, health: 100, audioEvents: [], addMessage() {},
  };
  const shot = P.policeShot(pol, world);
  ok(!!shot, `z=${z}: de agent lost een schot`, 'geen kogel');
  if (!shot) return null;
  const monding = { x: shot.x, y: shot.y }; // updateBullets schuift de kogel op
  world.bullets.push(shot);
  let last = { x: shot.x, y: shot.y }, frames = 0;
  while (world.bullets.length && frames++ < 300) {
    C.updateBullets(1 / 60, world);
    if (world.bullets.length) last = { x: world.bullets[0].x, y: world.bullets[0].y };
  }
  return { car, pol, world, shot, monding, last };
}

for (const z of [0, 3]) {
  const s = schietpartij(z);
  if (!s) continue;
  // de loop zit bij het raam aan de chauffeurskant: een halve auto breed van de
  // hartlijn, niet in het midden of bij de bumper
  const lat = (s.monding.x - s.pol.x) * -Math.sin(s.pol.angle) + (s.monding.y - s.pol.y) * Math.cos(s.pol.angle);
  ok(Math.abs(lat) > 0.4, `z=${z}: het schot komt uit het raam, niet uit de bumper`, `zijwaarts ${lat.toFixed(2)} m`);
  ok(Math.abs(lat) < s.pol.halfWid + 0.3, `z=${z}: de loop blijft binnen de auto`, `zijwaarts ${lat.toFixed(2)} m`);
  // de kogelhoogte hoort bij de auto, anders vliegt hij op een brug onder de auto door
  ok(s.shot.z > z + 0.9 && s.shot.z < z + 1.55, `z=${z}: de kogel vliegt op raamhoogte van de auto`, `z ${s.shot.z.toFixed(2)}`);
  // de baan eindigt op de auto (binnen de carrosserie), niet erachter
  ok(Math.abs(s.last.x) <= s.car.halfLen + 0.2, `z=${z}: de kogelbaan eindigt op de auto`, `laatste x ${s.last.x.toFixed(2)}`);
  ok(s.car.health < 100, `z=${z}: de auto vangt de kogel`, `autoschade ${(100 - s.car.health).toFixed(1)}`);
  ok(s.world.health === 100, `z=${z}: de inzittende blijft ongedeerd achter de carrosserie`, `speler ${s.world.health}`);
  ok(s.world.bullets.length === 0, `z=${z}: de kogel is opgebruikt`, `nog ${s.world.bullets.length}`);
}

// --- 2. uitwijken voor de sirene ---------------------------------------------

// Een rechte weg van 180 m, 9 m breed (twee rijstroken); rechts van de
// rijrichting is -x, dus de auto's rijden op x = -1.5 en de stoeprand ligt op
// x = -3.6 (halve breedte 4.5 min de halve autobreedte).
const ROAD = { pts: [[0, 0], [0, 60], [0, 120], [0, 180]], width: 9, cat: 'normal', oneway: false, speed: 8, id: 'testweg' };
const AI_MAP = { ...MAP, roads: [ROAD], roadsNear: () => [ROAD] };

function verkeer({ wanted = 3, sirene = false, tijd = 0 } = {}) {
  const maak = (s, police) => {
    const v = new V.Vehicle(-1.5, s, Math.PI / 2, police ? { ...HATCH, len: 4.3, wid: 1.8 } : HATCH);
    v.road = ROAD; v.dir = 1; v.segIdx = 0; v.speed = 7;
    v.isPolice = police;
    v.sirenOn = police && sirene;
    return v;
  };
  const civ = maak(40, false);
  const pol = maak(15, true);
  const world = {
    time: tijd, map: AI_MAP, vehicles: [civ, pol], pedestrians: [], bullets: [], particles: [], props: [],
    stats: {}, wanted, player: { x: 0, y: 0, inVehicle: null, radius: 0.35 }, police: {}, audioEvents: [], addMessage() {},
  };
  return { civ, pol, world };
}

const lateraal = (v) => -(v.x - ROAD.pts[0][0]); // rechts van de rijrichting (+), in meters van de middellijn
const DT = 1 / 30;

{
  // de jagende politicauto zet nooit sirenOn: toch moet hij als sirene gelden
  const S = verkeer();
  ok(!S.pol.sirenOn, 'een jagende politicauto heeft sirenOn niet aan', String(S.pol.sirenOn));
  ok(activeSirens(S.world).includes(S.pol), 'de jagende politicauto telt als sirene');
  ok(sirenYield(S.civ, S.world) === 'aside', 'de burgerauto voor de sirene gaat aan de kant', String(sirenYield(S.civ, S.world)));

  const begin = lateraal(S.civ);
  const beginY = S.civ.y;
  for (let i = 0; i < 120; i++) {
    S.world.time += DT;
    for (const v of [S.civ, S.pol]) {
      V.updateTrafficAI(v, DT, AI_MAP, S.world, Math.random);
      V.resolveVehicleBuildingCollision(v, AI_MAP, DT);
    }
  }
  const eind = lateraal(S.civ);
  ok(eind - begin > 0.8, 'de burgerauto schuift van de rijstrook naar de stoeprand', `${begin.toFixed(2)} -> ${eind.toFixed(2)} m`);
  ok(eind <= ROAD.width / 2 + 0.2, 'de auto blijft op de weg', `${eind.toFixed(2)} m van de middellijn`);
  ok(S.civ.speed > 1 && S.civ.y - beginY > 10, 'het verkeer blijft rollen in plaats van stil te vallen', `snelheid ${S.civ.speed.toFixed(1)}, ${(S.civ.y - beginY).toFixed(0)} m verder`);
  ok(Math.abs(Math.sin(S.civ.angle - Math.PI / 2)) < 0.5, 'de auto gaat niet tollen', `hoek ${S.civ.angle.toFixed(2)}`);
}

{
  // controle: zonder sirene (geen politie in de buurt) blijft de auto in zijn baan
  const S = verkeer({ wanted: 0, tijd: 500 });
  ok(sirenYield(S.civ, S.world) === null, 'zonder sirene wijkt niemand uit', String(sirenYield(S.civ, S.world)));
  const begin = lateraal(S.civ);
  for (let i = 0; i < 90; i++) {
    S.world.time += DT;
    for (const v of [S.civ, S.pol]) {
      V.updateTrafficAI(v, DT, AI_MAP, S.world, Math.random);
      V.resolveVehicleBuildingCollision(v, AI_MAP, DT);
    }
  }
  ok(Math.abs(lateraal(S.civ) - begin) < 1.2, 'zonder sirene blijft de auto in de rijstrook', `${begin.toFixed(2)} -> ${lateraal(S.civ).toFixed(2)} m`);
}

{
  // controle: buiten de sireneradius (80 m) is er nog niets aan de hand
  const S = verkeer({ tijd: 900, sirene: true });
  S.pol.y = S.civ.y - 80;
  ok(sirenYield(S.civ, S.world) === null, 'buiten de sireneradius wijkt de auto nog niet uit', String(sirenYield(S.civ, S.world)));
}

console.log(`politie_verkeer_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
