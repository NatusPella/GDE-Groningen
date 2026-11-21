// De brug Bezit -> boerderij (#1101): een gekocht perceel uit de index werkt als veld, de werkeenheid, werken op een willekeurig perceel en het
// boomgaardfruit.   node scripts/parcelfarm_test.mjs
// Schrijft nooit naar echte opslag: alles in het geheugen.
import assert from 'node:assert/strict';
import * as Z from '../game/js/bezit.js';
import * as PC from '../game/js/percelen.js';
import * as B from '../game/js/boerderij.js';
import * as PF from '../game/js/parcelfarm.js';
import { dagprijs } from '../game/js/gewasmarkt.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; PC.wisExtraPercelen(); try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join('\n   ')); } };
const pid = (i) => 'p' + (0xabc000000000 + i * 7919).toString(16).padStart(12, '0');
const idx = (i, o = {}) => ({ id: pid(i), kind: 'a', ha: 2.4, x: 1000 + i, y: 2000, ax: 990, ay: 1990, access: 'weg', ...o });

t('adapter: soort, bodem uit de streek, verzonnen naam, ha', () => {
  const a = PF.parcelDefFromIndex(idx(1), { region: 'hogeland', place: 'Winsum' });
  assert.equal(a.soort, 'akker'); assert.equal(a.ha, 2.4); assert.equal(a.extra, true);
  assert.match(a.naam, /bij Winsum \(K\d{4}\)/);
  const k = PF.parcelDefFromIndex(idx(1), { region: 'hogeland' }), v = PF.parcelDefFromIndex(idx(1), { region: 'westerwolde' });
  assert.ok(k.bodem > v.bodem, 'klei is beter dan zand');
  assert.deepEqual(PF.parcelDefFromIndex(idx(1), { region: 'hogeland', place: 'Winsum' }), a, 'stabiel');
  assert.equal(PF.parcelDefOf(pid(2), 'w', 3).soort, 'weiland');
  assert.equal(PF.parcelDefOf(pid(2), 'b', 3).soort, 'boomgaard');
  assert.equal(PF.parcelDefOf(pid(2), '?', 3).soort, 'akker');
  assert.ok(PF.parcelDefOf(pid(2), 'a', 0).ha > 0, 'nooit nul ha');
});

t('register: perceelDef en isPerceelId kennen het id; ongeldig en dubbel niet', () => {
  assert.equal(PC.perceelDef(pid(1)), null);
  assert.ok(PC.registreerExtraPerceel(PF.parcelDefFromIndex(idx(1))));
  assert.equal(PC.perceelDef(pid(1)).ha, 2.4);
  assert.ok(PC.isPerceelId(pid(1)) && PC.isPerceelId(PC.START_PERCEEL) && !PC.isPerceelId(pid(2)));
  assert.equal(PC.registreerExtraPerceel({ id: 'wierdeakker', ha: 2, soort: 'akker' }), false, 'een vast id niet overschrijven');
  assert.equal(PC.registreerExtraPerceel({ id: 'geenhex', ha: 2, soort: 'akker' }), false);
  assert.equal(PC.registreerExtraPerceel({ id: pid(3), ha: 0, soort: 'akker' }), false);
  assert.equal(PC.registreerExtraPerceel({ id: pid(3), ha: 1, soort: 'woestijn' }), false);
  assert.equal(PC.PERCELEN.length, 12, 'de vaste twaalf blijven');
  assert.equal(PC.overzichtPercelen(PC.nieuwBedrijf()).length, 12, 'het aanbod blijft de vaste lijst');
});

t('normaliseerBedrijf en normaliseer: een geregistreerd id overleeft opslag, een onbekend id valt weg', () => {
  const b = B.nieuweBoerderij();
  PF.registerOwnedParcels(Object.assign(Z.newBezit(), { parcels: { [pid(1)]: { k: 'a', ha: 2.4, t: 0, p: 5000, w: 0, m: 'self' } } }));
  PF.adoptParcel(b, pid(1), 3);
  assert.equal(b.bedrijf.percelen[pid(1)].sinds, 72);
  b.velden[pid(1)] = { ...B.nieuwVeld(), fase: 'geploegd', bodem: 0.9 };
  b.plan[pid(1)] = 'bieten'; b.bodemlog[pid(1)] = { u: 0.1, g: 'graan' }; b.posities[pid(1)] = { x: 5, y: 6, a: 0.5 };
  const kopie = B.normaliseer(JSON.parse(JSON.stringify(b)));
  assert.ok(kopie.bedrijf.percelen[pid(1)] && kopie.velden[pid(1)].fase === 'geploegd' && kopie.plan[pid(1)] === 'bieten');
  assert.equal(kopie.bodemlog[pid(1)].u, 0.1); assert.deepEqual(kopie.posities[pid(1)], { x: 5, y: 6, a: 0.5 });
  PC.wisExtraPercelen();
  const zonder = B.normaliseer(JSON.parse(JSON.stringify(b)));
  assert.ok(!zonder.bedrijf.percelen[pid(1)] && !zonder.velden[pid(1)] && !zonder.plan[pid(1)], 'onbekend id: weg, nooit een crash');
});

t('bestaande saves: de vaste twaalf werken als voorheen, ook met extra percelen erbij', () => {
  PC.registreerExtraPerceel(PF.parcelDefOf(pid(1), 'a', 2));
  const raw = B.nieuweBoerderij();
  raw.bedrijf.percelen.wierdeakker = { status: 'gekocht', sinds: 0 }; raw.velden.wierdeakker = { ...B.nieuwVeld(), fase: 'geploegd', bodem: 1 }; raw.plan.wierdeakker = 'graan';
  const b = B.normaliseer(JSON.parse(JSON.stringify(raw)));
  assert.ok(b.bedrijf.percelen.wierdeakker && b.velden.wierdeakker.fase === 'geploegd' && b.plan.wierdeakker === 'graan');
  assert.equal(B.planVoor(b, 'wierdeakker'), 'graan');
  assert.equal(PC.stand(b.bedrijf, 'perceel', 'wierdeakker').van, 'jou');
  assert.equal(PC.totaalHa(b.bedrijf), 3.2);
});

t('syncFarmWithBezit: toevoegen, idempotent, en verkocht gaat weer uit het bedrijf', () => {
  const bz = Z.newBezit(), farm = B.nieuweBoerderij();
  for (let i = 0; i < 3; i++) assert.ok(Z.buyParcel(bz, idx(i), 3000, 1, 1e6).ok);
  const r = PF.syncFarmWithBezit(farm, bz, { region: () => 'oldambt', place: () => 'Winsum' }, 1);
  assert.deepEqual([r.registered, r.adopted, r.released], [3, 3, 0]);
  assert.equal(PF.syncFarmWithBezit(farm, bz, {}, 1).adopted, 0, 'tweede keer niets nieuws');
  assert.ok(PC.perceelDef(pid(0)).bodem >= 0.5, 'streek uit de context');
  farm.plan[pid(1)] = 'graan'; farm.velden[pid(1)] = { ...B.nieuwVeld(), fase: 'geploegd' };
  assert.ok(Z.sellParcel(bz, pid(1)).ok);
  const s = PF.syncFarmWithBezit(farm, bz, {}, 2);
  assert.equal(s.released, 1);
  assert.ok(!farm.bedrijf.percelen[pid(1)] && !farm.velden[pid(1)] && !farm.plan[pid(1)] && !PC.perceelDef(pid(1)));
  assert.ok(farm.bedrijf.percelen[pid(0)] && farm.bedrijf.percelen[pid(2)]);
});

t('releaseParcel: het actieve perceel valt terug op de Zonnehoek; vaste percelen blijven', () => {
  const bz = Z.newBezit(), farm = B.nieuweBoerderij();
  Z.buyParcel(bz, idx(5), 3000, 1, 1e6);
  PF.syncFarmWithBezit(farm, bz, {}, 1);
  assert.ok(PC.zetActief(farm.bedrijf, pid(5)));
  B.syncVeld(farm);
  assert.equal(farm.veldVan, pid(5));
  Z.sellParcel(bz, pid(5));
  PF.syncFarmWithBezit(farm, bz, {}, 2);
  assert.equal(farm.bedrijf.actief, PC.START_PERCEEL); assert.equal(farm.veldVan, PC.START_PERCEEL);
  assert.equal(PF.releaseParcel(farm, PC.START_PERCEEL), false);
  assert.equal(PF.releaseParcel(farm, 'wierdeakker'), false);
});

t('acquireParcel: koop, register en bedrijf in een keer; een weigering verandert niets', () => {
  const bz = Z.newBezit(), farm = B.nieuweBoerderij();
  const nee = PF.acquireParcel(bz, farm, idx(1), 5000, 1, 100);
  assert.equal(nee.ok, false); assert.equal(nee.why, 'te-weinig-geld');
  assert.ok(!farm.bedrijf.percelen[pid(1)] && !PC.perceelDef(pid(1)));
  const ja = PF.acquireParcel(bz, farm, idx(1, { kind: 'w' }), 5000, 1, 9000, { region: 'veenkolonien', place: 'Veendam' });
  assert.ok(ja.ok);
  assert.equal(PC.perceelDef(pid(1)).soort, 'weiland'); assert.equal(PC.perceelDef(pid(1)).region, 'veenkolonien');
  assert.equal(B.planVoor(farm, pid(1)), 'gras', 'op een weiland teel je gras');
});

t('werkeenheid: de rondes schalen met sqrt(ha/1,2) tot 3; de opbrengst per ronde stijgt hooguit tot de afspraak', () => {
  assert.equal(PF.workFactor(1.2), 1);
  assert.ok(Math.abs(PF.workFactor(4.8) - 2) < 1e-9);
  assert.equal(PF.workFactor(10.8), 3); assert.equal(PF.workFactor(500), 3, 'plafond x3');
  assert.equal(PF.workFactor(0.01), PF.WORK_MIN);
  let max = 0, maxOud = 0;
  for (let ha = 0.1; ha <= 60; ha += 0.1) {
    assert.ok(PF.yieldPerRound(ha) <= PF.MAX_YIELD_PER_ROUND + 1e-9, `${ha} ha: ${PF.yieldPerRound(ha)}`);
    max = Math.max(max, PF.yieldPerRound(ha)); maxOud = Math.max(maxOud, PF.oldYieldPerRound(ha));
  }
  assert.ok(Math.abs(max - 2) < 0.01 && maxOud === 4, 'was x4 bij vaste arbeid, nu hooguit x2');
  assert.ok(PF.yieldPerRound(1.2) === 1 && Math.abs(PF.yieldPerRound(2.4) - Math.sqrt(2)) < 1e-9);
  assert.ok(PF.yieldPerRound(40) < PF.yieldPerRound(4.8), 'boven het plafond daalt het weer: meer ha vraagt echt meer werk');
  assert.ok(PF.workUnits(12) === 10 && PF.unitScale(12) > 1, 'wie alle rondes werkt, krijgt de hele oogst');
});

t('rijen: de lengte schaalt mee en de positie volgt de rijen heen en terug', () => {
  const kleine = PF.rowLayout(1.2), grote = PF.rowLayout(10.8);
  assert.equal(kleine.rows, 4); assert.equal(kleine.rowLength, 100); assert.equal(grote.rowLength, 300);
  const c = { x: 500, y: 700, a: 0 };
  const start = PF.rowPose(kleine, c, 0), eind = PF.rowPose(kleine, c, 1);
  assert.equal(start.row, 0); assert.equal(eind.row, 3);
  assert.ok(Math.abs(start.x - 450) < 0.2 && Math.abs(eind.x - 450) < 0.2, 'rij 0 begint links, rij 3 eindigt links (heen en terug)');
  const mid = PF.rowPose(kleine, c, 0.125);
  assert.ok(Math.abs(mid.x - 500) < 0.2, 'halverwege de eerste rij: het midden');
  assert.ok(Math.abs(PF.rowPose(kleine, { ...c, a: Math.PI / 2 }, 0.125).y - 700) < 0.2, 'gedraaid veld');
  for (let p = 0; p <= 1; p += 0.05) { const q = PF.rowPose(grote, c, p); assert.ok(Math.hypot(q.x - c.x, q.y - c.y) < 200); }
  assert.deepEqual(PF.rowPose(kleine, c, NaN), start, 'onzin geeft het begin');
});

t('workField: werkt op een niet-actief perceel met dezelfde regels als handwerk en zet alles terug', () => {
  const farm = B.nieuweBoerderij();
  PC.registreerExtraPerceel(PF.parcelDefOf(pid(1), 'a', 1.2));
  PF.adoptParcel(farm, pid(1));
  farm.schuur = { gewas: 'graan', kg: 77, kwaliteit: 1, veld: null };
  const eerste = farm.veld;
  assert.equal(PF.fieldPhase(farm, pid(1)), 'braak');
  assert.equal(PF.workField(farm, pid(1), 'ploegen', { fractie: 1 }).taak, 'ploegen');
  assert.equal(PF.fieldPhase(farm, pid(1)), 'geploegd');
  const z = PF.workField(farm, pid(1), 'zaaien', { fractie: 1 });
  assert.equal(z.gewas, 'aardappelen'); assert.equal(z.kosten.materiaal, 40);
  assert.equal(PF.fieldPhase(farm, pid(1)), 'groeit');
  farm.uren = 31; assert.equal(PF.fieldPhase(farm, pid(1)), 'rijp');
  const o = PF.workField(farm, pid(1), 'oogsten', { fractie: 1 });
  assert.ok(o.load.kg > 0 && o.load.gewas === 'aardappelen');
  assert.deepEqual(farm.schuur, { gewas: 'graan', kg: 77, kwaliteit: 1, veld: null }, 'de schuur is onaangeroerd');
  assert.equal(farm.veld, eerste); assert.equal(farm.veldVan, PC.START_PERCEEL); assert.equal(farm.bedrijf.actief, PC.START_PERCEEL);
  assert.equal(B.veldStand(farm, pid(1)).stoppel, 'aardappelen');
  assert.equal(PF.workField(farm, 'onbekend', 'ploegen'), null);
  // gelijk aan handwerk: dezelfde oogst als op de Zonnehoek (zelfde ha, zelfde bodem)
  const hand = B.nieuweBoerderij();
  PC.registreerExtraPerceel({ ...PF.parcelDefOf(pid(2), 'a', 1.2), bodem: PC.perceelDef(PC.START_PERCEEL).bodem });
  PF.adoptParcel(hand, pid(2));
  PF.workField(hand, pid(2), 'ploegen', { fractie: 1 }); PF.workField(hand, pid(2), 'zaaien', { fractie: 1 });
  hand.uren = 31;
  const kgExtra = PF.workField(hand, pid(2), 'oogsten', { fractie: 1 }).load.kg;
  const zon = B.nieuweBoerderij();
  B.rondTaakAf(zon, 'ploegen', 1); B.rondTaakAf(zon, 'zaaien', 1, { gewas: 'aardappelen' }); zon.uren = 31;
  assert.equal(B.rondTaakAf(zon, 'oogsten', 1).kg, kgExtra, 'het extra perceel rekent als de Zonnehoek');
});

t('boomgaardfruit: gewas van een boomgaard, korte zomercyclus, eigen prijs; akkers en weilanden houden hun gewassen', () => {
  const g = B.GEWASSEN.fruit;
  assert.ok(g.groeiUren <= 48 && g.groeiUren >= 20, 'korte zomercyclus');
  assert.equal(g.soort, 'boomgaard'); assert.equal(g.prijsKg, 0.38); assert.ok(dagprijs('fruit', 0) === 0.38);
  assert.ok(dagprijs('fruit', 5) >= 0.38 * 0.8 - 0.01 && dagprijs('fruit', 5) <= 0.38 * 1.2 + 0.01);
  assert.equal(B.gewasVoor('fruit', 'boomgaard'), 'fruit');
  assert.equal(B.gewasVoor('fruit', 'akker'), 'aardappelen'); assert.equal(B.gewasVoor('graan', 'boomgaard'), 'fruit');
  assert.equal(B.gewasVoor('gras', 'weiland'), 'gras');
  assert.ok(B.ALLE_GEWAS_IDS.includes('fruit') && !B.GEWAS_IDS.includes('fruit'), 'de markt en contracten houden de vijf');
  assert.equal(B.ALLE_GEWAS_IDS.indexOf('fruit'), 5, 'een bestaande gewasindex verandert niet');
  const farm = B.nieuweBoerderij();
  PC.registreerExtraPerceel(PF.parcelDefOf(pid(7), 'b', 2));
  PF.adoptParcel(farm, pid(7));
  assert.equal(B.planVoor(farm, pid(7)), 'fruit');
  PF.workField(farm, pid(7), 'ploegen'); PF.workField(farm, pid(7), 'zaaien');
  farm.uren = g.groeiUren;
  assert.equal(PF.fieldPhase(farm, pid(7)), 'rijp');
  const kg = PF.workField(farm, pid(7), 'oogsten').load.kg;
  assert.ok(kg > 500 && kg < 6000, `${kg} kg`);
  assert.ok(B.leverVracht(farm, { gewas: 'fruit', kg: 100, kwaliteit: 1, veld: pid(7) }, 1).bedrag > 0);
});

console.log(`parcelfarm_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
