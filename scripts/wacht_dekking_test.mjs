// #963: elke langere wachtstap (hold van 7 s of meer, buiten een binnenset) heeft iets te zien: een wachtfiguur
// (`wacht`), of is bewust zonder (`wacht: { figuur: false }`) of een bijbaan. Anders staat de speler in een lege kring.
//   node scripts/wacht_dekking_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const mem = new Map();
const ECHT = /^gde-(save-v1|settings|prestaties-v1)$/;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (k) => { assert.ok(!ECHT.test(k)); return mem.has(k) ? mem.get(k) : null; },
  setItem: (k, v) => { assert.ok(!ECHT.test(k)); mem.set(k, String(v)); },
  removeItem: (k) => mem.delete(k), clear: () => mem.clear() } });
document.body = document.createElement('div');
const M = await import('../game/js/missions.js');
const { waitFigureFor } = await import('../game/js/wachtprops.js');
const { ververs } = await import('../game/js/spelersregister.js');

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
const st = () => M.missionDebug.state();
const tik = (w, secs, dt = 0.05) => { for (let k = 0; k < Math.round(secs / dt); k++) { w.time += dt; M.updateMissions(dt, w); } };
wereld();
wereld();
let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; process.exitCode = 1; console.log('FAIL', name, extra); } };
const MIN_TIJD = 7;
const open = [];
let holds = 0;
for (const d of M.getMissionDefs()) {
  for (const s of d.stages || []) {
    if (!s || s.kind !== 'hold' || s.set) continue;
    holds++;
    if (!(s.time >= MIN_TIJD)) continue;
    const heeft = !!waitFigureFor(s) || (s.wacht && s.wacht.figuur === false);
    if (!heeft) open.push(`${d.label} > ${s.label}`);
  }
}
ok(holds > 10, 'er zijn wachtstappen om te controleren', String(holds));
ok(open.length === 0, 'elke lange wachtstap buiten een set heeft een wachtfiguur of kiest er bewust niet voor', '\n  ' + open.join('\n  '));
console.log(`${n - fails}/${n} wacht_dekking (${holds} wachtstappen buiten een set)`);
