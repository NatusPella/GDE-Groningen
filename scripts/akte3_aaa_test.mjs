// AAA-upgrade van akte 3 (M12 tot M16 en A2, docs/missies/AAA-UPGRADEPLAN.md): gedrag, geen bronregex. De echte defs
// (missions.js op een platte testkaart), de pure plannen en regelkaarten, de wachtfiguur, de aankleding naast de
// landingsstrook, de kermisreactie en de runner voor M16. Zelfde opzet als akte1_runner_test.mjs.
//   node scripts/akte3_aaa_test.mjs
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
const { kaartVan, startKaart, tikKaart, meldKaart } = await import('../game/js/regelkaart.js');
const A3 = await import('../game/js/missions_akte3.js');
const { dressingPlan, DRESSING_KINDS, registreerAankleding } = await import('../game/js/missiedecor.js');
const { waitFigureFor } = await import('../game/js/wachtprops.js');
const { crowdSpecIssue } = await import('../game/js/crowdplan.js');
const { makeStrip } = await import('../game/js/planecontrol.js');
const U = await import('../game/js/kermis_uitslag.js');
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
const NAMEN = { M12: 'Het staat niet in het rooster', M13: 'Het containerlabyrint', M14: 'De dijk', M15: 'Laag over het graan', M16: 'Nog eentje dan' };

// ---- de canon blijft: ids, volgorde, beloning (saves) -----------------------------------------------------------------
t('de canon van M12 tot M16 is ongewijzigd: stapsoorten, beloning en tijd', () => {
  assert.deepEqual(def(NAMEN.M13).stages.map((s) => s.kind), ['goto', 'hold', 'goto', 'hold', 'goto']);
  assert.equal(def(NAMEN.M13).reward, 900);
  assert.equal(def(NAMEN.M13).timeLimit, 480);
  assert.deepEqual(def(NAMEN.M14).stages.map((s) => s.kind), ['board', 'chase']);
  assert.equal(def(NAMEN.M14).reward, 1000);
  assert.deepEqual(def(NAMEN.M15).stages.map((s) => s.kind), ['plane', 'airgates', 'landplane']);
  assert.equal(def(NAMEN.M15).stages[1].gates.length, 5);
  assert.equal(def(NAMEN.M15).reward, 900);
  assert.equal(def(NAMEN.M16).waypoints.length, 6);
  assert.equal(def(NAMEN.M16).timeLimit, 100);
  assert.equal(def(NAMEN.M12).stages[0].kind, 'heli');
});

// ---- regelkaarten ------------------------------------------------------------------------------------------------------
t('elke stap van M12 tot M15 heeft een geldige regelkaart (doel, hoogstens drie regels)', () => {
  for (const sleutel of ['M12', 'M13', 'M14', 'M15']) {
    for (const s of def(NAMEN[sleutel]).stages) {
      const k = kaartVan(s);
      assert.ok(k && k.doel, `${sleutel} ${s.kind}: een kaart met doel`);
      assert.ok(k.regels.length <= 3, `${sleutel}: hoogstens drie regels`);
      for (const r of k.regels) assert.ok(r.zin.length > 5 && r.zin.length <= 90, `${sleutel}: een leesbare regel: ${r.zin}`);
    }
  }
  const k16 = kaartVan(def(NAMEN.M16));
  assert.ok(k16 && /tenten/.test(k16.doel) && k16.regels.length === 3, 'M16 heeft een kaart voor de hele tocht');
  assert.ok(/honderd seconden/.test(k16.druk), 'de kaart noemt de tijd');
});

t('M15: de hoogte-uitleg komt vanzelf, de rest van de kaart wacht op de poorten (poort1 en poort3)', () => {
  const s = startKaart(def(NAMEN.M15).stages[1], 'M15:1');
  const eerste = tikKaart(s, 0.02);
  assert.ok(eerste && /Laag over het graan/.test(eerste.body));
  let t0 = 0; const gezien = [];
  while (t0 < 60) { const c = tikKaart(s, 0.5); t0 += 0.5; if (c) gezien.push(c.body); }
  assert.equal(gezien.length, 1, 'zonder poorten alleen de hoogteregel: ' + gezien.join(' | '));
  assert.match(gezien[0], /3 en 24 meter/);
  meldKaart(s, 'poort1');
  assert.match(tikKaart(s, 0.5).body, /molen rechts/);
  meldKaart(s, 'poort3');
  assert.equal(tikKaart(s, 0.5), null, 'het volgende kaartje wacht tot het vorige zijn tijd heeft gehad');
  let c3 = null;
  for (let k = 0; k < 30 && !c3; k++) c3 = tikKaart(s, 0.5);
  assert.match(c3.body, /kermis ligt onder je/);
});

t('M16: de tentenkaart telt mee bij punt2 en punt4 (na de eerste en tweede tent), niet eerder', () => {
  const s = startKaart(def(NAMEN.M16), 'M16:def');
  tikKaart(s, 0.02);
  let t0 = 0; const gezien = [];
  while (t0 < 40) { const c = tikKaart(s, 0.5); t0 += 0.5; if (c) gezien.push(c.body); }
  assert.equal(gezien.length, 1, 'eerst de uitleg, dan wachten');
  meldKaart(s, 'punt2');
  assert.match(tikKaart(s, 0.5).body, /Eén tent gehaald/);
  meldKaart(s, 'punt4');
  let c = null;
  for (let k = 0; k < 20 && !c; k++) c = tikKaart(s, 0.5);
  assert.match(c.body, /Twee tenten/);
});

// ---- wachtfiguur, stings, aankleding op de defs --------------------------------------------------------------------
t('M13: de twee wachtstappen krijgen een figuur (koffie bij de kooi, krant bij de container), de andere niet', () => {
  const d = def(NAMEN.M13);
  const f1 = waitFigureFor(d.stages[1], 0), f3 = waitFigureFor(d.stages[3], 0);
  assert.ok(f1 && f3, 'beide wachtstappen hebben een figuur');
  assert.equal(d.stages[1].wacht.prop, 'koffie');
  assert.equal(d.stages[3].wacht.prop, 'krant');
  assert.equal(waitFigureFor(d.stages[0], 0), null, 'een goto krijgt geen wachtfiguur');
  assert.ok(d.stages.every((s) => s.kind !== 'hold' || s.ticks.length >= 2), 'de ticks (bubbels) staan er nog');
});

t('alle missies van akte 3 geven een sting bij een voltooide stap', () => {
  for (const sleutel of ['M12', 'M13', 'M14', 'M15', 'M16']) assert.equal(def(NAMEN[sleutel]).aaa, true, sleutel);
});

t('M13, M15: de aankleding bestaat als plan en staat op een eigen plek (dressingAt)', () => {
  for (const kind of ['haven', 'graanstrook', 'graanlanding']) assert.ok(DRESSING_KINDS.includes(kind) && dressingPlan(kind), kind);
  const d13 = def(NAMEN.M13);
  for (const i of [0, 4]) {
    const s = d13.stages[i];
    assert.equal(s.dressing, 'haven');
    assert.ok(Number.isFinite(s.dressingAt.x) && Number.isFinite(s.dressingAt.y));
  }
  const d15 = def(NAMEN.M15);
  assert.equal(d15.stages[0].dressing, 'graanstrook');
  assert.equal(d15.stages[2].dressing, 'graanlanding');
  assert.equal(d15.stages[1].dressing, undefined, 'in de lucht geen aankleding');
});

t('M15: de aankleding naast de strook raakt de baan nooit, in welke richting de speler ook kijkt', () => {
  const spec = def(NAMEN.M15).stages[0].strip;
  const strook = makeStrip(spec);
  for (const i of [0, 2]) {
    const s = def(NAMEN.M15).stages[i];
    const plan = dressingPlan(s.dressing);
    const items = [...plan.props.map((p) => [p.along, p.side]), ...plan.people.map((p) => [p.along, p.side]), ...(plan.crowd ? plan.crowd.pts.flatMap(([a, b]) => [[a, b - plan.crowd.side], [a, b + plan.crowd.side]]) : [])];
    for (let hoek = 0; hoek < 6.3; hoek += 0.35) {
      const c = Math.cos(hoek), z = Math.sin(hoek);
      for (const [along, side] of items) {
        const x = s.dressingAt.x + c * along - z * side, y = s.dressingAt.y + z * along + c * side;
        const dx = x - strook.x, dy = y - strook.y, ch = Math.cos(strook.heading), sh = Math.sin(strook.heading);
        const lang = dx * ch + dy * sh, dwars = -dx * sh + dy * ch;
        assert.ok(!(lang >= -20 && lang <= strook.length + 20 && Math.abs(dwars) <= strook.width / 2 + 6), `een ding staat op de strook (hoek ${hoek.toFixed(2)}, ${along}/${side})`);
      }
    }
  }
});

t('M12 en M16: de heli heeft zijn kaart, de tochtkaart en de kroegset zijn aangezet', () => {
  assert.ok(kaartVan(def(NAMEN.M12).stages[0]).regels.some((r) => r.type === 'toets'), 'de heli-toetsen staan op de kaart');
  assert.equal(def(NAMEN.M16).toastSet, 'kroeg');
});

// ---- de plannen --------------------------------------------------------------------------------------------------------
t('de plannen van akte 3 zijn geldig: binnen 16 m van het anker, geldige publiek-spec, geen merknaam', () => {
  for (const [naam, plan] of Object.entries(A3.PLANNEN_AKTE3)) {
    const p = dressingPlan(naam);
    assert.ok(p.props.length && p.people.length, naam);
    for (const q of [...p.props, ...p.people]) assert.ok(Math.hypot(q.along, q.side) <= 16, `${naam}: binnen bereik (${q.along}, ${q.side})`);
    if (p.crowd) {
      assert.equal(crowdSpecIssue(p.crowd), null, naam);
      assert.ok(p.crowd.count >= 8 && p.crowd.count <= 60);
    }
    const tekst = JSON.stringify(plan);
    assert.ok(!/(shell|coca|heineken|albert heijn)/i.test(tekst), naam + ': geen merknaam');
  }
  assert.equal(dressingPlan('graanlanding').crowd.count, 10, 'tien kermisgangers bij de landing');
  assert.equal(dressingPlan('haven').crowd, null, 'de sluiptocht heeft geen publiek');
});

t('registreerAankleding overschrijft een bestaand plan niet en weigert rommel', () => {
  const voor = dressingPlan('plein').props.length;
  assert.equal(registreerAankleding('plein', { props: [], people: [] }), false);
  assert.equal(dressingPlan('plein').props.length, voor);
  assert.equal(registreerAankleding('', { props: [], people: [] }), false);
  assert.equal(registreerAankleding('x1', { props: 'nee', people: [] }), false);
  assert.equal(dressingPlan('x1'), null);
});

// ---- A2: de reactie van het publiek op de uitslag van de kermisrit -------------------------------------------------------
t('A2: hoe hoger de medaille, hoe langer en groter het publiek reageert', () => {
  const r = [0, 1, 2, 3].map((m) => U.uitslagReactie(m));
  for (let i = 1; i < 4; i++) { assert.ok(r[i].duur > r[i - 1].duur, 'langer'); assert.ok(r[i].aandeel >= r[i - 1].aandeel, 'groter'); }
  assert.equal(r[3].anim, 'cheer');
  assert.equal(U.uitslagReactie(NaN).anim, 'shrug', 'rommel geeft de rustigste reactie');
  assert.equal(U.uitslagReactie(99).duur, r[3].duur, 'te hoog wordt goud, nooit meer');
});

t('A2: bij goud doet iedereen mee, bij brons de helft, met een eigen vertraging, en daarna staat iedereen stil', () => {
  const goud = U.uitslagReactie(3), brons = U.uitslagReactie(1);
  const aantal = (re, tijd) => { let k = 0; const r = { ...re, t: re.duur - tijd }; for (let i = 0; i < 12; i++) if (U.publiekAnim(r, i)) k++; return k; };
  assert.equal(aantal(goud, 1), 12, 'goud: alle twaalf bezoekers');
  const b = aantal(brons, 1);
  assert.ok(b >= 4 && b <= 9, 'brons: ongeveer de helft: ' + b);
  assert.ok(aantal(goud, 0.01) < 12, 'ze beginnen niet allemaal op hetzelfde moment');
  let re = goud;
  for (let k = 0; k < 200; k++) re = re && U.tikReactie(re, 0.05);
  assert.equal(re, null, 'na de duur is de reactie voorbij');
  assert.equal(U.publiekAnim(null, 0), null);
  assert.equal(U.tikReactie(null, 1), null);
});

// ---- de runner: M16 met kaart, stings en de toastset zonder fouten ----------------------------------------------------------
t('M16 in de runner: elk tussenpunt klinkt, de tocht loopt zonder fouten door de tenten', () => {
  const w = wereld();
  const i16 = M.getMissionDefs().findIndex((d) => d.label === NAMEN.M16);
  assert.equal(M.missionDebug.start(w, i16), true);
  tik(w, 2);
  const d = M.getMissionDefs()[i16];
  for (const wp of d.waypoints) {
    w.player.x = wp.x; w.player.y = wp.y;
    tik(w, 0.2);
    if (st().phase !== 'active') break;
  }
  const namen = w.audioEvents.filter((e) => e.kind === 'missiesting').map((e) => e.name);
  assert.ok(namen.filter((x) => x === 'stap').length >= 2, 'de tussenpunten klinken: ' + namen.join());
});

console.log(`akte3_aaa_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
