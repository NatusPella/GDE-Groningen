// De schenking van hoeve Zeldenrust (#1373, bijbel 28-11 §2.2): erf en percelen als data, bijschrijven zonder te overschrijven, een tweede keer doet niets,
// niet te koop, huur of verkopen, en een oude opslag laadt onveranderd.   node scripts/schenking_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject.
import assert from 'node:assert/strict';
import * as PC from '../game/js/percelen.js';
import * as B from '../game/js/boerderij.js';
import * as Live from '../game/js/boerderijlive.js';
import { KEYS } from '../game/js/storagekeys.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = (start = {}) => { const m = new Map(Object.entries(start)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const wereld = (money = 5000) => ({ money, clock: 8, time: 0, msgs: [], addMessage(x) { this.msgs.push(x); } });
const opnieuw = (b) => B.normaliseer(JSON.parse(JSON.stringify(b)));

t('de data: Zeldenrust ligt tussen Warffum en Usquert, de vaste twaalf blijven twaalf', () => {
  assert.equal(PC.PERCELEN.length, 12);
  assert.equal(PC.ERVEN.length, 4);
  const erf = PC.erfDef(PC.SCHENK_ERF);
  assert.equal(erf.naam, 'Hoeve Zeldenrust');
  for (const d of [erf, ...PC.SCHENK_PERCELEN]) {
    assert.ok(d.lat > 53.39 && d.lat < 53.44 && d.lon > 6.55 && d.lon < 6.62, d.id + ' ligt in het Hogeland bij Warffum en Usquert');
    assert.equal(d.aanbod, 'schenking'); assert.equal(d.koop, 0);
  }
  assert.ok(PC.SCHENK_PERCELEN.some((p) => p.soort === 'weiland') && PC.SCHENK_PERCELEN.some((p) => p.soort === 'akker'));
  for (const id of PC.SCHENK_PERCEEL_IDS) assert.ok(PC.isPerceelId(id) && PC.perceelDef(id), id);
});

t('voor de schenking is Zeldenrust nergens te zien: niet in het aanbod, niet te koop of te huren', () => {
  const bd = PC.nieuwBedrijf();
  assert.ok(!PC.heeftHoeve(bd));
  assert.ok(!PC.overzichtErven(bd).some((e) => e.id === PC.SCHENK_ERF));
  assert.ok(!PC.overzichtPercelen(bd).some((p) => PC.SCHENK_PERCEEL_IDS.includes(p.id)));
  assert.equal(PC.perceelLijst(bd).length, 12);
  for (const [soort, id] of [['erf', PC.SCHENK_ERF], ['perceel', 'zeldenrust-akker']]) {
    const s = PC.stand(bd, soort, id);
    assert.ok(!s.kunKopen && !s.kunHuren);
    assert.equal(PC.koop(bd, soort, id, 1e9).ok, false);
    assert.equal(PC.huur(bd, soort, id, 'dag', 0, 1e9).ok, false);
  }
  assert.ok(!bd.erven[PC.SCHENK_ERF] && !bd.percelen['zeldenrust-akker']);
});

t('schenk: erf en percelen erbij, thuis en actief perceel blijven, een tweede keer doet niets', () => {
  const bd = PC.nieuwBedrijf();
  const r = PC.schenk(bd);
  assert.ok(r.ok); assert.equal(r.nieuw.length, 1 + PC.SCHENK_PERCELEN.length);
  assert.ok(PC.heeftHoeve(bd));
  assert.equal(bd.thuis, PC.START_ERF); assert.equal(bd.actief, PC.START_PERCEEL);
  assert.equal(PC.opslagVrij(bd, PC.SCHENK_ERF), PC.erfDef(PC.SCHENK_ERF).opslagKg);
  assert.ok(PC.overzichtErven(bd).some((e) => e.id === PC.SCHENK_ERF && e.van === 'jou'));
  assert.equal(PC.perceelLijst(bd).length, 12 + PC.SCHENK_PERCELEN.length);
  const voor = JSON.stringify(bd);
  const nogmaals = PC.schenk(bd);
  assert.equal(nogmaals.ok, false); assert.match(nogmaals.reden, /al van jou/);
  assert.equal(JSON.stringify(bd), voor);
  assert.equal(PC.zetActief(bd, 'zeldenrust-wei'), true); assert.equal(PC.zetThuis(bd, PC.SCHENK_ERF), true);
});

t('een bestaande boerderij blijft heel: percelen, opslag, machines en thuis worden niet overschreven', () => {
  const bd = PC.nieuwBedrijf();
  assert.ok(PC.koop(bd, 'perceel', 'wierdeakker', 1e6).ok); assert.ok(PC.koop(bd, 'erf', 'wierdehoeve', 1e6).ok);
  PC.bergOp(bd, 'wierdehoeve', 'bieten', 1234); PC.bergOp(bd, PC.START_ERF, 'graan', 400);
  PC.stal(bd, 'trekker-klein', 'wierdehoeve');
  PC.zetThuis(bd, 'wierdehoeve'); PC.zetActief(bd, 'wierdeakker');
  bd.percelen['wierdeakker'].sinds = 77;
  const eerst = JSON.parse(JSON.stringify(bd));
  assert.ok(PC.schenk(bd).ok);
  for (const k of ['percelen', 'erven']) for (const id of Object.keys(eerst[k])) assert.deepEqual(bd[k][id], eerst[k][id], `${k}.${id}`);
  assert.deepEqual(bd.opslag['wierdehoeve'], eerst.opslag['wierdehoeve']); assert.deepEqual(bd.opslag[PC.START_ERF], eerst.opslag[PC.START_ERF]);
  assert.deepEqual(bd.machinepark, eerst.machinepark); assert.deepEqual(bd.totaal, eerst.totaal);
  assert.equal(bd.thuis, 'wierdehoeve'); assert.equal(bd.actief, 'wierdeakker');
});

t('een geschonken hoeve is geen geldbron: niet te verkopen of op te zeggen', () => {
  const bd = PC.nieuwBedrijf(); PC.schenk(bd);
  for (const [soort, id] of [['erf', PC.SCHENK_ERF], ['perceel', 'zeldenrust-wei']]) {
    assert.equal(PC.verkoop(bd, soort, id).ok, false);
    assert.equal(PC.zegOp(bd, soort, id).ok, false);
    assert.ok(bd[soort === 'erf' ? 'erven' : 'percelen'][id], id + ' blijft van jou');
  }
  assert.equal(bd.totaal.verkocht, 0);
});

t('opslag: de hoeve overleeft bewaren en laden, en een oude opslag zonder hoeve laadt onveranderd', () => {
  const oud = B.nieuweBoerderij();
  oud.bedrijf.percelen['wierdeakker'] = { status: 'gekocht', sinds: 0 };
  const rawOud = JSON.parse(JSON.stringify(oud));
  const geladen = opnieuw(rawOud);
  assert.deepEqual(geladen.bedrijf.percelen, oud.bedrijf.percelen);
  assert.ok(!PC.heeftHoeve(geladen.bedrijf));
  PC.schenk(geladen.bedrijf);
  PC.bergOp(geladen.bedrijf, PC.SCHENK_ERF, 'aardappelen', 3000);
  const terug = opnieuw(geladen);
  assert.ok(PC.heeftHoeve(terug.bedrijf)); assert.equal(terug.bedrijf.opslag[PC.SCHENK_ERF].aardappelen, 3000);
  for (const id of PC.SCHENK_PERCEEL_IDS) assert.ok(terug.bedrijf.percelen[id], id);
  assert.ok(terug.bedrijf.percelen['wierdeakker']);
  // het kasboek, de lening en de uren gaan niet verloren
  assert.deepEqual(terug.boek, geladen.boek); assert.equal(terug.uren, geladen.uren);
});

t('schenkHoeve (live): geen geld erbij of eraf, kasboek en gewas blijven, een tweede schenking doet niets en wordt bewaard', () => {
  const st = nepOpslag();
  Live.initBoerderij({ opslag: st });
  Live.zetBoerderijVoorTest(null, st);
  const b = Live.getBoerderij();
  b.uren = 500; b.boek.lening.schuld = 1200; b.totaal.omzet = 321;
  const w = wereld(5000);
  const r = Live.schenkHoeve();
  assert.ok(r.ok && Live.heeftHoeve());
  assert.equal(w.money, 5000);
  assert.equal(Live.getBoerderij().boek.lening.schuld, 1200); assert.equal(Live.getBoerderij().totaal.omzet, 321); assert.equal(Live.getBoerderij().uren, 500);
  assert.equal(Live.schenkHoeve().ok, false);
  Live.schrijfNu();
  const bewaard = JSON.parse(st.getItem(KEYS.boerderij));
  assert.ok(bewaard.bedrijf.erven[PC.SCHENK_ERF] && bewaard.bedrijf.percelen['zeldenrust-akker']);
  // een hoeve werkt als een perceel: het veld is te kiezen en te bewerken
  assert.ok(Live.zetActief('zeldenrust-akker'));
  assert.equal(PC.actiefPerceel(Live.getBedrijf()).id, 'zeldenrust-akker');
  Live.zetBoerderijVoorTest(null, nepOpslag());
});

t('de kaartlaag toont de geschonken percelen pas als ze van jou zijn', () => {
  const bd = PC.nieuwBedrijf();
  assert.ok(!PC.perceelLijst(bd).some((p) => p.id === 'zeldenrust-wei'));
  PC.schenk(bd);
  const eigen = PC.perceelLijst(bd).filter((p) => PC.stand(bd, 'perceel', p.id).van === 'jou').map((p) => p.id);
  assert.ok(eigen.includes('zeldenrust-wei') && eigen.includes('zeldenrust-akker') && eigen.includes(PC.START_PERCEEL));
  assert.equal(PC.kaartSoort(PC.stand(bd, 'perceel', 'zeldenrust-wei')), 'perceel-eigen');
  assert.match(PC.kaartOnderschrift(PC.stand(bd, 'perceel', 'zeldenrust-wei')), /van jou/);
});

console.log(`schenking_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
