// Een mislukte of gestopte achtervolging geeft het vluchtende voertuig terug aan het verkeer.
// endInFailure wiste de stage voordat releaseMissionVehicle stage.target kon lezen: de tankwagen bleef
// missionCar en chaseTarget (richthulp, geen opruiming) en reed met chase-AI door, en elke nieuwe poging zette er een bij.
// De echte missions.js op een platte testkaart, zoals missions_591_test.mjs. Geen opslag, geen browser.
//   node scripts/mission_chase_release_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const M = await import('../game/js/missions.js');
const { ververs } = await import('../game/js/spelersregister.js');
document.body = document.createElement('div');
const spot = (x, y) => ({ x, y, road: null });
const maakRoad = (x, y) => ({ x, y, road: { pts: [[x, y], [x + 1, y], [x + 1, y + 2], [x + 3, y + 2]], oneway: false } });
const KAART = {
  meta: { bounds: null, shops: [], garages: [], neighbourhoodPoints: [] }, water: [], roads: [], buildings: [], tiles: [],
  isOpenSpot: () => true, nearestRoadPoint: (x, y) => maakRoad(x, y),
  orderedRoads: () => KAART.roads,
  openSpotNear: (x, y) => spot(x, y), findOpenSpawn: (x, y) => spot(x, y), spawnZ: () => 0,
  buildingsNear: () => [], roadsNear: () => [], isOnBridge: () => false, escapeBuilding: (x, y) => [x + 1, y + 1], roadAt: () => null,
  groundHeightAt: () => 0, surfaceAt: () => ({ z: 0 }), spawnState: () => ({}),
};
const toetsen = new Set();
const w = {
  map: KAART, onRespawn: [], player: { x: 0, y: 0, z: 0, gz: 0, angle: 0, inVehicle: null, radius: 0.35, exitVehicle() { this.inVehicle = null; } },
  vehicles: [], pedestrians: [], wildlife: [], stats: { pedKills: 0, copKills: 0 }, health: 100, armor: 0,
  money: 0, wanted: 0, time: 0, coopPartners: [], meldingen: [],
  input: { wasPressed: (k) => toetsen.has(k), consume: (k) => toetsen.delete(k), isDown: () => false, toetsen },
  addMessage(t) { this.meldingen.push(t); },
};
ververs(w, 0); M.initMissions(w);
const tik = (dt = 0.05) => { w.time += dt; M.updateMissions(dt, w); };

let fails = 0;
const t = (naam, f) => { try { f(); console.log('ok    ' + naam); } catch (e) { fails++; process.exitCode = 1; console.log('FAIL  ' + naam + ' :: ' + (e.message || e)); } };

const naarChase = () => {
  const i = M.missionIndexById('vetgekaapt');
  assert.equal(M.missionDebug.start(w, i), true, 'de opdracht start');
  tik();
  if (M.missionDebug.state().stage < 1) M.missionDebug.complete(w); // board -> chase (a second attempt resumes at the chase itself)
  tik(); tik();
  assert.equal(w.vehicles.filter((v) => v.chaseTarget).length, 1, 'de tankwagen vlucht');
};
const vrij = (wat) => {
  const hangend = w.vehicles.filter((v) => v.chaseTarget || v.missionCar || (v.aiOpts && v.aiOpts.chase));
  assert.equal(hangend.length, 0, wat + ': geen voertuig houdt missionCar, chaseTarget of chase-AI vast');
};

t('mislukt tijdens de achtervolging: de tankwagen is weer gewoon verkeer', () => {
  naarChase();
  assert.equal(M.missionDebug.lose(w), true);
  tik();
  vrij('na mislukken');
});

t('gestopt tijdens de achtervolging (pauzemenu): hetzelfde', () => {
  for (let k = 0; k < 100; k++) tik(0.1);
  naarChase();
  assert.equal(M.cancelActiveMission(w), true);
  tik();
  vrij('na stoppen');
});

console.log(fails ? fails + ' mislukt' : 'mission_chase_release_test: alles geslaagd');
