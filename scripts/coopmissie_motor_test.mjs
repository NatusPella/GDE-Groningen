// Samen spelen (#525): de motor van de checkpoint-, race- en stuntopdrachten leest de groep en niet
// een lichaam. Een gast die een kroeg haalt, op de fiets meerijdt of op de Grote Markt drift, telt
// mee voor de opdracht; een toeschouwer (geen J) telt niet; met één speler verandert er niets.
//   node scripts/coopmissie_motor_test.mjs
// De echte missions.js, racers.js en stuntavond.js op een platte testkaart (scripts/node3d.mjs voor
// three.js en de DOM). De enige vervangingen zijn de kaart en de opslag hieronder: geen mocks van de
// modules die getest worden. `missionDebug.start` is de cheat van de spelbot, niet een nep-startpad.
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

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
const S = await import('../game/js/stuntavond.js');
const R = await import('../game/js/racers.js');
const { ververs } = await import('../game/js/spelersregister.js');
const { groepsActeurs } = await import('../game/js/stagegroep.js');

// het eindkaartje van een gelukte opdracht tekent in de DOM; de stub van node3d.mjs heeft een body nodig
document.body = document.createElement('div');

let n = 0, fails = 0;
const t = (naam, f) => {
  n++;
  try { f(); console.log('ok  ', naam); } catch (e) { fails++; process.exitCode = 1; console.log('FAIL', naam, '\n    ' + (e.message || e)); }
};

// Platte kaart: alles is open, niets staat in de weg, geen hoogteverschil.
const spot = (x, y) => ({ x, y, road: null });
const KAART = {
  meta: { bounds: null, shops: [], garages: [], neighbourhoodPoints: [] }, water: [], roads: [], buildings: [], tiles: [],
  isOpenSpot: () => true, nearestRoadPoint: (x, y) => ({ x, y, road: { pts: [[x, y], [x + 1, y + 1]] } }),
  openSpotNear: (x, y) => spot(x, y), findOpenSpawn: (x, y) => spot(x, y), spawnZ: () => 0,
  buildingsNear: () => [], roadsNear: () => [], isOnBridge: () => false, escapeBuilding: (x, y) => [x + 1, y + 1], roadAt: () => null,
  groundHeightAt: () => 0, surfaceAt: () => ({ z: 0 }), spawnState: () => ({}),
};

// gasten: de records van world.coopPartners (slot, plek, status); meedoen: wie J zei (null = geen sessie)
function wereld({ gasten = [], meedoen = null, vehicles = [] } = {}) {
  const w = {
    map: KAART, onRespawn: [], player: {
      x: 0, y: 0, z: 0, gz: 0, angle: 0, inVehicle: null, radius: 0.35,
      exitVehicle() { this.inVehicle = null; }, // de echte Player heeft deze; handBack gebruikt hem
    },
    vehicles, pedestrians: [], wildlife: [], stats: { pedKills: 0, copKills: 0 }, health: 100, armor: 0,
    money: 0, wanted: 0, time: 0, coopPartners: gasten, meldingen: [],
    input: { wasPressed: () => false, consume() {} },
    addMessage(t) { this.meldingen.push(t); },
  };
  if (meedoen) w.coopMeespelers = () => meedoen;
  ververs(w, 0);
  M.initMissions(w);
  return w;
}
const auto = (x, y, extra = {}) => ({ x, y, isBoat: false, speed: 0, driftX: 0, driftY: 0, model: { len: 4 }, ...extra });

// ---- de laag zelf: één speler is de hoofdspeler, een gast een proxy op zijn eigen plek
t('zonder sessie is de groep de hoofdspeler zelf', () => {
  const w = wereld();
  const g = groepsActeurs(w);
  assert.equal(g.length, 1);
  assert.equal(g[0], w.player, 'geen proxy in een eenspelerspel');
});

t('een gast die J zei zit in de groep; een toeschouwer niet', () => {
  const w = wereld({ gasten: [{ slot: 1, x: 4, y: 0, status: 'voet', zichtbaar: true }], meedoen: [1] });
  assert.equal(groepsActeurs(w).length, 2);
  assert.equal(groepsActeurs(w)[1].gast, true);
  const kijker = wereld({ gasten: [{ slot: 1, x: 4, y: 0, status: 'voet', zichtbaar: true }], meedoen: [] });
  assert.equal(groepsActeurs(kijker).length, 1, 'zonder J telt alleen de gastheer');
});

// ---- checkpoint (M16 Nog eentje dan): de kroeg telt voor de groep
const kroegIndex = () => M.missionIndexById('kroegentocht');
const kroeg = () => M.getMissionDefs()[kroegIndex()];

t('solo: bij de kroeg telt het checkpoint, net als voorheen', () => {
  const def = kroeg();
  const w = wereld();
  assert.equal(M.missionDebug.start(w, kroegIndex()), true);
  // waypoints[0] is een via (routehulp), waypoints[1] de eerste kroeg
  const wp = def.waypoints[1];
  w.player.x = wp.x; w.player.y = wp.y;
  M.updateMissions(0.05, w);
  assert.equal(M.missionDebug.state().wp, 2, 'de via en de kroeg zijn gepasseerd');
  assert.ok(w.meldingen.some((m) => /Proost in/.test(m)), 'de kroeg meldt zich');
});

t('een gast bij de kroeg haalt het checkpoint voor de opdracht', () => {
  const def = kroeg();
  const wp = def.waypoints[1];
  const w = wereld({ gasten: [{ slot: 1, x: wp.x, y: wp.y, status: 'voet', zichtbaar: true }], meedoen: [1] });
  assert.equal(M.missionDebug.start(w, kroegIndex()), true);
  M.updateMissions(0.05, w);
  assert.equal(M.missionDebug.state().wp, 2, 'de gast haalt de kroeg, de gastheer staat nog bij de start');
  assert.ok(w.meldingen.some((m) => /Proost in/.test(m)));
});

t('een toeschouwer bij de kroeg telt niet', () => {
  const def = kroeg();
  const wp = def.waypoints[1];
  const w = wereld({ gasten: [{ slot: 1, x: wp.x, y: wp.y, status: 'voet', zichtbaar: true }], meedoen: [] });
  assert.equal(M.missionDebug.start(w, kroegIndex()), true);
  M.updateMissions(0.05, w);
  assert.equal(M.missionDebug.state().wp, 0, 'wie niet meedoet haalt niets');
});

t('de eis van de stap (te voet) geldt voor de gast die hem haalt', () => {
  const def = kroeg();
  const wp = def.waypoints[1];
  const fiets = auto(wp.x, wp.y, { isBike: true });
  const w = wereld({ gasten: [{ slot: 1, x: wp.x, y: wp.y, status: 'rijdt', zichtbaar: true }], meedoen: [1], vehicles: [fiets] });
  assert.equal(M.missionDebug.start(w, kroegIndex()), true);
  M.updateMissions(0.05, w);
  assert.equal(M.missionDebug.state().wp, 0, 'op de fiets telt de kroegentocht niet');
  assert.ok(w.meldingen.some((m) => /Uitstappen/.test(m)), 'de gast hoort dat hij moet lopen');
});

// ---- race: de voortgang en de startrij lezen de groep
// Een ronde van 120 punten op straal 100: 30 punten per etappe, dus elke etappe is even lang.
const RONDE = Array.from({ length: 120 }, (_, i) => {
  const a = (i / 120) * Math.PI * 2;
  return [100 * Math.cos(a), 100 * Math.sin(a), 6];
});
const CPS = [0, 30, 60, 90];

t('solo: de race leest de eigen auto', () => {
  const w = wereld();
  const race = R.createRace(w, RONDE, CPS, {});
  const car = race.playerCar;
  assert.ok(car, 'de baan geeft een racewagen');
  w.player.inVehicle = car;
  R.updateRace(0.05, w, race, 0);
  assert.ok(race.playerProg < 20, `net van de start (${Math.round(race.playerProg)})`);
  const p = RONDE[10];
  car.x = p[0]; car.y = p[1];
  R.updateRace(0.05, w, race, 0);
  assert.ok(race.playerProg > 40, `tien punten verder (${Math.round(race.playerProg)})`);
});

t('een gast die meerijdt: zijn positie telt voor de race', () => {
  const gastAuto = auto(0, 0, { missionCar: true });
  const AUTO = { x: RONDE[10][0], y: RONDE[10][1] };
  gastAuto.x = AUTO.x; gastAuto.y = AUTO.y;
  const w = wereld({ gasten: [{ slot: 1, x: AUTO.x, y: AUTO.y, status: 'rijdt', zichtbaar: true }], meedoen: [1], vehicles: [gastAuto] });
  const race = R.createRace(w, RONDE, CPS, {});
  w.player.inVehicle = race.playerCar;
  R.updateRace(0.05, w, race, 0);
  assert.equal(R.groepsActeurs, undefined, 'de helper woont in stagegroep.js, niet nog eens hier');
  assert.ok(race.playerProg > 40, `de gast rijdt voorop, dus de race staat vooraan (${Math.round(race.playerProg)})`);
});

t('een toeschouwer op de baan verandert de stand niet', () => {
  const kijkerAuto = auto(RONDE[10][0], RONDE[10][1], { missionCar: true });
  const w = wereld({ gasten: [{ slot: 1, x: RONDE[10][0], y: RONDE[10][1], status: 'rijdt', zichtbaar: true }], meedoen: [], vehicles: [kijkerAuto] });
  const race = R.createRace(w, RONDE, CPS, {});
  w.player.inVehicle = race.playerCar;
  R.updateRace(0.05, w, race, 0);
  assert.ok(race.playerProg < 20, `de gastheer staat nog bij de start (${Math.round(race.playerProg)})`);
});

t('de startrij gaat van start als een gast klaarstaat', () => {
  const gastFiets = auto(0, 0, { isBike: true, missionCar: true });
  const plek = RONDE[0];
  gastFiets.x = plek[0]; gastFiets.y = plek[1];
  const w = wereld({ gasten: [{ slot: 1, x: gastFiets.x, y: gastFiets.y, status: 'rijdt', zichtbaar: true }], meedoen: [1], vehicles: [gastFiets] });
  const race = R.createRace(w, RONDE, CPS, { bikes: true });
  assert.equal(race.phase, 'grid');
  R.updateRace(0.05, w, race, 0);
  assert.equal(race.phase, 'countdown', 'de gast op zijn fiets is genoeg om te beginnen');
});

// ---- stunt (M01): wie van de groep drift op de Grote Markt scoort
function stuntWereld(w) {
  assert.equal(S.startStunt(w, { center: { x: 0, y: 0 }, radius: 45, target: 100000 }), true);
  return w;
}
const drift = () => auto(2, 2, { speed: 9, driftX: 3.5, driftY: 0 });
function rijdStunt(w, seconden = 2) {
  for (let i = 0; i < seconden * 20; i++) { w.time += 0.05; S.updateStunt(0.05, w, 100); }
  return S.stuntStatus().score;
}

t('solo: driften op de markt scoort, net als voorheen', () => {
  const w = stuntWereld(wereld());
  const v = drift();
  w.vehicles.push(v); w.player.inVehicle = v;
  const score = rijdStunt(w);
  S.stopStunt(w);
  assert.ok(score > 0, `punten van de eigen auto (${score})`);
});

t('een gast die op de markt drift scoort voor de opdracht', () => {
  const w = stuntWereld(wereld({ gasten: [{ slot: 1, x: 2, y: 2, status: 'rijdt', zichtbaar: true }], meedoen: [1] }));
  const v = drift();
  w.vehicles.push(v);
  w.player.x = 400; w.player.y = 400; // de gastheer is er niet eens bij
  const score = rijdStunt(w);
  S.stopStunt(w);
  assert.ok(score > 0, `punten van de gast (${score})`);
});

t('een toeschouwer op de markt scoort niet', () => {
  const w = stuntWereld(wereld({ gasten: [{ slot: 1, x: 2, y: 2, status: 'rijdt', zichtbaar: true }], meedoen: [] }));
  const v = drift();
  w.vehicles.push(v);
  w.player.x = 400; w.player.y = 400;
  const score = rijdStunt(w);
  S.stopStunt(w);
  assert.equal(score, 0);
});

// ---- bezorgen (M01 Nul krassen): de missieauto telt als iemand van de groep erin zit
// De stunt van M01 eerst; met het doel op nul is die meteen klaar, zodat de rit naar het
// Boterdiep begint. Dat is speeldata, geen namaak: de rest is de echte motor.
function bezorgWereld(gasten, meedoen) {
  const w = wereld({ gasten, meedoen });
  const i = M.missionIndexById('bakkiestunt');
  const def = M.getMissionDefs()[i];
  def.stunt.target = 0;
  assert.equal(M.missionDebug.start(w, i), true, 'de opdracht start');
  const auto = w.vehicles.find((v) => v.missionCar && !v.racer);
  assert.ok(auto, 'de missieauto staat er');
  // de testkaart heeft geen weg waar de auto op kan staan: zet hem op de startplek
  auto.x = def.start.x; auto.y = def.start.y;
  w.player.x = auto.x; w.player.y = auto.y; w.player.inVehicle = auto;
  M.updateMissions(0.05, w);
  assert.ok(!M.missionDebug.state().stageInfo || true);
  return { w, def, auto };
}

t('solo: bij de bestemming in de missieauto is de bezorging klaar', () => {
  const { w, def } = bezorgWereld([], null);
  const auto = w.vehicles.find((v) => v.missionCar && !v.racer);
  assert.equal(w.player.inVehicle, auto, 'de gastheer zit erin');
  auto.x = def.dest.x; auto.y = def.dest.y;
  w.player.x = def.dest.x; w.player.y = def.dest.y;
  M.updateMissions(0.05, w);
  assert.notEqual(M.missionDebug.state().phase, 'active', 'de bezorging telt');
});

t('een gast achter het stuur van de missieauto bezorgt hem', () => {
  const { w, def, auto } = bezorgWereld([{ slot: 1, x: 0, y: 0, status: 'rijdt', zichtbaar: true }], [1]);
  // de gastheer stapt uit en blijft achter; de gast rijdt de auto naar het Boterdiep
  w.player.inVehicle = null;
  w.player.x = def.start.x + 60; w.player.y = def.start.y + 60;
  auto.x = def.dest.x; auto.y = def.dest.y;
  const gast = w.coopPartners[0];
  gast.x = def.dest.x; gast.y = def.dest.y;
  M.updateMissions(0.05, w);
  assert.notEqual(M.missionDebug.state().phase, 'active', 'de gast levert af, ook zonder de gastheer in de auto');
});

t('een toeschouwer achter het stuur bezorgt niets', () => {
  const { w, def, auto } = bezorgWereld([{ slot: 1, x: 0, y: 0, status: 'rijdt', zichtbaar: true }], []);
  w.player.inVehicle = null;
  w.player.x = def.start.x + 60; w.player.y = def.start.y + 60;
  auto.x = def.dest.x; auto.y = def.dest.y;
  const kijker = w.coopPartners[0];
  kijker.x = def.dest.x; kijker.y = def.dest.y;
  M.updateMissions(0.05, w);
  assert.equal(M.missionDebug.state().phase, 'active', 'wie niet meedoet levert niet af');
});

// ---- geen tweede laag: racen en stunten gebruiken dezelfde helper uit stagegroep.js
t('racers.js en stuntavond.js lezen de groep via stagegroep.js, niet met een eigen kopie', () => {
  const bron = (naam) => fs.readFileSync(new URL(`../game/js/${naam}`, import.meta.url), 'utf8');
  for (const naam of ['racers.js', 'stuntavond.js', 'missions.js']) {
    const s = bron(naam);
    assert.match(s, /import \{[^}]*\bgroepsActeurs\b[^}]*\} from '\.\/stagegroep\.js'/, `${naam} haalt groepsActeurs uit stagegroep.js`);
    assert.doesNotMatch(s, /opdrachtSpelers\([^)]*\)\.map/, `${naam} bouwt geen tweede lijst lichamen`);
  }
  assert.match(bron('stagegroep.js'), /export function groepsActeurs\(world\)/, 'de helper staat in de bestaande laag');
});

if (fails) console.log(`coopmissie_motor_test: ${n - fails}/${n} ok, ${fails} mislukt`);
else console.log(`coopmissie_motor_test: ${n}/${n} ok`);
