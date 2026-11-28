// Het verhaal rond de boer (#1373, audit B2 en B4): het bezoek aan hoeve Zeldenrust (N5) en de akte bij de notaris (N5.2), daarna de schenking van erf, percelen en
// een kudde van twaalf koeien; per speler en lokaal, zonder iets te overschrijven, een tweede keer doet niets, en een oude opslag laadt onveranderd.
//   node scripts/boerstory_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject.
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as S from '../game/js/boerstory.js';
import { milestoneFlagsFor, milestoneFlagsForDone, BOER_FLAGS } from '../game/js/storymilestones.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as Z from '../game/js/bezit.js';
import * as PC from '../game/js/percelen.js';
import * as K from '../game/js/dierklus.js';
import { herdsOf } from '../game/js/livestock.js';
import { KEYS } from '../game/js/storagekeys.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = (start = {}) => { const m = new Map(Object.entries(start)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const script = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const scene = (id) => script.scenes.find((s) => s.id === id);
const words = (x) => String(x).trim().split(/\s+/).length;
const reset = (store = nepOpslag()) => { L.initBezit({ opslag: store }); BL.initBoerderij({ opslag: store }); BL.zetBoerderijVoorTest(null, store); L.zetBezitVoorTest(null, store); return store; };

t('de scenes: het bezoek (N5) en de akte (N5.2) bestaan, kort genoeg, en Oom Hindrik overlijdt niet', () => {
  const bezoek = scene('N5'), akte = scene(S.SCHENKING_SCENE);
  assert.ok(bezoek && akte, 'N5 en N5.2 staan in script.json');
  assert.equal(akte.step, 'N5'); assert.equal(akte.kind, 'key');
  const sprekers = (sc) => new Set(sc.lines.map((l) => l.speaker));
  for (const w of ['Oom Hindrik', 'Tante Aaltje', 'Tessa', 'Tammo']) assert.ok(sprekers(bezoek).has(w), w + ' spreekt in het bezoek');
  assert.ok(sprekers(akte).has('De notaris') && sprekers(akte).has('Tante Aaltje'));
  for (const sc of [bezoek, akte]) for (const l of sc.lines) assert.ok(words(l.text) <= 25, `${sc.id}: ${l.text}`);
  const tekst = (sc) => sc.lines.map((l) => l.text).join(' ');
  assert.match(tekst(bezoek), /Zeldenrust/); assert.match(tekst(bezoek), /Huize Waddenzicht/); assert.match(tekst(bezoek), /Twaalf melkkoeien/);
  assert.match(tekst(akte), /schenkt hoeve Zeldenrust aan zijn neef Tammo en aan Tessa/);
  assert.doesNotMatch(tekst(bezoek) + tekst(akte), /overlijd|dood|begraaf/i);
  assert.doesNotMatch(tekst(bezoek) + tekst(akte), /veertig koeien|40 koeien/i);
});

t('de namen worden eerst ingeleid: Hindrik door Tessa, Aaltje door Tammo, Ypie door Tante Aaltje', () => {
  const bezoek = scene('N5').lines.map((l) => `${l.speaker}|${l.text}`);
  const eersteHindrik = bezoek.findIndex((x) => x.startsWith('Oom Hindrik|'));
  const noemtHindrik = bezoek.findIndex((x) => !x.startsWith('Oom Hindrik|') && /Hindrik/.test(x));
  assert.ok(noemtHindrik >= 0 && noemtHindrik < eersteHindrik, 'Hindrik wordt genoemd voor hij spreekt');
  const eersteAaltje = bezoek.findIndex((x) => x.startsWith('Tante Aaltje|'));
  const noemtAaltje = bezoek.findIndex((x) => !x.startsWith('Tante Aaltje|') && /Aaltje/.test(x));
  assert.ok(noemtAaltje >= 0 && noemtAaltje < eersteAaltje, 'Aaltje wordt genoemd voor ze spreekt');
  const akte = scene(S.SCHENKING_SCENE).lines.map((l) => `${l.speaker}|${l.text}`);
  const eersteYpie = akte.findIndex((x) => /Ypie/.test(x));
  assert.ok(eersteYpie >= 0 && akte[eersteYpie].startsWith('Tante Aaltje|'), 'Ypie wordt door Tante Aaltje ingeleid');
});

t('de vlag boer:bezoek hoort bij N5, ook voor een save die al verder is, en niet bij een eerdere stap', () => {
  assert.ok(BOER_FLAGS.includes(S.BEZOEK_FLAG));
  assert.deepEqual(milestoneFlagsFor('N5').filter((f) => f.startsWith('boer:')), ['boer:bezoek']);
  assert.ok(!milestoneFlagsFor('M09').includes('boer:bezoek'));
  assert.ok(milestoneFlagsForDone(['N5']).includes('boer:bezoek'));
  assert.ok(milestoneFlagsForDone(['M10']).includes('boer:bezoek'), 'een save voorbij N5 (stap overgeslagen) krijgt de vlag');
  assert.ok(!milestoneFlagsForDone(['M02']).includes('boer:bezoek'));
  assert.ok(!milestoneFlagsForDone(['M10']).includes('boer:schenking'), 'de schenking komt pas na de akte');
});

t('wanneer de akte aan de beurt is', () => {
  const st = (done, flags = [], hoeve = false) => S.schenkingStand({ done: new Set(done), flags: new Set(flags), hoeve });
  assert.equal(st(['M09']), 'nog-niet');
  assert.equal(st(['N5']), 'scene');
  assert.equal(st([], ['boer:bezoek']), 'scene');
  assert.equal(st(['N5'], ['boer:schenking']), 'klaar');
  assert.equal(st(['N5'], [], true), 'markeer', 'is de hoeve er al (opslag zonder vlag), dan alleen de vlag');
});

t('wat houdt de akte tegen en wat doet een sessie', () => {
  const rust = { started: true, loading: false, client: false, session: false, openingDue: false, missionActive: false, cinematicActive: false, sinceCinematicS: 99, pigeon: false, activity: false, respawn: false, wanted: 0, sinceDeathS: 99, menuOpen: false, recapOpen: false, dataReady: true };
  assert.deepEqual(S.schenkingBlockers(rust), { blockers: [], sessie: false });
  assert.equal(S.schenkingBlockers({ ...rust, missionActive: true }).blockers.length, 1);
  const s = S.schenkingBlockers({ ...rust, session: true });
  assert.deepEqual(s.blockers, []); assert.equal(s.sessie, true, 'een sessie blokkeert de hoeve niet, ze wordt stil bijgeschreven');
  assert.equal(S.schenkingBlockers({ ...rust, client: true }).sessie, true);
  const b = (o) => S.schenkingBesluit({ stand: 'scene', blockers: [], sessie: false, calmS: 3, kan: true, ...o });
  assert.equal(b({}), 'speel');
  assert.equal(b({ calmS: 1 }), 'wacht'); assert.equal(b({ blockers: ['missie actief'] }), 'wacht'); assert.equal(b({ mag: false }), 'wacht');
  assert.equal(b({ sessie: true }), 'stil'); assert.equal(b({ kan: false }), 'stil');
  assert.equal(b({ stand: 'klaar' }), 'niets'); assert.equal(b({ stand: 'nog-niet' }), 'niets'); assert.equal(b({ stand: 'markeer', blockers: ['x'] }), 'markeer');
});

t('de schenking: erf, percelen en twaalf koeien erbij; kasboek en bestaand bezit blijven; een tweede keer doet niets', () => {
  const st = reset();
  const farm = BL.getBoerderij();
  farm.uren = 500; farm.boek.lening.schuld = 900; farm.totaal.omzet = 321;
  PC.koop(farm.bedrijf, 'perceel', 'wierdeakker', 1e6);
  const r = L.schenkHoeveCompleet();
  assert.ok(r.ok && r.kudde === 12, JSON.stringify(r));
  assert.ok(BL.heeftHoeve());
  assert.ok(farm.bedrijf.percelen.wierdeakker, 'bestaand perceel blijft');
  assert.equal(BL.getBoerderij().boek.lening.schuld, 900); assert.equal(BL.getBoerderij().totaal.omzet, 321); assert.equal(BL.getBoerderij().uren, 500);
  const b = L.getBezit();
  for (const id of PC.SCHENK_PERCEEL_IDS) assert.ok(b.parcels[id] && b.parcels[id].lg, id + ' is eigen bezit en geen handelswaar');
  assert.equal(Z.ownedCount(b), 0, 'de hoeve telt niet mee voor de schaalprijs');
  assert.deepEqual({ ...herdsOf(b)[K.HOEVE_WEI] }, { sp: 'melkvee', n: 12, sick: 0 });
  const voor = JSON.stringify(herdsOf(b));
  assert.equal(L.schenkHoeveCompleet().ok, false, 'een tweede schenking doet niets');
  assert.equal(JSON.stringify(herdsOf(b)), voor);
  L.schrijfNu(); BL.schrijfNu();
  const bewaard = JSON.parse(st.getItem(KEYS.bezit));
  assert.ok(bewaard.parcels['zeldenrust-wei'] && bewaard.x.herds['zeldenrust-wei'].n === 12);
});

t('een oude opslag zonder hoeve laadt onveranderd; een opslag met hoeve en kudde komt heel terug', () => {
  const oud = reset();
  BL.getBoerderij().bedrijf.percelen['wierdeakker'] = { status: 'gekocht', sinds: 10 };
  L.getBezit(); BL.schrijfNu(); L.schrijfNu();
  const store = nepOpslag({ [KEYS.boerderij]: oud.getItem(KEYS.boerderij), [KEYS.bezit]: oud.getItem(KEYS.bezit) || '' });
  if (!store.getItem(KEYS.bezit)) store.m.delete(KEYS.bezit);
  reset(store);
  // reset zet de opslag leeg voor de test: laad de oude opslag opnieuw
  BL.zetBoerderijVoorTest(null, store); L.zetBezitVoorTest(null, store);
  assert.ok(!BL.heeftHoeve());
  assert.ok(!L.getBezit().parcels['zeldenrust-wei'] && !herdsOf(L.getBezit())['zeldenrust-wei']);
  assert.ok(L.schenkHoeveCompleet().ok);
  L.schrijfNu(); BL.schrijfNu();
  const terug = nepOpslag({ [KEYS.bezit]: store.getItem(KEYS.bezit), [KEYS.boerderij]: store.getItem(KEYS.boerderij) });
  BL.zetBoerderijVoorTest(null, terug); L.zetBezitVoorTest(null, terug);
  assert.ok(BL.heeftHoeve());
  assert.equal(herdsOf(L.getBezit())['zeldenrust-wei'].n, 12);
});

t('de hoeve is geen geldbron: de percelen zijn niet te verkopen', () => {
  reset();
  L.schenkHoeveCompleet();
  const w = { money: 5000, addMessage() {} };
  assert.equal(BL.verkoopPerceel(w, 'perceel', 'zeldenrust-wei').ok, false);
  assert.equal(w.money, 5000);
  assert.equal(L.getBezit().parcels['zeldenrust-wei'].lg, 1);
});

console.log(`boerstory_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
