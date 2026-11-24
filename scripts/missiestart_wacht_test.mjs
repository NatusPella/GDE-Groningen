// De start van een missie die op iets wacht (24-11, spelbot M05): wie zonder eigen fiets of te voet bij de start van de KEI-weekrace kwam,
// kreeg de melding en de start ging van scherp af; stapte hij daar op zijn fiets, dan gebeurde er niets tot hij 8 m wegreed en terugkwam.
// Nu zet een andere rit of een vervulde eis de start opnieuw op scherp, zonder weg te lopen en zonder dat de melding elke frame komt.
// De echte missions.js op een platte testkaart (zoals missions_591_test.mjs). Geen opslag, geen browser.
//   node scripts/missiestart_wacht_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';

const M = await import('../game/js/missions.js');
const S = await import('../game/js/shops.js');
const { ververs } = await import('../game/js/spelersregister.js');
document.body = document.createElement('div');

let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); console.log('ok    ' + naam); } catch (e) { fails++; process.exitCode = 1; console.log('FAIL  ' + naam + '\n      ' + (e.message || e)); } };

const spot = (x, y) => ({ x, y, road: null });
const maakRoad = (x, y) => ({ x, y, road: { pts: [[x, y], [x + 1, y], [x + 1, y + 2], [x + 3, y + 2]], oneway: false } });
const KAART = {
  meta: { bounds: null, shops: [], garages: [], neighbourhoodPoints: [] }, water: [], roads: [], buildings: [], tiles: [],
  isOpenSpot: () => true, nearestRoadPoint: (x, y) => maakRoad(x, y), orderedRoads: () => KAART.roads,
  openSpotNear: (x, y) => spot(x, y), findOpenSpawn: (x, y) => spot(x, y), spawnZ: () => 0,
  buildingsNear: () => [], roadsNear: () => [], isOnBridge: () => false, escapeBuilding: (x, y) => [x + 1, y + 1], roadAt: () => null,
  groundHeightAt: () => 0, surfaceAt: () => ({ z: 0 }), spawnState: () => ({}),
};
const wereld = () => {
  const w = {
    map: KAART, onRespawn: [], player: { x: 0, y: 0, z: 0, gz: 0, angle: 0, inVehicle: null, radius: 0.35, exitVehicle() { this.inVehicle = null; } },
    vehicles: [], pedestrians: [], wildlife: [], stats: { pedKills: 0, copKills: 0 }, health: 100, armor: 0,
    money: 0, wanted: 0, time: 0, coopPartners: [], meldingen: [], ammo: {},
    input: { wasPressed: () => false, consume: () => {}, isDown: () => false },
    addMessage(t) { this.meldingen.push(t); },
  };
  ververs(w, 0);
  M.initMissions(w);
  return w;
};
const tikk = (w, s, dt = 0.05) => { for (let i = 0; i < Math.round(s / dt); i++) { w.time += dt; M.updateMissions(dt, w); } };

let kei = -1;
const fiets = { id: 4242, kind: 'fiets', isBike: true, x: 0, y: 0, speed: 0, model: { name: 'bike', maxSpeed: 6 } };

t('M05: te voet bij de start: niet gestart, de melding over de fiets komt een keer per 3 s, niet elke frame', () => {
  const w = wereld();
  kei = M.missionIndexById('kei');
  S.applyShopSave(w, { vehicles: [{ key: 'omafiets', garage: true }] }); // een eigen fiets in bezit: de eis is voldaan, alleen de rit niet
  assert.ok(kei >= 0);
  assert.equal(M.trackMission(w, kei), true);
  const def = M.getMissionDefs()[kei];
  w.player.x = def.start.x; w.player.y = def.start.y;
  tikk(w, 2);
  assert.equal(M.missionDebug.state().phase, 'idle', 'te voet start de fietsrace niet');
  assert.ok(w.meldingen.length >= 1 && w.meldingen.length <= 2, `de melding komt niet elke frame (${w.meldingen.length})`);
});

t('M05: daarna op de fiets stappen bij de start: de race start, zonder eerst weg te rijden', () => {
  const w = wereld();
  kei = M.missionIndexById('kei');
  S.applyShopSave(w, { vehicles: [{ key: 'omafiets', garage: true }] });
  M.trackMission(w, kei);
  const def = M.getMissionDefs()[kei];
  w.player.x = def.start.x; w.player.y = def.start.y;
  tikk(w, 1);
  assert.equal(M.missionDebug.state().phase, 'idle');
  fiets.x = w.player.x; fiets.y = w.player.y;
  w.player.inVehicle = fiets; w.vehicles.push(fiets);
  tikk(w, 1);
  assert.notEqual(M.missionDebug.state().phase, 'idle', 'op de fiets bij de start: de race begint');
});

t('weglopen en terugkomen werkt zoals altijd', () => {
  const w = wereld();
  kei = M.missionIndexById('kei');
  S.applyShopSave(w, { vehicles: [{ key: 'omafiets', garage: true }] });
  M.trackMission(w, kei);
  const def = M.getMissionDefs()[kei];
  w.player.x = def.start.x; w.player.y = def.start.y;
  tikk(w, 1);
  w.player.x = def.start.x + 40; tikk(w, 0.2);
  assert.equal(M.missionDebug.state().armed, true, 'buiten de ring weer op scherp');
});

console.log(`missiestart_wacht_test: ${n - fails}/${n} ok`);
