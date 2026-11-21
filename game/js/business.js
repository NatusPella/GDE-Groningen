// Bedrijven in Bezit (epic #1095, #1102; ontwerp docs/BEZIT-21-11.md hoofdstuk 3, 6 en 8): het pand-model (bedrijfstype uit pandsoort en
// winkelplek), de prijs, de omzet per speldag, belasting, onderhoud, verhuur van woningen, de beheerknoppen en het dagrapport met reden,
// plus het mobiele bedrijf (de frietwagen). Puur: geen DOM, geen THREE, geen klok, geen opslag en geen Math.random; alles per speldag
// en deterministisch (bezithash.js). scripts/business_test.mjs.
//
// Een bedrijf ("biz") is: { id, type, cls, m2, p, q, cfg } met
//   id   OSM-id van het pand (getal) of een eigen id ('frietwagen')
//   type winkeltype ('supermarkt', 'bakker', ...), 'woning', 'bijgebouw', 'industrie', 'beheer' of 'frietwagen'
//   cls  'shop' (omzet door klanten), 'rent' (verhuur), 'industry' (bedrijfsruimte) of 'mobile'
//   m2   oppervlak (voor woningen: woonoppervlak, grondvlak maal verdiepingen)
//   p    betaalde prijs, base de prijs zonder schaalprijs (optioneel: belasting en huur rekenen daarmee), q onderhoud 0 tot 100
//   cfg  de vier beheerknoppen { pr prijsstand, st voorraad, staff personeel, hr openingstijd } plus { vu leeg tot dag }
// De opslag blijft die van bezit.js (bstate per pand, b.mobile voor het mobiele bedrijf): dit bestand rekent alleen.
//
// Geld rekent hier in gehele euro's. Winkelomzet gaat naar de eigenaar; een gast die meewerkt krijgt loon (docs/COOP-GAST.md).

import { scaleFactor, difficultyFactor } from './bezitprijs.js';
import { buyBuilding } from './bezit.js';
import { hashUnit, clamp, finite } from './bezithash.js';
import { staffFactor, staffWages, staffNeed, existingClerk, normalizeStaff, STANDARD_HOURS, visibleCustomers } from './businessstaff.js';

// ---- typen: prijsfactor, product (voor de reden) en het prijsoptimum per winkeltype ----
// typeFactor: de prijs per m2 is 900 maal dit (ontwerp 6.2). priceOpt: het prijsniveau (ten opzichte van de markt) waar de omzet het hoogst is.
export const SHOP_TYPES = {
  supermarkt: { label: 'Supermarkt', typeFactor: 1.4, product: 'Boodschappen', priceOpt: 1.0 },
  bakker: { label: 'Bakkerij', typeFactor: 1.0, product: 'Brood', priceOpt: 1.05 },
  slager: { label: 'Slagerij', typeFactor: 1.0, product: 'Vlees', priceOpt: 1.05 },
  snackbar: { label: 'Snackbar', typeFactor: 0.8, product: 'Friet', priceOpt: 1.05 },
  kleding: { label: 'Kledingwinkel', typeFactor: 0.9, product: 'Kleding', priceOpt: 1.2 },
  fietsen: { label: 'Fietsenwinkel', typeFactor: 0.9, product: 'Fietsen', priceOpt: 1.1 },
  bloemist: { label: 'Bloemist', typeFactor: 0.8, product: 'Bloemen', priceOpt: 1.15 },
  kapper: { label: 'Kapper', typeFactor: 0.7, product: 'Knipbeurten', priceOpt: 1.0 },
  elektronica: { label: 'Elektronicawinkel', typeFactor: 1.1, product: 'Apparaten', priceOpt: 1.05 },
  tweedehands: { label: 'Tweedehandswinkel', typeFactor: 0.7, product: 'Spullen', priceOpt: 1.1 },
  souvenir: { label: 'Souvenirwinkel', typeFactor: 0.7, product: 'Souvenirs', priceOpt: 1.25 },
  kiosk: { label: 'Kiosk', typeFactor: 0.6, product: 'Kranten en snoep', priceOpt: 1.1 },
  winkel: { label: 'Winkel', typeFactor: 0.9, product: 'Artikelen', priceOpt: 1.1 },       // OSM retail zonder bekend winkeltype
  kantoor: { label: 'Kantoorpand', typeFactor: 0.8, product: 'Diensten', priceOpt: 1.1 },
  hotel: { label: 'Logies', typeFactor: 1.1, product: 'Kamers', priceOpt: 1.15 },
};
export const SHOP_TYPE_IDS = Object.keys(SHOP_TYPES);

export const PRICE_PER_M2 = { home: 300, shop: 900, industry: 700 };      // woning, winkel en industrie (ontwerp 6.2)
export const OUTBUILDING_PRICE = [1500, 4000];                             // schuur of garage: € per bijgebouw, ingeklemd
export const SHOP_BASE_RATE = 0.0055;       // omzet (na inkoop) per speldag als aandeel van de prijs bij een neutrale winkel
export const INDUSTRY_RATE = 0.004;         // bedrijfsruimte verhuurd: per speldag
export const RENT_RATES = { woning: 0.0025, bijgebouw: 0.002, beheer: 0.0015 };       // verhuur per speldag (woning 0,25%: ontwerp 6.2)
export const TAX_RATE = 0.001;              // vastgoedbelasting per speldag over de betaalde prijs (0,1%)
export const TAX_PROGRESSION_CAP = 100;      // bij zoveel eigen panden is de belasting verdubbeld
export const OPEX_RATE = 0.0005;            // lopende kosten (energie, verzekering) van winkels en bedrijfsruimte
export const MOVE_CHANCE = 0.02;             // kans per dag dat een huurder verhuist
export const VACANCY_DAYS = 3;               // zoveel dagen is de woning dan leeg
export const DECAY = { shop: 0.4, rent: 0.25, industry: 0.3, mobile: 0.5 };            // onderhoudspunten per dag
export const RENOVATION_RATE = 0.1;          // renovatie van q=0 naar 100 kost 10% van de prijs
export const OPEN_FROM = 8;                  // een winkel opent om 08:00
export const MAX_SETTLE_DAYS = 400;          // zoveel dagen achterstand rekent settleDays in één keer af

// ---- soorten pand uit OSM (de pandindex geeft het type als tekst) ----
const OSM = {
  home: new Set(['yes', 'house', 'detached', 'semidetached_house', 'terrace', 'apartments', 'residential', 'bungalow', 'dormitory', 'farm', 'static_caravan', '?', '']),
  out: new Set(['shed', 'garage', 'garages', 'carport', 'barn', 'stable', 'greenhouse', 'farm_auxiliary', 'roof', 'cowshed', 'sty', 'hut', 'cabin', 'storage_tank']),
  shop: new Set(['retail', 'commercial', 'supermarket', 'kiosk']),
  office: new Set(['office']),
  hotel: new Set(['hotel', 'hostel', 'guest_house']),
  industry: new Set(['industrial', 'service', 'warehouse', 'factory', 'manufacture']),
  public: new Set(['school', 'church', 'chapel', 'hospital', 'civic', 'government', 'public', 'university', 'college', 'kindergarten', 'train_station', 'fire_station', 'police', 'cathedral', 'monastery', 'museum', 'theatre']),
};
// Hoeveel verdiepingen: uit de hoogte (3 m per verdieping), minstens 1, hoogstens 8.
export const floorsOf = (b) => clamp(Math.round(finite(b && b.h, 0) / 3), 1, 8);
export const livingArea = (b) => Math.max(1, Math.round(finite(b && b.m2, 0) * floorsOf(b)));

// Welk bedrijfstype een pand is: de winkelplek (winkeltype uit de winkelkit, zie shopspots.js) wint van de pandsoort.
// b: een rij van de pandindex { osm, m2, type, h, landmark }; shopKind: het winkeltype van de plek erin of null.
export function classifyBuilding(b, shopKind = null) {
  const t = String((b && b.type) || '?');
  if (shopKind && SHOP_TYPES[shopKind]) return { cls: 'shop', type: shopKind };
  if (b && b.landmark) return { cls: 'rent', type: 'beheer' };
  if (OSM.public.has(t)) return { cls: 'rent', type: 'beheer' };
  if (OSM.shop.has(t)) return { cls: 'shop', type: 'winkel' };
  if (OSM.office.has(t)) return { cls: 'shop', type: 'kantoor' };
  if (OSM.hotel.has(t)) return { cls: 'shop', type: 'hotel' };
  if (OSM.industry.has(t)) return { cls: 'industry', type: 'industrie' };
  if (OSM.out.has(t)) return { cls: 'rent', type: 'bijgebouw' };
  return { cls: 'rent', type: 'woning' };
}

// ---- de woonplaats: klantendruk, gemeentefactor ----
// town: { id, name, houses } (aantal woningen in de plaats, uit de pandindex gemeten).
// Klantendruk 0,5 (hooguit vijftig huizen) tot 1,4 (ruim drieduizend): de klantenpot is evenredig met het aantal woningen.
export const pressure = (houses) => Math.round(clamp(0.5 + 0.15 * Math.log2(Math.max(50, finite(houses, 0)) / 50), 0.5, 1.4) * 1000) / 1000;
// Gemeentefactor voor woningprijzen: platteland 0,9 (tot duizend huizen), stad 1,3 (vanaf vijfduizend), daartussen lineair.
export const townFactor = (houses) => Math.round((0.9 + 0.4 * clamp((finite(houses, 0) - 1000) / 4000, 0, 1)) * 1000) / 1000;

// ---- prijs ----
const round50 = (x) => Math.round(x / 50) * 50;
// De basisprijs van een pand zonder schaalprijs (ontwerp 6.2). 0 als er geen m2 bekend is.
export function basePrice(b, kind, town = null) {
  const m2 = finite(b && b.m2, 0);
  if (!(m2 > 0)) return 0;
  const { cls, type } = kind || classifyBuilding(b);
  if (type === 'woning') return round50(livingArea(b) * PRICE_PER_M2.home * townFactor(town ? town.houses : 0));
  if (type === 'bijgebouw') return round50(clamp(m2 * 120, OUTBUILDING_PRICE[0], OUTBUILDING_PRICE[1]));
  if (type === 'beheer') return round50(livingArea(b) * PRICE_PER_M2.home * 1.6);      // een monument kost meer dan een woning (beheer, geen sloop)
  if (cls === 'industry') return round50(m2 * PRICE_PER_M2.industry);
  const tf = (SHOP_TYPES[type] || SHOP_TYPES.winkel).typeFactor;
  return round50(m2 * PRICE_PER_M2.shop * tf);
}
// De prijs voor deze speler nu: de basisprijs maal de schaalprijs van bezitprijs.js (wie veel heeft, betaalt tot driemaal zoveel).
export const businessPrice = (b, kind, town, owned = 0) => { const p = basePrice(b, kind, town); return p ? round50(p * scaleFactor(owned) * difficultyFactor('price')) : 0; };

// Een pand kopen via bezit.js en de bedrijfsgegevens erbij zetten: de basisprijs (zonder schaalprijs) en de beheerknoppen met de kassier die er stond.
// kind: uit classifyBuilding; bouwt geen UI. Geeft { ok, cost, biz } of de reden van bezit.js.
export function buyBusiness(b, row, kind, town, day, money) {
  const base = basePrice(row, kind, town);
  const price = businessPrice(row, kind, town, Math.max(0, b.buildings.size + Object.keys(b.parcels).filter((k) => !b.parcels[k].lg).length));
  const r = buyBuilding(b, row.osm, price, day, money, kind.type);
  if (!r.ok) return r;
  b.bstate[row.osm].bp = base;
  b.bstate[row.osm].cfg = defaultCfg(row.osm, kind.cls === 'shop');
  return { ok: true, cost: r.cost, biz: bizOf(b, row, kind) };
}
// Het bedrijf van een gekocht pand uit de bezit-opslag (bstate) en de pandrij.
export function bizOf(b, row, kind) {
  const s = (b.bstate && b.bstate[row.osm]) || {};
  const k = kind || classifyBuilding(row, null);
  return { id: row.osm, type: s.kind || k.type, cls: (SHOP_TYPES[s.kind] ? 'shop' : k.cls), m2: k.type === 'woning' ? livingArea(row) : finite(row.m2, 0), p: finite(s.p, 0), base: finite(s.bp, 0), q: finite(s.q, 100), cfg: normalizeCfg(s.cfg || defaultCfg(row.osm, k.cls === 'shop')) };
}
// Na een dag de nieuwe toestand terugschrijven in de opslag (onderhoud en knoppen).
export function storeBiz(b, biz) {
  if (biz.cls === 'mobile') { if (b.mobile && b.mobile[biz.id]) { b.mobile[biz.id].q = biz.q; b.mobile[biz.id].cfg = biz.cfg; } return; }
  const s = b.bstate[biz.id]; if (!s) return;
  s.q = Math.round(biz.q * 10) / 10; s.cfg = biz.cfg;
}

// ---- de beheerknoppen ----
export const KNOBS = {
  pr: { label: 'Prijs', lo: 0.6, hi: 1.6, def: 1.0, step: 0.05 },      // ten opzichte van de marktprijs
  st: { label: 'Voorraad', lo: 0, hi: 1.5, def: 1.0, step: 0.05 },     // inkoop ten opzichte van de verwachte vraag
  hr: { label: 'Openingstijd', lo: 0, hi: 16, def: STANDARD_HOURS, step: 1 },      // uren per dag, vanaf 08:00
};
export const defaultCfg = (osm = 0, withClerk = true) => ({ pr: KNOBS.pr.def, st: KNOBS.st.def, hr: KNOBS.hr.def, staff: withClerk && osm ? [existingClerk(osm)] : [], vu: 0 });
export function normalizeCfg(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const k = (key) => { const d = KNOBS[key]; const v = clamp(finite(o[key], d.def), d.lo, d.hi); return Math.round(v / (d.step / 5)) * (d.step / 5); };
  const r2 = (v) => Math.round(v * 1000) / 1000;
  const out = { pr: r2(k('pr')), st: r2(k('st')), hr: Math.round(k('hr')), staff: normalizeStaff(o.staff), vu: Math.max(0, Math.floor(finite(o.vu, 0))) };
  if (typeof o.spot === 'string' && MOBILE_SPOTS[o.spot]) out.spot = o.spot;       // alleen het mobiele bedrijf
  return out;
}
// Een knop zetten: geeft de nieuwe cfg terug (ingeklemd) en laat de oude ongemoeid.
export function setKnob(cfg, key, value) {
  if (!KNOBS[key]) return normalizeCfg(cfg);
  return normalizeCfg({ ...cfg, [key]: value });
}

// ---- de factoren van de omzet ----
// Prijsstand: een omgekeerde U met een optimum (een lage prijs trekt klanten maar levert weinig, een hoge andersom).
export const priceFactor = (pr, type) => { const opt = (SHOP_TYPES[type] || SHOP_TYPES.winkel).priceOpt; return Math.round(clamp(1 - 1.6 * (pr - opt) ** 2, 0.2, 1) * 1000) / 1000; };
// Voorraadstand s (inkoop ten opzichte van de vraag van vandaag): te weinig is gemiste omzet, te veel is bederf (een lichte straf).
export const stockFactor = (s) => Math.round((s < 1 ? 0.3 + 0.7 * Math.max(0, s) : Math.max(0.7, 1 - 0.3 * (s - 1))) * 1000) / 1000;
// Openingstijd: tien uur is neutraal; langer geeft een kleine bonus (hoogstens 1,15), korter weinig omzet.
export const hoursFactor = (h) => Math.round(clamp(0.55 + 0.045 * clamp(finite(h, 0), 0, 16), 0, 1.15) * 1000) / 1000;
// Verzadiging: de (k+1)-ste winkel van hetzelfde type in dezelfde plaats krijgt 1 / (1 + k) van de pot (ontwerp 6.3, de anti-exploit).
export const saturationFactor = (k) => Math.round((1 / (1 + Math.max(0, k | 0))) * 1000) / 1000;
// Onderhoud: een verwaarloosd pand trekt minder klanten (tot 0,6).
export const maintenanceFactor = (q) => Math.round((0.6 + 0.4 * clamp(finite(q, 100), 0, 100) / 100) * 1000) / 1000;
// De vraag van vandaag t.o.v. normaal (0,9 tot 1,1): vaste ruis per bedrijf en dag.
export const demandToday = (id, day) => Math.round((0.9 + 0.2 * hashUnit('vraag', id, day)) * 1000) / 1000;

// Basisomzet per speldag van een winkel: de prijs bij neutrale factoren maal het basispercentage.
export const baseRevenue = (type, m2) => Math.round(finite(m2, 0) * PRICE_PER_M2.shop * (SHOP_TYPES[type] || SHOP_TYPES.winkel).typeFactor * SHOP_BASE_RATE);

// Belasting per speldag: 0,1% van de betaalde prijs, progressief: bij 100 of meer panden het dubbele.
export const taxRate = (owned) => TAX_RATE * (1 + Math.min(Math.max(0, owned | 0), TAX_PROGRESSION_CAP) / TAX_PROGRESSION_CAP);
export const taxPerDay = (paid, owned) => Math.round(Math.max(0, finite(paid, 0)) * taxRate(owned));

// Waarde nu: de betaalde prijs, minder bij verwaarlozing (verwaarloosd verlaagt de waarde). Verkopen blijft bezit.js (75% van wat je betaalde).
export const marketValue = (biz) => Math.round(finite(biz && biz.p, 0) * (0.7 + 0.3 * clamp(finite(biz && biz.q, 100), 0, 100) / 100));

// ---- het mobiele bedrijf: de frietwagen (verhaalcompatibiliteit) ----
// Geen pand-ID: een eigen id, omzet naar plek. Tessa en Tammo, 24 en net afgestudeerd, draaien hem zelf: er is geen loon en geen
// personeelsknop; de prijs en de plek zijn je keuze. Er is er één per speler.
export const MOBILE_TYPES = {
  frietwagen: { id: 'frietwagen', type: 'frietwagen', cls: 'mobile', label: 'Snackwagen', product: 'Friet', price: 7500, baseRevenue: 80, priceOpt: 1.05,
    story: 'Tessa en Tammo, 24, net afgestudeerd, draaien hem zelf.' },
};
export const MOBILE_IDS = Object.keys(MOBILE_TYPES);
export const MOBILE_SPOTS = {
  markt: { label: 'Grote Markt', f: 1.3 },
  station: { label: 'Bij het station', f: 1.15 },
  park: { label: 'Noorderplantsoen', f: 1.0 },
  dorp: { label: 'Dorpsplein', f: 0.85 },
  kust: { label: 'Aan de kust', f: 1.1 },
  kermis: { label: 'Op de kermis', f: 1.7, needsEvent: true },        // alleen op een kermisdag (ctx.kermis)
};
export const mobileSpotFactor = (spot, kermis = false) => { const s = MOBILE_SPOTS[spot]; return !s ? 0.85 : s.needsEvent && !kermis ? 0.85 : s.f; };
export const newMobile = (id, day = 0) => {
  const d = MOBILE_TYPES[id];
  return d ? { id, type: d.type, cls: 'mobile', m2: 0, p: d.price, q: 100, t: Math.max(0, day | 0), cfg: { ...normalizeCfg({ hr: 10 }), spot: 'park' } } : null;
};
export function buyMobile(b, id, day, money) {
  const d = MOBILE_TYPES[id];
  if (!d) return { ok: false, why: 'onbekend' };
  if (!b.mobile) b.mobile = {};
  if (b.mobile[id]) return { ok: false, why: 'al-van-jou' };
  if (!(money >= d.price)) return { ok: false, why: 'te-weinig-geld', tekort: Math.round(d.price - money) };
  b.mobile[id] = { p: d.price, t: Math.max(0, day | 0), q: 100, cfg: { pr: 1, hr: 10, spot: 'park' } };
  b.totals.bought++; b.totals.spent += d.price;
  return { ok: true, cost: d.price };
}
export function sellMobile(b, id) {
  if (!b.mobile || !b.mobile[id]) return { ok: false, why: 'niet-van-jou' };
  const refund = Math.round((b.mobile[id].p * 0.75) / 5) * 5;       // zelfde verkoopfactor als bezit.js (VERKOOP_FACTOR)
  delete b.mobile[id];
  b.totals.sold++; b.totals.earned += refund;
  return { ok: true, refund };
}
export function setMobileSpot(biz, spot) {
  if (!biz || !MOBILE_SPOTS[spot]) return biz;
  return { ...biz, cfg: { ...biz.cfg, spot } };
}

// ---- het dagrapport ----
const hhmm = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:00`;

// Eén speldag voor één bedrijf. Geeft { biz: de nieuwe toestand, report }; past de invoer niet aan.
// ctx: { day, town: { id, name, houses }, sameType: aantal andere winkels van jou van dit type in deze plaats, owned: aantal panden van jou
//        (voor de belasting), event: { closed, revMult, cost, note } (uit bezitevents.js), kermis, weekend }
export function stepDay(biz, ctx = {}) {
  const day = Math.max(0, Math.floor(finite(ctx.day, 0)));
  const cfg = normalizeCfg(biz.cfg);
  const ev = ctx.event || {};
  const town = ctx.town || { id: '', name: 'de plaats', houses: 300 };
  const owned = Math.max(1, ctx.owned | 0);
  const basis = finite(biz.base, 0) > 0 ? biz.base : finite(biz.p, 0);       // waarde zonder schaalprijs: de toeslag voor schaal is een eenmalige kost, geen reden voor meer belasting of huur
  const tax = taxPerDay(basis, owned);
  const next = { ...biz, cfg: { ...biz.cfg, ...cfg }, q: Math.max(0, Math.round((finite(biz.q, 100) - (DECAY[biz.cls] || 0.3)) * 100) / 100) };
  const rep = { day, id: biz.id, type: biz.type, cls: biz.cls, revenue: 0, wages: 0, tax, opex: 0, waste: 0, extra: Math.round(finite(ev.cost, 0)), net: 0, open: true, soldOutHour: null, customers: 0, factors: {}, reason: '' };
  const fin = () => { rep.net = rep.revenue - rep.wages - rep.tax - rep.opex - rep.waste - rep.extra; return { biz: next, report: rep }; };

  if (biz.cls === 'rent') {
    const rate = RENT_RATES[biz.type] || RENT_RATES.woning;
    rep.opex = 0;
    if (biz.type === 'woning') {
      let vu = Math.max(0, cfg.vu);
      if (vu <= day && hashUnit('verhuist', biz.id, day) < MOVE_CHANCE) { vu = day + VACANCY_DAYS; rep.moved = true; }
      next.cfg.vu = vu;
      if (vu > day) { rep.reason = rep.moved ? `De huurder verhuist; er wordt binnen ${VACANCY_DAYS} dagen een nieuwe gezocht.` : 'Een nieuwe huurder wordt gezocht: deze dag geen huur.'; return fin(); }
    }
    const mf = maintenanceFactor(biz.q);
    rep.revenue = Math.round(basis * rate * mf * (ev.revMult !== undefined ? clamp(ev.revMult, 0, 3) : 1));
    rep.factors = { onderhoud: mf };
    rep.reason = mf < 0.8 ? 'Onderhoud achterstallig: de huur is lager; renoveer.' : 'Rustige dag: de huur is binnen.';
    return fin();
  }

  rep.opex = Math.round(basis * OPEX_RATE);

  if (ev.closed) { rep.open = false; rep.reason = ev.note || 'Een dag dicht.'; rep.opex = 0; return fin(); }

  if (biz.cls === 'industry') {
    const mf = maintenanceFactor(biz.q);
    rep.revenue = Math.round(basis * INDUSTRY_RATE * mf * clamp(finite(ev.revMult, 1), 0, 3));
    rep.factors = { onderhoud: mf };
    rep.reason = mf < 0.8 ? 'Onderhoud achterstallig: de huurders klagen; renoveer.' : 'Bedrijfsruimte verhuurd: een vaste dag.';
    return fin();
  }

  if (biz.cls === 'mobile') {
    const d = MOBILE_TYPES[biz.id] || MOBILE_TYPES.frietwagen;
    const spotF = mobileSpotFactor(cfg.spot || biz.cfg.spot, !!ctx.kermis);
    const pf = priceFactor(cfg.pr, d.type), mf = maintenanceFactor(biz.q), wk = ctx.weekend ? 1.2 : 1;
    const dm = demandToday(biz.id, day);
    rep.factors = { plek: spotF, prijs: pf, onderhoud: mf, weekend: wk, vraag: dm };
    rep.revenue = Math.round(d.baseRevenue * spotF * pf * mf * wk * dm * clamp(finite(ev.revMult, 1), 0, 3));
    rep.opex = Math.round(basis * OPEX_RATE);
    rep.customers = visibleCustomers(rep.revenue, d.baseRevenue, {});
    const spot = MOBILE_SPOTS[cfg.spot] || MOBILE_SPOTS.park;
    rep.reason = spotF < 0.9 ? `${spot.label}${cfg.spot === 'kermis' ? ' (zonder kermis)' : ''}: weinig voorbijgangers; kies een drukkere plek.` : pf < 0.8 ? 'De prijs wijkt af van wat klanten willen.' : `${spot.label}: een goede plek, de friet vliegt eruit.`;
    return fin();
  }

  // winkel
  const T = SHOP_TYPES[biz.type] || SHOP_TYPES.winkel;
  const hours = cfg.hr;
  if (hours <= 0) { rep.open = false; rep.reason = 'Gesloten: stel een openingstijd in.'; rep.opex = 0; return fin(); }
  const dm = demandToday(biz.id, day);
  const sEff = cfg.st / dm;
  const f = {
    klanten: pressure(town.houses),
    prijs: priceFactor(cfg.pr, biz.type),
    voorraad: stockFactor(sEff),
    personeel: staffFactor(cfg.staff, biz.m2),
    verzadiging: saturationFactor(ctx.sameType),
    uren: hoursFactor(hours),
    onderhoud: maintenanceFactor(biz.q),
    dag: Math.round((0.95 + 0.1 * hashUnit('dag', biz.id, day)) * 1000) / 1000,
  };
  rep.factors = f;
  const base = baseRevenue(biz.type, biz.m2);
  let rev = base;
  for (const v of Object.values(f)) rev *= v;
  rev *= clamp(finite(ev.revMult, 1), 0, 3);
  rep.revenue = Math.round(rev);
  rep.wages = staffWages(cfg.staff, hours);
  rep.waste = sEff > 1 ? Math.round(base * 0.25 * (sEff - 1)) : 0;
  rep.customers = visibleCustomers(rep.revenue, base, {});
  if (sEff < 0.95) rep.soldOutHour = Math.min(24, Math.round(OPEN_FROM + hours * Math.max(0.2, sEff)));

  // de reden: de zwakste factor onder 0,9 (voorraad en personeel eerst: dat is wat de speler meteen kan oplossen)
  const t = SHOP_TYPES[biz.type] ? T : SHOP_TYPES.winkel;
  const weak = [['voorraad', f.voorraad], ['personeel', f.personeel], ['prijs', f.prijs], ['verzadiging', f.verzadiging], ['onderhoud', f.onderhoud], ['uren', f.uren]]
    .filter(([, v]) => v < 0.9).sort((a, b) => a[1] - b[1])[0];
  if (!weak) rep.reason = rep.waste > 0 ? `${t.product}: te veel ingekocht, een deel is bedorven. Minder voorraad.` : f.prijs >= 0.95 && f.voorraad >= 0.95 ? 'Een goede dag: de winkel draait.' : 'Een gewone dag.';
  else if (weak[0] === 'voorraad') rep.reason = `${t.product} uitverkocht om ${hhmm(rep.soldOutHour || OPEN_FROM + hours)}: meer voorraad.`;
  else if (weak[0] === 'personeel') rep.reason = 'Een lange rij en te weinig handen: stel iemand aan.';
  else if (weak[0] === 'prijs') rep.reason = cfg.pr > (t.priceOpt || 1) ? 'Klanten vinden de prijzen te hoog: iets lager.' : 'Veel klanten maar weinig marge: iets hoger.';
  else if (weak[0] === 'verzadiging') rep.reason = `Je hebt meer winkels van dit soort in ${town.name || 'de plaats'}: de klanten verdelen zich.`;
  else if (weak[0] === 'onderhoud') rep.reason = 'Onderhoud achterstallig: klanten blijven weg; renoveer.';
  else rep.reason = 'Weinig openingsuren: langer open is meer omzet.';
  if (ev.note && ev.revMult && ev.revMult !== 1) rep.reason += ` (${ev.note})`;
  return fin();
}

// Meerdere speldagen achter elkaar (na slapen of laden). Telt de rapporten bij elkaar en geeft het laatste rapport mee. Hoogstens MAX_SETTLE_DAYS.
// ctxFor(day) geeft de ctx van een dag (zodat events en kermis per dag kunnen verschillen), of een vaste ctx.
export function settleDays(biz, fromDay, toDay, ctxFor) {
  const a = Math.max(0, Math.floor(finite(fromDay, 0))), z = Math.min(Math.max(a, Math.floor(finite(toDay, a))), a + MAX_SETTLE_DAYS);
  const sum = { days: 0, revenue: 0, wages: 0, tax: 0, opex: 0, waste: 0, extra: 0, net: 0 };
  let cur = biz, last = null;
  for (let d = a + 1; d <= z; d++) {
    const ctx = typeof ctxFor === 'function' ? ctxFor(d) : { ...(ctxFor || {}), day: d };
    const r = stepDay(cur, { ...ctx, day: d });
    cur = r.biz; last = r.report; sum.days++;
    for (const k of ['revenue', 'wages', 'tax', 'opex', 'waste', 'extra', 'net']) sum[k] += r.report[k];
  }
  return { biz: cur, sum, last };
}

// Renovatie: herstelt het onderhoud naar 100. Kost 10% van de prijs naar rato van de verwaarlozing, minstens 50.
export const renovationCost = (biz) => (biz.q >= 100 ? 0 : Math.max(50, Math.round((finite(biz.p, 0) * RENOVATION_RATE * (100 - clamp(finite(biz.q, 100), 0, 100))) / 100 / 5) * 5));
export function renovate(biz, money) {
  const cost = renovationCost(biz);
  if (cost === 0) return { ok: false, why: 'al-in-orde', biz };
  if (!(money >= cost)) return { ok: false, why: 'te-weinig-geld', tekort: Math.round(cost - money), biz };
  return { ok: true, cost, biz: { ...biz, q: 100 } };
}

// Het overzicht van een winkel voor het beheerscherm: wat de knoppen nu doen (een voorspelling zonder ruis).
export function forecast(biz, ctx = {}) {
  const r = stepDay({ ...biz, cfg: { ...biz.cfg, vu: 0 } }, { ...ctx, day: ctx.day || 0 });
  return { revenue: r.report.revenue, net: r.report.net, reason: r.report.reason, factors: r.report.factors };
}

// Aantal personeelsleden dat dit pand nodig heeft (voor het beheerscherm).
export { staffNeed };
