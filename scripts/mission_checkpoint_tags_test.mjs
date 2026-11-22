// Een hervatpunt bewaart ook de keuzes van voor dat punt (tags, bakscore, O-skip van de inbraak).
// startMission wist de tags bij elke poging en het hervatpunt zette ze niet terug: wie in M23 na de keuze
// van de bondgenoot de colonne kwijtraakte en opnieuw begon bij het hervatpunt, was zijn bondgenoot kwijt
// (geen bonus, geen regel op de kaart, niets onthouden voor M26).
// De echte missions.js op een platte testkaart, zoals missions_591_test.mjs. Geen opslag, geen browser.
//   node scripts/mission_checkpoint_tags_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import { makeCheckpoint, applyCheckpointProgress } from '../game/js/missioncheckpoint.js';
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

const i = M.missionIndexById('colonne');
const naarColonne = () => {
  assert.equal(M.missionDebug.start(w, i), true, 'de opdracht start');
  for (let k = 0; k < 400 && M.missionDebug.state().stage < 1; k++) { toetsen.add('2'); tik(0.1); } // keuze 2: Tinus met de trekker (+100)
  toetsen.delete('2');
  for (let k = 0; k < 600 && M.missionDebug.state().stage < 2; k++) tik(0.1); // de scene speelt zichzelf uit
  assert.equal(M.missionDebug.state().stage, 2, 'bij het instappen');
  M.missionDebug.complete(w); tik();
  assert.equal(M.missionDebug.state().stage, 3, 'de colonne rijdt');
};
const uitslag = () => { w.meldingen.length = 0; M.missionDebug.win(w); return w.meldingen.find((m) => /geklaard/.test(m)) || ''; };

t('zonder mislukking telt de gekozen bondgenoot mee in de uitslag', () => {
  naarColonne();
  assert.match(uitslag(), /€100 bonus/);
});

t('na mislukken en hervatten bij het hervatpunt telt de keuze nog steeds', () => {
  for (let k = 0; k < 100; k++) tik(0.1);
  M.setMissionProgress(w, { completed: [] }); // een schone keten: de eerste test rondde de opdracht af
  naarColonne();
  assert.equal(M.missionDebug.lose(w), true);
  for (let k = 0; k < 100; k++) tik(0.1);
  assert.equal(M.missionDebug.start(w, i), true, 'de nieuwe poging start');
  tik(); tik();
  assert.equal(M.missionDebug.state().stage, 3, 'en begint bij het hervatpunt (de colonne)');
  assert.match(uitslag(), /€100 bonus/, 'de bondgenoot van voor het hervatpunt is niet vergeten');
});

t('het hervatpunt houdt een eigen kopie: tags van na het punt lekken niet terug', () => {
  const chain = { tags: new Set(['a']), bakeTier: 'top', heistSkip: true };
  const cp = makeCheckpoint({ missionIndex: 1, stageIndex: 2, timeLeft: null, chain });
  chain.tags.add('later');
  const nieuw = { tags: new Set(), bakeTier: null, heistSkip: false, timeLeft: Infinity };
  applyCheckpointProgress(cp, nieuw);
  assert.deepEqual([...nieuw.tags], ['a']);
  assert.equal(nieuw.bakeTier, 'top');
  assert.equal(nieuw.heistSkip, true);
  nieuw.tags.add('tweede-poging');
  const derde = { tags: new Set() };
  applyCheckpointProgress(cp, derde);
  assert.deepEqual([...derde.tags], ['a'], 'een tweede hervatting ziet de tags van de eerste niet');
});

console.log(fails ? fails + ' mislukt' : 'mission_checkpoint_tags_test: alles geslaagd');
