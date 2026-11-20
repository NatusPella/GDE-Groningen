// AAA-upgrade van akte 2 (M07 tot M11 en de bietencampagne A1): de plannen (akte2_plan.js), de defs die ze gebruiken
// (missions_akte2.js) en de runner op een platte testkaart. Test gedrag: wat de kaart zegt en wanneer, hoe het publiek
// valt, wanneer de stings klinken en dat de volgorde van de stappen (saves) ongewijzigd blijft.
//   node scripts/akte2_aaa_test.mjs
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
const P = await import('../game/js/akte2_plan.js');
const { buildAkte2Defs, applyAkte2 } = await import('../game/js/missions_akte2.js');
const { kaartVan, startKaart, tikKaart, meldKaart, MAX_REGELS } = await import('../game/js/regelkaart.js');
const { crowdPlan } = await import('../game/js/crowdplan.js');
const { waitFigureFor } = await import('../game/js/wachtprops.js');
const { dressingPlan } = await import('../game/js/missiedecor.js');
document.body = document.createElement('div');

let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); console.log('ok  ', naam); } catch (e) { fails++; process.exitCode = 1; console.log('FAIL', naam, '\n    ' + (e.message || e)); } };

const KAARTEN = { KAART_M07: P.KAART_M07, KAART_M08: P.KAART_M08, KAART_M09: P.KAART_M09, KAART_M10: P.KAART_M10, KAART_M11_VAREN: P.KAART_M11_VAREN, KAART_M11_ZOUT: P.KAART_M11_ZOUT, A1: P.kaartA1(2, 6) };
const alleTeksten = (k, tt = 80, stap = 0.5) => { const uit = []; for (let x = 0; x < tt; x += stap) { const c = tikKaart(k, stap); if (c) uit.push(c.body); } return uit; };

t('elke regelkaart heeft een doel, hoogstens drie bruikbare regels en geen verloren regel', () => {
  for (const [naam, kaart] of Object.entries(KAARTEN)) {
    const kv = kaartVan({ kaart });
    assert.ok(kv && kv.doel.length > 8, naam + ': doel');
    assert.ok(kv.regels.length >= 1 && kv.regels.length <= MAX_REGELS, naam + ': regels');
    assert.equal(kv.regels.length, kaart.regels.length, naam + ': geen regel valt weg (kapotte invoer)');
    for (const r of kv.regels) assert.ok(r.zin.length > 3 && r.zin.length <= 90, naam + ': de zin van een regel past op een kaart');
  }
});

t('de kaarten zijn Nederlands zonder anglicismen', () => {
  const tekst = JSON.stringify(KAARTEN);
  assert.ok(!/respawn|gastheer|checkpoint|\bhost\b|\bgame\b/i.test(tekst));
});

t('de eierkaart (M09) toont eerst het doel, dan de limiet en pas bij de eerste stoot de voorraad', () => {
  const k = startKaart({ kaart: P.KAART_M09 }, 'M09:1');
  const eerste = tikKaart(k, 0.1);
  assert.match(eerste.body, /zestig eieren/);
  const zonder = alleTeksten(k, 60);
  assert.ok(zonder.some((b) => /km\/u/.test(b)), 'de limiet van 40 km/u staat erop: ' + zonder.join(' | '));
  assert.ok(!zonder.some((b) => /eieren/i.test(b) && /van/.test(b) && /heel/.test(b)), 'de voorraad komt niet zonder stoot');
  const k2 = startKaart({ kaart: P.KAART_M09 }, 'M09:2');
  tikKaart(k2, 0.1);
  meldKaart(k2, 'eierstoot');
  const met = alleTeksten(k2, 30);
  assert.ok(met.some((b) => /eieren/i.test(b) && /van/.test(b)), 'na de stoot toont de kaart de eieren: ' + met.join(' | '));
});

t('de limokaart (M10) wacht op de melding dat de limo dichtbij komt', () => {
  const k = startKaart({ kaart: P.KAART_M10 }, 'M10:1');
  assert.ok(!alleTeksten(k, 40).some((b) => /vlak achter je/.test(b)), 'zonder limo geen waarschuwing');
  const k2 = startKaart({ kaart: P.KAART_M10 }, 'M10:2');
  meldKaart(k2, 'limo');
  assert.ok(alleTeksten(k2, 40).some((b) => /vlak achter je/.test(b)), 'met de melding komt de waarschuwing');
});

// ---- de defs --------------------------------------------------------------------------------------------------------
const stubs = () => [
  { label: 'Al het vet van Grunn', type: 'stages', stages: [{ kind: 'board' }, { kind: 'chase' }, { kind: 'board' }, { kind: 'goto', target: { label: 'De Oosterpoort' } }, { kind: 'vault' }] },
  { label: 'Fatbikes tellen niet als fiets', type: 'fatbike' },
  { label: 'Geleend van de Friezen', type: 'stages', stages: [] },
];
const defs = () => { const l = [...buildAkte2Defs({}), ...stubs()]; applyAkte2(l); return l; };
const by = (l, label) => l.find((d) => d.label === label);

t('M09: kaart op de wierdepaden, stings aan, stappen en volgorde ongewijzigd (saves)', () => {
  const d = by(defs(), 'Heel aankomen is ook een kunst');
  assert.equal(d.aaa, true);
  assert.deepEqual(d.stages.map((s) => s.kind), ['board', 'goto', 'goto', 'goto']);
  assert.equal(d.stages[1].kaart, P.KAART_M09);
  assert.equal(d.eggs.count, 60);
});

t('M10: de kaart staat op het eerste stuk met de limo, de koffer-scene blijft', () => {
  const d = by(defs(), 'Een trekker-limo op de wierde');
  assert.equal(d.aaa, true);
  assert.deepEqual(d.stages.map((s) => s.kind), ['board', 'goto', 'goto', 'vault', 'goto']);
  assert.equal(d.stages[1].kaart, P.KAART_M10);
  assert.ok(d.stages[1].pursuer && d.stages[2].pursuer);
});

t('M07 en M08: kaart en stings via applyAkte2, de Oosterpoort krijgt een plein', () => {
  const l = defs();
  const vet = by(l, 'Al het vet van Grunn');
  assert.equal(vet.aaa, true);
  assert.equal(vet.stages.find((s) => s.kind === 'chase').kaart, P.KAART_M07);
  assert.equal(vet.stages.find((s) => s.kind === 'goto').dressing, 'plein');
  assert.ok(dressingPlan('plein') && dressingPlan('plein').crowd, 'het plein heeft publiek');
  assert.equal(by(l, 'Fatbikes tellen niet als fiets').kaart, P.KAART_M08);
});

t('M11: kaart op het inhalen, kaart op de kwelder, een wachtfiguur bij elke kuip en dezelfde stappen', () => {
  const d = by(defs(), 'Geleend van de Friezen');
  assert.equal(d.aaa, true);
  assert.deepEqual(d.stages.map((s) => s.kind), ['goto', 'boatchase', 'scene', 'goto', 'scene', 'scene', 'scene', 'hold', 'hold', 'hold', 'goto']);
  assert.equal(d.stages.find((s) => s.kind === 'boatchase').kaart, P.KAART_M11_VAREN);
  // #955: 'Stap in de rubberboot' telt pas als je in de boot zit; op de kade te voet was het skûtsje na 30 s weg
  assert.equal(d.stages[0].mode, 'boat');
  const kuipen = d.stages.filter((s) => s.kind === 'hold');
  assert.equal(kuipen.length, 3);
  assert.equal(kuipen[0].kaart, P.KAART_M11_ZOUT);
  assert.ok(!kuipen[1].kaart && !kuipen[2].kaart, 'de uitleg komt één keer');
  const figuren = kuipen.map((s) => waitFigureFor(s));
  assert.ok(figuren.every((f) => f && f.rooster.length >= 1), 'bij elke kuip wacht een figuur');
  assert.equal(new Set(kuipen.map((s) => s.wacht.prop)).size, 3, 'elke kuip heeft andere spullen');
  assert.ok(new Set(figuren.map((f) => f.shirt + ':' + f.skin)).size >= 2, 'niet drie keer dezelfde figuur');
  for (const k of kuipen) assert.ok(k.light && k.time === 2.5, 'de kustwacht en de tijd zijn ongewijzigd');
});

// ---- het publiek van de skûtsje-sprint --------------------------------------------------------------------------------
const lijn = (s) => ({ x: s, y: 0.1 * s });
const vrij = () => true;
const kant = (m) => Math.sign(m.y - 0.1 * m.x);

t('de sprint heeft twee publieken: groot bij de start aan de kadezijde, klein bij de finish', () => {
  const p = P.skutsjePubliek(lijn, 0, 1200, 1);
  assert.ok(p && p.start.count > p.finish.count);
  assert.equal(P.skutsjePubliek(lijn, 0, 1200, 1).start.sides, 'left');
  assert.equal(P.skutsjePubliek(lijn, 0, 1200, -1).start.sides, 'right');
  const a = crowdPlan(p.start, vrij), b = crowdPlan(p.finish, vrij);
  assert.ok(a.members.length >= 20 && b.members.length >= 12, `genoeg figuren: ${a.members.length}/${b.members.length}`);
  const c = crowdPlan(P.skutsjePubliek(lijn, 0, 1200, 1).start, vrij);
  assert.deepEqual(c.members.map((m) => [m.x, m.y]), a.members.map((m) => [m.x, m.y]), 'deterministisch: de gast ziet hetzelfde publiek');
});

t('het publiek staat aan één kant van de vaarlijn en niet erop; links en rechts zijn tegengesteld', () => {
  const links = crowdPlan(P.skutsjePubliek(lijn, 0, 1200, 1).start, vrij);
  const rechts = crowdPlan(P.skutsjePubliek(lijn, 0, 1200, -1).start, vrij);
  for (const m of links.members) assert.ok(Math.abs(m.y - 0.1 * m.x) / Math.hypot(1, 0.1) >= 5, 'minstens 5 m van de lijn');
  assert.equal(new Set(links.members.map(kant)).size, 1, 'alles aan één kant');
  assert.equal(new Set(rechts.members.map(kant)).size, 1);
  assert.notEqual(kant(links.members[0]), kant(rechts.members[0]), 'de andere zijde is de andere kant');
});

t('het publiek mijdt water en gebouwen (terrein)', () => {
  const p = P.skutsjePubliek(lijn, 0, 1200, 1);
  const water = (x, y) => Math.abs(y - 0.1 * x) / Math.hypot(1, 0.1) < 9; // een brede gracht
  const a = crowdPlan(p.start, (x, y) => !water(x, y));
  for (const m of a.members) assert.ok(!water(m.x, m.y));
});

t('kapotte invoer geeft geen publiek en geen fout', () => {
  assert.equal(P.skutsjePubliek(null, 0, 10), null);
  assert.equal(P.skutsjePubliek(lijn, NaN, 10), null);
  assert.equal(P.skutsjePubliek(lijn, 10, 5), null);
  assert.equal(P.skutsjePubliek(() => null, 0, 100), null);
  assert.equal(P.hoopPubliek(null), null);
  assert.equal(P.hoopPubliek({ x: NaN, y: 1 }), null);
});

t('de sprint waarschuwt één keer in de laatste minuut', () => {
  assert.equal(P.sprintBijna(100, 600, false), false);
  assert.equal(P.sprintBijna(545, 600, false), true);
  assert.equal(P.sprintBijna(545, 600, true), false, 'één keer');
  assert.equal(P.sprintBijna(600, 600, false), false, 'niet als de klok om is');
  assert.equal(P.sprintBijna(NaN, 600, false), false);
});

t('het brugsein klinkt één keer per brug en niet bij een gesloten brug', () => {
  const bekend = new Set();
  const brug = { name: 'Oosterhavenbrug', x: 1, y: 2 };
  assert.equal(P.brugSeinNodig(bekend, brug, 'closed'), false, 'gesloten: nog niets te zeggen');
  assert.equal(P.brugSeinNodig(bekend, brug, 'opening'), true);
  assert.equal(P.brugSeinNodig(bekend, brug, 'opening'), false, 'dezelfde brug: stil');
  assert.equal(P.brugSeinNodig(bekend, { x: 5, y: 5 }, 'up'), true, 'een andere brug zonder naam');
  assert.equal(P.brugSeinNodig(null, brug, 'up'), false);
});

t('de bietenhoop: een klein publiek met een opening naar het land, en de A1-kaart past', () => {
  const spec = P.hoopPubliek({ x: 100, y: 200 }, 1.2);
  assert.equal(spec.shape, 'ring');
  const plan = crowdPlan(spec, vrij);
  assert.ok(plan.members.length >= 6 && plan.members.length <= 8, 'aantal: ' + plan.members.length);
  for (const m of plan.members) {
    const hoek = Math.atan2(m.y - 200, m.x - 100);
    const d = Math.abs(Math.atan2(Math.sin(hoek - 1.2), Math.cos(hoek - 1.2)));
    assert.ok(d >= 0.4, 'niemand staat in de opening');
  }
  assert.ok(/2 tot 6 m\/s/.test(JSON.stringify(kaartVan({ kaart: P.kaartA1(2, 6) }))), 'de kaart noemt de band');
  assert.ok(kaartVan({ kaart: P.kaartA1(NaN, NaN) }), 'kapotte band: nog steeds een kaart');
});

// ---- de runner ---------------------------------------------------------------------------------------------------------
const M = await import('../game/js/missions.js');
const { ververs } = await import('../game/js/spelersregister.js');
const spot = (x, y) => ({ x, y, road: null });
const KAART = {
  meta: { landmarks: [], bounds: null, shops: [], garages: [], neighbourhoodPoints: [] }, water: [], roads: [], buildings: [], tiles: [],
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
    input: { wasPressed: () => false, isDown: () => false, consume() {} },
    addMessage(x) { this.meldingen.push(x); },
  };
  ververs(w, 0);
  M.initMissions(w);
  return w;
}
const tik = (w, secs, dt = 0.05) => { for (let k = 0; k < Math.round(secs / dt); k++) { w.time += dt; M.updateMissions(dt, w); } };

t('de runner kent de akte 2-defs met kaart en stings', () => {
  wereld();
  const lijst = M.getMissionDefs();
  let gezien = 0;
  for (const label of ['Heel aankomen is ook een kunst', 'Een trekker-limo op de wierde', 'Geleend van de Friezen', 'Al het vet van Grunn']) {
    const d = lijst.find((q) => q.label === label);
    if (!d) continue;
    gezien++;
    assert.equal(d.aaa, true, label + ': stings aan');
    assert.ok(d.stages.some((s) => s.kaart), label + ': een stap met kaart');
  }
  assert.ok(gezien >= 1, 'minstens één akte 2-missie in de runner');
});

t('M09 loopt in de runner: starten, een stap overslaan en een stoot op de eieren geven geen fout', () => {
  const w = wereld();
  const idx = M.getMissionDefs().findIndex((d) => d.label === 'Heel aankomen is ook een kunst');
  assert.ok(idx >= 0, 'M09 bestaat in de runner');
  assert.equal(M.missionDebug.start(w, idx), true);
  tik(w, 1);
  M.missionDebug.skipStage(w);
  tik(w, 1);
  const auto = { x: w.player.x, y: w.player.y, isBike: false, isBoat: false, speed: 30, driftX: 0, driftY: 0, health: 100, model: { len: 3 } };
  w.player.inVehicle = auto;
  tik(w, 1);
  auto.speed = 0; auto.health = 40; // een harde stoot: het eerste ei breekt
  tik(w, 1);
  assert.notEqual(M.missionDebug.state().phase, 'idle');
});

console.log(`akte2_aaa_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
