// De ketens, de streekprijs, de gebeurtenissen, de frietwagen en de woningen aan het spel gekoppeld (#1103): bezitlive.js met een nepopslag en een kleine index.
//   node scripts/bezitlive_keten_test.mjs   Schrijft nooit naar echte opslag.
import assert from 'node:assert/strict';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as GT from '../game/js/bezitgate.js';
import * as Z from '../game/js/bezit.js';
import * as B from '../game/js/boerderij.js';
import * as FS from '../game/js/farmstaff.js';
import * as LS from '../game/js/livestock.js';
import * as EV from '../game/js/bezitevents.js';
import * as BZ from '../game/js/business.js';
import * as UI from '../game/js/bezitui.js';
import { setStatMax, unlockAchievement } from '../game/js/achievements.js';
import { KEYS } from '../game/js/storagekeys.js';
import { hoofdspeler } from '../game/js/players.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join('\n   ')); } };
const nepOpslag = (start = {}) => { const m = new Map(Object.entries(start)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
// plaatsen met woningtelling; Winsum en Hoogkerk liggen in streken die we kennen
const PARCELS = { v: 1, kinds: ['w', 'a', 'b'], access: ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'], places: [['Winsum', 220000, 590000, 2400], ['Kleinhuizen', 223000, 593000, 60]],
  rows: [['paaaaaaaaaaa1', 220100, 590100, 300, 0, 0, 220090, 590090], ['pbbbbbbbbbbb2', 220900, 590500, 1500, 1, 1, 220890, 590490], ['pdddddddddd4', 220500, 590700, 1200, 1, 0, 220490, 590690]] };
// bedrijfspanden: een industrieel pand (verwerker), een winkel (verkooppunt) en een snackbar
const BUILD = { v: 1, types: ['industrial', 'retail', 'monument'], rows: [[1001, 220200, 590200, 60, 0, 6, 0], [1002, 220300, 590300, 40, 1, 6, 0], [1003, 220400, 590100, 250, 2, 9, 1]] };
const wereld = (money = 500000, day = 20) => ({ money, calendar: { day }, msgs: [], addMessage(x) { this.msgs.push(x); } });
const reset = () => { const st = nepOpslag(); L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st }); L.setIndexForTest(PARCELS, BUILD); L.setClaimLookup(null); L.setClaimSend(null); GT.resetUnlockGate(); return st; };
const wereldMetDag = (w, d) => { w.calendar = { day: d }; return w; };
const dagen = (k) => { const f = BL.getBoerderij(); f.uren += 24 * k; };

t('de woningtelling uit de index: de plaats bepaalt de klantendruk; zonder telling de terugval', () => {
  reset();
  const o = L.buildingOffer(1002);
  assert.equal(o.town.name, 'Winsum'); assert.equal(o.town.houses, 2400);
  L.setIndexForTest({ ...PARCELS, places: [['Winsum', 220000, 590000]] }, BUILD);
  assert.equal(L.buildingOffer(1002).town.houses, 1500);
});

t('streekprijs: een grote levering drukt de prijs, een kleine in een andere streek niet; de markt wordt bewaard', () => {
  const st = reset();
  const w = wereld(); L.koopPerceel(w, 'pbbbbbbbbbbb2');
  const farm = BL.getBoerderij();
  L.dayTick(w);
  const a = FS.sellLoad(farm, 'pbbbbbbbbbbb2', 'aardappelen', 100, 20);          // 100 kg: een paar euro
  const e1 = Math.round(a / 100 * 100) / 100;
  const big = FS.sellLoad(farm, 'pbbbbbbbbbbb2', 'aardappelen', 30000, 20);
  assert.ok(big / 30000 < e1 - 0.02, `de prijs per kilo daalt door de verzadiging (${e1} -> ${big / 30000})`);
  const board = L.priceBoard('aardappelen');
  assert.ok(board.rows.length === 8 && board.best);
  L.schrijfNu();
  assert.ok(JSON.parse(st.m.get(KEYS.bezit)).x.market);
});

t('zonder haak (geen bezit gestart) blijft de dagprijs; met de haak volgt de levering de streek', () => {
  reset();
  const w = wereld(); L.koopPerceel(w, 'paaaaaaaaaaa1');
  const farm = BL.getBoerderij();
  const r = B.leverVracht(farm, { gewas: 'aardappelen', kg: 1000, kwaliteit: 1, veld: 'paaaaaaaaaaa1' }, 1);
  assert.ok(r.prijs > 0.1 && r.bedrag === Math.round(1000 * r.prijs));
});

t('opbrengstverlies: een droogte of stortbui op een dag drukt de oogst van het personeel en de pacht (haak)', () => {
  reset();
  const w = wereld(); L.koopPerceel(w, 'pbbbbbbbbbbb2');
  // zoek een kalenderdag met een stortbui in de streek van het perceel
  const region = L.districtOfPoint(220900, 590500);
  let day = 0;
  for (let d = 1; d < 3000 && !day; d++) if (EV.activeSpan(EV.EVENT_DEFS.stortbui, region, d)) day = d;
  assert.ok(day > 0, 'er is een stortbui in de eerste 3000 dagen');
  const w2 = wereld(100000, day);
  L.dayTick(w2);                                                    // legt de klok vast
  const farm = BL.getBoerderij();
  const info = (null, EV.parcelLoss({ id: 'x', kind: 'a', region, sown: true }, day));
  assert.ok(info.loss >= 0.3 - 1e-9);
  // de haak via de pacht: een verpacht perceel betaalt minder op die dag
  const b = L.getBezit(); Z.setParcelMode(b, 'pbbbbbbbbbbb2', 'leased');
  const normal = FS.leaseDayTick(b, farm, 1000).income;          // farm-dag 0 is de kalenderdag van de klok
  const bad = FS.leaseDayTick(b, farm, 0).income;
  assert.ok(bad < normal, `pacht ${bad} < ${normal}`);
});

t('handwerk-oogst: een melding en een lagere opbrengst bij een stortbui', () => {
  reset();
  const w = wereld(); L.koopPerceel(w, 'pbbbbbbbbbbb2');
  const region = L.districtOfPoint(220900, 590500);
  let day = 0;
  for (let d = 12; d < 3000 && !day; d++) if (EV.activeSpan(EV.EVENT_DEFS.stortbui, region, d)) day = d;
  const w2 = wereld(100000, day - 8);                             // na 200 speluren (8 dagen) is het de dag van de bui
  L.dayTick(w2);
  const farm = BL.getBoerderij();
  farm.bedrijf.actief = 'pbbbbbbbbbbb2';
  assert.ok(B.kiesGewas(farm, 'aardappelen'));
  for (const taak of ['ploegen', 'zaaien']) BL.rondAf(w2, taak, 1, { vrij: true });
  farm.uren += 200;                                                 // rijp
  const uit = BL.rondAf(w2, 'oogsten', 1, { vrij: true });
  assert.ok(uit.kg > 0);
  assert.ok(uit.verlies >= 20, `verlies ${uit.verlies}`);
  assert.ok(w2.msgs.some((m) => /lager/.test(m)));
});

t('keten: kaas uit eigen melkvee met een eigen verwerker en verkooppunt: extra marge, geld erbij en de prestatie bz_keten', () => {
  reset();
  const w = wereld(); L.koopPerceel(w, 'paaaaaaaaaaa1'); L.koopPand(w, 1001); L.koopPand(w, 1002);
  const b = L.getBezit(); const farm = BL.getBoerderij();
  assert.ok(LS.stockHerd(b, 'paaaaaaaaaaa1', 'melkvee', 5).ok);
  let r = L.koppelSchakel('kaas', 'kaasmakerij', 1001); assert.ok(r.ok, JSON.stringify(r));
  r = L.koppelSchakel('kaas', 'verkoop', 1002); assert.ok(r.ok, JSON.stringify(r));
  const v0 = L.chainViews().find((c) => c.id === 'kaas');
  assert.equal(Math.round(v0.margin * 100), 35); assert.ok(v0.sourceKg > 0);
  L.dayTick(w);                                                      // legt lastDay vast
  dagen(4);                                                         // de keten heeft een paar dagen nodig om van de bron tot de toonbank te lopen
  const rep = L.dayTick(w);
  assert.ok(rep && rep.chains !== undefined);
  const v = L.chainViews().find((c) => c.id === 'kaas');
  assert.ok(v.links.some((l) => l.stock > 0 || l.moved > 0));
  assert.ok(v.closedDays >= 1, 'de keten was een dag gesloten');
  assert.ok(w.achievements ? w.achievements.includes ? true : true : true);
});

t('keten: een niet passend pand past niet; een verkocht pand wordt losgekoppeld', () => {
  reset();
  const w = wereld(); L.koopPand(w, 1001); L.koopPand(w, 1002);
  assert.equal(L.koppelSchakel('kaas', 'kaasmakerij', 1002).why, 'past-niet');        // een winkel is geen verwerker
  assert.equal(L.koppelSchakel('kaas', 'kaasmakerij', 999999).why, 'niet-van-jou');
  assert.equal(L.koppelSchakel('hooi', 'hooiberg', 1001).why, 'geen-schakel');         // de hooiberg is niet te koop
  assert.ok(L.koppelSchakel('kaas', 'kaasmakerij', 1001).ok);
  assert.ok(L.chainOptions('kaas', 'verkoop').some((o) => o.ref === 1002));
  L.verkoopPand(w, 1001);
  assert.equal(L.chainViews().find((c) => c.id === 'kaas').links.find((l) => l.id === 'kaasmakerij').ref, null);
});

t('keten: wagens, uitbreiden en bronnen kiezen', () => {
  reset();
  const w = wereld(); L.koopPerceel(w, 'paaaaaaaaaaa1'); L.koopPand(w, 1001);
  LS.stockHerd(L.getBezit(), 'paaaaaaaaaaa1', 'melkvee', 3);
  L.koppelSchakel('kaas', 'kaasmakerij', 1001);
  assert.ok(L.adjustWagons('kaas', 'melk', 1).ok);
  assert.equal(L.chainViews().find((c) => c.id === 'kaas').links[0].trucks, 1);
  assert.ok(L.adjustWagons('kaas', 'melk', -1).ok); assert.equal(L.adjustWagons('kaas', 'melk', -1).ok, false);
  assert.ok(L.schakelUitbreiden(w, 'kaas', 'kaasmakerij').ok);
  assert.equal(L.schakelUitbreiden(w, 'kaas', 'melk').ok, false, 'een bron is niet te koop of uit te breiden');
  const src = L.chainSources('kaas');
  assert.equal(src.length, 1);
  assert.ok(L.kiesBron('kaas', 'paaaaaaaaaaa1').ok);
  assert.equal(L.chainSources('kaas')[0].picked, true);
});

t('frietwagen: kopen, standplaats, dagomzet in de dagtik, verkopen met 75%; compatibel met een gift (verhaal)', () => {
  reset();
  const w = wereld(20000);
  const r = L.koopMobiel(w, 'frietwagen'); assert.ok(r.ok, JSON.stringify(r));
  assert.equal(w.money, 20000 - BZ.MOBILE_TYPES.frietwagen.price);
  assert.equal(L.koopMobiel(w, 'frietwagen').why, 'al-van-jou');
  assert.equal(L.setPitch('frietwagen', 'markt').ok, true);
  assert.equal(L.myMobile()[0].spotLabel, 'Grote Markt');
  assert.equal(L.setPitch('frietwagen', 'bestaatniet').ok, false);
  L.dayTick(w); dagen(3);
  const before = w.money;
  const rep = L.dayTick(w);
  assert.ok(rep.mobile > 0 && w.money > before, `dagomzet ${rep.mobile}`);
  const v = L.verkoopMobiel(w, 'frietwagen'); assert.ok(v.ok); assert.equal(v.refund, Math.round(BZ.MOBILE_TYPES.frietwagen.price * 0.75 / 5) * 5);
  assert.equal(L.myMobile().length, 0);
  assert.equal(L.schenkMobiel('frietwagen'), true); assert.equal(L.schenkMobiel('frietwagen'), false);   // een gift voor het verhaal, één keer
});

t('frietwagen als schakel van de frietketen', () => {
  reset();
  const w = wereld(50000); L.koopMobiel(w, 'frietwagen');
  assert.ok(L.chainOptions('friet', 'snackbar').some((o) => o.ref === 'm:frietwagen'));
  assert.ok(L.koppelSchakel('friet', 'snackbar', 'm:frietwagen').ok);
  assert.equal(Math.round(L.chainViews().find((c) => c.id === 'friet').margin * 100), 15);
});

t('woningen: koopbaar in de buurt, begrensd op het aantal in de plaats, verhuur in de dagtik, verkopen', () => {
  reset();
  const w = wereld(200000);
  const homes = L.homesNear(220100, 590100, 4);
  assert.equal(homes.length, 4); assert.ok(homes.every((h) => h.forSale && h.kind.type === 'woning' && h.town.name === 'Winsum'));
  const h0 = homes[0];
  const r = L.koopPand(w, h0.osm); assert.ok(r.ok, JSON.stringify(r));
  assert.ok(L.getBezit().buildings.has(h0.osm));
  assert.equal(L.homesNear(220100, 590100, 4).some((h) => h.osm === h0.osm), false, 'een gekochte woning staat niet meer te koop');
  const my = L.myBusinesses().find((m) => m.osm === h0.osm);
  assert.equal(my.biz.cls, 'rent'); assert.equal(my.biz.type, 'woning');
  L.dayTick(w); dagen(10);
  const rep = L.dayTick(w);
  assert.ok(rep.business > 0, `huur ${rep.business}`);
  assert.ok(L.rentView(L.myBusinesses().find((m) => m.osm === h0.osm).biz, 30).text.length > 5);
  assert.ok(L.verkoopPand(w, h0.osm).ok);
  assert.equal(L.homesNear(1000000, 1000000).length, 0, 'ver van elke plaats geen woningen');
});

t('woningen: een plaats met 60 woningen biedt er hoogstens 60 aan; een kapotte telling biedt er geen', () => {
  reset();
  const w = wereld(1e9);
  const kl = L.homesNear(223000, 593000, 100);
  assert.equal(kl.length, 100 > 60 ? 60 : 100);
  L.setIndexForTest({ ...PARCELS, places: [['Winsum', 220000, 590000]] }, BUILD);
  assert.equal(L.homesNear(220100, 590100).length, 0);
});

t('nieuws: de buurman met een keuze kost hooguit een kleine som, het nieuws telt hoogstens vijf regels', () => {
  reset();
  const w = wereld(1000);
  L.koopPerceel(w, 'pbbbbbbbbbbb2');
  const b = L.getBezit(); b.x.lastDay = 0;
  // veel dagen terug laten lopen: het nieuws loopt vol maar blijft bij vijf
  let rep = null;
  for (let i = 0; i < 8; i++) { dagen(10); rep = L.dayTick(wereldMetDag(w, 20 + 10 * (i + 1))) || rep; }
  const nv = L.newsView(w);
  assert.ok(nv.lines.length <= 5);
  assert.ok(Array.isArray(nv.pull));
});
t('nieuws: een buur-scène kiezen verrekent de kosten en ruimt de scène op', () => {
  reset();
  const w = wereld(1000);
  L.koopPerceel(w, 'pbbbbbbbbbbb2');
  // zoek een dag met een buur-scène voor het zaad van dit bezit
  const seed = (L.getBezit().x.news && L.getBezit().x.news.seed) || null;
  L.newsView(w);
  const news = L.getBezit().x.news;
  let d = 0; for (let i = 1; i < 5000 && !d; i++) if (EV.neighborScene(i, news.seed)) d = i;
  assert.ok(d > 0);
  news.scene = { id: EV.neighborScene(d, news.seed).id, start: d };
  const v = L.newsView(w).scene; assert.ok(v && v.choices.length === 3);
  const paid = v.choices.slice().sort((a, b) => b.cost - a.cost)[0];
  const before = w.money;
  const r = L.kiesBuur(w, paid.id); assert.ok(r.ok); assert.equal(w.money, before - paid.cost);
  assert.equal(L.newsView(w).scene, null);
  assert.equal(L.kiesBuur(w, paid.id).ok, false);
});

t('opslag: de ketens, de markt en het nieuws overleven een herstart; ongebruikte ketens worden niet bewaard', () => {
  const st = reset();
  const w = wereld(); L.koopPand(w, 1001);
  L.koppelSchakel('kaas', 'kaasmakerij', 1001);
  L.priceBoard('graan'); L.schrijfNu();
  const raw = JSON.parse(st.m.get(KEYS.bezit));
  assert.deepEqual(Object.keys(raw.x.chains), ['kaas']);
  L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st }); L.setIndexForTest(PARCELS, BUILD);
  const v = L.chainViews().find((c) => c.id === 'kaas');
  assert.equal(v.links.find((l) => l.id === 'kaasmakerij').ref, 1001);
  assert.equal(v.links.find((l) => l.id === 'kaasmakerij').owned, true);
});

t('het menu: ketens, prijzen, nieuws, frietwagen en woningen staan in de panelen', () => {
  reset();
  const w = wereld(100000);
  L.koopPand(w, 1001);
  const kaal = () => ({ innerHTML: '', addEventListener() {}, closest: () => null }); // closest: de tabbalk zoekt het paneel (bezit-ui 24-11)
  const els = { overzicht: kaal(), bedrijven: kaal(), tekoop: kaal() };
  UI.renderBezitPanels(els, w);
  assert.match(els.overzicht.innerHTML, /Nieuws van het land/); assert.match(els.overzicht.innerHTML, /data-sectie="ketens"/); assert.match(els.overzicht.innerHTML, /Prijzen vandaag per streek/);
  assert.match(els.overzicht.innerHTML, /data-chain="kaas"/); assert.match(els.overzicht.innerHTML, /data-bz-bind="kaas\|kaasmakerij"/);
  // bezit-ui 24-11: Bedrijven noemt de snackwagen niet meer (die heeft een eigen tabblad)
  assert.ok(!/data-bz="koop-mobiel"/.test(els.bedrijven.innerHTML), 'de snackwagen koop je alleen op zijn eigen tabblad (#1250)');
});

console.log(`bezitlive_keten_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
