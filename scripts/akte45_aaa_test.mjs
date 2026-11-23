// AAA-upgrade van akte 4 en 5 (M17 tot M26, docs/missies/AAA-UPGRADEPLAN.md): gedrag, geen bronregex. De echte defs
// (missions.js op een platte testkaart), de regelkaarten, de wachtfiguren, de aankleding en de stings, plus een loop door de
// runner voor een paar stappen. Zelfde opzet als akte3_aaa_test.mjs.
//   node scripts/akte45_aaa_test.mjs
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
const { kaartVan, startKaart, tikKaart } = await import('../game/js/regelkaart.js');
const A45 = await import('../game/js/missions_akte45.js');
const { dressingPlan, DRESSING_KINDS } = await import('../game/js/missiedecor.js');
const { waitFigureFor } = await import('../game/js/wachtprops.js');
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
const NAMEN = {
  M17: 'Open, dicht', M18: "Wie draaide de camera's uit?", M19: 'Stoom', M20: 'Het beleg van Bourtange', M21: 'Iedereen heeft een rode auto gezien',
  M22: 'Een luik erin', M23: 'De colonne', M24: "Er hangt iets Fries aan d'Olle Grieze", M25: 'Het bod viel tegen', M26: 'Ontzet, net als in 1672',
};
const stap = (sleutel, soort, re, nr = 0) => { const s = def(NAMEN[sleutel]).stages.filter((q) => q.kind === soort && re.test(q.label || ''))[nr]; assert.ok(s, `${sleutel}: stap ${soort} ${re}`); return s; };

// ---- de canon blijft: ids, volgorde, beloning (saves) -----------------------------------------------------------------
t('de canon van M17 tot M26 is ongewijzigd: stapsoorten en beloning', () => {
  assert.deepEqual(def(NAMEN.M17).stages.map((s) => s.kind), ['board', 'goto', 'goto', 'goto', 'goto']);
  assert.equal(def(NAMEN.M17).reward, 700);
  assert.equal(def(NAMEN.M17).timeLimit, 1000); // audit 22-11: ruim 1,8 x het foutloze minimum (550 s); #955: was 420 en daarna 600, de eerste etappe alleen al kost 107 s
  assert.equal(def(NAMEN.M18).stages.length, 9);
  assert.equal(def(NAMEN.M18).reward, 600);
  assert.deepEqual(def(NAMEN.M19).stages.map((s) => s.kind), ['goto', 'rit']);
  assert.equal(def(NAMEN.M19).reward, 800);
  assert.equal(def(NAMEN.M20).stages.length, 16);
  assert.equal(def(NAMEN.M20).stages.filter((s) => s.kind === 'hold').length, 6, 'de zes houd-stappen');
  assert.equal(def(NAMEN.M20).reward, 1200);
  assert.deepEqual(def(NAMEN.M21).stages.map((s) => s.kind), ['goto', 'timing', 'choice', 'scene', 'scene', 'goto', 'scene']);
  assert.equal(def(NAMEN.M22).reward, 500); // 23-11 audit speelbaarheid (balans): eerder 300
  assert.equal(def(NAMEN.M23).stages.filter((s) => s.kind === 'convoy').length, 3);
  assert.equal(def(NAMEN.M23).reward, 500);
  assert.deepEqual(def(NAMEN.M24).stages.map((s) => s.kind), ['pigeon', 'scene']);
  assert.deepEqual(def(NAMEN.M25).stages.map((s) => s.kind), ['bake', 'scene']);
  assert.equal(def(NAMEN.M26).stages.length, 11);
});

// ---- stings --------------------------------------------------------------------------------------------------------------
t('alle missies van akte 4 en 5 geven een sting bij een voltooide stap', () => {
  for (const s of Object.keys(NAMEN)) assert.equal(def(NAMEN[s]).aaa, true, s);
});

// ---- regelkaarten --------------------------------------------------------------------------------------------------------
t('elke kaart van akte 4 en 5 is geldig: een doel, hoogstens drie regels, leesbare zinnen', () => {
  const lijst = [];
  const verzamel = (o, sleutel) => {
    if (o && typeof o === 'object' && o.doel) lijst.push([sleutel, o]);
    else if (o && typeof o === 'object') for (const v of Object.values(o)) verzamel(v, sleutel);
  };
  for (const [sleutel, k] of Object.entries(A45.KAARTEN)) verzamel(k, sleutel);
  assert.ok(lijst.length >= 22, 'aantal kaarten: ' + lijst.length);
  for (const [sleutel, kaart] of lijst) {
    const k = kaartVan({ kaart });
    assert.ok(k && k.doel, `${sleutel}: een kaart met doel`);
    assert.ok(k.regels.length >= 1 && k.regels.length <= 3, `${sleutel}: een tot drie regels: ${k.regels.length}`);
    for (const r of k.regels) assert.ok(r.zin.length > 5 && r.zin.length <= 90, `${sleutel}: een leesbare regel: ${r.zin}`);
  }
});

t('de kaarten hangen aan de stappen waar het plan ze voorschrijft (goto, hold, rit, convoy, bake, chase), nooit aan een QTE of gesprek', () => {
  for (const s of Object.keys(NAMEN)) {
    for (const q of def(NAMEN[s]).stages) if (q.kaart) assert.ok(!['timing', 'choice', 'scene'].includes(q.kind), `${s}: geen kaart op ${q.kind}`);
  }
  for (const [i, s] of def(NAMEN.M17).stages.entries()) assert.equal(!!s.kaart, i > 0, `M17 stap ${i}`);
  assert.ok(kaartVan(stap('M19', 'rit', /museumtrein/)).regels.some((r) => r.type === 'toets'), 'de bediening staat op de kaart');
  assert.ok(kaartVan(stap('M23', 'convoy', /Aduard/)).doel, 'de colonne heeft een kaart');
  assert.ok(kaartVan(stap('M26', 'chase', /dwars/)).druk, 'de achtervolging noemt de tijd');
  assert.equal(kaartVan(stap('M25', 'bake', /oefenronde/)).regels.length, 2);
  assert.ok(kaartVan(stap('M20', 'hold', /eerste deur/)).doel);
  assert.equal(kaartVan(stap('M20', 'goto', /Ren naar de tweede deur/)), null, 'een stap zonder kaart blijft ongewijzigd');
});

t('M17: de kaart van de eerste brug toont het doel en daarna een regel tegelijk', () => {
  const s = startKaart(stap('M17', 'goto', /eerste vier bruggen/), 'M17:1');
  const eerste = tikKaart(s, 0.02);
  assert.ok(eerste && /Wubbo opent/.test(eerste.body), 'doel eerst');
  const gezien = [];
  for (let k = 0; k < 120; k++) { const c = tikKaart(s, 0.5); if (c) gezien.push(c.body); }
  assert.equal(gezien.length, 2, 'twee regels, een voor een: ' + gezien.join(' | '));
});

t('twee spelers delen geen kaartstaat (Samen spelen: lokaal beeld)', () => {
  const stp = stap('M19', 'rit', /museumtrein/);
  const a = startKaart(stp, 'a'), b = startKaart(stp, 'b');
  tikKaart(a, 20);
  assert.ok(tikKaart(b, 0.02), 'de tweede speler begint zijn eigen kaart');
  assert.ok(stp.kaart.regels.length >= 2, 'de invoer is niet veranderd');
});

// ---- wachtfiguren --------------------------------------------------------------------------------------------------------
t('M20: elke houd-stap heeft een wachtfiguur, een goto geen; de ticks blijven', () => {
  const d = def(NAMEN.M20);
  const holds = d.stages.filter((s) => s.kind === 'hold');
  assert.equal(holds.length, 6);
  for (const h of holds) { assert.ok(waitFigureFor(h, 0), `figuur bij ${h.label}`); assert.ok(h.ticks && h.ticks.length >= 1, 'ticks blijven'); }
  for (const g of d.stages.filter((s) => s.kind === 'goto')) assert.equal(waitFigureFor(g, 0), null);
  const seeds = new Set(holds.map((h) => h.wacht.seed));
  assert.equal(seeds.size, 6, 'elke figuur ziet er anders uit');
  assert.equal(stap('M20', 'hold', /naspeling: het publiek klapt/).wacht.prop, 'krant', 'Berend met zijn flyers');
});

t('M22 en M26: Tinus met koffie bij het luik, een figuur bij de kraam in het vuurwerk', () => {
  assert.equal(waitFigureFor(stap('M22', 'hold', /Henk het luik/), 0).prop, 'koffie');
  assert.ok(waitFigureFor(stap('M26', 'hold', /kraam heel/), 0));
});

// ---- aankleding ----------------------------------------------------------------------------------------------------------
t('M19 en M26: het perron en het plein bestaan als plan en zijn aangezet', () => {
  for (const kind of ['perron', 'plein']) assert.ok(DRESSING_KINDS.includes(kind) && dressingPlan(kind), kind);
  assert.equal(stap('M19', 'goto', /stoomtrein/).dressing, 'perron');
  assert.equal(stap('M19', 'rit', /./).dressing, 'perron', 'het perron blijft staan tijdens de instapstap (de eerste stap is meteen klaar)');
  assert.ok(dressingPlan('perron').crowd, 'reizigers op het perron');
  const m26 = def(NAMEN.M26);
  assert.equal(stap('M26', 'bake', /eierbal/).dressing, 'plein');
  assert.equal(stap('M26', 'hold', /kraam heel/).dressing, 'plein');
  for (const l of ['De jury', 'De stemming', 'De uitslag']) assert.equal(m26.stages.find((s) => s.kind === 'scene' && s.label === l).dressing, 'plein', l);
  assert.ok(dressingPlan('plein').crowd.count >= 14, 'het plein heeft publiek');
  assert.equal(m26.stages.find((s) => s.kind === 'chase').dressing, undefined, 'in de achtervolging geen aankleding');
});

t('de bestaande aankleding van M20 blijft staan (naspeling op wallen, gracht en poort)', () => {
  const met = def(NAMEN.M20).stages.filter((s) => s.dressing === 'naspeling').length;
  assert.ok(met >= 8, 'naspeling: ' + met);
});

t('geen merknaam of echte persoon in de kaarten', () => {
  const tekst = JSON.stringify(A45.KAARTEN) + JSON.stringify(A45.WACHT);
  assert.ok(!/(shell|coca|heineken|albert heijn|facebook|google)/i.test(tekst));
});

// ---- de runner ------------------------------------------------------------------------------------------------------------
t('M22 in de runner: de kaart en de wachtfiguur lopen door de eerste stap zonder fouten', () => {
  const w = wereld();
  const i = M.getMissionDefs().findIndex((d) => d.label === NAMEN.M22);
  assert.equal(M.missionDebug.start(w, i), true);
  tik(w, 4);
  assert.equal(st().phase, 'active');
  tik(w, 4);
  assert.equal(st().phase, 'active');
});

t('M26 heeft een slot: het grote beeld bij de uitslag, het slotakkoord en een nasleep', () => {
  const m = M.getMissionDefs().find((d) => d.label === 'Ontzet, net als in 1672');
  assert.equal(m.slotSting, 'geslaagd_groot');
  assert.ok(m.nasleep.length >= 1);
  assert.ok(/Ontzet/.test(m.stages.find((s) => s.label === 'De uitslag').big));
  assert.equal(m.stages.length, 11, 'het aantal stappen blijft (saves)');
});
console.log(`akte45_aaa_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
