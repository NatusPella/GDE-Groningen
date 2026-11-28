// "Even pinnen" (#1342): je rijdt in een bestelbus met de pinautomaat op een aanhanger erachter, en de pijl van "rij een garage in"
// wijst naar de deur aan de straatkant. De echte missions.js op een platte testkaart (zelfde opzet als akte1_runner_test.mjs).
//   node scripts/pinnen_aanhanger_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';

const mem = new Map();
const ECHT = /^gde-(save-v1|settings|prestaties-v1)$/;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k) => { assert.ok(!ECHT.test(k), `test leest echte opslag: ${k}`); return mem.has(k) ? mem.get(k) : null; },
    setItem: (k, v) => { assert.ok(!ECHT.test(k), `test schrijft echte opslag: ${k}`); mem.set(k, String(v)); },
    removeItem: (k) => { assert.ok(!ECHT.test(k), `test wist echte opslag: ${k}`); mem.delete(k); },
    clear: () => mem.clear(),
  },
});
const M = await import('../game/js/missions.js');
const { ververs } = await import('../game/js/spelersregister.js');
const { towState } = await import('../game/js/towtrailer.js');
const K = await import('../game/js/towkinematics.js');
const G = await import('../game/js/garageguide.js');
document.body = document.createElement('div');

let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); console.log('ok  ', naam); } catch (e) { fails++; process.exitCode = 1; console.log('FAIL', naam, '\n    ' + (e.message || e)); } };

const spot = (x, y) => ({ x, y, road: null });
const KAART = {
  meta: { landmarks: [{ name: 'Groninger Museum', x: 100, y: 800 }], bounds: null, shops: [], garages: [], neighbourhoodPoints: [] }, water: [], roads: [], buildings: [], tiles: [],
  isOpenSpot: () => true, nearestRoadPoint: (x, y) => ({ x, y, road: { pts: [[x, y], [x + 1, y + 1]] } }),
  openSpotNear: (x, y) => spot(x, y), findOpenSpawn: (x, y) => spot(x, y), spawnZ: () => 0,
  buildingsNear: () => [], roadsNear: () => [], isOnBridge: () => false, escapeBuilding: (x, y) => [x + 1, y + 1], roadAt: () => null,
  groundHeightAt: () => 0, surfaceAt: () => ({ z: 0 }), spawnState: () => ({}),
};
function wereld() {
  const w = {
    map: KAART, onRespawn: [], player: { x: 0, y: 0, z: 0, gz: 0, angle: 0, inVehicle: null, radius: 0.35, exitVehicle() { this.inVehicle = null; } },
    vehicles: [], pedestrians: [], wildlife: [], stats: { pedKills: 0, copKills: 0 }, health: 100, armor: 0,
    money: 0, wanted: 0, time: 0, coopPartners: [], meldingen: [], audioEvents: [], e: false,
    input: { wasPressed: () => false, isDown(k) { return k === 'e' && w.e; }, consume() {} },
    addMessage(x) { this.meldingen.push(x); },
  };
  ververs(w, 0);
  M.initMissions(w);
  return w;
}
const tik = (w, secs, dt = 0.05) => { for (let k = 0; k < Math.round(secs / dt); k++) { w.time += dt; M.updateMissions(dt, w); } };
const ang = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const pinIndex = () => M.getMissionDefs().findIndex((d) => d.label === 'Even pinnen');
// de platte testkaart heeft geen echte weg: het voertuig krijgt zijn plek van de test (een echt spel zet hem op de weg)
const zet = (w) => { const b = w.vehicles.find((v) => v.missionCar); b.x = 100; b.y = 200; b.angle = 0.4; b.speed = 0; tik(w, 0.1); return b; };
const dissel = (tow) => ({ x: tow.x + Math.cos(tow.angle) * K.HITCH_REACH, y: tow.y + Math.sin(tow.angle) * K.HITCH_REACH });

// ---- de aanhanger meerijdt met het missievoertuig
t('Even pinnen: een bestelbus, met de aanhanger eraan gekoppeld', () => {
  const w = wereld();
  const idx = pinIndex();
  assert.ok(idx >= 0, 'de missie bestaat');
  assert.ok(M.missionDebug.start(w, idx), 'de missie start');
  tik(w, 0.5);
  assert.ok(w.vehicles.find((v) => v.missionCar), 'het missievoertuig staat in de wereld');
  const bus = zet(w);
  assert.equal(bus.model.name, 'van', 'het is een bestelbus, geen willekeurige auto');
  const tow = towState();
  assert.ok(tow, 'er is een aanhanger');
  assert.equal(tow.vehicle, bus, 'hij hangt aan het missievoertuig');
  const h = K.hitchPoint(bus), d = dissel(tow);
  assert.ok(Math.hypot(d.x - h.x, d.y - h.y) < 0.01, 'de dissel zit aan het koppelpunt achter de bus ');
});

t('Even pinnen: de aanhanger rijdt mee door een bocht, de dissel blijft aan het koppelpunt', () => {
  const w = wereld();
  M.missionDebug.start(w, pinIndex());
  tik(w, 0.5);
  const bus = zet(w);
  let maxHoek = 0;
  for (let k = 0; k < 160; k++) {
    // 8 m/s: de eerste 80 stappen rechtdoor, dan een bocht naar links
    bus.angle += k > 80 ? 0.035 : 0;
    bus.x += Math.cos(bus.angle) * 0.4; bus.y += Math.sin(bus.angle) * 0.4;
    tik(w, 0.05);
    const tow = towState();
    const h = K.hitchPoint(bus), d = dissel(tow);
    assert.ok(Math.hypot(d.x - h.x, d.y - h.y) < 0.01, `stap ${k}: de dissel blijft aan het koppelpunt`);
    maxHoek = Math.max(maxHoek, ang(tow.angle, bus.angle));
  }
  assert.ok(maxHoek > 0.02, 'in de bocht zwaait de aanhanger zichtbaar uit');
  assert.ok(maxHoek <= K.MAX_FOLD + 1e-9, 'maar vouwt niet dubbel');
  const tow = towState();
  assert.ok(Math.hypot(tow.x - bus.x, tow.y - bus.y) < 8, 'hij blijft vlak achter de bus');
});

t('Even pinnen: de aanhanger gaat weg als de missie voorbij is', () => {
  const w = wereld();
  M.missionDebug.start(w, pinIndex());
  tik(w, 0.5);
  assert.ok(towState());
  M.missionDebug.lose(w);
  tik(w, 0.5);
  assert.equal(towState(), null, 'na het mislukken is er geen aanhanger meer');
});

t('een andere missie met een auto krijgt geen aanhanger', () => {
  const w = wereld();
  const idx = M.getMissionDefs().findIndex((d) => d.type === 'stages' && d.vehicle === 'car' && !d.tow && d.start && d.start.road !== undefined);
  assert.ok(idx >= 0);
  M.missionDebug.start(w, idx);
  tik(w, 0.5);
  assert.equal(towState(), null);
});

// ---- de pijl naar de garage
// Een garage aan een straat: de box ligt achter de stoep, de deur kijkt naar de straat (angle wijst naar de straat, naar -y).
const garage = { x: 100, y: 50, angle: -Math.PI / 2 };
const DIEPTE = 10.5;
t('garage: de deur ligt aan de straatkant, bayD/2 + 3 voor het midden', () => {
  const d = G.doorPoint(garage, DIEPTE);
  assert.ok(Math.abs(d.x - 100) < 1e-9);
  assert.ok(Math.abs(d.y - (50 - DIEPTE / 2 - G.DOOR_OUT)) < 1e-9, 'aan de kant waar de deur naartoe kijkt');
});

t('garage: van opzij wijst de pijl naar de deur, niet dwars door de muur naar het midden', () => {
  const doel = { x: garage.x, y: garage.y, door: G.doorPoint(garage, DIEPTE) };
  const S = {};
  const van = { x: 160, y: doel.door.y }; // 60 m verderop langs de straat
  const m = G.garageGuide(doel, van, S);
  assert.deepEqual([m.x, m.y], [doel.door.x, doel.door.y], 'de pijl wijst naar de deur');
  const bij = G.garageGuide(doel, { x: doel.door.x + 4, y: doel.door.y }, S);
  assert.deepEqual([bij.x, bij.y], [doel.x, doel.y], 'vlak bij de deur wijst hij de box in');
  const terug = G.garageGuide(doel, { x: doel.door.x + 30, y: doel.door.y }, S);
  assert.deepEqual([terug.x, terug.y], [doel.x, doel.y], 'de markering blijft in de box');
});

t('garage: een doel zonder deur (een gewoon punt) blijft zoals het was', () => {
  const doel = { x: 5, y: 6 };
  assert.equal(G.garageGuide(doel, { x: 0, y: 0 }, {}), doel);
  assert.equal(G.garageGuide(null, { x: 0, y: 0 }, {}), null);
});

console.log(`pinnen_aanhanger_test: ${n} controles, ${fails} fouten`);
process.exit(fails ? 1 : 0);
