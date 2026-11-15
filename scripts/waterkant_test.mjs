// #936/#949: de graskade is een echte rand. Een auto die rustig tegen de wal
// rijdt wordt tegengehouden; hard eroverheen gaat met physics en een plons.
// Deze test legt de pure randregels vast (wateredge.js) en speelt de guard na op
// een echte Vehicle met een eigen watertoets.
//   node scripts/waterkant_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import { EDGE, shoreBlocks, lastDryDistance, edgeBackOff } from '../game/js/wateredge.js';
const V = await import('../game/js/vehicle.js');

let n = 0, bad = 0;
const ok = (name, c, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };
const near = (a, b, m = 1e-6) => Math.abs(a - b) <= m;

// --- de pure regel -----------------------------------------------------------
ok('rustig tegen de wal: tegenhouden', shoreBlocks({ speed: 3, onLand: true, aheadWet: true }) === true);
ok('stilstand: niets doen', shoreBlocks({ speed: 0.2, onLand: true, aheadWet: true }) === false);
ok('hard eroverheen: laten gaan (physics + plons)', shoreBlocks({ speed: 12, onLand: true, aheadWet: true }) === false);
ok('op het water zelf: laten gaan', shoreBlocks({ speed: 3, onLand: false, aheadWet: true }) === false);
ok('geen water vooruit: niets doen', shoreBlocks({ speed: 3, onLand: true, aheadWet: false }) === false);
ok('op een brug: geen rand', shoreBlocks({ speed: 3, onLand: true, aheadWet: true, onBridge: true }) === false);
ok('in de lucht: geen rand', shoreBlocks({ speed: 3, onLand: true, aheadWet: true, airborne: true }) === false);
ok('een boot of heli kent de rand niet', shoreBlocks({ speed: 3, onLand: true, aheadWet: true, boat: true }) === false && shoreBlocks({ speed: 3, onLand: true, aheadWet: true, heli: true }) === false);

// --- het laatste droge punt --------------------------------------------------
const wetVanaf = (rand) => (x) => x >= rand;
ok('de rand wordt op de meter gevonden', near(lastDryDistance({ x: 0, y: 0 }, 1, 0, 12, wetVanaf(5)), 5, 0.06), String(lastDryDistance({ x: 0, y: 0 }, 1, 0, 12, wetVanaf(5))));
ok('geen water binnen bereik: null', lastDryDistance({ x: 0, y: 0 }, 1, 0, 12, () => false) === null);
ok('water meteen voor de neus: bijna nul', lastDryDistance({ x: 0, y: 0 }, 1, 0, 12, wetVanaf(0.01)) < 0.2);
ok('de terugzetafstand is nooit negatief en groter dichter bij de rand', edgeBackOff(10, 2) < edgeBackOff(1, 2) && edgeBackOff(1, 2) > 0);

const MODEL = { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 38, accel: 9, brake: 23, turnRate: 3, color: '#c7c9cc' };
const maak = (x, speed) => {
  const v = new V.Vehicle(x, 0, 0, MODEL);
  v.driver = 'player';
  v.speed = speed;
  v.z = 0;
  return v;
};
// water vanaf x = 8; de auto rijdt er met 6 m/s op af (onder de stopSnelheid)
const MAP = { waterNear: () => [{ pts: [[8, -20], [40, -20], [40, 20], [8, 20], [8, -20]] }] };
const wet = (x) => x >= 8;
{
  const v = maak(2.0, 6); // neus op 3,9; blik op 5,1 (droog) -> nog geen rand
  const rem = V.guardWaterEdge(v, MAP, null, (x, y) => wet(x));
  ok('ver van de wal gebeurt er niets', rem === false && v.x === 2.0, String(rem));
}
{
  const v = maak(5.6, 6); // neus op 7,5; blik op 8,1 -> water
  const rem = V.guardWaterEdge(v, MAP, null, (x, y) => wet(x));
  const nose = v.x + v.halfLen;
  ok('de auto wordt bij de wal tegengehouden', rem === true, String(rem));
  ok('de neus staat op het droge, niet in het water', nose < 8, `neus ${nose.toFixed(2)}`);
  ok('de auto is flink afgeremd', Math.abs(v.speed) < 1, `snelheid ${v.speed.toFixed(2)}`);
  ok('de auto blijft heel (een tik, geen klap)', v.health === 100);
}
{
  const v = maak(5.6, 14); // hard: 50 km/u
  const rem = V.guardWaterEdge(v, MAP, null, (x, y) => wet(x));
  ok('hard rijden wordt niet tegengehouden: dat is de plons', rem === false && Math.abs(v.speed) === 14);
}
{
  const v = maak(5.6, 6);
  v.isBoat = true;
  ok('een boot kent de waterrand niet', V.guardWaterEdge(v, MAP, null, (x, y) => wet(x)) === false);
}
{
  // de wal is een tik, geen schade: de impactmelding is klein
  const v = maak(5.6, 6);
  V.guardWaterEdge(v, MAP, null, (x, y) => wet(x));
  ok('de tik levert een kleine impactmelding op', v.pendingImpact && v.pendingImpact.speed < 12, JSON.stringify(v.pendingImpact));
}

// --- te water: de plons en het geluid ----------------------------------------
// Een auto die met 12 m/s van de wal rijdt, valt, raakt het water en zinkt.
{
  const { world, car } = (() => {
    const w = {
      time: 0, vehicles: [], particles: [], audioEvents: [], player: { x: 0, y: 0, inVehicle: null }, addMessage() {}, health: 100,
      map: { ...MAP, inWaterRaw: (x) => x >= 8, groundHeightAt: () => 0, waterNear: MAP.waterNear, roadsNear: () => [], water: [] },
    };
    const c = new V.Vehicle(9.0, 0, 0, MODEL);
    c.driver = 'ai';
    c.speed = 12;
    w.vehicles.push(c);
    return { world: w, car: c };
  })();
  V.checkVehicleWater(car, world.map, world, (x, y) => wet(x));
  ok('een harde auto gaat te water', !!car.sinking && car.sinking.phase === 'fall', JSON.stringify(car.sinking && car.sinking.phase));
  // de val: 3 s water tegen, dan drijven; de plons hoort bij de klap
  for (let i = 0; i < 300 && car.sinking && car.sinking.phase === 'fall'; i++) { world.time += 1 / 60; V.tickSinkingVehicles(world); }
  ok('de auto haalt het water', !!car.sinking && car.sinking.phase === 'float', JSON.stringify(car.sinking && car.sinking.phase));
  ok('er is een plons te zien', world.particles.some((p) => p.kind === 'splash'), String(world.particles.length));
  ok('er is een plons te horen', world.audioEvents.some((e) => e.kind === 'splash'), JSON.stringify(world.audioEvents));
  ok('de auto zinkt daarna door', (() => { for (let i = 0; i < 600 && car.sinking; i++) { world.time += 1 / 60; V.tickSinkingVehicles(world); } return !car.sinking; })(), JSON.stringify(car.sinking && car.sinking.phase));

// --- de koppeling in vehicle.js ---------------------------------------------
const src = fs.readFileSync(new URL('../game/js/vehicle.js', import.meta.url), 'utf8');
ok('checkVehicleWater roept de waterrand-guard aan', /if \(v\.driver === 'player' && guardWaterEdge\(v, map, world, isWet\)\) return false;/.test(src));
ok('de plons is een echt geluid, geen stil beeld', /kind: 'splash', x: v\.x, y: v\.y/.test(src) && /splash_big/.test(src));
ok('de auto valt met zijn eigen snelheid en zwaartekracht', /s\.vz -= SINK_GRAVITY \* dt/.test(src) && /vx: Math\.cos\(v\.angle\) \* v\.speed/.test(src));
}

console.log(`waterkant_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);

