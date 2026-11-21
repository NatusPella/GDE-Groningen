// AAA-upgrade van akte 6 en de bijbanen (docs/missies/AAA-UPGRADEPLAN.md): gedrag, geen bronregex. De echte defs (missions.js op
// een platte testkaart) van M27 tot M30, hun regelkaarten, wachtfiguren, aankleding en stings, een loop door de runner, en de
// regelkaarten van de bijbanen met de koppeling in sidejobs.js. Zelfde opzet als akte45_aaa_test.mjs.
//   node scripts/akte6_aaa_test.mjs
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
const { ververs } = await import('../game/js/spelersregister.js');
const { kaartVan, startKaart, tikKaart } = await import('../game/js/regelkaart.js');
const A6 = await import('../game/js/missions_akte6.js');
const { dressingPlan, DRESSING_KINDS } = await import('../game/js/missiedecor.js');
const { waitFigureFor } = await import('../game/js/wachtprops.js');
const BB = await import('../game/js/bijbaan_aaa.js');
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
wereld();
const defs = M.getMissionDefs();
const def = (label) => { const d = defs.find((q) => q.label === label); assert.ok(d, 'def bestaat: ' + label); return d; };
const NAMEN = { M27: 'Inpakken', M28: 'De wisselwoning', M29: 'Terug', M30: 'Het proefbeleg' };
const stap = (sleutel, soort, re, nr = 0) => { const s = def(NAMEN[sleutel]).stages.filter((q) => q.kind === soort && re.test(q.label || ''))[nr]; assert.ok(s, `${sleutel}: stap ${soort} ${re}`); return s; };

// ---- de canon blijft: stapsoorten, aantal, beloning (saves) ------------------------------------------------------------------
t('de canon van M27 tot M30 is ongewijzigd: stapsoorten en beloning', () => {
  assert.deepEqual(def(NAMEN.M27).stages.map((s) => s.kind), ['hold', 'hold', 'scene', 'hold', 'goto']);
  assert.equal(def(NAMEN.M27).reward, 400);
  assert.deepEqual(def(NAMEN.M28).stages.map((s) => s.kind), ['board', 'goto']);
  assert.equal(def(NAMEN.M28).reward, 400);
  assert.deepEqual(def(NAMEN.M29).stages.map((s) => s.kind), ['hold', 'scene', 'goto']);
  assert.equal(def(NAMEN.M29).reward, 500);
  assert.equal(def(NAMEN.M30).stages.length, 13);
  assert.equal(def(NAMEN.M30).stages.filter((s) => s.kind === 'hold').length, 3);
  assert.equal(def(NAMEN.M30).reward, 1500);
  for (const s of Object.keys(NAMEN)) assert.equal(def(NAMEN[s]).timeLimit, null, `${s}: nog steeds geen klok`);
});

t('alle missies van akte 6 geven een sting bij een voltooide stap', () => {
  for (const s of Object.keys(NAMEN)) assert.equal(def(NAMEN[s]).aaa, true, s);
});

// ---- regelkaarten --------------------------------------------------------------------------------------------------------
const alleKaarten = (tabel) => {
  const lijst = [];
  const verzamel = (o, sleutel) => {
    if (o && typeof o === 'object' && o.doel) lijst.push([sleutel, o]);
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) verzamel(v, sleutel + '.' + k);
  };
  for (const [sleutel, k] of Object.entries(tabel)) verzamel(k, sleutel);
  return lijst;
};

t('elke kaart van akte 6 is geldig: een doel, hoogstens drie regels, leesbare zinnen, en elke kaart hangt aan een stap', () => {
  const lijst = alleKaarten(A6.KAARTEN_AKTE6);
  assert.ok(lijst.length >= 15, 'aantal kaarten: ' + lijst.length);
  for (const [sleutel, kaart] of lijst) {
    const k = kaartVan({ kaart });
    assert.ok(k && k.doel, `${sleutel}: een kaart met doel`);
    assert.ok(k.regels.length >= 1 && k.regels.length <= 3, `${sleutel}: een tot drie regels`);
    for (const r of k.regels) assert.ok(r.zin.length > 5 && r.zin.length <= 90, `${sleutel}: een leesbare regel: ${r.zin}`);
  }
  const gebruikt = new Set();
  for (const s of Object.keys(NAMEN)) for (const q of def(NAMEN[s]).stages) if (q.kaart) gebruikt.add(q.kaart);
  for (const [sleutel, kaart] of lijst) assert.ok(gebruikt.has(kaart), `${sleutel}: hangt aan een stap`);
});

t('de kaarten hangen aan loop- en houd-stappen, nooit aan een scene of een keuze; een stap zonder kaart blijft ongewijzigd', () => {
  for (const s of Object.keys(NAMEN)) for (const q of def(NAMEN[s]).stages) if (q.kaart) assert.ok(['goto', 'hold'].includes(q.kind), `${s}: geen kaart op ${q.kind}`);
  assert.ok(kaartVan(stap('M30', 'goto', /gracht van de vesting/)).doel);
  assert.equal(kaartVan(stap('M30', 'goto', /snackwagen/)).regels.length, 1);
  assert.equal(kaartVan(stap('M28', 'board', /Stap in/)), null);
  assert.ok(kaartVan(stap('M28', 'goto', /wisselwoning/)).afloop, 'M28 zegt eerst wat er misgaat (de bus afschrijven)');
});

t('M30: de vlagkaart toont het doel en daarna een regel; de bolwerkkaarten tellen de vlaggen mee', () => {
  const s = startKaart(stap('M30', 'hold', /vlag op het eerste/), 'M30:v1');
  const eerste = tikKaart(s, 0.02);
  assert.ok(eerste && /vlag op het eerste bolwerk/.test(eerste.body), 'doel eerst');
  const gezien = [];
  for (let k = 0; k < 60; k++) { const c = tikKaart(s, 0.5); if (c) gezien.push(c.body); }
  assert.equal(gezien.length, 1, 'een regel, daarna stil: ' + gezien.join(' | '));
  const klaar = (re) => kaartVan(stap('M30', 'goto', re)).regels[0].inv.klaar;
  assert.deepEqual([klaar(/eerste bolwerk/), klaar(/tweede bolwerk/), klaar(/derde bolwerk/)], [0, 1, 2]);
});

t('twee spelers delen geen kaartstaat (Samen spelen: lokaal beeld)', () => {
  const stp = stap('M28', 'goto', /wisselwoning/);
  const a = startKaart(stp, 'a'), b = startKaart(stp, 'b');
  tikKaart(a, 20);
  assert.ok(tikKaart(b, 0.02), 'de tweede speler begint zijn eigen kaart');
});

// ---- wachtfiguren --------------------------------------------------------------------------------------------------------
t('M27, M29 en M30: elke houd-stap heeft een wachtfiguur, een loopstap geen; de ticks blijven', () => {
  for (const s of ['M27', 'M29', 'M30']) {
    const holds = def(NAMEN[s]).stages.filter((q) => q.kind === 'hold');
    assert.ok(holds.length >= 1);
    for (const h of holds) { assert.ok(waitFigureFor(h, 0), `${s}: figuur bij ${h.label}`); assert.ok(h.ticks && h.ticks.length >= 1, 'ticks blijven'); }
    for (const g of def(NAMEN[s]).stages.filter((q) => q.kind === 'goto')) assert.equal(waitFigureFor(g, 0), null);
  }
  assert.equal(waitFigureFor(stap('M27', 'hold', /servies in de krant/), 0).prop, 'krant');
  const seeds = new Set(def(NAMEN.M30).stages.filter((q) => q.kind === 'hold').map((h) => h.wacht.seed));
  assert.equal(seeds.size, 3, 'elke figuur ziet er anders uit');
});

// ---- aankleding ----------------------------------------------------------------------------------------------------------
t('de plannen van akte 6 bestaan en zijn aangezet: wisselwoning, erf en proefbeleg', () => {
  for (const kind of ['wisselwoning', 'erf', 'proefbeleg']) assert.ok(DRESSING_KINDS.includes(kind) && dressingPlan(kind), kind);
  assert.equal(stap('M28', 'goto', /wisselwoning/).dressing, 'wisselwoning');
  assert.equal(stap('M29', 'hold', /tafels op het erf/).dressing, 'erf');
  assert.equal(stap('M29', 'scene', /buurtfeest/i).dressing, 'erf');
  assert.ok(dressingPlan('erf').crowd && dressingPlan('erf').crowd.count >= 8, 'het buurtfeest heeft een klein publiek');
  assert.ok(dressingPlan('wisselwoning').people.length >= 3, 'de buren staan er');
});

t('M30: het proefbeleg is een lichte variant: een toeschouwer en wat karton, geen publiek (waar niemand het ziet)', () => {
  const p = dressingPlan('proefbeleg');
  assert.equal(p.people.length, 1);
  assert.ok(!p.crowd, 'geen publiek');
  assert.ok(p.props.length <= dressingPlan('naspeling').props.length - 4, 'lichter dan de naspeling van M20');
  for (const q of p.props) assert.ok(Math.hypot(q.along, q.side) <= 10, `op de oever, niet in de gracht: ${q.kind}`);
  const m30 = def(NAMEN.M30);
  assert.equal(m30.stages.filter((s) => s.kind === 'hold').every((s) => s.dressing === 'proefbeleg'), true);
  for (const l of ['De gracht', 'De ophaalbrug', 'De poort']) assert.equal(m30.stages.find((s) => s.kind === 'scene' && s.label === l).dressing, 'proefbeleg', l);
  assert.equal(m30.stages.some((s) => s.dressing === 'naspeling'), false, 'de zware naspeling van M20 blijft bij M20');
});

t('de plannen van akte 6 gebruiken alleen props die de aankleding kent', () => {
  const bekend = new Set(['kist', 'ton', 'bank', 'vaandel', 'banner', 'jurytafel']);
  for (const plan of Object.values(A6.PLANNEN_AKTE6)) for (const q of plan.props) assert.ok(bekend.has(q.kind), 'prop: ' + q.kind);
});

t('geen merknaam of echte persoon in de kaarten, het publiek en de bijbaankaarten', () => {
  const tekst = JSON.stringify(A6.KAARTEN_AKTE6) + JSON.stringify(A6.PLANNEN_AKTE6) + JSON.stringify(BB.BIJBAAN_KAARTEN);
  assert.ok(!/(shell|coca|heineken|albert heijn|facebook|google)/i.test(tekst));
});

// ---- de runner ------------------------------------------------------------------------------------------------------------
t('M27 in de runner: de kaart en de wachtfiguur lopen door de eerste houd-stap zonder fouten', () => {
  const w = wereld();
  const i = M.getMissionDefs().findIndex((d) => d.label === NAMEN.M27);
  assert.equal(M.missionDebug.start(w, i), true);
  tik(w, 4);
  assert.equal(st().phase, 'active');
  tik(w, 4);
  assert.equal(st().phase, 'active');
});

// ---- bijbanen ------------------------------------------------------------------------------------------------------------
const JOBS = {
  taxi: 'sidejob_taxi.js', bezorger: 'sidejob_bezorger.js', krantenwijk: 'sidejob_krantenwijk.js', verhuizing: 'sidejob_verhuizing.js',
  vracht: 'sidejob_vracht.js', bus: 'sidejob_bus.js', lijn: 'sidejob_lijn.js', rondvaart: 'sidejob_rondvaart.js', rondvaarttour: 'sidejob_rondvaarttour.js',
  boa: 'sidejob_boa.js', rechtbank: 'sidejob_rechtbank.js', cabaret: 'sidejob_cabaret.js', fietsdepot: 'sidejob_fietsdepot.js',
  snackoverlast: 'sidejob_snackbar.js', boerderij: 'sidejob_boerderij.js', tjalke: 'sidejob_tjalke.js',
};
for (const [id, pad] of Object.entries(JOBS)) {
  const mod = await import('../game/js/' + pad);
  t(`bijbaan ${id}: het id klopt en de kaart is geldig`, () => {
    assert.equal(mod.default.id, id);
    const k = kaartVan({ kaart: BB.bijbaanKaart(id) });
    assert.ok(k && k.doel && k.afloop, 'doel en afloop');
    assert.ok(k.regels.length >= 1 && k.regels.length <= 3);
    for (const r of k.regels) assert.ok(r.zin.length > 5 && r.zin.length <= 90, r.zin);
  });
}
t('elke bijbaankaart heeft een bijbaan in deze test (behalve de veerdienst, die onder zijn eigen id staat)', () => {
  for (const id of Object.keys(BB.BIJBAAN_KAARTEN)) assert.ok(id === 'veerdienst' || JOBS[id], id);
  assert.ok(BB.bijbaanKaart('veerdienst'));
  assert.equal(BB.bijbaanKaart('bestaat-niet'), null);
  assert.equal(BB.bijbaanKaart('constructor'), null, 'geen prototype-sleutels');
});
t('de kaart komt alleen bij de eerste twee diensten van een baan', () => {
  assert.equal(BB.kaartNodig('taxi', 1), true);
  assert.equal(BB.kaartNodig('taxi', 2), true);
  assert.equal(BB.kaartNodig('taxi', 3), false);
  assert.equal(BB.kaartNodig('taxi', 0), false);
  assert.equal(BB.kaartNodig('bestaat-niet', 1), false);
  assert.equal(BB.kaartNodig('taxi', NaN), false);
});
t('sidejobs.js toont de kaart alleen voor de host, na het intro, en geeft een sting bij een betaalde ronde', () => {
  const sj = fs.readFileSync(new URL('../game/js/sidejobs.js', import.meta.url), 'utf8');
  assert.ok(sj.includes('owner === 0 && (!takeover || takeover.halte) && kaartNodig('), 'alleen de eigen dienst, geen overgenomen bus');
  assert.ok(sj.includes('c.aaaKaart && !isCinematicActive()) toonRegelkaart'), 'niet over het intro heen');
  assert.ok(sj.includes("if (host) { try { stingen.push(world, 'stap')"), 'de sting is voor de speler zelf');
});

t('M30 heeft een slot: het slotfeest bij de frituur en een groot beeld na de poort, en de canon blijft', () => {
  assert.ok(DRESSING_KINDS.includes('slotfeest') && dressingPlan('slotfeest'), 'plan slotfeest');
  const p = dressingPlan('slotfeest');
  assert.ok(p.people.length >= 5, 'de vrienden van Oma staan er');
  assert.ok(p.props.some((q) => q.kind === 'banner'), 'een spandoek');
  assert.equal(stap('M30', 'goto', /snackwagen/).dressing, 'slotfeest');
  assert.equal(stap('M30', 'scene', /^De poort$/).big, 'Gewonnen. Het voelt verkeerd.');
  assert.equal(def(NAMEN.M30).stages.length, 13, 'het aantal stappen blijft (saves)');
  assert.equal(def(NAMEN.M30).slotSting, 'geslaagd_groot');
  assert.ok(def(NAMEN.M30).nasleep.length >= 2, 'een nasleep van een paar regels');
  const mj = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
  assert.ok(mj.includes('def.slotSting') && mj.includes('def.nasleep'), 'missions.js speelt het slotakkoord en de nasleep');
  assert.equal(def(NAMEN.M30).reward, 1500);
});
console.log(`akte6_aaa_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
