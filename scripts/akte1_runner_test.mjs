// AAA-upgrade van akte 1: de echte missions.js (runner) op een platte testkaart, voor wat de bouwstenen in de runner doen:
// M06 (korte handelingen in plaats van tikspellen), M05 (stings en finish) en M01 (stunt met arena). Zelfde opzet als
// coopmissie_motor_test.mjs: alleen de kaart en de opslag zijn nagemaakt. missionDebug.start is de cheat van de spelbot.
//   node scripts/akte1_runner_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';

// Tests schrijven nooit naar echte opslag (AGENTS.md): deze sleutels zijn hier dicht.
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
const { KEI_ROUTE } = await import('../game/js/keiroute.js');
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
const st = () => M.missionDebug.state();
const tik = (w, secs, dt = 0.05) => { for (let k = 0; k < Math.round(secs / dt); k++) { w.time += dt; M.updateMissions(dt, w); } };
const naarDoel = (w) => { const d = st().stageInfo && st().stageInfo.target; if (d) { w.player.x = d.x; w.player.y = d.y; } };
const stappen = (w) => w.audioEvents.filter((e) => e.kind === 'missiesting' && e.name === 'stap').length;

// ---- M06: de stroomkast, het slot en de vitrine zijn korte handelingen --------------------------------------------
let i06 = M.missionIndexById('museumkraak'); wereld(); i06 = M.missionIndexById('museumkraak'); // de defs bestaan pas na initMissions
const stageKind = () => { const d = M.getMissionDefs()[i06]; return d.stages[st().stage] && d.stages[st().stage].kind; };
const naarStap = (w, kind) => { let g = 0; while (stageKind() !== kind && g++ < 12) { M.missionDebug.skipStage(w); tik(w, 0.1); } return stageKind() === kind; };
const naarKast = (w) => { M.missionDebug.start(w, i06); tik(w, 1.5); naarDoel(w); tik(w, 0.5); naarDoel(w); tik(w, 0.5); };

t('de drie kraakstappen van M06 zijn korte handelingen, de laser blijft zoals hij was', () => {
  const d = M.getMissionDefs()[i06];
  for (const kind of ['fuse', 'lock', 'crack']) {
    const s = d.stages.find((q) => q.kind === kind);
    assert.ok(s.kort && s.kort.time >= 1 && s.kort.time <= 8, kind + ' heeft een korte handeling');
    assert.ok(s.kaart && s.kaart.doel && s.kaart.regels.length >= 1, kind + ' heeft een regelkaart');
    assert.ok(!/Spatie|naald|pinnetje|Draai met A/.test(`${s.say || ''}`), kind + ': geen verouderde uitleg meer in de zin');
  }
  assert.equal(d.stages.find((q) => q.kind === 'laser').kort, undefined, 'de laser is geen korte handeling');
  assert.equal(d.stages.find((q) => q.kind === 'crack').iedereen, true, 'de kraakstap blijft iedereen: true (Samen spelen)');
});

t('de stroomkast: zonder E gebeurt er niets, ook na lange tijd, en mislukken kan niet', () => {
  const w = wereld();
  naarKast(w);
  assert.equal(stageKind(), 'fuse', 'bij de stroomkast');
  naarDoel(w);
  tik(w, 60);
  assert.equal(stageKind(), 'fuse', 'een minuut staan zonder E: nog steeds de stroomkast');
  assert.equal(st().phase, 'active', 'de missie is niet mislukt');
  assert.equal(w.wanted, 0, 'en het kostte geen argwaan of sterren');
});

t('de stroomkast: E ingedrukt maakt hem af in ongeveer drie seconden, met een stapgeluid', () => {
  const w = wereld();
  naarKast(w);
  assert.equal(stageKind(), 'fuse');
  const voor = stappen(w);
  w.e = true; naarDoel(w);
  tik(w, 1.5);
  assert.equal(stageKind(), 'fuse', 'na 1,5 s nog bezig');
  assert.ok(w.missionPrompt && w.missionPrompt.key === 'E' && w.missionPrompt.cooldown < 1, 'de prompt toont de voortgang');
  tik(w, 2.5);
  assert.notEqual(stageKind(), 'fuse', 'na 4 s is de stroomkast klaar');
  assert.equal(stappen(w), voor + 1, 'de voltooide stap klinkt één keer');
});

t('niet bij de prop: E doet niets; wegstappen zakt terug maar slaat niets over', () => {
  const w = wereld();
  naarKast(w);
  w.e = true;
  const d = st().stageInfo.target;
  w.player.x = d.x + 30; w.player.y = d.y;
  tik(w, 20);
  assert.equal(stageKind(), 'fuse', 'E ver weg van de kast doet niets');
  naarDoel(w); tik(w, 2); // twee derde klaar
  w.player.x = d.x + 30; w.e = false; tik(w, 60);
  assert.equal(stageKind(), 'fuse');
  naarDoel(w); w.e = true; tik(w, 3);
  assert.notEqual(stageKind(), 'fuse', 'terugkomen en vasthouden rondt af, sneller dan van nul');
});

t('het slot en de vitrine werken op dezelfde manier', () => {
  const w = wereld();
  M.missionDebug.start(w, i06);
  assert.ok(naarStap(w, 'lock'), 'het slot is bereikbaar');
  naarDoel(w); tik(w, 0.5); naarDoel(w);
  tik(w, 30);
  assert.equal(stageKind(), 'lock', 'zonder E blijft het slot dicht');
  w.e = true; tik(w, 4);
  assert.notEqual(stageKind(), 'lock', 'met E is het open');
  w.e = false;
  assert.ok(naarStap(w, 'crack'), 'de vitrine is bereikbaar');
  naarDoel(w); tik(w, 0.5); naarDoel(w);
  tik(w, 30);
  assert.equal(stageKind(), 'crack', 'zonder E blijft de vitrine dicht');
  w.e = true; tik(w, 1.5);
  assert.equal(stageKind(), 'crack', 'de vitrine kost langer dan het slot');
  tik(w, 4);
  assert.notEqual(stageKind(), 'crack', 'met E gaat hij open');
  assert.equal(st().phase, 'active');
});

// ---- M05 en M01 in de runner -------------------------------------------------------------------------------------
const i05 = M.missionIndexById('kei');
t('M05 start met een race, een kaart en de ronde-aankleding zonder fouten', () => {
  const w = wereld();
  assert.equal(M.missionDebug.start(w, i05), true);
  tik(w, 3);
  assert.equal(st().phase, 'active');
  assert.ok(M.getMissionDefs()[i05].decorRoute.length === KEI_ROUTE.length);
});

t('M05: elk checkpoint klinkt als stap en de finish eindigt de missie', () => {
  const w = wereld();
  M.missionDebug.start(w, i05);
  const def = M.getMissionDefs()[i05];
  const fiets = { x: 0, y: 0, isBike: true, isBoat: false, speed: 0, driftX: 0, driftY: 0, model: { len: 1.9 } };
  w.player.inVehicle = fiets;
  for (const wp of def.waypoints) {
    fiets.x = wp.x; fiets.y = wp.y; w.player.x = wp.x; w.player.y = wp.y;
    tik(w, 0.2);
    if (st().phase !== 'active') break;
  }
  const namen = w.audioEvents.map((e) => e.name);
  assert.equal(namen.filter((x) => x === 'stap').length, def.waypoints.length - 1, 'een stap per tussenpunt, de finish klinkt anders: ' + namen.join());
  assert.equal(namen.filter((x) => x === 'goud').length, 1, 'de winnaar hoort goud');
  assert.ok(st().completed.includes(i05), 'de missie is gehaald');
});

t('M01 loopt in de runner: de stunt start en de kaart en arena doen geen kwaad', () => {
  const w = wereld();
  const idx = M.getMissionDefs().findIndex((d) => d.label === 'Nul krassen, vijftienhonderd punten');
  assert.ok(idx >= 0);
  assert.equal(M.missionDebug.start(w, idx), true);
  tik(w, 5);
  assert.equal(st().phase, 'active');
});

console.log(`akte1_runner_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
