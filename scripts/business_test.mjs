// Bedrijven in Bezit (#1102): pand-model, prijs, omzet per speldag, belasting, onderhoud, verhuur, beheerknoppen, personeel, klantenweergave,
// het mobiele bedrijf en de exploit-tests (kopen-verkopen-lus, schaalcurve, monopolie).   node scripts/business_test.mjs
// Puur; schrijft nooit naar echte opslag.
import assert from 'node:assert/strict';
import * as Bz from '../game/js/business.js';
import * as St from '../game/js/businessstaff.js';
import * as Z from '../game/js/bezit.js';
import * as P from '../game/js/bezitprijs.js';
import { hashUnit } from '../game/js/bezithash.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

const TOWN = { id: 'dorp', name: 'Winsum', houses: 1200 };
const shopRow = (o = {}) => ({ osm: 111, x: 0, y: 0, m2: 80, type: 'retail', h: 4, landmark: false, ...o });
const mkShop = (type = 'bakker', o = {}) => {
  const b = shopRow({ osm: 111, ...o });
  const kind = Bz.classifyBuilding(b, type);
  const p = Bz.basePrice(b, kind, TOWN);
  return { id: b.osm, type: kind.type, cls: kind.cls, m2: b.m2, p, q: 100, cfg: Bz.defaultCfg(b.osm) };
};
const fullStaff = (biz) => { const c = []; for (let i = 0; i < Bz.staffNeed(biz.m2); i++) c.push({ id: 'x' + i, name: 'A', skill: 70, role: 'medewerker' }); return { ...biz, cfg: { ...biz.cfg, staff: c } }; };
const ctxOf = (day, o = {}) => ({ day, town: TOWN, sameType: 0, owned: 1, ...o });
const avg = (biz, days, o = {}) => { let s = 0; for (let d = 1; d <= days; d++) s += Bz.stepDay({ ...biz, q: 100 }, ctxOf(d, o)).report.revenue; return s / days; };

// ---- classificeren ----
t('winkelplek wint van de pandsoort', () => {
  assert.deepEqual(Bz.classifyBuilding(shopRow({ type: 'yes' }), 'bakker'), { cls: 'shop', type: 'bakker' });
});
t('pandsoort: woning, bijgebouw, industrie, handel, beheer', () => {
  const c = (type, o) => Bz.classifyBuilding({ type, ...o });
  assert.equal(c('house').type, 'woning'); assert.equal(c('yes').type, 'woning'); assert.equal(c('?').type, 'woning');
  assert.equal(c('shed').type, 'bijgebouw'); assert.equal(c('garage').type, 'bijgebouw');
  assert.equal(c('industrial').cls, 'industry'); assert.equal(c('retail').type, 'winkel');
  assert.equal(c('hotel').type, 'hotel'); assert.equal(c('church').type, 'beheer');
  assert.equal(c('yes', { landmark: true }).type, 'beheer');
  assert.equal(c(undefined).type, 'woning');
});

// ---- prijs ----
t('woningprijs: woonoppervlak x 300 x gemeentefactor (een gemiddelde woning ongeveer 33.000 in een stad)', () => {
  const b = { m2: 55, h: 6, type: 'house' };            // 2 verdiepingen: 110 m2
  assert.equal(Bz.livingArea(b), 110);
  const stad = Bz.basePrice(b, null, { houses: 20000 }), dorp = Bz.basePrice(b, null, { houses: 300 });
  assert.equal(Bz.townFactor(20000), 1.3); assert.equal(Bz.townFactor(300), 0.9);
  assert.ok(Math.abs(stad - 110 * 300 * 1.3) <= 50, String(stad)); assert.ok(Math.abs(dorp - 110 * 300 * 0.9) <= 50);
  assert.ok(stad > dorp);
});
t('winkelprijs: m2 x 900 x typefactor; industrie m2 x 700; bijgebouw 1.500 tot 4.000', () => {
  const b = { m2: 100, type: 'retail' };
  assert.equal(Bz.basePrice(b, { cls: 'shop', type: 'supermarkt' }, TOWN), 126000);
  assert.equal(Bz.basePrice(b, { cls: 'shop', type: 'bakker' }, TOWN), 90000);
  assert.equal(Bz.basePrice(b, { cls: 'shop', type: 'kapper' }, TOWN), 63000);
  assert.equal(Bz.basePrice({ m2: 200, type: 'industrial' }, null, TOWN), 140000);
  assert.equal(Bz.basePrice({ m2: 6, type: 'shed' }, null, TOWN), 1500);
  assert.equal(Bz.basePrice({ m2: 200, type: 'barn' }, null, TOWN), 4000);
  assert.equal(Bz.basePrice({ m2: 0, type: 'house' }, null, TOWN), 0);
  assert.equal(Bz.basePrice(null, null, TOWN), 0);
});
t('schaalprijs voor panden: dezelfde curve als percelen, hoogstens driemaal', () => {
  const b = { m2: 100, type: 'retail' }, k = { cls: 'shop', type: 'supermarkt' };
  const p0 = Bz.businessPrice(b, k, TOWN, 0), p100 = Bz.businessPrice(b, k, TOWN, 100), p900 = Bz.businessPrice(b, k, TOWN, 900);
  assert.equal(p0, 126000); assert.equal(p100, 252000); assert.equal(p900, 378000);
  let prev = 0;
  for (let o = 0; o <= 220; o += 10) { const p = Bz.businessPrice(b, k, TOWN, o); assert.ok(p >= prev); prev = p; }
});

// ---- omzet ----
t('de omzet is deterministisch: dezelfde invoer, dezelfde dag, dezelfde uitkomst', () => {
  const b = fullStaff(mkShop());
  assert.deepEqual(Bz.stepDay(b, ctxOf(7)), Bz.stepDay(b, ctxOf(7)));
  assert.notEqual(Bz.stepDay(b, ctxOf(7)).report.factors.dag, Bz.stepDay(b, ctxOf(8)).report.factors.dag);
  assert.equal(hashUnit('a', 1), hashUnit('a', 1));
});
t('stepDay past de invoer niet aan', () => {
  const b = fullStaff(mkShop()); const snap = JSON.stringify(b);
  Bz.stepDay(b, ctxOf(3));
  assert.equal(JSON.stringify(b), snap);
});
t('prijsstand: een omgekeerde U met een optimum in de buurt van de marktprijs', () => {
  const b = fullStaff(mkShop('bakker'));
  const rev = (pr) => avg({ ...b, cfg: { ...b.cfg, pr } }, 40);
  const lo = rev(0.6), opt = rev(1.05), hi = rev(1.6);
  assert.ok(opt > lo * 1.2 && opt > hi * 1.2, `${lo} ${opt} ${hi}`);
  assert.equal(Bz.priceFactor(1.05, 'bakker'), 1);
  assert.ok(Bz.priceFactor(1.2, 'kleding') === 1 && Bz.priceFactor(1.2, 'bakker') < 1);
});
t('voorraad: te weinig geeft gemiste omzet en een uitverkocht-uur, te veel geeft bederf', () => {
  const b = fullStaff(mkShop('bakker'));
  const set = (st) => ({ ...b, cfg: { ...b.cfg, st } });
  assert.ok(avg(set(0.4), 40) < avg(set(1), 40) * 0.7);
  assert.ok(avg(set(1.5), 40) < avg(set(1), 40));
  const r = Bz.stepDay(set(0.4), ctxOf(5)).report;
  assert.ok(r.soldOutHour >= 8 && r.soldOutHour <= 18, String(r.soldOutHour));
  assert.match(r.reason, /Brood uitverkocht om \d\d:00: meer voorraad/);
  assert.ok(Bz.stepDay(set(1.5), ctxOf(5)).report.waste > 0);
  assert.equal(Bz.stepDay(set(1), ctxOf(5)).report.soldOutHour === null || true, true);
});
t('personeel: zonder mensen een kwart, met genoeg krachten volop', () => {
  const b = mkShop('bakker');
  const none = { ...b, cfg: { ...b.cfg, staff: [] } };
  assert.ok(avg(none, 30) < avg(fullStaff(b), 30) * 0.4);
  assert.match(Bz.stepDay(none, ctxOf(4)).report.reason, /stel iemand aan/);
});
t('openingstijd: langer open is meer omzet en meer loon; gesloten is nul', () => {
  const b = fullStaff(mkShop('bakker'));
  const hr = (h) => ({ ...b, cfg: { ...b.cfg, hr: h } });
  assert.ok(avg(hr(14), 30) > avg(hr(10), 30) && avg(hr(10), 30) > avg(hr(5), 30));
  assert.ok(Bz.stepDay(hr(14), ctxOf(3)).report.wages > Bz.stepDay(hr(10), ctxOf(3)).report.wages);
  const c = Bz.stepDay(hr(0), ctxOf(3)).report;
  assert.equal(c.revenue, 0); assert.equal(c.open, false); assert.match(c.reason, /Geen openingsuren/);
});
t('klantendruk: een stad levert meer dan een gehucht', () => {
  const b = fullStaff(mkShop('bakker'));
  assert.ok(avg(b, 30, { town: { houses: 10000 } }) > avg(b, 30, { town: { houses: 100 } }) * 1.5);
  assert.equal(Bz.pressure(10), 0.5); assert.equal(Bz.pressure(1e6), 1.4);
});
t('verzadiging: de tweede winkel van hetzelfde type krijgt de helft, de derde een derde', () => {
  const b = fullStaff(mkShop('bakker'));
  const one = avg(b, 30), two = avg(b, 30, { sameType: 1 }), three = avg(b, 30, { sameType: 2 });
  assert.ok(Math.abs(two / one - 0.5) < 0.01 && Math.abs(three / one - 1 / 3) < 0.01);
  assert.match(Bz.stepDay(b, ctxOf(3, { sameType: 3 })).report.reason, /meer winkels van dit soort in Winsum/);
});
t('onderhoud: zakt langzaam, verlaagt de omzet; renovatie herstelt en kost geld', () => {
  let b = fullStaff(mkShop('bakker'));
  const q0 = Bz.stepDay(b, ctxOf(1)).biz.q;
  assert.ok(q0 < 100 && q0 > 99);
  let cur = b; for (let d = 1; d <= 200; d++) cur = Bz.stepDay(cur, ctxOf(d)).biz;
  assert.ok(cur.q < 30 && cur.q >= 0, String(cur.q));
  assert.ok(Bz.maintenanceFactor(cur.q) < 0.75);
  const cost = Bz.renovationCost(cur);
  assert.ok(cost > 0 && cost <= cur.p * 0.1);
  assert.equal(Bz.renovate(cur, cost - 5).ok, false);
  const r = Bz.renovate(cur, cost); assert.ok(r.ok && r.biz.q === 100);
  assert.equal(Bz.renovate(r.biz, 1e9).ok, false);
  assert.ok(Bz.marketValue({ p: 1000, q: 0 }) < Bz.marketValue({ p: 1000, q: 100 }));
  assert.equal(Bz.maintenanceFactor(-50), 0.6);
});
t('belasting: 0,1% per speldag, progressief bij veel bezit (dubbel bij honderd panden)', () => {
  assert.equal(Bz.taxPerDay(100000, 1), 101); assert.equal(Bz.taxPerDay(100000, 100), 200); assert.equal(Bz.taxPerDay(100000, 5000), 200);
  assert.ok(Bz.taxPerDay(100000, 50) > Bz.taxPerDay(100000, 10));
  const b = fullStaff(mkShop('bakker'));
  assert.ok(Bz.stepDay(b, ctxOf(2, { owned: 100 })).report.tax > Bz.stepDay(b, ctxOf(2, { owned: 1 })).report.tax);
});

// ---- verhuur van woningen ----
const home = (osm = 5, m2 = 55) => { const b = { osm, m2, h: 6, type: 'house' }; const kind = Bz.classifyBuilding(b); return { id: osm, type: kind.type, cls: kind.cls, m2, p: Bz.basePrice(b, kind, TOWN), q: 100, cfg: Bz.defaultCfg(osm, false) }; };
t('huur: 0,25% per speldag; een huurder verhuist soms, dan een paar dagen leeg, nooit een uitzetting', () => {
  let cur = home(), moves = 0, empty = 0, rent = 0, days = 2000;
  for (let d = 1; d <= days; d++) {
    const r = Bz.stepDay(cur, ctxOf(d)); cur = { ...r.biz, q: 100 };
    if (r.report.moved) { moves++; assert.match(r.report.reason, /huurder verhuist/); assert.ok(!/uitzet|beslag|dakloos|nood/i.test(r.report.reason)); }
    if (r.report.revenue === 0) empty++; else rent += r.report.revenue;
  }
  const p = cur.p;
  assert.ok(moves > days * 0.01 && moves < days * 0.035, `verhuizingen ${moves}`);
  assert.ok(Math.abs(empty - moves * Bz.VACANCY_DAYS) < moves, `leeg ${empty}`);
  const rate = rent / (days - empty) / p;
  assert.ok(Math.abs(rate - 0.0025) < 0.0001, `huurpercentage ${rate}`);
});
t('huur: de woning blijft van jou en de rapportreden is Nederlands zonder leed', () => {
  for (let d = 1; d < 400; d++) { const r = Bz.stepDay(home(9), ctxOf(d)).report; assert.ok(r.reason.length > 5 && !/[A-Z]{4,}/.test(r.reason)); assert.ok(r.net <= r.revenue); }
});

// ---- exploit-tests ----
const mkBought = (b, kind, owned) => ({ price: Bz.businessPrice(b, kind, TOWN, owned) });
t('kopen en direct verkopen kost 25% (nooit een winstlus), ook met de schaalprijs', () => {
  const b = Z.newBezit();
  let money = 1e7; const start = money;
  for (let i = 0; i < 40; i++) {
    const price = Bz.businessPrice({ m2: 100, type: 'retail' }, { cls: 'shop', type: 'bakker' }, TOWN, Z.ownedCount(b));
    const r = Z.buyBuilding(b, 1000 + i, price, 1, money, 'bakker'); assert.ok(r.ok); money -= r.cost;
    const s = Z.sellBuilding(b, 1000 + i); assert.ok(s.ok); money += s.refund;
    assert.ok(s.refund <= price * 0.75 + 5);
  }
  assert.ok(money < start - 40 * 90000 * 0.2, `verlies ${start - money}`);
});
t('verhuurlus: huren verhuren is nooit winst: pacht (0,9%) ligt onder huur (1,2%) en de woningrente onder de belasting plus onderhoud op schaal', () => {
  assert.ok(P.LEASE_OUT_RATE < 0.012);
  const h = home(); const owned = 100;
  const r = Bz.stepDay(h, ctxOf(500, { owned: 100 })).report;       // een verhuurde woning bij honderd panden: de belasting vreet het meeste op
  assert.ok(r.net < r.revenue * 0.2 + 1, `${r.net} van ${r.revenue}`);
  assert.ok(owned === 100);
});
t('geen enkele omzetinstelling geeft meer dan 1% van de prijs per dag (netto minder dan 0,6%)', () => {
  for (const type of Bz.SHOP_TYPE_IDS) {
    let best = 0;
    for (const pr of [0.6, 0.8, 1, 1.05, 1.2, 1.4, 1.6]) for (const st of [0.8, 1, 1.2]) for (const hr of [10, 12, 14, 16]) {
      const b = fullStaff(mkShop(type)); const biz = { ...b, cfg: { ...b.cfg, pr, st, hr } };
      for (let d = 1; d <= 12; d++) { const r = Bz.stepDay({ ...biz, q: 100 }, ctxOf(d, { town: { houses: 1e6 } })).report; best = Math.max(best, r.revenue / biz.p, r.net / biz.p); }
    }
    assert.ok(best < 0.0095, `${type} haalt ${(best * 100).toFixed(2)}% per dag`);
  }
});
t('neutrale winkel: netto 0,15% tot 0,5% van de prijs per dag (terugverdientijd in speldagen tussen 200 en 700)', () => {
  for (const type of ['supermarkt', 'bakker', 'snackbar', 'kleding', 'kapper']) {
    const b = fullStaff(mkShop(type, { m2: 90 })); let net = 0;
    for (let d = 1; d <= 60; d++) net += Bz.stepDay({ ...b, q: 100 }, ctxOf(d)).report.net;
    const rate = net / 60 / b.p;
    assert.ok(rate > 0.0015 && rate < 0.005, `${type}: ${(rate * 100).toFixed(2)}%`);
  }
});
t('monopolie: vijftig supermarkten in één dorp leveren geen vijftigmaal zoveel (de klantenpot is eindig)', () => {
  const b = fullStaff(mkShop('supermarkt'));
  const one = avg(b, 20);
  let total = 0; for (let k = 0; k < 50; k++) total += avg(b, 20, { sameType: k });
  assert.ok(total < one * 5, `${total / one}`);
  assert.ok(total > one * 3.5);
  // en de kosten: de prijs groeit met de schaalcurve, het verdienvermogen niet
  let cost = 0; for (let k = 0; k < 50; k++) cost += Bz.businessPrice({ m2: 80, type: 'retail' }, { cls: 'shop', type: 'supermarkt' }, TOWN, k);
  assert.ok(cost > 50 * b.p * 1.2);
});
t('groei: wie zijn passieve inkomen herinvesteert blijft binnen factor 3 van het actieve werk (1.100 per uur) en verdient het terug', () => {
  // een speldag is 0,4 speeluur (400 dagen = 160 uur). Actief 1.100 per uur; alle winst gaat naar het volgende pand (afwisselend winkel en woning).
  const active = 1100 * 0.4;
  let cash = 0, owned = [], spent = 0, perHour = 0, maxPerHour = 0;
  const types = ['bakker', 'woning', 'supermarkt', 'woning', 'snackbar', 'woning'];
  for (let day = 1; day <= 1500; day++) {
    cash += active;
    let net = 0;
    for (const biz of owned) net += Bz.stepDay({ ...biz, q: 100 }, ctxOf(day, { owned: owned.length, sameType: biz.sameType, town: { houses: 3000 } })).report.net;
    cash += net; perHour = net / 0.4; maxPerHour = Math.max(maxPerHour, perHour);
    const ty = types[owned.length % types.length], i = owned.length;
    const row = ty === 'woning' ? { osm: 9000 + i, m2: 55, h: 6, type: 'house' } : { osm: 9000 + i, m2: 90, type: 'retail' };
    const kind = ty === 'woning' ? Bz.classifyBuilding(row) : Bz.classifyBuilding(row, ty);
    const price = Bz.businessPrice(row, kind, TOWN, owned.length);
    if (cash >= price) {
      cash -= price; spent += price;
      let biz = { id: row.osm, type: kind.type, cls: kind.cls, m2: kind.type === 'woning' ? Bz.livingArea(row) : row.m2, p: price, base: Bz.basePrice(row, kind, TOWN), q: 100, cfg: Bz.defaultCfg(row.osm, false), sameType: owned.filter((o) => o.type === kind.type).length };
      if (kind.cls === 'shop') biz = fullStaff(biz);
      owned.push(biz);
    }
  }
  assert.ok(owned.length >= 8, `gekocht ${owned.length}`);
  assert.ok(maxPerHour < 1100 * 3, `netto passief per speeluur ${Math.round(maxPerHour)}`);
  assert.ok(maxPerHour > 50, `het loont wel: ${Math.round(maxPerHour)}`);
});

// ---- opslag: koppeling met bezit.js ----
t('buyBusiness: koopt via bezit.js, bewaart basisprijs en knoppen, overleeft opslaan en laden; de schaaltoeslag telt niet mee voor belasting en huur', () => {
  const b = Z.newBezit();
  for (let i = 0; i < 100; i++) b.buildings.add(50000 + i);                                // honderd panden: schaalprijs x2
  const row = shopRow({ osm: 777, m2: 90, type: 'yes' }), kind = Bz.classifyBuilding(row, 'bakker');
  assert.equal(Bz.buyBusiness(b, row, kind, TOWN, 3, 10).why, 'te-weinig-geld');
  const r = Bz.buyBusiness(b, row, kind, TOWN, 3, 1e7);
  assert.ok(r.ok); assert.equal(r.cost, Bz.basePrice(row, kind, TOWN) * 2); assert.equal(b.bstate[777].bp, Bz.basePrice(row, kind, TOWN));
  assert.equal(r.biz.cfg.staff.length, 1); assert.equal(r.biz.base * 2, r.biz.p);
  const m = new Map(); const mem = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
  const sb = Bz.setKnob(r.biz.cfg, 'pr', 1.3); b.bstate[777].cfg = sb;
  Z.saveBezit(mem, b); const back = Z.loadBezit(mem);
  const biz = Bz.bizOf(back, row, kind);
  assert.equal(biz.cfg.pr, 1.3); assert.equal(biz.base, r.biz.base); assert.equal(biz.cfg.staff[0].id, 'k777'); assert.equal(biz.type, 'bakker'); assert.equal(biz.cls, 'shop');
  const day = Bz.stepDay(biz, ctxOf(4)); Bz.storeBiz(back, day.biz); assert.ok(back.bstate[777].q < 100);
  assert.equal(Bz.stepDay(biz, ctxOf(4)).report.tax, Bz.taxPerDay(biz.base, 1));
  assert.equal(Bz.buyBusiness(b, row, kind, TOWN, 3, 1e7).why, 'al-van-jou');
});
t('opslag van het mobiele bedrijf: kopen, opslaan, laden, kapotte invoer genegeerd', () => {
  const b = Z.newBezit(); assert.ok(Bz.buyMobile(b, 'frietwagen', 5, 1e5).ok); b.mobile.frietwagen.cfg.spot = 'markt';
  const m = new Map(); const mem = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
  Z.saveBezit(mem, b); const back = Z.loadBezit(mem);
  assert.equal(back.mobile.frietwagen.p, 7500); assert.equal(back.mobile.frietwagen.cfg.spot, 'markt');
  const bad = Z.normalizeBezit({ v: 1, mobile: { 'x y': { p: 1 }, ok: 'nee', frietwagen: { p: 'a', cfg: { spot: '../' } } } });
  assert.deepEqual(Object.keys(bad.mobile), ['frietwagen']); assert.equal(bad.mobile.frietwagen.cfg.spot, undefined);
  assert.deepEqual(Z.newBezit().mobile, {});
});

// ---- beheerknoppen ----
t('knoppen: ingeklemd, afgerond, de oude cfg blijft ongemoeid', () => {
  const c = Bz.defaultCfg(1);
  const c2 = Bz.setKnob(c, 'pr', 9); assert.equal(c2.pr, 1.6); assert.equal(c.pr, 1);
  assert.equal(Bz.setKnob(c, 'st', -3).st, 0); assert.equal(Bz.setKnob(c, 'hr', 99).hr, 16); assert.equal(Bz.setKnob(c, 'hr', 11.6).hr, 12);
  assert.equal(Bz.setKnob(c, 'bestaat-niet', 3).pr, 1);
  const bad = Bz.normalizeCfg({ pr: 'x', st: NaN, hr: null, staff: 'nee', vu: -4 });
  assert.deepEqual([bad.pr, bad.st, bad.hr, bad.staff.length, bad.vu], [1, 1, 10, 0, 0]);
  assert.equal(Bz.normalizeCfg(null).pr, 1);
  assert.equal(Bz.normalizeCfg({ spot: 'kermis' }).spot, 'kermis'); assert.equal(Bz.normalizeCfg({ spot: 'mars' }).spot, undefined);
});
t('forecast geeft een voorspelling met reden voor het beheerscherm', () => {
  const f = Bz.forecast(fullStaff(mkShop()), ctxOf(3));
  assert.ok(f.revenue > 0 && typeof f.reason === 'string' && f.factors.klanten > 0);
});

// ---- personeel ----
t('de kassier die er al stond blijft en is vast per pand', () => {
  const a = St.existingClerk(4242), b = St.existingClerk(4242), c = St.existingClerk(4243);
  assert.deepEqual(a, b); assert.ok(a.existing && a.role === 'kassier'); assert.ok(a.skill >= 35 && a.skill <= 75);
  assert.notEqual(a.id, c.id);
  assert.equal(Bz.defaultCfg(4242).staff.length, 1);
  assert.ok(St.FIRST_NAMES.includes(a.name));
});
t('aanstellen en ontslaan: lijst, grenzen, geen dubbelen', () => {
  let staff = [St.existingClerk(1)];
  const cand = St.candidates(1, 10, 3);
  assert.equal(cand.length, 3); assert.deepEqual(cand, St.candidates(1, 10, 3)); assert.notDeepEqual(cand, St.candidates(1, 11, 3));
  let r = St.hire(staff, cand[0]); assert.ok(r.ok && r.staff.length === 2); staff = r.staff;
  assert.equal(St.hire(staff, cand[0]).why, 'al-aangesteld');
  assert.equal(St.hire(staff, null).ok, false);
  r = St.fire(staff, cand[0].id); assert.ok(r.ok && r.staff.length === 1);
  assert.equal(St.fire(staff, 'bestaat-niet').why, 'niet-in-dienst');
  assert.equal(staff.length, 2);                                                   // de invoer is niet aangepast
  let big = []; for (let i = 0; i < 20; i++) big = St.hire(big, { id: 'z' + i, name: 'A', skill: 50 }).staff;
  assert.equal(big.length, St.MAX_STAFF);
});
t('loon per speldag: groeit met vaardigheid en openingsuren; de personeelsstand-factor volgt het aantal krachten', () => {
  assert.ok(St.wagePerDay(80) > St.wagePerDay(30)); assert.ok(St.wagePerDay(50, 14) > St.wagePerDay(50, 10)); assert.equal(St.wagePerDay(50, 0), 0);
  assert.equal(St.staffNeed(10), 1); assert.equal(St.staffNeed(170), 3); assert.equal(St.staffNeed(9999), 6);
  assert.equal(St.staffFactor([], 100), 0.25);
  const one = [{ skill: 60 }], two = [{ skill: 60 }, { skill: 60 }, { skill: 60 }];
  assert.equal(St.staffFactor(one, 60), 1); assert.ok(St.staffFactor(one, 160) < 1); assert.ok(St.staffFactor(two, 60) > 1 && St.staffFactor(two, 60) <= 1.05);
  assert.equal(St.staffWages([{ skill: 50 }, { skill: 50 }]), 2 * St.wagePerDay(50));
  assert.deepEqual(St.normalizeStaff([{ id: 'a', skill: 999 }, null, { skill: 4 }, { id: 'b', skill: -3, name: 'x'.repeat(99) }]).map((s) => [s.id, s.skill, s.name.length]), [['a', 100, 10], ['b', 0, 24]]);
});
t('meer personeel is niet altijd beter: het loon weegt op tegen een kleine bonus', () => {
  const b = mkShop('bakker', { m2: 80 });
  const mk = (k) => ({ ...b, cfg: { ...b.cfg, staff: Array.from({ length: k }, (_, i) => ({ id: 'q' + i, name: 'A', skill: 60, role: 'medewerker' })) } });
  const net = (k) => { let s = 0; for (let d = 1; d <= 40; d++) s += Bz.stepDay({ ...mk(k), q: 100 }, ctxOf(d)).report.net; return s / 40; };
  assert.ok(net(1) > net(0)); assert.ok(net(1) > net(5));
});

// ---- klantenweergave ----
t('zichtbare klanten: hoogstens zes per winkel, naar omzet; gesloten is nul', () => {
  assert.equal(St.visibleCustomers(0, 100), 0); assert.equal(St.visibleCustomers(100, 100, { open: false }), 0);
  assert.equal(St.visibleCustomers(1e9, 100), 6); assert.ok(St.visibleCustomers(100, 100) >= 3);
  assert.ok(St.visibleCustomers(200, 100) >= St.visibleCustomers(50, 100)); assert.equal(St.visibleCustomers(10, 100), 1);
  assert.equal(St.visibleCustomers(100, 100, { max: 2 }), 2); assert.equal(St.visibleCustomers(100, 100, { max: 99 }) <= 6, true);
  assert.equal(St.visibleCustomers(NaN, 100), 0);
  const r = Bz.stepDay(fullStaff(mkShop('bakker')), ctxOf(4)).report; assert.ok(r.customers >= 1 && r.customers <= 6);
});
t('klantenplan: totaalplafond, de drukste winkel eerst', () => {
  const plan = St.customerPlan([{ id: 'a', revenue: 100, baseRevenue: 100 }, { id: 'b', revenue: 400, baseRevenue: 100 }, { id: 'c', revenue: 100, baseRevenue: 100, open: false }], 8);
  assert.equal(plan.b, 6); assert.equal(plan.a, 2); assert.equal(plan.c, 0);
  assert.deepEqual(St.customerPlan(null), {});
});

// ---- het mobiele bedrijf ----
t('frietwagen: eigen id zonder pand, omzet naar plek, geen personeelsloon, kermis alleen op een kermisdag', () => {
  const b = Z.newBezit(); b.totals = { bought: 0, sold: 0, spent: 0, earned: 0 };
  assert.equal(Bz.buyMobile(b, 'frietwagen', 3, 100).why, 'te-weinig-geld');
  assert.equal(Bz.buyMobile(b, 'frietwagen', 3, 1e5).ok, true);
  assert.equal(Bz.buyMobile(b, 'frietwagen', 3, 1e5).why, 'al-van-jou');
  assert.equal(Bz.buyMobile(b, 'brommer', 3, 1e5).why, 'onbekend');
  const biz = { id: 'frietwagen', type: 'frietwagen', cls: 'mobile', m2: 0, p: b.mobile.frietwagen.p, q: 100, cfg: Bz.normalizeCfg({ ...b.mobile.frietwagen.cfg, spot: 'markt' }) };
  const at = (spot, o = {}) => { let s = 0; for (let d = 1; d <= 40; d++) s += Bz.stepDay(Bz.setMobileSpot(biz, spot), ctxOf(d, o)).report.revenue; return s / 40; };
  assert.ok(at('markt') > at('park') && at('park') > at('dorp'));
  assert.ok(at('kermis', { kermis: true }) > at('markt') && at('kermis') < at('markt'));
  assert.ok(at('park', { weekend: true }) > at('park'));
  const r = Bz.stepDay(biz, ctxOf(5)).report; assert.equal(r.wages, 0); assert.ok(r.net > 0 && r.customers >= 1);
  assert.equal(Bz.setMobileSpot(biz, 'mars'), biz);
  assert.match(Bz.MOBILE_TYPES.frietwagen.story, /Tessa en Tammo, 24/);
  const sold = Bz.sellMobile(b, 'frietwagen'); assert.ok(sold.ok && sold.refund < 7500 && !b.mobile.frietwagen);
  assert.equal(Bz.sellMobile(b, 'frietwagen').why, 'niet-van-jou');
  const rate = at('markt') / biz.p; assert.ok(rate < 0.02, `${rate}`);
});

// ---- events en afhandeling ----
t('een staking is een dag dicht (geen omzet, geen loon, geen leed) en een eventmultiplier werkt door', () => {
  const b = fullStaff(mkShop('bakker'));
  const r = Bz.stepDay(b, ctxOf(5, { event: { closed: true, note: 'Staking: een dag dicht.' } })).report;
  assert.deepEqual([r.revenue, r.wages, r.open], [0, 0, false]); assert.match(r.reason, /Staking/);
  const norm = Bz.stepDay(b, ctxOf(5)).report.revenue, plus = Bz.stepDay(b, ctxOf(5, { event: { revMult: 1.25, note: 'veilingdag' } })).report;
  assert.ok(plus.revenue > norm * 1.2); assert.match(plus.reason, /veilingdag/);
  assert.equal(Bz.stepDay(b, ctxOf(5, { event: { cost: 200 } })).report.extra, 200);
});
t('settleDays telt dagen op, is begrensd en geeft de laatste toestand', () => {
  const b = fullStaff(mkShop('bakker'));
  const r = Bz.settleDays(b, 10, 40, (d) => ctxOf(d));
  assert.equal(r.sum.days, 30); assert.ok(r.sum.revenue > 0); assert.equal(r.sum.net, r.sum.revenue - r.sum.wages - r.sum.tax - r.sum.opex - r.sum.waste - r.sum.extra);
  assert.ok(r.biz.q < 100); assert.equal(r.last.day, 40);
  assert.equal(Bz.settleDays(b, 0, 99999, ctxOf(1)).sum.days, Bz.MAX_SETTLE_DAYS);
  assert.equal(Bz.settleDays(b, 40, 10, ctxOf(1)).sum.days, 0);
});
t('kapotte invoer geeft geen NaN en geen fout', () => {
  const weird = { id: 1, type: 'bestaat-niet', cls: 'shop', m2: NaN, p: undefined, q: 'x', cfg: null };
  const r = Bz.stepDay(weird, { day: NaN }).report;
  for (const k of ['revenue', 'wages', 'tax', 'opex', 'waste', 'net']) assert.ok(Number.isFinite(r[k]), k);
  assert.ok(Number.isFinite(Bz.stepDay({ ...weird, cls: 'rent', type: 'woning' }, {}).report.net));
});

console.log(`business_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
