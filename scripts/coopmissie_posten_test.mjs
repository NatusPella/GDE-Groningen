// Samen spelen (#983, #429): de drie bolwerken van het proefbeleg (M30) worden met meer spelers tegelijk bezet.
//   node scripts/coopmissie_posten_test.mjs
// De echte missions.js, missieposten.js en samenposten.js op een platte testkaart (zoals coopmissie_motor_test.mjs). Alleen de kaart en
// de opslag zijn vervangen. Bewezen: alleen (en met een toeschouwer) loopt het oude pad; met twee, drie en vier spelers loopt de klok van
// elke post tegelijk; wegvallen en een speler die er niet bij hoort veranderen de uitkomst niet; de rollen komen als melding per speler.
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
const { BOURTANGE } = await import('../game/js/missions_akte6.js');
document.body = document.createElement('div');

let n = 0, fails = 0;
const t = (naam, f) => {
  n++;
  try { f(); console.log('ok  ', naam); } catch (e) { fails++; process.exitCode = 1; console.log('FAIL', naam, '\n    ' + (e.stack || e.message || e)); }
};

const spot = (x, y) => ({ x, y, road: null });
const KAART = {
  meta: { bounds: null, shops: [], garages: [], neighbourhoodPoints: [] }, water: [], roads: [], buildings: [], tiles: [],
  isOpenSpot: () => true, nearestRoadPoint: (x, y) => ({ x, y, road: { pts: [[x, y], [x + 1, y + 1]] } }),
  openSpotNear: (x, y) => spot(x, y), findOpenSpawn: (x, y) => spot(x, y), spawnZ: () => 0,
  buildingsNear: () => [], roadsNear: () => [], isOnBridge: () => false, escapeBuilding: (x, y) => [x + 1, y + 1], roadAt: () => null,
  groundHeightAt: () => 0, surfaceAt: () => ({ z: 0 }), spawnState: () => ({}),
};
function wereld({ gasten = [], meedoen = null } = {}) {
  const w = {
    map: KAART, onRespawn: [], player: { x: 0, y: 0, z: 0, gz: 0, angle: 0, inVehicle: null, radius: 0.35, exitVehicle() { this.inVehicle = null; } },
    vehicles: [], pedestrians: [], wildlife: [], stats: { pedKills: 0, copKills: 0 }, health: 100, armor: 0,
    money: 0, wanted: 0, time: 0, coopPartners: gasten, meldingen: [], gastMeldingen: [],
    input: { wasPressed: () => false, consume() {} },
    addMessage(t) { this.meldingen.push(t); },
  };
  if (meedoen) { w.coopMeespelers = () => meedoen; w.coopMeld = (slot, tekst) => w.gastMeldingen.push([slot, tekst]); }
  ververs(w, 0);
  M.initMissions(w);
  return w;
}

const index = () => M.getMissionDefs().findIndex((d) => d.label === 'Het proefbeleg');
const def = () => M.getMissionDefs()[index()];
const stappen = () => def().stages;
const eerste = () => stappen().findIndex((s) => s.posten === 'bolwerken');
const BW = [BOURTANGE.bolwerk1, BOURTANGE.bolwerk2, BOURTANGE.bolwerk3];
const naarPoort = () => stappen().findIndex((s, i) => i > eerste() && s.kind === 'goto' && !s.posten);
const gast = (slot, [x, y]) => ({ slot, x, y, status: 'voet', zichtbaar: true });

// start de opdracht in de eerste bolwerkstap (zoals een hervatting)
function begin(w) {
  assert.ok(index() >= 0, 'het proefbeleg bestaat');
  assert.equal(M.missionDebug.hervat(w, index(), eerste()), true);
  assert.equal(M.missionDebug.state().stage, eerste());
}
const tikt = (w, sec, dt = 0.1) => { for (let i = 0; i < Math.round(sec / dt); i++) { w.time += dt; M.updateMissions(dt, w); } };
const zet = (p, [x, y]) => { p.x = x; p.y = y; };
const stap = () => M.missionDebug.state().stage;

t('de zes stappen van de bolwerken dragen de groep; de rest niet', () => {
  wereld(); // bouwt de opdrachten
  const d = stappen();
  const i0 = eerste();
  assert.ok(i0 > 0);
  assert.deepEqual(d.slice(i0, i0 + 6).map((s) => s.kind), ['goto', 'hold', 'goto', 'hold', 'goto', 'hold']);
  assert.ok(d.slice(i0, i0 + 6).every((s) => s.posten === 'bolwerken'));
  assert.equal(d.filter((s) => s.posten).length, 6, 'alleen de bolwerken');
});

t('alleen: de oude volgorde, elk bolwerk na elkaar', () => {
  const w = wereld();
  begin(w);
  zet(w.player, BW[0]);
  tikt(w, 3);
  assert.equal(stap(), eerste() + 1, 'bij het eerste bolwerk wacht de vlag');
  tikt(w, 4);
  assert.equal(stap(), eerste() + 2, 'na 6 s staat de eerste vlag, het tweede bolwerk is nog niet bereikt');
  tikt(w, 5);
  assert.equal(stap(), eerste() + 2, 'zonder te lopen gaat er niets verder');
  zet(w.player, BW[1]);
  tikt(w, 8);
  assert.equal(stap(), eerste() + 4);
  assert.ok(!w.meldingen.some((m) => /Jij neemt/.test(m)), 'alleen: geen rollen');
});

t('een toeschouwer (geen J) verandert niets: de gastheer loopt de oude volgorde', () => {
  const w = wereld({ gasten: [gast(1, BW[1])], meedoen: [] });
  begin(w);
  zet(w.player, BW[0]);
  tikt(w, 20);
  assert.equal(stap(), eerste() + 2, 'het tweede bolwerk telt niet voor de kijker');
});

t('twee spelers: de twee bolwerken gaan tegelijk, in ongeveer de tijd van een vlag', () => {
  const g1 = gast(1, BW[1]);
  const w = wereld({ gasten: [g1], meedoen: [1] });
  begin(w);
  zet(w.player, BW[0]);
  tikt(w, 8); // een vlag duurt 6 s
  assert.ok(stap() >= eerste() + 4, `beide eerste vlaggen staan na ~7 s (stap ${stap() - eerste()})`);
  assert.equal(stap(), eerste() + 4, 'nu wacht het derde bolwerk');
  zet(w.player, BW[2]);
  tikt(w, 9);
  assert.ok(stap() > eerste() + 5, 'het derde bolwerk is klaar en het verhaal gaat door naar de poort');
  assert.equal(M.missionDebug.state().phase, 'active');
});

t('drie spelers: alle drie de bolwerken in ongeveer een vlag', () => {
  const w = wereld({ gasten: [gast(1, BW[1]), gast(2, BW[2])], meedoen: [1, 2] });
  begin(w);
  zet(w.player, BW[0]);
  tikt(w, 10);
  assert.ok(stap() >= naarPoort(), `na ~10 s staat iedereen bij de poortstap (stap ${stap() - eerste()} van ${naarPoort() - eerste()})`);
});

t('vier spelers: de vierde helpt bij een bolwerk en niemand blokkeert', () => {
  const w = wereld({ gasten: [gast(1, BW[1]), gast(2, BW[2]), gast(3, BW[0])], meedoen: [1, 2, 3] });
  begin(w);
  zet(w.player, BW[0]);
  tikt(w, 10);
  assert.ok(stap() >= naarPoort());
});

t('de rollen komen per speler: de gastheer in de melding, de gasten via coopMeld', () => {
  const w = wereld({ gasten: [gast(1, BW[1]), gast(2, BW[2])], meedoen: [1, 2] });
  begin(w);
  zet(w.player, BW[0]);
  tikt(w, 0.5);
  assert.ok(w.meldingen.some((m) => /^Jij neemt het eerste bolwerk/.test(m)), 'de gastheer neemt het eerste bolwerk');
  const per = Object.fromEntries(w.gastMeldingen);
  assert.match(per[1], /tweede bolwerk/);
  assert.match(per[2], /derde bolwerk/);
  tikt(w, 1);
  assert.equal(w.gastMeldingen.length, 2, 'de rollen komen één keer');
});

t('wegvallen: de overblijver maakt de bolwerken af, zonder te hangen', () => {
  const g1 = gast(1, BW[1]), g2 = gast(2, BW[2]);
  const w = wereld({ gasten: [g1, g2], meedoen: [1, 2] });
  begin(w);
  zet(w.player, BW[0]);
  tikt(w, 3); // alle drie 3 s
  w.coopMeespelers = () => []; // beide gasten vallen weg
  w.coopPartners.length = 0; ververs(w, 0);
  tikt(w, 4); // het eerste bolwerk is klaar, de gastheer staat er nog
  assert.ok(stap() >= eerste() + 2, 'de eerste vlag staat');
  zet(w.player, BW[1]);
  tikt(w, 10);
  assert.ok(stap() >= eerste() + 4, 'het tweede bolwerk gaat ook');
  zet(w.player, BW[2]);
  tikt(w, 12);
  assert.ok(stap() >= naarPoort(), 'en het derde: de opdracht loopt door');
  assert.equal(M.missionDebug.state().phase, 'active');
});

t('een nieuwe poging begint zonder de posten van de vorige', () => {
  const w = wereld({ gasten: [gast(1, BW[1])], meedoen: [1] });
  begin(w);
  zet(w.player, BW[0]);
  tikt(w, 8);
  assert.equal(stap(), eerste() + 4);
  M.missionDebug.lose(w);
  assert.notEqual(M.missionDebug.state().phase, 'active');
  const w2 = wereld({ gasten: [gast(1, BW[1])], meedoen: [1] });
  begin(w2);
  zet(w2.player, BW[2]);
  tikt(w2, 3);
  assert.equal(stap(), eerste(), 'het eerste bolwerk is niet klaar van een vorige poging');
});

if (fails) console.log(`coopmissie_posten_test: ${n - fails}/${n} ok, ${fails} mislukt`);
else console.log(`coopmissie_posten_test: ${n}/${n} ok`);
